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
  "\n executeBinary: (bytes, cs, ip, initialState) => executeBinary(bytes, cs, ip, initialState)," +
  "\n disassemble: bytes => disassembleBytes(bytes),\n arithmeticProbe: (a,b,kind,bits,carry) => { var old=cpu,state=fresh(); cpu=state; try { state.flags.CF=carry; var result=arithmetic(a,b,kind,bits); return {result,flags:Object.assign({},state.flags)}; } finally { cpu=old; } }" +
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
  const { binaryState } = compareSourceBinary("MOV AX, 7FFFh\nSTC\nNOT AX\nNEG AX\nHLT");
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
  assert.equal(binaryState.reg.IP, 6);
  assert.equal(binaryState.stack.length, 0);
});
categories.stack++;

test("CALL FAR indirect mémoire et RETF restaurent CS:IP", () => {
  const source = [
    "MOV AX, 0000h", "MOV DS, AX",
    "MOV WORD PTR [0100h], 001Ah", "MOV WORD PTR [0102h], 0000h",
    "CALL FAR PTR [0100h]", "HLT", "NOP", "NOP", "NOP", "NOP", "RETF"
  ].join("\n");
  const { binaryState } = compareSourceBinary(source);
  assert.equal(binaryState.reg.CS, 0);
  assert.equal(binaryState.stack.length, 0);
  assert.equal(binaryState.reg.SP, 0xfffe);
});
categories.stack++;


test("branchements conditionnels et LOOP gardent le même flot de contrôle", () => {
  const conditional = [
    "MOV AX, 0", "CMP AX, 0", "JE TAKEN", "MOV BX, 1",
    "JMP END", "TAKEN: MOV BX, 2", "END: HLT"
  ].join("\n");
  const c = compareSourceBinary(conditional);
  assert.equal(c.binaryState.reg.BX, 2);
  const loop = compareSourceBinary("MOV CX, 4\nMOV AX, 0\nAGAIN: INC AX\nLOOP AGAIN\nHLT");
  assert.equal(loop.binaryState.reg.AX, 4);
  assert.equal(loop.binaryState.reg.CX, 0);
});
categories.stack++;

test("JMP near indirect par registre garde la même destination", () => {
  const source = "MOV AX, 0007h\nJMP AX\nHLT\nNOP\nMOV BX, 1234h\nHLT";
  const { binaryState } = compareSourceBinary(source);
  assert.equal(binaryState.reg.BX, 0x1234);
});
categories.stack++;

test("adressage BP utilise SS par défaut", () => {
  const source = [
    "MOV AX, 3000h", "MOV SS, AX", "MOV BP, 0020h",
    "MOV WORD PTR [BP], 0BEEfh", "MOV DX, WORD PTR [BP]", "HLT"
  ].join("\n");
  const { binaryState } = compareSourceBinary(source, [0x30020, 0x30021]);
  assert.equal(binaryState.reg.DX, 0xbeef);
  assert.equal(binaryState.mem[0x30020], 0xef);
  assert.equal(binaryState.mem[0x30021], 0xbe);
});
categories.memory++;

test("préfixe CS permet un accès mémoire distinct au segment de code", () => {
  const source = [
    "MOV WORD PTR CS:[0200h], 0A55Ah",
    "MOV AX, WORD PTR CS:[0200h]",
    "HLT"
  ].join("\n");
  const { binaryState } = compareSourceBinary(source, [0x200, 0x201]);
  assert.equal(binaryState.reg.AX, 0xa55a);
  assert.equal(binaryState.mem[0x200], 0x5a);
  assert.equal(binaryState.mem[0x201], 0xa5);
});
categories.memory++;

test("RET et RETF rejettent un cadre de pile incompatible", () => {
  const near = api.execute("PUSH AX\nRET");
  const far = api.execute("PUSH AX\nRETF");
  assert.match(near.error, /type de retour incompatible/i);
  assert.match(far.error, /type de retour incompatible/i);
});
categories.invalid++;

test("RET avec ajustement impair reste refusé à l'exécution, bien que décodable", () => {
  const decoded = api.disassemble([0xc2, 0x01, 0x00]);
  assert.equal(decoded.rows[0].instruction, "RET 0001h");
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

test("IRET binaire lit un cadre brut en mémoire, restaure CS:IP et boucle SP", () => {
  const ss = 0x1000, sp = 0xfffc, flagsWord = 0x0fd5;
  const physical = offset => ((ss << 4) + offset) & 0xfffff;
  const putWord = (mem, offset, value) => {
    mem[physical(offset)] = value & 255;
    mem[physical((offset + 1) & 65535)] = (value >> 8) & 255;
  };
  const mem = {};
  putWord(mem, 0xfffc, 0x0011); // IP au sommet
  putWord(mem, 0xfffe, 0x00ff); // CS
  putWord(mem, 0x0000, flagsWord); // FLAGS après bouclage de SP
  const state = api.executeBinary([0xcf, 0xf4], 0x0100, 0, {
    reg: { SS: ss, SP: sp },
    mem
  });
  assert.ok(!state.error, state.error || "binary IRET failed");
  assert.equal(state.reg.CS, 0x00ff);
  assert.equal(state.reg.IP, 0x0012);
  assert.equal(state.reg.SP, 0x0002);
  assert.equal(state.stack.length, 0);
  for (const flag of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"]) assert.equal(state.flags[flag], 1, flag);
});
categories.iret++;

test("INT binaire consulte l’IVT, empile FLAGS/CS/IP et revient par IRET", () => {
  const mem = {
    128:0x10, 129:0x00, 130:0x00, 131:0x01,
    4112:0xb0, 4113:0x2a, 4114:0xcf
  };
  const state=api.executeBinary([0xcd,0x20,0xf4],0x0100,0,{
    reg:{SS:0x2000,SP:0xfffe},
    flags:{CF:1,IF:1,TF:1,DF:1},
    mem
  });
  assert.ok(!state.error,state.error||"INT/IRET binary path failed");
  assert.equal(state.reg.AX&255,0x2a);
  assert.equal(state.reg.CS,0x0100);
  assert.equal(state.reg.IP,3);
  assert.equal(state.reg.SP,0xfffe);
  assert.equal(state.stack.length,0);
  assert.equal(state.flags.CF,1);
  assert.equal(state.flags.IF,1);
  assert.equal(state.flags.TF,1);
  assert.equal(state.flags.DF,1);
});
categories.iret++;

test("INT binaire refuse une entrée IVT absente ou tronquée", () => {
  for(const mem of [{},{128:0x10,129:0x00,130:0x00}]){
    const state=api.executeBinary([0xcd,0x20,0xf4],0,0,{mem});
    assert.ok(state.error);
    assert.match(state.error,/IVT non initialisée ou incomplète/i);
  }
});
categories.invalid++;

test("état initial binaire refuse les registres, FLAGS, octets et cadres invalides", () => {
  for (const seed of [
    { reg: { BAD: 1 } },
    { flags: { CF: 2 } },
    { mem: { "1048576": 0 } },
    { mem: { "10": 256 } },
    { stack: [{ value: 1, kind: "bad", address: 0x10000, segment: 0 }] },
    { unknown: true }
  ]) {
    const state = api.executeBinary([0xf4], 0, 0, seed);
    assert.ok(state.error, JSON.stringify(seed));
  }
});
categories.invalid++;

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

test("vecteurs binaires bruts ALU 8 bits comparés à l’oracle indépendant", () => {
  const values = [0,1,2,7,8,15,16,31,63,64,0x7f,0x80,0x81,0xfe,0xff];
  const operations = [
    { kind:"ADD", opcode:0x00, carries:[0] },
    { kind:"ADC", opcode:0x10, carries:[0,1] },
    { kind:"SBB", opcode:0x18, carries:[0,1] },
    { kind:"SUB", opcode:0x28, carries:[0] }
  ];
  let checked = 0;
  for (const op of operations) for (const carry of op.carries)
    for (const a of values) for (const b of values) {
      const bytes = [0xb0,a,0xb3,b,carry?0xf9:0xf8,op.opcode,0xd8,0xf4];
      const state = api.executeBinary(bytes,0,0);
      assert.ok(!state.error,state.error||op.kind+" binary execution");
      const expected = (op.kind==="ADD"||op.kind==="ADC")
        ? addFlags(a,b,carry,8) : subFlags(a,b,carry,8);
      const raw = (op.kind==="ADD"||op.kind==="ADC") ? a+b+carry : a-b-carry;
      assert.equal(state.reg.AX&255,raw&255,op.kind+" result");
      for (const [flag,value] of Object.entries(expected)) assert.equal(state.flags[flag],value,op.kind+" "+flag);
      assert.equal(state.steps,5);
      checked++;
    }
  assert.equal(checked,1350);
});
categories.arithmetic++;

test("matrice exhaustive des 768 transferts ALU registre-direct 8/16 bits", () => {
  const operations = [
    {kind:"ADD",op8:0x00,op16:0x01,carries:[0],add:true},
    {kind:"ADC",op8:0x10,op16:0x11,carries:[0,1],add:true},
    {kind:"SBB",op8:0x18,op16:0x19,carries:[0,1],add:false},
    {kind:"SUB",op8:0x28,op16:0x29,carries:[0],add:false}
  ];
  const names8 = ["AL","CL","DL","BL","AH","CH","DH","BH"];
  const parents8 = ["AX","CX","DX","BX"];
  let checked = 0;
  for (const op of operations) for (const carry of op.carries) {
    for (let dst = 0; dst < 8; dst++) for (let src = 0; src < 8; src++) {
      const values = [0x00,0x01,0x0f,0x10,0x7f,0x80,0xfe,0xff];
      const regs = {AX:0,CX:0,DX:0,BX:0};
      for (let code=0;code<8;code++) {
        const parent = parents8[code&3], value = values[code];
        regs[parent] = code<4 ? ((regs[parent]&0xff00)|value) : ((regs[parent]&0x00ff)|(value<<8));
      }
      const a=values[dst],b=values[src],modrm=0xc0|(src<<3)|dst;
      const state=api.executeBinary([op.op8,modrm,0xf4],0,0,{reg:regs,flags:{CF:carry}});
      assert.ok(!state.error,state.error||op.kind+" byte register matrix");
      const raw=op.add?a+b+carry:a-b-carry,result=raw&255;
      const expected=op.add?addFlags(a,b,carry,8):subFlags(a,b,carry,8);
      const parent=parents8[dst&3],old=regs[parent];
      const expectedParent=dst<4?((old&0xff00)|result):((old&0x00ff)|(result<<8));
      assert.equal(state.reg[parent],expectedParent,op.kind+" "+names8[dst]+","+names8[src]);
      for(const [flag,value] of Object.entries(expected))assert.equal(state.flags[flag],value,op.kind+" "+flag);
      assert.equal(state.steps,2);
      checked++;
    }
  }
  const names16=["AX","CX","DX","BX","SP","BP","SI","DI"];
  for (const op of operations) for (const carry of op.carries)
    for (let dst=0;dst<8;dst++) for(let src=0;src<8;src++){
      const values=[0x0000,0x0001,0x000f,0x0010,0x007f,0x0080,0x7fff,0xffff];
      const regs={};names16.forEach((name,i)=>regs[name]=values[i]);
      const a=values[dst],b=values[src],modrm=0xc0|(src<<3)|dst;
      const state=api.executeBinary([op.op16,modrm,0xf4],0,0,{reg:regs,flags:{CF:carry}});
      assert.ok(!state.error,state.error||op.kind+" word register matrix");
      const cin=(op.kind==="ADC"||op.kind==="SBB")?carry:0;
      const raw=op.add?a+b+cin:a-b-cin,result=raw&65535;
      const expected=op.add?addFlags(a,b,cin,16):subFlags(a,b,cin,16);
      assert.equal(state.reg[names16[dst]],result,op.kind+" "+names16[dst]+","+names16[src]);
      for(const [flag,value] of Object.entries(expected))assert.equal(state.flags[flag],value,op.kind+" "+flag);
      checked++;
    }
  assert.equal(checked,768);
});
categories.arithmetic++;

test("tous les modes d’adressage mémoire 8086 et les quatre overrides de segment", () => {
  const source=[
    "MOV AX, 1000h","MOV DS, AX","MOV AX, 2000h","MOV SS, AX",
    "MOV AX, 3000h","MOV ES, AX",
    "MOV BX, 0010h","MOV BP, 0020h","MOV SI, 0002h","MOV DI, 0004h",
    "MOV WORD PTR [BX+SI], 1111h",
    "MOV WORD PTR [BX+DI+2], 2222h",
    "MOV WORD PTR [BP+SI+4], 3333h",
    "MOV WORD PTR [BP+DI+6], 4444h",
    "MOV WORD PTR [SI+8], 5555h",
    "MOV WORD PTR [DI+10], 6666h",
    "MOV WORD PTR [BP+12], 7777h",
    "MOV WORD PTR [BX+14], 8888h",
    "MOV WORD PTR [0300h], 9999h",
    "MOV WORD PTR DS:[BP+SI+16], 0A0Ah",
    "MOV WORD PTR SS:[BX+DI+30h], 0B0Bh",
    "MOV WORD PTR ES:[BX+SI+20h], 0C0Ch",
    "MOV WORD PTR CS:[BX+DI+0200h], 0D0Dh",
    "HLT"
  ].join("\n");
  const addresses=[
    0x10012,0x10016,0x20026,0x2002a,0x1000a,0x1000e,0x2002c,0x1001e,0x10300,
    0x10032,0x20044,0x30032,0x00214
  ];
  const {binaryState}=compareSourceBinary(source,addresses);
  const expected=[0x1111,0x2222,0x3333,0x4444,0x5555,0x6666,0x7777,0x8888,0x9999,0x0a0a,0x0b0b,0x0c0c,0x0d0d];
  for(let i=0;i<addresses.length;i++){
    const value=binaryState.mem[addresses[i]]|(binaryState.mem[addresses[i]+1]<<8);
    assert.equal(value,expected[i],"memory at "+addresses[i].toString(16));
  }
});
categories.memory++;

test("les 16 conditions Jcc sont exactes pour les 32 combinaisons CF/ZF/SF/OF/PF", () => {
  const condition = [
    f=>f.OF===1, f=>f.OF===0, f=>f.CF===1, f=>f.CF===0,
    f=>f.ZF===1, f=>f.ZF===0, f=>f.CF===1||f.ZF===1, f=>f.CF===0&&f.ZF===0,
    f=>f.SF===1, f=>f.SF===0, f=>f.PF===1, f=>f.PF===0,
    f=>f.SF!==f.OF, f=>f.SF===f.OF, f=>f.ZF===1||f.SF!==f.OF, f=>f.ZF===0&&f.SF===f.OF
  ];
  let checked=0;
  for(let bits=0;bits<32;bits++){
    const flags={CF:bits&1,ZF:(bits>>1)&1,SF:(bits>>2)&1,OF:(bits>>3)&1,PF:(bits>>4)&1};
    for(let code=0;code<16;code++){
      const bytes=[0x70+code,0x04,0xb0,0x01,0xeb,0x02,0xb0,0x02,0xf4];
      const state=api.executeBinary(bytes,0,0,{flags});
      assert.ok(!state.error,state.error||"Jcc opcode "+(0x70+code).toString(16));
      assert.equal(state.reg.AX&255,condition[code](flags)?2:1,"Jcc "+(0x70+code).toString(16)+" flags "+bits);
      assert.equal(state.reg.IP,9);
      checked++;
    }
  }
  assert.equal(checked,512);
});
categories.stack++;

test("oracle indépendant exhaustif des opérations arithmétiques 8 bits", () => {
  const kinds = [
    { kind: "ADD", carry: 0, add: true },
    { kind: "ADC", carry: 0, add: true },
    { kind: "ADC", carry: 1, add: true },
    { kind: "SUB", carry: 0, add: false },
    { kind: "SBB", carry: 0, add: false },
    { kind: "SBB", carry: 1, add: false }
  ];
  let checked = 0;
  for (const spec of kinds) {
    for (let a = 0; a < 256; a++) for (let b = 0; b < 256; b++) {
      const actual = api.arithmeticProbe(a, b, spec.kind, 8, spec.carry);
      const expected = spec.add ? addFlags(a, b, spec.carry, 8) : subFlags(a, b, spec.carry, 8);
      const raw = spec.add ? a + b + spec.carry : a - b - spec.carry;
      if (actual.result !== (raw & 255)) throw new Error(spec.kind+" résultat "+a+","+b+","+spec.carry);
      for (const [flag,value] of Object.entries(expected)) {
        if (actual.flags[flag] !== value) throw new Error(spec.kind+" "+flag+" "+a+","+b+","+spec.carry+" attendu "+value+" obtenu "+actual.flags[flag]);
      }
      checked++;
    }
  }
  assert.equal(checked, 393216);
});
categories.arithmetic++;

test("oracle indépendant FLAGS 16 bits sur les frontières et les retenues", () => {
  const values = [0,1,0x000f,0x0010,0x007f,0x0080,0x7fff,0x8000,0xfffe,0xffff];
  let checked = 0;
  for (const kind of ["ADD","ADC","SUB","SBB"]) for (const carry of [0,1])
    for (const a of values) for (const b of values) {
      const actual = api.arithmeticProbe(a,b,kind,16,carry);
      const add = kind==="ADD"||kind==="ADC", cin = (kind==="ADC"||kind==="SBB")?carry:0;
      const expected = add ? addFlags(a,b,cin,16) : subFlags(a,b,cin,16);
      const raw = add ? a+b+cin : a-b-cin;
      assert.equal(actual.result, raw & 65535, kind+" result");
      for (const [flag,value] of Object.entries(expected)) assert.equal(actual.flags[flag],value,kind+" "+flag);
      checked++;
    }
  assert.equal(checked,800);
});
categories.arithmetic++;


test("LOOPE, LOOPNE et JCXZ — source, assembleur, désassembleur et exécution binaire", () => {
  const programs = [
    "MOV CX, 2\nMOV AX, 0\nCMP AX, 0\nLOOPE AGAIN\nHLT\nAGAIN: INC BX\nCMP AX, 0\nLOOPE AGAIN\nHLT",
    "MOV CX, 2\nMOV AX, 1\nCMP AX, 0\nLOOPNE AGAIN\nHLT\nAGAIN: INC BX\nCMP AX, 0\nLOOPNE AGAIN\nHLT",
    "MOV CX, 0\nJCXZ ZERO\nMOV DX, 1\nJMP END\nZERO: MOV DX, 2\nEND: HLT"
  ];
  for (const source of programs) compareSourceBinary(source);
});
test("CBW et CWD — extension de signe 8/16 bits", () => {
  const {binaryState}=compareSourceBinary("MOV AL, 80h\nCBW\nMOV BX, AX\nCWD\nHLT");
  assert.equal(binaryState.reg.AX,0xff80);
  assert.equal(binaryState.reg.BX,0xff80);
  assert.equal(binaryState.reg.DX,0xffff);
});
test("AAA, AAS, AAM, AAD, DAA et DAS — ajustements décimaux", () => {
  const source="MOV AX, 000Bh\nAAA\nMOV BX, AX\nMOV AX, 000Bh\nAAS\nMOV CX, AX\nMOV AL, 29\nAAM\nMOV DX, AX\nMOV AX, 0209h\nAAD\nMOV SI, AX\nMOV AL, 9Bh\nDAA\nMOV DI, AX\nMOV AL, 9Bh\nSTC\nDAS\nHLT";
  const {binaryState}=compareSourceBinary(source);
  assert.equal(binaryState.reg.BX,0x0101);
  assert.equal(binaryState.reg.CX,0xff05);
  assert.equal(binaryState.reg.DX,0x0209);
  assert.equal(binaryState.reg.SI,29);
  assert.equal(binaryState.reg.DI&255,1);
});
test("ROL, ROR, RCL, RCR, SAR, SHL et SHR — registres et compte CL", () => {
  const source="MOV AL, 81h\nROL AL, 1\nMOV CL, 2\nROR AL, CL\nSTC\nRCL AL, 1\nRCR AL, 1\nSAR AL, 1\nSHL AL, 1\nSHR AL, 1\nHLT";
  compareSourceBinary(source);
});
test("LAHF et SAHF — transfert des FLAGS via AH", () => {
  const {binaryState}=compareSourceBinary("MOV AH, 0D5h\nSAHF\nLAHF\nHLT");
  assert.equal(binaryState.reg.AX>>8,0xd7);
  for (const flag of ["CF","PF","AF","ZF","SF"]) assert.equal(binaryState.flags[flag],1);
});
test("XLAT — lecture DS:[BX+AL] et mise à jour de AL", () => {
  const prefix="MOV BX, 0100h\nMOV AL, 2\nMOV BYTE PTR [BX+2], 5Ah\n";
  const sourceState=runSource(prefix+"HLT");
  assert.equal(sourceState.mem[0x102],0x5a,"source store must initialize DS:[BX+2]");
  assert.equal(sourceState.reg.BX,0x100,"source BX before XLAT");
  assert.equal(sourceState.reg.AX&255,2,"source AL before XLAT");
  const binaryStore=runBinary(prefix+"HLT").state;
  assert.equal(binaryStore.mem[0x102],0x5a,"binary store must initialize DS:[BX+2]");
  let source;
  try { source=runSource(prefix+"XLAT\nHLT"); } catch(error) { throw new Error("source XLAT: "+error.message); }
  assert.equal(source.reg.AX&255,0x5a,"source XLAT");
  let binary;
  try { binary=runBinary(prefix+"XLAT\nHLT").state; } catch(error) { throw new Error("binary XLAT: "+error.message); }
  assert.equal(binary.reg.AX&255,0x5a,"binary XLAT");
});
test("REP MOVSB — préfixe binaire, répétition CX et transfert mémoire", () => {
  const source="MOV SI, 0100h\nMOV DI, 0200h\nMOV CX, 3\nMOV BYTE PTR [0100h], 11h\nMOV BYTE PTR [0101h], 22h\nMOV BYTE PTR [0102h], 33h\nREP MOVSB\nHLT";
  const {assembled,binaryState}=compareSourceBinary(source,[0x200,0x201,0x202]);
  assert.deepEqual(Array.from(assembled.bytes.slice(-3)),[0xf3,0xa4,0xf4]);
  assert.deepEqual([binaryState.mem[0x200],binaryState.mem[0x201],binaryState.mem[0x202]],[0x11,0x22,0x33]);
});
test("LOCK ADD mémoire — préfixe F0, validation et round-trip", () => {
  const source="MOV BX, 0100h\nMOV AX, 2\nMOV WORD PTR [BX], 1\nLOCK ADD WORD PTR [BX], AX\nHLT";
  const {assembled,binaryState}=compareSourceBinary(source,[0x100,0x101]);
  const lockRow=assembled.rows.find(row=>row.instruction.startsWith("LOCK"));
  assert.deepEqual(Array.from(lockRow.bytes.slice(0,2)),[0xf0,0x01]);
  assert.equal(binaryState.mem[0x100]|(binaryState.mem[0x101]<<8),3);
  assert.throws(()=>api.assemble("LOCK CMP WORD PTR [BX], AX\nHLT"),/LOCK/);
});
test("WAIT et ESC — opcodes reconnus, sans coprocesseur externe simulé", () => {
  const {assembled,binaryState}=compareSourceBinary("MOV AX, 1234h\nWAIT\nESC 0, AX\nHLT");
  assert.equal(binaryState.reg.AX,0x1234);
  assert.ok(assembled.bytes.includes(0x9b));
  assert.ok(assembled.bytes.includes(0xd8));
});
test("IN/OUT — les huit formes immédiat/DX et AL/AX avec ports source", () => {
  const source="PORT 20h, 5Ah\nPORT 22h, ABCDh\nPORT 30h, 1234h\nPORT 31h, 66h\nIN AL, 20h\nOUT 21h, AL\nIN AX, 22h\nOUT 23h, AX\nMOV DX, 30h\nIN AX, DX\nOUT DX, AX\nMOV DX, 31h\nIN AL, DX\nOUT DX, AL\nHLT";
  const sourceState=runSource(source);
  const assembled=api.assemble(source);
  const state=api.executeBinary(Array.from(assembled.bytes),0,0,{io:assembled.ports});
  assert.ok(!state.error,state.error||"binary I/O failed");
  for(const register of Object.keys(sourceState.reg))assert.equal(state.reg[register],sourceState.reg[register],register);
  for(const port of Object.keys(sourceState.io))assert.equal(state.io[port],sourceState.io[port],"port "+port);
  assert.equal(state.output,sourceState.output);
  assert.equal(state.io[33],0x5a);
  assert.equal(state.io[35],0xabcd);
  assert.equal(state.io[48],0x1234);
  assert.equal(state.io[49],0x66);
  assert.equal(state.reg.AX,0x1266);
  assert.throws(()=>api.assemble("PORT 10000h, 1\nHLT"),/PORT/);
});
test("REP MOVSW/LODSB/STOSB et REPE/REPNE CMPS/SCAS", () => {
  const programs=[
    "MOV SI, 0100h\nMOV DI, 0200h\nMOV CX, 2\nMOV WORD PTR [0100h], 1234h\nMOV WORD PTR [0102h], 5678h\nREP MOVSW\nHLT",
    "MOV SI, 0100h\nMOV CX, 2\nMOV BYTE PTR [0100h], 11h\nMOV BYTE PTR [0101h], 22h\nREP LODSB\nHLT",
    "MOV DI, 0200h\nMOV CX, 2\nMOV AL, 5Ah\nREP STOSB\nHLT",
    "MOV SI, 0100h\nMOV DI, 0200h\nMOV CX, 3\nMOV BYTE PTR [0100h], 1\nMOV BYTE PTR [0101h], 2\nMOV BYTE PTR [0102h], 3\nMOV BYTE PTR [0200h], 1\nMOV BYTE PTR [0201h], 2\nMOV BYTE PTR [0202h], 9\nREPE CMPSB\nHLT",
    "MOV DI, 0200h\nMOV CX, 3\nMOV AL, 2\nMOV BYTE PTR [0200h], 1\nMOV BYTE PTR [0201h], 2\nMOV BYTE PTR [0202h], 3\nREPNE SCASB\nHLT"
  ];
  for(const source of programs) compareSourceBinary(source);
});
test("Préfixe segment + REP — CS: REP MOVSB", () => {
  const source="MOV SI, 0100h\nMOV DI, 0200h\nMOV CX, 1\nMOV BYTE PTR CS:[0100h], 42h\nCS: REP MOVSB\nHLT";
  const {assembled,binaryState}=compareSourceBinary(source,[0x200]);
  const row=assembled.rows.find(x=>x.instruction==="CS: REP MOVSB");
  assert.ok(row);
  assert.deepEqual(Array.from(row.bytes.slice(0,3)),[0x2e,0xf3,0xa4]);
  assert.equal(binaryState.mem[0x200],0x42);
});
test("INTO — vecteur 4, gestionnaire IVT et retour IRET en binaire", () => {
  const source="MOV AX, 7FFFh\nADD AX, 1\nINTO\nHLT\nHANDLER: MOV BX, 1\nIRET";
  const assembled=api.assemble(source),handler=assembled.symbols.HANDLER;
  const memory={"16":handler&255,"17":(handler>>8)&255,"18":0,"19":0};
  const state=api.executeBinary(Array.from(assembled.bytes),0,0,{mem:memory});
  assert.ok(!state.error,state.error||"INTO/IRET failed");
  assert.equal(state.reg.BX,1);
  assert.equal(state.reg.IP,handler);
  assert.equal(state.reg.SP,0xfffe);
});


test("Oracle indépendant exhaustif 8 bits — SHL/SHR/SAR et rotations 8086 avec CL non masqué", () => {
  const specs=[
    ["SHL",4],["SHR",5],["SAR",7],["ROL",0],["ROR",1],["RCL",2],["RCR",3]
  ];
  const counts=[1,2,7,8,9,16,31,32,255];
  let checked=0;
  for(const [name,ext] of specs) for(let value=0;value<256;value++) for(const count of counts) {
    for(const initialCarry of (["RCL","RCR"].includes(name)?[0,1]:[0])) {
      let result=value,carry=initialCarry;
      for(let n=0;n<count;n++){
        if(name==="SHL"){carry=(result>>7)&1;result=(result<<1)&255;}
        else if(name==="SHR"){carry=result&1;result>>=1;}
        else if(name==="SAR"){carry=result&1;result=(result>>1)|(result&128);}
        else if(name==="ROL"){carry=(result>>7)&1;result=((result<<1)&255)|carry;}
        else if(name==="ROR"){carry=result&1;result=(result>>1)|(carry<<7);}
        else if(name==="RCL"){const old=carry;carry=(result>>7)&1;result=((result<<1)&255)|old;}
        else if(name==="RCR"){const old=result&1;result=(result>>1)|(carry<<7);carry=old;}
      }
      const modrm=0xc0|(ext<<3);
      const bytes=[0xb0,value,0xb1,count,0xd2,modrm,0xf4];
      const state=api.executeBinary(bytes,0,0,{flags:{CF:initialCarry}});
      assert.ok(!state.error,state.error||name+" decode/execution");
      assert.equal(state.reg.AX&255,result,name+" result value="+value+" count="+count+" CF="+initialCarry);
      assert.equal(state.flags.CF,carry,name+" CF value="+value+" count="+count+" CF="+initialCarry);
      if(name==="SHL"||name==="SHR"||name==="SAR"){
        assert.equal(state.flags.ZF,result===0?1:0,name+" ZF");
        assert.equal(state.flags.SF,(result>>7)&1,name+" SF");
        assert.equal(state.flags.PF,parity8(result),name+" PF");
      }
      checked++;
    }
  }
  assert.equal(checked,20736);
});
test("Oracle indépendant exhaustif 8 bits — AAA/AAS et DAA/DAS", () => {
  let checked=0;
  for(const name of ["AAA","AAS"]) for(let al=0;al<256;al++) for(let af=0;af<2;af++){
    const ah=0x55,adjust=((al&15)>9)||af===1;
    let expectedAL=al,expectedAH=ah,expectedAF=0,expectedCF=0;
    if(adjust){expectedAL=(expectedAL+(name==="AAA"?6:-6))&255;expectedAH=(expectedAH+(name==="AAA"?1:-1))&255;expectedAF=expectedCF=1;}
    expectedAL&=15;
    const state=api.executeBinary([name==="AAA"?0x37:0x3f,0xf4],0,0,{reg:{AX:(ah<<8)|al},flags:{AF:af}});
    assert.ok(!state.error,state.error||name);
    assert.equal(state.reg.AX,((expectedAH<<8)|expectedAL)&65535,name+" AX");
    assert.equal(state.flags.AF,expectedAF,name+" AF");
    assert.equal(state.flags.CF,expectedCF,name+" CF");
    checked++;
  }
  for(const name of ["DAA","DAS"]) for(let al=0;al<256;al++) for(let af=0;af<2;af++) for(let cf=0;cf<2;cf++){
    const low=(al&15)>9||af===1,high=al>0x99||cf===1;
    let expected=(al+(low?(name==="DAA"?6:-6):0)+(high?(name==="DAA"?0x60:-0x60):0))&255;
    const state=api.executeBinary([name==="DAA"?0x27:0x2f,0xf4],0,0,{reg:{AX:al},flags:{AF:af,CF:cf}});
    assert.ok(!state.error,state.error||name);
    assert.equal(state.reg.AX&255,expected,name+" AL");
    assert.equal(state.flags.AF,low?1:0,name+" AF");
    assert.equal(state.flags.CF,high?1:0,name+" CF");
    assert.equal(state.flags.SF,(expected>>7)&1,name+" SF");
    assert.equal(state.flags.ZF,expected===0?1:0,name+" ZF");
    assert.equal(state.flags.PF,parity8(expected),name+" PF");
    checked++;
  }
  assert.equal(checked,256*2*2+256*2*2*2);
});
test("Oracle AAM base 10 sur les 256 valeurs possibles de AL", () => {
  for(let al=0;al<256;al++){
    const state=api.executeBinary([0xd4,0x0a,0xf4],0,0,{reg:{AX:al}});
    assert.ok(!state.error,state.error||"AAM");
    assert.equal(state.reg.AX>>8,Math.floor(al/10));
    assert.equal(state.reg.AX&255,al%10);
  }
});
test("Décalages 16 bits — frontières de signe, compte CL et retenue", () => {
  for(const [name,ext] of [["SHL",4],["SHR",5],["SAR",7],["ROL",0],["ROR",1],["RCL",2],["RCR",3]])
    for(const value of [0,1,0x7fff,0x8000,0xffff,0xaaaa,0x5555])
      for(const count of [1,2,15,16,17,31,32,255])
        for(const carryIn of (["RCL","RCR"].includes(name)?[0,1]:[0])){
          let result=value,carry=carryIn;
          for(let n=0;n<count;n++){
            if(name==="SHL"){carry=(result>>15)&1;result=(result<<1)&65535;}
            else if(name==="SHR"){carry=result&1;result>>=1;}
            else if(name==="SAR"){carry=result&1;result=(result>>1)|(result&0x8000);}
            else if(name==="ROL"){carry=(result>>15)&1;result=((result<<1)&65535)|carry;}
            else if(name==="ROR"){carry=result&1;result=(result>>1)|(carry<<15);}
            else if(name==="RCL"){const old=carry;carry=(result>>15)&1;result=((result<<1)&65535)|old;}
            else if(name==="RCR"){const old=result&1;result=(result>>1)|(carry<<15);carry=old;}
          }
          const state=api.executeBinary([0xb8,value&255,value>>8,0xb1,count,0xd3,0xc0|(ext<<3),0xf4],0,0,{flags:{CF:carryIn}});
          assert.ok(!state.error,state.error||name+" word");
          assert.equal(state.reg.AX,result,name+" word result");
          assert.equal(state.flags.CF,carry,name+" word CF");
        }
});


test("LOOPE/LOOPNE/JCXZ — limites rel8 exactes −128 et +127", () => {
  const opcodes={LOOPNE:0xe0,LOOPE:0xe1,JCXZ:0xe3};
  for(const [name,opcode] of Object.entries(opcodes)){
    const positive=api.assemble(name+" TARGET\n"+"NOP\n".repeat(127)+"TARGET: HLT");
    assert.equal(positive.bytes[0],opcode,name+" opcode +127");
    assert.equal(positive.bytes[1],0x7f,name+" displacement +127");
    const negative=api.assemble("TARGET: "+"NOP\n".repeat(126)+name+" TARGET\nHLT");
    const row=negative.rows.find(x=>x.instruction.startsWith(name+" "));
    assert.ok(row,name+" negative branch row");
    assert.equal(row.bytes[0],opcode,name+" opcode -128");
    assert.equal(row.bytes[1],0x80,name+" displacement -128");
  }
  assert.throws(()=>api.assemble("NOP\n".repeat(127)+"JCXZ TARGET\n"+"NOP\n".repeat(129)+"TARGET: HLT"),/hors plage/);
});
test("SHL/SHR/SAR et rotations sur mémoire BYTE/WORD avec override ES", () => {
  const source="MOV AX, 1000h\nMOV ES, AX\nMOV BX, 0100h\nMOV BYTE PTR ES:[BX], 81h\nMOV CL, 2\nROL BYTE PTR ES:[BX], CL\nMOV WORD PTR ES:[BX+2], 8001h\nSAR WORD PTR ES:[BX+2], 1\nSHR WORD PTR ES:[BX+2], CL\nHLT";
  const {binaryState}=compareSourceBinary(source,[0x10100,0x10102,0x10103]);
  assert.equal(binaryState.mem[0x10100],0x06);
  assert.equal(binaryState.mem[0x10102]|(binaryState.mem[0x10103]<<8),0x3000);
  assert.throws(()=>api.assemble("MOV AL, 1\nSHL AL, 2\nHLT"),/compteur immédiat/);
});

console.log("Audit différentiel arithmétique : " + categories.arithmetic + " vecteurs.");
console.log("Logique et TEST : " + categories.logic + " vecteurs.");
console.log("Registres : " + categories.registers + " vecteurs.");
console.log("Mémoire et préfixes : " + categories.memory + " vecteurs.");
console.log("Pile et transferts : " + categories.stack + " vecteurs.");
console.log("IRET : " + categories.iret + " vecteurs.");
console.log("Encodages invalides / limites : " + categories.invalid + " vecteurs.");
console.log("Oracle arithmétique indépendant : 393 216 vecteurs exhaustifs 8 bits + 800 vecteurs frontières 16 bits.");
console.log("Exécution binaire ALU avec octets bruts : 1 350 vecteurs.");
console.log("Résultat audit différentiel : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
