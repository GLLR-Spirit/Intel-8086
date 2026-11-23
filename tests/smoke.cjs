const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\\s\\S]*?)<\\/script>/);
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
assert.equal(summary, "8/8 tests réussis", "All simulator self-tests must pass");
assert.ok(!results.includes("FAIL"), "No self-test should fail");
