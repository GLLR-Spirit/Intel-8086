const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Application script must exist");

const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id, value: "", textContent: "", innerHTML: "", className: "",
      dataset: {}, onclick: null, oninput: null, onchange: null
    });
  }
  return elements.get(id);
}
const context = {
  document: { getElementById: element, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console
};
vm.createContext(context);
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, `
globalThis.__8086ShiftApi = {
  assemble: source => assembleProgram(source),
  execute: source => executeAll(source)
};
})();
`);
assert.notEqual(instrumented, match[1], "Application test injection point must exist");
vm.runInContext(instrumented, context, { timeout: 10000 });
const api = context.__8086ShiftApi;
assert.ok(api, "Shift/rotate audit API must be exposed");

function parity8(value) {
  let bits = 0;
  value &= 0xFF;
  for (let i = 0; i < 8; i++) bits += (value >> i) & 1;
  return bits % 2 === 0 ? 1 : 0;
}
function initialFlags() {
  // 7Fh + 1 = 80h: OF=1, SF=1, ZF=0, AF=1, PF=0, CF=0.
  return { CF: 0, PF: 0, AF: 1, ZF: 0, SF: 1, OF: 1 };
}
function reference(op, value, bits, count, carryIn) {
  const mask = bits === 8 ? 0xFF : 0xFFFF;
  const sign = bits === 8 ? 0x80 : 0x8000;
  const flags = initialFlags();
  flags.CF = carryIn;
  let result = value & mask;
  let carry = carryIn;
  const rotating = ["ROL", "ROR", "RCL", "RCR"].includes(op);

  for (let i = 0; i < count; i++) {
    if (op === "SHL" || op === "SAL") {
      carry = (result & sign) ? 1 : 0;
      result = (result << 1) & mask;
    } else if (op === "SHR") {
      carry = result & 1;
      result >>>= 1;
    } else if (op === "SAR") {
      carry = result & 1;
      result = (result >>> 1) | (result & sign);
    } else if (op === "ROL") {
      carry = (result & sign) ? 1 : 0;
      result = ((result << 1) & mask) | carry;
    } else if (op === "ROR") {
      carry = result & 1;
      result = (result >>> 1) | (carry ? sign : 0);
    } else if (op === "RCL") {
      const oldCarry = carry;
      carry = (result & sign) ? 1 : 0;
      result = ((result << 1) & mask) | oldCarry;
    } else if (op === "RCR") {
      const oldBit = result & 1;
      result = (result >>> 1) | (carry ? sign : 0);
      carry = oldBit;
    }
  }

  if (count > 0) {
    flags.CF = carry;
    if (rotating) {
      if (count === 1) {
        if (op === "ROL" || op === "RCL") {
          flags.OF = ((result & sign) ? 1 : 0) ^ carry;
        } else {
          const msb = (result & sign) ? 1 : 0;
          const next = (result & (sign >> 1)) ? 1 : 0;
          flags.OF = msb ^ next;
        }
      }
      // Rotates preserve PF, AF, ZF and SF.
    } else {
      flags.SF = (result & sign) ? 1 : 0;
      flags.ZF = result === 0 ? 1 : 0;
      flags.PF = parity8(result);
      if (count === 1) {
        if (op === "SHR") flags.OF = (value & sign) ? 1 : 0;
        else if (op === "SAR") flags.OF = 0;
        else flags.OF = ((result & sign) ? 1 : 0) ^ carry;
      }
      // AF is undefined for shifts. OF is undefined when count > 1.
    }
  }
  return { result, flags, rotating };
}

function execute(op, bits, value, count, carryIn) {
  const register = bits === 8 ? "AL" : "AX";
  const source = [
    "MOV DL, 7Fh",
    "ADD DL, 1",
    "MOV " + register + ", " + value.toString(16) + "h",
    "MOV CL, " + count,
    carryIn ? "STC" : "CLC",
    op + " " + register + ", CL",
    "HLT"
  ].join("\n");
  const state = api.execute(source);
  assert.ok(!state.error, state.error || (op + " execution failed"));
  return state;
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (error) {
    failed++;
    console.error("FAIL " + name + ": " + error.message);
  }
}

const counts = [0, 1, 2, 7, 8, 9, 15, 16, 17, 31, 32, 33, 255];
const operations = ["SHL", "SAL", "SHR", "SAR", "ROL", "ROR", "RCL", "RCR"];
const values = {
  8: [0x00, 0x01, 0x7F, 0x80, 0x81, 0xFF],
  16: [0x0000, 0x0001, 0x7FFF, 0x8000, 0x8001, 0xFFFF]
};

for (const bits of [8, 16]) {
  for (const op of operations) {
    for (const value of values[bits]) {
      for (const count of counts) {
        for (const carryIn of [0, 1]) {
          const label = op + " " + bits + "-bit value=" +
            value.toString(16) + " count=" + count + " CF-in=" + carryIn;
          test(label, () => {
            const actual = execute(op, bits, value, count, carryIn);
            const expected = reference(op, value, bits, count, carryIn);
            const actualValue = bits === 8 ? actual.reg.AX & 0xFF : actual.reg.AX;
            assert.equal(actualValue, expected.result, label + " result");
            assert.equal(actual.flags.CF, expected.flags.CF, label + " CF");

            const flagsToCheck = count === 0
              ? ["PF", "AF", "ZF", "SF", "OF"]
              : expected.rotating
                ? ["PF", "AF", "ZF", "SF"]
                : ["PF", "ZF", "SF"];

            if (count === 1) flagsToCheck.push("OF");
            for (const flag of flagsToCheck) {
              assert.equal(actual.flags[flag], expected.flags[flag], label + " " + flag);
            }
          });
        }
      }
    }
  }
}

// Fixed 8086 group-2 encodings, including the CL forms.
const encodingVectors = [
  ["SHL AX, CL", [0xD3, 0xE0]],
  ["SAL AX, 1", [0xD1, 0xE0]],
  ["SHR AL, CL", [0xD2, 0xE8]],
  ["SAR AX, 1", [0xD1, 0xF8]],
  ["ROL AX, CL", [0xD3, 0xC0]],
  ["ROR AL, 1", [0xD0, 0xC8]],
  ["RCL AX, CL", [0xD3, 0xD0]],
  ["RCR AL, CL", [0xD2, 0xD8]]
];
for (const [source, expected] of encodingVectors) {
  test("8086 group-2 encoding " + source, () => {
    const actual = Array.from(api.assemble(source).bytes);
    assert.deepEqual(actual, expected);
  });
}
test("8086 rejects shift/rotate immediate counts other than 1", () => {
  for (const source of ["SHL AX, 2", "SHR AL, 3", "ROL AX, 4", "RCR AL, 8"]) {
    assert.throws(() => api.assemble(source), undefined, source);
  }
});

console.log("Décalages/rotations 8086 : " + passed + " réussis, " + failed + " échecs.");
console.log("Comptes CL testés sans masque 5 bits : 0, 1, 2, 7, 8, 9, 15, 16, 17, 31, 32, 33, 255.");
console.log("Les FLAGS indéfinis (AF des décalages, OF des opérations multibit) ne sont pas imposés.");
if (failed) process.exit(1);
