const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};vm.createContext(context);
const injection="\nglobalThis.string8086={assemble:s=>assembleProgram(s),disassemble:b=>disassembleBytes(b),execute:s=>executeAll(s),binary:(b,c,i,st)=>executeBinary(b,c,i,st)};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);assert.notEqual(instrumented,match[1]);vm.runInContext(instrumented,context,{timeout:30000});
const api=context.string8086;assert.ok(api);
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log("PASS "+name);}catch(e){failed++;console.error("FAIL "+name+": "+e.message);}}
function physical(seg,off){return (((seg&65535)<<4)+(off&65535))&0xfffff;}
function checkByte(state,seg,off,value,label){assert.equal(state.mem[physical(seg,off)],value,label+" "+seg.toString(16)+":"+off.toString(16));}
function checkWord(state,seg,off,value,label){assert.equal(state.mem[physical(seg,off)],value&255,label+" low");assert.equal(state.mem[physical(seg,(off+1)&65535)],(value>>8)&255,label+" high");}
const flagPattern={CF:1,PF:1,AF:1,ZF:1,SF:1,TF:1,IF:1,DF:1,OF:1};
function checkFlags(state,expected,label){for(const k of Object.keys(expected))assert.equal(state.flags[k],expected[k],label+" "+k);}
function both(source){const assembled=api.assemble(source),bytes=Array.from(assembled.bytes),s=api.execute(source),b=api.binary(bytes,0,0,{});assert.ok(!s.error,"source: "+s.error);assert.ok(!b.error,"binary: "+b.error);assert.equal(s.execution.mode,"binary-offset");assert.equal(b.execution.mode,"dynamic-binary");return {s,b,bytes};}
const opcodes={MOVSB:0xA4,MOVSW:0xA5,CMPSB:0xA6,CMPSW:0xA7,STOSB:0xAA,STOSW:0xAB,LODSB:0xAC,LODSW:0xAD,SCASB:0xAE,SCASW:0xAF};
for(const [mnemonic,opcode] of Object.entries(opcodes)){
 test("opcode/assemble/disassemble "+mnemonic,()=>{
  const a=api.assemble(mnemonic),bytes=Array.from(a.bytes);
  assert.deepEqual(bytes,[opcode]);
  const d=api.disassemble(bytes);
  assert.equal(d.rows.length,1);
  assert.equal(d.rows[0].instruction,mnemonic);
  assert.deepEqual(Array.from(d.rows[0].bytes),[opcode]);
 });
}
test("MOVSB source/binary: DS:SI vers ES:DI, SI/DI +1, neuf FLAGS préservés",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV SI,0100h","MOV DI,0200h","MOV BYTE PTR [SI],41h","MOV AX,0FD7h","PUSH AX","POPF","MOVSB","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){checkByte(st,0x2000,0x0200,0x41,"MOVSB");assert.equal(st.reg.SI,0x0101);assert.equal(st.reg.DI,0x0201);checkFlags(st,flagPattern,"MOVSB");}
});
test("MOVSW source/binary: transfert mot little-endian et SI/DI +2",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV SI,0100h","MOV DI,0200h","MOV WORD PTR [SI],1234h","MOVSW","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){checkWord(st,0x2000,0x0200,0x1234,"MOVSW");assert.equal(st.reg.SI,0x0102);assert.equal(st.reg.DI,0x0202);}
});
test("LODSB source/binary: AL reçoit DS:SI, seul SI avance",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV SI,0100h","MOV BYTE PTR [SI],5Ah","MOV AX,0FD7h","PUSH AX","POPF","LODSB","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.reg.AX&255,0x5A);assert.equal(st.reg.SI,0x0101);assert.equal(st.reg.DI,0);checkFlags(st,flagPattern,"LODSB");}
});
test("LODSW source/binary: AX reçoit DS:SI, SI avance de deux",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV SI,0100h","MOV WORD PTR [SI],0BEEFh","LODSW","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.reg.AX,0xBEEF);assert.equal(st.reg.SI,0x0102);}
});
test("STOSB source/binary: AL vers ES:DI, seul DI avance",()=>{
 const src=["MOV AX,2000h","MOV ES,AX","MOV DI,0200h","MOV AL,6Ch","MOV AX,0FD7h","PUSH AX","POPF","MOV AL,6Ch","STOSB","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){checkByte(st,0x2000,0x0200,0x6C,"STOSB");assert.equal(st.reg.DI,0x0201);assert.equal(st.reg.SI,0);checkFlags(st,flagPattern,"STOSB");}
});
test("STOSW source/binary: AX vers ES:DI, DI avance de deux",()=>{
 const src=["MOV AX,2000h","MOV ES,AX","MOV DI,0200h","MOV AX,0BEEFh","STOSW","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){checkWord(st,0x2000,0x0200,0xBEEF,"STOSW");assert.equal(st.reg.DI,0x0202);}
});
test("CMPSB source/binary: DS:SI moins ES:DI, FLAGS et index mis à jour",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV SI,0100h","MOV DI,0200h","MOV BYTE PTR [SI],10h","MOV BYTE PTR ES:[DI],20h","CMPSB","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.reg.SI,0x0101);assert.equal(st.reg.DI,0x0201);assert.equal(st.flags.CF,1);assert.equal(st.flags.ZF,0);assert.equal(st.flags.SF,1);assert.equal(st.flags.OF,0);assert.equal(st.flags.PF,1);assert.equal(st.flags.AF,0);}
});
test("CMPSW source/binary: comparaison de mots et FLAGS",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV SI,0100h","MOV DI,0200h","MOV WORD PTR [SI],1000h","MOV WORD PTR ES:[DI],2000h","CMPSW","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.reg.SI,0x0102);assert.equal(st.reg.DI,0x0202);assert.equal(st.flags.CF,1);assert.equal(st.flags.ZF,0);assert.equal(st.flags.SF,1);assert.equal(st.flags.OF,0);assert.equal(st.flags.PF,1);}
});
test("SCASB source/binary: AL moins ES:DI, égalité ZF=1",()=>{
 const src=["MOV AX,2000h","MOV ES,AX","MOV DI,0200h","MOV BYTE PTR ES:[DI],42h","MOV AL,42h","SCASB","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.reg.DI,0x0201);assert.equal(st.flags.ZF,1);assert.equal(st.flags.CF,0);assert.equal(st.flags.SF,0);assert.equal(st.flags.OF,0);}
});
test("SCASW source/binary: comparaison mot, DI avance de deux",()=>{
 const src=["MOV AX,2000h","MOV ES,AX","MOV DI,0200h","MOV WORD PTR ES:[DI],1234h","MOV AX,1234h","SCASW","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.reg.DI,0x0202);assert.equal(st.flags.ZF,1);assert.equal(st.flags.CF,0);assert.equal(st.flags.SF,0);assert.equal(st.flags.OF,0);}
});
test("CS override sur MOVSB: CS:SI source, ES:DI destination",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV BYTE PTR CS:[0100h],5Ah","MOV SI,0100h","MOV DI,0200h","CS: MOVSB","HLT"].join("\n");
 const {s,b,bytes}=both(src);assert.ok(bytes.includes(0x2E));for(const st of [s,b]){checkByte(st,0x2000,0x0200,0x5A,"CS override MOVSB");assert.equal(st.reg.SI,0x0101);assert.equal(st.reg.DI,0x0201);}
});
test("CS override sur LODSB: source segment remplacé",()=>{
 const src=["MOV BYTE PTR CS:[0100h],7Bh","MOV SI,0100h","CS: LODSB","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.reg.AX&255,0x7B);assert.equal(st.reg.SI,0x0101);}
});
test("CS override sur CMPSB: seule la source est remplacée, destination reste ES",()=>{
 const src=["MOV AX,2000h","MOV ES,AX","MOV BYTE PTR CS:[0100h],33h","MOV BYTE PTR ES:[0200h],33h","MOV SI,0100h","MOV DI,0200h","CS: CMPSB","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.flags.ZF,1);assert.equal(st.reg.SI,0x0101);assert.equal(st.reg.DI,0x0201);}
});
test("REP MOVSB: CX contrôle trois copies et s'épuise",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV SI,0100h","MOV DI,0200h","MOV BYTE PTR [SI],11h","MOV BYTE PTR [SI+1],22h","MOV BYTE PTR [SI+2],33h","MOV CX,3","CLD","REP MOVSB","HLT"].join("\n");
 const {s,b,bytes}=both(src);assert.ok(bytes.includes(0xF3));for(const st of [s,b]){checkByte(st,0x2000,0x0200,0x11,"REP MOVSB");checkByte(st,0x2000,0x0201,0x22,"REP MOVSB");checkByte(st,0x2000,0x0202,0x33,"REP MOVSB");assert.equal(st.reg.CX,0);assert.equal(st.reg.SI,0x0103);assert.equal(st.reg.DI,0x0203);}
});
test("REPE CMPSB: arrêt après première différence",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV SI,0100h","MOV DI,0200h","MOV BYTE PTR [SI],11h","MOV BYTE PTR [SI+1],22h","MOV BYTE PTR ES:[DI],11h","MOV BYTE PTR ES:[DI+1],99h","MOV CX,3","CLD","REPE CMPSB","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.reg.CX,1);assert.equal(st.reg.SI,0x0102);assert.equal(st.reg.DI,0x0202);assert.equal(st.flags.ZF,0);assert.equal(st.flags.CF,1);}
});
test("REPNE SCASB: arrêt sur égalité",()=>{
 const src=["MOV AX,2000h","MOV ES,AX","MOV DI,0200h","MOV BYTE PTR ES:[DI],11h","MOV BYTE PTR ES:[DI+1],42h","MOV BYTE PTR ES:[DI+2],33h","MOV AL,42h","MOV CX,3","CLD","REPNE SCASB","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.reg.CX,1);assert.equal(st.reg.DI,0x0202);assert.equal(st.flags.ZF,1);}
});
test("REP avec CX=0: aucun accès ni changement des index/FLAGS",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV SI,0100h","MOV DI,0200h","MOV CX,0","MOV AX,0FD7h","PUSH AX","POPF","REP MOVSB","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.reg.CX,0);assert.equal(st.reg.SI,0x0100);assert.equal(st.reg.DI,0x0200);checkFlags(st,flagPattern,"REP CX=0");assert.equal(st.mem[physical(0x2000,0x0200)],undefined);}
});
test("DF=1: MOVSB décrémente SI et DI",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV SI,0101h","MOV DI,0201h","MOV BYTE PTR [SI],5Ah","STD","MOVSB","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){checkByte(st,0x2000,0x0201,0x5A,"STD MOVSB");assert.equal(st.reg.SI,0x0100);assert.equal(st.reg.DI,0x0200);assert.equal(st.flags.DF,1);}
});
test("MOVSW à l'offset FFFFh: les deux octets traversent le wrap 16 bits",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV SI,0FFFFh","MOV DI,0FFFFh","MOV BYTE PTR [SI],34h","MOV BYTE PTR [0],12h","CLD","MOVSW","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){checkByte(st,0x2000,0xFFFF,0x34,"MOVSW wrap");checkByte(st,0x2000,0x0000,0x12,"MOVSW wrap");assert.equal(st.reg.SI,1);assert.equal(st.reg.DI,1);}
});
console.log("8086 string instruction audit: "+passed+"/"+(passed+failed)+" tests passed.");
if(failed)process.exit(1);
