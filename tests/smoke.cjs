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
const document = {
  getElementById: element,
  querySelectorAll: () => []
};
const localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

vm.runInNewContext(match[1], { document, localStorage }, { timeout: 3000 });
const run = element("runSelfTests");
assert.equal(typeof run.onclick, "function", "Self-test button must be wired");
run.onclick();

const summary = element("testSummary").textContent;
const results = element("testResults").textContent;
console.log(summary);
console.log(results);
assert.equal(summary, "354/354 tests réussis", "All simulator self-tests must pass");
assert.ok(!results.includes("FAIL"), "No self-test should fail");
const instructionGrid = element("instructionGrid").innerHTML;
assert.ok(instructionGrid.includes("Fiche technique détaillée"), "Instruction cards must expose technical details");
assert.ok(instructionGrid.includes("Prise en charge dans Intel 8086 Lab"), "Instruction cards must state simulator/assembler/disassembler support");
const instructionSearch = element("searchInstruction");
instructionSearch.value = "8Eh";
instructionSearch.oninput();
assert.ok(element("instructionCount").textContent.startsWith("1 entrée(s)"), "Opcode search must find the MOV segment-register form");
instructionSearch.value = "";
instructionSearch.oninput();
const categoryFilter = element("filterCategory");
categoryFilter.value = "Chaînes";
categoryFilter.onchange();
assert.ok(element("instructionCount").textContent.startsWith("6 entrée(s)"), "Category filter must find the string instruction family");
categoryFilter.value = "";
categoryFilter.onchange();
instructionSearch.value = "ADC";
instructionSearch.oninput();
assert.ok(element("instructionGrid").innerHTML.includes("Simulateur : Pris en charge"), "ADC must be advertised as simulator-supported");
instructionSearch.value = "SBB";
instructionSearch.oninput();
assert.ok(element("instructionGrid").innerHTML.includes("Simulateur : Pris en charge"), "SBB must be advertised as simulator-supported");


