"use strict";
const fs=require("node:fs"); const assert=require("node:assert/strict");
const key=JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json","utf8"));
const batch=JSON.parse(fs.readFileSync("docs/question-oracle-batches/chapter-29.json","utf8"));
const review=JSON.parse(fs.readFileSync("docs/question-independent-review/chapter-29.json","utf8"));
const ids=key.questions.filter(q=>q.chapter===29).map(q=>q.id).sort();
assert.equal(ids.length,19); assert.deepEqual(review.records.map(r=>r.id).sort(),ids);
assert.equal(new Set(review.records.map(r=>r.id)).size,19);
assert.deepEqual(review.summary,{questionsReviewed:19,passed:16,corrected:3,needsRevision:0,blocked:0,officialCertificationCountBefore:384,officialCertificationCountAfter:384,remainingOfficialCertification:300});
assert.deepEqual(review.openFindings,[]);
const finals=key.questions.filter(q=>q.chapter===29&&q.kind==="final");
for(const group of [["Définition","Compréhension"],["Syntaxe","Restrictions"],["Prédiction","Calcul / prédiction"],["Analyse de programme","Analyse de résultat"],["Débogage","Raisonnement"]]) assert.equal(finals.filter(q=>group.includes(q.category)).length,2);
for(const id of ["C29-F-Q5","C29-F-Q6","C29-F-Q8"]) {assert.ok(review.records.some(r=>r.id===id&&r.result==="corrected"));assert.equal(batch.oracles.find(o=>o.id===id).correctAnswer,key.questions.find(q=>q.id===id).correctAnswer);}
assert.equal(batch.oracles.find(o=>o.id==="C29-F-Q5").expected.hex,"0084h");
assert.equal(batch.oracles.find(o=>o.id==="C29-F-Q6").expected.finalSPHex,"0FFAh");
assert.equal(batch.oracles.find(o=>o.id==="C29-F-Q8").expected.IPHex,"1234h");
console.log("Chapter 29 independent review: 19/19 inspected; 16 passed; 3 pedagogical corrections; final assessment balanced; official ledger unchanged at 384/684.");
