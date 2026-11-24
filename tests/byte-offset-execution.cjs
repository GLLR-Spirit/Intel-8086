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
const injection = "\nglobalThis.__8086ByteOffsetApi = {" +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n execute: function (source) { return executeAll(source); }," +
  "\n executeBinary: function (bytes, cs, ip) { return executeBinary(bytes, cs, ip); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 30000 });
const api = context.__8086ByteOffsetApi;
assert.ok(api, "Byte-offset test API must be exposed");

let passed = 0, failed = 0;
const counts = { mapping: 0, branches: 0, calls: 0, wrap: 0 };
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.message); }
}
function assemble(source) { return api.assemble(source); }
function execute(source) {
  const result = api.execute(source);
  assert.ok(!result.error, result.error || "execution failed");
  return result;
}

// The assembled listing and symbol table define the byte-address map used by execution.
const mappedSource = [
  "NOP",
  "MOV AX, 1234h",
  "JMP DONE",
  "PAD: NOP",
  "DONE: HLT"
].join("\n");
test("assembler exposes monotonically increasing byte offsets and matching symbols", () => {
  const a = assemble(mappedSource);
  assert.deepEqual(Array.from(a.rows, row => row.offset), [0, 1, 4, 6, 7]);
  assert.equal(a.symbols.PAD, 6);
  assert.equal(a.symbols.DONE, 7);
  assert.equal(a.size, 8);
});
counts.mapping++;

// Sequential execution publishes the current instruction byte offset in IP,
// not the zero-based index in the parsed instruction array.
test("IP advances by encoded instruction lengths", () => {
  const s = execute(mappedSource);
  assert.equal(s.execution.mode, "binary-offset");
  assert.equal(s.execution.codeSize, 8);
  assert.equal(s.reg.AX, 0x1234);
  assert.equal(s.reg.IP, 8);
});
counts.mapping++;

// Conditional and unconditional direct branches must land on the instruction
// whose assembled offset matches the label, despite variable instruction sizes.
test("Jcc resolves to its label's byte offset", () => {
  const source = [
    "MOV AX, 0",
    "CMP AX, 0",
    "JE TAKEN",
    "MOV BX, 0",
    "JMP END",
    "TAKEN: MOV BX, 1",
    "END: HLT"
  ].join("\n");
  const a = assemble(source), s = execute(source);
  assert.equal(s.reg.BX, 1);
  assert.equal(s.reg.IP, a.size);
  assert.equal(s.execution.mode, "binary-offset");
});
counts.branches++;

test("LOOP uses the label map while IP follows byte offsets", () => {
  const source = ["MOV CX, 3", "MOV AX, 0", "AGAIN: INC AX", "LOOP AGAIN", "HLT"].join("\n");
  const a = assemble(source), s = execute(source);
  assert.equal(s.reg.AX, 3);
  assert.equal(s.reg.CX, 0);
  assert.equal(s.reg.IP, a.size);
});
counts.branches++;

// CALL pushes the offset immediately after the CALL instruction. RET resolves
// that offset back to an instruction boundary before resuming.
test("CALL stores a byte return address in the simulated stack", () => {
  const s = execute(["NOP", "CALL SUB", "HLT", "SUB: HLT"].join("\n"));
  assert.equal(s.reg.IP, 6);
  assert.equal(s.stack.length, 1);
  assert.equal(s.stack[0].value, 4);
  assert.equal(s.stack[0].kind, "return");
});
counts.calls++;

test("RET maps the saved byte offset back to the caller instruction", () => {
  const s = execute(["CALL SUB", "HLT", "SUB: MOV AX, 1234h", "RET"].join("\n"));
  assert.equal(s.reg.AX, 0x1234);
  assert.equal(s.reg.IP, 4);
  assert.equal(s.reg.SP, 0xFFFE);
  assert.equal(s.stack.length, 0);
});
counts.calls++;

// A full 64 KiB image places XOR AX,AX at FFFEh. Its following IP wraps to
// 0000h; the now-true JZ branches to HLT, proving that wrap is executable.
test("IP wraps FFFFh to 0000h and resumes at the first byte", () => {
  const padding = Array(65529).fill("NOP").join("\n");
  const source = ["JZ DONE", "JMP LAST", "DONE: HLT", padding, "LAST: XOR AX, AX"].join("\n");
  const a = assemble(source);
  assert.equal(a.size, 65536);
  assert.equal(a.symbols.LAST, 0xFFFE);
  const s = execute(source);
  assert.equal(s.reg.AX, 0);
  assert.equal(s.flags.ZF, 1);
  assert.equal(s.reg.IP, 5);
  assert.equal(s.execution.codeSize, 65536);
});
counts.wrap++;

console.log("Table offset octet / symboles : " + counts.mapping + " tests.");
console.log("Branchements directs et LOOP : " + counts.branches + " tests.");
console.log("CALL / RET et adresses de retour : " + counts.calls + " tests.");
console.log("Bouclage IP sur segment de 64 Kio : " + counts.wrap + " test.");
console.log("Résultat cohérence binaire/exécution : " + passed + " réussis, " + failed + " échecs.");

const countsBinary = { loading: 0, branches: 0, validation: 0 };
function executeLoaded(bytes, cs, ip) {
  const result = api.executeBinary(bytes, cs, ip);
  assert.ok(!result.error, result.error || "binary execution failed");
  return result;
}
test("loads bytes at the selected CS:IP and executes decoded instructions", () => {
  const bytes = [0xB8,0x34,0x12,0x40,0xF4];
  const state = executeLoaded(bytes, 0x1000, 0x0100);
  assert.equal(state.execution.mode, "dynamic-binary");
  assert.equal(state.execution.loadCS, 0x1000);
  assert.equal(state.execution.loadIP, 0x0100);
  assert.equal(state.reg.CS, 0x1000);
  assert.equal(state.reg.IP, 0x0105);
  assert.equal(state.reg.AX, 0x1235);
  assert.deepEqual([state.mem[0x10100],state.mem[0x10101],state.mem[0x10102],state.mem[0x10103],state.mem[0x10104]], bytes);
});
countsBinary.loading++;
test("binary conditional branch resolves to a decoded target instruction", () => {
  const bytes = [0xB8,0,0,0x3D,0,0,0x74,3,0xB8,1,0,0xF4];
  const state = executeLoaded(bytes, 0x2000, 0x0200);
  assert.equal(state.reg.AX, 0);
  assert.equal(state.reg.IP, 0x020C);
  assert.equal(state.execution.decodedInstructions, 4);
});
countsBinary.branches++;
test("rejects a branch target in the middle of an instruction", () => {
  const result = api.executeBinary([0xEB,0x01,0xB8,0x34,0x12,0xF4],0,0);
  assert.ok(result.error && /ne correspond pas à une instruction décodée/.test(result.error));
});
countsBinary.validation++;
test("rejects unsupported DB opcodes instead of silently executing them", () => {
  const result = api.executeBinary([0x0F,0xF4],0,0);
  assert.ok(result.error && /non pris en charge/.test(result.error));
});
countsBinary.validation++;
test("validates initial segment and offset as 16-bit values", () => {
  assert.match(api.executeBinary([0xF4],0x10000,0).error,/16 bits/);
  assert.match(api.executeBinary([0xF4],0,-1).error,/16 bits/);
});
countsBinary.validation++;
console.log("Chargement CS:IP et mémoire : " + countsBinary.loading + " test.");
console.log("Branchements binaires : " + countsBinary.branches + " test.");
console.log("Validation du flux chargé : " + countsBinary.validation + " tests.");


test("binary CALL/RET uses the loaded image byte return address", () => {
  const state = executeLoaded([0xE8,0x01,0x00,0xF4,0xB8,0x34,0x12,0xC3],0x3000,0x0100);
  assert.equal(state.reg.AX,0x1234);
  assert.equal(state.reg.IP,0x0104);
  assert.equal(state.reg.SP,0xFFFE);
  assert.equal(state.stack.length,0);
});
countsBinary.branches++;
test("binary loading wraps IP at FFFFh and physical memory follows 20-bit addressing", () => {
  const state = executeLoaded([0x90,0xF4],0x1234,0xFFFF);
  assert.equal(state.reg.CS,0x1234);
  assert.equal(state.reg.IP,0x0001);
  assert.equal(state.mem[((0x1234<<4)+0xFFFF)&0xFFFFF],0x90);
  assert.equal(state.mem[((0x1234<<4)+0x0000)&0xFFFFF],0xF4);
});
countsBinary.loading++;


test("assembled source and loaded binary produce matching architectural state", () => {
  const source = ["MOV AX, 7", "ADD AX, 5", "CMP AX, 12", "JE DONE", "MOV BX, 1", "DONE: HLT"].join("\n");
  const assembled = api.assemble(source);
  const sourceState = execute(source);
  const binaryState = executeLoaded(Array.from(assembled.bytes),0x4000,0x0080);
  for (const register of ["AX","BX","CX","DX","CS","IP"]) assert.equal(binaryState.reg[register],register==="CS"?0x4000:register==="IP"?0x0080+assembled.size:sourceState.reg[register],register);
  for (const flag of ["CF","ZF","SF","OF","PF","AF"]) assert.equal(binaryState.flags[flag],sourceState.flags[flag],flag);
});
countsBinary.branches++;


test("dynamic branch fetches an instruction inside bytes previously decoded as an immediate", () => {
  const state = executeLoaded([0xEB,0x01,0xB8,0xF4,0x00],0x2100,0x0300);
  assert.equal(state.steps,2);
  assert.equal(state.reg.IP,0x0304);
  assert.equal(state.execution.fetchDecodeExecute,true);
});
countsBinary.branches++;
test("self-modifying code is fetched again from memory after a write", () => {
  const state = executeLoaded([0xC6,0x06,0x08,0x00,0xF4,0xEB,0x01,0x90,0x90],0x2200,0x0400);
  assert.equal(state.steps,3);
  assert.equal(state.reg.IP,0x0409);
  assert.equal(state.mem[0x22008],0xF4);
});
countsBinary.branches++;
test("relative branches after the first instruction use the current IP as their base", () => {
  const state = executeLoaded([0x40,0xEB,0x01,0xB8,0xF4,0x00],0x2300,0x0500);
  assert.equal(state.reg.AX,0);
  assert.equal(state.reg.IP,0x0504);
  assert.equal(state.steps,3);
});
countsBinary.branches++;

if (failed) process.exit(1);
