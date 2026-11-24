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
const injection = "\nglobalThis.__8086DifferentialApi = {" +
  "\n assemble: source => assembleProgram(source)," +
  "\n execute: source => executeAll(source)," +
  "\n executeBinary: (bytes, cs, ip) => executeBinary(bytes, cs, ip)," +
  "\n disassemble: bytes => disassembleBytes(bytes)" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 30000 });
const api = context.__8086DifferentialApi;
assert.ok(api, "Differential test API must be exposed");

let passed = 0, failed = 0;
const categories = { arithmetic: 0, logic: 0, registers: 0, memory: 0, stack: 0, invalid: 0, iret: 0 };
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.message); }
}
function runSource(source) {
  const state = api.execute(source);
  assert.ok(!state.error, state.error || "source execution failed");
  return state;
}
function runBinary(source, cs = 0, ip = 0) {
  const assembled = api.assemble(source);
  const state = api.executeBinary(Array.from(assembled.bytes), cs, ip);
  assert.ok(!state.error, state.error || "binary execution failed");
  assert.equal(state.execution.mode, "dynamic-binary");
  return { assembled, state };
}
function compareSourceBinary(source, memoryAddresses = []) {
  const sourceState = runSource(source);
  const { assembled, state: binaryState } = runBinary(source);
  assert.equal(sourceState.execution.mode, "binary-offset", "source must use the binary-offset execution path");
  for (const register of Object.keys(sourceState.reg)) {
    assert.equal(binaryState.reg[register], sourceState.reg[register], "register " + register);
  }
  for (const flag of Object.keys(sourceState.flags)) {
    assert.equal(binaryState.flags[flag], sourceState.flags[flag], "flag " + flag);
  }
  assert.equal(binaryState.steps, sourceState.steps, "instruction count");
  assert.equal(binaryState.output, sourceState.output, "program output");
  assert.deepEqual(JSON.parse(JSON.stringify(binaryState.stack)), JSON.parse(JSON.stringify(sourceState.stack)), "stack metadata");
  for (const address of memoryAddresses) {
    assert.equal(binaryState.mem[address], sourceState.mem[address], "memory[" + address.toString(16) + "]");
  }
  return { sourceState, binaryState, assembled };
}
function parity8(value) {
  let bits = 0;
  for (let i = 0; i < 8; i++) bits += (value >> i) & 1;
  return bits % 2 === 0 ? 1 : 0;
}
function addFlags(a, b, carry, bits) {
  const mask = bits === 8 ? 255 : 65535;
  const sign = bits === 8 ? 128 : 32768;
  const raw = a + b + carry;
  const result = raw & mask;
  const sa = a & sign ? a - (mask + 1) : a;
  const sb = b & sign ? b - (mask + 1) : b;
  const signed = sa + sb + carry;
  return {
    CF: raw > mask ? 1 : 0,
    ZF: result === 0 ? 1 : 0,
    SF: result & sign ? 1 : 0,
    OF: signed < (bits === 8 ? -128 : -32768) || signed > (bits === 8 ? 127 : 32767) ? 1 : 0,
    PF: parity8(result),
    AF: ((a & 15) + (b & 15) + carry) > 15 ? 1 : 0
  };
}
function subFlags(a, b, borrow, bits) {
  const mask = bits === 8 ? 255 : 65535;
  const sign = bits === 8 ? 128 : 32768;
  const raw = a - b - borrow;
  const result = raw & mask;
  const sa = a & sign ? a - (mask + 1) : a;
  const sb = b & sign ? b - (mask + 1) : b;
  const signed = sa - sb - borrow;
  return {
    CF: raw < 0 ? 1 : 0,
    ZF: result === 0 ? 1 : 0,
    SF: result & sign ? 1 : 0,
    OF: signed < (bits === 8 ? -128 : -32768) || signed > (bits === 8 ? 127 : 32767) ? 1 : 0,
    PF: parity8(result),
    AF: (a & 15) < ((b & 15) + borrow) ? 1 : 0
  };
}

// Independent arithmetic oracles are intentionally separate from the simulator.
for (const vector of [
  { name: "ADD byte carry and auxiliary carry", source: "MOV AL, 0FFh\nMOV BL, 1\nADD AL, BL\nHLT", a: 255, b: 1, bits: 8, kind: "add", result: 0, flags: {CF:1,ZF:1,SF:0,OF:0,PF:1,AF:1} },
  { name: "ADD word signed overflow", source: "MOV AX, 7FFFh\nMOV BX, 1\nADD AX, BX\nHLT", a: 0x7fff, b: 1, bits: 16, kind: "add", result: 0x8000, flags: {CF:0,ZF:0,SF:1,OF:1,PF:1,AF:1} },
  { name: "ADC consumes carry-in", source: "MOV AX, 0FFFFh\nMOV BX, 0\nSTC\nADC AX, BX\nHLT", a: 0xffff, b: 0, carry: 1, bits: 16, kind: "add", result: 0, flags: {CF:1,ZF:1,SF:0,OF:0,PF:1,AF:1} },
  { name: "SUB byte borrow", source: "MOV AL, 0\nMOV BL, 1\nSUB AL, BL\nHLT", a: 0, b: 1, bits: 8, kind: "sub", result: 255, flags: {CF:1,ZF:0,SF:1,OF:0,PF:1,AF:1} },
  { name: "SBB consumes borrow-in", source: "MOV AX, 0\nMOV BX, 0\nSTC\nSBB AX, BX\nHLT", a: 0, b: 0, carry: 1, bits: 16, kind: "sub", result: 0xffff, flags: {CF:1,ZF:0,SF:1,OF:0,PF:1,AF:1} }
]) {
  test(vector.name + " — source/binaire et oracle FLAGS", () => {
    const { sourceState, binaryState } = compareSourceBinary(vector.source);
    const expected = vector.kind === "add"
      ? addFlags(vector.a, vector.b, vector.carry || 0, vector.bits)
      : subFlags(vector.a, vector.b, vector.carry || 0, vector.bits);
    assert.equal(vector.bits === 8 ? binaryState.reg.AX & 255 : binaryState.reg.AX, vector.result);
    for (const [flag, value] of Object.entries(expected)) {
      assert.equal(binaryState.flags[flag], value, "independent " + flag);
      assert.equal(sourceState.flags[flag], value, "source independent " + flag);
    }
    assert.deepEqual(vector.flags, expected);
  });
  categories.arithmetic++;
}

for (const [name, source, result, flags] of [
  ["AND zero", "MOV AL, 0F0h\nMOV BL, 0Fh\nAND AL, BL\nHLT", 0, {CF:0,OF:0,ZF:1,SF:0,PF:1}],
  ["OR sign", "MOV AL, 80h\nMOV BL, 1\nOR AL, BL\nHLT", 0x81, {CF:0,OF:0,ZF:0,SF:1,PF:1}],
  ["XOR parity", "MOV AL, 0FFh\nMOV BL, 0F0h\nXOR AL, BL\nHLT", 0x0f, {CF:0,OF:0,ZF:0,SF:0,PF:1}],
  ["TEST does not write destination", "MOV AL, 0F0h\nMOV BL, 0Fh\nTEST AL, BL\nHLT", 0xf0, {CF:0,OF:0,ZF:1,SF:0,PF:1}]
]) {
  test(name + " — source/binaire et FLAGS logiques", () => {
    const { binaryState } = compareSourceBinary(source);
    assert.equal(binaryState.reg.AX & 255, result);
    for (const [flag, value] of Object.entries(flags)) assert.equal(binaryState.flags[flag], value, flag);
  });
  categories.logic++;
}

test("INC et DEC préservent CF dans les deux moteurs", () => {
  const { binaryState } = compareSourceBinary("MOV AX, 0FFFFh\nSTC\nINC AX\nDEC AX\nHLT");
  assert.equal(binaryState.reg.AX, 0xffff);
  assert.equal(binaryState.flags.CF, 1);
});
categories.registers++;

test("NOT préserve FLAGS et NEG calcule CF/OF", () => {
  const { binaryState } = compareSourceBinary("MOV AX, 8000h\nSTC\nNOT AX\nNEG AX\nHLT");
  assert.equal(binaryState.reg.AX, 0x8000);
  assert.equal(binaryState.flags.CF, 1);
  assert.equal(binaryState.flags.OF, 1);
});
categories.registers++;

test("écritures partielles AL/AH préservent l'autre octet", () => {
  const { binaryState } = compareSourceBinary("MOV AX, 1234h\nMOV AL, 0A5h\nMOV AH, 5Ah\nHLT");
  assert.equal(binaryState.reg.AX, 0x5aa5);
});
categories.registers++;

test("XCHG échange les deux opérandes sans modifier les FLAGS", () => {
  const { binaryState } = compareSourceBinary("MOV AX, 1234h\nMOV BX, 0ABCDh\nSTC\nXCHG AX, BX\nHLT");
  assert.equal(binaryState.reg.AX, 0xabcd);
  assert.equal(binaryState.reg.BX, 0x1234);
  assert.equal(binaryState.flags.CF, 1);
});
categories.registers++;

test("opérandes mémoire DS par défaut, adressage BX+SI+disp et accès mot little-endian", () => {
  const source = [
    "MOV AX, 1000h", "MOV DS, AX", "MOV BX, 0010h", "MOV SI, 0002h",
    "MOV WORD PTR [BX+SI+4], 1234h", "MOV DX, WORD PTR [BX+SI+4]", "HLT"
  ].join("\n");
  const { binaryState } = compareSourceBinary(source, [0x10016, 0x10017]);
  assert.equal(binaryState.reg.DX, 0x1234);
  assert.equal(binaryState.mem[0x10016], 0x34);
  assert.equal(binaryState.mem[0x10017], 0x12);
});
categories.memory++;

test("préfixe ES sélectionne le segment de lecture et d'écriture", () => {
  const source = [
    "MOV AX, 2000h", "MOV ES, AX", "MOV AX, 5A3Ch",
    "MOV WORD PTR ES:[0010h], 5A3Ch", "MOV BX, WORD PTR ES:[0010h]", "HLT"
  ].join("\n");
  const { binaryState } = compareSourceBinary(source, [0x20010, 0x20011]);
  assert.equal(binaryState.reg.BX, 0x5a3c);
  assert.equal(binaryState.mem[0x20010], 0x3c);
  assert.equal(binaryState.mem[0x20011], 0x5a);
});
categories.memory++;

test("opérande mémoire octet et déplacement négatif", () => {
  const source = [
    "MOV AX, 1000h", "MOV DS, AX", "MOV DI, 0020h",
    "MOV BYTE PTR [DI-1], 0A5h", "MOV BL, BYTE PTR [DI-1]", "HLT"
  ].join("\n");
  const { binaryState } = compareSourceBinary(source, [0x1001f]);
  assert.equal(binaryState.reg.BX & 255, 0xa5);
  assert.equal(binaryState.mem[0x1001f], 0xa5);
});
categories.memory++;

test("CALL near direct et RET restaurent IP, SP et la pile", () => {
  const { binaryState } = compareSourceBinary("CALL SUB\nHLT\nSUB: MOV AX, 1234h\nRET");
  assert.equal(binaryState.reg.AX, 0x1234);
  assert.equal(binaryState.reg.SP, 0xfffe);
  assert.equal(binaryState.stack.length, 0);
});
categories.stack++;

test("CALL near indirect registre et RET restaurent l'adresse de retour", () => {
  const source = "MOV AX, 0007h\nCALL AX\nHLT\nNOP\nRET";
  const { binaryState } = compareSourceBinary(source);
  assert.equal(binaryState.reg.IP, 5);
  assert.equal(binaryState.stack.length, 0);
});
categories.stack++;

test("CALL FAR indirect mémoire et RETF restaurent CS:IP", () => {
  const source = [
    "MOV AX, 0000h", "MOV DS, AX",
    "MOV WORD PTR [0100h], 0009h", "MOV WORD PTR [0102h], 0000h",
    "CALL FAR PTR [0100h]", "HLT", "NOP", "NOP", "NOP", "NOP", "RETF"
  ].join("\n");
  const { binaryState } = compareSourceBinary(source);
  assert.equal(binaryState.reg.CS, 0);
  assert.equal(binaryState.stack.length, 0);
  assert.equal(binaryState.reg.SP, 0xfffe);
});
categories.stack++;

test("RET et RETF rejettent un cadre de pile incompatible", () => {
  const near = api.execute("PUSH AX\nRET");
  const far = api.execute("PUSH AX\nRETF");
  assert.match(near.error, /type de retour incompatible/i);
  assert.match(far.error, /type de retour incompatible/i);
});
categories.invalid++;

test("RET avec ajustement impair reste refusé à l'exécution, bien que décodable", () => {
  const decoded = api.disassemble([0xc2, 0x01, 0x00]);
  assert.equal(decoded.rows[0].instruction, "RET 01h");
  const result = api.execute("CALL SUB\nHLT\nSUB: RET 1");
  assert.match(result.error, /ajustement impair non pris en charge/i);
});
categories.invalid++;

test("IRET restaure FLAGS, CS et IP depuis un cadre VECTOR dans le moteur source", () => {
  const source = [
    "VECTOR 21h, HANDLER",
    "STC", "MOV AX, 0", "INT 21h", "HLT",
    "HANDLER: CLC", "IRET"
  ].join("\n");
  const state = runSource(source);
  assert.equal(state.flags.CF, 1, "IRET must restore the pre-interrupt carry flag");
  assert.equal(state.reg.CS, 0);
  assert.equal(state.stack.length, 0);
  assert.equal(state.reg.SP, 0xfffe);
});
categories.iret++;

test("IRET en binaire sans cadre d'interruption est refusé explicitement", () => {
  const result = api.executeBinary([0xcf], 0, 0);
  assert.ok(result.error);
  assert.match(result.error, /IRET impossible|Pile vide|pile/i);
});
categories.iret++;

test("extensions réservées F6/F7, FF, C6/C7 et 8F ne deviennent pas des instructions exécutables", () => {
  for (const bytes of [
    [0xf6,0xc8], [0xf7,0xc8,0,0], [0xff,0xf8], [0xc6,0xc8,0],
    [0xc7,0xc8,0,0], [0x8f,0xc8]
  ]) {
    const decoded = api.disassemble(bytes);
    assert.match(decoded.rows[0].instruction, /^DB /);
    const executed = api.executeBinary(bytes.concat([0xf4]), 0, 0);
    assert.ok(executed.error, bytes.map(x => x.toString(16)).join(" "));
    assert.match(executed.error, /non pris en charge/i);
  }
});
categories.invalid++;

test("préfixes de segment répétés sont refusés au lieu d'être interprétés approximativement", () => {
  const result = api.executeBinary([0x2e,0x3e,0xa1,0x10,0,0xf4], 0, 0);
  assert.match(result.error, /répétés non pris en charge/i);
});
categories.invalid++;

console.log("Audit différentiel arithmétique : " + categories.arithmetic + " vecteurs.");
console.log("Logique et TEST : " + categories.logic + " vecteurs.");
console.log("Registres : " + categories.registers + " vecteurs.");
console.log("Mémoire et préfixes : " + categories.memory + " vecteurs.");
console.log("Pile et transferts : " + categories.stack + " vecteurs.");
console.log("IRET : " + categories.iret + " vecteurs.");
console.log("Encodages invalides / limites : " + categories.invalid + " vecteurs.");
console.log("Résultat audit différentiel : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
