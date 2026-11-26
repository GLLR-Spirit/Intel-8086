const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Inline application script must exist");

const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, value: "", textContent: "", innerHTML: "", className: "",
    dataset: {}, onclick: null, oninput: null, onchange: null
  });
  return elements.get(id);
}
const context = {
  document: { getElementById: element, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console
};
vm.createContext(context);
const injection = "\nglobalThis.__8086FlagsApi = {" +
  "\n execute: function (source) { return executeAll(source); }," +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n executeBinary: function (bytes, cs, ip, state) { return executeBinary(bytes, cs, ip, state); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 5000 });
const api = context.__8086FlagsApi;
assert.ok(api, "FLAGS test API must be exposed");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.message); }
}
function parity(byte) {
  let bits = 0;
  for (let i = 0; i < 8; i++) bits += (byte >> i) & 1;
  return bits % 2 === 0 ? 1 : 0;
}
function signed(value, bits) {
  const sign = 1 << (bits - 1);
  return value & sign ? value - (1 << bits) : value;
}
function referenceArithmetic(a, b, operation, bits, carryIn) {
  const modulus = 2 ** bits;
  const mask = modulus - 1;
  const maxSigned = modulus / 2 - 1;
  const minSigned = -modulus / 2;
  const add = operation === "ADD" || operation === "ADC";
  const cin = operation === "ADC" || operation === "SBB" ? carryIn : 0;
  const raw = add ? a + b + cin : a - b - cin;
  const result = raw & mask;
  const sa = signed(a, bits), sb = signed(b, bits);
  const signedRaw = add ? sa + sb + cin : sa - sb - cin;
  return {
    result,
    CF: add ? (raw >= modulus ? 1 : 0) : (raw < 0 ? 1 : 0),
    PF: parity(result & 255),
    AF: add ? (((a & 15) + (b & 15) + cin) > 15 ? 1 : 0)
      : ((a & 15) < ((b & 15) + cin) ? 1 : 0),
    ZF: result === 0 ? 1 : 0,
    SF: (result & (modulus / 2)) ? 1 : 0,
    OF: signedRaw < minSigned || signedRaw > maxSigned ? 1 : 0
  };
}
function run(source) {
  const state = api.execute(source);
  assert.ok(!state.error, state.error || "Execution failed");
  return state;
}
function runBoth(source, flags, registers) {
  const sourceState = run(source);
  const bytes = api.assemble(source).bytes;
  const binaryState = api.executeBinary(bytes, 0, 0, {});
  assert.ok(!binaryState.error, binaryState.error || "Binary execution failed");
  for (const reg of registers || ["AX","BX","CX","DX","SP","BP","SI","DI","DS","ES","SS"])
    assert.equal(binaryState.reg[reg], sourceState.reg[reg], "source/binary " + reg);
  for (const flag of flags)
    assert.equal(binaryState.flags[flag], sourceState.flags[flag], "source/binary " + flag);
  return sourceState;
}
function sourceFor(bits, a, b, op, carryIn) {
  const regA = bits === 8 ? "AL" : "AX";
  const regB = bits === 8 ? "BL" : "BX";
  const digits = bits === 8 ? 2 : 4;
  const prefix = bits === 8 ? "0" : "0";
  const literal = n => "0" + n.toString(16).toUpperCase().padStart(digits, "0") + "h";
  return [
    "MOV " + regA + ", " + literal(a),
    "MOV " + regB + ", " + literal(b),
    carryIn ? "STC" : "CLC",
    op + " " + regA + ", " + regB,
    "HLT"
  ].join("\n");
}
const flagNames = ["CF", "PF", "AF", "ZF", "SF", "OF"];
let arithmeticCases = 0;
const vectors8 = [0x00, 0x01, 0x0F, 0x10, 0x7E, 0x7F, 0x80, 0x81, 0xFE, 0xFF, 0x55, 0xAA];
const vectors16 = [0x0000, 0x0001, 0x000F, 0x0010, 0x7FFE, 0x7FFF, 0x8000, 0x8001, 0xFFFE, 0xFFFF, 0x5555, 0xAAAA];

for (const bits of [8, 16]) {
  const vectors = bits === 8 ? vectors8 : vectors16;
  const operations = ["ADD", "ADC", "SUB", "SBB", "CMP"];
  for (const op of operations) {
    for (const a of vectors) {
      for (const b of vectors) {
        const carries = op === "ADC" || op === "SBB" ? [0, 1] : [0];
        for (const carryIn of carries) {
          const expected = referenceArithmetic(a, b, op, bits, carryIn);
          const label = op + " " + bits + "-bit " + a.toString(16) + "," +
            b.toString(16) + " CFin=" + carryIn;
          test("FLAGS arithmétiques · " + label, () => {
            const state = runBoth(sourceFor(bits, a, b, op, carryIn),
              [...flagNames, "TF", "IF", "DF"]);
            for (const flag of flagNames) {
              assert.equal(state.flags[flag], expected[flag],
                label + " " + flag + " attendu " + expected[flag] +
                " obtenu " + state.flags[flag]);
            }
            if (op !== "CMP") {
              const actual = bits === 8 ? state.reg.AX & 255 : state.reg.AX;
              assert.equal(actual, expected.result, label + " résultat");
            }
          });
          arithmeticCases++;
        }
      }
    }
  }
}

// INC/DEC must preserve CF while updating the other arithmetic status flags.
let incDecCases = 0;
for (const bits of [8, 16]) {
  const reg = bits === 8 ? "AL" : "AX";
  const values = bits === 8 ? [0, 1, 0x0F, 0x7F, 0x80, 0xFF] :
    [0, 1, 0x0F, 0x7FFF, 0x8000, 0xFFFF];
  for (const op of ["INC", "DEC"]) {
    for (const value of values) {
      for (const initialCF of [0, 1]) {
        const mask = bits === 8 ? 255 : 65535;
        const expected = referenceArithmetic(value, 1, op === "INC" ? "ADD" : "SUB", bits, 0);
        const label = op + " " + bits + "-bit " + value.toString(16) + " CF=" + initialCF;
        test("FLAGS INC/DEC · " + label, () => {
          const state = runBoth([
            "MOV " + reg + ", 0" + value.toString(16) + "h",
            initialCF ? "STC" : "CLC",
            op + " " + reg,
            "HLT"
          ].join("\n"), ["CF","PF","AF","ZF","SF","OF","TF","IF","DF"]);
          assert.equal(state.reg.AX & mask, expected.result, label + " résultat");
          assert.equal(state.flags.CF, initialCF, label + " CF doit être conservé");
          for (const flag of ["PF", "AF", "ZF", "SF", "OF"]) {
            assert.equal(state.flags[flag], expected[flag], label + " " + flag);
          }
        });
        incDecCases++;
      }
    }
  }
}

// Logical operations define CF=0, OF=0, ZF/SF/PF from the result.
// AF is architecturally undefined and is deliberately not asserted.
let logicalCases = 0;
for (const bits of [8, 16]) {
  const regA = bits === 8 ? "AL" : "AX";
  const regB = bits === 8 ? "BL" : "BX";
  const vectors = bits === 8 ? vectors8 : vectors16;
  const mask = bits === 8 ? 255 : 65535;
  for (const op of ["AND", "OR", "XOR", "TEST"]) {
    for (const a of vectors) {
      for (const b of vectors) {
        const expected = op === "AND" || op === "TEST" ? a & b :
          op === "OR" ? a | b : a ^ b;
        const label = op + " " + bits + "-bit " + a.toString(16) + "," + b.toString(16);
        test("FLAGS logique · " + label, () => {
          const state = run([
            "MOV " + regA + ", 0" + a.toString(16) + "h",
            "MOV " + regB + ", 0" + b.toString(16) + "h",
            "STC", "STD", "CLC",
            op + " " + regA + ", " + regB,
            "HLT"
          ].join("\n"));
          const result = expected & mask;
          assert.equal(state.flags.CF, 0, label + " CF");
          assert.equal(state.flags.OF, 0, label + " OF");
          assert.equal(state.flags.ZF, result === 0 ? 1 : 0, label + " ZF");
          assert.equal(state.flags.SF, (result & (bits === 8 ? 128 : 32768)) ? 1 : 0, label + " SF");
          assert.equal(state.flags.PF, parity(result & 255), label + " PF");
          if (op !== "TEST") {
            const actual = bits === 8 ? state.reg.AX & 255 : state.reg.AX;
            assert.equal(actual, result, label + " résultat");
          }
        });
        logicalCases++;
      }
    }
  }
}

// MUL/IMUL define CF and OF only. Other status flags are intentionally ignored.
let multiplyCases = 0;
function signedProductFits(a, b, bits) {
  const product = signed(a, bits) * signed(b, bits);
  return product >= -(2 ** (bits - 1)) && product <= (2 ** (bits - 1)) - 1;
}
for (const bits of [8, 16]) {
  const regA = bits === 8 ? "AL" : "AX";
  const regB = bits === 8 ? "BL" : "BX";
  const vectors = bits === 8 ? [0, 1, 2, 0x7F, 0x80, 0xFE, 0xFF] :
    [0, 1, 2, 0x7FFF, 0x8000, 0xFFFE, 0xFFFF];
  for (const op of ["MUL", "IMUL"]) {
    for (const a of vectors) {
      for (const b of vectors) {
        const label = op + " " + bits + "-bit " + a.toString(16) + "," + b.toString(16);
        test("FLAGS multiplication · " + label, () => {
          const state = run([
            "MOV " + regA + ", 0" + a.toString(16) + "h",
            "MOV " + regB + ", 0" + b.toString(16) + "h",
            op + " " + regB,
            "HLT"
          ].join("\n"));
          let overflow;
          if (op === "IMUL") overflow = signedProductFits(a, b, bits) ? 0 : 1;
          else if (bits === 8) overflow = a * b <= 255 ? 0 : 1;
          else overflow = Math.floor((a * b) / 65536) === 0 ? 0 : 1;
          assert.equal(state.flags.CF, overflow, label + " CF");
          assert.equal(state.flags.OF, overflow, label + " OF");
        });
        multiplyCases++;
      }
    }
  }
}

console.log("FLAGS arithmétiques : " + arithmeticCases + " vecteurs.");
console.log("FLAGS INC/DEC : " + incDecCases + " vecteurs.");
console.log("FLAGS logiques : " + logicalCases + " vecteurs.");
console.log("FLAGS MUL/IMUL : " + multiplyCases + " vecteurs.");
console.log("Résultat FLAGS : " + passed + " réussis, " + failed + " échecs.");\nconsole.log("Vecteurs arithmétiques ADD/ADC/SUB/SBB/CMP : source/binaire.");
if (failed) process.exit(1);
