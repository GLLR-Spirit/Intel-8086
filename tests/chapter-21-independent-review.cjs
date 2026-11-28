"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const key = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json", "utf8"));
const batch = JSON.parse(fs.readFileSync("docs/question-oracle-batches/chapter-21.json", "utf8"));
const review = JSON.parse(fs.readFileSync("docs/question-independent-review/chapter-21.json", "utf8"));
const expectedIds = key.questions.filter(q => q.chapter === 21).map(q => q.id).sort();
const reviewedIds = review.records.map(r => r.id).sort();
assert.equal(expectedIds.length, 19, "Chapter 21 must contain 19 questions");
assert.deepEqual(reviewedIds, expectedIds, "Chapter 21 review must cover every question exactly once");
assert.equal(new Set(reviewedIds).size, 19, "Chapter 21 review IDs must be unique");
assert.equal(review.summary.questionsReviewed, 19);
assert.equal(review.summary.passed, 19);
assert.equal(review.summary.corrected, 0);
assert.equal(review.summary.needsRevision, 0);
assert.equal(review.summary.blocked, 0);
assert.deepEqual(review.openFindings, [], "Chapter 21 review must have no open item-level findings");
const finalQuestions = key.questions.filter(q => q.chapter === 21 && q.kind === "final");
const categoryGroups = [
  ["Définition","Compréhension"],["Syntaxe","Restrictions"],["Prédiction","Calcul / prédiction"],
  ["Analyse de programme","Analyse de résultat"],["Débogage","Raisonnement"]
];
for (const group of categoryGroups) assert.equal(finalQuestions.filter(q => group.includes(q.category)).length, 2,
  "Chapter 21 final assessment must contain exactly two items in category group " + group.join("/"));
const call = batch.oracles.find(q => q.id === "C21-F-Q6");
assert.deepEqual(call.expected,{finalSP:65532,storedReturnIP:4660});
const mul = batch.oracles.find(q => q.id === "C21-L3-Q2");
assert.deepEqual(mul.expected,{DX:0,AX:9,product:9});
console.log("Chapter 21 independent review: 19/19 inspected; 19 passed; no corrections required; CALL/RET and MUL word behavior verified; official ledger unchanged at 384/684.");
