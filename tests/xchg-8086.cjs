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
const injection = "\nglobalThis.__8086XchgApi = {" +
  "\n assemble: source => assembleProgram(source)," +
  "\n execute: source => executeAll(source)," +
  "\n executeBinary: (bytes, cs, ip, initialState) => executeBinary(bytes, cs, ip, initialState)," +
  "\n disassemble: bytes => disassembleBytes(bytes)" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 30000 });
const api = context.__8086XchgApi;
assert.ok(api, "XCHG audit API must be exposed");

let passed = 0, failed = 0;
const totals = { register8: 0, register16: 0, memory: 0, segment: 0, flags: 0, invalid: 0, special: 0, binary: 0 };
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.stack); }
}
function modrm(mod, reg, rm) { return (mod << 6) | (reg << 3) | rm; }
function bytes(source) { return Array.from(api.assemble(source).bytes); }
function disassemble(code) {
  const result = api.disassemble(code);
  assert.equal(result.rows.length, 1, "exactly one instruction must decode");
  assert.deepEqual(Array.from(result.rows[0].bytes), code);
  return result.rows[0].instruction;
}
function runSource(source) {
  const state = api.execute(source);
  assert.ok(!state.error, state.error || "source execution failed");
  return state;
}
function runBinary(code, cs, ip, initialState) {
  const state = api.executeBinary(code, cs, ip, initialState);
  assert.ok(!state.error, state.error || "binary execution failed");
  assert.equal(state.execution.mode, "dynamic-binary");
  return state;
}
function physical(segment, offset) {
  return (((segment << 4) + (offset & 0xFFFF)) & 0xFFFFF);
}
const regs8 = ["AL", "CL", "DL", "BL", "AH", "CH", "DH", "BH"];
const regs16 = ["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"];
const aliases = {
  AL: ["AX", 0], CL: ["CX", 0], DL: ["DX", 0], BL: ["BX", 0],
  AH: ["AX", 8], CH: ["CX", 8], DH: ["DX", 8], BH: ["BX", 8]
};
const initial16 = { AX: 0x1122, CX: 0x3344, DX: 0x5566, BX: 0x7788, SP: 0x9000, BP: 0x1200, SI: 0x0010, DI: 0x0020 };
const flagPattern = { CF: 1, PF: 1, AF: 1, ZF: 1, SF: 1, TF: 1, IF: 1, DF: 1, OF: 1 };
const flagKeys = Object.keys(flagPattern);
function assertFlags(state, label) {
  for (const key of flagKeys) assert.equal(state.flags[key], flagPattern[key], label + " " + key);
}
function setSourceFlags() {
  // 0FD7h sets the nine represented status/control flags in this simulator.
  return ["MOV AX, 0FD7h", "PUSH AX", "POPF"].join("\n");
}
function initSourceRegs() {
  return Object.entries(initial16).map(([r, v]) => "MOV " + r + ", " + v.toString(16) + "h");
}
function setInitialBinary() {
  return { reg: { ...initial16, DS: 0x1000, ES: 0x2000, SS: 0x3000, CS: 0x5000 }, flags: { ...flagPattern } };
}
function expectedRegSwap(a, b, bits) {
  const state = { ...initial16 };
  if (bits === 16) {
    const t = state[a]; state[a] = state[b]; state[b] = t;
    return state;
  }
  const [pa, sa] = aliases[a], [pb, sb] = aliases[b];
  const va = (state[pa] >> sa) & 255, vb = (state[pb] >> sb) & 255;
  state[pa] = sa ? ((state[pa] & 255) | (vb << 8)) : ((state[pa] & 0xFF00) | vb);
  state[pb] = sb ? ((state[pb] & 255) | (va << 8)) : ((state[pb] & 0xFF00) | va);
  return state;
}
function assertRegSet(state, expected, label) {
  for (const [r, value] of Object.entries(expected)) assert.equal(state.reg[r], value, label + " " + r);
}

// A. Every 8-bit and 16-bit register pair, exact opcode/ModR/M and disassembly.
for (let r = 0; r < 8; r++) {
  for (let m = 0; m < 8; m++) {
    const c8 = [0x86, modrm(3, r, m)];
    const src8 = "XCHG " + regs8[m] + ", " + regs8[r];
    test("XCHG r8/r8 encodage " + src8, () => {
      assert.deepEqual(bytes(src8), c8);
      assert.match(disassemble(c8), /^XCHG /);
      totals.register8++;
    });
    const src16 = "XCHG " + regs16[m] + ", " + regs16[r];
    const c16 = (r === 0 || m === 0)
      ? [0x90 + (r === 0 ? m : r)]
      : [0x87, modrm(3, r, m)];
    test("XCHG r16/r16 encodage " + src16, () => {
      assert.deepEqual(bytes(src16), c16);
      assert.match(disassemble(c16), /^(XCHG|NOP)/);
      totals.register16++;
    });
  }
}

// B. The compact 90h–97h family and the AX,AX alias.
for (let r = 0; r < 8; r++) {
  const code = [0x90 + r];
  test("Opcode compact " + code[0].toString(16) + "h", () => {
    const source = "XCHG AX, " + regs16[r];
    assert.deepEqual(bytes(source), code);
    const decoded = disassemble(code);
    if (r === 0) assert.equal(decoded, "NOP");
    else assert.match(decoded, /^XCHG AX, /);
    totals.special++;
  });
}
test("XCHG AX, AX est encodé par 90h et reste un NOP architectural", () => {
  assert.deepEqual(bytes("XCHG AX, AX"), [0x90]);
  const state = runBinary([0x90, 0xF4], 0x5000, 0x0100, { reg: { AX: 0xA55A }, flags: { ...flagPattern } });
  assert.equal(state.reg.AX, 0xA55A);
  assertFlags(state, "90h / XCHG AX,AX");
  totals.special++;
  totals.binary++;
});

// C. Source execution: all 8-bit and 16-bit register combinations, with full FLAGS.
for (const [bits, regs] of [[8, regs8], [16, regs16]]) {
  for (const a of regs) for (const b of regs) {
    const expected = expectedRegSwap(a, b, bits);
    const source = [setSourceFlags(), ...initSourceRegs(), "XCHG " + a + ", " + b, "HLT"].join("\n");
    test("Source échange " + bits + " bits " + a + "/" + b, () => {
      const state = runSource(source);
      assertRegSet(state, expected, "source " + a + "/" + b);
      assertFlags(state, "source " + a + "/" + b);
      totals.flags++;
    });
  }
}

// D. All eight 8086 effective-address forms for byte and word operands.
// [BP] is encoded as mod=01, disp8=0; mod=00,r/m=110 is direct disp16.
const ea = ["BX+SI", "BX+DI", "BP+SI", "BP+DI", "SI", "DI", "BP", "BX"];
const eaCodes = [
  { rm: 0, offset: 0x7788 + 0x0010 },
  { rm: 1, offset: 0x7788 + 0x0020 },
  { rm: 2, offset: 0x1200 + 0x0010 },
  { rm: 3, offset: 0x1200 + 0x0020 },
  { rm: 4, offset: 0x0010 },
  { rm: 5, offset: 0x0020 },
  { rm: 6, offset: 0x1200, mod: 1, tail: [0] },
  { rm: 7, offset: 0x7788 }
];
for (const bits of [8, 16]) {
  for (let i = 0; i < ea.length; i++) {
    const expr = "[" + ea[i] + "]";
    const mod = eaCodes[i].mod || 0;
    const rm = eaCodes[i].rm;
    const tail = eaCodes[i].tail || [];
    const size = bits === 8 ? "BYTE" : "WORD";
    const opcode = bits === 8 ? 0x86 : 0x87;
    const code = [opcode, modrm(mod, 1, rm), ...tail];
    const value = bits === 8 ? 0x5A : 0xA55A;
    const source = [
      setSourceFlags(), ...initSourceRegs(),
      "MOV " + (bits === 8 ? "AL" : "AX") + ", " + (bits === 8 ? "0C3h" : "0C33h"),
      "MOV " + size + " PTR " + expr + ", " + (bits === 8 ? "5Ah" : "A55Ah"),
      "XCHG " + (bits === 8 ? "AL" : "AX") + ", " + size + " PTR " + expr,
      "HLT"
    ].join("\n");
    test("Encodage XCHG mémoire " + bits + " bits " + expr, () => {
      assert.deepEqual(bytes("XCHG " + (bits === 8 ? "AL" : "AX") + ", " + size + " PTR " + expr), code);
      assert.match(disassemble(code), /^XCHG /);
      totals.memory++;
    });
    test("Source XCHG mémoire " + bits + " bits " + expr, () => {
      const state = runSource(source);
      assert.equal(bits === 8 ? state.reg.AX & 255 : state.reg.AX, value);
      const address = eaCodes[i].offset & 0xFFFF;
      assert.equal(state.mem[address], bits === 8 ? 0xC3 : 0x5A);
      if (bits === 16) assert.equal(state.mem[(address + 1) & 0xFFFF], 0xA5);
      assertFlags(state, "mémoire source " + expr);
      totals.flags++;
    });
  }
}

// E. Binary execution of each effective-address form, both widths, DS/SS defaulting.
for (const bits of [8, 16]) {
  for (let i = 0; i < ea.length; i++) {
    const rm = eaCodes[i].rm, mod = eaCodes[i].mod || 0, tail = eaCodes[i].tail || [];
    const regField = 1; // CX for word; CL for byte
    const code = [bits === 8 ? 0x86 : 0x87, modrm(mod, regField, rm), ...tail, 0xF4];
    const offset = eaCodes[i].offset & 0xFFFF;
    const seg = i === 2 || i === 3 || i === 6 ? 0x3000 : 0x1000;
    const initial = setInitialBinary();
    initial.reg.CX = bits === 8 ? 0x00C3 : 0xC33C;
    const value = bits === 8 ? 0x5A : 0xA55A;
    initial.mem = {
      [physical(seg, offset)]: value & 255,
      ...(bits === 16 ? { [physical(seg, (offset + 1) & 0xFFFF)]: value >> 8 } : {})
    };
    test("Binaire XCHG mémoire " + bits + " bits " + ea[i], () => {
      const state = runBinary(code, 0x5000, 0x0100, initial);
      assert.equal(bits === 8 ? state.reg.CX & 255 : state.reg.CX, value);
      assert.equal(state.mem[physical(seg, offset)], bits === 8 ? 0xC3 : 0x3C);
      if (bits === 16) assert.equal(state.mem[physical(seg, (offset + 1) & 0xFFFF)], 0xC3);
      assertFlags(state, "binaire mémoire " + ea[i]);
      totals.binary++;
      totals.flags++;
    });
  }
}

// F. Direct disp16, disp8/disp16 boundaries, and segment override prefixes.
const segmentVectors = [
  { name: "DS", prefix: 0x3E, seg: 0x1000 },
  { name: "ES", prefix: 0x26, seg: 0x2000 },
  { name: "SS", prefix: 0x36, seg: 0x3000 },
  { name: "CS", prefix: 0x2E, seg: 0x5000 }
];
for (const item of segmentVectors) {
  const code = [item.prefix, 0x87, modrm(0, 1, 6), 0x00, 0x02, 0xF4];
  test("Préfixe segment " + item.name + " encodage/désassemblage", () => {
    const source = "XCHG CX, WORD PTR " + item.name + ":[0200h]";
    assert.deepEqual(bytes(source), code.slice(0, 5));
    assert.match(disassemble(code.slice(0, 5)), new RegExp("^" + item.name + ": XCHG "));
    totals.segment++;
  });
  test("Préfixe segment " + item.name + " exécution binaire", () => {
    const initial = setInitialBinary();
    initial.reg.CX = 0x1234;
    initial.mem = {
      [physical(item.seg, 0x0200)]: 0xCD,
      [physical(item.seg, 0x0201)]: 0xAB
    };
    const state = runBinary(code, 0x5000, 0x0100, initial);
    assert.equal(state.reg.CX, 0xABCD);
    assert.equal(state.mem[physical(item.seg, 0x0200)], 0x34);
    assert.equal(state.mem[physical(item.seg, 0x0201)], 0x12);
    assertFlags(state, "préfixe " + item.name);
    totals.segment++;
    totals.binary++;
    totals.flags++;
  });
}

// G. Source path for explicit overrides; default DS and default SS are checked separately.
for (const item of segmentVectors) {
  const source = [
    setSourceFlags(),
    "MOV AX, 1000h", "MOV DS, AX",
    "MOV AX, 2000h", "MOV ES, AX",
    "MOV AX, 3000h", "MOV SS, AX",
    "MOV CX, 1234h",
    "MOV WORD PTR " + item.name + ":[0200h], 0ABCDh",
    "XCHG CX, WORD PTR " + item.name + ":[0200h]",
    "HLT"
  ].join("\n");
  test("Source préfixe segment " + item.name, () => {
    const state = runSource(source);
    assert.equal(state.reg.CX, 0xABCD);
    assert.equal(state.mem[physical(item.seg, 0x0200)], 0x34);
    assert.equal(state.mem[physical(item.seg, 0x0201)], 0x12);
    assertFlags(state, "source override " + item.name);
    totals.segment++;
    totals.flags++;
  });
}

// H. Architectural constraints: memory-memory, immediate, segment registers, size mismatch.
for (const invalid of [
  "XCHG WORD PTR [BX], WORD PTR [SI]",
  "XCHG AX, 1234h",
  "XCHG DS, AX",
  "XCHG AX, DS",
  "XCHG AL, BX",
  "XCHG BYTE PTR [BX], CX",
  "XCHG WORD PTR [BX], AL",
  "XCHG CS, DS"
]) {
  test("Forme interdite rejetée : " + invalid, () => {
    assert.throws(() => api.assemble(invalid));
    const state = api.execute(invalid + "\nHLT");
    assert.ok(state.error, invalid + " must fail source validation");
    totals.invalid++;
  });
}

// I. Raw ModR/M direction and lock prefix acceptance are tested separately from hardware atomicity.
test("XCHG r/m16,r16 et XCHG r/m8,r8 décodent leurs deux sens", () => {
  assert.match(disassemble([0x87, modrm(3, 2, 1)]), /^XCHG /);
  assert.match(disassemble([0x86, modrm(3, 6, 7)]), /^XCHG /);
  totals.special++;
});
test("LOCK XCHG mémoire assemble avec préfixe F0h", () => {
  assert.deepEqual(bytes("LOCK XCHG WORD PTR [BX], AX"), [0xF0, 0x87, modrm(0, 0, 7)]);
  totals.special++;
});

// J. Source and binary FLAGS preservation on a register-register exchange.
test("Source XCHG conserve CF PF AF ZF SF TF IF DF OF", () => {
  const state = runSource([setSourceFlags(), "MOV AX, 1234h", "MOV BX, 5678h", "XCHG AX, BX", "HLT"].join("\n"));
  assertFlags(state, "FLAGS source");
  totals.flags++;
});
test("Binaire XCHG conserve CF PF AF ZF SF TF IF DF OF", () => {
  const state = runBinary([0x87, modrm(3, 3, 0), 0xF4], 0x5000, 0x0100, {
    reg: { AX: 0x1234, BX: 0x5678 }, flags: { ...flagPattern }
  });
  assert.equal(state.reg.AX, 0x5678);
  assert.equal(state.reg.BX, 0x1234);
  assertFlags(state, "FLAGS binaire");
  totals.flags++;
  totals.binary++;
});

console.log("XCHG paires registres 8 bits : " + totals.register8);
console.log("XCHG paires registres 16 bits : " + totals.register16);
console.log("XCHG formes mémoire : " + totals.memory);
console.log("XCHG préfixes de segment : " + totals.segment);
console.log("XCHG préservation FLAGS : " + totals.flags);
console.log("XCHG formes invalides : " + totals.invalid);
console.log("XCHG cas particuliers : " + totals.special);
console.log("XCHG exécutions binaires : " + totals.binary);
console.log("Audit XCHG : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
