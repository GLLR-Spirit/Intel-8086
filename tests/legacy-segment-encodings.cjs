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
  "\n disassemble: function (bytes, maxRows) { return disassembleBytes(bytes, maxRows); }" +
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

// Intel 8086 Table 4-13 specifies the segment selector as 0SR.
// Selectors 0..3 are ES/CS/SS/DS; selectors 4..7 are not used.
// Intel ASM86 explicitly marks CS as invalid when it is the MOV destination.
for (let selector = 0; selector < 8; selector++) {
  for (let rm = 0; rm < 8; rm++) {
    const codeToRM = [0x8C, modrm(selector, rm)];
    const codeFromRM = [0x8E, modrm(selector, rm)];
    if (selector < 4) {
      const segment = canonical[selector];
      test("8C canonical selector " + selector + " → " + general[rm], () => {
        assert.equal(decode(codeToRM), "MOV " + general[rm] + ", " + segment);
      });
      if (selector === 1) {
        test("8E CS destination is invalid and remains DB", () => {
          const rows = api.disassemble(codeFromRM, 1).rows;
          assert.ok(rows[0].instruction.startsWith("DB "));
          assert.deepEqual(Array.from(rows[0].bytes), [0x8E]);
        });
      } else {
        test("8E canonical selector " + selector + " ← " + general[rm], () => {
          assert.equal(decode(codeFromRM), "MOV " + segment + ", " + general[rm]);
        });
      }
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

// 8C may read CS into a general register; 8E may not load CS.
for (let selector = 0; selector < 4; selector++) {
  for (let rm = 0; rm < 8; rm++) {
    test("Assemblage canonique 8C /" + selector + " r/m=" + rm, () => {
      expectBytes("MOV " + general[rm] + ", " + canonical[selector],
        [0x8C, modrm(selector, rm)]);
    });
    if (selector === 1) {
      test("Assemblage interdit 8E /1 CS destination", () => {
        assert.throws(() => api.assemble("MOV CS, " + general[rm]), /MOV CS comme destination/);
      });
    } else {
      test("Assemblage canonique 8E /" + selector + " r/m=" + rm, () => {
        expectBytes("MOV " + canonical[selector] + ", " + general[rm],
          [0x8E, modrm(selector, rm)]);
      });
    }
  }
}

test("8086 8E /1 is not disassembled as MOV CS", () => {
  const rows = api.disassemble([0x8E, 0xC8], 1).rows;
  assert.ok(rows[0].instruction.startsWith("DB "));
  assert.deepEqual(Array.from(rows[0].bytes), [0x8E]);
});
test("8086 MOV AX, CS remains valid", () => {
  assert.equal(decode([0x8C, 0xC8]), "MOV AX, CS");
});

test("8086 CS destination is rejected for every memory addressing mode", () => {
  for (let mod = 0; mod < 4; mod++) {
    for (let rm = 0; rm < 8; rm++) {
      const displacement = mod === 0 && rm === 6 ? [0x34, 0x12]
        : mod === 1 ? [0x7F]
        : mod === 2 ? [0x34, 0x12] : [];
      const code = [0x8E, modrm(mod, 1, rm), ...displacement];
      const result = api.disassemble(code);
      assert.ok(result.rows[0].instruction.startsWith("DB "),
        "8E /1 must remain unsupported: " + code.map(x => x.toString(16)));
      assert.deepEqual(Array.from(result.rows[0].bytes), [0x8E],
        "the invalid CS-load opcode must not be reinterpreted");
      assert.equal(result.size, code.length);
      assert.equal(result.rows.reduce((sum, row) => sum + row.size, 0), code.length,
        "the complete stream must still be consumed");
    }
  }
});

test("8086 reserved segment selectors /4..7 are rejected in all memory modes", () => {
  for (const opcode of [0x8C, 0x8E]) {
    for (let selector = 4; selector < 8; selector++) {
      for (let mod = 0; mod < 4; mod++) {
        for (let rm = 0; rm < 8; rm++) {
          const displacement = mod === 0 && rm === 6 ? [0x34, 0x12]
            : mod === 1 ? [0x7F]
            : mod === 2 ? [0x34, 0x12] : [];
          const code = [opcode, modrm(mod, selector, rm), ...displacement];
          const result = api.disassemble(code);
          assert.ok(result.rows[0].instruction.startsWith("DB "),
            opcode.toString(16) + " /" + selector + " must remain reserved");
          assert.equal(result.size, code.length);
          assert.equal(result.rows.reduce((sum, row) => sum + row.size, 0), code.length);
        }
      }
    }
  }
});

test("Assembler rejects MOV CS from memory as well as from registers", () => {
  for (const operand of ["WORD PTR [BX]", "WORD PTR [BP+SI+4]", "WORD PTR [1234h]"]) {
    assert.throws(() => api.assemble("MOV CS, " + operand), /MOV CS comme destination/);
  }
});

test("Assembler retains MOV memory, CS as a valid 8C /1 form", () => {
  expectBytes("MOV WORD PTR [BX], CS", [0x8C, 0x0F]);
});

console.log("Décodage 8C/8E : vecteurs fixes registre et mémoire, CS destination et sélecteurs /4..7 rejetés.");
console.log("Assemblage 8C/8E : 64 formes source→registre et 48 formes registre→segment valides.");
console.log("Transferts CS : lecture autorisée, chargement interdit.");
console.log("Résultat segment legacy : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
