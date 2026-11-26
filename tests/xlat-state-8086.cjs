const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Inline application script must exist");

const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id, value: "", textContent: "", innerHTML: "", className: "",
      dataset: {}, onclick: null, oninput: null, onchange: null
    });
  }
  return elements.get(id);
}
const context = {
  document: { getElementById: element, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console
};
vm.createContext(context);
const injection = "\nglobalThis.__8086XlatStateApi = {" +
  "\n execute: source => executeAll(source)," +
  "\n executeBinary: (bytes, cs, ip, initialState) => executeBinary(bytes, cs, ip, initialState)" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 30000 });
const api = context.__8086XlatStateApi;
assert.ok(api, "XLAT state audit API must be exposed");

const flags = { CF: 1, PF: 0, AF: 1, ZF: 0, SF: 1, TF: 1, IF: 1, DF: 1, OF: 1 };
const expected = {
  AX: 0x5AC7, BX: 0x0200, CX: 0x1122, DX: 0x3344,
  SP: 0x0BEE, BP: 0x5566, SI: 0x7788, DI: 0x99AA,
  CS: 0x0000, DS: 0x1000, ES: 0x2000, SS: 0x3000
};
let passed = 0;

function assertArchitecturalState(state, label) {
  assert.ok(!state.error, label + ": " + (state.error || "execution failed"));
  for (const [register, value] of Object.entries(expected)) {
    assert.equal(state.reg[register], value, label + " " + register);
  }
  for (const [name, value] of Object.entries(flags)) {
    assert.equal(state.flags[name], value, label + " FLAGS." + name);
  }
  assert.equal(state.reg.AX >> 8, 0x5A, label + " AH must remain unchanged");
  assert.equal(state.reg.AX & 0xFF, 0xC7, label + " AL must receive the table byte");
}

const source = [
  "MOV AX, 1000h", "MOV DS, AX",
  "MOV AX, 2000h", "MOV ES, AX",
  "MOV AX, 3000h", "MOV SS, AX",
  "MOV BYTE PTR DS:[0203h], 0C7h",
  "MOV BX, 0200h", "MOV CX, 1122h", "MOV DX, 3344h",
  "MOV BP, 5566h", "MOV SI, 7788h", "MOV DI, 99AAh",
  "MOV SP, 0BEEh", "MOV AX, 0F93h", "PUSH AX", "POPF",
  "MOV AX, 5A03h", "XLAT", "HLT"
].join("\n");
const sourceState = api.execute(source);
assertArchitecturalState(sourceState, "Source XLAT");
assert.equal(sourceState.execution.mode, "binary-offset");
passed++;
console.log("XLAT source : tous les registres généraux/segments et 9 FLAGS préservés : PASS");

const physical = (((0x1000 << 4) + 0x0203) & 0xFFFFF);
const binaryState = api.executeBinary([0xD7, 0xF4], 0x5000, 0x0100, {
  reg: {
    AX: 0x5A03, BX: 0x0200, CX: 0x1122, DX: 0x3344,
    SP: 0x0BEE, BP: 0x5566, SI: 0x7788, DI: 0x99AA,
    DS: 0x1000, ES: 0x2000, SS: 0x3000
  },
  flags,
  mem: { [physical]: 0xC7 }
});
const binaryExpected = { ...expected, CS: 0x5000 };
for (const [register, value] of Object.entries(binaryExpected)) {
  assert.equal(binaryState.reg[register], value, "Binaire XLAT " + register);
}
for (const [name, value] of Object.entries(flags)) {
  assert.equal(binaryState.flags[name], value, "Binaire XLAT FLAGS." + name);
}
assert.equal(binaryState.reg.AX >> 8, 0x5A, "Binaire XLAT must preserve AH");
assert.equal(binaryState.reg.AX & 0xFF, 0xC7, "Binaire XLAT must load AL");
assert.equal(binaryState.execution.mode, "dynamic-binary");
assert.equal(binaryState.execution.decodedInstructions, 2);
passed++;
console.log("XLAT binaire : tous les registres généraux/segments et 9 FLAGS préservés : PASS");
console.log("Audit conservation XLAT : " + passed + "/2 réussis.");
