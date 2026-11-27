"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = path => fs.readFileSync(path, "utf8");
const readme = read("README.md");
const tracker = read("docs/course-quality-audit-tracker.md");
const report = read("docs/audit-complet-initial-2026-11-27.md");
const workflow = read(".github/workflows/ci.yml");
const oracleManifest = JSON.parse(read("docs/question-independent-oracles-8086.json"));

// Keep public documentation aligned with the latest observed exercise inventory.
assert.match(tracker, /48 guided corrections/i, "Tracker must report the verified 48-exercise inventory");
assert.match(tracker, /48 exercises/i, "Exercise audit section must use the verified inventory");
assert.doesNotMatch(tracker, /42 exercises|42 guided exercises|contracts for 42 exercises/i,
  "Stale 42-exercise claims must not remain");

// Automated question oracles are not equivalent to individual expert certification.
assert.match(tracker, /384\/684/, "Official individual certification count must remain explicit");
assert.match(tracker, /300 pending/i, "Remaining individual question reviews must remain explicit");
assert.match(report, /684\/684[\s\S]*automatisés/i,
  "Audit report must label 684/684 as automated oracle evaluation");
assert.match(report, /384\/684/, "Audit report must preserve the official certification count");
assert.match(report, /494 questions \(chapitres 1 à 24\)/i, "Audit report must report the 494 individually reviewed questions");
assert.match(report, /300 restent non certifiées/i, "Audit report must distinguish official pending certification from review records");
assert.match(tracker, /494 questions across chapters 1–24/i, "Tracker must report all documented individual reviews");
assert.equal(oracleManifest.oracles.length, 684, "Manifest must expose all 684 registered question IDs");
assert.equal(oracleManifest.oracleCoverageSummary.individuallyReviewedQuestions, 494, "Manifest review total must match the documented review set");
assert.equal(oracleManifest.independentReviewBatches.length, 24, "Manifest must list all 24 individual review files");

// The workflow label must not imply that an automated evaluator certifies questions independently.
assert.match(workflow, /Validate question oracle evaluators \(automated; not independent certification\)/i,
  "CI step must describe automated oracle validation accurately");
assert.doesNotMatch(workflow, /Certify all independently audited assessment questions/i,
  "Misleading certification label must be removed");

// README must not retain the superseded historical CI summary.
assert.doesNotMatch(readme, /354 tests de fumée|40 vecteurs indépendants|run 210/i,
  "README must not advertise superseded CI results");

console.log("Audit documentation consistency: PASS — exercise inventory, question certification caveat, and CI wording are aligned.");
