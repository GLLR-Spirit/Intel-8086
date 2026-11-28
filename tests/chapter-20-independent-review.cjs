"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const key = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json", "utf8"));
const batch = JSON.parse(fs.readFileSync("docs/question-oracle-batches/chapter-20.json", "utf8"));
const review = JSON.parse(fs.readFileSync("docs/question-independent-review/chapter-20.json", "utf8"));
const expectedIds = key.questions.filter(q => q.chapter === 20).map(q => q.id).sort();
const reviewedIds = review.records.map(r => r.id).sort();
assert.equal(expectedIds.length, 19, "Chapter 20 must contain 19 questions");
assert.deepEqual(reviewedIds, expectedIds, "Chapter 20 review must cover every question exactly once");
assert.equal(new Set(reviewedIds).size, 19, "Chapter 20 review IDs must be unique");
assert.equal(review.summary.questionsReviewed, 19);
assert.equal(review.summary.passed, 16);
assert.equal(review.summary.corrected, 3);
assert.equal(review.summary.needsRevision, 0);
assert.equal(review.summary.blocked, 0);
assert.deepEqual(review.openFindings, [], "Chapter 20 review must have no open item-level findings");
const finalQuestions = key.questions.filter(q => q.chapter === 20 && q.kind === "final");
const categoryGroups = [
  ["Définition","Compréhension"],["Syntaxe","Restrictions"],["Prédiction","Calcul / prédiction"],
  ["Analyse de programme","Analyse de résultat"],["Débogage","Raisonnement"]
];
for (const group of categoryGroups) assert.equal(finalQuestions.filter(q => group.includes(q.category)).length, 2,
  "Chapter 20 final assessment must contain exactly two items in category group " + group.join("/"));
for (const id of ["C20-L3-Q3","C20-F-Q5","C20-F-Q8"]) assert.ok(review.records.some(r => r.id === id && r.result === "corrected"));
const f5 = batch.oracles.find(q => q.id === "C20-F-Q5");
assert.equal(f5.correctAnswer, "CX");
const f8 = batch.oracles.find(q => q.id === "C20-F-Q8");
assert.equal(f8.rule, "push_word_semantics");
assert.deepEqual(f8.expected, {finalSP:254,storedValue:4660,segment:"SS"});
assert.equal(f8.correctAnswer, "SS:00FEh");
console.log("Chapter 20 independent review: 19/19 inspected; 16 passed; 3 corrected; stack-order ambiguity and pre-decrement address verified; official ledger unchanged at 384/684.");
