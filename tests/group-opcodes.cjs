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
const injection = "\nglobalThis.__8086GroupsApi = {" +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n disassemble: function (bytes) { return disassembleBytes(bytes); }," +
  "\n execute: function (source) { return executeAll(source); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 10000 });
const api = context.__8086GroupsApi;
assert.ok(api, "Group opcode API must be exposed");

let passed = 0, failed = 0;
const counts = { f6f7: 0, ff: 0, c6c7: 0, execution: 0, truncated: 0 };
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.message); }
}
function assemble(source) {
  return Array.from(api.assemble(source).bytes);
}
function decode(bytes) {
  const result = api.disassemble(bytes);
  assert.equal(result.rows.length, 1, "one decoded row expected");
  assert.deepEqual(Array.from(result.rows[0].bytes), bytes, "decoded bytes must be preserved");
  return result.rows[0].instruction;
}
function modrm(mod, ext, rm) { return (mod << 6) | (ext << 3) | rm; }
const regs8 = ["AL", "CL", "DL", "BL", "AH", "CH", "DH", "BH"];
const regs16 = ["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"];
const ea = ["BX+SI", "BX+DI", "BP+SI", "BP+DI", "SI", "DI", "BP", "BX"];
function mem(mod, rm) {
  if (mod === 0 && rm === 6) return "WORD PTR [4660]";
  if (mod === 0) return "WORD PTR [" + ea[rm] + "]";
  if (mod === 1) return "WORD PTR [" + ea[rm] + "+1]";
  return "WORD PTR [" + ea[rm] + "+256]";
}
function disp(mod, rm) {
  if (mod === 0 && rm === 6) return [0x34, 0x12];
  if (mod === 1) return [0x01];
  if (mod === 2) return [0x00, 0x01];
  return [];
}
function length(mod, rm, immBytes) {
  return 2 + disp(mod, rm).length + (immBytes || 0);
}
function expectDb(bytes, label) {
  const result = api.disassemble(bytes);
  assert.equal(result.rows[0].instruction.startsWith("DB "), true, label);
  assert.deepEqual(Array.from(result.rows[0].bytes), bytes, label + " must retain its complete bytes");
}
function state(source) {
  const result = api.execute(source);
  assert.ok(!result.error, result.error || "execution failed");
  return result;
}

// F6/F7: /0 TEST, /1 reserved, /2 NOT, /3 NEG, /4 MUL,
// /5 IMUL, /6 DIV, /7 IDIV. Test every register-direct ModR/M value.
const f6Names = ["TEST", null, "NOT", "NEG", "MUL", "IMUL", "DIV", "IDIV"];
for (const [opcode, bits, regs] of [[0xF6, 8, regs8], [0xF7, 16, regs16]]) {
  for (let ext = 0; ext < 8; ext++) {
    for (let rm = 0; rm < 8; rm++) {
      const code = [opcode, modrm(3, ext, rm)];
      if (ext === 0) code.push(...(bits === 8 ? [0x5A] : [0x5A, 0xA5]));
      const label = "F" + (opcode & 15).toString(16).toUpperCase() +
        " /" + ext + " r/m=" + rm;
      test(label + " decode", () => {
        if (ext === 1) return expectDb(code, label + " reserved");
        const instruction = decode(code);
        assert.ok(instruction.startsWith(f6Names[ext] + " " + regs[rm]), instruction);
      });
      counts.f6f7++;
    }
  }
}

// Every memory addressing mode, displacement mode and group extension.
for (const [opcode, bits, immBytes] of [[0xF6, 8, 1], [0xF7, 16, 2]]) {
  for (let mod = 0; mod < 3; mod++) {
    for (let ext = 0; ext < 8; ext++) {
      for (let rm = 0; rm < 8; rm++) {
        const code = [opcode, modrm(mod, ext, rm), ...disp(mod, rm)];
        if (ext === 0) code.push(...(bits === 8 ? [0xA5] : [0x34, 0x12]));
        const label = "F6/F7 memory mod=" + mod + " /" + ext + " rm=" + rm;
        test(label, () => {
          const result = api.disassemble(code);
          assert.equal(result.rows.length, 1);
          assert.equal(result.rows[0].bytes.length, length(mod, rm, ext === 0 ? immBytes : 0));
          const instruction = result.rows[0].instruction;
          if (ext === 1) assert.ok(instruction.startsWith("DB "), instruction);
          else assert.ok(instruction.startsWith(f6Names[ext] + " "), instruction);
        });
        counts.f6f7++;
      }
    }
  }
}

// Fixed independent encodings for unary instructions and immediate TEST.
const unaryVectors = [
  ["NOT AL", [0xF6, 0xD0]],
  ["NEG CL", [0xF6, 0xD9]],
  ["MUL BL", [0xF6, 0xE3]],
  ["IMUL AH", [0xF6, 0xEC]],
  ["DIV DH", [0xF6, 0xF6]],
  ["IDIV BH", [0xF6, 0xFF]],
  ["NOT AX", [0xF7, 0xD0]],
  ["NEG CX", [0xF7, 0xD9]],
  ["MUL BX", [0xF7, 0xE3]],
  ["IMUL SP", [0xF7, 0xEC]],
  ["DIV SI", [0xF7, 0xF6]],
  ["IDIV DI", [0xF7, 0xFF]],
  ["TEST AL, 5Ah", [0xA8, 0x5A]],
  ["TEST AX, 1234h", [0xA9, 0x34, 0x12]],
  ["TEST BL, 5Ah", [0xF6, 0xC3, 0x5A]],
  ["TEST WORD PTR [BX], 1234h", [0xF7, 0x07, 0x34, 0x12]]
];
for (const [source, expected] of unaryVectors) {
  test("F6/F7 assembler " + source, () => assert.deepEqual(assemble(source), expected));
  test("F6/F7 disassembler " + source, () => {
    assert.ok(decode(expected).startsWith(source.split(" ")[0] + " "));
  });
  counts.f6f7 += 2;
}

// All FF extensions: /0 INC, /1 DEC, /2 near CALL, /3 far CALL
// (memory only), /4 near JMP, /5 far JMP (memory only), /6 PUSH,
// /0 INC, /1 DEC and /6 PUSH are memory-only in FF; register forms use compact opcodes.
// /3 and /5 far transfers are memory-only; /7 is reserved. Check all 256 ModR/M values.
const ffNames = ["INC", "DEC", "CALL", "CALL FAR", "JMP", "JMP FAR", "PUSH", null];
for (let ext = 0; ext < 8; ext++) {
  for (let mod = 0; mod < 4; mod++) {
    for (let rm = 0; rm < 8; rm++) {
      const code = [0xFF, modrm(mod, ext, rm), ...disp(mod, rm)];
      const label = "FF /" + ext + " mod=" + mod + " rm=" + rm;
      test(label, () => {
        const result = api.disassemble(code);
        assert.equal(result.rows.length, 1);
        assert.deepEqual(Array.from(result.rows[0].bytes), code);
        const instruction = result.rows[0].instruction;
        if (ext === 7 || (mod === 3 && [0, 1, 3, 5, 6].includes(ext))) {
          assert.ok(instruction.startsWith("DB "), instruction);
        } else {
          assert.ok(instruction.startsWith(ffNames[ext] + " "), instruction);
        }
      });
      counts.ff++;
    }
  }
}

// Assembler uses compact PUSH register opcodes, but FF /6 for memory.
// Near indirect CALL/JMP are valid encodings; far forms are memory-only.
const ffVectors = [
  ["CALL AX", [0xFF, 0xD0]],
  ["CALL WORD PTR [BX]", [0xFF, 0x17]],
  ["JMP DX", [0xFF, 0xE2]],
  ["JMP WORD PTR [BP+SI+4]", [0xFF, 0x62, 0x04]],
  ["PUSH WORD PTR [BX]", [0xFF, 0x37]],
  ["PUSH AX", [0x50]],
  ["PUSH WORD PTR [DI+256]", [0xFF, 0xB5, 0x00, 0x01]]
];
for (const [source, expected] of ffVectors) {
  test("FF assembler " + source, () => assert.deepEqual(assemble(source), expected));
  test("FF decoder round-trip " + source, () => {
    const decoded = decode(expected);
    assert.ok(decoded.startsWith(source.split(" ")[0] + " "), decoded);
  });
  counts.ff += 2;
}
for (const source of ["CALL BYTE PTR [BX]", "JMP BYTE PTR [BX]", "PUSH BYTE PTR [BX]"]) {
  test("FF rejects byte-sized operand " + source, () => assert.throws(() => assemble(source)));
  counts.ff++;
}

// C6/C7: /0 is MOV r/m, immediate; /1..7 are reserved.
// Test all ModR/M values, preserving complete invalid encodings.
for (const [opcode, bits, immediate] of [
  [0xC6, 8, [0xA5]],
  [0xC7, 16, [0x34, 0x12]]
]) {
  for (let ext = 0; ext < 8; ext++) {
    for (let mod = 0; mod < 4; mod++) {
      for (let rm = 0; rm < 8; rm++) {
        const code = [opcode, modrm(mod, ext, rm), ...disp(mod, rm), ...immediate];
        const label = "C" + (opcode & 15).toString(16).toUpperCase() +
          " /" + ext + " mod=" + mod + " rm=" + rm;
        test(label, () => {
          const result = api.disassemble(code);
          assert.equal(result.rows.length, 1);
          assert.deepEqual(Array.from(result.rows[0].bytes), code);
          if (ext === 0) assert.ok(result.rows[0].instruction.startsWith("MOV "), result.rows[0].instruction);
          else assert.ok(result.rows[0].instruction.startsWith("DB "), result.rows[0].instruction);
        });
        counts.c6c7++;
      }
    }
  }
}
const movImmediateVectors = [
  ["MOV BYTE PTR [BX], 5Ah", [0xC6, 0x07, 0x5A]],
  ["MOV WORD PTR [BX], 1234h", [0xC7, 0x07, 0x34, 0x12]],
  ["MOV WORD PTR [BP+SI+4], 1234h", [0xC7, 0x42, 0x04, 0x34, 0x12]],
  ["MOV BYTE PTR [DI+1], 7Fh", [0xC6, 0x45, 0x01, 0x7F]]
];
for (const [source, expected] of movImmediateVectors) {
  test("C6/C7 assembler " + source, () => assert.deepEqual(assemble(source), expected));
  counts.c6c7++;
}

// Independent execution checks for supported unary and PUSH forms.
test("NOT 8-bit changes operand and preserves all FLAGS", () => {
  const s = state(["MOV AL, 55h", "STC", "STD", "NOT AL", "HLT"].join("\n"));
  assert.equal(s.reg.AX & 255, 0xAA);
  assert.equal(s.flags.CF, 1);
  assert.equal(s.flags.DF, 1);
});
counts.execution++;

test("NEG 8-bit sets arithmetic result and carry", () => {
  const s = state(["MOV AL, 01h", "NEG AL", "HLT"].join("\n"));
  assert.equal(s.reg.AX & 255, 0xFF);
  assert.equal(s.flags.CF, 1);
  assert.equal(s.flags.ZF, 0);
});
counts.execution++;

test("NEG minimum signed 16-bit sets overflow", () => {
  const s = state(["MOV AX, 8000h", "NEG AX", "HLT"].join("\n"));
  assert.equal(s.reg.AX, 0x8000);
  assert.equal(s.flags.OF, 1);
  assert.equal(s.flags.CF, 1);
});
counts.execution++;

test("MUL and IMUL use implicit accumulator and write full product", () => {
  const u = state(["MOV AL, 20", "MOV BL, 10", "MUL BL", "HLT"].join("\n"));
  assert.equal(u.reg.AX, 200);
  assert.equal(u.flags.CF, 0);
  assert.equal(u.flags.OF, 0);
  const s = state(["MOV AX, 0FFFCh", "MOV BX, 3", "IMUL BX", "HLT"].join("\n"));
  assert.equal(s.reg.AX, 0xFFF4);
  assert.equal(s.reg.DX, 0xFFFF);
  assert.equal(s.flags.CF, 0);
});
counts.execution++;

test("DIV and IDIV write quotient and remainder to implicit registers", () => {
  const u = state(["MOV AX, 100", "MOV BL, 9", "DIV BL", "HLT"].join("\n"));
  assert.equal(u.reg.AX & 255, 11);
  assert.equal(u.reg.AX >> 8, 1);
  const s = state(["MOV AX, 0FFF9h", "MOV BL, 2", "IDIV BL", "HLT"].join("\n"));
  assert.equal(s.reg.AX & 255, 0xFD);
  assert.equal(s.reg.AX >> 8, 0xFF);
});
counts.execution++;

test("PUSH r/m16 FF /6 and POP preserve word value", () => {
  const s = state([
    "MOV BX, 0100h",
    "MOV WORD PTR [BX], 0BEEFh",
    "PUSH WORD PTR [BX]",
    "POP CX",
    "HLT"
  ].join("\n"));
  assert.equal(s.reg.CX, 0xBEEF);
  assert.equal(s.reg.SP, 0xFFFE);
  assert.equal(s.stack.length, 0);
});
counts.execution++;

const indirectBounds = [
  ["CALL", "AX", ["MOV AX, FFFFh"]],
  ["CALL", "WORD PTR [BX]", ["MOV BX, 0100h", "MOV WORD PTR [BX], FFFFh"]],
  ["JMP", "DX", ["MOV DX, FFFFh"]],
  ["JMP", "WORD PTR [BX]", ["MOV BX, 0100h", "MOV WORD PTR [BX], FFFFh"]]
];
for (const [mnemonic, operand, setup] of indirectBounds) {
  test(mnemonic + " indirect executes its target lookup and rejects an out-of-program IP · " + operand, () => {
    const result = api.execute(setup.concat(mnemonic + " " + operand, "HLT").join("\n"));
    assert.match(result.error, /cible IP hors du programme simulé/i);
  });
  counts.execution++;
}

// Truncated encodings for each group must raise a precise decoder error.
const truncated = [
  [0xF6], [0xF6, 0xC0], [0xF7], [0xF7, 0xC0, 0x34],
  [0xFF], [0xFF, 0x06], [0xFF, 0x46], [0xFF, 0x86, 0x01],
  [0xC6], [0xC6, 0x06], [0xC6, 0x46], [0xC7], [0xC7, 0x06],
  [0xC7, 0x46], [0xC7, 0x86, 0x01]
];
for (const bytes of truncated) {
  test("Truncated " + bytes.map(x => x.toString(16)).join(" "), () => {
    assert.throws(() => api.disassemble(bytes), /tronqué/i);
  });
  counts.truncated++;
}

console.log("F6/F7 : " + counts.f6f7 + " vecteurs.");
console.log("FF : " + counts.ff + " vecteurs.");
console.log("C6/C7 : " + counts.c6c7 + " vecteurs.");
console.log("Exécution : " + counts.execution + " vecteurs.");
console.log("Flux tronqués : " + counts.truncated + " vecteurs.");
console.log("Résultat groupes opcode : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
