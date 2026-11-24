const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\\s\\S]*?)<\\/script>/);
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
const injection = "\\nglobalThis.__8086ByteOffsetApi = {" +
  "\\n assemble: function (source) { return assembleProgram(source); }," +
  "\\n execute: function (source) { return executeAll(source); }" +
  "\\n};\\n})();\\n";
const instrumented = match[1].replace(/\\n\\}\\)\\(\\);\\s*$/, injection);
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
].join("\\n");
test("assembler exposes monotonically increasing byte offsets and matching symbols", () => {
  const a = assemble(mappedSource);
  assert.deepEqual(a.rows.map(row => row.offset), [0, 1, 4, 6, 7]);
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
  ].join("\\n");
  const a = assemble(source), s = execute(source);
  assert.equal(s.reg.BX, 1);
  assert.equal(s.reg.IP, a.size);
  assert.equal(s.execution.mode, "binary-offset");
});
counts.branches++;

test("LOOP uses the label map while IP follows byte offsets", () => {
  const source = ["MOV CX, 3", "MOV AX, 0", "AGAIN: INC AX", "LOOP AGAIN", "HLT"].join("\\n");
  const a = assemble(source), s = execute(source);
  assert.equal(s.reg.AX, 3);
  assert.equal(s.reg.CX, 0);
  assert.equal(s.reg.IP, a.size);
});
counts.branches++;

// CALL pushes the offset immediately after the CALL instruction. RET resolves
// that offset back to an instruction boundary before resuming.
test("CALL stores a byte return address in the simulated stack", () => {
  const s = execute(["NOP", "CALL SUB", "HLT", "SUB: HLT"].join("\\n"));
  assert.equal(s.reg.IP, 5);
  assert.equal(s.stack.length, 1);
  assert.equal(s.stack[0].value, 4);
  assert.equal(s.stack[0].kind, "return");
});
counts.calls++;

test("RET maps the saved byte offset back to the caller instruction", () => {
  const s = execute(["CALL SUB", "HLT", "SUB: MOV AX, 1234h", "RET"].join("\\n"));
  assert.equal(s.reg.AX, 0x1234);
  assert.equal(s.reg.IP, 4);
  assert.equal(s.reg.SP, 0xFFFE);
  assert.equal(s.stack.length, 0);
});
counts.calls++;

// A full 64 KiB image places XOR AX,AX at FFFEh. Its following IP wraps to
// 0000h; the now-true JZ branches to HLT, proving that wrap is executable.
test("IP wraps FFFFh to 0000h and resumes at the first byte", () => {
  const padding = Array(65528).fill("NOP").join("\\n");
  const source = ["JZ DONE", "JMP LAST", "DONE: HLT", padding, "LAST: XOR AX, AX"].join("\\n");
  const a = assemble(source);
  assert.equal(a.size, 65536);
  assert.equal(a.symbols.LAST, 0xFFFE);
  const s = execute(source);
  assert.equal(s.reg.AX, 0);
  assert.equal(s.flags.ZF, 1);
  assert.equal(s.reg.IP, 7);
  assert.equal(s.execution.codeSize, 65536);
});
counts.wrap++;

console.log("Table offset octet / symboles : " + counts.mapping + " tests.");
console.log("Branchements directs et LOOP : " + counts.branches + " tests.");
console.log("CALL / RET et adresses de retour : " + counts.calls + " tests.");
console.log("Bouclage IP sur segment de 64 Kio : " + counts.wrap + " test.");
console.log("Résultat cohérence binaire/exécution : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
