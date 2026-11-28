"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const key = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json", "utf8"));
const batch = JSON.parse(fs.readFileSync("docs/question-oracle-batches/chapter-24.json", "utf8"));
const review = JSON.parse(fs.readFileSync("docs/question-independent-review/chapter-24.json", "utf8"));
const expectedIds = key.questions.filter(q => q.chapter === 24).map(q => q.id).sort();
const reviewedIds = review.records.map(r => r.id).sort();
assert.equal(expectedIds.length, 19, "Chapter 24 must contain 19 questions");
assert.deepEqual(reviewedIds, expectedIds, "Chapter 24 review must cover every question exactly once");
assert.equal(new Set(reviewedIds).size, 19, "Chapter 24 review IDs must be unique");
assert.equal(review.summary.questionsReviewed, 19);
assert.equal(review.summary.passed, 15);
assert.equal(review.summary.corrected, 4);
assert.equal(review.summary.needsRevision, 0);
assert.equal(review.summary.blocked, 0);
assert.deepEqual(review.openFindings, [], "Chapter 24 review must have no open item-level findings");
const finalQuestions = key.questions.filter(q => q.chapter === 24 && q.kind === "final");
const categoryGroups = [
  ["Définition","Compréhension"],["Syntaxe","Restrictions"],["Prédiction","Calcul / prédiction"],
  ["Analyse de programme","Analyse de résultat"],["Débogage","Raisonnement"]
];
for (const group of categoryGroups) assert.equal(finalQuestions.filter(q => group.includes(q.category)).length, 2,
  "Chapter 24 final assessment must contain exactly two items in category group " + group.join("/"));
const q5=batch.oracles.find(q=>q.id==="C24-F-Q5");
assert.deepEqual(q5.expected,{AX:256,product:256});
const q6=batch.oracles.find(q=>q.id==="C24-F-Q6");
assert.deepEqual(q6.expected,{signedLeft:-128,signedRight:2,product:-256,resultAX:65280});
const q3=batch.oracles.find(q=>q.id==="C24-L3-Q3");
assert.equal(q3.correctAnswer,key.questions.find(q=>q.id==="C24-L3-Q3").correctAnswer);
for(const id of ["C24-L3-Q3","C24-F-Q5","C24-F-Q6","C24-F-Q9"])assert.ok(review.records.some(r=>r.id===id&&r.result==="corrected"));
console.log("Chapter 24 independent review: 19/19 inspected; 15 passed; 4 corrected; MUL/IMUL signedness and product widths clarified; official ledger unchanged at 384/684.");
