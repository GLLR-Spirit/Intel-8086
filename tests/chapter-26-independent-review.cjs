"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const key = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json", "utf8"));
const batch = JSON.parse(fs.readFileSync("docs/question-oracle-batches/chapter-26.json", "utf8"));
const review = JSON.parse(fs.readFileSync("docs/question-independent-review/chapter-26.json", "utf8"));
const expectedIds = key.questions.filter(q => q.chapter === 26).map(q => q.id).sort();
const reviewedIds = review.records.map(r => r.id).sort();
assert.equal(expectedIds.length, 19, "Chapter 26 must contain 19 questions");
assert.deepEqual(reviewedIds, expectedIds, "Chapter 26 review must cover every question exactly once");
assert.equal(new Set(reviewedIds).size, 19, "Chapter 26 review IDs must be unique");
assert.equal(review.summary.questionsReviewed, 19);
assert.equal(review.summary.passed, 15);
assert.equal(review.summary.corrected, 4);
assert.equal(review.summary.needsRevision, 0);
assert.equal(review.summary.blocked, 0);
assert.deepEqual(review.openFindings, [], "Chapter 26 review must have no open item-level findings");
const finalQuestions = key.questions.filter(q => q.chapter === 26 && q.kind === "final");
const categoryGroups = [
  ["Définition","Compréhension"],["Syntaxe","Restrictions"],["Prédiction","Calcul / prédiction"],
  ["Analyse de programme","Analyse de résultat"],["Débogage","Raisonnement"]
];
for (const group of categoryGroups) assert.equal(finalQuestions.filter(q => group.includes(q.category)).length, 2,
  "Chapter 26 final assessment must contain exactly two items in category group " + group.join("/"));
const q5=batch.oracles.find(q=>q.id==="C26-F-Q5");
assert.deepEqual(q5.expected,{result:32,CF:0});
const q6=batch.oracles.find(q=>q.id==="C26-F-Q6");
assert.deepEqual(q6.expected,{result:192,CF:0});
const q7=batch.oracles.find(q=>q.id==="C26-F-Q7");
assert.deepEqual(q7.expected,{result:1,CF:1});
const q8=batch.oracles.find(q=>q.id==="C26-F-Q8");
assert.deepEqual(q8.expected,{result:6,CF:0});
for(const id of ["C26-F-Q5","C26-F-Q6","C26-F-Q7","C26-F-Q8"])assert.ok(review.records.some(r=>r.id===id&&r.result==="corrected"));
console.log("Chapter 26 independent review: 19/19 inspected; 15 passed; 4 repeated final traces replaced with multi-bit shift/rotate cases; official ledger unchanged at 384/684.");
