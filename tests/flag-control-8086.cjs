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
const injection = "\\nglobalThis.__8086FlagControlApi = {" +
  "\\n assemble: source => assembleProgram(source)," +
  "\\n disassemble: bytes => disassembleBytes(bytes)," +
  "\\n execute: source => executeAll(source)," +
  "\\n executeBinary: (bytes,cs,ip,state) => executeBinary(bytes,cs,ip,state)" +
  "\\n};\\n})();\\n";
const instrumented = match[1].replace(/\\n\\}\\)\\(\\);\\s*$/, injection);
assert.notEqual(instrumented, match[1], "Flag-control API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 10000 });
const api = context.__8086FlagControlApi;
assert.ok(api, "Flag-control API must be exposed");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.stack); }
}
const flagNames = ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"];
const controls = [
  { mnemonic:"CLC", opcode:0xF8, changed:"CF", value:0 },
  { mnemonic:"STC", opcode:0xF9, changed:"CF", value:1 },
  { mnemonic:"CMC", opcode:0xF5, changed:"CF", value:0 },
  { mnemonic:"CLD", opcode:0xFC, changed:"DF", value:0 },
  { mnemonic:"STD", opcode:0xFD, changed:"DF", value:1 },
  { mnemonic:"CLI", opcode:0xFA, changed:"IF", value:0 },
  { mnemonic:"STI", opcode:0xFB, changed:"IF", value:1 }
];
const initialFlags = 0x0FD7; // all nine modeled FLAGS set
function expectedFlags(changed, value) {
  const result = {};
  for (const flag of flagNames) result[flag] = 1;
  result[changed] = value;
  return result;
}
function runBoth(source) {
  const assembled = api.assemble(source);
  const sourceState = api.execute(source);
  const binaryState = api.executeBinary(assembled.bytes, 0, 0, {});
  assert.ok(!sourceState.error, sourceState.error || "source execution failed");
  assert.ok(!binaryState.error, binaryState.error || "binary execution failed");
  assert.equal(sourceState.execution.mode, "binary-offset");
  assert.equal(binaryState.execution.mode, "dynamic-binary");
  return { assembled, sourceState, binaryState };
}
for (const item of controls) {
  test(item.mnemonic + " exact opcode and disassembly", () => {
    const source = "MOV AX, " + initialFlags.toString(16) + "h\\nPUSH AX\\nPOPF\\n" + item.mnemonic + "\\nHLT";
    const { assembled } = runBoth(source);
    assert.deepEqual(Array.from(assembled.bytes.slice(-2)), [item.opcode,0xF4]);
    const decoded = api.disassemble([item.opcode]);
    assert.equal(decoded.rows.length, 1);
    assert.equal(decoded.rows[0].instruction, item.mnemonic);
    assert.deepEqual(Array.from(decoded.rows[0].bytes), [item.opcode]);
  });
  test(item.mnemonic + " modifies only " + item.changed + " in source and binary", () => {
    const source = "MOV AX, " + initialFlags.toString(16) + "h\\nPUSH AX\\nPOPF\\n" + item.mnemonic + "\\nHLT";
    const { sourceState, binaryState } = runBoth(source);
    const expected = expectedFlags(item.changed, item.value);
    for (const [mode,state] of [["source",sourceState],["binary",binaryState]]) {
      for (const flag of flagNames)
        assert.equal(state.flags[flag], expected[flag], mode + " " + item.mnemonic + " " + flag);
      assert.equal(state.reg.AX, initialFlags, mode + " preserves AX");
      assert.equal(state.reg.SP, 0xFFFE, mode + " restores SP after PUSHF/POPF");
    }
    for (const flag of flagNames)
      assert.equal(sourceState.flags[flag], binaryState.flags[flag], item.mnemonic + " source/binary " + flag);
  });
  for (const invalid of [item.mnemonic + " AX", item.mnemonic + " 1"]) {
    test(item.mnemonic + " rejects explicit operand " + invalid, () => {
      assert.throws(() => api.assemble(invalid));
      assert.ok(api.execute(invalid).error);
    });
  }
}
console.log("8086 flag-control audit: " + passed + " passed, " + failed + " failed.");
console.log("Seven opcodes F5h, F8h, F9h, FAh, FBh, FCh, FDh; exact source/binary FLAGS preservation.");
if (failed) process.exit(1);
