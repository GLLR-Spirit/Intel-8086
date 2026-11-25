const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/?audit=1", { waitUntil: "networkidle" });

  await page.locator("#runSelfTests").click();
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
  assert.deepEqual(report.failures, [], report.failures.join("\n"));
  assert.deepEqual(errors, [], "Erreurs JavaScript dans la page : "+errors.join("; "));
  console.log(JSON.stringify({integratedSelfTests:summary,...report},null,2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
