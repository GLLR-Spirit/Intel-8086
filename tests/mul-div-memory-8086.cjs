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
const injection = "\nglobalThis.__8086MemoryMulDivApi = {" +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n disassemble: function (bytes) { return disassembleBytes(bytes); }," +
  "\n execute: function (source) { return executeAll(source); }," +
  "\n executeBinary: function (bytes, cs, ip, state) { return executeBinary(bytes, cs, ip, state); }," +
  "\n prepare: function (source) { return prepare(source); }," +
  "\n tick: function () { return tick(); }," +
  "\n getState: function () { return JSON.parse(JSON.stringify(cpu)); }," +
  "\n isHalted: function () { return halted; }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 15000 });
const api = context.__8086MemoryMulDivApi;
assert.ok(api, "Memory MUL/IMUL/DIV/IDIV test API must exist");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.stack); }
}
function hex(values) {
  return values.map(x => x.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}
function modrm(mod, reg, rm) { return (mod << 6) | (reg << 3) | rm; }
function same(actual, expected, label) {
  assert.deepEqual(Array.from(actual), expected,
    label + " ; attendu " + hex(expected) + ", obtenu " + hex(Array.from(actual)));
}
function word(value) { return value.toString(16).toUpperCase().padStart(4, "0") + "h"; }
function byte(value) { return value.toString(16).toUpperCase().padStart(2, "0") + "h"; }

const forms = [
  { rm: 0, base: "BX+SI", defaultSegment: "DS" },
  { rm: 1, base: "BX+DI", defaultSegment: "DS" },
  { rm: 2, base: "BP+SI", defaultSegment: "SS" },
  { rm: 3, base: "BP+DI", defaultSegment: "SS" },
  { rm: 4, base: "SI", defaultSegment: "DS" },
  { rm: 5, base: "DI", defaultSegment: "DS" },
  { rm: 6, base: "BP", defaultSegment: "SS" },
  { rm: 7, base: "BX", defaultSegment: "DS" }
];

function addressingCase(form, displacement) {
  if (displacement === "none" && form.rm === 6) {
    return { expression: "[4660]", mod: 0, tail: [0x34, 0x12] };
  }
  if (displacement === "none") {
    return { expression: "[" + form.base + "]", mod: 0, tail: [] };
  }
  if (displacement === "disp8") {
    return { expression: "[" + form.base + "+5]", mod: 1, tail: [0x05] };
  }
  if (displacement === "disp16") {
    return { expression: "[" + form.base + "+256]", mod: 2, tail: [0x00, 0x01] };
  }
  throw new Error("Unknown displacement case");
}

const instructions = [
  { op: "MUL", ext: 4 },
  { op: "IMUL", ext: 5 },
  { op: "DIV", ext: 6 },
  { op: "IDIV", ext: 7 }
];

// ---------------------------------------------------------------------------
// A. Exact F6/F7 encodings for all eight EA forms and disp8/disp16/direct.
// ---------------------------------------------------------------------------
let encodingCases = 0;
for (const instruction of instructions) {
  for (const bits of [8, 16]) {
    const opcode = bits === 8 ? 0xF6 : 0xF7;
    const ptr = bits === 8 ? "BYTE PTR " : "WORD PTR ";
    for (const form of forms) {
      for (const displacement of ["none", "disp8", "disp16"]) {
        const item = addressingCase(form, displacement);
        const expected = [opcode, modrm(item.mod, instruction.ext, form.rm), ...item.tail];
        const source = instruction.op + " " + ptr + item.expression;
        test("Encodage mémoire " + source, () => {
          same(api.assemble(source).bytes, expected, source);
        });
        test("Désassemblage mémoire " + source, () => {
          const decoded = api.disassemble(expected);
          assert.equal(decoded.rows.length, 1);
          assert.deepEqual(Array.from(decoded.rows[0].bytes), expected);
          assert.equal(decoded.rows[0].instruction.split(" ")[0], instruction.op);
        });
        encodingCases += 2;
      }
    }
  }
}

// Signed and unsigned displacement boundaries for the F6/F7 memory forms.
const displacementBoundaries = [
  { expression: "[BX+SI-128]", mod: 1, tail: [0x80] },
  { expression: "[BX+SI+127]", mod: 1, tail: [0x7F] },
  { expression: "[BX+SI-32768]", mod: 2, tail: [0x00, 0x80] },
  { expression: "[BX+SI+32767]", mod: 2, tail: [0xFF, 0x7F] },
  { expression: "[BX+SI+65535]", mod: 2, tail: [0xFF, 0xFF] },
  { expression: "[65535]", mod: 0, rm: 6, tail: [0xFF, 0xFF] }
];
let displacementBoundaryCases = 0;
for (const instruction of instructions) {
  for (const bits of [8, 16]) {
    const opcode = bits === 8 ? 0xF6 : 0xF7;
    const ptr = bits === 8 ? "BYTE PTR " : "WORD PTR ";
    for (const item of displacementBoundaries) {
      const rm = item.rm === undefined ? 0 : item.rm;
      const expected = [opcode, modrm(item.mod, instruction.ext, rm), ...item.tail];
      const source = instruction.op + " " + ptr + item.expression;
      test("Limite déplacement F6/F7 " + source, () => {
        same(api.assemble(source).bytes, expected, source);
      });
      displacementBoundaryCases++;
    }
  }
}
for (const instruction of instructions) {
  test("Rejet déplacement inférieur à -32768 · " + instruction.op, () => {
    assert.throws(() => api.assemble(instruction.op + " BYTE PTR [BX-32769]"));
  });
  test("Rejet déplacement supérieur à 65535 · " + instruction.op, () => {
    assert.throws(() => api.assemble(instruction.op + " BYTE PTR [BX+65536]"));
  });
}

// BP used without an explicit displacement is encoded as mod=01, disp8=0;
// mod=00,r/m=110 is the direct disp16 form, never [BP].
for (const instruction of instructions) {
  for (const bits of [8, 16]) {
    const opcode = bits === 8 ? 0xF6 : 0xF7;
    const ptr = bits === 8 ? "BYTE PTR " : "WORD PTR ";
    const expected = [opcode, modrm(1, instruction.ext, 6), 0x00];
    test("BP seul avec déplacement nul · " + instruction.op + " " + bits, () => {
      same(api.assemble(instruction.op + " " + ptr + "[BP]").bytes, expected, "[BP]");
    });
    encodingCases++;
  }
}

// ---------------------------------------------------------------------------
// B. Segment prefixes: default DS/SS and all four explicit overrides.
// ---------------------------------------------------------------------------
const segmentCases = [
  { segment: "ES", expression: "[BX]", prefix: 0x26, rm: 7, mod: 0, tail: [] },
  { segment: "CS", expression: "[BP+SI]", prefix: 0x2E, rm: 2, mod: 0, tail: [] },
  { segment: "SS", expression: "[BX+DI]", prefix: 0x36, rm: 1, mod: 0, tail: [] },
  { segment: "DS", expression: "[BP]", prefix: 0x3E, rm: 6, mod: 1, tail: [0x00] }
];
let segmentCasesCount = 0;
for (const instruction of instructions) {
  for (const bits of [8, 16]) {
    const opcode = bits === 8 ? 0xF6 : 0xF7;
    const ptr = bits === 8 ? "BYTE PTR " : "WORD PTR ";
    for (const item of segmentCases) {
      const expected = [item.prefix, opcode, modrm(item.mod, instruction.ext, item.rm), ...item.tail];
      const source = instruction.op + " " + ptr + item.segment + ":" + item.expression;
      test("Override segment " + source, () => {
        same(api.assemble(source).bytes, expected, source);
      });
      segmentCasesCount++;
    }
  }
}

// ---------------------------------------------------------------------------
// C. Execute memory operands through source and emitted machine-code paths.
//    Each EA form is tested for all four instructions and both operand widths.
// ---------------------------------------------------------------------------
function executionVector(op, bits) {
  if (bits === 8 && op === "MUL") return { initialAX: 3, divisor: 7, ax: 21, dx: 0 };
  if (bits === 8 && op === "IMUL") return { initialAX: 0xFFFE, divisor: 3, ax: 0xFFFA, dx: 0 };
  if (bits === 8 && op === "DIV") return { initialAX: 0x0123, divisor: 7, ax: 0x0429, dx: 0 };
  if (bits === 8 && op === "IDIV") return { initialAX: 0xFF85, divisor: 7, ax: 0xFCEF, dx: 0 };
  if (bits === 16 && op === "MUL") return { initialAX: 0x1234, divisor: 2, ax: 0x2468, dx: 0 };
  if (bits === 16 && op === "IMUL") return { initialAX: 0xFFFE, divisor: 3, ax: 0xFFFA, dx: 0xFFFF };
  if (bits === 16 && op === "DIV") return { initialAX: 0x0000, initialDX: 1, divisor: 3, ax: 0x5555, dx: 1 };
  if (bits === 16 && op === "IDIV") return { initialAX: 0xFF9C, initialDX: 0xFFFF, divisor: 7, ax: 0xFFF2, dx: 0xFFFE };
  throw new Error("Missing execution vector " + op + " " + bits);
}

function sourceForExecution(op, bits, expression, segmentOverride) {
  const ptr = bits === 8 ? "BYTE PTR " : "WORD PTR ";
  const memory = ptr + (segmentOverride ? segmentOverride + ":" : "") + expression;
  const v = executionVector(op, bits);
  const lines = [
    "MOV AX, 1000h", "MOV DS, AX",
    "MOV AX, 2000h", "MOV SS, AX",
    "MOV BX, 0010h", "MOV BP, 0020h",
    "MOV SI, 0030h", "MOV DI, 0050h",
    "MOV " + memory + ", " + (bits === 8 ? byte(v.divisor) : word(v.divisor))
  ];
  if (v.initialDX !== undefined) lines.push("MOV DX, " + word(v.initialDX));
  lines.push("MOV AX, " + word(v.initialAX));
  lines.push(op + " " + memory, "HLT");
  return lines.join("\n");
}

let executionCases = 0;
for (const instruction of instructions) {
  for (const bits of [8, 16]) {
    for (const form of forms) {
      for (const displacement of ["none", "disp8", "disp16"]) {
        const address = addressingCase(form, displacement);
        const source = sourceForExecution(instruction.op, bits, address.expression, null);
        const label = instruction.op + " " + bits + "-bit " + address.expression;
        test("Exécution source mémoire · " + label, () => {
          const state = api.execute(source);
          assert.ok(!state.error, state.error || label);
          const expected = executionVector(instruction.op, bits);
          assert.equal(state.reg.AX, expected.ax, label + " AX");
          assert.equal(state.reg.DX, expected.dx, label + " DX");
        });
        test("Exécution binaire mémoire · " + label, () => {
          const assembled = api.assemble(source);
          const state = api.executeBinary(assembled.bytes, 0, 0);
          assert.ok(!state.error, state.error || label);
          const expected = executionVector(instruction.op, bits);
          assert.equal(state.reg.AX, expected.ax, label + " AX");
          assert.equal(state.reg.DX, expected.dx, label + " DX");
        });
        executionCases += 2;
      }
    }
  }
}

// Explicit segment overrides must select the overridden memory, not the
// default DS/SS segment. The source initializes the overridden location.
const runtimeOverrides = [
  { segment: "ES", expression: "[BX]", expectedPrefix: 0x26 },
  { segment: "CS", expression: "[BP+SI]", expectedPrefix: 0x2E },
  { segment: "SS", expression: "[BX+DI]", expectedPrefix: 0x36 },
  { segment: "DS", expression: "[BP]", expectedPrefix: 0x3E }
];
for (const item of runtimeOverrides) {
  const source = sourceForExecution("MUL", 8, item.expression, item.segment);
  test("Lecture mémoire avec override " + item.segment + ":" + item.expression, () => {
    const state = api.execute(source);
    assert.ok(!state.error, state.error || item.segment);
    assert.equal(state.reg.AX, 21);
    const assembled = api.assemble(source);
    assert.equal(assembled.bytes.includes(item.expectedPrefix), true,
      "Expected segment prefix " + item.expectedPrefix.toString(16));
  });
}

// ---------------------------------------------------------------------------
// D. Divide-error vector 00h when the divisor is in memory: zero and quotient
//    overflow, for DIV/IDIV and byte/word operands, source and binary paths.
// ---------------------------------------------------------------------------
function faultCase(op, bits, fault) {
  const ptr = bits === 8 ? "BYTE PTR " : "WORD PTR ";
  const memory = ptr + "[BP+SI+1]";
  let setup;
  if (fault === "zero") {
    setup = bits === 8
      ? ["MOV AX, 1234h", "MOV " + memory + ", 0"]
      : ["MOV DX, 0", "MOV AX, 1234h", "MOV " + memory + ", 0"];
  } else if (bits === 8 && op === "DIV") {
    setup = ["MOV AX, 0100h", "MOV " + memory + ", 1"];
  } else if (bits === 8 && op === "IDIV") {
    setup = ["MOV AX, 0080h", "MOV " + memory + ", 1"];
  } else if (bits === 16 && op === "DIV") {
    setup = ["MOV DX, 1", "MOV AX, 0", "MOV " + memory + ", 1"];
  } else {
    setup = ["MOV DX, 0", "MOV AX, 8000h", "MOV " + memory + ", 1"];
  }
  const expected = fault === "zero"
    ? { ax: 0x1234, dx: 0 }
    : bits === 8 && op === "DIV" ? { ax: 0x0100, dx: 0 }
    : bits === 8 && op === "IDIV" ? { ax: 0x0080, dx: 0 }
    : bits === 16 && op === "DIV" ? { ax: 0x0000, dx: 0x0001 }
    : { ax: 0x8000, dx: 0x0000 };
  return { expected, source: [
    "VECTOR 0, HANDLER",
    "MOV AX, 1000h", "MOV DS, AX",
    "MOV AX, 2000h", "MOV SS, AX",
    "MOV BP, 0020h", "MOV SI, 0030h",
    ...setup,
    op + " " + memory,
    "MOV DI, 0ABCDh",
    "HLT",
    "HANDLER:",
    "PUSHF",
    "POP CX",
    "MOV SI, 5678h",
    "IRET"
  ].join("\n") };
}

let faultCases = 0;
for (const op of ["DIV", "IDIV"]) {
  for (const bits of [8, 16]) {
    for (const fault of ["zero", "overflow"]) {
      const scenario = faultCase(op, bits, fault);
      const source = scenario.source;
      const label = op + " memory " + bits + "-bit " + fault;
      test("Erreur division source · " + label, () => {
        const state = api.execute(source);
        assert.ok(!state.error, state.error || label);
        assert.equal(state.reg.AX, scenario.expected.ax, "Fault must not commit quotient/remainder to AX");
        assert.equal(state.reg.DX, scenario.expected.dx, "Fault must not commit quotient/remainder to DX");
        assert.equal(state.reg.CX & 0x0300, 0, "IF/TF must be cleared in the handler");
        assert.equal(state.reg.SI, 0x5678, "Vector 00h handler must execute");
        assert.equal(state.reg.DI, 0xABCD, "IRET must resume after the faulting instruction");
        assert.equal(state.stack.length, 0, "IRET must consume the interrupt frame");
        assert.equal(state.reg.SP, 0xFFFE, "SP must be restored");
      });
      test("Erreur division binaire · " + label, () => {
        const assembled = api.assemble(source);
        const handler = assembled.symbols.HANDLER;
        assert.ok(Number.isInteger(handler), "HANDLER offset must be assembled");
        const ivt = {
          0: handler & 255, 1: (handler >> 8) & 255,
          2: 0x00, 3: 0x10
        };
        const state = api.executeBinary(assembled.bytes, 0x1000, 0, {
          flags: { IF: 1, TF: 1 }, mem: ivt
        });
        assert.ok(!state.error, state.error || label);
        assert.equal(state.reg.AX, scenario.expected.ax, "Fault must not commit quotient/remainder to AX");
        assert.equal(state.reg.DX, scenario.expected.dx, "Fault must not commit quotient/remainder to DX");
        assert.equal(state.reg.CX & 0x0300, 0, "IF/TF must be cleared in the handler");
        assert.equal(state.reg.SI, 0x5678, "IVT handler must execute");
        assert.equal(state.reg.DI, 0xABCD, "IRET must resume after the faulting instruction");
        assert.equal(state.stack.length, 0, "IRET must consume the interrupt frame");
        assert.equal(state.reg.SP, 0xFFFE, "SP must be restored");
        assert.equal(state.flags.IF, 1, "IRET must restore IF");
        assert.equal(state.flags.TF, 1, "IRET must restore TF");
      });
      faultCases += 2;
    }
  }
}

// Interactive stepper: one memory-based divide fault must also route through
// VECTOR 00h and return to the instruction following DIV.
test("Pas à pas interactif · DIV BYTE PTR mémoire déclenche INT 00h", () => {
  api.prepare(faultCase("DIV", 8, "zero").source);
  let steps = 0;
  while (!api.isHalted() && steps < 80) { api.tick(); steps++; }
  const state = api.getState();
  assert.ok(api.isHalted(), "Stepper must reach HLT");
  assert.equal(state.reg.SI, 0x5678, "Stepper must execute the divide-error handler");
  assert.equal(state.reg.DI, 0xABCD, "Stepper must resume after DIV");
  assert.equal(state.stack.length, 0, "Stepper IRET frame must be consumed");
});

// ---------------------------------------------------------------------------
// E. Signed IDIV quotient boundaries: the minimum negative quotient is valid
//    for both byte and word division. Test source and emitted-binary execution.
// ---------------------------------------------------------------------------
function verifyIdivBoundary(source, expectedAX, expectedDX, mnemonic, expectedOpcode) {
  const assembled = api.assemble(source);
  assert.ok(Array.from(assembled.bytes).some((_, i) =>
    assembled.bytes[i] === expectedOpcode[0] &&
    assembled.bytes[i + 1] === expectedOpcode[1]),
    mnemonic + " exact F6/F7 encoding");
  const decoded = api.disassemble(assembled.bytes);
  assert.ok(decoded.rows.some(row => row.instruction === mnemonic),
    mnemonic + " independent disassembly");
  const sourceState = api.execute(source);
  const binaryState = api.executeBinary(assembled.bytes, 0, 0);
  for (const [mode, state] of [["source", sourceState], ["binary", binaryState]]) {
    assert.ok(!state.error, mode + " " + mnemonic + ": " + (state.error || ""));
    assert.equal(state.reg.AX, expectedAX, mode + " AX quotient/remainder");
    assert.equal(state.reg.DX, expectedDX, mode + " DX");
  }
}

test("IDIV byte accepts the minimum quotient -128 in AL", () => {
  verifyIdivBoundary(
    ["MOV AX, 4000h", "MOV BL, 80h", "IDIV BL", "HLT"].join("\n"),
    0x0080, 0, "IDIV BL", [0xF6, 0xFB]
  );
});

test("IDIV word accepts the minimum quotient -32768 in AX", () => {
  verifyIdivBoundary(
    ["MOV DX, 4000h", "MOV AX, 0000h", "MOV BX, 8000h", "IDIV BX", "HLT"].join("\n"),
    0x8000, 0, "IDIV BX", [0xF7, 0xFB]
  );
});

test("IDIV byte still traps for quotient -129 below the minimum", () => {
  const source = ["MOV AX, 4080h", "MOV BL, 80h", "IDIV BL", "HLT"].join("\n");
  assert.match(api.execute(source).error || "", /dépassement de quotient/i);
  const bytes = api.assemble(source).bytes;
  assert.match(api.executeBinary(bytes, 0x1000, 0).error || "", /dépassement de quotient/i);
});

test("IDIV word still traps for quotient -32769 below the minimum", () => {
  const source = ["MOV DX, 4000h", "MOV AX, 8000h", "MOV BX, 8000h", "IDIV BX", "HLT"].join("\n");
  assert.match(api.execute(source).error || "", /dépassement de quotient/i);
  const bytes = api.assemble(source).bytes;
  assert.match(api.executeBinary(bytes, 0x1000, 0).error || "", /dépassement de quotient/i);
});

// ---------------------------------------------------------------------------
// E. Invalid extension /1 remains reserved for F6/F7 in memory and register
//    forms; /4..7 must retain their architectural operation names.
// ---------------------------------------------------------------------------
let extensionCases = 0;
for (const opcode of [0xF6, 0xF7]) {
  for (let ext = 0; ext < 8; ext++) {
    const bytes = [opcode, modrm(0, ext, 7), ...(ext === 0 ? (opcode === 0xF6 ? [0x00] : [0x00, 0x00]) : [])];
    test("F6/F7 memory extension /" + ext + " opcode " + opcode.toString(16), () => {
      const decoded = api.disassemble(bytes);
      assert.equal(decoded.rows.length, 1);
      if (ext === 1) assert.ok(decoded.rows[0].instruction.startsWith("DB "), decoded.rows[0].instruction);
      else assert.ok(decoded.rows[0].instruction.startsWith(
        ["TEST", "", "NOT", "NEG", "MUL", "IMUL", "DIV", "IDIV"][ext] + " "),
      decoded.rows[0].instruction);
    });
    extensionCases++;
  }
}

console.log("Encodages/désassemblages mémoire : " + encodingCases);
console.log("Limites de déplacement mémoire : " + displacementBoundaryCases + " ; rejets hors plage : 8");
console.log("Overrides de segment : " + segmentCasesCount);
console.log("Exécutions source/binaires : " + executionCases);
console.log("Erreurs de division mémoire : " + faultCases);
console.log("Bornes IDIV signées : 4 vecteurs source/binaire ; quotient minimum accepté, sous-dépassement rejeté.");
console.log("Extensions F6/F7 : " + extensionCases);
console.log("Audit mémoire MUL/IMUL/DIV/IDIV : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
