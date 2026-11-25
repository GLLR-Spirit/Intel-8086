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
const injection = "\nglobalThis.__8086LahfSahfApi = {" +
  "\n assemble: source => assembleProgram(source)," +
  "\n execute: source => executeAll(source)," +
  "\n executeBinary: (bytes, cs, ip, initialState) => executeBinary(bytes, cs, ip, initialState)," +
  "\n disassemble: bytes => disassembleBytes(bytes)" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 30000 });
const api = context.__8086LahfSahfApi;
assert.ok(api, "LAHF/SAHF audit API must be exposed");

let passed = 0;
let failed = 0;
const totals = { lahf: 0, sahf: 0, encodings: 0, invalid: 0 };
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.message); }
}
function word(value) {
  return value.toString(16).toUpperCase().padStart(4, "0") + "h";
}
function byte(value) {
  return value.toString(16).toUpperCase().padStart(2, "0") + "h";
}
function runBoth(source) {
  const assembled = api.assemble(source);
  const sourceState = api.execute(source);
  assert.ok(!sourceState.error, sourceState.error || "source execution failed");
  const binaryState = api.executeBinary(Array.from(assembled.bytes), 0, 0);
  assert.ok(!binaryState.error, binaryState.error || "binary execution failed");
  assert.equal(sourceState.execution.mode, "binary-offset");
  assert.equal(binaryState.execution.mode, "dynamic-binary");
  return { assembled, sourceState, binaryState };
}
function expectedLahf(flagsWord) {
  return ((flagsWord >> 7) & 1) << 7 |
    ((flagsWord >> 6) & 1) << 6 |
    ((flagsWord >> 4) & 1) << 4 |
    ((flagsWord >> 2) & 1) << 2 |
    2 | (flagsWord & 1);
}
function assertSameArchitecturalState(a, b, label) {
  for (const key of Object.keys(a.reg)) {
    assert.equal(b.reg[key], a.reg[key], label + " register " + key);
  }
  for (const key of Object.keys(a.flags)) {
    assert.equal(b.flags[key], a.flags[key], label + " flag " + key);
  }
}

// LAHF transfers SF/ZF/AF/PF/CF to AH, forces bit 1, and leaves FLAGS unchanged.
// Exercise all 32 combinations of the five architecturally copied flags.
for (let combination = 0; combination < 32; combination++) {
  const flagsWord =
    (((combination >> 4) & 1) << 7) |
    (((combination >> 3) & 1) << 6) |
    (((combination >> 2) & 1) << 4) |
    (((combination >> 1) & 1) << 2) |
    ((combination & 1)) | 2 | 0x800;
  const source = [
    "MOV AX, " + word(flagsWord),
    "PUSH AX",
    "POPF",
    "LAHF",
    "HLT"
  ].join("\n");
  const label = "LAHF flag combination " + combination.toString(2).padStart(5, "0");
  test(label, () => {
    const { sourceState, binaryState } = runBoth(source);
    const expectedAH = expectedLahf(flagsWord);
    assert.equal(sourceState.reg.AX >> 8, expectedAH, label + " AH");
    assert.equal(binaryState.reg.AX >> 8, expectedAH, label + " binary AH");
    for (const flag of Object.keys(sourceState.flags)) {
      const expected = {
        CF: flagsWord & 1,
        PF: (flagsWord >> 2) & 1,
        AF: (flagsWord >> 4) & 1,
        ZF: (flagsWord >> 6) & 1,
        SF: (flagsWord >> 7) & 1,
        OF: (flagsWord >> 11) & 1,
        TF: (flagsWord >> 8) & 1,
        IF: (flagsWord >> 9) & 1,
        DF: (flagsWord >> 10) & 1
      }[flag];
      if (expected !== undefined) {
        assert.equal(sourceState.flags[flag], expected, label + " preserved " + flag);
        assert.equal(binaryState.flags[flag], expected, label + " binary preserved " + flag);
      }
    }
    assertSameArchitecturalState(sourceState, binaryState, label + " source/binary");
  });
  totals.lahf++;
}

// SAHF loads only SF/ZF/AF/PF/CF from AH. Reserved AH bits 1, 3, and 5
// are ignored; OF/TF/IF/DF must remain unchanged.
// All 256 AH values are exercised against a nontrivial initial FLAGS pattern.
for (let ah = 0; ah < 256; ah++) {
  const initialFlagsWord = 0x0FD7; // OF, DF, IF, TF and all five SAHF flags set.
  const source = [
    "MOV AX, " + word(initialFlagsWord),
    "PUSH AX",
    "POPF",
    "MOV AH, " + byte(ah),
    "SAHF",
    "HLT"
  ].join("\n");
  const label = "SAHF AH=" + ah.toString(16).toUpperCase().padStart(2, "0") + "h";
  test(label, () => {
    const { sourceState, binaryState } = runBoth(source);
    const expected = {
      CF: ah & 1,
      PF: (ah >> 2) & 1,
      AF: (ah >> 4) & 1,
      ZF: (ah >> 6) & 1,
      SF: (ah >> 7) & 1,
      OF: 1, TF: 1, IF: 1, DF: 1
    };
    for (const flag of Object.keys(expected)) {
      assert.equal(sourceState.flags[flag], expected[flag], label + " " + flag);
      assert.equal(binaryState.flags[flag], expected[flag], label + " binary " + flag);
    }
    assertSameArchitecturalState(sourceState, binaryState, label + " source/binary");
  });
  totals.sahf++;
}

// Fixed opcode checks use raw bytes, not bytes emitted by the assembler.
for (const [mnemonic, opcode] of [["LAHF", 0x9F], ["SAHF", 0x9E]]) {
  test(mnemonic + " exact encoding", () => {
    const assembled = api.assemble(mnemonic);
    assert.deepEqual(Array.from(assembled.bytes), [opcode]);
    totals.encodings++;
  });
  test(mnemonic + " raw-byte disassembly", () => {
    const decoded = api.disassemble([opcode]);
    assert.equal(decoded.rows.length, 1);
    assert.equal(decoded.rows[0].instruction, mnemonic);
    assert.deepEqual(Array.from(decoded.rows[0].bytes), [opcode]);
    totals.encodings++;
  });
  test(mnemonic + " raw-byte execution", () => {
    const state = api.executeBinary([opcode, 0xF4], 0, 0);
    assert.ok(!state.error, state.error || mnemonic + " binary execution failed");
    assert.equal(state.steps, 2);
    assert.equal(state.execution.mode, "dynamic-binary");
  });
}

// Both instructions are operandless and must reject extra operands.
for (const source of ["LAHF AX", "LAHF 1", "SAHF AH", "SAHF 0"]) {
  test("reject invalid syntax: " + source, () => {
    assert.throws(() => api.assemble(source));
    const state = api.execute(source);
    assert.ok(state.error, source + " must be rejected by the source parser");
    totals.invalid++;
  });
}

console.log("LAHF vectors : " + totals.lahf);
console.log("SAHF vectors : " + totals.sahf);
console.log("Encodage/désassemblage/opcode brut : " + totals.encodings);
console.log("Syntaxes invalides rejetées : " + totals.invalid);
console.log("Audit LAHF/SAHF : " + passed + " réussis, " + failed + " échecs.");
console.log("Les indicateurs réservés/non représentés ne sont pas interprétés comme des FLAGS architecturaux supplémentaires.");
if (failed) process.exit(1);
