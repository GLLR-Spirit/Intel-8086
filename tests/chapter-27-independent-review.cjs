"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const key = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json", "utf8"));
const batch = JSON.parse(fs.readFileSync("docs/question-oracle-batches/chapter-27.json", "utf8"));
const review = JSON.parse(fs.readFileSync("docs/question-independent-review/chapter-27.json", "utf8"));
const expectedIds = key.questions.filter(q => q.chapter === 27).map(q => q.id).sort();
const reviewedIds = review.records.map(r => r.id).sort();
assert.equal(expectedIds.length, 19, "Chapter 27 must contain 19 questions");
assert.deepEqual(reviewedIds, expectedIds, "Chapter 27 review must cover every question exactly once");
assert.equal(new Set(reviewedIds).size, 19, "Chapter 27 review IDs must be unique");
assert.equal(review.summary.questionsReviewed, 19);
assert.equal(review.summary.passed, 15);
assert.equal(review.summary.corrected, 4);
assert.equal(review.summary.needsRevision, 0);
assert.equal(review.summary.blocked, 0);
assert.deepEqual(review.openFindings, [], "Chapter 27 review must have no open item-level findings");
const finalQuestions = key.questions.filter(q => q.chapter === 27 && q.kind === "final");
const categoryGroups = [
  ["Définition","Compréhension"],["Syntaxe","Restrictions"],["Prédiction","Calcul / prédiction"],
  ["Analyse de programme","Analyse de résultat"],["Débogage","Raisonnement"]
];
for (const group of categoryGroups) assert.equal(finalQuestions.filter(q => group.includes(q.category)).length, 2,
  "Chapter 27 final assessment must contain exactly two items in category group " + group.join("/"));
const f5=batch.oracles.find(q=>q.id==="C27-F-Q5");
assert.deepEqual(f5.expected,{SI:255,DI:511});
const f6=batch.oracles.find(q=>q.id==="C27-F-Q6");
assert.equal(f6.rule,"stosb_index_update");
assert.deepEqual(f6.expected,{DI:65535});
const f7=batch.oracles.find(q=>q.id==="C27-F-Q7");
assert.deepEqual(f7.expected,{ZF:0,equal:false});
const f9=batch.oracles.find(q=>q.id==="C27-F-Q9");
assert.equal(f9.inputs.override,"CS");
assert.equal(f9.expected.sourceSegment,"CS");
for(const id of ["C27-F-Q5","C27-F-Q6","C27-F-Q7","C27-F-Q9"])assert.ok(review.records.some(r=>r.id===id&&r.result==="corrected"));
console.log("Chapter 27 independent review: 19/19 inspected; 15 passed; 4 corrected; DF directions, SCASB mismatch and 8086-valid segment override verified; official ledger unchanged at 384/684.");
