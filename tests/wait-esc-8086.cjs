const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\\s\\S]*?)<\\/script>/);
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
const injection = "\\nglobalThis.__waitEscApi = {" +
  "\\n assemble: source => assembleProgram(source)," +
  "\\n disassemble: bytes => disassembleBytes(bytes)," +
  "\\n execute: source => executeAll(source)," +
  "\\n binary: (bytes, cs, ip, state) => executeBinary(bytes, cs, ip, state)" +
  "\\n};\\n})();\\n";
const instrumented = match[1].replace(/\\n\\}\\)\\(\\);\\s*$/, injection);
assert.notEqual(instrumented, match[1], "test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 30000 });
const api = context.__waitEscApi;
assert.ok(api);

let assertions = 0;
function check(condition, message) {
  assert.ok(condition, message);
  assertions++;
}
function same(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  assertions++;
}
function decode(bytes) {
  const result = api.disassemble(bytes);
  check(result.rows.length === 1, "one decoded instruction: " + bytes.map(x => x.toString(16)));
  same(Array.from(result.rows[0].bytes), bytes, "exact instruction length");
  return result.rows[0].instruction;
}

// WAIT is the fixed one-byte opcode 9Bh, with no explicit operand.
same(Array.from(api.assemble("WAIT").bytes), [0x9B], "WAIT encoding");
check(decode([0x9B]) === "WAIT", "WAIT decoding");
for (const invalid of ["WAIT AX", "WAIT 1", "WAIT [BX]"]) {
  let rejected = false;
  try { api.assemble(invalid); } catch (_) { rejected = true; }
  check(rejected, "invalid WAIT operands rejected: " + invalid);
}

// ESC carries a six-bit escape number and a ModR/M r/m operand.
// Exercise every escape number for register-direct and memory-direct forms.
for (let code = 0; code < 64; code++) {
  const opcode = 0xD8 + (code >> 3);
  const extension = code & 7;
  const regBytes = [opcode, 0xC0 | (extension << 3)];
  same(Array.from(api.assemble("ESC " + code + ", AX").bytes), regBytes,
    "ESC register encoding " + code);
  check(decode(regBytes) === "ESC " + code + ", AX", "ESC register decode " + code);

  const memBytes = [opcode, (extension << 3) | 7];
  same(Array.from(api.assemble("ESC " + code + ", WORD PTR [BX]").bytes), memBytes,
    "ESC memory encoding " + code);
  check(decode(memBytes) === "ESC " + code + ", WORD PTR [BX]",
    "ESC memory decode " + code);
}

// All 8 ESC primary opcodes × all 256 ModR/M bytes must consume exactly
// the opcode and ModR/M byte, including register and all memory addressing modes.
let decodedMatrix = 0;
for (let opcode = 0xD8; opcode <= 0xDF; opcode++) {
  for (let modrm = 0; modrm < 256; modrm++) {
    const bytes = [opcode, modrm];
    const result = api.disassemble(bytes);
    check(result.rows.length === 1, "ESC ModR/M row " + opcode.toString(16) + "/" + modrm.toString(16));
    same(Array.from(result.rows[0].bytes), bytes, "ESC ModR/M byte preservation");
    check(result.rows[0].instruction.startsWith("ESC "), "ESC mnemonic retained");
    decodedMatrix++;
  }
}
check(decodedMatrix === 2048, "all 2048 ESC opcode/ModR/M combinations traversed");

// ESC and WAIT are documented no-ops in this software-only model. They must
// not alter general registers, segments, flags, or memory in either execution path.
const source = [
  "MOV AX, 1234h", "MOV BX, 0020h", "MOV CX, 0003h",
  "MOV DX, 5678h", "MOV SI, 0100h", "MOV DI, 0200h",
  "MOV BP, 0300h", "MOV SP, 0F000h",
  "MOV AX, 1000h", "MOV DS, AX", "MOV AX, 2000h", "MOV ES, AX",
  "MOV AX, 1234h", "MOV BYTE PTR [BX], 5Ah",
  "PUSHF", "WAIT", "ESC 0, AX", "ESC 63, WORD PTR [BX]", "POPF", "HLT"
].join("\\n");
const assembled = api.assemble(source);
const bytes = Array.from(assembled.bytes);
const baseline = api.execute([
  "MOV AX, 1234h", "MOV BX, 0020h", "MOV CX, 0003h",
  "MOV DX, 5678h", "MOV SI, 0100h", "MOV DI, 0200h",
  "MOV BP, 0300h", "MOV SP, 0F000h",
  "MOV AX, 1000h", "MOV DS, AX", "MOV AX, 2000h", "MOV ES, AX",
  "MOV AX, 1234h", "MOV BYTE PTR [BX], 5Ah", "HLT"
].join("\\n"));
for (const [mode, state] of [
  ["source", api.execute(source)],
  ["binary", api.binary(bytes, 0, 0, {})]
]) {
  check(state.error === undefined, mode + " execution has no error");
  for (const register of ["AX","BX","CX","DX","SI","DI","BP","SP","CS","DS","ES","SS","IP"]) {
    if (baseline.reg[register] !== undefined && state.reg[register] !== undefined)
      check(state.reg[register] === baseline.reg[register], mode + " preserves " + register);
  }
  for (const flag of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])
    check(state.flags[flag] === baseline.flags[flag], mode + " preserves " + flag);
  const address = (((state.reg.DS & 0xFFFF) << 4) + state.reg.BX) & 0xFFFFF;
  check(state.mem[address] === 0x5A, mode + " preserves memory sentinel");
}
console.log("WAIT/ESC independent audit: WAIT encoding, decoding and invalid operands; all 64 ESC codes in register and memory forms; 2048 ESC opcode/ModR/M decode combinations; source/binary no-op semantics.");
console.log("Assertions: " + assertions + " passed.");
