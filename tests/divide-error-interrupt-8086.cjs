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
const injection = "\nglobalThis.__8086DivideInterruptApi = {" +
  "\n execute: function (source) { return executeAll(source); }," +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n executeBinary: function (bytes, cs, ip, state) { return executeBinary(bytes, cs, ip, state); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 10000 });
const api = context.__8086DivideInterruptApi;
assert.ok(api, "Divide interrupt test API must be exposed");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.stack); }
}
function word(value) {
  return value.toString(16).toUpperCase().padStart(4, "0") + "h";
}
function sourceProgram(fault) {
  return [
    "VECTOR 0, HANDLER",
    "MOV CX, 0302h",
    "PUSH CX",
    "POPF",
    ...fault.setup,
    fault.instruction,
    "MOV DI, 0ABCDh",
    "HLT",
    "HANDLER:",
    "PUSHF",
    "POP CX",
    "MOV SI, 5678h",
    "IRET"
  ].join("\n");
}
const faults = [
  { name: "DIV 8-bit division by zero", setup: ["MOV AX, 1234h", "MOV BL, 0"], instruction: "DIV BL" },
  { name: "IDIV 8-bit division by zero", setup: ["MOV AX, 1234h", "MOV BL, 0"], instruction: "IDIV BL" },
  { name: "DIV 16-bit division by zero", setup: ["MOV DX, 0", "MOV AX, 1234h", "MOV BX, 0"], instruction: "DIV BX" },
  { name: "IDIV 16-bit division by zero", setup: ["MOV DX, 0", "MOV AX, 1234h", "MOV BX, 0"], instruction: "IDIV BX" },
  { name: "DIV 8-bit quotient overflow", setup: ["MOV AX, 0100h", "MOV BL, 1"], instruction: "DIV BL" },
  { name: "IDIV 8-bit quotient overflow", setup: ["MOV AX, 0FF80h", "MOV BL, 1"], instruction: "IDIV BL" },
  { name: "DIV 16-bit quotient overflow", setup: ["MOV DX, 1", "MOV AX, 0", "MOV BX, 1"], instruction: "DIV BX" },
  { name: "IDIV 16-bit quotient overflow", setup: ["MOV DX, 0FFFFh", "MOV AX, 8000h", "MOV BX, 1"], instruction: "IDIV BX" }
];

for (const fault of faults) {
  test("Source VECTOR 00h: " + fault.name, () => {
    const state = api.execute(sourceProgram(fault));
    assert.ok(!state.error, state.error || "Execution failed");
    assert.equal(state.reg.SI, 0x5678, "Handler must execute");
    assert.equal(state.reg.DI, 0xABCD, "IRET must resume after the faulting DIV/IDIV");
    assert.equal(state.reg.CX & 0x0300, 0, "IF and TF must be cleared inside the handler");
    assert.equal(state.flags.IF, 1, "IRET must restore the original IF");
    assert.equal(state.flags.TF, 1, "IRET must restore the original TF");
    assert.equal(state.stack.length, 0, "Interrupt frame must be fully consumed");
    assert.equal(state.reg.SP, 0xFFFE, "SP must be restored");
  });
}

function binaryProgram(fault) {
  return [
    "MOV CX, 0302h",
    "PUSH CX",
    "POPF",
    ...fault.setup,
    fault.instruction,
    "MOV DI, 0ABCDh",
    "HLT",
    "HANDLER:",
    "PUSHF",
    "POP CX",
    "MOV SI, 5678h",
    "IRET"
  ].join("\n");
}
for (const fault of [faults[0], faults[5], faults[6], faults[7]]) {
  test("Binary IVT 00h: " + fault.name, () => {
    const assembled = api.assemble(binaryProgram(fault));
    const handler = assembled.symbols.HANDLER;
    assert.ok(Number.isInteger(handler), "Assembler must expose HANDLER offset");
    const cs = 0x1000;
    const ivt = {
      0: handler & 255,
      1: (handler >> 8) & 255,
      2: cs & 255,
      3: (cs >> 8) & 255
    };
    const state = api.executeBinary(assembled.bytes, cs, 0, {
      flags: { IF: 1, TF: 1 },
      mem: ivt
    });
    assert.ok(!state.error, state.error || "Binary execution failed");
    assert.equal(state.reg.SI, 0x5678, "IVT handler must execute");
    assert.equal(state.reg.DI, 0xABCD, "IRET must resume after the faulting instruction");
    assert.equal(state.reg.CX & 0x0300, 0, "IF and TF must be cleared inside the handler");
    assert.equal(state.flags.IF, 1, "IRET must restore IF");
    assert.equal(state.flags.TF, 1, "IRET must restore TF");
    assert.equal(state.stack.length, 0, "Interrupt frame must be fully consumed");
    assert.equal(state.reg.SP, 0xFFFE, "SP must be restored");
  });
}

test("Source division fault without VECTOR 00h remains a diagnostic", () => {
  const state = api.execute("MOV AX, 1\nMOV BL, 0\nDIV BL\nHLT");
  assert.match(state.error || "", /division par zéro/i);
});
test("Binary division fault without initialized IVT 00h remains a diagnostic", () => {
  const bytes = api.assemble("MOV AX, 1\nMOV BL, 0\nDIV BL\nHLT").bytes;
  const state = api.executeBinary(bytes, 0x1000, 0);
  assert.match(state.error || "", /division par zéro/i);
  assert.match(state.error || "", /IVT/i);
});

console.log("Interruptions de division — source VECTOR 00h : 8 cas");
console.log("Interruptions de division — IVT binaire : 4 cas");
console.log("Contrôles : cadre FLAGS/CS/IP, IF/TF, IRET, reprise IP et pile.");
console.log("Audit divide-error interrupt : " + passed + " réussis, " + failed + " échecs.");
if (failed) process.exit(1);
