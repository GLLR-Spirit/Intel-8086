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
const injection = "\nglobalThis.__8086NegApi = {" +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n disassemble: function (bytes) { return disassembleBytes(bytes); }," +
  "\n execute: function (source) { return executeAll(source); }," +
  "\n executeBinary: function (bytes, cs, ip, state) { return executeBinary(bytes, cs, ip, state); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 15000 });
const api = context.__8086NegApi;
assert.ok(api, "NEG test API must be exposed");

let passed = 0, failed = 0;
const counts = { encoding: 0, decode: 0, displacement: 0, invalid: 0, execution: 0, flags8: 0, flags16: 0 };
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.stack); }
}
function modrm(mod, ext, rm) { return (mod << 6) | (ext << 3) | rm; }
function bytes(source) { return Array.from(api.assemble(source).bytes); }
function decode(code) {
  const result = api.disassemble(code);
  assert.equal(result.rows.length, 1, "exactly one instruction must decode");
  assert.deepEqual(Array.from(result.rows[0].bytes), code);
  return result.rows[0].instruction;
}
function byteHex(n) { return n.toString(16).toUpperCase().padStart(2, "0") + "h"; }
function wordHex(n) { return n.toString(16).toUpperCase().padStart(4, "0") + "h"; }
function parity8(n) {
  let ones = 0;
  for (let i = 0; i < 8; i++) ones += (n >> i) & 1;
  return ones % 2 === 0 ? 1 : 0;
}
function expectedFlags(value, bits) {
  const mask = bits === 8 ? 0xFF : 0xFFFF;
  const sign = bits === 8 ? 0x80 : 0x8000;
  const result = (-value) & mask;
  return {
    result,
    CF: value === 0 ? 0 : 1,
    OF: value === sign ? 1 : 0,
    SF: (result & sign) ? 1 : 0,
    ZF: result === 0 ? 1 : 0,
    PF: parity8(result & 0xFF),
    AF: (value & 0x0F) === 0 ? 0 : 1
  };
}
function runSource(source) {
  const state = api.execute(source);
  assert.ok(!state.error, state.error || "source execution failed");
  return state;
}
function runBinary(source) {
  const assembled = api.assemble(source);
  const state = api.executeBinary(assembled.bytes, 0, 0);
  assert.ok(!state.error, state.error || "binary execution failed");
  return state;
}
function assertFlags(state, expected, label) {
  for (const flag of ["CF", "OF", "SF", "ZF", "PF", "AF"]) {
    assert.equal(state.flags[flag], expected[flag], label + " " + flag);
  }
}

// ---------------------------------------------------------------------------
// A. Register encodings: F6 /3 for r/m8 and F7 /3 for r/m16.
// ---------------------------------------------------------------------------
const regs8 = ["AL", "CL", "DL", "BL", "AH", "CH", "DH", "BH"];
const regs16 = ["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"];
for (let rm = 0; rm < 8; rm++) {
  const c8 = [0xF6, modrm(3, 3, rm)];
  const c16 = [0xF7, modrm(3, 3, rm)];
  test("Encodage NEG registre 8 bits " + regs8[rm], () => {
    assert.deepEqual(bytes("NEG " + regs8[rm]), c8);
  });
  test("Désassemblage NEG registre 8 bits " + regs8[rm], () => {
    assert.ok(decode(c8).startsWith("NEG " + regs8[rm]));
  });
  test("Encodage NEG registre 16 bits " + regs16[rm], () => {
    assert.deepEqual(bytes("NEG " + regs16[rm]), c16);
  });
  test("Désassemblage NEG registre 16 bits " + regs16[rm], () => {
    assert.ok(decode(c16).startsWith("NEG " + regs16[rm]));
  });
  counts.encoding += 2;
  counts.decode += 2;
}

// ---------------------------------------------------------------------------
// B. Memory encodings: all eight r/m forms, all mod values, BP special case.
// ---------------------------------------------------------------------------
const ea = ["BX+SI", "BX+DI", "BP+SI", "BP+DI", "SI", "DI", "BP", "BX"];
function memoryForm(mod, rm) {
  if (mod === 0 && rm === 6) return { expression: "[4660]", tail: [0x34, 0x12] };
  if (mod === 0) return { expression: "[" + ea[rm] + "]", tail: [] };
  if (mod === 1) return { expression: "[" + ea[rm] + "+5]", tail: [0x05] };
  return { expression: "[" + ea[rm] + "+256]", tail: [0x00, 0x01] };
}
for (const bits of [8, 16]) {
  const opcode = bits === 8 ? 0xF6 : 0xF7;
  const ptr = bits === 8 ? "BYTE PTR " : "WORD PTR ";
  for (let mod = 0; mod < 3; mod++) {
    for (let rm = 0; rm < 8; rm++) {
      const form = memoryForm(mod, rm);
      const expected = [opcode, modrm(mod, 3, rm), ...form.tail];
      const source = "NEG " + ptr + form.expression;
      test("Encodage NEG mémoire " + source, () => {
        assert.deepEqual(bytes(source), expected);
      });
      test("Désassemblage NEG mémoire " + source, () => {
        assert.ok(decode(expected).includes("NEG "), source);
      });
      counts.encoding++;
      counts.decode++;
    }
  }
  // [BP] has no mod=00 encoding; it is mod=01 with disp8=0.
  const bpCode = [opcode, modrm(1, 3, 6), 0x00];
  test("NEG [BP] utilise disp8 nul · " + bits + " bits", () => {
    assert.deepEqual(bytes("NEG " + ptr + "[BP]"), bpCode);
  });
  counts.encoding++;
}

// ---------------------------------------------------------------------------
// C. Displacement boundaries, direct address and invalid ModR/M extensions.
// ---------------------------------------------------------------------------
const displacementVectors = [
  { expr: "[BX-128]", mod: 1, tail: [0x80] },
  { expr: "[BX+127]", mod: 1, tail: [0x7F] },
  { expr: "[BX-32768]", mod: 2, tail: [0x00, 0x80] },
  { expr: "[BX+32767]", mod: 2, tail: [0xFF, 0x7F] },
  { expr: "[BX+65535]", mod: 2, tail: [0xFF, 0xFF] },
  { expr: "[65535]", mod: 0, rm: 6, tail: [0xFF, 0xFF] }
];
for (const bits of [8, 16]) {
  const opcode = bits === 8 ? 0xF6 : 0xF7;
  const ptr = bits === 8 ? "BYTE PTR " : "WORD PTR ";
  for (const item of displacementVectors) {
    const rm = item.rm === undefined ? 7 : item.rm;
    const expected = [opcode, modrm(item.mod, 3, rm), ...item.tail];
    const source = "NEG " + ptr + item.expr;
    test("NEG déplacement limite " + source, () => {
      assert.deepEqual(bytes(source), expected);
      assert.ok(decode(expected).includes("NEG "));
    });
    counts.displacement++;
  }
  for (const invalid of ["[BX-32769]", "[BX+65536]"]) {
    test("NEG rejette déplacement hors plage " + invalid + " · " + bits, () => {
      assert.throws(() => api.assemble("NEG " + ptr + invalid));
    });
    counts.invalid++;
  }
}

// /3 is NEG; /1 is reserved and must not be decoded as NEG.
for (const opcode of [0xF6, 0xF7]) {
  for (let mod = 0; mod < 4; mod++) {
    for (let rm = 0; rm < 8; rm++) {
      const bits = opcode === 0xF6 ? 8 : 16;
      let tail = [];
      if (mod === 0 && rm === 6) tail = [0x34, 0x12];
      else if (mod === 1) tail = [0x01];
      else if (mod === 2) tail = [0x00, 0x01];
      const negCode = [opcode, modrm(mod, 3, rm), ...tail];
      const reservedCode = [opcode, modrm(mod, 1, rm), ...tail];
      test("F6/F7 /3 NEG reconnu · " + opcode.toString(16) + " mod=" + mod + " rm=" + rm, () => {
        assert.ok(decode(negCode).includes("NEG "));
      });
      test("F6/F7 /1 réservé · " + opcode.toString(16) + " mod=" + mod + " rm=" + rm, () => {
        assert.ok(decode(reservedCode).startsWith("DB "));
      });
      counts.decode += 2;
    }
  }
}

// ---------------------------------------------------------------------------
// D. Segment override prefixes and default DS/SS selection.
// ---------------------------------------------------------------------------
const segmentVectors = [
  { segment: "ES", expr: "[BX]", prefix: 0x26, mod: 0, rm: 7, tail: [] },
  { segment: "CS", expr: "[BP+SI]", prefix: 0x2E, mod: 0, rm: 2, tail: [] },
  { segment: "SS", expr: "[BX+DI]", prefix: 0x36, mod: 0, rm: 1, tail: [] },
  { segment: "DS", expr: "[BP]", prefix: 0x3E, mod: 1, rm: 6, tail: [0x00] }
];
for (const bits of [8, 16]) {
  const opcode = bits === 8 ? 0xF6 : 0xF7;
  const ptr = bits === 8 ? "BYTE PTR " : "WORD PTR ";
  for (const item of segmentVectors) {
    const expected = [item.prefix, opcode, modrm(item.mod, 3, item.rm), ...item.tail];
    const source = "NEG " + ptr + item.segment + ":" + item.expr;
    test("Préfixe segment NEG " + source, () => {
      assert.deepEqual(bytes(source), expected);
      assert.ok(decode(expected).includes("NEG "));
    });
    counts.encoding++;
    counts.decode++;
  }
}

// Execute every byte and word register form through both source and binary paths.
for (const [bits, registers] of [[8, regs8], [16, regs16]]) {
  for (const register of registers) {
    const value = bits === 8 ? 0x81 : 0x8001;
    const expected = expectedFlags(value, bits);
    const source = [
      "MOV " + register + ", " + (bits === 8 ? byteHex(value) : wordHex(value)),
      "STC", "STD", "NEG " + register, "HLT"
    ].join("\n");
    for (const [path, execute] of [["source", runSource], ["binaire", runBinary]]) {
      test("NEG registre " + bits + " bits " + register + " · " + path, () => {
        const state = execute(source);
        const result = bits === 8
          ? (register === "AH" || register === "CH" || register === "DH" || register === "BH"
            ? (state.reg[register[0] + "X"] >> 8) & 0xFF
            : state.reg[register[0] + "X"] & 0xFF)
          : state.reg[register];
        assert.equal(result, expected.result);
        assertFlags(state, expected, "NEG " + register);
        assert.equal(state.flags.DF, 1);
      });
      counts.execution++;
    }
  }
}

// ---------------------------------------------------------------------------
// E. Exhaustive byte-result and flag vectors, plus 16-bit boundary vectors.
// ---------------------------------------------------------------------------
for (let value = 0; value <= 0xFF; value++) {
  const expected = expectedFlags(value, 8);
  const source = [
    "MOV AL, " + byteHex(value),
    "STC", "STD", "NEG AL", "HLT"
  ].join("\n");
  test("NEG AL exhaustif · entrée " + byteHex(value), () => {
    for (const [mode, state] of [["source",runSource(source)],["binaire",runBinary(source)]]) {
      assert.equal(state.reg.AX & 0xFF, expected.result, mode);
      assertFlags(state, expected, "NEG " + byteHex(value) + " " + mode);
      assert.equal(state.flags.DF, 1, "NEG must preserve DF " + mode);
    }
  });
  counts.flags8++;
}
const wordValues = [
  0x0000, 0x0001, 0x000F, 0x0010, 0x007F, 0x0080, 0x00FF,
  0x0100, 0x0FFF, 0x1000, 0x7FFF, 0x8000, 0x8001, 0xFF00, 0xFFFF
];
for (const value of wordValues) {
  const expected = expectedFlags(value, 16);
  const source = [
    "MOV AX, " + wordHex(value),
    "STC", "STD", "NEG AX", "HLT"
  ].join("\n");
  test("NEG AX frontière · entrée " + wordHex(value), () => {
    for (const [mode, state] of [["source",runSource(source)],["binaire",runBinary(source)]]) {
      assert.equal(state.reg.AX, expected.result, mode);
      assertFlags(state, expected, "NEG " + wordHex(value) + " " + mode);
      assert.equal(state.flags.DF, 1, mode);
    }
  });
  counts.flags16++;
}

// Explicitly check the two architectural overflow boundaries.
test("NEG AL 80h is the only 8-bit signed overflow input", () => {
  const s = runSource("MOV AL, 80h\nNEG AL\nHLT");
  assert.equal(s.reg.AX & 255, 0x80);
  assert.equal(s.flags.OF, 1);
});
test("NEG AX 8000h is the only 16-bit signed overflow input", () => {
  const s = runSource("MOV AX, 8000h\nNEG AX\nHLT");
  assert.equal(s.reg.AX, 0x8000);
  assert.equal(s.flags.OF, 1);
});

// ---------------------------------------------------------------------------
// F. Memory execution through source and emitted binary, all EA forms.
// ---------------------------------------------------------------------------
function memoryRuntimeCase(bits, expression, segmentOverride) {
  const ptr = bits === 8 ? "BYTE PTR " : "WORD PTR ";
  const mem = ptr + (segmentOverride ? segmentOverride + ":" : "") + expression;
  const value = bits === 8 ? 0x81 : 0x8001;
  const expected = expectedFlags(value, bits);
  const lines = [
    "MOV AX, 1000h", "MOV DS, AX",
    "MOV AX, 2000h", "MOV SS, AX",
    "MOV AX, 3000h", "MOV ES, AX",
    "MOV BX, 0010h", "MOV BP, 0020h",
    "MOV SI, 0030h", "MOV DI, 0050h",
    "MOV " + mem + ", " + (bits === 8 ? byteHex(value) : wordHex(value)),
    "STC", "STD", "NEG " + mem, "HLT"
  ];
  return { source: lines.join("\n"), value, expected };
}
const runtimeForms = [
  { expr: "[BX+SI]", offset: 0x0040, segment: "DS" },
  { expr: "[BX+DI]", offset: 0x0060, segment: "DS" },
  { expr: "[BP+SI]", offset: 0x0050, segment: "SS" },
  { expr: "[BP+DI]", offset: 0x0070, segment: "SS" },
  { expr: "[SI]", offset: 0x0030, segment: "DS" },
  { expr: "[DI]", offset: 0x0050, segment: "DS" },
  { expr: "[BP]", offset: 0x0020, segment: "SS" },
  { expr: "[BX]", offset: 0x0010, segment: "DS" },
  { expr: "[BX+SI+5]", offset: 0x0045, segment: "DS" },
  { expr: "[BX+DI+256]", offset: 0x0160, segment: "DS" },
  { expr: "[4660]", offset: 0x1234, segment: "DS" }
];
let memoryExecutionCases = 0;
for (const bits of [8, 16]) {
  for (const form of runtimeForms) {
    const scenario = memoryRuntimeCase(bits, form.expr, null);
    for (const [path, execute] of [["source", runSource], ["binaire", runBinary]]) {
      test("NEG mémoire " + bits + " bits " + form.expr + " · " + path, () => {
        const state = execute(scenario.source);
        const physical = (((form.segment === "SS" ? 0x2000 : 0x1000) << 4) + form.offset) & 0xFFFFF;
        assert.equal(state.mem[physical], scenario.expected.result & 0xFF);
        if (bits === 16) assert.equal(state.mem[(physical + 1) & 0xFFFFF], (scenario.expected.result >> 8) & 0xFF);
        assertFlags(state, scenario.expected, "NEG memory " + form.expr);
        assert.equal(state.flags.DF, 1);
      });
      memoryExecutionCases++;
    }
  }
}

// Runtime segment overrides must change the selected memory, not only encoding.
for (const item of segmentVectors) {
  const scenario = memoryRuntimeCase(8, item.expr, item.segment);
  test("NEG mémoire avec segment override " + item.segment + ":" + item.expr, () => {
    const state = runSource(scenario.source);
    const offset = item.expr === "[BP]" ? 0x20 : item.expr === "[BP+SI]" ? 0x50 :
      item.expr === "[BX+DI]" ? 0x60 : 0x10;
    const physical = (((({ ES: 0x3000, CS: 0, SS: 0x2000, DS: 0x1000 })[item.segment]) << 4) + offset) & 0xFFFFF;
    assert.equal(state.mem[physical], 0x7F);
    assert.equal(state.flags.CF, 1);
  });
  memoryExecutionCases++;
}

// Effective-offset wraparound and 20-bit physical-address wraparound.
test("NEG mémoire word traverse offset FFFFh vers 0000h", () => {
  const source = [
    "MOV AX, 1000h", "MOV DS, AX", "MOV BX, 0FFFFh",
    "MOV WORD PTR [BX], 0001h", "NEG WORD PTR [BX]", "HLT"
  ].join("\n");
  const state = runSource(source);
  assert.equal(state.mem[0x1FFFF], 0xFF);
  assert.equal(state.mem[0x10000], 0xFF);
});
test("NEG mémoire applique le wrap physique 20 bits", () => {
  const source = [
    "MOV AX, 0FFFFh", "MOV DS, AX", "MOV BX, 0020h",
    "MOV BYTE PTR [BX], 01h", "NEG BYTE PTR [BX]", "HLT"
  ].join("\n");
  const state = runSource(source);
  assert.equal(state.mem[0x00010], 0xFF);
});
counts.execution += 2;

// ---------------------------------------------------------------------------
// G. Operand validation and truncated instruction streams.
// ---------------------------------------------------------------------------
for (const source of [
  "NEG 1", "NEG AL, BL", "NEG BYTE PTR AX", "NEG WORD PTR AL",
  "NEG BYTE PTR [BX], AL", "NEG BYTE PTR [BX+CX]", "NEG BYTE PTR [AX]",
  "NEG BYTE PTR CS:[BX+SI+70000]", "NEG BYTE PTR [BX+BX]"
]) {
  test("NEG rejette une forme invalide · " + source, () => {
    assert.throws(() => api.assemble(source));
  });
  counts.invalid++;
}
for (const code of [[0xF6], [0xF6, 0x1E], [0xF7], [0xF7, 0x1E], [0xF7, 0x1E, 0x34]]) {
  test("NEG flux binaire tronqué · " + code.map(x => x.toString(16)).join(" "), () => {
    assert.throws(() => api.disassemble(code), /tronqué/i);
  });
  counts.invalid++;
}

console.log("NEG encodages : " + counts.encoding);
console.log("NEG désassemblage et extensions ModR/M : " + counts.decode);
console.log("NEG limites de déplacement : " + counts.displacement);
console.log("NEG validations/rejets : " + counts.invalid);
console.log("NEG FLAGS 8 bits exhaustifs : " + counts.flags8);
console.log("NEG FLAGS 16 bits frontières : " + counts.flags16);
console.log("NEG exécutions registres + mémoire source/binaire et segments : " + (memoryExecutionCases + counts.execution));
console.log("Audit NEG : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
