const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Application script must exist");

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
const injection = "\nglobalThis.__8086MulDivSegmentApi = {" +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n disassemble: function (bytes) { return disassembleBytes(bytes); }," +
  "\n execute: function (source) { return executeAll(source); }," +
  "\n executeBinary: function (bytes, cs, ip, state) { return executeBinary(bytes, cs, ip, state); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 15000 });
const api = context.__8086MulDivSegmentApi;
assert.ok(api, "MUL/DIV segment-selection API must exist");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.stack); }
}
function byte(value) { return value.toString(16).toUpperCase().padStart(2, "0") + "h"; }
function word(value) { return (value & 0xFFFF).toString(16).toUpperCase().padStart(4, "0") + "h"; }

const segments = [
  { name: "ES", prefix: 0x26, value: 7, expression: "[BX]" },
  { name: "CS", prefix: 0x2E, value: 9, expression: "[BX]" },
  { name: "SS", prefix: 0x36, value: 11, expression: "[BX]" },
  // BP defaults to SS, so DS:[BP] makes the DS override observable.
  { name: "DS", prefix: 0x3E, value: 13, expression: "[BP]" }
];
const defaultSegments = [
  { name: "DS", expression: "[BX]", value: 7 },
  { name: "SS", expression: "[BP]", value: 11 }
];

function vector(op, bits, divisor) {
  if (bits === 8) {
    if (op === "MUL") return { axIn: 0x0003, dxIn: 0x4567, axOut: 3 * divisor, dxOut: 0x4567 };
    if (op === "IMUL") return { axIn: 0x00FE, dxIn: 0x4567, axOut: (-2 * divisor) & 0xFFFF, dxOut: 0x4567 };
    if (op === "DIV" || op === "IDIV") {
      return { axIn: 33, dxIn: 0x4567, axOut: ((33 % divisor) << 8) | Math.floor(33 / divisor), dxOut: 0x4567 };
    }
  } else {
    if (op === "MUL") {
      const product = 3 * divisor;
      return { axIn: 3, dxIn: 0, axOut: product & 0xFFFF, dxOut: Math.floor(product / 0x10000) };
    }
    if (op === "IMUL") {
      const product = -2 * divisor;
      return { axIn: 0xFFFE, dxIn: 0, axOut: product & 0xFFFF, dxOut: (Math.floor(product / 0x10000)) & 0xFFFF };
    }
    if (op === "DIV" || op === "IDIV") {
      return { axIn: 33, dxIn: 0, axOut: Math.floor(33 / divisor), dxOut: 33 % divisor };
    }
  }
  throw new Error("Missing vector " + op + " " + bits);
}

function makeSource(op, bits, expression, explicitSegment, divisorValues) {
  const ptr = bits === 8 ? "BYTE PTR " : "WORD PTR ";
  const lines = [
    "MOV AX, 1000h", "MOV DS, AX",
    "MOV AX, 2000h", "MOV SS, AX",
    "MOV AX, 3000h", "MOV ES, AX"
  ];
  for (const item of [
    { name: "DS", value: divisorValues.DS },
    { name: "ES", value: divisorValues.ES },
    { name: "SS", value: divisorValues.SS },
    { name: "CS", value: divisorValues.CS }
  ]) {
    lines.push("MOV " + ptr + item.name + ":[0200h], " +
      (bits === 8 ? byte(item.value) : word(item.value)));
  }
  lines.push("MOV BX, 0200h", "MOV BP, 0200h");
  const target = ptr + (explicitSegment ? explicitSegment + ":" : "") + expression;
  const selected = explicitSegment || (expression === "[BP]" ? "SS" : "DS");
  const expected = vector(op, bits, divisorValues[selected]);
  lines.push("MOV DX, " + word(expected.dxIn));
  lines.push("MOV AX, " + word(expected.axIn));
  lines.push(op + " " + target, "HLT");
  return { source: lines.join("\n"), expected, target };
}

function assertState(state, expected, label) {
  assert.ok(!state.error, label + " : " + (state.error || "execution error"));
  assert.equal(state.reg.AX, expected.axOut, label + " AX");
  assert.equal(state.reg.DX, expected.dxOut, label + " DX");
}

const divisorValues = { DS: 13, ES: 7, SS: 11, CS: 9 };
let runtimeVectors = 0;

// Each explicit segment is tested against a distinct value at the same offset.
// DS:[BP] deliberately overrides BP's default SS segment; the other explicit
// overrides use [BX] and deliberately differ from BX's default DS segment.
for (const op of ["MUL", "IMUL", "DIV", "IDIV"]) {
  for (const bits of [8, 16]) {
    for (const segment of segments) {
      const item = makeSource(op, bits, segment.expression, segment.name, divisorValues);
      const label = op + " " + bits + "-bit " + segment.name + ":" + segment.expression;
      test("Segment override source execution " + label, () => {
        assertState(api.execute(item.source), item.expected, label);
      });
      test("Segment override binary execution " + label, () => {
        const assembled = api.assemble(item.source);
        assert.ok(Array.from(assembled.bytes).includes(segment.prefix),
          label + " must encode prefix " + segment.prefix.toString(16));
        assertState(api.executeBinary(assembled.bytes, 0, 0), item.expected, label);
      });
      runtimeVectors += 2;
    }
  }
}

// Prove both implicit defaults independently, rather than initializing and
// reading memory through the same default-addressing path.
for (const op of ["MUL", "IMUL", "DIV", "IDIV"]) {
  for (const bits of [8, 16]) {
    for (const segment of defaultSegments) {
      const item = makeSource(op, bits, segment.expression, null, divisorValues);
      const label = op + " " + bits + "-bit default " + segment.name + " " + segment.expression;
      test("Default segment source execution " + label, () => {
        assertState(api.execute(item.source), item.expected, label);
      });
      test("Default segment binary execution " + label, () => {
        const assembled = api.assemble(item.source);
        assertState(api.executeBinary(assembled.bytes, 0, 0), item.expected, label);
      });
      runtimeVectors += 2;
    }
  }
}

// LOCK may coexist with a segment override on the original 8086. Verify the
// two prefix bytes are both retained before the F6/F7 opcode, then execute
// both the source and binary forms. The memory operand is read-only here.
for (const op of ["MUL", "IMUL", "DIV", "IDIV"]) {
  for (const segment of segments) {
    const bits = 8;
    const item = makeSource(op, bits, segment.expression, segment.name, divisorValues);
    const source = item.source.replace(op + " BYTE PTR " + segment.name + ":" + segment.expression,
      "LOCK\n" + op + " BYTE PTR " + segment.name + ":" + segment.expression);
    const label = "LOCK + " + segment.name + " + " + op;
    test("LOCK and segment prefix encoding " + label, () => {
      const bytes = Array.from(api.assemble(source).bytes);
      const opcodeIndex = bytes.findIndex((value, index) =>
        value === 0xF6 && index >= 2 && bytes[index - 1] !== undefined);
      assert.ok(opcodeIndex >= 2, label + " must retain both prefixes");
      assert.ok(bytes.slice(0, opcodeIndex).includes(0xF0), label + " LOCK byte");
      assert.ok(bytes.slice(0, opcodeIndex).includes(segment.prefix), label + " segment byte");
    });
    test("LOCK and segment prefix source execution " + label, () => {
      assertState(api.execute(source), item.expected, label);
    });
    test("LOCK and segment prefix binary execution " + label, () => {
      const bytes = api.assemble(source).bytes;
      assertState(api.executeBinary(bytes, 0, 0), item.expected, label);
    });
  }
}

// All five repeat-prefix spellings are checked independently for each
// instruction. None of these arithmetic instructions is a string primitive.
for (const prefix of ["REP", "REPE", "REPZ", "REPNE", "REPNZ"]) {
  for (const op of ["MUL", "IMUL", "DIV", "IDIV"]) {
    for (const operand of ["BL", "BYTE PTR [BX]"]) {
      const source = prefix + "\n" + op + " " + operand;
      test("Reject " + prefix + " on " + op + " " + operand, () => {
        assert.throws(() => api.assemble(source), undefined,
          prefix + " must not be accepted for " + op);
      });
    }
  }
}

console.log("MUL/IMUL/DIV/IDIV segment-selection runtime vectors : " + runtimeVectors);
console.log("MUL/IMUL/DIV/IDIV prefix interaction audit : " + passed + " passed, " + failed + " failed.");
if (failed) process.exit(1);
