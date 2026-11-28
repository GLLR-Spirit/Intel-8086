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
const injection = [
  "globalThis.__exerciseMethodBatch05 = { exercises, executeAll, exerciseMethodSatisfied };",
  "})();"
].join("\n");
const instrumented = match[1].replace(/\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Application closure injection point must exist");
const context = {
  document: { getElementById: element, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console
};
vm.runInNewContext(instrumented, context, { timeout: 30000 });
const api = context.__exerciseMethodBatch05;
assert.ok(api, "Exercise method audit API must be exposed");

const cases = [
  ["Procédure : préserver un registre modifié", "MOV AX,12\nMOV BX,1234h\nHLT"],
  ["Arithmétique : MUL puis DIV sur 8 bits", "MOV AX,0208h\nHLT"],
  ["FLAGS : préserver la retenue avec PUSHF/POPF", "STC\nHLT"],
  ["Chaînes : copier deux octets avec REP MOVSB", "MOV AX,1000h\nMOV DS,AX\nMOV AX,2000h\nMOV ES,AX\nMOV BYTE PTR ES:[0200h],41h\nMOV BYTE PTR ES:[0201h],42h\nMOV SI,0102h\nMOV DI,0202h\nMOV CX,0\nHLT"],
  ["Chaînes : rechercher 42h avec REPNE SCASB", "MOV AL,42h\nMOV DI,0102h\nMOV CX,1\nCMP AL,AL\nHLT"],
  ["Interruptions : préserver un registre dans le gestionnaire", "MOV AX,7\nMOV BX,0BEEFh\nHLT"],
  ["Intégration : copier, vérifier et signaler par interruption", "MOV AX,1000h\nMOV DS,AX\nMOV AX,2000h\nMOV ES,AX\nMOV BYTE PTR ES:[0200h],11h\nMOV BYTE PTR ES:[0201h],22h\nMOV BYTE PTR ES:[0202h],33h\nMOV AX,1\nMOV BX,0BEEFh\nMOV SI,0103h\nMOV DI,0203h\nMOV CX,0\nHLT"],
  ["Intégration : parcours inverse et contrôle de mot", "MOV AX,1000h\nMOV DS,AX\nMOV AX,2000h\nMOV ES,AX\nMOV WORD PTR ES:[0200h],5678h\nMOV WORD PTR ES:[0202h],1234h\nMOV AX,1\nMOV BX,0BEEFh\nMOV SI,00FEh\nMOV DI,01FEh\nMOV CX,0\nCLD\nHLT"]
];

for (const [position, [title, bypassSource]] of cases.entries()) {
  const index = api.exercises.findIndex(item => item[0] === title);
  assert.notEqual(index, -1, "EX" + String(position + 41).padStart(2, "0") + " must exist");
  const exercise = api.exercises[index];
  const reference = api.executeAll(exercise[4].solution);
  assert.ok(!reference.error, title + " reference solution must execute: " + (reference.error || ""));
  assert.equal(exercise[3](reference), true, title + " reference result oracle");
  assert.equal(api.exerciseMethodSatisfied(index, reference), true, title + " reference method contract");

  const bypass = api.executeAll(bypassSource);
  assert.ok(!bypass.error, title + " bypass must execute: " + (bypass.error || ""));
  assert.equal(exercise[3](bypass), true, title + " bypass must preserve the final result");
  assert.equal(api.exerciseMethodSatisfied(index, bypass), false,
    title + " must reject a result-equivalent method bypass");
}
console.log("Exercise method batch 5 PASS: EX41–EX48 reference methods accepted; 8/8 result-equivalent bypasses rejected.");
