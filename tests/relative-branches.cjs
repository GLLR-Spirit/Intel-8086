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
const injection = "\nglobalThis.__8086RelativeApi = { assemble: s => assembleProgram(s), disassemble: b => disassembleBytes(b), execute: s => executeAll(s) };\n})();\n";
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
function flagsSub(a,b){const r=(a-b)&65535;return {CF:a<b?1:0,ZF:r===0?1:0,SF:(r>>15)&1,OF:(((a^b)&(a^r)&0x8000)!==0)?1:0,PF:parity8(r)};}
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
  test(mnemonic+" branch truth table for CMP "+a.toString(16)+","+b.toString(16),()=>{
   const source="MOV AX, "+a+"\nMOV DX, "+b+"\nCMP AX, DX\n"+mnemonic+" TAKEN\nMOV BX, 0\nJMP END\nTAKEN: MOV BX, 1\nEND: HLT";
   const state=run(source);assert.equal(state.reg.BX,predicate(f)?1:0);
  });
  counts.conditions++;
 }
}

// LOOP is E2 rel8; it decrements CX, branches iff the result is nonzero, and leaves FLAGS unchanged.
test("LOOP assembles and disassembles E2 rel8",()=>{
 assert.deepEqual(assemble("LOOP TARGET\nTARGET: HLT").slice(0,2),[0xE2,0x00]);
 assert.equal(decode([0xE2,0xFE]),"LOOP 0000h");
});counts.loop++;
test("LOOP runs exactly CX iterations and preserves FLAGS",()=>{
 const state=run("MOV CX, 3\nMOV AX, 0\nCLC\nAGAIN: INC AX\nLOOP AGAIN\nHLT");
 assert.equal(state.reg.AX,3);assert.equal(state.reg.CX,0);assert.equal(state.flags.CF,0);
});counts.loop++;
test("LOOP with CX=0 wraps to FFFF and continues",()=>{
 const state=run("MOV CX, 0\nLOOP DONE\nMOV AX, 1\nDONE: HLT");
 assert.equal(state.reg.CX,0xFFFF);assert.equal(state.reg.AX,0);
});counts.loop++;

// Independent byte-offset calculations for signed displacements and wraparound.
for(const [code,target] of [
 [[0xEB,0x7F],0x81],[[0xEB,0x80],0xFF82],
 [[0xE2,0xFE],0],[[0xE8,0xFF,0x7F],0x8002],
 [[0xE9,0x00,0x80],0x8003],[[0x74,0xFE],0]
]){
 test("relative target offset "+code.map(x=>x.toString(16)).join(" "),()=>{
  const actual=decode(code);assert.ok(actual.endsWith(target.toString(16).toUpperCase().padStart(4,"0")+"h"),actual);
 });
 counts.decode++;
}
for(const code of [[0xEB],[0xE2],[0x70],[0x7F],[0xE8],[0xE8,0],[0xE9],[0xE9,0],[0x74]]){
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
