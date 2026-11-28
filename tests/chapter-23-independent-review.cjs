"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const key = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json", "utf8"));
const batch = JSON.parse(fs.readFileSync("docs/question-oracle-batches/chapter-23.json", "utf8"));
const review = JSON.parse(fs.readFileSync("docs/question-independent-review/chapter-23.json", "utf8"));
const expectedIds = key.questions.filter(q => q.chapter === 23).map(q => q.id).sort();
const reviewedIds = review.records.map(r => r.id).sort();
assert.equal(expectedIds.length, 19, "Chapter 23 must contain 19 questions");
assert.deepEqual(reviewedIds, expectedIds, "Chapter 23 review must cover every question exactly once");
assert.equal(new Set(reviewedIds).size, 19, "Chapter 23 review IDs must be unique");
assert.equal(review.summary.questionsReviewed, 19);
assert.equal(review.summary.passed, 17);
assert.equal(review.summary.corrected, 2);
assert.equal(review.summary.needsRevision, 0);
assert.equal(review.summary.blocked, 0);
assert.deepEqual(review.openFindings, [], "Chapter 23 review must have no open item-level findings");
const finalQuestions = key.questions.filter(q => q.chapter === 23 && q.kind === "final");
const categoryGroups = [
  ["Définition","Compréhension"],["Syntaxe","Restrictions"],["Prédiction","Calcul / prédiction"],
  ["Analyse de programme","Analyse de résultat"],["Débogage","Raisonnement"]
];
for (const group of categoryGroups) assert.equal(finalQuestions.filter(q => group.includes(q.category)).length, 2,
  "Chapter 23 final assessment must contain exactly two items in category group " + group.join("/"));
const f5=batch.oracles.find(q=>q.id==="C23-F-Q5");
assert.deepEqual(f5.expected,{finalAX:65534});
assert.equal(f5.correctAnswer,"FFFEh");
const f6=batch.oracles.find(q=>q.id==="C23-F-Q6");
assert.deepEqual(f6.expected,{AX:10,sum:10});
assert.equal(f6.correctAnswer,"000Ah");
for(const id of ["C23-F-Q5","C23-F-Q6"])assert.ok(review.records.some(r=>r.id===id&&r.result==="corrected"));
console.log("Chapter 23 independent review: 19/19 inspected; 17 passed; 2 duplicate final items replaced with overflow and parameter-contract cases; official ledger unchanged at 384/684.");
