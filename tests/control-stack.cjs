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
const injection = "\nglobalThis.__8086ControlApi = {" +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n disassemble: function (bytes) { return disassembleBytes(bytes); }," +
  "\n execute: function (source) { return executeAll(source); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 10000 });
const api = context.__8086ControlApi;
assert.ok(api, "Control-flow test API must be exposed");

let passed = 0, failed = 0;
const counts = { pop: 0, returns: 0, truncated: 0, execution: 0, invalid: 0 };
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.message); }
}
function bytes(source) { return Array.from(api.assemble(source).bytes); }
function decode(code) {
  const result = api.disassemble(code);
  assert.equal(result.rows.length, 1, "one decoded instruction expected");
  assert.deepEqual(Array.from(result.rows[0].bytes), code, "decoder must preserve exact bytes");
  return result.rows[0].instruction;
}
function modrm(mod, ext, rm) { return (mod << 6) | (ext << 3) | rm; }
function disp(mod, rm) {
  if (mod === 0 && rm === 6) return [0x34, 0x12];
  if (mod === 1) return [0xFC];
  if (mod === 2) return [0x00, 0x80];
  return [];
}
function execution(source) {
  const result = api.execute(source);
  assert.ok(!result.error, result.error || "execution failed");
  return result;
}
function expectDb(code, label) {
  const result = api.disassemble(code);
  assert.ok(result.rows[0].instruction.startsWith("DB "), label + ": " + result.rows[0].instruction);
  assert.deepEqual(Array.from(result.rows[0].bytes), code);
}

// 8F /0 POP r/m16: every ModR/M value, including register-direct.
for (let mod = 0; mod < 4; mod++) {
  for (let ext = 0; ext < 8; ext++) {
    for (let rm = 0; rm < 8; rm++) {
      const code = [0x8F, modrm(mod, ext, rm), ...disp(mod, rm)];
      test("8F /" + ext + " mod=" + mod + " rm=" + rm, () => {
        if (ext !== 0) return expectDb(code, "reserved POP extension");
        const decoded = decode(code);
        assert.ok(decoded.startsWith("POP "), decoded);
      });
      counts.pop++;
    }
  }
}
for (const [source, expected] of [
  ["POP WORD PTR [BX]", [0x8F, 0x07]],
  ["POP WORD PTR [BP+SI+4]", [0x8F, 0x42, 0x04]],
  ["POP AX", [0x58]],
  ["POP DI", [0x5F]]
]) {
  test("POP assembler " + source, () => assert.deepEqual(bytes(source), expected));
  counts.pop++;
}
for (const source of ["POP BYTE PTR [BX]", "POP CS", "POP 1234h"]) {
  test("POP rejects invalid form " + source, () => assert.throws(() => api.assemble(source)));
  counts.invalid++;
}

// Near/far RET encodings and exact little-endian immediates.
for (const [source, expected] of [
  ["RET", [0xC3]],
  ["RET 2", [0xC2, 0x02, 0x00]],
  ["RET 1234h", [0xC2, 0x34, 0x12]],
  ["RETF", [0xCB]],
  ["RETF 4", [0xCA, 0x04, 0x00]],
  ["RETF 1234h", [0xCA, 0x34, 0x12]]
]) {
  test("RET assembler " + source, () => assert.deepEqual(bytes(source), expected));
  test("RET decoder " + source, () => assert.ok(decode(expected).startsWith(source.split(" ")[0])));
  counts.returns += 2;
}

// Far indirect forms use m16:16; near indirect forms use r/m16.
for (const [source, expected] of [
  ["CALL AX", [0xFF, 0xD0]],
  ["CALL WORD PTR [BX]", [0xFF, 0x17]],
  ["JMP DX", [0xFF, 0xE2]],
  ["JMP WORD PTR [BP+SI+4]", [0xFF, 0x62, 0x04]],
  ["CALL FAR PTR [BX]", [0xFF, 0x1F]],
  ["JMP FAR PTR [BX]", [0xFF, 0x2F]]
]) {
  test("indirect control assembler " + source, () => assert.deepEqual(bytes(source), expected));
  test("indirect control decoder " + source, () => assert.ok(decode(expected).startsWith(source.split(" ")[0])));
  counts.returns += 2;
}

// Truncated opcodes, ModR/M and immediate words must fail explicitly.
for (const code of [
  [0x8F], [0x8F, 0x06], [0x8F, 0x46], [0x8F, 0x86, 0x01],
  [0xC2], [0xC2, 0x02], [0xCA], [0xCA, 0x02]
]) {
  test("truncated stream " + code.map(x => x.toString(16)).join(" "), () => {
    assert.throws(() => api.disassemble(code), /tronqué/i);
  });
  counts.truncated++;
}

// Near indirect CALL/JMP resolve targets and return addresses through assembled byte offsets.
test("CALL r16 then RET restores logical IP and SP", () => {
  const s = execution([
    "MOV AX, 10", "CALL AX", "MOV BX, 1", "JMP FIN",
    "SUB: MOV CX, 1234h", "RET", "FIN: HLT"
  ].join("\n"));
  assert.equal(s.reg.CX, 0x1234);
  assert.equal(s.reg.BX, 1);
  assert.equal(s.reg.SP, 0xFFFE);
  assert.equal(s.reg.IP, 15);
  assert.equal(s.stack.length, 0);
});
counts.execution++;

test("CALL r/m16 reads target from memory and returns", () => {
  const s = execution([
    "MOV BX, 0100h", "MOV WORD PTR [BX], 14", "CALL WORD PTR [BX]",
    "MOV DX, 7", "JMP FIN", "SUB: MOV CX, 4321h", "RET", "FIN: HLT"
  ].join("\n"));
  assert.equal(s.reg.CX, 0x4321);
  assert.equal(s.reg.DX, 7);
  assert.equal(s.reg.SP, 0xFFFE);
});
counts.execution++;

test("JMP r16 transfers control without pushing a return address", () => {
  const s = execution(["MOV AX, 8", "JMP AX", "MOV BX, 0", "TARGET: MOV BX, 1", "HLT"].join("\n"));
  assert.equal(s.reg.BX, 1);
  assert.equal(s.reg.SP, 0xFFFE);
  assert.equal(s.stack.length, 0);
});
counts.execution++;

test("JMP r/m16 reads a near target from memory", () => {
  const s = execution([
    "MOV BX, 0100h", "MOV WORD PTR [BX], 12", "JMP WORD PTR [BX]",
    "MOV CX, 0", "TARGET: MOV CX, 9", "HLT"
  ].join("\n"));
  assert.equal(s.reg.CX, 9);
});
counts.execution++;

test("CALL FAR m16:16 and RETF restore CS:IP and SP", () => {
  const s = execution([
    "MOV BX, 0100h", "MOV WORD PTR [BX], 19", "MOV WORD PTR [BX+2], 1234h",
    "CALL FAR PTR [BX]", "MOV DX, 7", "JMP FIN",
    "SUB: MOV CX, 2468h", "RETF", "FIN: HLT"
  ].join("\n"));
  assert.equal(s.reg.CX, 0x2468);
  assert.equal(s.reg.DX, 7);
  assert.equal(s.reg.CS, 0);
  assert.equal(s.reg.SP, 0xFFFE);
  assert.equal(s.stack.length, 0);
});
counts.execution++;

test("JMP FAR m16:16 changes CS:IP and does not push", () => {
  const s = execution([
    "MOV BX, 0100h", "MOV WORD PTR [BX], 17", "MOV WORD PTR [BX+2], 2345h",
    "JMP FAR PTR [BX]", "MOV CX, 0", "TARGET: MOV CX, 7", "HLT"
  ].join("\n"));
  assert.equal(s.reg.CX, 7);
  assert.equal(s.reg.CS, 0x2345);
  assert.equal(s.stack.length, 0);
});
counts.execution++;

test("RET imm16 removes caller arguments after near return", () => {
  const s = execution([
    "MOV AX, 55h", "PUSH AX", "CALL PROC", "HLT",
    "PROC: RET 2"
  ].join("\n"));
  assert.equal(s.reg.SP, 0xFFFE);
  assert.equal(s.stack.length, 0);
});
counts.execution++;

test("RETF imm16 removes caller arguments after far return", () => {
  const s = execution([
    "MOV BX, 0100h", "MOV WORD PTR [BX], 19", "MOV WORD PTR [BX+2], 1111h",
    "MOV AX, 55h", "PUSH AX", "CALL FAR PTR [BX]", "HLT",
    "PROC: RETF 2"
  ].join("\n"));
  assert.equal(s.reg.CS, 0);
  assert.equal(s.reg.SP, 0xFFFE);
  assert.equal(s.stack.length, 0);
});
counts.execution++;

test("RET near accepts odd byte cleanup", () => {
  const s = execution(["CALL PROC", "HLT", "PROC: RET 1"].join("\n"));
  assert.equal(s.reg.SP, 0xFFFF);
  assert.equal(s.stack.length, 0);
});
counts.execution++;

test("RETF far accepts odd byte cleanup", () => {
  const s = execution([
    "MOV BX, 0100h", "MOV WORD PTR [BX], 19", "MOV WORD PTR [BX+2], 1111h",
    "CALL FAR PTR [BX]", "HLT", "PROC: RETF 1"
  ].join("\n"));
  assert.equal(s.reg.CS, 0);
  assert.equal(s.reg.SP, 0xFFFF);
  assert.equal(s.stack.length, 0);
});
counts.execution++;

console.log("POP r/m16 : " + counts.pop + " vecteurs.");
console.log("RET near/far et transferts indirects : " + counts.returns + " vecteurs.");
console.log("Flux tronqués : " + counts.truncated + " vecteurs.");
console.log("Exécution : " + counts.execution + " vecteurs.");
console.log("Formes invalides : " + counts.invalid + " vecteurs.");
console.log("Résultat transferts et pile : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
