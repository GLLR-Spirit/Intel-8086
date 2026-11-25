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
const injection = "\nglobalThis.__8086XlatApi = {" +
  "\n assemble: source => assembleProgram(source)," +
  "\n execute: source => executeAll(source)," +
  "\n executeBinary: (bytes, cs, ip, initialState) => executeBinary(bytes, cs, ip, initialState)," +
  "\n disassemble: bytes => disassembleBytes(bytes)" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 30000 });
const api = context.__8086XlatApi;
assert.ok(api, "XLAT audit API must be exposed");

let passed = 0, failed = 0;
const totals = { encodings: 0, source: 0, binary: 0, flags: 0, wrap: 0, invalid: 0 };
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.message); }
}
function byte(value) {
  return value.toString(16).toUpperCase().padStart(2, "0") + "h";
}
function word(value) {
  return value.toString(16).toUpperCase().padStart(4, "0") + "h";
}
function physical(segment, offset) {
  return (((segment << 4) + (offset & 0xFFFF)) & 0xFFFFF);
}
function sameFlags(actual, expected, label) {
  for (const key of Object.keys(expected)) assert.equal(actual[key], expected[key], label + " " + key);
}
function sourceRun(source) {
  const state = api.execute(source);
  assert.ok(!state.error, state.error || "source execution failed");
  assert.equal(state.execution.mode, "binary-offset");
  return state;
}
function binaryRun(bytes, cs, ip, initialState) {
  const state = api.executeBinary(bytes, cs, ip, initialState);
  assert.ok(!state.error, state.error || "binary execution failed");
  assert.equal(state.execution.mode, "dynamic-binary");
  return state;
}
const flagPattern = { CF: 1, PF: 0, AF: 1, ZF: 0, SF: 1, OF: 1, TF: 1, IF: 1, DF: 1 };
const segments = [
  { name: "DS", prefix: null, opcodePrefix: [], segment: 0x1000, value: 0x31 },
  { name: "ES", prefix: "ES: ", opcodePrefix: [0x26], segment: 0x2000, value: 0x52 },
  { name: "SS", prefix: "SS: ", opcodePrefix: [0x36], segment: 0x3000, value: 0x73 },
  { name: "CS", prefix: "CS: ", opcodePrefix: [0x2E], segment: 0x0000, value: 0x94 }
];

// A. Exact opcode, assembler output, raw disassembly and segment-override bytes.
for (const item of segments) {
  const source = (item.prefix || "") + "XLAT";
  const expected = item.opcodePrefix.concat([0xD7]);
  test("Encodage fixe " + source, () => {
    assert.deepEqual(Array.from(api.assemble(source).bytes), expected);
  });
  test("Désassemblage brut " + source, () => {
    const decoded = api.disassemble(expected);
    assert.equal(decoded.rows.length, 1);
    assert.deepEqual(Array.from(decoded.rows[0].bytes), expected);
    assert.equal(decoded.rows[0].instruction, source.trim());
  });
  totals.encodings += 2;
}
test("XLAT suivi de HLT conserve les frontières d'instruction", () => {
  const decoded = api.disassemble([0xD7, 0xF4]);
  assert.deepEqual(decoded.rows.map(row => row.instruction), ["XLAT", "HLT"]);
  assert.deepEqual(decoded.rows.map(row => row.bytes), [[0xD7], [0xF4]]);
  totals.encodings++;
});

// B. Source path: each segment override reads the selected segment, not DS.
// BX+AL = 8000h. The source initializes distinct bytes in every segment.
for (const item of segments) {
  const source = [
    ...(item.name === "CS" ? [] : ["MOV AX, " + word(item.segment), "MOV " + item.name + ", AX"]),
    "MOV BYTE PTR " + item.name + ":[8000h], " + byte(item.value),
    "MOV BX, 7FF0h",
    "MOV AL, 10h",
    "MOV AX, 0F93h",
    "PUSH AX",
    "POPF",
    "MOV AL, 10h",
    (item.prefix || "") + "XLAT",
    "HLT"
  ].join("\n");
  test("Source segment " + item.name + " et FLAGS préservés", () => {
    const state = sourceRun(source);
    assert.equal(state.reg.AX & 0xFF, item.value);
    sameFlags(state.flags, flagPattern, "XLAT " + item.name);
    assert.equal(state.reg.BX, 0x7FF0);
    totals.source++;
    totals.flags++;
  });
}

// C. Source path: default DS and 16-bit offset wraparound.
test("Source DS par défaut et débordement BX+AL : FFF0h + 20h = 0010h", () => {
  const source = [
    "MOV AX, 1000h", "MOV DS, AX",
    "MOV BYTE PTR DS:[0010h], 0A6h",
    "MOV BX, 0FFF0h", "MOV AL, 20h",
    "XLAT", "HLT"
  ].join("\n");
  const state = sourceRun(source);
  assert.equal(state.reg.AX & 255, 0xA6);
  totals.source++;
  totals.wrap++;
});

// D. Binary path: initialized memory is seeded independently of the code bytes.
for (const item of segments) {
  const cs = 0x5000, ip = 0x0100, bx = 0x7FF0, al = 0x10, offset = 0x8000;
  const initialState = {
    reg: { BX: bx, AX: al, DS: 0x1000, ES: 0x2000, SS: 0x3000 },
    flags: { ...flagPattern },
    mem: {
      [physical(0x1000, offset)]: 0x31,
      [physical(0x2000, offset)]: 0x52,
      [physical(0x3000, offset)]: 0x73,
      [physical(0x4000, offset)]: 0x94
    }
  };
  const code = item.opcodePrefix.concat([0xD7, 0xF4]);
  test("Binaire segment " + item.name + " et FLAGS préservés", () => {
    const state = binaryRun(code, cs, ip, initialState);
    assert.equal(state.reg.AX & 255, item.value);
    sameFlags(state.flags, flagPattern, "binaire " + item.name);
    assert.equal(state.reg.BX, bx);
    assert.equal(state.execution.decodedInstructions, 2);
    totals.binary++;
    totals.flags++;
  });
}

// E. Binary default DS, offset wraparound and 20-bit physical-address wrap.
test("Binaire DS par défaut et débordement 16 bits de BX+AL", () => {
  const state = binaryRun([0xD7, 0xF4], 0x5000, 0x0100, {
    reg: { BX: 0xFFF0, AX: 0x0020, DS: 0x1000 },
    mem: { [physical(0x1000, 0x0010)]: 0xB7 }
  });
  assert.equal(state.reg.AX & 255, 0xB7);
  totals.binary++;
  totals.wrap++;
});
test("Binaire adresse physique 20 bits rebouclée à 00000h", () => {
  const state = binaryRun([0xD7, 0xF4], 0x5000, 0x0100, {
    reg: { BX: 0x0000, AX: 0x0010, DS: 0xFFFF },
    mem: { 0: 0xC8 }
  });
  assert.equal(state.reg.AX & 255, 0xC8);
  totals.binary++;
  totals.wrap++;
});

// F. Uninitialized source bytes must not silently become zero.
test("Source : lecture XLAT non initialisée rejetée", () => {
  const state = api.execute(["MOV BX, 1234h", "MOV AL, 02h", "XLAT", "HLT"].join("\n"));
  assert.ok(state.error, "uninitialized XLAT source must fail");
  assert.match(state.error, /XLAT.*non initialisé/i);
  totals.invalid++;
});
test("Binaire : lecture XLAT non initialisée rejetée", () => {
  const state = api.executeBinary([0xD7, 0xF4], 0x5000, 0x0100, {
    reg: { BX: 0x1234, AX: 0x0002, DS: 0x1000 }
  });
  assert.ok(state.error, "uninitialized binary XLAT source must fail");
  assert.match(state.error, /XLAT.*non initialisé/i);
  totals.invalid++;
});

// G. XLAT has no explicit operands.
for (const source of ["XLAT AX", "XLAT 1"]) {
  test("Syntaxe invalide rejetée : " + source, () => {
    assert.throws(() => api.assemble(source));
    const state = api.execute(source);
    assert.ok(state.error, source + " must fail source validation");
    totals.invalid++;
  });
}

console.log("XLAT encodage/désassemblage : " + totals.encodings);
console.log("XLAT exécutions source : " + totals.source);
console.log("XLAT exécutions binaires : " + totals.binary);
console.log("XLAT contrôles FLAGS : " + totals.flags);
console.log("XLAT débordements d'adresse : " + totals.wrap);
console.log("XLAT rejets : " + totals.invalid);
console.log("Audit XLAT : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
