const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Application script must exist");

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
const injection = "\nglobalThis.__8086LogicAudit = {" +
  "\n execute: function (source) { return executeAll(source); }," +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n disassemble: function (bytes) { return disassembleBytes(bytes); }," +
  "\n executeBinary: function (bytes, state) { return executeBinary(bytes, 0, 0, state || {}); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 15000 });
const api = context.__8086LogicAudit;
assert.ok(api, "Logical instruction audit API must be exposed");

let passed = 0, failed = 0;
const totals = {
  exhaustiveBytePairs: 0, flagVectors: 0, wordBoundaries: 0,
  registerEncodings: 0, memoryEncodings: 0, immediateEncodings: 0,
  invalidInputs: 0, binaryParity: 0
};
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.message); }
}
function run(source) {
  const state = api.execute(source);
  assert.ok(!state.error, state.error || "Execution failed");
  return state;
}
function byte(v) { return (v & 255).toString(16).toUpperCase().padStart(2, "0") + "h"; }
function word(v) { return (v & 65535).toString(16).toUpperCase().padStart(4, "0") + "h"; }
function parity8(v) {
  let n = 0;
  for (let i = 0; i < 8; i++) n += (v >> i) & 1;
  return n % 2 === 0 ? 1 : 0;
}
function logical(op, a, b, bits) {
  const mask = bits === 8 ? 255 : 65535;
  if (op === "AND" || op === "TEST") return (a & b) & mask;
  if (op === "OR") return (a | b) & mask;
  return (a ^ b) & mask;
}
function flagsWord() {
  // IF=1, DF=1, CF=1, OF=1, AF=1, SF=1, ZF=1, PF=1.
  return 2 | (1 << 9) | (1 << 10) | (1 << 11) | (1 << 7) |
    (1 << 6) | (1 << 4) | (1 << 2) | 1;
}
function checkLogicalFlags(state, result, label, bits) {
  assert.equal(state.flags.CF, 0, label + " CF must clear");
  assert.equal(state.flags.OF, 0, label + " OF must clear");
  assert.equal(state.flags.SF, (result & (bits === 8 ? 0x80 : 0x8000)) ? 1 : 0, label + " SF");
  assert.equal(state.flags.ZF, result === 0 ? 1 : 0, label + " ZF");
  assert.equal(state.flags.PF, parity8(result & 255), label + " PF");
  assert.equal(state.flags.DF, 1, label + " DF must be preserved");
  assert.equal(state.flags.IF, 1, label + " IF must be preserved");
  // AF is undefined for AND/OR/XOR/TEST and is intentionally not asserted.
}
function initialFlagsCode() {
  return "MOV DX, " + word(flagsWord()) + "\nPUSH DX\nPOPF\n";
}

// 1. Exhaustive 8-bit truth tables: all 65,536 operand pairs are checked
//    for AND, OR, XOR and TEST in one execution per pair.
for (let a = 0; a < 256; a++) {
  for (let b = 0; b < 256; b++) {
    const source = [
      "MOV AL, " + byte(a), "MOV BL, " + byte(b),
      "MOV CL, " + byte(a), "MOV DL, " + byte(b),
      "MOV AH, " + byte(a), "MOV BH, " + byte(b),
      "MOV CH, " + byte(a), "MOV DH, " + byte(b),
      "AND AL, BL", "OR CL, DL", "XOR AH, BH", "TEST CH, DH", "HLT"
    ].join("\n");
    test("8-bit truth table A=" + byte(a) + " B=" + byte(b), () => {
      const state = run(source);
      assert.equal(state.reg.AX & 255, logical("AND", a, b, 8), "AND AL");
      assert.equal(state.reg.CX & 255, logical("OR", a, b, 8), "OR CL");
      assert.equal(state.reg.AX >> 8, logical("XOR", a, b, 8), "XOR AH");
      assert.equal(state.reg.CX >> 8, a, "TEST must not modify CH");
      assert.equal(state.reg.DX & 255, b, "source register DL must remain unchanged");
      assert.equal(state.reg.DX >> 8, b, "source register DH must remain unchanged");
    });
    totals.exhaustiveBytePairs++;
  }
}

// 2. Independent FLAGS oracle for each operation over every possible AL result.
//    Operand pairs are chosen to produce each result value; AF remains undefined.
for (const op of ["AND", "OR", "XOR", "TEST"]) {
  for (let target = 0; target < 256; target++) {
    let a, b;
    if (op === "AND") { a = target; b = 255; }
    else if (op === "OR") { a = target; b = 0; }
    else if (op === "XOR") { a = target; b = 0; }
    else { a = target; b = 255; }
    const expected = logical(op, a, b, 8);
    const source = [
      "MOV AL, " + byte(a), "MOV BL, " + byte(b),
      initialFlagsCode(), op + " AL, BL", "HLT"
    ].join("\n");
    test(op + " FLAGS result=" + byte(target), () => {
      const state = run(source);
      assert.equal(state.reg.AX & 255, op === "TEST" ? a : expected, op + " destination");
      checkLogicalFlags(state, expected, op + " " + byte(a) + "," + byte(b), 8);
    });
    totals.flagVectors++;
  }
}

// 3. 16-bit boundary cross-product, including sign and zero boundaries.
const words = [0x0000,0x0001,0x0002,0x0007,0x000F,0x0010,0x007F,0x0080,
  0x00FF,0x0100,0x7FFF,0x8000,0x8001,0xFFFE,0xFFFF];
for (const op of ["AND", "OR", "XOR", "TEST"]) {
  for (const a of words) for (const b of words) {
    const expected = logical(op, a, b, 16);
    const source = [
      "MOV AX, " + word(a), "MOV BX, " + word(b),
      initialFlagsCode(), op + " AX, BX", "HLT"
    ].join("\n");
    test(op + " 16-bit boundary " + word(a) + "/" + word(b), () => {
      const state = run(source);
      assert.equal(state.reg.AX, op === "TEST" ? a : expected, op + " AX");
      checkLogicalFlags(state, expected, op + " " + word(a) + "," + word(b), 16);
    });
    totals.wordBoundaries++;
  }
}

// 4. Register-direct encodings, both directions, all eight r/m and reg fields.
const r8 = ["AL","CL","DL","BL","AH","CH","DH","BH"];
const r16 = ["AX","CX","DX","BX","SP","BP","SI","DI"];
const baseOpcode = { OR: 0x08, AND: 0x20, XOR: 0x30 };
for (const op of ["OR", "AND", "XOR"]) {
  for (const bits of [8,16]) {
    const regs = bits === 8 ? r8 : r16;
    for (let reg = 0; reg < 8; reg++) for (let rm = 0; rm < 8; rm++) {
      const modrm = 0xC0 | (reg << 3) | rm;
      const toRM = [baseOpcode[op] + (bits === 8 ? 0 : 1), modrm];
      const toReg = [baseOpcode[op] + (bits === 8 ? 0 : 1), 0xC0 | (rm << 3) | reg];
      const fixedReverse = [baseOpcode[op] + (bits === 8 ? 2 : 3), modrm];
      const sourceRM = op + " " + regs[rm] + ", " + regs[reg];
      const sourceReg = op + " " + regs[reg] + ", " + regs[rm];
      test(op + " register encoding r/m←reg " + bits + " " + reg + "/" + rm, () => {
        assert.deepEqual(Array.from(api.assemble(sourceRM).bytes), toRM, sourceRM);
        const decoded = api.disassemble(toRM).rows[0].instruction;
        assert.ok(decoded.startsWith(op + " "), decoded);
      });
      test(op + " register encoding reg←r/m " + bits + " " + reg + "/" + rm, () => {
        assert.deepEqual(Array.from(api.assemble(sourceReg).bytes), toReg, sourceReg);
        const decoded = api.disassemble(fixedReverse).rows[0].instruction;
        assert.ok(decoded.startsWith(op + " "), decoded);
      });
      totals.registerEncodings += 2;
    }
  }
}
// TEST uses 84/85 /r with the source in REG and destination in r/m.
for (const bits of [8,16]) {
  const regs = bits === 8 ? r8 : r16;
  for (let reg = 0; reg < 8; reg++) for (let rm = 0; rm < 8; rm++) {
    const code = [bits === 8 ? 0x84 : 0x85, 0xC0 | (reg << 3) | rm];
    const source = "TEST " + regs[rm] + ", " + regs[reg];
    test("TEST register encoding " + bits + " " + reg + "/" + rm, () => {
      assert.deepEqual(Array.from(api.assemble(source).bytes), code, source);
      assert.ok(api.disassemble(code).rows[0].instruction.startsWith("TEST "), source);
    });
    totals.registerEncodings++;
  }
}

// 5. All 24 memory ModR/M addressing forms for byte and word widths.
//    Fixed disassembly bytes are independent of the assembler output.
const ea = ["BX+SI","BX+DI","BP+SI","BP+DI","SI","DI","BP","BX"];
function memExpr(mod, rm) {
  if (mod === 0 && rm === 6) return "[4660]";
  if (mod === 0) return "[" + ea[rm] + "]";
  if (mod === 1) return rm === 6 ? "[BP+1]" : "[" + ea[rm] + "+1]";
  return rm === 6 ? "[BP+256]" : "[" + ea[rm] + "+256]";
}
function dispBytes(mod, rm) {
  if (mod === 0 && rm === 6) return [0x34,0x12];
  if (mod === 1) return [0x01];
  if (mod === 2) return [0x00,0x01];
  return [];
}
for (const op of ["OR", "AND", "XOR"]) {
  for (const bits of [8,16]) {
    for (let mod = 0; mod <= 2; mod++) for (let rm = 0; rm < 8; rm++) {
      const widthName = bits === 8 ? "BYTE" : "WORD";
      const expr = memExpr(mod, rm);
      const ext = 0; // /r form: REG encodes the source register, not an opcode extension.
      const opcode = { OR:0x08, AND:0x20, XOR:0x30 }[op] + (bits === 8 ? 0 : 1);
      const fixed = [opcode, (mod << 6) | (ext << 3) | rm, ...dispBytes(mod,rm)];
      const source = op + " " + widthName + " PTR " + expr + ", " + (bits === 8 ? "AL" : "AX");
      test(op + " memory encoding " + bits + " mod=" + mod + " rm=" + rm, () => {
        assert.deepEqual(Array.from(api.assemble(source).bytes), fixed, source);
        const decoded = api.disassemble(fixed).rows[0].instruction;
        assert.ok(decoded.startsWith(op + " "), decoded);
      });
      totals.memoryEncodings++;
    }
  }
}
// TEST memory form: 84/85 /r, all address forms and both widths.
for (const bits of [8,16]) {
  for (let mod = 0; mod <= 2; mod++) for (let rm = 0; rm < 8; rm++) {
    const expr = memExpr(mod,rm), widthName = bits === 8 ? "BYTE" : "WORD";
    const fixed = [bits === 8 ? 0x84 : 0x85, (mod << 6) | (3 << 3) | rm, ...dispBytes(mod,rm)];
    const source = "TEST " + widthName + " PTR " + expr + ", " + (bits === 8 ? "BL" : "BX");
    test("TEST memory encoding " + bits + " mod=" + mod + " rm=" + rm, () => {
      assert.deepEqual(Array.from(api.assemble(source).bytes), fixed, source);
      assert.ok(api.disassemble(fixed).rows[0].instruction.startsWith("TEST "));
    });
    totals.memoryEncodings++;
  }
}

// 6. Immediate forms: accumulator, group 80/81/83, and TEST F6/F7 /0.
const immAccumulator = {
  OR: [0x0C,0x0D], AND: [0x24,0x25], XOR: [0x34,0x35], TEST: [0xA8,0xA9]
};
const immediateExt = { OR:1, AND:4, XOR:6 };
for (const op of ["OR","AND","XOR","TEST"]) {
  for (const bits of [8,16]) {
    const immValue = bits === 8 ? 0x5A : 0x1234;
    const immBytes = bits === 8 ? [immValue] : [immValue & 255, immValue >> 8];
    const acc = bits === 8 ? "AL" : "AX";
    const accCode = [immAccumulator[op][bits === 8 ? 0 : 1], ...immBytes];
    const accSource = op + " " + acc + ", " + (bits === 8 ? byte(immValue) : word(immValue));
    test(op + " accumulator immediate " + bits, () => {
      assert.deepEqual(Array.from(api.assemble(accSource).bytes), accCode, accSource);
      assert.ok(api.disassemble(accCode).rows[0].instruction.startsWith(op + " "));
    });
    totals.immediateEncodings++;

    const ext = op === "TEST" ? 0 : immediateExt[op];
    const group8 = [op === "TEST" ? 0xF6 : 0x80, (ext << 3) | 7, immValue & 255];
    const group8Source = op + " BYTE PTR [BX], " + byte(immValue);
    test(op + " group immediate byte", () => {
      assert.deepEqual(Array.from(api.assemble(group8Source).bytes), group8, group8Source);
      assert.ok(api.disassemble(group8).rows[0].instruction.startsWith(op + " "));
    });
    totals.immediateEncodings++;

    if (op === "TEST") {
      const group16 = [0xF7, 0x07, 0x34, 0x12];
      const source16 = "TEST WORD PTR [BX], 1234h";
      test("TEST group immediate word", () => {
        assert.deepEqual(Array.from(api.assemble(source16).bytes), group16, source16);
        assert.ok(api.disassemble(group16).rows[0].instruction.startsWith("TEST "));
      });
      totals.immediateEncodings++;
    } else {
      const group16 = [0x81, (3 << 3) | ext | 7, 0x34, 0x12];
      const source16 = op + " WORD PTR [BX], 1234h";
      test(op + " group immediate word 81h", () => {
        assert.deepEqual(Array.from(api.assemble(source16).bytes), group16, source16);
        assert.ok(api.disassemble(group16).rows[0].instruction.startsWith(op + " "));
      });
      totals.immediateEncodings++;

      const group83 = [0x83, (3 << 3) | ext | 7, 0xFF];
      const source83 = op + " WORD PTR [BX], -1";
      test(op + " sign-extended immediate 83h", () => {
        assert.deepEqual(Array.from(api.assemble(source83).bytes), group83, source83);
        assert.ok(api.disassemble(group83).rows[0].instruction.startsWith(op + " "));
      });
      totals.immediateEncodings++;
    }
  }
}

// 7. Selected source-vs-dynamic-binary equivalence checks with fixed expectations.
const binaryVectors = [
  ["AND AL, BL", "MOV AL, F3h\nMOV BL, 5Ah\nAND AL, BL\nHLT", 0x52],
  ["OR AX, BX", "MOV AX, 8001h\nMOV BX, 0102h\nOR AX, BX\nHLT", 0x8103],
  ["XOR AL, 0FFh", "MOV AL, A5h\nXOR AL, 0FFh\nHLT", 0x5A],
  ["TEST AL, 80h", "MOV AL, 80h\nTEST AL, 80h\nHLT", 0x80]
];
for (const [label, source, expected] of binaryVectors) {
  test("Source/binary differential " + label, () => {
    const assembled = api.assemble(source);
    const sourceState = run(source);
    const binaryState = api.executeBinary(assembled.bytes, {});
    assert.ok(!binaryState.error, binaryState.error || "Binary execution failed");
    assert.equal(binaryState.reg.AX, sourceState.reg.AX, "AX source/binary");
    assert.equal(binaryState.reg.BX, sourceState.reg.BX, "BX source/binary");
    assert.equal(binaryState.flags.CF, sourceState.flags.CF, "CF source/binary");
    assert.equal(binaryState.flags.OF, sourceState.flags.OF, "OF source/binary");
    assert.equal(binaryState.flags.SF, sourceState.flags.SF, "SF source/binary");
    assert.equal(binaryState.flags.ZF, sourceState.flags.ZF, "ZF source/binary");
    assert.equal(binaryState.flags.PF, sourceState.flags.PF, "PF source/binary");
    if (label.startsWith("TEST")) assert.equal(sourceState.reg.AX & 255, expected);
    else assert.equal(sourceState.reg.AX & (label.startsWith("OR AX") ? 65535 : 255), expected);
  });
  totals.binaryParity++;
}

// 8. Negative cases and truncated instruction streams.
for (const source of [
  "AND AL, 256",
  "OR BYTE PTR [BX], 1000h",
  "XOR BYTE PTR [BX], AX",
  "TEST BYTE PTR [BX], AX",
  "AND BYTE PTR [BX], BYTE PTR [SI]",
  "OR WORD PTR [BX], BYTE PTR [SI]",
  "TEST WORD PTR [BX], BYTE PTR [SI]"
]) {
  test("Invalid logical operands rejected · " + source, () => {
    assert.throws(() => api.assemble(source));
  });
  totals.invalidInputs++;
}
for (const code of [
  [0x20], [0x21,0x40], [0x22], [0x23,0x80,0x01],
  [0x08], [0x09,0x06], [0x30], [0x31,0x80,0x01],
  [0x84], [0x85,0x06], [0x80], [0x81,0x06], [0x83,0x06],
  [0xF6], [0xF7], [0xF7,0x06]
]) {
  test("Truncated logical instruction rejected · " + code.map(x=>x.toString(16)).join(" "), () => {
    assert.throws(() => api.disassemble(code), /tronqué/i);
  });
  totals.invalidInputs++;
}

console.log("Tables de vérité 8 bits (AND/OR/XOR/TEST combinés) : " + totals.exhaustiveBytePairs);
console.log("Vecteurs FLAGS : " + totals.flagVectors);
console.log("Frontières 16 bits : " + totals.wordBoundaries);
console.log("Encodages registre : " + totals.registerEncodings);
console.log("Encodages mémoire : " + totals.memoryEncodings);
console.log("Encodages immédiats : " + totals.immediateEncodings);
console.log("Rejets et flux tronqués : " + totals.invalidInputs);
console.log("Équivalences source/binaire : " + totals.binaryParity);
console.log("Audit logique 8086 : " + passed + " réussis, " + failed + " échecs.");
console.log("AF est volontairement ignoré pour AND/OR/XOR/TEST : son état est indéfini sur 8086.");
if (failed) process.exit(1);
