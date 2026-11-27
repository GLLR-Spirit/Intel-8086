"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const key = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json", "utf8"));
const batch = JSON.parse(fs.readFileSync("docs/question-oracle-batches/chapter-28.json", "utf8"));
const review = JSON.parse(fs.readFileSync("docs/question-independent-review/chapter-28.json", "utf8"));
const expectedIds = key.questions.filter(q => q.chapter === 28).map(q => q.id).sort();
const reviewedIds = review.records.map(r => r.id).sort();
assert.equal(expectedIds.length, 19);
assert.deepEqual(reviewedIds, expectedIds);
assert.equal(new Set(reviewedIds).size, 19);
assert.deepEqual(review.summary, {
  questionsReviewed: 19, passed: 18, corrected: 1, needsRevision: 0, blocked: 0,
  officialCertificationCountBefore: 384, officialCertificationCountAfter: 384,
  remainingOfficialCertification: 300
});
assert.deepEqual(review.openFindings, []);
const finalQuestions = key.questions.filter(q => q.chapter === 28 && q.kind === "final");
const categoryGroups = [
  ["Définition","Compréhension"], ["Syntaxe","Restrictions"],
  ["Prédiction","Calcul / prédiction"], ["Analyse de programme","Analyse de résultat"],
  ["Débogage","Raisonnement"]
];
for (const group of categoryGroups) assert.equal(finalQuestions.filter(q => group.includes(q.category)).length, 2,
  "Chapter 28 final assessment must contain exactly two items in " + group.join("/"));
const f8 = key.questions.find(q => q.id === "C28-F-Q8");
assert.equal(f8.correctAnswer, "41h puis 42h");
assert.match(f8.stem, /\[DS:0100h\]=41h.*\[DS:0101h\]=42h/);
const oracle = batch.oracles.find(q => q.id === "C28-F-Q8");
assert.deepEqual(oracle.expected, { CX: 0, SI: 258, DI: 514, destinationBytes: [65,66] });
assert.deepEqual(oracle.inputs.sourceBytes, [65,66]);
assert.equal(oracle.correctAnswer, f8.correctAnswer);
assert.ok(review.records.some(r => r.id === "C28-F-Q8" && r.result === "corrected"));
console.log("Chapter 28 independent review: 19/19 inspected; 18 passed; 1 diversity correction; final-assessment blueprint balanced; official ledger unchanged at 384/684.");
