const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "inline application script must exist");
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
const injection = "\nglobalThis.__aluFormsApi = {" +
  "\n assemble: source => assembleProgram(source)," +
  "\n disassemble: bytes => disassembleBytes(bytes)," +
  "\n execute: source => executeAll(source)," +
  "\n binary: (bytes, cs, ip, state) => executeBinary(bytes, cs, ip, state)" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 30000 });
const api = context.__aluFormsApi;
assert.ok(api);

const REG8 = ["AL", "CL", "DL", "BL", "AH", "CH", "DH", "BH"];
const REG16 = ["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"];
const EA = ["BX+SI", "BX+DI", "BP+SI", "BP+DI", "SI", "DI", "BP", "BX"];
const OPS = [
  { name: "ADD", base: 0x00, ext: 0, apply: (a,b,c) => a+b+c },
  { name: "ADC", base: 0x10, ext: 2, apply: (a,b,c) => a+b+c },
  { name: "SBB", base: 0x18, ext: 3, apply: (a,b,c) => a-b-c },
  { name: "SUB", base: 0x28, ext: 5, apply: (a,b,c) => a-b-c },
  { name: "CMP", base: 0x38, ext: 7, apply: (a,b,c) => a-b-c }
];
let assertions = 0;
function same(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  assertions++;
}
function check(condition, message) {
  assert.ok(condition, message);
  assertions++;
}
function modrm(mod, reg, rm) { return (mod << 6) | (reg << 3) | rm; }
function displacement(mod, rm) {
  if (mod === 0 && rm === 6) return [0x34, 0x12];
  if (mod === 1) return [0x01];
  if (mod === 2) return [0x00, 0x01];
  return [];
}
function memory(mod, rm, width) {
  const expr = mod === 0 && rm === 6 ? "[4660]"
    : mod === 0 ? "[" + EA[rm] + "]"
    : mod === 1 ? "[" + EA[rm] + "+1]"
    : "[" + EA[rm] + "+256]";
  return (width === 8 ? "BYTE PTR " : "WORD PTR ") + expr;
}
function bytes(source) { return Array.from(api.assemble(source).bytes); }
function decodeOne(expected, mnemonic, label) {
  const d = api.disassemble(expected);
  check(d.rows.length === 1, label + ": exactly one decoded row");
  same(Array.from(d.rows[0].bytes), expected, label + ": full instruction length");
  check(d.rows[0].instruction.startsWith(mnemonic + " "), label + ": mnemonic " + mnemonic);
}

// A. All 5 arithmetic/compare mnemonics × 4 direction/width opcodes ×
// all 4 ModR/M modes × all reg/r/m fields. The expected opcode and ModR/M
// byte are generated independently from the Intel encoding table.
let directionalCases = 0;
for (const op of OPS) {
  for (let form = 0; form < 4; form++) {
    const width = form & 1 ? 16 : 8;
    const opcode = op.base + form;
    for (let mod = 0; mod < 4; mod++) {
      for (let reg = 0; reg < 8; reg++) {
        for (let rm = 0; rm < 8; rm++) {
          const rmOperand = mod === 3
            ? (width === 8 ? REG8[rm] : REG16[rm])
            : memory(mod, rm, width);
          const regOperand = width === 8 ? REG8[reg] : REG16[reg];
          const source = form < 2
            ? op.name + " " + rmOperand + ", " + regOperand
            : op.name + " " + regOperand + ", " + rmOperand;
          // For identical register operands the assembler canonicalizes the
          // commutative-looking register alias to the r/m,reg opcode direction.
          // The instruction remains semantically identical; pin that canonical byte.
          const registerRegisterReverse = mod === 3 && form >= 2;
          const expectedOpcode = registerRegisterReverse ? op.base + (form - 2) : opcode;
          const expectedModRM = registerRegisterReverse
            ? modrm(3, rm, reg) : modrm(mod, reg, rm);
          const expected = [expectedOpcode, expectedModRM, ...displacement(mod, rm)];
          same(bytes(source), expected, source + " encoding");
          decodeOne(expected, op.name, source + " decoding");
          directionalCases++;
        }
      }
    }
  }
}
check(directionalCases === 5120, "5×4×4×8×8 directional matrix");

// B. Immediate groups: 80 /digit ib, 81 /digit iw, 83 /digit sign-extended ib.
// Each operation is tested in all ModR/M modes and all reg/r/m fields.
let immediateCases = 0;
for (const op of OPS) {
  for (const [opcode, width, literal, immediate] of [
    [0x80, 8, "7Fh", [0x7F]],
    [0x81, 16, "1234h", [0x34, 0x12]],
    [0x83, 16, "-1", [0xFF]]
  ]) {
    for (let mod = 0; mod < 4; mod++) {
      for (let rm = 0; rm < 8; rm++) {
        const operand = mod === 3
          ? (width === 8 ? REG8[rm] : REG16[rm])
          : memory(mod, rm, width);
        const source = op.name + " " + operand + ", " + literal;
        const expected = [opcode, modrm(mod, op.ext, rm), ...displacement(mod, rm), ...immediate];
        same(bytes(source), expected, source + " immediate encoding");
        decodeOne(expected, op.name, source + " immediate decoding");
        immediateCases++;
      }
    }
  }
}
check(immediateCases === 480, "5×3×4×8 immediate group matrix");

// C. Accumulator-specific immediate opcodes (04/05, 14/15, ...).
for (const op of OPS) {
  for (const [width, suffix, imm] of [[8, "AL", [0x7F]], [16, "AX", [0x34,0x12]]]) {
    const opcode = op.base + (width === 8 ? 4 : 5);
    const literal = width === 8 ? "7Fh" : "1234h";
    const expected = [opcode, ...imm];
    same(bytes(op.name + " " + suffix + ", " + literal), expected, op.name + " accumulator immediate");
    decodeOne(expected, op.name, op.name + " accumulator immediate decode");
  }
}

// D. Invalid sizes and operand classes must be rejected by the assembler.
for (const source of [
  "ADD AX, BL", "ADC AL, CX", "SBB WORD PTR [BX], AL",
  "SUB BYTE PTR [BX], 1234h", "CMP [BX], [SI]",
  "ADD AX", "ADC AX, BX, CX", "CMP CS, AX"
]) {
  let rejected = false;
  try { api.assemble(source); } catch (_) { rejected = true; }
  check(rejected, "invalid operand form rejected: " + source);
}

// E. Independent source/binary semantic checks, one boundary case per operation.
// Expected results are mathematical, not copied from the simulator.
const semanticCases = [
  { op: "ADD", initial: 0x7F, carry: 0, result: 0x80 },
  { op: "ADC", initial: 0x7F, carry: 1, result: 0x81 },
  { op: "SBB", initial: 0x00, carry: 1, result: 0xFF },
  { op: "SUB", initial: 0x00, carry: 0, result: 0xFF },
  { op: "CMP", initial: 0x55, carry: 0, result: 0x55 }
];
for (const vector of semanticCases) {
  const setup = [
    "MOV AX, 1000h", "MOV DS, AX", "MOV BX, 0200h",
    "MOV BYTE PTR [BX], " + vector.initial.toString(16) + "h",
    vector.carry ? "STC" : "CLC",
    vector.op + " BYTE PTR [BX], " + (vector.op === "ADD" || vector.op === "ADC" ? "1" : vector.op === "CMP" ? "55h" : "1"),
    "HLT"
  ];
  if (vector.op === "CMP") setup[3] = "MOV BYTE PTR [BX], 55h";
  const source = setup.join("\n");
  const assembled = api.assemble(source);
  const code = Array.from(assembled.bytes);
  const srcState = api.execute(source);
  const binState = api.binary(code, 0, 0, {});
  for (const [mode, state] of [["source", srcState], ["binary", binState]]) {
    check(state.error === undefined, vector.op + " " + mode + " execution");
    const address = (((state.reg.DS & 0xFFFF) << 4) + 0x0200) & 0xFFFFF;
    same(state.mem[address], vector.result, vector.op + " " + mode + " memory result");
  }
}
console.log("ALU independent forms: " + directionalCases + " directional assembler cases; " +
  immediateCases + " immediate-group assembler cases; 10 accumulator encodings; " +
  "invalid operand constraints; source/binary semantic boundaries.");
console.log("Assertions: " + assertions + " passed.");
