const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match);
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
const injection = "\nglobalThis.__prefixAluApi = {" +
  "\n assemble: s => assembleProgram(s)," +
  "\n disassemble: b => disassembleBytes(b)," +
  "\n execute: s => executeAll(s)," +
  "\n binary: (b,c,i,st) => executeBinary(b,c,i,st)" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1]);
vm.runInContext(instrumented, context, { timeout: 30000 });
const api = context.__prefixAluApi;
assert.ok(api);

const OPS = [
  { name: "ADD", base: 0x00 },
  { name: "ADC", base: 0x10 },
  { name: "SBB", base: 0x18 },
  { name: "SUB", base: 0x28 },
  { name: "CMP", base: 0x38 }
];
const SEGMENTS = [
  { name: "ES", prefix: 0x26, value: 0x2000 },
  { name: "CS", prefix: 0x2E, value: 0x0000 },
  { name: "SS", prefix: 0x36, value: 0x3000 },
  { name: "DS", prefix: 0x3E, value: 0x1000 }
];
let assertions = 0;
function check(ok, message) { assert.ok(ok, message); assertions++; }
function same(a, b, message) { assert.deepEqual(a, b, message); assertions++; }
function physical(segment, offset) {
  return (((segment & 0xFFFF) << 4) + (offset & 0xFFFF)) & 0xFFFFF;
}
function encoded(source) { return Array.from(api.assemble(source).bytes); }
function decode(bytes, mnemonic, message) {
  const d = api.disassemble(bytes);
  check(d.rows.length === 1, message + " one decoded row");
  same(Array.from(d.rows[0].bytes), bytes, message + " exact length");
  check(d.rows[0].instruction.includes(mnemonic), message + " decoded mnemonic");
  if (bytes[0] === 0xF0) {
    check(d.rows[0].instruction.startsWith("LOCK "), message + " LOCK prefix retained");
  } else if ([0x26, 0x2E, 0x36, 0x3E].includes(bytes[0])) {
    const segmentName = bytes[0] === 0x26 ? "ES" :
      bytes[0] === 0x2E ? "CS" : bytes[0] === 0x36 ? "SS" : "DS";
    check(d.rows[0].instruction.includes(segmentName + ":"),
      message + " segment override retained");
  }
}

// Every explicit segment override is tested with all five ALU operations,
// in both memory-destination and memory-source directions.
let segmentCases = 0;
for (const op of OPS) {
  for (const seg of SEGMENTS) {
    for (const direction of ["memory-destination", "memory-source"]) {
      const instruction = direction === "memory-destination"
        ? op.name + " BYTE PTR [BX], CL"
        : op.name + " CL, BYTE PTR [BX]";
      const source = [
        "MOV AX, 1000h", "MOV DS, AX",
        "MOV AX, 2000h", "MOV ES, AX",
        "MOV AX, 3000h", "MOV SS, AX",
        "MOV BX, 0200h",
        "MOV BYTE PTR " + seg.name + ":[BX], 10h",
        "MOV CL, 1", "CLC",
        seg.name + ":",
        instruction,
        "HLT"
      ].join("\n");
      const opcode = op.base + (direction === "memory-source" ? 2 : 0);
      // DS is the default segment for [BX], so an explicit DS override is redundant
      // and is canonically omitted by the assembler.
      const segmentPrefix = seg.name === "DS" ? [] : [seg.prefix];
      const expected = [...segmentPrefix, opcode, 0x0F];
      same(encoded(source), [
        0xB8,0x00,0x10, 0x8E,0xD8,
        0xB8,0x00,0x20, 0x8E,0xC0,
        0xB8,0x00,0x30, 0x8E,0xD0,
        0xBB,0x00,0x02,
        ...segmentPrefix,0xC6,0x07,0x10,
        0xB1,0x01,0xF8,
        ...expected,0xF4
      ], op.name + " " + seg.name + " " + direction + " assembled stream");
      decode(expected, op.name, op.name + " " + seg.name + " " + direction);
      const assembled = api.assemble(source);
      const bytes = Array.from(assembled.bytes);
      const sourceState = api.execute(source);
      const binaryState = api.binary(bytes, 0, 0, {});
      for (const [mode, state] of [["source", sourceState], ["binary", binaryState]]) {
        check(state.error === undefined, op.name + " " + seg.name + " " + mode + " execution");
        const address = physical(seg.value, 0x0200);
        const actualMemory = state.mem[address];
        if (direction === "memory-destination") {
          const expectedMemory = op.name === "ADD" || op.name === "ADC" ? 0x11
            : op.name === "SBB" || op.name === "SUB" ? 0x0F : 0x10;
          same(actualMemory, expectedMemory, op.name + " " + seg.name + " " + mode + " destination segment");
        } else {
          const expectedCL = op.name === "ADD" || op.name === "ADC" ? 0x11
            : op.name === "SBB" || op.name === "SUB" ? 0xF1 : 0x01;
          same(state.reg.CX & 0xFF, expectedCL, op.name + " " + seg.name + " " + mode + " source segment");
          same(actualMemory, 0x10, op.name + " " + seg.name + " " + mode + " source unchanged");
        }
      }
      segmentCases++;
    }
  }
}
check(segmentCases === 40, "5 operations × 4 segment overrides × 2 memory directions");

// REP-family prefixes are restricted to string instructions by the assembler.
for (const op of OPS) {
  for (const prefix of ["REP", "REPE", "REPNE"]) {
    let rejected = false;
    try { api.assemble(prefix + "\n" + op.name + " AX, BX"); } catch (_) { rejected = true; }
    check(rejected, prefix + " must reject non-string " + op.name);
  }
}

// Segment overrides require a memory operand for these ALU instructions.
// Duplicate overrides, or an override specified twice, are rejected.
for (const op of OPS) {
  for (const seg of SEGMENTS) {
    let rejected = false;
    try { api.assemble(seg.name + ":\n" + op.name + " AX, BX"); } catch (_) { rejected = true; }
    check(rejected, seg.name + " override rejected without memory for " + op.name);
  }
}
for (const source of [
  "ES:\nCS:\nADD BYTE PTR [BX], CL",
  "ES:\nADD BYTE PTR ES:[BX], CL",
  "REP\nLOCK\nADD AX, BX",
  "LOCK\nREP\nADD AX, BX"
]) {
  let rejected = false;
  try { api.assemble(source); } catch (_) { rejected = true; }
  check(rejected, "invalid/duplicate prefix sequence rejected: " + source.replace(/\n/g, " / "));
}

// LOCK is checked as a prefix byte on memory read-modify-write ALU forms.
// Its physical bus signal/atomicity remains outside this software model.
for (const op of OPS.slice(0, 4)) {
  const source = "MOV BX, 0200h\nMOV BYTE PTR [BX], 10h\nMOV CL, 1\nCLC\nLOCK\n" +
    op.name + " BYTE PTR [BX], CL\nHLT";
  const bytes = encoded(source);
  const lockAt = bytes.indexOf(0xF0);
  check(lockAt >= 0, "LOCK byte emitted for memory " + op.name);
  same(bytes.slice(lockAt, lockAt + 3), [0xF0, op.base, 0x0F],
    "LOCK prefix attaches to memory-destination " + op.name);
  decode(bytes.slice(lockAt, lockAt + 3), op.name, "LOCK " + op.name);
}
console.log("ALU prefix applicability: " + segmentCases +
  " segment-override execution cases; REP rejection; register-only segment rejection; duplicate prefix rejection; LOCK memory RMW encodings.");
console.log("Assertions: " + assertions + " passed.");
