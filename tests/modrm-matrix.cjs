const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Inline application script must exist");

const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id, value: "", textContent: "", innerHTML: "", className: "",
      dataset: {}, onclick: null, oninput: null, onchange: null
    });
  }
  return elements.get(id);
}
const context = {
  document: { getElementById: element, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console
};
vm.createContext(context);

const injectedApi = "\nglobalThis.__8086ModRMApi = {" +
  "\n  assemble: function (source) { return assembleProgram(source); }," +
  "\n  disassemble: function (bytes) { return disassembleBytes(bytes); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injectedApi);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 5000 });

const api = context.__8086ModRMApi;
assert.ok(api, "ModR/M test API must be exposed");

const REG16 = ["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"];
const EA = ["BX+SI", "BX+DI", "BP+SI", "BP+DI", "SI", "DI", "BP", "BX"];
const GROUP1 = ["ADD", "OR", "ADC", "SBB", "AND", "SUB", "XOR", "CMP"];
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (error) {
    failed++;
    console.error("FAIL " + name + ": " + error.message);
  }
}
function assemble(source) {
  return Array.from(api.assemble(source).bytes);
}
function disassemble(bytes) {
  return api.disassemble(bytes);
}
function hex(bytes) {
  return bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}
function modRM(mod, reg, rm) {
  return (mod << 6) | (reg << 3) | rm;
}
function memoryExpression(mod, rm) {
  if (mod === 0 && rm === 6) return "[4660]";
  const base = EA[rm];
  if (mod === 0) return "[" + base + "]";
  if (mod === 1) return "[" + base + "+1]";
  return "[" + base + "+256]";
}
function displacementBytes(mod, rm) {
  if (mod === 0 && rm === 6) return [0x34, 0x12];
  if (mod === 1) return [0x01];
  if (mod === 2) return [0x00, 0x01];
  return [];
}
function expectedDecoderLength(mod, rm, immediateBytes) {
  return 2 + displacementBytes(mod, rm).length + (immediateBytes || 0);
}
function assertDecoded(bytes, mnemonic, expectedLength, description) {
  const result = disassemble(bytes);
  assert.equal(result.rows.length, 1, description + ": one instruction expected");
  assert.equal(result.rows[0].bytes.length, expectedLength,
    description + ": expected " + expectedLength + " byte(s), got " + hex(result.rows[0].bytes));
  assert.ok(result.rows[0].instruction.startsWith(mnemonic + " "),
    description + ": expected " + mnemonic + ", got " + result.rows[0].instruction);
}

// 1. ASSEMBLER — expected bytes come from an independent ModR/M reference model.
let assemblerCases = 0;
for (let mod = 0; mod < 4; mod++) {
  for (let reg = 0; reg < 8; reg++) {
    for (let rm = 0; rm < 8; rm++) {
      const operand = mod === 3 ? REG16[rm] : "WORD PTR " + memoryExpression(mod, rm);
      const sourceLoad = "MOV " + REG16[reg] + ", " + operand;
      const sourceStore = "MOV " + operand + ", " + REG16[reg];
      const expectedRM = [modRM(mod, reg, rm)].concat(displacementBytes(mod, rm));
      const expectedLoad = [0x8B].concat(expectedRM);
      const expectedStore = mod === 3
        ? [0x8B, modRM(3, rm, reg)]
        : [0x89].concat(expectedRM);

      test("Assembleur · 8B · mod=" + mod + " reg=" + reg + " r/m=" + rm, () => {
        const actual = assemble(sourceLoad);
        assert.deepEqual(actual, expectedLoad,
          sourceLoad + " → attendu " + hex(expectedLoad) + ", obtenu " + hex(actual));
      });
      test("Assembleur · 89 · mod=" + mod + " reg=" + reg + " r/m=" + rm, () => {
        const actual = assemble(sourceStore);
        assert.deepEqual(actual, expectedStore,
          sourceStore + " → attendu " + hex(expectedStore) + ", obtenu " + hex(actual));
      });
      assemblerCases += 2;
    }
  }
}

// 2. DISASSEMBLER — fixed byte streams enumerate all 256 ModR/M values per family.
const decoderFamilies = [
  { opcode: 0x8B, mnemonic: "MOV", tail: 0, name: "MOV r16,r/m16" },
  { opcode: 0x89, mnemonic: "MOV", tail: 0, name: "MOV r/m16,r16" },
  { opcode: 0x03, mnemonic: "ADD", tail: 0, name: "ADD r16,r/m16" },
  { opcode: 0x01, mnemonic: "ADD", tail: 0, name: "ADD r/m16,r16" },
  { opcode: 0x80, mnemonic: null, tail: 1, name: "Group 1 byte immediate" },
  { opcode: 0x81, mnemonic: null, tail: 2, name: "Group 1 word immediate" },
  { opcode: 0x83, mnemonic: null, tail: 1, name: "Group 1 sign-extended immediate" }
];
let decoderCases = 0;
for (const family of decoderFamilies) {
  for (let mod = 0; mod < 4; mod++) {
    for (let reg = 0; reg < 8; reg++) {
      for (let rm = 0; rm < 8; rm++) {
        const modrm = modRM(mod, reg, rm);
        const bytes = [family.opcode, modrm]
          .concat(displacementBytes(mod, rm))
          .concat(family.tail === 1 ? [0x7F] : family.tail === 2 ? [0x34, 0x12] : []);
        const expectedLength = expectedDecoderLength(mod, rm, family.tail);
        const mnemonic = family.mnemonic || GROUP1[reg];
        test("Désassembleur · " + family.name + " · " + mod + "/" + reg + "/" + rm, () => {
          assertDecoded(bytes, mnemonic, expectedLength,
            family.name + " ModR/M=" + modrm.toString(16).padStart(2, "0"));
        });
        decoderCases++;
      }
    }
  }
}

// 3. VALIDITY — supported and reserved group extensions / segment-register fields.
function isDB(bytes) {
  return disassemble(bytes).rows[0].instruction.startsWith("DB ");
}
let validityCases = 0;

for (const opcode of [0xC6, 0xC7]) {
  for (let ext = 0; ext < 8; ext++) {
    const bytes = [opcode, modRM(3, ext, 0)].concat(opcode === 0xC6 ? [0x12] : [0x34, 0x12]);
    test("Validité · " + opcode.toString(16).toUpperCase() + " /" + ext, () => {
      assert.equal(isDB(bytes), ext !== 0,
        opcode.toString(16).toUpperCase() + " /" + ext + " : " + hex(bytes));
    });
    validityCases++;
  }
}

for (const opcode of [0xFE, 0xFF]) {
  for (let ext = 0; ext < 8; ext++) {
    const bytes = [opcode, modRM(3, ext, 0)];
    test("Validité · " + opcode.toString(16).toUpperCase() + " /" + ext, () => {
      const invalid = opcode === 0xFE ? ext > 1 : (ext === 0 || ext === 1 || ext === 3 || ext === 5 || ext === 6 || ext === 7);
      assert.equal(isDB(bytes), invalid,
        opcode.toString(16).toUpperCase() + " /" + ext + " : " + hex(bytes));
    });
    validityCases++;
  }
}

for (const opcode of [0x8C, 0x8E]) {
  for (let seg = 0; seg < 8; seg++) {
    const bytes = [opcode, modRM(3, seg, 0)];
    // 8086/8088 legacy behavior: selector 4..7 aliases 0..3; 8E /1 (CS) is accepted.
    const expectedInvalid = false;
    test("Validité · " + opcode.toString(16).toUpperCase() + " segment /" + seg, () => {
      assert.equal(isDB(bytes), expectedInvalid,
        opcode.toString(16).toUpperCase() + " /" + seg + " : " + hex(bytes));
    });
    validityCases++;
  }
}

console.log("Matrice ModR/M — assembleur : " + assemblerCases + " cas générés.");
console.log("Matrice ModR/M — désassembleur : " + decoderCases + " cas fixes.");
console.log("Matrice ModR/M — validité : " + validityCases + " cas.");
console.log("Résultat : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
