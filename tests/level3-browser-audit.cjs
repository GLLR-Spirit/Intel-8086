const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/?audit=1", { waitUntil: "networkidle" });

  // Capture each public view at desktop and mobile widths for visual regression review.
  const views = ["learn", "editor", "instructions", "exercises", "projects", "tools"];
  for (const view of views) {
    await page.locator('[data-view="' + view + '"]').click();
    await page.screenshot({ path: "artifacts/intel8086-desktop-" + view + ".png", fullPage: true });
  }
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto("http://127.0.0.1:4173/?audit=1", { waitUntil: "networkidle" });
  for (const view of views) {
    await mobile.locator('[data-view="' + view + '"]').click();
    await mobile.screenshot({ path: "artifacts/intel8086-mobile-" + view + ".png", fullPage: true });
  }
  await mobile.close();
  await page.locator('[data-view="learn"]').click();

  await page.evaluate(() => {
    if (!window.__8086Audit) throw new Error("API de test absente : charger la page avec ?audit=1");
    window.__8086Audit.runSelfTests();
  });
  const summary = (await page.locator("#testSummary").textContent()).trim();
  const match = summary.match(/(\d+)\/(\d+) tests réussis/);
  assert.ok(match, "Résumé des auto-tests absent ou illisible : " + summary);
  assert.equal(Number(match[1]), Number(match[2]), "La suite intégrée contient des échecs : " + summary);

  const report = await page.evaluate(() => {
    const failures = [];
    const api = window.__8086Audit;
    if (!api) throw new Error("API de test absente : charger la page avec ?audit=1");
    const chapterRows = [
      [{AX:7,BX:9,CF:1,ZF:0},{AX:3,CF:1,ZF:0,SF:1},{AX:5,ZF:0,CF:0,OF:0}],
      [{AX:0,BX:2},{AX:9},{AX:9}],
      [{BX:1},{AX:128,BX:1,OF:1},{BX:1}],
      [{BX:1},{BX:1},{BX:1}],
      [{AX:3,CX:0},{BX:1,CX:1},{AX:7,CX:0}],
      [{AX:10,CX:6,BX:6},{AX:6,DX:3,CX:0},{BX:1,SI:0x101,CX:2}]
    ];
    const programs = [];
    for (let ci=11; ci<17; ci++) {
      const chapter = api.curriculum[ci];
      for (let li=0; li<3; li++) {
        const lesson = chapter[5][li];
        programs.push({chapter:ci+1,lesson:li+1,title:lesson[0],source:lesson[2],expected:chapterRows[ci-11][li]});
      }
    }
    if (programs.length !== 18) failures.push("Le nombre d'exemples n'est pas 18 : " + programs.length);
    for (const p of programs) {
      try {
        const assembled = api.assembleProgram(p.source);
        const logical = api.executeAll(p.source);
        const binary = api.executeBinary(assembled.bytes, 0, 0, {});
        for (const [mode,state] of [["interpréteur",logical],["binaire",binary]]) {
          if (state.error) throw new Error(mode + " : " + state.error);
          for (const [key,value] of Object.entries(p.expected)) {
            const actual = key in state.reg ? state.reg[key] : state.flags[key];
            if (actual !== value) throw new Error(mode + " : " + key + " attendu " + value + ", obtenu " + actual);
          }
        }
        if (p.chapter===13 && p.lesson===1 && (assembled.bytes[0]!==0xEB || assembled.bytes[1]!==3))
          throw new Error("JMP short : encodage attendu EB 03");
        if (p.chapter===13 && p.lesson===2 && (assembled.bytes[0]!==0xE9 || assembled.bytes[1]!==0x82 || assembled.bytes[2]!==0x00))
          throw new Error("JMP near relatif : encodage attendu E9 82 00");
        if (p.chapter===13 && p.lesson===3 && (assembled.bytes[3]!==0xFF || assembled.bytes[4]!==0xE3))
          throw new Error("JMP BX : encodage indirect attendu FF E3");
      } catch (e) { failures.push("CH"+p.chapter+" leçon "+p.lesson+" ("+p.title+") : "+e.message); }
    }
    const conditions = [
      ["JO","MOV AL,7Fh\nADD AL,1",true,"MOV AL,1\nADD AL,1",false,0x70],
      ["JNO","MOV AL,1\nADD AL,1",true,"MOV AL,7Fh\nADD AL,1",false,0x71],
      ["JB","MOV AL,1\nCMP AL,2",true,"MOV AL,2\nCMP AL,1",false,0x72],
      ["JAE","MOV AL,2\nCMP AL,1",true,"MOV AL,1\nCMP AL,2",false,0x73],
      ["JE","MOV AL,1\nCMP AL,1",true,"MOV AL,1\nCMP AL,2",false,0x74],
      ["JNE","MOV AL,1\nCMP AL,2",true,"MOV AL,1\nCMP AL,1",false,0x75],
      ["JBE","MOV AL,1\nCMP AL,2",true,"MOV AL,2\nCMP AL,1",false,0x76],
      ["JA","MOV AL,2\nCMP AL,1",true,"MOV AL,1\nCMP AL,2",false,0x77],
      ["JS","MOV AL,80h\nADD AL,0",true,"MOV AL,1\nADD AL,0",false,0x78],
      ["JNS","MOV AL,1\nADD AL,0",true,"MOV AL,80h\nADD AL,0",false,0x79],
      ["JP","MOV AL,3\nXOR AL,0",true,"MOV AL,7\nXOR AL,0",false,0x7A],
      ["JNP","MOV AL,7\nXOR AL,0",true,"MOV AL,3\nXOR AL,0",false,0x7B],
      ["JL","MOV AL,0FFh\nCMP AL,1",true,"MOV AL,1\nCMP AL,0FFh",false,0x7C],
      ["JGE","MOV AL,1\nCMP AL,0FFh",true,"MOV AL,0FFh\nCMP AL,1",false,0x7D],
      ["JLE","MOV AL,1\nCMP AL,1",true,"MOV AL,2\nCMP AL,1",false,0x7E],
      ["JG","MOV AL,2\nCMP AL,1",true,"MOV AL,1\nCMP AL,1",false,0x7F]
    ];
    for (const [op,yesPrep,yes,noPrep,no,opcode] of conditions) {
      for (const [prep,expected] of [[yesPrep,yes],[noPrep,no]]) {
        const src=prep+"\n"+op+" PRISE\nMOV BX,0\nJMP FIN\nPRISE:\nMOV BX,1\nFIN:\nHLT";
        const result=api.executeBinary(api.assembleProgram(src).bytes,0,0,{});
        if (result.error || result.reg.BX !== (expected?1:0))
          failures.push(op+" branchement "+(expected?"vrai":"faux")+" : "+(result.error||("BX="+result.reg.BX)));
      }
      const encoded=api.assembleProgram(op+" CIBLE\nNOP\nCIBLE:\nHLT").bytes;
      if(encoded[0]!==opcode || encoded[1]!==1) failures.push(op+" opcode attendu "+opcode.toString(16)+" 01, obtenu "+encoded.slice(0,2).map(x=>x.toString(16)).join(" "));
    }
    const loopOpcodes=[["LOOPNE",0xE0],["LOOPE",0xE1],["LOOP",0xE2],["JCXZ",0xE3]];
    for (const [op,opcode] of loopOpcodes) {
      const bytes=api.assembleProgram(op+" CIBLE\nNOP\nCIBLE:\nHLT").bytes;
      if(bytes[0]!==opcode||bytes[1]!==1) failures.push(op+" opcode rel8 incorrect");
    }
    const loopFlag=api.executeBinary(api.assembleProgram("MOV CX,1\nMOV AX,1\nCMP AX,2\nLOOP FIN\nFIN:\nHLT").bytes,0,0,{});
    if(loopFlag.error||loopFlag.flags.CF!==1||loopFlag.flags.ZF!==0) failures.push("LOOP doit préserver les FLAGS");
    const zeroCounter=api.executeBinary(api.assembleProgram("MOV CX,0\nLOOP FIN\nMOV BX,1\nFIN:\nHLT").bytes,0,0,{});
    if(zeroCounter.error||zeroCounter.reg.CX!==0xFFFF||zeroCounter.reg.BX!==0) failures.push("LOOP avec CX=0 doit décrémenter à FFFFh puis brancher");
    const loopSemantics=[
      ["LOOPE","MOV AX,1\nCMP AX,1",true],["LOOPE","MOV AX,1\nCMP AX,2",false],
      ["LOOPNE","MOV AX,1\nCMP AX,2",true],["LOOPNE","MOV AX,1\nCMP AX,1",false]
    ];
    for(const [op,prep,take] of loopSemantics){
      const src="MOV CX,2\n"+prep+"\n"+op+" PRISE\nMOV BX,0\nJMP FIN\nPRISE:\nMOV BX,1\nFIN:\nHLT";
      const state=api.executeBinary(api.assembleProgram(src).bytes,0,0,{});
      if(state.error||state.reg.BX!==(take?1:0)||state.reg.CX!==1) failures.push(op+" condition ZF/CX incorrect");
    }
    const intermediate=api.level3LessonQuestions;
    const final=api.level3FinalQuestions;
    const intermediateCount=intermediate.reduce((n,g)=>n+g.length,0);
    const finalCount=final.reduce((n,g)=>n+g.length,0);
    if(intermediateCount!==54) failures.push("Questions intermédiaires : "+intermediateCount+"/54");
    if(finalCount!==60) failures.push("Questions finales : "+finalCount+"/60");
    return {failures,examples:programs.length,jccConditions:conditions.length,jccTruthCases:conditions.length*2,intermediateCount,finalCount};
  });

  // Every chapter must expose its own visual explanation, not only the eleven original chapters.
  assert.equal(await page.locator("[data-lesson]").count(),36,"Course navigation must expose exactly 36 chapters.");
  for (let chapter=0; chapter<36; chapter++) {
    const chapterButton=page.locator('[data-lesson="' + chapter + '"]');
    await chapterButton.click();
    assert.equal(await page.locator("#lessonDetail .course-visual").count(),1,"Chapter "+(chapter+1)+" must have exactly one visual explanation.");
    assert.equal(await chapterButton.getAttribute("aria-current"),"step","Selected chapter "+(chapter+1)+" must be exposed as the current step.");
    assert.equal(await chapterButton.getAttribute("aria-pressed"),"true","Selected chapter "+(chapter+1)+" must expose its selected state.");
    assert.match(await page.locator("#lessonDetail .eyebrow").first().textContent(),new RegExp("Chapitre "+(chapter+1)+"\\/36"),"Lesson detail must match selected chapter "+(chapter+1)+".");
    if(chapter>0)assert.equal(await page.locator('[data-lesson="' + (chapter-1) + '"]').getAttribute("aria-current"),null,"Previous chapter must no longer be current.");
  }
  console.log("Course visual coverage: 36/36 chapters have a diagram or visual model.");
  await page.locator('[data-view="instructions"]').click();
  await page.locator("#searchInstruction").fill("PORT");
  const portReferenceCodes=await page.locator("#instructionGrid .inst code").allTextContents();
  assert.ok(portReferenceCodes.includes("PORT"),"The PORT directive must be discoverable in the technical reference.");
  const portCard=page.locator("#instructionGrid .inst").filter({
    has:page.locator("code").filter({hasText:/^PORT$/})
  });
  assert.equal(await portCard.count(),1,"The PORT directive must resolve to exactly one reference card.");
  assert.match(await portCard.first().textContent(),/IN et OUT/);
  await page.locator("#searchInstruction").fill("VECTOR");
  const vectorReferenceCodes=await page.locator("#instructionGrid .inst code").allTextContents();
  assert.ok(vectorReferenceCodes.includes("VECTOR"),
    "The VECTOR directive must remain documented separately from hardware opcodes.");
  await page.locator('[data-view="learn"]').click();


  // Keyboard navigation must preserve focus when dynamic lesson content is replaced
  // and transfer focus when an action hides the view containing its source control.
  const keyboardPage = await browser.newPage();
  await keyboardPage.goto("http://127.0.0.1:4173/?audit=1",{waitUntil:"networkidle"});
  await keyboardPage.keyboard.press("Tab");
  assert.ok(await keyboardPage.evaluate(() => document.activeElement.classList.contains("skip-link")),"The first keyboard stop must be the skip link.");
  assert.equal(await keyboardPage.locator(".skip-link").evaluate(el => getComputedStyle(el).top),"12px","Skip link must become visible on focus.");

  const editorNavigation=keyboardPage.locator('[data-view="editor"]');
  await editorNavigation.focus();
  await keyboardPage.keyboard.press("Enter");
  assert.equal(await keyboardPage.locator('[data-view="editor"]').getAttribute("aria-current"),"page");
  assert.equal(await keyboardPage.evaluate(() => document.activeElement.dataset.view),"editor",
    "Activating a navigation button with Enter must retain focus on that button.");

  const guidedMode=keyboardPage.locator('[data-mode="guided"]');
  await guidedMode.focus();
  await keyboardPage.keyboard.press("Space");
  assert.equal(await guidedMode.getAttribute("aria-pressed"),"true");
  assert.equal(await keyboardPage.locator('[data-mode="free"]').getAttribute("aria-pressed"),"false");

  const learnNavigation=keyboardPage.locator('[data-view="learn"]');
  await learnNavigation.focus();
  await keyboardPage.keyboard.press("Enter");
  const chapterButton=keyboardPage.locator('[data-lesson="1"]');
  await chapterButton.focus();
  await keyboardPage.keyboard.press("Enter");
  assert.equal(await chapterButton.getAttribute("aria-current"),"step");
  assert.equal(await keyboardPage.evaluate(() => document.activeElement.dataset.lesson),"1",
    "Selecting a chapter by keyboard must not discard focus.");

  const sublessonButton=keyboardPage.locator('[data-sublesson="1"]');
  await sublessonButton.focus();
  await keyboardPage.keyboard.press("Enter");
  assert.equal(await keyboardPage.locator('[data-sublesson="1"]').getAttribute("aria-current"),"step");
  assert.equal(await keyboardPage.evaluate(() => document.activeElement.getAttribute("data-sublesson")),"1",
    "Changing sublessons must restore focus to the equivalent newly rendered tab.");

  const markLesson=keyboardPage.locator("#markLesson");
  await markLesson.focus();
  await keyboardPage.keyboard.press("Enter");
  assert.equal(await keyboardPage.evaluate(() => document.activeElement.id),"markLesson",
    "Marking a chapter must preserve focus after the chapter list and lesson detail rerender.");

  const exampleSource=await keyboardPage.evaluate(() => window.__8086Audit.curriculum[1][5][1][2]);
  const loadExample=keyboardPage.locator("#lessonExample");
  await loadExample.focus();
  await keyboardPage.keyboard.press("Enter");
  assert.equal(await keyboardPage.locator("#view-editor").evaluate(el=>el.classList.contains("active")),true);
  assert.equal(await keyboardPage.locator("#code").inputValue(),exampleSource);
  assert.equal(await keyboardPage.evaluate(() => document.activeElement.textContent.trim()),"Atelier de programmation",
    "Loading a lesson example must move focus into the newly opened view heading.");

  const exercisesNavigation=keyboardPage.locator('[data-view="exercises"]');
  await exercisesNavigation.focus();
  await keyboardPage.keyboard.press("Enter");
  const unfilteredExerciseCountText=(await keyboardPage.locator("#exerciseCount").textContent()).trim();
  const difficulty=keyboardPage.locator("#exerciseDifficulty");
  await difficulty.focus();
  await keyboardPage.keyboard.press("ArrowDown");
  await keyboardPage.keyboard.press("Enter");
  assert.equal(await difficulty.inputValue(),"Débutant",
    "The exercise difficulty filter must be operable with native keyboard selection.");
  const filterTarget=await keyboardPage.evaluate(()=>{
    const api=window.__8086Audit;
    for(let index=0;index<api.exercises.length;index++){
      const metadata=api.exerciseMetadata(api.exercises[index],index);
      if(metadata.difficulty==="Débutant"&&metadata.chapters.length)
        return {chapter:metadata.chapters[0],type:metadata.type};
    }
    return null;
  });
  assert.ok(filterTarget,"At least one beginner exercise must be available for a combined filter test.");
  const beginnerExerciseCountText=(await keyboardPage.locator("#exerciseCount").textContent()).trim();
  const beginnerExerciseCounts=beginnerExerciseCountText.match(/(\d+) exercice\(s\) affiché\(s\) sur (\d+)/);
  assert.ok(beginnerExerciseCounts,"The exercise result counter must expose visible and total counts: "+beginnerExerciseCountText);
  const beginnerCount=Number(beginnerExerciseCounts[1]),totalExerciseCount=Number(beginnerExerciseCounts[2]);
  assert.ok(beginnerCount>0&&beginnerCount<totalExerciseCount,
    "Keyboard difficulty filtering must reduce the actual result set, not only change the select value.");
  const beginnerLabels=await keyboardPage.locator("#exerciseList .exercise .eyebrow").allTextContents();
  assert.ok(beginnerLabels.length>0&&beginnerLabels.every(label=>label.includes("Débutant")),
    "Every visible result must satisfy the selected beginner difficulty.");

  const chapterFilter=keyboardPage.locator("#exerciseChapter");
  await chapterFilter.focus();
  for(let step=0;step<=filterTarget.chapter;step++) await keyboardPage.keyboard.press("ArrowDown");
  await keyboardPage.keyboard.press("Enter");
  assert.equal(await chapterFilter.inputValue(),String(filterTarget.chapter),
    "The chapter filter must be keyboard-selectable.");
  const chapterFilterAudit=await keyboardPage.evaluate(()=>{
    const api=window.__8086Audit;
    const selectedChapter=Number(document.querySelector("#exerciseChapter").value);
    const expected=api.exercises.map((exercise,index)=>({exercise,index,metadata:api.exerciseMetadata(exercise,index)}))
      .filter(item=>item.metadata.chapters.includes(selectedChapter)&&item.metadata.difficulty==="Débutant")
      .map(item=>(item.index+1)+". "+item.exercise[0]);
    const actual=[...document.querySelectorAll("#exerciseList .exercise > b")].map(node=>node.textContent.trim());
    return {selectedChapter,expected,actual};
  });
  assert.ok(chapterFilterAudit.actual.length>0,"The selected chapter and difficulty must produce visible exercises.");
  assert.deepEqual(chapterFilterAudit.actual,chapterFilterAudit.expected,
    "Combined difficulty/chapter filters must return exactly the exercises assigned to the selected chapter.");

  const typeFilter=keyboardPage.locator("#exerciseType");
  const typeOptions=await typeFilter.locator("option").evaluateAll(options=>options.map(option=>option.value));
  const typeIndex=typeOptions.indexOf(filterTarget.type);
  assert.ok(typeIndex>0,"The target exercise type must exist in the filter options.");
  await typeFilter.focus();
  for(let step=0;step<typeIndex;step++) await keyboardPage.keyboard.press("ArrowDown");
  await keyboardPage.keyboard.press("Enter");
  assert.equal(await typeFilter.inputValue(),filterTarget.type,
    "The exercise-type filter must be keyboard-selectable.");
  const typeLabels={application:"Application directe",raisonnement:"Raisonnement",completion:"Programme à compléter",debug:"Débogage / correction",probleme:"Problème complet",challenge:"Défi expert"};
  const combinedLabels=await keyboardPage.locator("#exerciseList .exercise .eyebrow").allTextContents();
  assert.ok(combinedLabels.length>0&&combinedLabels.every(label=>label.includes("Débutant")&&label.includes(typeLabels[filterTarget.type])),
    "Combined filters must enforce difficulty, chapter and type on every visible card.");
  await keyboardPage.locator("#resetExerciseFilters").focus();
  await keyboardPage.keyboard.press("Enter");
  assert.equal((await keyboardPage.locator("#exerciseCount").textContent()).trim(),unfilteredExerciseCountText,
    "Keyboard reset must restore the complete exercise result set.");

  const editorAgain=keyboardPage.locator('[data-view="editor"]');
  await editorAgain.focus();
  await keyboardPage.keyboard.press("Enter");
  await keyboardPage.locator("#code").fill("MOV AX, 5\nMOV BX, 7\nADD AX, BX\nHLT");
  await keyboardPage.locator("#run").focus();
  await keyboardPage.keyboard.press("Enter");
  assert.ok((await keyboardPage.locator("#regs").textContent()).includes("000Ch"),
    "The editor Run action must execute using the keyboard.");
  await keyboardPage.keyboard.press("Tab");
  const nextControl=await keyboardPage.evaluate(()=>document.activeElement.id);
  assert.notEqual(nextControl,"run","Tab must advance from Run to the next natural keyboard stop.");
  await keyboardPage.keyboard.press("Shift+Tab");
  assert.equal(await keyboardPage.evaluate(()=>document.activeElement.id),"run",
    "Shift+Tab must reverse the same keyboard transition without losing focus.");

  await keyboardPage.locator("#assemble").focus();
  await keyboardPage.keyboard.press("Enter");
  assert.match(await keyboardPage.locator("#assemblerReport").textContent(),/ASSEMBLAGE RÉUSSI/,
    "The assembler action must be operable with Enter and expose its result.");
  await keyboardPage.locator("#disassemblyInput").fill("B8 34 12 F4");
  await keyboardPage.locator("#disassemble").focus();
  await keyboardPage.keyboard.press("Enter");
  assert.match(await keyboardPage.locator("#disassemblerReport").textContent(),/MOV AX, 1234h[\s\S]*HLT/,
    "The disassembler action must be keyboard-operable and render decoded instructions.");

  await keyboardPage.close();
  console.log("Keyboard navigation, focus retention/transfer, course, exercise filter and editor activation PASS.");

  // Course example hand-off must load the selected lesson's exact source into the editor.
  await page.locator('[data-lesson="0"]').click();
  assert.equal(await page.locator("#lessonList").getAttribute("role"),"navigation");
  assert.equal(await page.locator('[data-lesson="0"]').getAttribute("aria-current"),"step");
  await page.locator('[data-sublesson="1"]').click();
  assert.equal(await page.locator('[data-sublesson="1"]').getAttribute("aria-current"),"step",
    "The selected sublesson must be exposed to assistive technology.");
  assert.equal(await page.locator('[data-sublesson="1"]').getAttribute("aria-pressed"),"true");
  await page.locator('[data-sublesson="0"]').click();
  const lessonExample=await page.evaluate(()=>window.__8086Audit.curriculum[0][5][0][2]);
  const lessonExpectedAX=await page.evaluate(()=>window.__8086Audit.executeAll(window.__8086Audit.curriculum[0][5][0][2]).reg.AX);
  await page.locator("#lessonExample").click();
  assert.equal(await page.locator("#view-editor").evaluate(el=>el.classList.contains("active")),true,
    "Loading a course example must open the editor.");
  assert.equal(await page.locator("#code").inputValue(),lessonExample,
    "The editor must receive the exact selected lesson example.");
  await page.locator("#run").click();
  assert.ok((await page.locator("#regs").textContent()).includes(lessonExpectedAX.toString(16).toUpperCase().padStart(4,"0")+"h"),
    "The loaded lesson example must produce its documented final register value.");

  // A run stopped at the 10,000-instruction safety ceiling is not successful completion.
  await page.locator("#reset").click();
  await page.locator("#code").fill("BOUCLE:\nJMP BOUCLE");
  await page.locator("#run").click();
  assert.match(await page.locator("#status").textContent(),/Limite de sécurité atteinte/,
    "An infinite loop must report the safety stop instead of successful completion.");
  assert.match(await page.locator("#lineStatus").textContent(),/Exécution interrompue/,
    "The line status must identify the execution limit.");

  // Binary execution: source-linked IVT/PORT metadata and explicit initial memory/I/O.
  const interruptSource="VECTOR 30h, HANDLER\nMOV AX, 0\nINT 30h\nHLT\nHANDLER:\nMOV AX, 1234h\nIRET";
  await page.locator("#code").fill(interruptSource);
  const interruptBytes=await page.evaluate(src=>window.__8086Audit.assembleProgram(src).bytes.map(x=>x.toString(16).toUpperCase().padStart(2,"0")).join(" "),interruptSource);
  await page.locator("#disassemblyInput").fill(interruptBytes);
  await page.locator("#binaryCS").fill("0000h");
  await page.locator("#binaryIP").fill("0000h");
  await page.locator(".binary-state-editor summary").click();
  await page.locator("#binaryMemorySeed").fill("");
  await page.locator("#binaryPortSeed").fill("");
  await page.locator("#executeBinary").click();
  assert.match(await page.locator("#binaryExecutionReport").textContent(),/EXÉCUTION BINAIRE RÉUSSIE/,
    "A source-matched VECTOR directive must initialize the physical IVT for binary execution.");
  assert.ok((await page.locator("#regs").textContent()).includes("1234h"),
    "The binary interrupt handler must update AX.");
  assert.match(await page.locator("#stackView").textContent(),/Pile vide/,
    "IRET must restore the binary interrupt stack.");

  const memorySource="MOV AX, WORD PTR [00C0h]\nHLT";
  await page.locator("#code").fill(memorySource);
  const memoryBytes=await page.evaluate(src=>window.__8086Audit.assembleProgram(src).bytes.map(x=>x.toString(16).toUpperCase().padStart(2,"0")).join(" "),memorySource);
  await page.locator("#disassemblyInput").fill(memoryBytes);
  await page.locator("#binaryMemorySeed").fill("00C0h=34h\n00C1h=12h");
  await page.locator("#binaryPortSeed").fill("");
  await page.locator("#executeBinary").click();
  assert.match(await page.locator("#binaryExecutionReport").textContent(),/EXÉCUTION BINAIRE RÉUSSIE/);
  assert.ok((await page.locator("#regs").textContent()).includes("1234h"),
    "Explicit physical-memory seeds must be available to the binary executor.");

  const portSource="MOV DX, 20h\nIN AL, DX\nHLT";
  await page.locator("#code").fill(portSource);
  const portBytes=await page.evaluate(src=>window.__8086Audit.assembleProgram(src).bytes.map(x=>x.toString(16).toUpperCase().padStart(2,"0")).join(" "),portSource);
  await page.locator("#disassemblyInput").fill(portBytes);
  await page.locator("#binaryMemorySeed").fill("");
  await page.locator("#binaryPortSeed").fill("20h=55h");
  await page.locator("#executeBinary").click();
  assert.match(await page.locator("#binaryExecutionReport").textContent(),/EXÉCUTION BINAIRE RÉUSSIE/);
  assert.ok((await page.locator("#regs").textContent()).includes("0055h"),
    "Explicit port seeds must be available to IN/OUT in binary mode.");

  const sourcePortProgram="PORT 20h, 55h\nMOV DX, 20h\nIN AL, DX\nHLT";
  await page.locator("#code").fill(sourcePortProgram);
  const sourcePortBytes=await page.evaluate(src=>window.__8086Audit.assembleProgram(src).bytes.map(x=>x.toString(16).toUpperCase().padStart(2,"0")).join(" "),sourcePortProgram);
  await page.locator("#disassemblyInput").fill(sourcePortBytes);
  await page.locator("#binaryPortSeed").fill("");
  await page.locator("#executeBinary").click();
  assert.ok((await page.locator("#regs").textContent()).includes("0055h"),
    "A byte-identical source program may provide its PORT directive metadata to binary execution.");

  // Atelier controls: assembler, disassembler, binary export/upload, example, save and reset.
  const binaryDemo="MOV AX, 1234h\nHLT";
  await page.locator("#code").fill(binaryDemo);
  await page.locator("#assemble").click();
  assert.match(await page.locator("#assemblerReport").textContent(),/ASSEMBLAGE RÉUSSI/);
  assert.match(await page.locator("#assemblerReport").textContent(),/B8 34 12 F4/);
  const [binaryDownload]=await Promise.all([
    page.waitForEvent("download"),
    page.locator("#exportBin").click()
  ]);
  assert.equal(binaryDownload.suggestedFilename(),"programme-8086.bin");
  await page.locator("#disassemblyInput").fill("B8 34 12 F4");
  await page.locator("#disassemble").click();
  assert.match(await page.locator("#disassemblerReport").textContent(),/DÉSASSEMBLAGE/);
  assert.match(await page.locator("#disassemblerReport").textContent(),/MOV AX/);
  assert.match(await page.locator("#disassemblerReport").textContent(),/HLT/);
  await page.locator("#disassemblyInput").fill("B8 34");
  await page.locator("#disassemble").click();
  assert.match(await page.locator("#disassemblerReport").textContent(),/Désassemblage interrompu/,
    "A truncated binary stream must produce a visible diagnostic.");
  await page.locator("#binaryFile").setInputFiles({
    name:"sample-8086.bin",
    mimeType:"application/octet-stream",
    buffer:Buffer.from([0xB8,0x34,0x12,0xF4])
  });
  await page.waitForFunction(()=>document.querySelector("#disassemblyInput").value==="B8 34 12 F4");
  assert.equal(await page.locator("#disassemblyInput").inputValue(),"B8 34 12 F4");
  assert.match(await page.locator("#disassemblerReport").textContent(),/DÉSASSEMBLAGE/);
  await page.locator("#example").click();
  assert.match(await page.locator("#code").inputValue(),/LOOP DEBUT/);
  await page.locator("#run").click();
  assert.ok((await page.locator("#regs").textContent()).includes("000Ch"),
    "The built-in loop example must calculate 4 × 3 = 12.");
  assert.ok((await page.locator("#regs").textContent()).includes("CX")&&
    (await page.locator("#regs").textContent()).includes("0000h"),
    "The built-in loop example must finish with CX=0.");
  await page.locator("#reset").click();
  assert.ok((await page.locator("#regs").textContent()).includes("0000h"),
    "Reset must restore the initial register state.");
  const savedProgram="MOV AX, 4321h\nHLT";
  await page.locator("#code").fill(savedProgram);
  await page.locator("#save").click();
  assert.match(await page.locator("#status").textContent(),/Code sauvegardé localement/);
  assert.equal(await page.evaluate(()=>localStorage.getItem("i86-code")),savedProgram);
  await page.reload({waitUntil:"networkidle"});
  await page.locator('[data-view="editor"]').click();
  assert.equal(await page.locator("#code").inputValue(),savedProgram,
    "Saved source must be restored after a page reload.");

  await page.locator("#code").fill("MOV AX, 4321h\nHLT");
  await page.locator("#step").click();
  assert.ok((await page.locator("#regs").textContent()).includes("4321h"),
    "Stepping after a binary run must reset the binary display state and execute the current source, not stale CPU state.");

  await page.locator('[data-view="learn"]').click();

  // Interactive course demonstrations: AX split, FLAGS, segment:offset,
  // effective address, LIFO stack, and ModR/M field decoding.
  await page.locator('[data-lesson="10"]').click();
  assert.equal((await page.locator("#traceIP").textContent()).trim(),"0000h");
  await page.locator("#traceNext").click();
  assert.equal((await page.locator("#traceAX").textContent()).trim(),"0002h");
  assert.equal((await page.locator("#traceIP").textContent()).trim(),"0003h");
  await page.locator("#traceNext").click();
  assert.equal((await page.locator("#traceBX").textContent()).trim(),"0003h");
  assert.equal((await page.locator("#traceIP").textContent()).trim(),"0006h");
  await page.locator("#traceNext").click();
  assert.equal((await page.locator("#traceAX").textContent()).trim(),"0005h");
  assert.match((await page.locator("#traceFLAGS").textContent()),/PF=1/);
  await page.locator("#traceNext").click();
  assert.equal((await page.locator("#traceIP").textContent()).trim(),"0009h");
  assert.match((await page.locator("#traceStatus").textContent()),/programme terminé/);
  await page.locator("#tracePrev").click();
  assert.equal((await page.locator("#traceIP").textContent()).trim(),"0008h");
  await page.locator("#traceReset").click();
  assert.equal((await page.locator("#traceIP").textContent()).trim(),"0000h");

  await page.locator('[data-lesson="4"]').click();
  await page.locator("#axDemoValue").fill("ABCD");
  await page.locator("#axShowHigh").click();
  assert.match(await page.locator("#axDemoResult").textContent(), /AH=ABh/);
  await page.locator("#axWriteLow").click();
  assert.equal(await page.locator("#axDemoValue").inputValue(), "AB56");
  assert.match(await page.locator("#axDemoResult").textContent(), /AL=56h/);

  await page.locator('[data-lesson="11"]').click();
  await page.locator("#calcCmpFlags").click();
  assert.match(await page.locator("#cmpDemoResult").textContent(), /CF=1 ZF=0 SF=1 OF=0/);

  await page.locator('[data-lesson="17"]').click();
  await page.locator("#calcSegmentAddress").click();
  assert.match(await page.locator("#segmentDemoResult").textContent(), /10020h/);
  await page.locator("#segDemoValue").fill("1001");
  await page.locator("#offDemoValue").fill("0000");
  await page.locator("#calcSegmentAddress").click();
  assert.match(await page.locator("#segmentDemoResult").textContent(), /10010h/);

  await page.locator('[data-lesson="18"]').click();
  await page.locator("#calcEffectiveAddress").click();
  assert.match(await page.locator("#eaDemoResult").textContent(), /EA=0106h/);

  await page.locator('[data-lesson="19"]').click();
  await page.locator("#stackPush1111").click();
  await page.locator("#stackPush2222").click();
  assert.match(await page.locator("#stackDemoResult").textContent(), /Sommet=2222h/);
  await page.locator("#stackPop").click();
  assert.match(await page.locator("#stackDemoResult").textContent(), /Sommet=1111h/);
  await page.locator("#stackReset").click();
  assert.match(await page.locator("#stackDemoResult").textContent(), /pile vide/);

  await page.locator('[data-lesson="31"]').click();
  await page.locator("#decodeModRM").click();
  assert.match(await page.locator("#modrmDemoResult").textContent(), /MOD=1 · REG=AX · R\/M=\[BX\+SI\]/);
  await page.locator("#modrmDemoValue").fill("4G");
  await page.locator("#decodeModRM").click();
  assert.match(await page.locator("#modrmDemoResult").textContent(),/octet hexadécimal/i);

  await page.locator('[data-lesson="4"]').click();
  await page.locator("#axDemoValue").fill("ABG1");
  await page.locator("#axShowHigh").click();
  assert.match(await page.locator("#axDemoResult").textContent(),/valeur hexadécimale/i);

  await page.locator('[data-lesson="11"]').click();
  await page.locator("#cmpDemoA").fill("000Z");
  await page.locator("#calcCmpFlags").click();
  assert.match(await page.locator("#cmpDemoResult").textContent(),/mots hexadécimaux/i);

  await page.locator('[data-lesson="17"]').click();
  await page.locator("#segDemoValue").fill("10G0");
  await page.locator("#calcSegmentAddress").click();
  assert.match(await page.locator("#segmentDemoResult").textContent(),/mots hexadécimaux/i);

  await page.locator('[data-lesson="18"]').click();
  await page.locator("#eaBX").fill("01G0");
  await page.locator("#calcEffectiveAddress").click();
  assert.match(await page.locator("#eaDemoResult").textContent(),/mots hexadécimaux/i);
  console.log("Course hex calculators reject invalid characters rather than truncating input PASS.");

  await page.locator('[data-lesson="1"]').click();
  const animationName = await page.locator(".architecture-flow").evaluate(el => getComputedStyle(el, "::after").animationName);
  assert.equal(animationName, "busPacket", "The BIU/EU flow illustration must expose its schematic animation.");
  console.log("Course visual interaction audit: 7/7 interactive demonstrations, BIU animation and register trace PASS.");

  // Course list remains sticky beside lesson content on desktop and moves below it on mobile.
  assert.match(await page.locator(".course-list-hint").textContent(),/36 chapitres/,"Desktop chapter list must advertise its internal scrolling.");
  const desktopCourseBoxes = await page.locator(".course-layout").evaluate(el => {
    const list = el.querySelector(".course-list-panel").getBoundingClientRect();
    const detail = el.querySelector("#lessonDetail").getBoundingClientRect();
    return {listX:list.x,detailX:detail.x,listPosition:getComputedStyle(el.querySelector(".course-list-panel")).position};
  });
  assert.ok(desktopCourseBoxes.listX < desktopCourseBoxes.detailX,"Desktop course list must remain left of the lesson.");
  const desktopDomOrder = await page.locator(".course-layout").evaluate(el => [...el.children].map(child => child.id || child.className));
  assert.ok(String(desktopDomOrder[0]).includes("course-list-panel") && desktopDomOrder[1] === "lessonDetail",
    "Desktop DOM/reading order must match the left-to-right chapter navigation and lesson layout.");
  assert.equal(desktopCourseBoxes.listPosition,"sticky","Desktop chapter navigation must remain accessible while scrolling.");
  const mobileLayoutPage = await browser.newPage({viewport:{width:390,height:844}});
  await mobileLayoutPage.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  const mobileDomOrder = await mobileLayoutPage.locator(".course-layout").evaluate(el => [...el.children].map(child => child.id || child.className));
  assert.ok(mobileDomOrder[0] === "lessonDetail" && String(mobileDomOrder[1]).includes("course-list-panel"),
    "Mobile DOM/reading order must place lesson content before chapter navigation.");
  const mobileCourseBoxes = await mobileLayoutPage.locator(".course-layout").evaluate(el => {
    const list = el.querySelector(".course-list-panel").getBoundingClientRect();
    const detail = el.querySelector("#lessonDetail").getBoundingClientRect();
    return {listY:list.y,detailY:detail.y,listPosition:getComputedStyle(el.querySelector(".course-list-panel")).position};
  });
  assert.ok(mobileCourseBoxes.detailY < mobileCourseBoxes.listY,"Mobile lesson content must appear before the 36-chapter list.");
  assert.equal(mobileCourseBoxes.listPosition,"static","Mobile chapter list must not be trapped in a sticky scroll panel.");
  await mobileLayoutPage.close();
  console.log("Responsive course layout: sticky desktop navigation and lesson-first mobile order PASS.");

  // Cours, Exercices et Atelier doivent rester des vues distinctes ; les filtres
  // de la page Exercices doivent mettre à jour la liste puis pouvoir être réinitialisés.
  await page.locator('[data-view="exercises"]').click();
  assert.equal(await page.locator("#view-exercises").isVisible(), true);
  const allExerciseText=(await page.locator("#exerciseCount").textContent()).trim();
  const allExerciseMatch=allExerciseText.match(/(\d+) exercice\(s\) affiché\(s\) sur (\d+)/);
  assert.ok(allExerciseMatch,"Exercise count must be visible: "+allExerciseText);
  const totalExercises=Number(allExerciseMatch[2]);
  assert.ok(totalExercises>0,"The exercise page must contain exercises.");
  const filterMatrix=await page.evaluate(()=>{
    const api=window.__8086Audit;
    const rows=api.exercises.map((exercise,index)=>api.exerciseMetadata(exercise,index));
    const values={
      chapters:[...document.querySelectorAll("#exerciseChapter option")].slice(1).map(option=>option.value),
      difficulties:[...document.querySelectorAll("#exerciseDifficulty option")].slice(1).map(option=>option.value),
      types:[...document.querySelectorAll("#exerciseType option")].slice(1).map(option=>option.value)
    };
    return {
      values,
      chapterCounts:values.chapters.map(value=>[value,rows.filter(row=>row.chapters.includes(Number(value))).length]),
      difficultyCounts:values.difficulties.map(value=>[value,rows.filter(row=>row.difficulty===value).length]),
      typeCounts:values.types.map(value=>[value,rows.filter(row=>row.type===value).length]),
      sampleTitle:api.exercises[0][0]
    };
  });
  assert.equal(filterMatrix.values.chapters.length,36,"The chapter filter must expose all 36 chapters.");
  assert.deepEqual([...filterMatrix.values.difficulties].sort(),["Avancé","Débutant","Expert","Facile","Intermédiaire"].sort(),
    "The difficulty filter must expose all five requested levels.");
  assert.deepEqual([...filterMatrix.values.types].sort(),["application","challenge","completion","debug","probleme","raisonnement"].sort(),
    "The exercise-type filter must expose every supported type.");
  const readExerciseCount=async()=>{
    const value=(await page.locator("#exerciseCount").textContent()).trim();
    const parsed=value.match(/^(\d+)/);
    assert.ok(parsed,"Filtered exercise count must remain readable: "+value);
    return Number(parsed[1]);
  };
  for(const [value,expected] of filterMatrix.chapterCounts){
    await page.locator("#exerciseSearch").fill("");
    await page.locator("#exerciseDifficulty").selectOption("all");
    await page.locator("#exerciseType").selectOption("all");
    await page.locator("#exerciseChapter").selectOption(value);
    assert.equal(await readExerciseCount(),expected,"Chapter filter "+value+" must match the 48-entry assignment matrix.");
    assert.equal(await page.locator("#exerciseList .exercise").count(),expected);
  }
  for(const [value,expected] of filterMatrix.difficultyCounts){
    await page.locator("#exerciseChapter").selectOption("all");
    await page.locator("#exerciseType").selectOption("all");
    await page.locator("#exerciseDifficulty").selectOption(value);
    assert.equal(await readExerciseCount(),expected,"Difficulty filter "+value+" must match exercise metadata.");
    assert.equal(await page.locator("#exerciseList .exercise").count(),expected);
  }
  for(const [value,expected] of filterMatrix.typeCounts){
    await page.locator("#exerciseChapter").selectOption("all");
    await page.locator("#exerciseDifficulty").selectOption("all");
    await page.locator("#exerciseType").selectOption(value);
    assert.equal(await readExerciseCount(),expected,"Type filter "+value+" must match exercise metadata.");
    assert.equal(await page.locator("#exerciseList .exercise").count(),expected);
  }
  await page.locator("#exerciseChapter").selectOption("all");
  await page.locator("#exerciseDifficulty").selectOption("all");
  await page.locator("#exerciseType").selectOption("all");
  await page.locator("#exerciseSearch").fill(filterMatrix.sampleTitle);
  assert.equal(await readExerciseCount(),1,"Search must find an exact exercise title.");
  await page.locator("#exerciseSearch").fill("__exercise_not_found__");
  assert.equal(await readExerciseCount(),0,"Search must return an empty list for an unmatched query.");
  await page.locator("#exerciseSearch").fill("");
  const firstChapterValue=await page.locator("#exerciseChapter option").nth(1).getAttribute("value");
  assert.ok(firstChapterValue,"A chapter filter option must be populated.");
  await page.locator("#exerciseChapter").selectOption(firstChapterValue);
  await page.locator("#exerciseDifficulty").selectOption("Débutant");
  await page.locator("#exerciseType").selectOption("completion");
  const filteredText=(await page.locator("#exerciseCount").textContent()).trim();
  assert.match(filteredText,/exercice\(s\) affiché\(s\) sur/);
  const filteredCount=Number(filteredText.match(/^(\d+)/)[1]);
  assert.ok(filteredCount>0,"The first chapter must have a correctly mapped beginner completion exercise.");
  assert.equal(await page.locator("#exerciseList .exercise").count(),filteredCount);
  for(const card of await page.locator("#exerciseList .exercise").all()){
    assert.equal((await card.locator(".eyebrow").textContent()).trim(),"Débutant · Programme à compléter",
      "Every filtered exercise must match the selected difficulty and type.");
    assert.match(await card.locator("p.muted").nth(1).textContent(),/1\. Introduction au microprocesseur Intel 8086/,
      "Every filtered exercise must be genuinely associated with the selected chapter.");
  }

  // Exhaustive Cartesian product: 37 chapter states × 6 difficulty states × 7 type states.
  // Compare the rendered cards and counter against metadata for every combination.
  const exhaustiveFilterResult=await page.evaluate(()=>{
    const api=window.__8086Audit;
    const chapterValues=["all",...Array.from({length:36},(_,i)=>String(i))];
    const difficultyValues=["all",...["Débutant","Facile","Intermédiaire","Avancé","Expert"]];
    const typeValues=["all",...["application","challenge","completion","debug","probleme","raisonnement"]];
    const chapter=document.querySelector("#exerciseChapter");
    const difficulty=document.querySelector("#exerciseDifficulty");
    const type=document.querySelector("#exerciseType");
    const search=document.querySelector("#exerciseSearch");
    search.value="";
    let checked=0;
    for(const c of chapterValues) for(const d of difficultyValues) for(const t of typeValues){
      chapter.value=c; difficulty.value=d; type.value=t;
      chapter.dispatchEvent(new Event("change",{bubbles:true}));
      difficulty.dispatchEvent(new Event("change",{bubbles:true}));
      type.dispatchEvent(new Event("change",{bubbles:true}));
      const expected=api.exercises.map((exercise,index)=>({exercise,index,metadata:api.exerciseMetadata(exercise,index)}))
        .filter(row=>(c==="all"||row.metadata.chapters.includes(Number(c)))&&
          (d==="all"||row.metadata.difficulty===d)&&(t==="all"||row.metadata.type===t))
        .map(row=>(row.index+1)+". "+row.exercise[0]);
      const actual=[...document.querySelectorAll("#exerciseList .exercise > b")].map(node=>node.textContent.trim());
      const count=Number((document.querySelector("#exerciseCount").textContent.match(/^\d+/)||[])[0]);
      if(count!==expected.length||JSON.stringify(actual)!==JSON.stringify(expected))
        return {checked,failed:{chapter:c,difficulty:d,type:t,expected,actual,count}};
      checked++;
    }
    chapter.value="all";difficulty.value="all";type.value="all";
    chapter.dispatchEvent(new Event("change",{bubbles:true}));
    difficulty.dispatchEvent(new Event("change",{bubbles:true}));
    type.dispatchEvent(new Event("change",{bubbles:true}));
    return {checked,failed:null};
  });
  assert.equal(exhaustiveFilterResult.checked,1554,"All 1,554 structured filter combinations must be exercised: "+JSON.stringify(exhaustiveFilterResult.failed));
  assert.equal(exhaustiveFilterResult.failed,null,"Every structured filter combination must match the metadata oracle.");

  // Search must index source, hint, guided steps and solution, not only titles and prompts.
  const searchCoverage=await page.evaluate(()=>{
    const search=document.querySelector("#exerciseSearch");
    const cases=[
      {query:"B8",expected:35,field:"hint"},
      {query:"MOV AX, 1234h",expected:35,field:"starter/solution"},
      {query:"IRET",expected:46,field:"solution"}
    ];
    const results=cases.map(test=>{
      search.value=test.query;search.dispatchEvent(new Event("input",{bubbles:true}));
      const titles=[...document.querySelectorAll("#exerciseList .exercise > b")].map(node=>node.textContent.trim());
      return {query:test.query,expected:test.expected,field:test.field,titles,found:titles.some(title=>title.startsWith(test.expected+". "))};
    });
    search.value="";search.dispatchEvent(new Event("input",{bubbles:true}));
    return results;
  });
  assert.ok(searchCoverage.every(result=>result.found),
    "Exercise search must index instruction text in hints, starter code and guided solutions: "+JSON.stringify(searchCoverage));

  // Restore the original one-result filter used by the subsequent starter/solution hand-off checks.
  await page.locator("#exerciseSearch").fill("");
  await page.locator("#exerciseChapter").selectOption(firstChapterValue);
  await page.locator("#exerciseDifficulty").selectOption("Débutant");
  await page.locator("#exerciseType").selectOption("completion");
  assert.equal(await readExerciseCount(),filteredCount,
    "The focused beginner/completion hand-off fixture must be restored after exhaustive matrix testing.");


  const firstExerciseStarter=await page.evaluate(()=>window.__8086Audit.exercises[5][2]);
  const firstExerciseSolution=await page.evaluate(()=>window.__8086Audit.exercises[5][4].solution||window.__8086Audit.exercises[5][2]);
  const firstExerciseAX=await page.evaluate(src=>window.__8086Audit.executeAll(src).reg.AX,firstExerciseSolution);
  assert.equal(filteredCount,1,"The explicit chapter mapping should leave one beginner completion exercise for chapter 1.");
  await page.locator("#exerciseList [data-load]").first().click();
  assert.equal(await page.locator("#code").inputValue(),firstExerciseStarter,
    "Loading an exercise statement must copy its starter source into the editor.");
  await page.locator('[data-view="exercises"]').click();
  await page.locator("#exerciseList details.exercise-guide > summary").first().click();
  await page.locator("#exerciseList [data-solution]").first().click();
  assert.equal(await page.locator("#code").inputValue(),firstExerciseSolution,
    "Loading the correction must copy the complete guided solution into the editor.");
  await page.locator("#run").click();
  assert.ok((await page.locator("#regs").textContent()).includes(firstExerciseAX.toString(16).toUpperCase().padStart(4,"0")+"h"),
    "The loaded exercise solution must execute to its expected register result.");
  await page.locator('[data-view="exercises"]').click();
  await page.locator("#exerciseList [data-check]").first().click();
  assert.match(await page.locator("#exerciseList .exercise").first().textContent(),/Réussi/,
    "The exercise verification action must run the editor source against that exercise's validator.");
  await page.locator("#resetExerciseFilters").click();
  assert.equal((await page.locator("#exerciseCount").textContent()).trim(),allExerciseText,"Reset must restore the full exercise list.");

  // Exercise the actual UI hand-off and validator action for every guided correction.
  const allExerciseSolutions=await page.evaluate(()=>window.__8086Audit.exercises.map((exercise,index)=>({
    index, title:exercise[0], solution:(exercise[4]&&exercise[4].solution)||exercise[2]
  })));
  assert.equal(allExerciseSolutions.length,48,"The browser audit must cover all 48 exercise correction interactions.");
  for(const exercise of allExerciseSolutions){
    const card=page.locator("#exerciseList .exercise").nth(exercise.index);
    await card.locator("details.exercise-guide > summary").click();
    await card.locator("[data-solution]").click();
    assert.equal(await page.locator("#code").inputValue(),exercise.solution,
      "Exercise "+(exercise.index+1)+" must load its complete correction into the editor.");
    await page.locator('[data-view="exercises"]').click();
    if(exercise.index===38){
      const card=page.locator("#exerciseList .exercise").nth(exercise.index);
      assert.equal(await card.locator("#exerciseReasoning39").count(),1,
        "EX39 must provide a dedicated written-response field.");
      assert.equal(await card.locator(".exercise-reasoning li").count(),4,
        "EX39 must show all four reasoning criteria.");
      assert.match(await card.textContent(),/Exemple de réponse argumentée/,
        "EX39 must expose a model answer for self-review.");
      await card.locator("#exerciseReasoning39").fill("Le résultat AX=8 vérifie le calcul, pas les cycles. La BIU précharge les instructions pendant l'exécution de l'EU. Les accès mémoire et le bus influencent le temps réel. Le simulateur ne modélise pas les cycles matériels ni les états d'attente.");
      await page.locator("#exerciseList [data-check]").nth(exercise.index).click();
      assert.match(await page.locator("#status").textContent(),/Programme vérifié : AX=8/,
        "EX39 must report program validation separately from written reasoning.");
      assert.doesNotMatch(await card.textContent(),/✓ Réussi/,
        "EX39 must not be certified automatically when only the program is checked.");
    }else{
      await page.locator("#exerciseList [data-check]").nth(exercise.index).click();
      assert.match(await page.locator("#exerciseList .exercise").nth(exercise.index).textContent(),/Réussi/,
        "Exercise "+(exercise.index+1)+" correction must pass its own UI validator.");
    }
  }
  console.log("Guided correction hand-off and UI validation: 48/48 exercises PASS.");
  await page.locator('[data-view="editor"]').click();
  assert.equal(await page.locator("#view-editor").isVisible(),true,"Atelier must be a distinct view.");
  await page.locator('[data-view="learn"]').click();
  assert.equal(await page.locator("#view-learn").isVisible(),true,"Cours must be a distinct view.");
  console.log("Cours/Exercices/Atelier separation and exercise filters PASS.");

  // Converter rejects partial parses and invalid digits instead of silently accepting prefixes.
  await page.locator('[data-view="tools"]').click();
  await page.locator("#base").selectOption("16");
  await page.locator("#number").fill("2A");
  assert.equal((await page.locator("#dec").textContent()).trim(),"42");
  await page.locator("#number").fill("12G");
  assert.match(await page.locator("#convertStatus").textContent(),/entier valide/i);
  await page.locator("#base").selectOption("2");
  await page.locator("#number").fill("102");
  assert.match(await page.locator("#convertStatus").textContent(),/entier valide/i);
  await page.locator("#base").selectOption("10");
  await page.locator("#number").fill("65536");
  assert.match(await page.locator("#convertStatus").textContent(),/entier valide/i);
  await page.locator("#number").fill("65535");
  assert.equal((await page.locator("#hex").textContent()).trim(),"FFFF");
  assert.equal((await page.locator("#bin").textContent()).trim(),"1111111111111111");
  console.log("Base converter strict validation and 16-bit limits PASS.");

  // Real-browser JSON backup export/import round trip.
  const backupData = {
    "i86-lessons-v2": ["lesson-1", "lesson-2"],
    "i86-exercises": ["exercise-1"],
    "i86-chapter-scores-v2": {"0":8,"16":10},
    "i86-lesson-scores-v2": {"0-0":3,"16-2":2},
    "i86-title": "Projet navigateur",
    "i86-idea": "Restauration réelle Playwright",
    "i86-code": "MOV AX, 1234h\\nHLT"
  };
  await page.evaluate(data => {
    for (const [key,value] of Object.entries(data)) {
      localStorage.setItem(key, ["i86-title","i86-idea","i86-code"].includes(key) ? value : JSON.stringify(value));
    }
  }, backupData);
  await page.locator('[data-view="tools"]').click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportBackup").click();
  const backupDownload = await downloadPromise;
  const backupPath = path.join("artifacts", "browser-backup-roundtrip.json");
  await backupDownload.saveAs(backupPath);
  const exportedBackup = JSON.parse(fs.readFileSync(backupPath,"utf8"));
  assert.equal(exportedBackup.application,"Intel 8086 Lab");
  assert.equal(exportedBackup.backupVersion,1);
  assert.deepEqual(exportedBackup.data,backupData,"Downloaded JSON must contain all seven local data categories.");
  await page.evaluate(() => localStorage.setItem("i86-title","Valeur modifiée après export"));
  await page.locator("#backupFile").setInputFiles(backupPath);
  await page.waitForFunction(() => document.querySelector("#restoreBackup").disabled === false);
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#restoreBackup").click();
  const restoredBackup = await page.evaluate(() => ({
    "i86-lessons-v2":JSON.parse(localStorage.getItem("i86-lessons-v2")),
    "i86-exercises":JSON.parse(localStorage.getItem("i86-exercises")),
    "i86-chapter-scores-v2":JSON.parse(localStorage.getItem("i86-chapter-scores-v2")),
    "i86-lesson-scores-v2":JSON.parse(localStorage.getItem("i86-lesson-scores-v2")),
    "i86-title":localStorage.getItem("i86-title"),
    "i86-idea":localStorage.getItem("i86-idea"),
    "i86-code":localStorage.getItem("i86-code")
  }));
  assert.deepEqual(restoredBackup,backupData,"Import must restore all seven categories in the real browser.");
  console.log("Real-browser JSON export, download, validation, confirmation and seven-key restore PASS.");

  // Clear progress must remove the current versioned keys, including per-lesson scores.
  await page.evaluate(() => {
    localStorage.setItem("i86-lessons-v2", "[1,2]");
    localStorage.setItem("i86-exercises", "[0]");
    localStorage.setItem("i86-chapter-scores-v2", JSON.stringify({0:10}));
    localStorage.setItem("i86-lesson-scores-v2", JSON.stringify({"0-0":3}));
  });
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#clearProgress").click();
  const cleared = await page.evaluate(() => [
    "i86-lessons-v2","i86-exercises","i86-chapter-scores-v2","i86-lesson-scores-v2"
  ].map(key => localStorage.getItem(key)));
  assert.deepEqual(cleared,[null,null,null,null],"Clear progress must remove all current progress keys.");
  console.log("Progress reset removes all versioned lesson, exercise and quiz-score keys PASS.");

  // The application remains usable when browser storage is blocked.
  const blockedPage = await browser.newPage();
  const blockedErrors = [];
  blockedPage.on("pageerror", error => blockedErrors.push(error.message));
  await blockedPage.addInitScript(() => {
    Object.defineProperty(window,"localStorage",{configurable:true,get(){throw new DOMException("Storage blocked","SecurityError");}});
  });
  await blockedPage.goto("http://127.0.0.1:4173/?audit=1",{waitUntil:"networkidle"});
  assert.equal((await blockedPage.locator("h1").first().textContent()).trim(),"Intel 8086 Lab");
  await blockedPage.locator('[data-view="editor"]').click();
  await blockedPage.locator("#save").click();
  assert.match(await blockedPage.locator("#status").textContent(),/Stockage local indisponible/i);
  await blockedPage.locator('[data-view="tools"]').click();
  await blockedPage.locator("#backupFile").setInputFiles(path.resolve("artifacts/browser-backup-roundtrip.json"));
  await blockedPage.waitForFunction(() => document.querySelector("#restoreBackup").disabled === false);
  blockedPage.once("dialog", dialog => dialog.accept());
  await blockedPage.locator("#restoreBackup").click();
  assert.match(await blockedPage.locator("#backupStatus").textContent(),/Impossible de lire les données actuelles/i,
    "Restore must refuse cleanly when localStorage is inaccessible.");
  assert.deepEqual(blockedErrors,[],"Blocked localStorage must not crash the page.");
  await blockedPage.close();
  console.log("Blocked localStorage fallback PASS.");



  // Accessibility: visible names, keyboard order and responsive width across all primary views.
  const unnamedControlsFor = async rootSelector => page.locator(rootSelector).evaluate(root=>{
    const controls=[...root.querySelectorAll('button,input:not([type="hidden"]),select,textarea,a[href],[role="button"],[role="link"]')];
    const nameOf=el=>{
      const labelledBy=(el.getAttribute("aria-labelledby")||"").split(/\s+/).filter(Boolean)
        .map(id=>document.getElementById(id)?.textContent||"").join(" ").trim();
      const labels=el.labels?[...el.labels].map(label=>label.textContent.trim()).filter(Boolean).join(" "):"";
      return (el.getAttribute("aria-label")||labelledBy||labels||el.getAttribute("title")||
        el.innerText||el.textContent||el.getAttribute("value")||el.getAttribute("alt")||"").trim();
    };
    return controls.filter(el=>!nameOf(el)).map(el=>({
      tag:el.tagName.toLowerCase(),id:el.id,type:el.getAttribute("type"),role:el.getAttribute("role"),
      html:el.outerHTML.slice(0,180)
    }));
  });
  await page.locator('[data-view="learn"]').click();
  const chapterValues=await page.locator(".course-list-panel [data-lesson]").evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-lesson")));
  assert.equal(chapterValues.length,36,"Accessibility audit must traverse all 36 lesson views.");
  for(const chapterValue of chapterValues){
    await page.locator('[data-lesson="'+chapterValue+'"]').click();
    const unnamed=await unnamedControlsFor("#lessonDetail");
    assert.deepEqual(unnamed,[],"Chapter "+(Number(chapterValue)+1)+" contains controls without accessible names: "+JSON.stringify(unnamed));
  }
  for(const view of ["learn","exercises","editor","tools"]){
    await page.locator('[data-view="'+view+'"]').click();
    const unnamed=await unnamedControlsFor("#view-"+view);
    assert.deepEqual(unnamed,[],"The "+view+" view contains controls without accessible names: "+JSON.stringify(unnamed));
  }
  const positiveTabIndexes=await page.locator("[tabindex]").evaluateAll(nodes=>nodes
    .filter(node=>Number(node.getAttribute("tabindex"))>0)
    .map(node=>({tag:node.tagName,id:node.id,value:node.getAttribute("tabindex")})));
  assert.deepEqual(positiveTabIndexes,[],"Positive tabindex values must not disrupt natural keyboard order.");
  for(const width of [320,390,768,1280]){
    await page.setViewportSize({width,height:900});
    for(const view of ["learn","exercises","editor","tools"]){
      await page.locator('[data-view="'+view+'"]').click();
      const metrics=await page.evaluate(()=>({
        viewport:window.innerWidth,
        document:document.documentElement.scrollWidth,
        body:document.body.scrollWidth
      }));
      assert.ok(metrics.document<=metrics.viewport+1&&metrics.body<=metrics.viewport+1,
        "Horizontal page overflow in "+view+" at "+width+"px: "+JSON.stringify(metrics));
    }
  }
  console.log("Accessible control names, natural keyboard order and 320/390/768/1280px layout checks PASS.");

  assert.deepEqual(report.failures, [], report.failures.join("\n"));
  assert.deepEqual(errors, [], "Erreurs JavaScript dans la page : "+errors.join("; "));
  console.log(JSON.stringify({integratedSelfTests:summary,...report},null,2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
