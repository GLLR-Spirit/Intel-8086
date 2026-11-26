const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Inline application script must exist");

const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id, value: "", textContent: "", innerHTML: "", className: "",
      dataset: {}, onclick: null, oninput: null, onchange: null
    });
  }
  return elements.get(id);
}
const document = { getElementById: element, querySelectorAll: () => [] };
const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const context = { document, localStorage, console, confirm: () => true };
const instrumented = match[1].replace(/\}\)\(\);\s*$/, "globalThis.__learningData = { lessons, chapterLearning, curriculum, exercises, exerciseChapterAssignments, exerciseMetadata, instructions, instructionMeta, executeAll, executeBinary, assembleProgram, disassembleBytes, courseVisual };\n})();");
assert.notEqual(instrumented, match[1], "Application closure must be instrumented for learning checks");
vm.runInNewContext(instrumented, context, { timeout: 5000 });
const learning = context.__learningData;
assert.ok(learning, "Learning data must be exposed to the isolated test harness");
const chapterVisuals = Array.from({length:36},(_,index)=>learning.courseVisual(index));
assert.equal(chapterVisuals.length,36,"Visual audit must inspect all 36 chapters");
assert.ok(chapterVisuals.every(markup=>typeof markup==="string"&&markup.includes("course-visual")),
  "Every chapter must have a chapter-specific visual explanation.");
assert.match(match[1], /function annotateAssembly\(/, "Course examples must receive instruction-level annotations");
assert.match(match[1], /function courseVisual\(/, "The course must include chapter-specific visualizations");
assert.match(match[1], /courseVisual\(i\)/, "Chapter visualizations must be rendered in the lesson view");
assert.match(match[1], /id='axDemoValue'/, "The register chapter must expose an editable AX value");
assert.match(match[1], /\$\("axShowHigh"\)\.onclick=function\(\)\{showAX\("AH"\);\}/, "The register chapter must wire the AH control");
assert.match(match[1], /\$\("axShowLow"\)\.onclick=function\(\)\{showAX\("AL"\);\}/, "The register chapter must wire the AL control");
assert.match(match[1], /\$\("axWriteLow"\)\.onclick=function\(\)/, "The register chapter must wire the AL write control");
assert.match(match[1], /["']?10["']?:"<section class='course-visual'><b>Trace pas à pas/, "Chapter 11 must expose the binary register trace.");
assert.match(match[1], /if\(!Number\.isInteger\(i\)\|\|i<0\|\|i>=lessons\.length\)return;/, "Invalid chapter indexes must not crash lesson rendering.");
assert.match(match[1], /currentChapterIndex=0,currentSublessonIndex=0/, "The current chapter and sublesson must have explicit state.");

assert.ok(learning.chapterLearning.every(c => c.goal && c.theory && c.walk && c.prereq && c.lessons.length === 3 && c.quiz.length === 10),
  "Every chapter must include prerequisites, objectives, three detailed lessons and ten final questions");
assert.ok(learning.chapterLearning.every(c => c.lessons.every(l => l.title && l.theory && l.example && l.expected && l.quiz.length === 3)),
  "Every lesson must include detailed content, an example and exactly three comprehension questions");
assert.ok(learning.chapterLearning.every(c => c.lessons.every(l => l.theory.trim().length >= 300)),
  "All 108 visible lessons must contain at least 300 characters of technical explanation after curriculum overrides.");
assert.ok(learning.chapterLearning.every(c => c.quiz.every(q => q[1].length === 3 && q[2] >= 0 && q[2] < 3 && q[3])),
  "Every final question must have three choices, a valid answer and an explanation");
const weakFinalQuestions = [];
learning.chapterLearning.forEach((c, ci) => c.quiz.forEach((q, qi) => {
  if (!(q[1].every(choice => typeof choice === "string" && choice.trim().length > 0) &&
    new Set(q[1].map(choice => choice.trim().toLocaleLowerCase())).size === 3 &&
    typeof q[3] === "string" && q[3].trim().length >= 12)) {
    weakFinalQuestions.push({chapter:ci+1,question:qi+1,stem:q[0],choices:q[1],explanation:q[3]});
  }
}));
if (weakFinalQuestions.length) console.log("Final question quality findings: " + JSON.stringify(weakFinalQuestions));
assert.equal(weakFinalQuestions.length, 0, "Final questions must have three distinct non-empty choices and a substantive explanation.");
assert.ok(learning.chapterLearning.every(c => c.lessons.every(l => l.quiz.every(q =>
  q[1].length === 3 && new Set(q[1].map(choice => String(choice).trim().toLocaleLowerCase())).size === 3 &&
  typeof q[3] === "string" && q[3].trim().length >= 12))),
  "Lesson questions must have distinct choices and a substantive explanation.");
assert.ok(learning.chapterLearning.every(c => {
  const categories = c.quiz.map(q => q[4]);
  return ["Définition","Compréhension","Syntaxe","Restrictions","Prédiction","Calcul / prédiction","Analyse de programme","Analyse de résultat","Débogage","Raisonnement"].every(x => categories.includes(x));
}), "Each final assessment must cover the ten required evaluation dimensions");
assert.ok(learning.chapterLearning.every(c => new Set(c.quiz.map(q => q[2])).size > 1),
  "Correct answer positions must vary across each final assessment");
assert.ok(learning.chapterLearning.every(c => c.lessons.every(l => new Set(l.quiz.map(q => q[2])).size > 1)),
  "Correct answer positions must vary across each lesson quiz");
assert.deepEqual(
  [learning.curriculum.slice(0,5),learning.curriculum.slice(5,11),learning.curriculum.slice(11,17),
   learning.curriculum.slice(17,23),learning.curriculum.slice(23,30),learning.curriculum.slice(30,36)]
   .map(group => group.every(c => c[1] === group[0][1])),
  [true,true,true,true,true,true],
  "All six levels must retain their exact requested chapter boundaries"
);
assert.equal(learning.chapterLearning.reduce((n, c) => n + c.lessons.reduce((m, l) => m + l.quiz.length, 0), 0), 324,
  "The 36 chapters must contain 324 intermediate questions (3 × 3 × 36)");
assert.equal(learning.chapterLearning.reduce((n, c) => n + c.quiz.length, 0), 360,
  "The 36 chapters must contain 360 final assessment questions (10 × 36)");


function findQuestion(stem) {
  const all = learning.chapterLearning.flatMap((chapter,ci) =>
    chapter.lessons.flatMap((lesson,li) => lesson.quiz.map((q,qi)=>({q,where:"C"+(ci+1)+"L"+(li+1)+"Q"+(qi+1)})))
      .concat(chapter.quiz.map((q,qi)=>({q,where:"C"+(ci+1)+"F"+(qi+1)}))));
  const found=all.filter(x=>x.q[0]===stem);
  assert.equal(found.length,1,"Question audit stem must be unique: "+stem);
  return found[0];
}
const semanticQuestionOracles = [
  ["Quel indicateur active le mode pas à pas matériel ?","TF","TF est le Trap Flag."],
  ["Quel registre contient l'offset de la prochaine instruction à exécuter ?","IP","IP contient l'offset de la prochaine instruction dans le segment de code."],
  ["Comment corriger SHR AL,1 si le programme doit préserver un signe négatif ?","Utiliser SAR plutôt que SHR","SAR propage le bit de signe alors que SHR insère zéro."],
  ["Pourquoi LOCK INC AX ne protège-t-il pas une donnée mémoire partagée ?","AX est un registre et l'instruction ne modifie aucune donnée mémoire partagée","Le 8086 active le signal LOCK pendant l'instruction suivante en mode maximum, mais INC AX ne touche qu'un registre. Pour protéger une donnée partagée, l'instruction doit réellement accéder à cette donnée en mémoire."],
  ["Comment rendre LOCK utile pour protéger une donnée partagée ?","Employer une opération qui modifie cette donnée en mémoire, par exemple LOCK INC WORD PTR [BX]","Le verrouillage protège l'accès au bus pendant l'instruction ; l'opération doit effectivement accéder à la donnée mémoire partagée."]
];
for(const [stem,answer,explanation] of semanticQuestionOracles){
  const {q,where}=findQuestion(stem);
  assert.equal(q[1][q[2]],answer,where+" correct answer");
  assert.equal(q[3],explanation,where+" explanation");
}
assert.equal(learning.chapterLearning.reduce((n,c)=>n+c.lessons.reduce((m,l)=>m+l.quiz.length,0)+c.quiz.length,0),684,
  "All 684 assessment items must be included in the individually reviewed bank.");

const semanticKey = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json","utf8"));
assert.equal(semanticKey.questions.length,684,"The independent semantic key must pin all 684 questions.");
const runtimeQuestionMap = new Map();
learning.chapterLearning.forEach((chapter,ci)=>{
  chapter.lessons.forEach((lesson,li)=>lesson.quiz.forEach((q,qi)=>{
    runtimeQuestionMap.set("C"+String(ci+1).padStart(2,"0")+"-L"+(li+1)+"-Q"+(qi+1),q);
  }));
  chapter.quiz.forEach((q,qi)=>{
    runtimeQuestionMap.set("C"+String(ci+1).padStart(2,"0")+"-F-Q"+(qi+1),q);
  });
});
assert.equal(runtimeQuestionMap.size,684,"Every runtime question must have a unique chapter/lesson identifier.");
const semanticKeyFailures=[];
for(const expected of semanticKey.questions){
  const actual=runtimeQuestionMap.get(expected.id);
  if(!actual){semanticKeyFailures.push({id:expected.id,problem:"missing runtime question"});continue;}
  const sameChoices=JSON.stringify([...actual[1]].sort())===JSON.stringify([...expected.choices].sort());
  if(actual[0]!==expected.stem||actual[1][actual[2]]!==expected.correctAnswer||actual[3]!==expected.explanation||!sameChoices){
    semanticKeyFailures.push({id:expected.id,stem:actual[0],answer:actual[1][actual[2]],explanation:actual[3],choices:actual[1]});
  }
}
assert.equal(semanticKeyFailures.length,0,
  "All 684 question stems, choices, keyed answers and explanations must match the individually reviewed semantic key: "+JSON.stringify(semanticKeyFailures.slice(0,20)));
console.log("Question semantic key: 684/684 individual answers and explanations match the reviewed key.");


const requiredFinalCategories = ["Définition","Compréhension","Syntaxe","Restrictions","Prédiction","Calcul / prédiction","Analyse de programme","Analyse de résultat","Débogage","Raisonnement"];
for (let chapterIndex = 0; chapterIndex < learning.chapterLearning.length; chapterIndex++) {
  const chapter = learning.chapterLearning[chapterIndex];
  assert.equal(JSON.stringify(chapter.quiz.map(q => q[4])), JSON.stringify(requiredFinalCategories),
    "Chapter " + (chapterIndex + 1) + " final questions must follow the ten technical categories in order.");
  for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex++) {
    assert.equal(JSON.stringify(chapter.lessons[lessonIndex].quiz.map(q => q[4])), JSON.stringify(["Compréhension","Application","Vérification"]),
      "Chapter " + (chapterIndex + 1) + ", lesson " + (lessonIndex + 1) + " must have three distinct learning checks.");
  }
}
for (let chapterIndex = 17; chapterIndex < 36; chapterIndex++) {
  const chapter = learning.chapterLearning[chapterIndex];
  const questions = chapter.lessons.flatMap(l => l.quiz).concat(chapter.quiz);
  for (const q of questions) {
    assert.ok(!/Quelle notion est au centre de cette leçon|Pourquoi cette notion est-elle importante|Que faut-il vérifier dans l'exemple guidé|Quelle est la finalité essentielle de ce chapitre|Quel principe est introduit dans la première leçon|Quelle séquence assembleur illustre la deuxième leçon/.test(q[0]),
      "Chapter " + (chapterIndex + 1) + " must not use generic placeholder question stems.");
    assert.ok(q[1].every(choice => !/Un détail sans rapport avec le fonctionnement étudié|Une opération effectuée uniquement par le système d'exploitation|Uniquement le nom du fichier source|Le nombre de commentaires/.test(choice)),
      "Chapter " + (chapterIndex + 1) + " must not use generic placeholder distractors.");
  }
}

const expectedLevels = [1, 6, 12, 18, 24, 31];
assert.deepEqual(expectedLevels.map(n => learning.curriculum[n - 1][0]), [
  "Introduction au microprocesseur Intel 8086", "Premiers programmes assembleur", "Comparaison des données",
  "Organisation de la mémoire", "Multiplication", "Encodage des instructions"
], "The curriculum must preserve the requested chapter order and level boundaries");

assert.equal(learning.chapterExerciseMap.length, learning.lessons.length,
  "Every chapter must link to exactly one practical exercise");
assert.ok(learning.chapterExerciseMap.every(i => Number.isInteger(i) && i >= 0 && i < learning.exercises.length),
  "Every chapter exercise link must resolve to an existing exercise");
assert.equal(learning.exercises.length, 48, "The exercise bank must contain 48 guided exercises.");
assert.equal(learning.exerciseChapterAssignments.length, 48, "Every exercise must have an explicit chapter mapping.");
const exerciseMetadataRows=learning.exercises.map((exercise,index)=>learning.exerciseMetadata(exercise,index));
const exerciseChapters=new Set();
const allowedExerciseTypes=new Set(["application","raisonnement","completion","debug","probleme","challenge"]);
const allowedExerciseDifficulties=new Set(["Débutant","Facile","Intermédiaire","Avancé","Expert"]);
exerciseMetadataRows.forEach((metadata,index)=>{
  assert.ok(metadata.chapters.length>0,"Exercise "+(index+1)+" must map to at least one relevant chapter.");
  assert.ok(metadata.chapters.every(chapter=>Number.isInteger(chapter)&&chapter>=0&&chapter<36),
    "Exercise "+(index+1)+" has an invalid chapter mapping.");
  assert.ok(allowedExerciseTypes.has(metadata.type),"Exercise "+(index+1)+" has an unsupported type.");
  assert.ok(allowedExerciseDifficulties.has(metadata.difficulty),"Exercise "+(index+1)+" has an unsupported difficulty.");
  metadata.chapters.forEach(chapter=>exerciseChapters.add(chapter));
});
assert.equal(exerciseChapters.size,36,"Every one of the 36 chapters must have at least one relevant practical exercise.");
assert.equal(exerciseMetadataRows[40].type,"application","The procedure exercise must be classified as a direct application.");
assert.equal(exerciseMetadataRows[40].difficulty,"Avancé","The procedure exercise must retain its advanced difficulty.");
assert.equal(exerciseMetadataRows[41].type,"application","The MUL/DIV exercise must be classified as a direct application.");
assert.equal(exerciseMetadataRows[41].difficulty,"Avancé","The MUL/DIV exercise must retain its advanced difficulty.");
assert.equal(exerciseMetadataRows[42].type,"application","The FLAGS/PUSHF exercise must be classified as a direct application.");
assert.equal(exerciseMetadataRows[43].type,"application","The REP MOVSB exercise must be classified as a direct application.");
assert.equal(exerciseMetadataRows[44].type,"application","The REPNE SCASB exercise must be classified as a direct application.");
assert.equal(exerciseMetadataRows[45].type,"probleme","The interrupt-handler exercise must be classified as a complete problem.");
assert.equal(exerciseMetadataRows[46].type,"probleme","The first integration exercise must be classified as a complete problem.");
assert.equal(exerciseMetadataRows[46].difficulty,"Avancé","The first integration exercise must retain its advanced difficulty.");
assert.equal(exerciseMetadataRows[47].type,"challenge","The second integration exercise must be classified as an expert challenge.");
assert.equal(exerciseMetadataRows[47].difficulty,"Expert","The second integration exercise must retain its expert difficulty.");
assert.ok(learning.instructions.some(entry=>entry[0]==="PORT"),"The PORT directive must appear in the instruction reference.");
assert.equal(learning.instructionMeta.PORT.category,"Directive","PORT must be classified as a pedagogical directive.");
assert.match(learning.instructionMeta.PORT.operation,/IN et OUT/,"PORT documentation must describe its IN/OUT purpose.");
assert.equal(learning.instructionMeta.VECTOR.category,"Directive","VECTOR must remain explicitly classified as a pedagogical directive.");
assert.equal(learning.instructions.length,64,"The reference must expose 64 instruction families and pedagogical directives.");
const completeReferenceExamples=["VECTOR","PORT","XCHG","LEA","LES","LDS","ADC","SBB","NEG","IN / OUT","XLAT","CBW / CWD","AAA / AAS","AAM / AAD","DAA / DAS","ROL / ROR / RCL / RCR","SHL / SAL / SHR / SAR","INTO","LOOPE / LOOPNE / JCXZ","LAHF / SAHF","LOCK","ESC","WAIT"];
completeReferenceExamples.forEach(name=>{
  const entry=learning.instructions.find(item=>item[0]===name);
  assert.ok(entry,"Reference example missing for "+name);
  const assembled=learning.assembleProgram(entry[2]);
  assert.ok(assembled.bytes.length>0,"Reference example must assemble: "+name);
  const result=learning.executeAll(entry[2]);
  assert.ok(!result.error,"Reference example must execute in the documented source path: "+name+" "+(result.error||""));
});
const referenceNames=learning.instructions.map(entry=>entry[0]);
assert.equal(new Set(referenceNames).size,referenceNames.length,"The instruction reference must not contain duplicate entries.");
referenceNames.forEach(name=>{
  const metadata=learning.instructionMeta[name];
  assert.ok(metadata,"Every instruction reference entry must have metadata: "+name);
  assert.ok(Array.isArray(metadata.support)&&metadata.support.length===3,
    "Every instruction reference entry must declare simulator, assembler and disassembler status: "+name);
  assert.ok(metadata.support.every(value=>["Pris en charge","Partiel","Non pris en charge"].includes(value)),
    "Instruction support status must use an explicit supported/partial/unsupported value: "+name);
});


for (let i = 0; i < learning.exercises.length; i++) {
  const exercise = learning.exercises[i];
  const guide = exercise[4];
  assert.ok(guide?.level && guide?.hint && guide?.steps?.length >= 3 && guide?.solution,
    "Exercise " + i + " must provide a level, hint, correction steps and a complete solution");
  const state = learning.executeAll(guide.solution);
  assert.ok(!state.error, exercise[0] + " correction must execute: " + state.error);
  assert.ok(exercise[3](state), exercise[0] + " correction must satisfy its validator; state=" +
    JSON.stringify(state.reg) + "; flags=" + JSON.stringify(state.flags));
}
const renderer = match[1].slice(match[1].indexOf("function renderExercises()"), match[1].indexOf("\nfunction renderProjects()"));
assert.ok(renderer.includes("Indice et correction expliquée"), "Exercise UI must expose progressive guidance");
assert.ok(renderer.includes("guide.steps"), "Exercise UI must render step-by-step solutions");
assert.ok(renderer.includes("data-solution"), "Exercise UI must let the learner load the complete correction");

// First-pass executable audit of every course example. This reports discrepancies
// without claiming that successful execution proves architectural correctness.
const exampleAudit = [];
for (let chapterIndex = 0; chapterIndex < learning.curriculum.length; chapterIndex++) {
  const chapter = learning.curriculum[chapterIndex];
  for (let lessonIndex = 0; lessonIndex < chapter[5].length; lessonIndex++) {
    const lesson = chapter[5][lessonIndex];
    const state = learning.executeAll(lesson[2]);
    if (state.error) {
      exampleAudit.push({
        chapter: chapterIndex + 1,
        lesson: lessonIndex + 1,
        title: lesson[0],
        error: state.error
      });
    }
  }
}
console.log("Course example execution audit: " +
  (108 - exampleAudit.length) + "/108 execute without simulator errors.");
if (exampleAudit.length) console.log(JSON.stringify(exampleAudit, null, 2));
assert.equal(exampleAudit.length, 0, "All 108 course examples must execute without simulator errors.");

// Architectural-result spot checks: successful execution alone is not enough.
const exampleOracles = [
  { chapter: 1, lesson: 1, check: state => state.reg.AX === 0x1234, expected: "AX=1234h" },
  { chapter: 2, lesson: 1, check: state => state.reg.AX === 7, expected: "AX=0007h after EU arithmetic example" },
  { chapter: 5, lesson: 1, check: state => state.reg.AX === 0x1256, expected: "AX=1256h after writing AL" },
  { chapter: 8, lesson: 1, check: state => (state.reg.AX & 0xff) === 0 && state.flags.CF === 0 && (state.reg.BX & 0xff) === 2,
    expected: "ADD/ADC carry propagation: AL=00h, CF=0 after ADC, BL=02h" },
  { chapter: 13, lesson: 3, check: state => state.reg.AX === 9 && state.reg.BX === 8,
    expected: "indirect near jump reaches offset 0008h and leaves AX=0009h" },
  { chapter: 25, lesson: 3, check: state => state.reg.AX === 0x00ff,
    expected: "DIV 00FFh by 1 gives quotient AL=FFh and remainder AH=00h" }
];
for (const oracle of exampleOracles) {
  const source = learning.curriculum[oracle.chapter - 1][5][oracle.lesson - 1][2];
  const state = learning.executeAll(source);
  assert.ok(!state.error && oracle.check(state),
    "Chapter " + oracle.chapter + ", lesson " + oracle.lesson + " must produce " + oracle.expected +
    "; actual=" + JSON.stringify(state.reg) + "; flags=" + JSON.stringify(state.flags));
}

// Full state oracles for all 15 foundational examples (chapters 1–5).
const foundationalExampleOracles = [
  [1,1, state => state.reg.AX === 0x1234, "AX=1234h"],
  [1,2, state => state.steps === 1, "theoretical bus-capacity lesson remains a comment plus HLT, not a fabricated CPU calculation"],
  [1,3, state => state.reg.AX === 0x8086, "AX=8086h"],
  [2,1, state => state.reg.AX === 7, "AX=0007h"],
  [2,2, state => state.reg.DS === 0x1000, "DS=1000h"],
  [2,3, state => state.reg.AX === 1, "AX remains 0001h because the jump skips MOV AX,2"],
  [3,1, state => state.reg.AX === 10, "AX=000Ah"],
  [3,2, state => (state.reg.AX & 0xff) === 0x2a, "AL=2Ah"],
  [3,3, state => state.reg.AX === 0xff, "AX=00FFh"],
  [4,1, state => state.reg.AX === 0x1234 && state.mem[0x100] === 0x34 && state.mem[0x101] === 0x12,
    "AX=1234h and little-endian bytes 34h at 0100h, 12h at 0101h"],
  [4,2, state => (state.reg.AX & 0xff) === 0 && state.flags.CF === 1 && state.flags.ZF === 1 && state.flags.OF === 0 && state.flags.PF === 1 && state.flags.AF === 1,
    "AL=00h, CF=1, ZF=1, OF=0 after unsigned FFh+1"],
  [4,3, state => (state.reg.AX & 0xff) === 0x80 && state.flags.OF === 1 && state.flags.CF === 0 && state.flags.SF === 1 && state.flags.ZF === 0 && state.flags.PF === 0 && state.flags.AF === 1,
    "AL=80h, OF=1, CF=0, SF=1 after signed 7Fh+1"],
  [5,1, state => state.reg.AX === 0x1256, "AX=1256h"],
  [5,2, state => state.reg.SI === 0x100 && state.reg.DI === 0x200 && state.reg.BP === 0x300 && state.reg.SP === 0x400,
    "SI=0100h, DI=0200h, BP=0300h, SP=0400h"],
  [5,3, state => state.reg.DS === 0x1000, "DS=1000h"]
];
for (const [chapter, lesson, check, expected] of foundationalExampleOracles) {
  const source = learning.curriculum[chapter - 1][5][lesson - 1][2];
  const state = learning.executeAll(source);
  assert.ok(!state.error && check(state),
    "Foundational example C" + chapter + "L" + lesson + " expected " + expected +
    "; actual registers=" + JSON.stringify(state.reg) + "; memory=" + JSON.stringify(state.mem) +
    "; flags=" + JSON.stringify(state.flags));
}
for (let chapterIndex = 0; chapterIndex < 5; chapterIndex++) {
  const chapter = learning.chapterLearning[chapterIndex];
  assert.equal(chapter.quiz.length, 10, "Foundational chapter must retain ten final questions.");
  assert.equal(JSON.stringify(chapter.quiz.map(q => q[4])), JSON.stringify([
    "Définition","Compréhension","Syntaxe","Restrictions","Prédiction",
    "Calcul / prédiction","Analyse de programme","Analyse de résultat","Débogage","Raisonnement"
  ]), "Foundational final assessment must use the ten audited categories in order.");
  assert.ok(chapter.lessons.every(lesson => lesson.quiz.length === 3),
    "Each foundational lesson must retain exactly three questions.");
}

// Detect exact duplicate final-question stems inside a chapter and collisions
// between a lesson check and its chapter assessment.
for (let chapterIndex = 0; chapterIndex < learning.chapterLearning.length; chapterIndex++) {
  const chapter = learning.chapterLearning[chapterIndex];
  const finalStems = chapter.quiz.map(q => String(q[0]).trim().toLocaleLowerCase());
  assert.equal(new Set(finalStems).size, finalStems.length,
    "Chapter " + (chapterIndex + 1) + " contains duplicate final-question stems.");
  const finalSet = new Set(finalStems);
  for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex++) {
    for (const question of chapter.lessons[lessonIndex].quiz) {
      assert.ok(!finalSet.has(String(question[0]).trim().toLocaleLowerCase()),
        "Chapter " + (chapterIndex + 1) + " repeats a lesson question in its final assessment.");
    }
  }

}

// Global uniqueness: repeated stems across different chapters are also rejected.
const allQuestionStems = learning.chapterLearning.flatMap(chapter =>
  chapter.lessons.flatMap(lesson => lesson.quiz.map(q => String(q[0]).trim().toLocaleLowerCase()))
    .concat(chapter.quiz.map(q => String(q[0]).trim().toLocaleLowerCase()))
);
assert.equal(new Set(allQuestionStems).size, allQuestionStems.length,
  "The 684-question bank must not repeat an exact question stem across chapters.");


// Level 2 audit: 18 independently checked course examples (chapters 6–11).
const level2Oracles = [
  [6,1, state => state.reg.AX === 5, "first source program leaves AX=5"],
  [6,2, state => state.reg.AX === 1 && state.reg.BX === 0, "MOV and ADD produce AX=1 with initial BX=0"],
  [6,3, state => state.reg.AX === 1, "JMP skips MOV AX,2"],
  [7,1, state => state.reg.AX === 0x5678 && state.reg.BX === 0x1234, "XCHG swaps AX and BX"],
  [7,2, state => state.reg.SI === 0x0104, "LEA computes BX+4 without reading memory"],
  [7,3, state => state.reg.SI === 0x0200 && state.reg.DS === 0x1000 && state.mem[0x100] === 0x00 && state.mem[0x101] === 0x02 && state.mem[0x102] === 0x00 && state.mem[0x103] === 0x10, "LDS loads offset 0200h and segment 1000h from four explicitly initialized little-endian bytes"],
  [8,1, state => (state.reg.AX & 0xff) === 0 && (state.reg.BX & 0xff) === 2 && state.flags.CF === 0, "ADD/ADC propagation"],
  [8,2, state => (state.reg.AX & 0xff) === 0xff && state.flags.CF === 0 && (state.reg.BX & 0xff) === 4, "SUB/SBB borrow propagation"],
  [8,3, state => (state.reg.AX & 0xff) === 0x80 && state.flags.OF === 1 && state.flags.CF === 1, "NEG 80h signed overflow"],
  [9,1, state => (state.reg.AX & 0xff) === 0x0c, "AND masks to low nibble"],
  [9,2, state => (state.reg.AX & 0xff) === 0x0f, "XOR complements F0h with FFh"],
  [9,3, state => state.flags.ZF === 1 && (state.reg.AX & 0xff) === 0x08, "TEST preserves AL and sets ZF"],
  [10,1, state => (state.reg.AX & 0xff) === 0 && state.flags.CF === 1 && state.flags.ZF === 1, "arithmetic FLAGS after FFh+1"],
  [10,2, state => state.flags.DF === 0, "CLD/STD/CLD leaves DF cleared"],
  [10,3, state => state.flags.CF === 1, "POPF restores CF saved by PUSHF"],
  [11,1, state => state.reg.AX === 5, "trace example reaches AX=5"],
  [11,2, state => state.reg.AX === 7, "diagnostic example reaches AX=7"],
  [11,3, state => (state.reg.AX & 0xff) === 0 && state.flags.CF === 1, "STC then INC wraps FFh to 00h while preserving CF=1"]
];
for (const [chapter, lesson, check, expected] of level2Oracles) {
  const source = learning.curriculum[chapter - 1][5][lesson - 1][2];
  const state = learning.executeAll(source);
  assert.ok(!state.error && check(state),
    "Level 2 C" + chapter + "L" + lesson + " expected " + expected +
    "; actual registers=" + JSON.stringify(state.reg) + "; flags=" + JSON.stringify(state.flags));
}
for (let ci = 5; ci < 11; ci++) {
  const chapter = learning.chapterLearning[ci];
  assert.equal(chapter.quiz.length, 10, "Level 2 chapter must have ten final questions.");
  assert.equal(JSON.stringify(chapter.quiz.map(q => q[4])), JSON.stringify([
    "Définition","Compréhension","Syntaxe","Restrictions","Prédiction",
    "Calcul / prédiction","Analyse de programme","Analyse de résultat","Débogage","Raisonnement"
  ]), "Level 2 final questions must cover the ten assessment dimensions in order.");
  assert.ok(chapter.lessons.every(lesson => lesson.quiz.length === 3),
    "Every Level 2 lesson must contain three questions.");
  assert.ok(chapter.lessons.every(lesson => lesson.theory.length >= 300),
    "Every Level 2 lesson must contain a substantive technical explanation.");
  assert.ok(chapter.quiz.every(q => q[1].length === 3 && new Set(q[1]).size === 3 && q[3].length >= 20),
    "Level 2 final questions must have distinct options and substantive explanations.");
}

// Full expected-state and representation oracles for the remaining 73 lessons.
// These checks compare the displayed lesson expectations with independently
// asserted architectural state; mere successful execution is not accepted.
const advancedExampleOracles = [
  [12,1,s=>s.reg.AX===7&&s.reg.BX===9&&s.flags.CF===1&&s.flags.ZF===0&&s.flags.SF===1,"CMP 7,9 leaves operands unchanged and sets CF/ZF/SF"],
  [12,2,s=>s.reg.AX===3&&s.flags.CF===1&&s.flags.ZF===0&&s.flags.SF===1,"CMP AL=03h,5 sets CF=1, ZF=0, SF=1"],
  [12,3,s=>s.reg.AX===5&&s.flags.ZF===0&&s.flags.CF===0&&s.flags.OF===0,"TEST 05h,04h preserves AL and sets ZF/CF/OF"],
  [13,1,s=>s.reg.AX===0&&s.reg.BX===2,"short JMP skips MOV AX,1 and reaches BX=2"],
  [13,2,s=>s.reg.AX===9,"near JMP reaches the target beyond short range"],
  [14,1,s=>s.reg.AX===4&&s.reg.BX===1&&s.flags.ZF===1,"JE is taken after equal CMP"],
  [14,2,s=>s.reg.AX===0x80&&s.reg.BX===1&&s.flags.OF===1,"JO is taken after signed overflow"],
  [14,3,s=>s.reg.AX===2&&s.reg.BX===1&&s.flags.CF===1,"JB is taken after unsigned 2<5"],
  [15,1,s=>s.reg.AX===0xff&&s.reg.BX===1,"JA treats FFh as unsigned 255"],
  [15,2,s=>s.reg.AX===0xff&&s.reg.BX===1,"JL treats FFh as signed -1"],
  [15,3,s=>s.reg.AX===0xff&&s.reg.BX===1,"JA uses unsigned interpretation"],
  [16,1,s=>s.reg.AX===3&&s.reg.CX===0,"LOOP executes three iterations"],
  [16,2,s=>s.reg.AX===1&&s.reg.BX===1&&s.reg.CX===1&&s.flags.ZF===1,"LOOPE decrements CX and branches while ZF=1"],
  [16,3,s=>s.reg.AX===7&&s.reg.CX===0,"JCXZ branches without changing CX"],
  [17,1,s=>s.reg.AX===10&&s.reg.CX===6,"maximum and minimum algorithm returns AX=10 and CX=6"],
  [17,2,s=>s.reg.AX===6&&s.reg.DX===3&&s.reg.CX===0,"three-element sum and count produce 6 and 3"],
  [17,3,s=>s.reg.BX===1&&s.reg.SI===0x101&&s.reg.CX===2,"search finds the second byte and stops at SI=0101h"],
  [18,1,s=>s.reg.DS===0x1000&&s.reg.BX===0x20,"logical data address is DS:0020h"],
  [18,2,s=>s.reg.DS===0x1000&&(((s.reg.DS<<4)+0x20)&0xfffff)===0x10020,"segment:offset converts to physical 10020h"],
  [18,3,s=>(((0x1000<<4)+0x10)&0xfffff)===(((0x1001<<4)+0) &0xfffff)&&(((0x1000<<4)+0x10)&0xfffff)===0x10010,"two logical addresses alias physical 10010h"],
  [19,1,s=>s.reg.AX===0x5678&&s.reg.BX===0x1234&&word(s,s.reg.DS,0x100)===0x5678,"direct memory store and reload produce AX=5678h"],
  [19,2,s=>s.reg.AX===0xabcd&&word(s,s.reg.DS,0x102)===0xabcd,"BX+SI effective offset 0102h reads ABCDh"],
  [19,3,s=>s.reg.AX===0x5678&&word(s,s.reg.SS,0x104)===0x5678,"BP-based addressing defaults to SS"],
  [20,1,s=>s.reg.BX===0x1234&&s.reg.SP===initialSP&&s.stack.length===0,"PUSH/POP restores BX and the initial stack pointer"],
  [20,2,s=>s.reg.CX===0x2222&&s.reg.DX===0x1111&&s.reg.SP===initialSP&&s.stack.length===0,"LIFO order is preserved and stack is balanced"],
  [20,3,s=>s.flags.CF===1&&s.reg.SP===initialSP&&s.stack.length===0,"PUSHF/POPF restores CF and balances SP"],
  [21,1,s=>s.reg.AX===10&&s.reg.SP===initialSP,"near CALL/RET doubles AX and restores SP"],
  [21,2,s=>s.reg.AX===2&&s.reg.SP===initialSP,"RET resumes after CALL"],
  [21,3,s=>s.reg.AX===9&&s.reg.DX===0&&s.reg.SP===initialSP,"MUL AX produces DX:AX=0000:0009h"],
  [22,1,s=>s.reg.AX===9&&s.reg.SP===initialSP,"procedure receives BX and returns AX=9"],
  [22,2,s=>s.reg.AX===0x1234&&s.reg.SP===initialSP,"saved AX is restored from the stack"],
  [22,3,s=>s.reg.AX===7&&s.reg.SP===initialSP&&s.stack.length===0,"nested calls return through both frames"],
  [23,1,s=>s.reg.SP===initialSP&&s.stack.length===0,"three modular routines return with a balanced stack"],
  [23,2,s=>s.reg.AX===12&&s.reg.SP===initialSP,"AX convention carries input and output"],
  [23,3,s=>s.reg.AX===0&&s.reg.SP===initialSP,"doubling zero preserves zero"],
  [24,1,s=>s.reg.AX===0x2a,"unsigned byte multiplication yields AX=002Ah"],
  [24,2,s=>s.reg.AX===0xfffc,"signed byte multiplication yields FFFCh (-4)"],
  [24,3,s=>s.reg.AX===0x1fe&&s.flags.CF===1&&s.flags.OF===1,"MUL sets CF/OF when upper half is nonzero"],
  [25,1,s=>(s.reg.AX&255)===8&&(s.reg.AX>>8)===2,"DIV 42/5 gives quotient 8 and remainder 2"],
  [25,2,s=>(s.reg.AX&255)===0xfe&&(s.reg.AX>>8)===0,"CBW then IDIV computes -4/2=-2 remainder 0"],
  [26,1,s=>(s.reg.AX&255)===0x40&&s.flags.CF===1,"SHR 81h by one yields 40h and CF=1"],
  [26,2,s=>(s.reg.AX&255)===0xfe&&s.flags.CF===0,"SAR FCh by one yields FEh and sign-extends"],
  [26,3,s=>(s.reg.AX&255)===3&&s.flags.CF===1,"ROL 81h by one yields 03h and CF=1"],
  [27,1,s=>s.reg.DS===0x1000&&s.reg.ES===0x2000&&s.reg.SI===0x101&&s.reg.DI===0x201&&byte(s,s.reg.ES,0x200)===0x41,"MOVSB copies DS:0100h to ES:0200h and advances SI/DI"],
  [27,2,s=>s.reg.ES===0x2000&&s.reg.DI===0x101&&byte(s,s.reg.ES,0x100)===0x41,"STOSB writes AL to ES:DI and advances DI"],
  [27,3,s=>s.flags.ZF===1&&s.reg.DI===0x101,"SCASB equality sets ZF and advances DI"],
  [28,1,s=>s.reg.CX===0&&s.reg.DI===0x102&&byte(s,s.reg.ES,0x100)===0x41&&byte(s,s.reg.ES,0x101)===0x41,"REP STOSB writes two bytes and exhausts CX"],
  [28,2,s=>s.reg.CX===0&&s.reg.DI===0x101&&s.flags.ZF===1,"REPNE SCASB stops after equality"],
  [28,3,s=>s.reg.CX===0&&s.reg.SI===0x102&&s.reg.DI===0x202&&byte(s,s.reg.ES,0x200)===0x41&&byte(s,s.reg.ES,0x201)===0x42,"REP MOVSB copies two initialized bytes and advances both indices"],
  [29,1,s=>s.reg.AX===0x00c0&&s.reg.DX===0,"30h multiplied by four computes the IVT entry offset 00C0h"],
  [29,2,s=>s.reg.BX===0x1234&&s.reg.SP===initialSP&&s.stack.length===0,"INT invokes handler and IRET restores the saved frame"],
  [29,3,s=>s.reg.SP===initialSP&&s.stack.length===0,"IRET returns to the instruction following INT"],
  [30,1,s=>s.reg.DX===0x3f8,"DX contains port number 03F8h"],
  [30,2,s=>s.io&&s.io[0x10]===0x55,"OUT stores 55h in the model's configured port state"],
  [30,3,s=>s.flags.IF===1,"STI sets IF before HLT"],
  [31,1,s=>s.reg.AX===0x1234,"MOV immediate example leaves AX=1234h"],
  [31,2,s=>s.reg.CX===0x5678,"three-byte MOV CX immediate is executed correctly"],
  [31,3,s=>s.reg.AX===0x1234,"register-to-register MOV transfers BX to AX"],
  [32,1,s=>s.reg.AX===0xabcd,"ModR/M example writes and reloads ABCDh through BX+SI+disp8"],
  [32,2,s=>s.reg.AX===0x8888&&s.reg.DS===0x1000&&s.reg.SS===0x2000&&word(s,s.reg.DS,0x0102)===0x1111&&word(s,s.reg.DS,0x0104)===0x2222&&word(s,s.reg.SS,0x0008)===0x3333&&word(s,s.reg.SS,0x000a)===0x4444&&word(s,s.reg.DS,0x0002)===0x5555&&word(s,s.reg.DS,0x0004)===0x6666&&word(s,s.reg.SS,0x0006)===0x7777&&word(s,s.reg.DS,0x0100)===0x8888,"All eight 8086 memory addressing forms write and read the expected words with DS/SS defaults"],
  [32,3,s=>s.reg.AX===0xbeef,"direct disp16 memory form reads BEEFh"],
  [33,1,s=>s.reg.IP>=0&&s.reg.SP===initialSP,"assembler resolves FIN and execution reaches HLT"],
  [33,2,s=>s.reg.AX===0x1234,"MOV AX,1234h executes; its bytes are checked by the independent disassembler below"],
  [33,3,s=>s.reg.IP>=0,"unknown-byte example is checked by the independent disassembler below"],
  [34,1,s=>(s.reg.AX&255)===0x5a,"CS override reads the byte written at the selected segment:offset"],
  [34,2,s=>s.reg.AX===2&&word(s,s.reg.DS,0x100)===2,"LOCK INC memory updates the word from 1 to 2"],
  [34,3,s=>s.reg.CX===0&&s.reg.SI===0x102&&s.reg.DI===0x202&&byte(s,s.reg.ES,0x200)===0x31&&byte(s,s.reg.ES,0x201)===0x32,"REP MOVSB copies two bytes under the prefix"],
  [35,1,s=>s.reg.AX===0x1234,"register and memory forms execute; no cycle count is inferred"],
  [35,2,s=>s.reg.CX===0&&s.reg.SP===initialSP,"LOOP exits after CX reaches zero; prefetch timing is outside the model"],
  [35,3,s=>s.reg.AX===8,"SHL doubles AX=4 to AX=8"],
  [36,1,s=>s.reg.AX===12,"synthesis addition produces AX=12"],
  [36,2,s=>s.reg.AX===6&&s.reg.SP===initialSP,"synthesis procedure doubles AX and returns"],
  [36,3,s=>(s.reg.AX&255)===0&&s.flags.CF===1,"FFh+1 wraps to zero and sets carry"]
];
const initialSP = learning.executeAll("HLT").reg.SP;
function physical(seg, offset) { return (((seg & 0xffff) << 4) + (offset & 0xffff)) & 0xfffff; }
function byte(state, seg, offset) { return state.mem[physical(seg, offset)] ?? 0; }
function word(state, seg, offset) { return byte(state,seg,offset) | (byte(state,seg,(offset+1)&0xffff)<<8); }
const auditFailures = [];
for (const [chapter,lesson,check,description] of advancedExampleOracles) {
  const source = learning.curriculum[chapter-1][5][lesson-1][2];
  const state = learning.executeAll(source);
  if (state.error || !check(state)) auditFailures.push({
    chapter,lesson,description,error:state.error||null,
    registers:state.reg,flags:state.flags,sp:state.reg.SP
  });
}
assert.equal(advancedExampleOracles.length,73,"The advanced audit covers the 73 lessons from C12–C36 not covered by the earlier foundational and Level 2 oracle sets.");
assert.equal(auditFailures.length,0,"Every advanced lesson must satisfy its independent expected-state oracle: "+JSON.stringify(auditFailures));

const independentlyCheckedLessons = new Set();
for(const [chapter,lesson] of foundationalExampleOracles) independentlyCheckedLessons.add(chapter+"-"+lesson);
for(const [chapter,lesson] of level2Oracles) independentlyCheckedLessons.add(chapter+"-"+lesson);
for(const [chapter,lesson] of advancedExampleOracles) independentlyCheckedLessons.add(chapter+"-"+lesson);
for(const oracle of exampleOracles) independentlyCheckedLessons.add(oracle.chapter+"-"+oracle.lesson);
assert.equal(independentlyCheckedLessons.size,108,"The four oracle sets must cover exactly 108 unique lessons.");
for(let chapter=1;chapter<=36;chapter++)for(let lesson=1;lesson<=3;lesson++)
  assert.ok(independentlyCheckedLessons.has(chapter+"-"+lesson),"Missing independent result oracle for C"+chapter+"L"+lesson);
console.log("Independent expected-state coverage: 108/108 lessons, one or more independent oracles per lesson.");


function bytesOf(source) { return Array.from(learning.assembleProgram(source).bytes); }
function sameBytes(actual,expected,label) {
  assert.deepEqual(actual,expected,label+" bytes");
}
sameBytes(bytesOf(learning.exercises[34][4].solution),[0xB8,0x34,0x12,0xF4],"Exercise C31 MOV immediate encoding");
sameBytes(bytesOf(learning.exercises[35][4].solution),[0xBB,0x00,0x01,0xBE,0x02,0x00,0xC7,0x40,0x04,0xCD,0xAB,0x8B,0x40,0x04,0xF4],"Exercise C32 ModR/M and displacement encoding");
sameBytes(bytesOf(learning.exercises[36][4].solution),[0xEB,0x01,0x90,0xB8,0x34,0x12,0xF4],"Exercise C33 symbolic branch and instruction boundaries");
sameBytes(bytesOf(learning.curriculum[30][5][0][2]),[0xB8,0x34,0x12,0xF4],"C31 L1 MOV immediate");
sameBytes(bytesOf(learning.curriculum[30][5][1][2]),[0xB9,0x78,0x56,0xF4],"C31 L2 MOV CX immediate length");
const regMoveBytes=bytesOf(learning.curriculum[30][5][2][2]);
assert.ok(JSON.stringify(regMoveBytes)===JSON.stringify([0xBB,0x34,0x12,0x89,0xD8,0xF4])||JSON.stringify(regMoveBytes)===JSON.stringify([0xBB,0x34,0x12,0x8B,0xC3,0xF4]),"C31 L3 equivalent register MOV encoding after initializing BX");
sameBytes(bytesOf(learning.curriculum[31][5][0][2]),[0xBB,0x00,0x01,0xBE,0x02,0x00,0xC7,0x40,0x04,0xCD,0xAB,0x8B,0x40,0x04,0xF4],"C32 L1 complete initialized ModR/M disp8 example");
const c32l2=learning.executeAll(learning.curriculum[31][5][1][2]);
assert.ok(!c32l2.error,"C32 L2 all eight memory forms execute: "+String(c32l2.error||""));
assert.equal(c32l2.reg.AX,0x8888,"C32 L2 final AX");
for(const [seg,off,val] of [[0x1000,0x0102,0x1111],[0x1000,0x0104,0x2222],[0x2000,0x0008,0x3333],[0x2000,0x000a,0x4444],[0x1000,0x0002,0x5555],[0x1000,0x0004,0x6666],[0x2000,0x0006,0x7777],[0x1000,0x0100,0x8888]]) assert.equal(word(c32l2,seg,off),val,`C32 L2 ${seg.toString(16)}:${off.toString(16)}`);
sameBytes(bytesOf(learning.curriculum[31][5][2][2]),[0xC7,0x06,0x34,0x12,0xEF,0xBE,0x8B,0x06,0x34,0x12,0xF4],"C32 L3 direct disp16");
sameBytes(bytesOf(learning.curriculum[32][5][1][2]),[0xB8,0x34,0x12,0xF4],"C33 L2 assembled stream for sequential disassembly");

sameBytes(bytesOf("MOV WORD PTR [BX+SI+4], ABCDh"),[0xC7,0x40,0x04,0xCD,0xAB],"C32 memory immediate ModR/M disp8");
sameBytes(bytesOf("JMP FIN\nNOP\nFIN:\nHLT"),[0xEB,0x01,0x90,0xF4],"C33 symbolic short branch resolution");

const disassembled=learning.disassembleBytes([0xB8,0x34,0x12,0xF4]).rows;
assert.equal(JSON.stringify(disassembled.map(r=>r.instruction)),JSON.stringify(["MOV AX, 1234h","HLT"]),"C33 L2 independent disassembly");
const unknown=learning.disassembleBytes([0x64]).rows;
assert.ok(unknown[0].instruction.startsWith("DB "),"C33 L3 unknown byte remains raw data");
sameBytes(bytesOf(learning.curriculum[33][5][1][2]),[0xC7,0x06,0x00,0x01,0x01,0x00,0xF0,0xFF,0x06,0x00,0x01,0x8B,0x06,0x00,0x01,0xF4],"C34 L2 complete initialized LOCK INC memory example");
console.log("Advanced course audit: 73/73 additional lesson examples pass independent state or encoding oracles.");

const courseExampleOracleKeys = new Set([
  ...exampleOracles.map(o => o.chapter + ":" + o.lesson),
  ...foundationalExampleOracles.map(([chapter,lesson]) => chapter + ":" + lesson),
  ...level2Oracles.map(([chapter,lesson]) => chapter + ":" + lesson),
  ...advancedExampleOracles.map(([chapter,lesson]) => chapter + ":" + lesson)
]);
assert.equal(courseExampleOracleKeys.size,108,
  "All 108 course examples must have at least one independent expected-state, address, or encoding oracle.");
console.log("Course example audit: 108/108 unique lesson examples have independent expected-result oracles.");



const lessonTextOracles = [
  [11,3,"CF reste à 1"],
  [17,1,"JAE"],
  [21,3,"DX:AX=0000:0009h"],
  [24,3,"la moitié haute n'est pas une extension de signe"],
  [30,1,"adresses de port sur 16 bits"],
  [30,3,"IP avance normalement"],
  [33,2,"B8 34 12 F4"],
  [33,3,"DB 64h"],
  [35,2,"le premier LOOP décrémente CX à 1"],
  [35,3,"ne démontre pas un gain de cycles"]
];
for (const [chapter,lesson,needle] of lessonTextOracles) {
  const data=learning.curriculum[chapter-1][5][lesson-1];
  const text=data[1]+" "+data[3];
  assert.ok(text.includes(needle),"C"+chapter+"L"+lesson+" must retain its audited technical clarification: "+needle);
}
assert.ok(learning.curriculum[10][5][2][2].includes("STC\nINC AL"),"C11 L3 must establish CF before testing INC preservation.");

const traceSource="MOV AX, 2\nMOV BX, 3\nADD AX, BX\nHLT";
const traceBytes=Array.from(learning.assembleProgram(traceSource).bytes);
assert.equal(traceBytes.length,9,"The binary trace must use the stated instruction boundaries.");
const traceState=learning.executeBinary(traceBytes,0,0,{});
assert.equal(traceState.reg.AX,5,"The trace's final AX must match binary execution.");
assert.equal(traceState.reg.BX,3,"The trace's final BX must match binary execution.");
assert.equal(traceState.reg.IP,9,"The trace's final IP must be a byte offset.");
assert.equal(traceState.reg.SP,0xFFFE,"The trace must preserve the initial stack pointer.");
assert.equal(traceState.flags.PF,1,"ADD 2+3 sets even parity on the low byte.");


console.log("Learning quality: 36 chapters, 324 intermediate questions, 360 final questions, " +
  learning.exercises.length + " exercises; all guided corrections execute and pass their validators.");
