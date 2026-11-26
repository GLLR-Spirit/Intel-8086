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
const injection = "\nglobalThis.__8086FlagControlApi = {" +
  "\n assemble: source => assembleProgram(source)," +
  "\n disassemble: bytes => disassembleBytes(bytes)," +
  "\n execute: source => executeAll(source)," +
  "\n executeBinary: (bytes,cs,ip,state) => executeBinary(bytes,cs,ip,state)" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
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
const flagBits = {CF:0x001,PF:0x004,AF:0x010,ZF:0x040,SF:0x080,TF:0x100,IF:0x200,DF:0x400,OF:0x800};
const allFlags = 0x0FD7;
const controls = [
  { mnemonic:"CLC", opcode:0xF8, changed:"CF", value:0, initial:allFlags },
  { mnemonic:"STC", opcode:0xF9, changed:"CF", value:1, initial:allFlags & ~flagBits.CF },
  { mnemonic:"CMC", opcode:0xF5, changed:"CF", value:0, initial:allFlags },
  { mnemonic:"CLD", opcode:0xFC, changed:"DF", value:0, initial:allFlags },
  { mnemonic:"STD", opcode:0xFD, changed:"DF", value:1, initial:allFlags & ~flagBits.DF },
  { mnemonic:"CLI", opcode:0xFA, changed:"IF", value:0, initial:allFlags },
  { mnemonic:"STI", opcode:0xFB, changed:"IF", value:1, initial:allFlags & ~flagBits.IF }
];
function flagsFromWord(word) {
  const result = {};
  for (const flag of flagNames) result[flag] = (word & flagBits[flag]) ? 1 : 0;
  return result;
}
function expectedFlags(item) {
  const result = flagsFromWord(item.initial);
  result[item.changed] = item.value;
  return result;
}
function runBoth(source) {
  const assembled = api.assemble(source);
  const sourceState = api.execute(source);
  const binaryState = api.executeBinary(assembled.bytes, 0, 0, {});
  assert.ok(!sourceState.error, sourceState.error || "source execution failed");
  assert.ok(!binaryState.error, binaryState.error || "binary execution failed");
  return { assembled, sourceState, binaryState };
}
for (const item of controls) {
  const source = "MOV AX, " + item.initial.toString(16) + "h\nMOV SP, 0100h\nPUSH AX\nPOPF\n" + item.mnemonic + "\nHLT";
  test(item.mnemonic + " exact opcode and disassembly", () => {
    const { assembled } = runBoth(source);
    assert.deepEqual(Array.from(assembled.bytes.slice(-2)), [item.opcode,0xF4]);
    const decoded = api.disassemble([item.opcode]);
    assert.equal(decoded.rows.length, 1);
    assert.equal(decoded.rows[0].instruction, item.mnemonic);
    assert.deepEqual(Array.from(decoded.rows[0].bytes), [item.opcode]);
  });
  test(item.mnemonic + " modifies only " + item.changed + " in source and binary", () => {
    const { sourceState, binaryState } = runBoth(source);
    const expected = expectedFlags(item);
    for (const [mode,state] of [["source",sourceState],["binary",binaryState]]) {
      for (const flag of flagNames)
        assert.equal(state.flags[flag], expected[flag], mode + " " + item.mnemonic + " " + flag);
      assert.equal(state.reg.AX, item.initial, mode + " preserves AX");
      assert.equal(state.reg.SP, 0x0100, mode + " restores SP after PUSHF/POPF");
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
test("F1h is not CMC on the original 8086", () => {
  const decoded = api.disassemble([0xF1]);
  assert.equal(decoded.rows.length, 1);
  assert.ok(!decoded.rows[0].instruction.startsWith("CMC"), decoded.rows[0].instruction);
  const execution = api.executeBinary([0xF1,0xF4], 0, 0, {});
  assert.ok(execution.error, "F1h must not execute as CMC on the 8086");
});
console.log("8086 flag-control audit: " + passed + " passed, " + failed + " failed.");
console.log("Seven opcodes F5h, F8h, F9h, FAh, FBh, FCh, FDh; F1h reserved; exact source/binary FLAGS preservation.");
if (failed) process.exit(1);
