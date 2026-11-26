const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Inline application script must exist");
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});
  return elements.get(id);
}
const context = {document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};
vm.createContext(context);
const injection = "\nglobalThis.__8086RelativeApi = { assemble: s => assembleProgram(s), disassemble: b => disassembleBytes(b), execute: s => executeAll(s), executeBinary: (b,cs,ip,state) => executeBinary(b,cs,ip,state) };\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "API injection point");
vm.runInContext(instrumented, context, {timeout:20000});
const api=context.__8086RelativeApi;
let passed=0,failed=0;
const counts={short:0,near:0,conditions:0,loop:0,decode:0,truncated:0,execution:0};
function test(name,fn){try{fn();passed++;}catch(e){failed++;console.error("FAIL "+name+": "+e.message);}}
function assemble(source){return Array.from(api.assemble(source).bytes);}
function decode(bytes){const r=api.disassemble(bytes);assert.equal(r.rows.length,1);assert.deepEqual(Array.from(r.rows[0].bytes),bytes);return r.rows[0].instruction;}
function run(source){const r=api.execute(source);assert.ok(!r.error,r.error||"execution failed");return r;}
function nops(n){return Array(n).fill("NOP").join("\n");}
function signed16(x){return ((x+32768)&65535)-32768;}
function parity8(x){x&=255;let p=0;for(let i=0;i<8;i++)p^=(x>>i)&1;return p===0?1:0;}
function flagsSub(a,b){const r=(a-b)&65535;return {CF:a<b?1:0,PF:parity8(r),AF:((a^b^r)&0x10)?1:0,ZF:r===0?1:0,SF:(r>>15)&1,OF:(((a^b)&(a^r)&0x8000)!==0)?1:0};}
const conditions=[
 ["JO",0x70,f=>f.OF===1],["JNO",0x71,f=>f.OF===0],
 ["JB",0x72,f=>f.CF===1],["JAE",0x73,f=>f.CF===0],
 ["JE",0x74,f=>f.ZF===1],["JNE",0x75,f=>f.ZF===0],
 ["JBE",0x76,f=>f.CF===1||f.ZF===1],["JA",0x77,f=>f.CF===0&&f.ZF===0],
 ["JS",0x78,f=>f.SF===1],["JNS",0x79,f=>f.SF===0],
 ["JP",0x7A,f=>f.PF===1],["JNP",0x7B,f=>f.PF===0],
 ["JL",0x7C,f=>f.SF!==f.OF],["JGE",0x7D,f=>f.SF===f.OF],
 ["JLE",0x7E,f=>f.ZF===1||f.SF!==f.OF],["JG",0x7F,f=>f.ZF===0&&f.SF===f.OF]
];

// EB short jump relaxation and signed 8-bit boundaries.
for(const [name,source,expected] of [
 ["forward +127","JMP TARGET\n"+nops(127)+"\nTARGET: HLT",[0xEB,0x7F]],
 ["backward -128","TOP: "+ "NOP\n"+nops(125)+"\nJMP TOP\nHLT",[0xEB,0x80]],
 ["forward +128 falls back to near","JMP TARGET\n"+nops(128)+"\nTARGET: HLT",[0xE9,0x80,0x00]],
 ["backward -129 falls back to near","TOP: NOP\n"+nops(126)+"\nJMP TOP\nHLT",[0xE9,0x7E,0xFF]]
]) {
 test("JMP relaxation "+name,()=>{const all=assemble(source);const actual=name.startsWith("backward")?all.slice(all.lastIndexOf(expected[0]),all.lastIndexOf(expected[0])+expected.length):all.slice(0,expected.length);assert.deepEqual(actual,expected);});
 counts.short++;
}
test("JMP relaxation updates later label offsets after shortening",()=>{
 const a=api.assemble("JMP L1\nJMP L2\nL1: NOP\nL2: HLT");
 assert.deepEqual(Array.from(a.bytes),[0xEB,0x02,0xEB,0x01,0x90,0xF4]);
 assert.equal(a.symbols.L1,4);assert.equal(a.symbols.L2,5);
});counts.short++;

// CALL rel16 uses signed displacement relative to the end of the 3-byte instruction.
for(const [name,source,expected] of [
 ["+32767","CALL TARGET\n"+nops(32767)+"\nTARGET: HLT",[0xE8,0xFF,0x7F]],
 ["-32768","TARGET: NOP\n"+nops(32764)+"\nCALL TARGET",[0xE8,0x00,0x80]]
]){
 test("CALL rel16 boundary "+name,()=>{const all=assemble(source);assert.deepEqual(name==="+32767"?all.slice(0,3):all.slice(-3),expected);});
 counts.near++;
}
test("CALL rel16 displacement wraps through 16-bit IP",()=>{
 const bytes=assemble("CALL TARGET\n"+nops(32768)+"\nTARGET: HLT");
 assert.deepEqual(bytes.slice(0,3),[0xE8,0x00,0x80]);
});counts.near++;
test("JMP near uses E9 when short range is exceeded",()=>{
 const b=assemble("JMP TARGET\n"+nops(128)+"\nTARGET: HLT");
 assert.deepEqual(b.slice(0,3),[0xE9,0x80,0x00]);
});counts.near++;

// All sixteen condition codes: opcode map and independent target resolution.
for(const [mnemonic,opcode] of conditions){
 test(mnemonic+" assembles to its canonical 70h-7Fh opcode",()=>{
  const b=assemble(mnemonic+" TARGET\nTARGET: HLT");
  assert.deepEqual(b.slice(0,2),[opcode,0]);
 });
 test(mnemonic+" disassembles rel8 target",()=>{
  assert.equal(decode([opcode,0xFE]),mnemonic+" 0000h");
 });
 counts.conditions+=2;
}

// Independent arithmetic-derived flags test every condition across varied operands.
const pairs=[[0,0],[0,1],[1,0],[0x7FFF,0xFFFF],[0x8000,1],[0xFFFF,1],[0x1234,0x4321],[0x8000,0x7FFF]];
for(const [a,b] of pairs){
 const f=flagsSub(a,b);
 for(const [mnemonic,,predicate] of conditions){
  test(mnemonic+" source/binary truth table for CMP "+a.toString(16)+","+b.toString(16),()=>{
   const source="MOV AX, "+a+"\nMOV DX, "+b+"\nCMP AX, DX\n"+mnemonic+" TAKEN\nMOV BX, 0\nJMP END\nTAKEN: MOV BX, 1\nEND: HLT";
   const bytes=assemble(source);
   const states=[["source",run(source)],["binary",api.executeBinary(bytes,0,0,{})]];
   for(const [mode,state] of states){
    assert.ok(!state.error,mode+" "+mnemonic+" "+(state.error||""));
    assert.equal(state.reg.BX,predicate(f)?1:0,mode+" branch outcome");
    for(const flag of ["CF","PF","AF","ZF","SF","OF"])assert.equal(state.flags[flag],f[flag],mode+" "+flag);
   }
  });
  counts.conditions++;
 }
}

// LOOP family: all four opcodes, both source and binary execution paths.
const loopForms=[["LOOPNE",0xE0],["LOOPE",0xE1],["LOOP",0xE2],["JCXZ",0xE3]];
for(const [mnemonic,opcode] of loopForms){
 test(mnemonic+" assembles to its canonical rel8 opcode",()=>{
  assert.deepEqual(assemble(mnemonic+" TARGET\nTARGET: HLT").slice(0,2),[opcode,0]);
 });
 test(mnemonic+" disassembles rel8 target",()=>{
  assert.equal(decode([opcode,0xFE]),mnemonic+" 0000h");
 });
 counts.loop+=2;
}
const seededLoopFlags={CF:1,PF:1,AF:1,ZF:1,SF:1,TF:1,IF:1,DF:0,OF:1};
const equalCompareFlags={CF:0,PF:1,AF:0,ZF:1,SF:0,TF:1,IF:1,DF:0,OF:0};
const unequalCompareFlags={CF:1,PF:1,AF:1,ZF:0,SF:1,TF:1,IF:1,DF:0,OF:0};
function verifyLoopCase(mnemonic,cx,zf,taken,expectedCX,label){
 const lines=["MOV AX, 0BD5h","PUSH AX","POPF","MOV AX, 1","MOV DX, 2","MOV CX, "+cx];
 if(zf!==null)lines.push(zf?"CMP AX, AX":"CMP AX, DX");
 lines.push(mnemonic+" TAKEN","MOV BX, 0","JMP END","TAKEN: MOV BX, 1","END: HLT");
 const source=lines.join("\n"),bytes=assemble(source);
 const expectedFlags=zf===null?seededLoopFlags:(zf?equalCompareFlags:unequalCompareFlags);
 const states=[["source",run(source)],["binary",api.executeBinary(bytes,0,0,{})]];
 for(const [mode,state] of states){
  assert.ok(!state.error,mode+" "+label+" "+(state.error||""));
  assert.equal(state.reg.BX,taken?1:0,mode+" "+label+" branch");
  assert.equal(state.reg.CX,expectedCX,mode+" "+label+" CX");
  for(const flag of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])
   assert.equal(state.flags[flag],expectedFlags[flag],mode+" "+label+" "+flag);
 }
}
for(const [cx,taken,expectedCX] of [[2,true,1],[1,false,0],[0,true,0xFFFF]]){
 test("LOOP source/binary CX="+cx,()=>verifyLoopCase("LOOP",cx,null,taken,expectedCX,"LOOP CX="+cx));
 counts.loop++;
}
for(const [mnemonic,zf,taken] of [
 ["LOOPE",true,true],["LOOPE",false,false],["LOOPE",true,false,1],
 ["LOOPNE",false,true],["LOOPNE",true,false],["LOOPNE",false,false,1]
]){
 const cx=arguments.length===4?1:2;
 const expectedCX=(cx-1)&0xFFFF;
 test(mnemonic+" source/binary ZF="+(zf?1:0)+" CX="+cx,()=>{
  verifyLoopCase(mnemonic,cx,zf,taken,expectedCX,mnemonic+" ZF="+(zf?1:0)+" CX="+cx);
 });
 counts.loop++;
}
for(const [cx,taken] of [[0,true],[1,false]]){
 test("JCXZ source/binary CX="+cx,()=>verifyLoopCase("JCXZ",cx,null,taken,cx,"JCXZ CX="+cx));
 counts.loop++;
}

// Independent byte-offset calculations for signed displacements and wraparound.
for(const [code,target] of [
 [[0xEB,0x7F],0x81],[[0xEB,0x80],0xFF82],
 [[0xE0,0xFE],0],[[0xE1,0xFE],0],[[0xE2,0xFE],0],[[0xE3,0xFE],0],[[0xE8,0xFF,0x7F],0x8002],
 [[0xE9,0x00,0x80],0x8003],[[0x74,0xFE],0]
]){
 test("relative target offset "+code.map(x=>x.toString(16)).join(" "),()=>{
  const actual=decode(code);assert.ok(actual.endsWith(target.toString(16).toUpperCase().padStart(4,"0")+"h"),actual);
 });
 counts.decode++;
}
for(const code of [[0xEB],[0xE0],[0xE1],[0xE2],[0xE3],[0x70],[0x7F],[0xE8],[0xE8,0],[0xE9],[0xE9,0],[0x74]]){
 test("truncated relative instruction "+code.map(x=>x.toString(16)).join(" "),()=>assert.throws(()=>api.disassemble(code),/tronqué/i));
 counts.truncated++;
}

console.log("JMP short / relaxation : "+counts.short+" vecteurs.");
console.log("CALL/JMP near rel16 : "+counts.near+" vecteurs.");
console.log("Conditions 70h-7Fh : "+counts.conditions+" vecteurs.");
console.log("LOOP : "+counts.loop+" vecteurs.");
console.log("Offsets et désassemblage : "+counts.decode+" vecteurs.");
console.log("Flux tronqués : "+counts.truncated+" vecteurs.");
console.log("Total branchements relatifs : "+passed+" réussis, "+failed+" échecs.");
if(failed)process.exit(1);
