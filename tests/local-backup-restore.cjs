const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf("var BACKUP_VERSION=1");
const end = html.indexOf('$("exportBackup").onclick=', start);
assert.ok(start >= 0 && end > start, "Backup core must be present");
const source = html.slice(start, end);

function makeStore(seed = {}, failKey = null) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) {
      if (key === failKey) throw new Error("simulated quota failure");
      data.set(key, String(value));
    },
    removeItem(key) { data.delete(key); }
  };
}
function makeData() {
  return {
    "i86-lessons-v2": ["lesson-1", "lesson-2"],
    "i86-exercises": ["exercise-1"],
    "i86-chapter-scores-v2": { "0": 8, "16": 10 },
    "i86-lesson-scores-v2": { "0-0": 3, "16-2": 2 },
    "i86-title": "Projet test",
    "i86-idea": "Description test",
    "i86-code": "MOV AX, 1\nHLT"
  };
}
function sandboxFor(store) {
  const noop = () => {};
  const elements = new Map();
  const $ = id => elements.get(id) || (elements.set(id, { value: "", textContent: "" }), elements.get(id));
  return {
    window: { localStorage: store },
    completed: new Set(), passed: new Set(), chapterScores: {}, lessonScores: {},
    $,
    renderLessons: noop, renderExercises: noop, stats: noop,
    document: { },
    Date, Array, Number, String, Math, RegExp, Error
  };
}
function load(store) {
  const sandbox = sandboxFor(store);
  vm.runInNewContext(source, sandbox, { timeout: 1000 });
  return sandbox;
}
const valid = makeData();
{
  const sandbox = load(makeStore());
  assert.equal(sandbox.BACKUP_MAX_BYTES, 10 * 1024 * 1024);
  const realmValid = sandbox.JSON.parse(JSON.stringify(valid));
  assert.equal(sandbox.validateBackupData(realmValid), null);
  assert.equal(sandbox.validateBackupData(sandbox.JSON.parse(JSON.stringify({ ...valid, "i86-code": 42 }))) !== null, true);
  const missing = { ...valid }; delete missing["i86-idea"];
  assert.match(sandbox.validateBackupData(sandbox.JSON.parse(JSON.stringify(missing))), /sept catégories/);
  assert.match(sandbox.validateBackupData(sandbox.JSON.parse(JSON.stringify({ ...valid, "i86-chapter-scores-v2": { "0": 11 } }))), /scores des chapitres/);
  assert.match(sandbox.validateBackupData(sandbox.JSON.parse(JSON.stringify({ ...valid, "i86-lesson-scores-v2": { "0-0": 4 } }))), /scores des leçons/);
  assert.match(sandbox.validateBackupData(sandbox.JSON.parse(JSON.stringify({ ...valid, "i86-lessons-v2": [""] }))), /leçons terminées/);
}
{
  const sandbox = load(makeStore());
  const doc = { application: "Intel 8086 Lab", backupVersion: 1, createdAt: new Date().toISOString(), data: valid };
  assert.equal(sandbox.validateBackupDocument(sandbox.JSON.parse(JSON.stringify(doc))), null);
  assert.match(sandbox.validateBackupDocument(sandbox.JSON.parse(JSON.stringify({ ...doc, backupVersion: 99 }))), /non prise en charge/);
  assert.match(sandbox.validateBackupDocument(sandbox.JSON.parse(JSON.stringify({ ...doc, application: "autre" }))), /n'est pas une sauvegarde/);
  assert.match(sandbox.validateBackupDocument(sandbox.JSON.parse(JSON.stringify({ ...doc, createdAt: "date" }))), /date de création/);
}
{
  const seed = {};
  Object.entries(valid).forEach(([key, value]) => {
    seed[key] = ["i86-title", "i86-idea", "i86-code"].includes(key) ? value : JSON.stringify(value);
  });
  const sandbox = load(makeStore(seed));
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.readCurrentBackupData())), valid);
}
{
  const old = makeData(), next = makeData();
  next["i86-title"] = "Sauvegarde restaurée";
  next["i86-code"] = "MOV BX, 2\nHLT";
  const seed = {};
  Object.entries(old).forEach(([key, value]) => {
    seed[key] = ["i86-title", "i86-idea", "i86-code"].includes(key) ? value : JSON.stringify(value);
  });
  const store = makeStore(seed), sandbox = load(store);
  const doc = { application: "Intel 8086 Lab", backupVersion: 1, createdAt: new Date().toISOString(), data: next };
  sandbox.restoreBackupDocument(sandbox.JSON.parse(JSON.stringify(doc)));
  assert.equal(store.getItem("i86-title"), next["i86-title"]);
  assert.equal(store.getItem("i86-code"), next["i86-code"]);
  assert.deepEqual(JSON.parse(store.getItem("i86-lessons-v2")), next["i86-lessons-v2"]);
}
{
  const old = makeData(), next = makeData();
  const seed = {};
  Object.entries(old).forEach(([key, value]) => {
    seed[key] = ["i86-title", "i86-idea", "i86-code"].includes(key) ? value : JSON.stringify(value);
  });
  const store = makeStore(seed, "i86-idea"), sandbox = load(store);
  const before = Object.fromEntries(store.data);
  const doc = { application: "Intel 8086 Lab", backupVersion: 1, createdAt: new Date().toISOString(), data: next };
  assert.throws(() => sandbox.restoreBackupDocument(sandbox.JSON.parse(JSON.stringify(doc))), /données précédentes ont été rétablies/);
  assert.deepEqual(Object.fromEntries(store.data), before);
}
{
  const store = makeStore({ "i86-lessons-v2": "{" });
  const sandbox = load(store);
  assert.throws(() => sandbox.readCurrentBackupData(), /stockage local est inaccessible/);
}
{
  const brokenStore = {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("SecurityError"); },
    removeItem() {}
  };
  const sandbox = load(brokenStore);
  assert.throws(() => sandbox.readCurrentBackupData(), /stockage local est inaccessible/);
}
{
  const data = makeData(), seed = {};
  Object.entries(data).forEach(([key, value]) => {
    seed[key] = ["i86-title", "i86-idea", "i86-code"].includes(key) ? value : JSON.stringify(value);
  });
  const store = makeStore(seed), sandbox = load(store), before = Object.fromEntries(store.data);
  const invalid = { application: "Intel 8086 Lab", backupVersion: 2, createdAt: new Date().toISOString(), data };
  assert.throws(() => sandbox.restoreBackupDocument(sandbox.JSON.parse(JSON.stringify(invalid))), /non prise en charge/);
  assert.deepEqual(Object.fromEntries(store.data), before);
}
{
  const sandbox = load(makeStore());
  const invalid = sandbox.JSON.parse(JSON.stringify({ ...makeData(), extra: "unexpected" }));
  assert.match(sandbox.validateBackupData(invalid), /sept catégories/);
}
console.log("10 groupes de tests sauvegarde/restauration exécutés avec succès.");
