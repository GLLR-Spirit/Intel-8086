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
const injection = "\nglobalThis.__8086LegacySegmentApi = {" +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n disassemble: function (bytes) { return disassembleBytes(bytes); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 5000 });
const api = context.__8086LegacySegmentApi;
assert.ok(api, "Legacy segment API must be exposed");

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.message); }
}
const canonical = ["ES", "CS", "SS", "DS"];
const general = ["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"];
function modrm(ext, rm) { return 0xC0 | (ext << 3) | rm; }
function decode(bytes) {
  const result = api.disassemble(bytes);
  assert.equal(result.rows.length, 1, "one instruction expected");
  assert.deepEqual(Array.from(result.rows[0].bytes), bytes);
  return result.rows[0].instruction;
}
function expectBytes(source, expected) {
  const result = api.assemble(source);
  assert.deepEqual(Array.from(result.bytes), expected,
    source + " expected " + expected.map(x => x.toString(16)).join(" "));
}

// Intel 8086 Table 4-13 specifies ModR/M REG as 0SR for 8C/8E.
// Selectors 0..3 are ES/CS/SS/DS; selectors 4..7 are "not used".
for (let selector = 0; selector < 8; selector++) {
  for (let rm = 0; rm < 8; rm++) {
    const codeToRM = [0x8C, modrm(selector, rm)];
    const codeFromRM = [0x8E, modrm(selector, rm)];
    if (selector < 4) {
      const segment = canonical[selector];
      test("8C canonical selector " + selector + " → " + general[rm], () => {
        assert.equal(decode(codeToRM), "MOV " + general[rm] + ", " + segment);
      });
      test("8E canonical selector " + selector + " ← " + general[rm], () => {
        assert.equal(decode(codeFromRM), "MOV " + segment + ", " + general[rm]);
      });
    } else {
      test("8C reserved selector " + selector + " remains DB", () => {
        assert.ok(decode(codeToRM).startsWith("DB "));
      });
      test("8E reserved selector " + selector + " remains DB", () => {
        assert.ok(decode(codeFromRM).startsWith("DB "));
      });
    }
  }
}

// The assembler emits canonical selectors 0..3. CS is accepted as a
// destination by the original 8086 encoding (8E /1).
for (let selector = 0; selector < 4; selector++) {
  for (let rm = 0; rm < 8; rm++) {
    test("Assemblage canonique 8C /" + selector + " r/m=" + rm, () => {
      expectBytes("MOV " + general[rm] + ", " + canonical[selector],
        [0x8C, modrm(selector, rm)]);
    });
    test("Assemblage canonique 8E /" + selector + " r/m=" + rm, () => {
      expectBytes("MOV " + canonical[selector] + ", " + general[rm],
        [0x8E, modrm(selector, rm)]);
    });
  }
}

// Exact known bytes for CS transfers; this is not POP CS (opcode 0F).
test("8086 MOV CS, AX fixed encoding", () => {
  assert.equal(decode([0x8E, 0xC8]), "MOV CS, AX");
});
test("8086 MOV AX, CS fixed encoding", () => {
  assert.equal(decode([0x8C, 0xC8]), "MOV AX, CS");
});

console.log("Décodage 8C/8E : 128 vecteurs fixes (64 valides, 64 sélecteurs réservés).");
console.log("Assemblage canonique 8C/8E : 64 vecteurs.");
console.log("Transferts CS : 2 vecteurs.");
console.log("Résultat segment legacy : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
