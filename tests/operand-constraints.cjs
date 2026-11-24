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
const injection = "\nglobalThis.__8086OperandApi = {" +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n disassemble: function (bytes) { return disassembleBytes(bytes); }," +
  "\n execute: function (source) { return executeAll(source); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 5000 });
const api = context.__8086OperandApi;
assert.ok(api, "Operand audit API must be exposed");

let passed = 0, failed = 0;
const counts = { lea: 0, leslds: 0, movSegment: 0, invalid: 0, truncated: 0, execution: 0 };
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
function decoded(code) {
  const result = api.disassemble(code);
  assert.equal(result.rows.length, 1, "une instruction attendue pour " + hex(code));
  assert.deepEqual(Array.from(result.rows[0].bytes), code);
  return result.rows[0].instruction;
}
const ea = ["BX+SI", "BX+DI", "BP+SI", "BP+DI", "SI", "DI", "BP", "BX"];
function expression(mod, rm) {
  if (mod === 0 && rm === 6) return "[4660]";
  if (mod === 0) return "[" + ea[rm] + "]";
  if (mod === 1) return rm === 6 ? "[BP+1]" : "[" + ea[rm] + "+1]";
  return rm === 6 ? "[BP+256]" : "[" + ea[rm] + "+256]";
}
function displacement(mod, rm) {
  if (mod === 0 && rm === 6) return [0x34, 0x12];
  if (mod === 1) return [0x01];
  if (mod === 2) return [0x00, 0x01];
  return [];
}

// A. LEA / LES / LDS: all 24 memory addressing forms per opcode.
for (const item of [
  { name: "LEA", opcode: 0x8D, expectedPrefix: "LEA AX, " },
  { name: "LES", opcode: 0xC4, expectedPrefix: "LES AX, " },
  { name: "LDS", opcode: 0xC5, expectedPrefix: "LDS AX, " }
]) {
  for (let mod = 0; mod <= 2; mod++) {
    for (let rm = 0; rm < 8; rm++) {
      const source = item.name + " AX, " + expression(mod, rm);
      const expected = [item.opcode, modrm(mod, 0, rm), ...displacement(mod, rm)];
      test(item.name + " encodage mémoire mod=" + mod + " r/m=" + rm, () => {
        same(bytes(source), expected, source);
      });
      test(item.name + " désassemblage fixe mod=" + mod + " r/m=" + rm, () => {
        assert.equal(decoded(expected).split(",")[0], item.name + " AX");
      });
      if (item.name === "LEA") counts.lea += 2;
      else counts.leslds += 2;
    }
  }
}

// B. LEA/LDS/LES must reject register-direct ModR/M (mod=11).
for (const opcode of [0x8D, 0xC4, 0xC5]) {
  for (let reg = 0; reg < 8; reg++) {
    const code = [opcode, modrm(3, reg, 0)];
    test("ModR/M registre interdit · opcode " + opcode.toString(16) + " /" + reg, () => {
      assert.ok(decoded(code).startsWith("DB "), decoded(code));
    });
    counts.invalid++;
  }
}

// C. MOV segment-register transfers: all four segment fields and all eight
//    general registers. MOV into CS (8E /1) is architecturally prohibited.
const seg = ["ES", "CS", "SS", "DS"];
const regs = ["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"];
for (let s = 0; s < 4; s++) {
  for (let r = 0; r < 8; r++) {
    const toGeneral = [0x8C, modrm(3, s, r)];
    test("MOV segment vers registre · " + seg[s] + " → " + regs[r], () => {
      same(bytes("MOV " + regs[r] + ", " + seg[s]), toGeneral,
        "MOV " + regs[r] + ", " + seg[s]);
      assert.ok(decoded(toGeneral).startsWith("MOV " + regs[r] + ", " + seg[s]));
    });
    counts.movSegment++;
    const toSegment = [0x8E, modrm(3, s, r)];
    test("MOV registre vers segment · " + regs[r] + " → " + seg[s], () => {
      same(bytes("MOV " + seg[s] + ", " + regs[r]), toSegment,
        "MOV " + seg[s] + ", " + regs[r]);
      assert.ok(decoded(toSegment).startsWith("MOV " + seg[s] + ", " + regs[r]));
    });
    counts.movSegment++;
  }
}

// Segment-register transfers to/from memory are always word-sized.
const segmentMemory = [
  { source: "MOV WORD PTR [BX], CS", code: [0x8C, 0x0F] },
  { source: "MOV WORD PTR [BP+SI+4], SS", code: [0x8C, 0x52, 0x04] },
  { source: "MOV DS, WORD PTR [BX]", code: [0x8E, 0x1F] },
  { source: "MOV ES, WORD PTR [BP+DI+4]", code: [0x8E, 0x43, 0x04] },
  { source: "MOV CS, WORD PTR [BX]", code: [0x8E, 0x0F] }
];
for (const item of segmentMemory) {
  test("MOV segment/mémoire · " + item.source, () => {
    same(bytes(item.source), item.code, item.source);
    assert.ok(decoded(item.code).startsWith(item.source.slice(0, item.source.indexOf(" PTR"))));
  });
  counts.movSegment++;
}
for (const source of [
  "MOV BYTE PTR [BX], DS",
  "MOV DS, BYTE PTR [BX]"
]) {
  test("MOV segment restriction · " + source, () => assert.throws(() => bytes(source)));
  counts.invalid++;
}

// D. Legacy 8086 segment-selector encodings.
// On 8086/8088, selectors 4..7 alias ES/CS/SS/DS (0..3), and MOV CS is
// accepted. The disassembler normalizes aliases to their canonical names.
for (const opcode of [0x8C, 0x8E]) {
  for (let ext = 4; ext < 8; ext++) {
    test("MOV segment alias 8086 · " + opcode.toString(16) + " /" + ext, () => {
      const instruction = decoded([opcode, modrm(3, ext, 0)]);
      const expected = ["ES", "CS", "SS", "DS"][ext & 3];
      assert.ok(instruction.includes(expected), instruction);
      assert.ok(!instruction.startsWith("DB "), instruction);
    });
  }
}
for (let ext = 0; ext < 4; ext++) {
  test("MOV vers segment 8086 · /" + ext, () => {
    const instruction = decoded([0x8E, modrm(3, ext, 0)]);
    const expected = ["ES", "CS", "SS", "DS"][ext];
    assert.ok(instruction.includes(expected), instruction);
    assert.ok(!instruction.startsWith("DB "), instruction);
  });
}

// E. Truncated encodings must fail explicitly, not silently produce a row.
const truncated = [
  [0x8D], [0x8D, 0x06], [0x8D, 0x40], [0x8D, 0x80, 0x01],
  [0xC4], [0xC4, 0x06], [0xC4, 0x40], [0xC4, 0x80, 0x01],
  [0xC5], [0xC5, 0x06], [0xC5, 0x40], [0xC5, 0x80, 0x01],
  [0x8C], [0x8C, 0x06], [0x8C, 0x40], [0x8C, 0x80, 0x01],
  [0x8E], [0x8E, 0x06], [0x8E, 0x40], [0x8E, 0x80, 0x01]
];
for (const code of truncated) {
  test("Flux tronqué · " + hex(code), () => {
    assert.throws(() => api.disassemble(code), /tronqué/i);
  });
  counts.truncated++;
}

// F. Execution semantics: LEA computes only the offset; LES/LDS load the
//    offset and segment words from memory, in little-endian order.
test("LEA calcule l'offset sans lire la mémoire et conserve FLAGS", () => {
  const state = api.execute([
    "MOV BX, 0010h", "MOV SI, 0005h", "MOV AX, 0",
    "MOV WORD PTR [BX+SI], 0BEEFh",
    "STC", "STD", "LEA DX, [BX+SI+4]", "HLT"
  ].join("\n"));
  assert.ok(!state.error, state.error || "");
  assert.equal(state.reg.DX, 0x19);
  assert.equal(state.flags.CF, 1);
  assert.equal(state.flags.DF, 1);
});
counts.execution++;

test("LES charge offset et ES ; LDS charge offset et DS", () => {
  const state = api.execute([
    "MOV BX, 0100h",
    "MOV WORD PTR [BX], 5678h",
    "MOV WORD PTR [BX+2], 3000h",
    "LES AX, [BX]",
    "MOV WORD PTR [BX+4], 1234h",
    "MOV WORD PTR [BX+6], 4000h",
    "LDS DX, [BX+4]",
    "HLT"
  ].join("\n"));
  assert.ok(!state.error, state.error || "");
  assert.equal(state.reg.AX, 0x5678);
  assert.equal(state.reg.ES, 0x3000);
  assert.equal(state.reg.DX, 0x1234);
  assert.equal(state.reg.DS, 0x4000);
});
counts.execution++;

test("MOV CS, AX et lecture de CS sur 8086", () => {
  const state = api.execute([
    "MOV AX, 2345h",
    "MOV CS, AX",
    "MOV BX, CS",
    "HLT"
  ].join("\n"));
  assert.ok(!state.error, state.error || "MOV CS execution failed");
  assert.equal(state.reg.CS, 0x2345);
  assert.equal(state.reg.BX, 0x2345);
});
counts.execution++;

console.log("LEA : " + counts.lea + " vérifications.");
console.log("LES/LDS : " + counts.leslds + " vérifications.");
console.log("MOV registres de segment : " + counts.movSegment + " vérifications.");
console.log("Encodages invalides : " + counts.invalid + " vérifications.");
console.log("Flux tronqués : " + counts.truncated + " vérifications.");
console.log("Exécution : " + counts.execution + " vérifications.");
console.log("Résultat contraintes opérandes : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
