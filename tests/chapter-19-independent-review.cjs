"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const key = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json", "utf8"));
const batch = JSON.parse(fs.readFileSync("docs/question-oracle-batches/chapter-19.json", "utf8"));
const review = JSON.parse(fs.readFileSync("docs/question-independent-review/chapter-19.json", "utf8"));
const expectedIds = key.questions.filter(q => q.chapter === 19).map(q => q.id).sort();
const reviewedIds = review.records.map(r => r.id).sort();
assert.equal(expectedIds.length, 19, "Chapter 19 must contain 19 questions");
assert.deepEqual(reviewedIds, expectedIds, "Chapter 19 review must cover every question exactly once");
assert.equal(new Set(reviewedIds).size, 19, "Chapter 19 review IDs must be unique");
assert.equal(review.summary.questionsReviewed, 19);
assert.equal(review.summary.passed, 18);
assert.equal(review.summary.corrected, 1);
assert.equal(review.summary.needsRevision, 0);
assert.equal(review.summary.blocked, 0);
assert.deepEqual(review.openFindings, [], "Chapter 19 review must have no open item-level findings");
const finalQuestions = key.questions.filter(q => q.chapter === 19 && q.kind === "final");
const categoryGroups = [
  ["Définition","Compréhension"],["Syntaxe","Restrictions"],["Prédiction","Calcul / prédiction"],
  ["Analyse de programme","Analyse de résultat"],["Débogage","Raisonnement"]
];
for (const group of categoryGroups) assert.equal(finalQuestions.filter(q => group.includes(q.category)).length, 2,
  "Chapter 19 final assessment must contain exactly two items in category group " + group.join("/"));
const f8 = batch.oracles.find(q => q.id === "C19-F-Q8");
assert.equal(f8.rule, "effective_address_sum");
assert.deepEqual(f8.expected, {offset:36});
assert.equal(f8.correctAnswer, key.questions.find(q => q.id === "C19-F-Q8").correctAnswer);
assert.ok(review.records.some(r => r.id === "C19-F-Q8" && r.result === "corrected"));
console.log("Chapter 19 independent review: 19/19 inspected; 18 passed; 1 corrected; 16-bit effective-address boundary verified; official ledger unchanged at 384/684.");
