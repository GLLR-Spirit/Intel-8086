const { chromium } = require("playwright");
const assert = require("node:assert/strict");

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
    assert.match(await page.locator("#lessonDetail .eyebrow").textContent(),new RegExp("Chapitre "+(chapter+1)+"\\/36"),"Lesson detail must match selected chapter "+(chapter+1)+".");
    if(chapter>0)assert.equal(await page.locator('[data-lesson="' + (chapter-1) + '"]').getAttribute("aria-current"),null,"Previous chapter must no longer be current.");
  }
  console.log("Course visual coverage: 36/36 chapters have a diagram or visual model.");
  await page.locator('[data-view="instructions"]').click();
  await page.locator("#searchInstruction").fill("PORT");
  const portReferenceCodes=await page.locator("#instructionGrid .inst code").allTextContents();
  assert.ok(portReferenceCodes.includes("PORT"),"The PORT directive must be discoverable in the technical reference.");
  assert.match(await page.locator("#instructionGrid .inst").filter({hasText:"PORT"}).first().textContent(),/IN et OUT/);
  await page.locator("#searchInstruction").fill("VECTOR");
  const vectorReferenceCodes=await page.locator("#instructionGrid .inst code").allTextContents();
  assert.ok(vectorReferenceCodes.includes("VECTOR"),
    "The VECTOR directive must remain documented separately from hardware opcodes.");
  await page.locator('[data-view="learn"]').click();


  // Keyboard and assistive-technology navigation semantics on a fresh page.
  const keyboardPage = await browser.newPage();
  await keyboardPage.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await keyboardPage.keyboard.press("Tab");
  assert.ok(await keyboardPage.evaluate(() => document.activeElement.classList.contains("skip-link")),"The first keyboard stop must be the skip link.");
  assert.equal(await keyboardPage.locator(".skip-link").evaluate(el => getComputedStyle(el).top),"12px","Skip link must become visible on focus.");
  await keyboardPage.locator('[data-view="editor"]').click();
  assert.equal(await keyboardPage.locator('[data-view="editor"]').getAttribute("aria-current"),"page");
  await keyboardPage.locator('[data-mode="guided"]').click();
  assert.equal(await keyboardPage.locator('[data-mode="guided"]').getAttribute("aria-pressed"),"true");
  assert.equal(await keyboardPage.locator('[data-mode="free"]').getAttribute("aria-pressed"),"false");
  await keyboardPage.close();
  console.log("Keyboard skip navigation, visible focus, aria-current and aria-pressed PASS.");

  // Course example hand-off must load the selected lesson's exact source into the editor.
  await page.locator('[data-lesson="0"]').click();
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

  await page.locator("#code").fill("MOV AX, 4321h\\nHLT");
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

  await page.locator('[data-lesson="19"]').click();
  await page.locator("#calcEffectiveAddress").click();
  assert.match(await page.locator("#eaDemoResult").textContent(), /EA=0106h/);

  await page.locator('[data-lesson="20"]').click();
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

  await page.locator('[data-lesson="19"]').click();
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
  const firstChapterValue=await page.locator("#exerciseChapter option").nth(1).getAttribute("value");
  assert.ok(firstChapterValue,"A chapter filter option must be populated.");
  await page.locator("#exerciseChapter").selectOption(firstChapterValue);
  await page.locator("#exerciseDifficulty").selectOption("Débutant");
  await page.locator("#exerciseType").selectOption("application");
  const filteredText=(await page.locator("#exerciseCount").textContent()).trim();
  assert.match(filteredText,/exercice\(s\) affiché\(s\) sur/);
  const filteredCount=Number(filteredText.match(/^(\d+)/)[1]);
  assert.ok(filteredCount>0,"The first chapter must have at least one correctly mapped beginner application.");
  assert.equal(await page.locator("#exerciseList .exercise").count(),filteredCount);
  for(const card of await page.locator("#exerciseList .exercise").all()){
    assert.equal((await card.locator(".eyebrow").textContent()).trim(),"Débutant · Application directe",
      "Every filtered exercise must match the selected difficulty and type.");
    assert.match(await card.locator("p.muted").nth(1).textContent(),/1\. Introduction au microprocesseur Intel 8086/,
      "Every filtered exercise must be genuinely associated with the selected chapter.");
  }
  const firstExerciseStarter=await page.evaluate(()=>window.__8086Audit.exercises[5][2]);
  const firstExerciseSolution=await page.evaluate(()=>window.__8086Audit.exercises[5][4].solution||window.__8086Audit.exercises[5][2]);
  const firstExerciseAX=await page.evaluate(src=>window.__8086Audit.executeAll(src).reg.AX,firstExerciseSolution);
  assert.equal(filteredCount,1,"The explicit chapter mapping should leave one beginner application for chapter 1.");
  await page.locator("#exerciseList [data-load]").first().click();
  assert.equal(await page.locator("#code").inputValue(),firstExerciseStarter,
    "Loading an exercise statement must copy its starter source into the editor.");
  await page.locator('[data-view="exercises"]').click();
  await page.locator("#exerciseList details.exercise-guide summary").first().click();
  await page.locator("#exerciseList [data-solution]").first().click();
  assert.equal(await page.locator("#code").inputValue(),firstExerciseSolution,
    "Loading the correction must copy the complete guided solution into the editor.");
  await page.locator("#run").click();
  assert.ok((await page.locator("#regs").textContent()).includes(firstExerciseAX.toString(16).toUpperCase().padStart(4,"0")+"h"),
    "The loaded exercise solution must execute to its expected register result.");
  await page.locator('[data-view="exercises"]').click();
  await page.locator("#resetExerciseFilters").click();
  assert.equal((await page.locator("#exerciseCount").textContent()).trim(),allExerciseText,"Reset must restore the full exercise list.");
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
  assert.deepEqual(blockedErrors,[],"Blocked localStorage must not crash the page.");
  await blockedPage.close();
  console.log("Blocked localStorage fallback PASS.");



  assert.deepEqual(report.failures, [], report.failures.join("\n"));
  assert.deepEqual(errors, [], "Erreurs JavaScript dans la page : "+errors.join("; "));
  console.log(JSON.stringify({integratedSelfTests:summary,...report},null,2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
