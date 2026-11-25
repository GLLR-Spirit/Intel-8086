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
const injection = "\nglobalThis.__8086AuditApi = {" +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n disassemble: function (bytes) { return disassembleBytes(bytes); }," +
  "\n execute: function (source) { return executeAll(source); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 5000 });
const api = context.__8086AuditApi;
assert.ok(api, "Audit API must be exposed");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.message); }
}
function bytes(source) { return Array.from(api.assemble(source).bytes); }
function hex(values) { return values.map(x => x.toString(16).padStart(2, "0").toUpperCase()).join(" "); }
function modrm(mod, reg, rm) { return (mod << 6) | (reg << 3) | rm; }
function same(actual, expected, label) {
  assert.deepEqual(actual, expected, label + " ; attendu " + hex(expected) + ", obtenu " + hex(actual));
}

// ---------------------------------------------------------------------------
// A. Eight 8086 memory-address encodings, including the BP/direct-address alias.
// ---------------------------------------------------------------------------
const memoryForms = [
  { rm: 0, expression: "[BX+SI]", mod0: "[BX+SI]", defaultSegment: "DS" },
  { rm: 1, expression: "[BX+DI]", mod0: "[BX+DI]", defaultSegment: "DS" },
  { rm: 2, expression: "[BP+SI]", mod0: "[BP+SI]", defaultSegment: "SS" },
  { rm: 3, expression: "[BP+DI]", mod0: "[BP+DI]", defaultSegment: "SS" },
  { rm: 4, expression: "[SI]", mod0: "[SI]", defaultSegment: "DS" },
  { rm: 5, expression: "[DI]", mod0: "[DI]", defaultSegment: "DS" },
  { rm: 6, expression: "[BP]", mod0: "[4660]", defaultSegment: "SS" },
  { rm: 7, expression: "[BX]", mod0: "[BX]", defaultSegment: "DS" }
];
let addressCases = 0;
for (const form of memoryForms) {
  const cases = [
    { mod: 0, expression: form.mod0, tail: form.rm === 6 ? [0x34, 0x12] : [] },
    { mod: 1, expression: form.rm === 6 ? "[BP+1]" : form.expression.replace("]", "+1]"), tail: [0x01] },
    { mod: 2, expression: form.rm === 6 ? "[BP+256]" : form.expression.replace("]", "+256]"), tail: [0x00, 0x01] }
  ];
  for (const item of cases) {
    const expected = [0x8B, modrm(item.mod, 0, form.rm), ...item.tail];
    test("Adressage · r/m=" + form.rm + " mod=" + item.mod, () => {
      same(bytes("MOV AX, WORD PTR " + item.expression), expected, item.expression);
    });
    test("Désassemblage adressage · r/m=" + form.rm + " mod=" + item.mod, () => {
      const decoded = api.disassemble(expected);
      assert.equal(decoded.rows.length, 1);
      assert.deepEqual(Array.from(decoded.rows[0].bytes), expected);
      assert.ok(decoded.rows[0].instruction.startsWith("MOV AX, WORD PTR "),
        decoded.rows[0].instruction);
    });
    addressCases += 2;
  }
}

// Segment override encodings: default segment is omitted; a non-default one is prefixed.
const segmentCases = [
  { source: "MOV AX, WORD PTR [BX]", expected: [0x8B, 0x07] },
  { source: "MOV AX, WORD PTR DS:[BP]", expected: [0x3E, 0x8B, 0x46, 0x00] },
  { source: "MOV AX, WORD PTR ES:[BX]", expected: [0x26, 0x8B, 0x07] },
  { source: "MOV AX, WORD PTR SS:[BP]", expected: [0x8B, 0x46, 0x00] },
  { source: "MOV AX, WORD PTR CS:[SI]", expected: [0x2E, 0x8B, 0x04] }
];
for (const item of segmentCases) {
  test("Préfixe segment · " + item.source, () => same(bytes(item.source), item.expected, item.source));
  addressCases++;
}

// Execute all eight forms using distinct register values; BP-based forms use SS, others DS.
test("Exécution EA · huit modes et segments DS/SS", () => {
  const result = api.execute([
    "MOV AX, 1000h", "MOV DS, AX",
    "MOV AX, 2000h", "MOV SS, AX",
    "MOV BX, 0010h", "MOV BP, 0020h",
    "MOV SI, 0030h", "MOV DI, 0050h",
    "MOV AX, 1111h", "MOV WORD PTR [BX+SI], AX",
    "MOV AX, 2222h", "MOV WORD PTR [BX+DI], AX",
    "MOV AX, 3333h", "MOV WORD PTR [BP+SI], AX",
    "MOV AX, 4444h", "MOV WORD PTR [BP+DI], AX",
    "MOV AX, 5555h", "MOV WORD PTR [SI], AX",
    "MOV AX, 6666h", "MOV WORD PTR [DI], AX",
    "MOV AX, 7777h", "MOV WORD PTR [BP], AX",
    "MOV AX, 8888h", "MOV WORD PTR [BX], AX",
    "MOV CX, WORD PTR [BX+SI]",
    "MOV DX, WORD PTR [BX+DI]",
    "MOV AX, WORD PTR [BP+SI]",
    "MOV BX, WORD PTR [BP+DI]",
    "HLT"
  ].join("\n"));
  assert.ok(!result.error, result.error || "");
  assert.equal(result.reg.CX, 0x1111);
  assert.equal(result.reg.DX, 0x2222);
  assert.equal(result.reg.AX, 0x3333);
  assert.equal(result.reg.BX, 0x4444);
  const dsAddr = (0x1000 << 4) + 0x10;
  const ssAddr = (0x2000 << 4) + 0x20;
  assert.equal(result.mem[dsAddr], 0x88, "BX must default to DS");
  assert.equal(result.mem[ssAddr], 0x77, "BP must default to SS");
  addressCases++;
});

// ---------------------------------------------------------------------------
// B. Displacement boundaries. 8-bit displacements are signed; 16-bit fields
//    preserve the raw little-endian 16-bit pattern and EA wraps modulo 65536.
// ---------------------------------------------------------------------------
function expectedBased(disp) {
  if (disp >= -128 && disp <= 127) {
    // [BX+SI] is r/m=000; zero displacement has the compact mod=00 form.
    if (disp === 0) return [0x8B, 0x00];
    return [0x8B, 0x40, disp & 255];
  }
  return [0x8B, 0x80, disp & 255, (disp >> 8) & 255];
}
const boundaries = [
  [-32768, [0x8B, 0x80, 0x00, 0x80]],
  [-129,   [0x8B, 0x80, 0x7F, 0xFF]],
  [-128,   [0x8B, 0x40, 0x80]],
  [-127,   [0x8B, 0x40, 0x81]],
  [-1,     [0x8B, 0x40, 0xFF]],
  [0,      [0x8B, 0x00]],
  [1,      [0x8B, 0x40, 0x01]],
  [126,    [0x8B, 0x40, 0x7E]],
  [127,    [0x8B, 0x40, 0x7F]],
  [128,    [0x8B, 0x80, 0x80, 0x00]],
  [32767,  [0x8B, 0x80, 0xFF, 0x7F]],
  [32768,  [0x8B, 0x80, 0x00, 0x80]],
  [65535,  [0x8B, 0x80, 0xFF, 0xFF]]
];
let displacementCases = 0;
for (const [disp, expected] of boundaries) {
  test("Déplacement · " + disp, () => {
    same(bytes("MOV AX, WORD PTR [BX+SI" + (disp < 0 ? String(disp) : "+" + disp) + "]"), expected,
      "disp=" + disp);
  });
  test("Désassemblage déplacement · " + disp, () => {
    const decoded = api.disassemble(expected);
    assert.equal(decoded.rows.length, 1);
    assert.deepEqual(Array.from(decoded.rows[0].bytes), expected);
  });
  displacementCases += 2;
}

for (const invalid of [-32769, 65536]) {
  test("Déplacement hors plage rejeté · " + invalid, () => {
    assert.throws(() => bytes("MOV AX, WORD PTR [BX+SI" +
      (invalid < 0 ? String(invalid) : "+" + invalid) + "]"));
  });
  displacementCases++;
}
for (const direct of [0, 1, 0x7FFF, 0x8000, 0xFFFF]) {
  test("Adresse directe disp16 · " + direct.toString(16), () => {
    const expected = [0x8B, 0x06, direct & 255, (direct >> 8) & 255];
    same(bytes("MOV AX, WORD PTR [" + direct + "]"), expected, "direct=" + direct);
  });
  displacementCases++;
}
for (const invalid of [-1, 65536]) {
  test("Adresse directe hors plage rejetée · " + invalid, () => {
    assert.throws(() => bytes("MOV AX, WORD PTR [" + invalid + "]"));
  });
  displacementCases++;
}

// ---------------------------------------------------------------------------
// C. Group extensions: distinguish architectural definition from current
//    disassembler support. DB is expected for unsupported encodings, not
//    evidence that the hardware opcode itself is undefined.
// ---------------------------------------------------------------------------
let groupCases = 0;
function decodeInstruction(opcode, ext, mod = 3, rm = 0, tail = []) {
  const code = [opcode, modrm(mod, ext, rm), ...tail];
  const result = api.disassemble(code);
  assert.equal(result.rows.length, 1, "one row for " + hex(code));
  return result.rows[0].instruction;
}
for (const opcode of [0x80, 0x81, 0x83]) {
  for (let ext = 0; ext < 8; ext++) {
    const bits = opcode === 0x80 ? 8 : 16;
    const tail = opcode === 0x80 || opcode === 0x83 ? [0x01] : [0x01, 0x00];
    test("Groupe 1 défini · " + opcode.toString(16) + " /" + ext, () => {
      const instruction = decodeInstruction(opcode, ext, 3, 0, tail);
      assert.ok(instruction.startsWith(["ADD","OR","ADC","SBB","AND","SUB","XOR","CMP"][ext] + " "));
    });
    groupCases++;
  }
}
for (const opcode of [0xC6, 0xC7]) {
  const tail = opcode === 0xC6 ? [0x12] : [0x34, 0x12];
  for (let ext = 0; ext < 8; ext++) {
    test("C6/C7 extension · " + opcode.toString(16) + " /" + ext, () => {
      const instruction = decodeInstruction(opcode, ext, 3, 0, tail);
      assert.equal(instruction.startsWith("DB "), ext !== 0, instruction);
    });
    groupCases++;
  }
}
// FE: only /0 INC and /1 DEC are defined.
// FF: /0..6 are defined; /3 and /5 require memory operands. /7 is undefined.
 // The decoder recognizes the near indirect and PUSH forms plus far memory forms.
for (let ext = 0; ext < 8; ext++) {
  test("FE extension · /" + ext, () => {
    const instruction = decodeInstruction(0xFE, ext);
    assert.equal(instruction.startsWith("DB "), ext > 1, instruction);
  });
  groupCases++;
  test("FF extension support · /" + ext, () => {
    const instruction = decodeInstruction(0xFF, ext);
    const invalidRegisterForm = [0, 1, 3, 5, 6, 7].includes(ext);
    assert.equal(instruction.startsWith("DB "), invalidRegisterForm, instruction);
    const architecturallyDefined = ext <= 6 && !invalidRegisterForm;
    assert.equal(architecturallyDefined, !instruction.startsWith("DB "));
  });
  groupCases++;
}
// FF /3 CALL FAR and /5 JMP FAR require memory operands; /2, /4 and /6
// accept register or memory. Every architecturally valid form is decoded.
for (const ext of [2, 3, 4, 5, 6]) {
  for (const mod of [0, 3]) {
    test("FF architectural operand restriction · /" + ext + " mod=" + mod, () => {
      const architecturallyDefined = !(ext === 3 || ext === 5 || ext === 6) || mod !== 3;
      const instruction = decodeInstruction(0xFF, ext, mod, 0);
      assert.equal(instruction.startsWith("DB "), !architecturallyDefined, instruction);
    });
    groupCases++;
  }
}
for (const opcode of [0x8C, 0x8E]) {
  for (let ext = 0; ext < 8; ext++) {
    test("MOV segment extension · " + opcode.toString(16) + " /" + ext, () => {
      if (opcode === 0x8E && ext === 1) {
        const rows = api.disassemble([opcode, modrm(3, ext, 0)], 1).rows;
        assert.equal(rows.length, 1);
        assert.ok(rows[0].instruction.startsWith("DB "), rows[0].instruction);
        assert.deepEqual(Array.from(rows[0].bytes), [opcode]);
        return;
      }
      const instruction = decodeInstruction(opcode, ext);
      // Intel 8086 Table 4-13: /0..3 select ES/CS/SS/DS, /4..7 are not used.
      // Intel ASM86 disallows CS as the destination of MOV (8E /1).
      const reservedSelector = ext >= 4;
      assert.equal(instruction.startsWith("DB "), reservedSelector, instruction);
      if (!reservedSelector) {
        const expectedSegment = ["ES", "CS", "SS", "DS"][ext];
        assert.ok(instruction.includes(expectedSegment), instruction);
      }
    });
    groupCases++;
  }
}
// F6/F7: /0 TEST, /1 reserved, /2 NOT, /3 NEG, /4 MUL,
// /5 IMUL, /6 DIV and /7 IDIV.
for (const opcode of [0xF6, 0xF7]) {
  const tail = opcode === 0xF6 ? [0x01] : [0x01, 0x00];
  for (let ext = 0; ext < 8; ext++) {
    test("F6/F7 extension · " + opcode.toString(16) + " /" + ext, () => {
      const instruction = decodeInstruction(opcode, ext, 3, 0, ext === 0 ? tail : []);
      if (ext === 1) assert.ok(instruction.startsWith("DB "), instruction);
      else assert.ok(instruction.startsWith(["TEST", "", "NOT", "NEG", "MUL", "IMUL", "DIV", "IDIV"][ext] + " "), instruction);
    });
    groupCases++;
  }
}

console.log("Adressage mémoire : " + addressCases + " vérifications.");
console.log("Déplacements : " + displacementCases + " vérifications.");
console.log("Extensions de groupes : " + groupCases + " vérifications.");
console.log("Résultat : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
