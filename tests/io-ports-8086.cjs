const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};vm.createContext(context);
const injection="\nglobalThis.io8086={assemble:s=>assembleProgram(s),disassemble:b=>disassembleBytes(b),execute:s=>executeAll(s),binary:(b,c,i,st)=>executeBinary(b,c,i,st)};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);assert.notEqual(instrumented,match[1]);vm.runInContext(instrumented,context,{timeout:30000});
const api=context.io8086;assert.ok(api);
let passed=0,failed=0;function test(name,fn){try{fn();passed++;console.log("PASS "+name);}catch(e){failed++;console.error("FAIL "+name+": "+e.message);}}
const flags={CF:1,PF:1,AF:1,ZF:1,SF:1,TF:1,IF:1,DF:1,OF:1};
function sameFlags(state,label){for(const k of Object.keys(flags))assert.equal(state.flags[k],flags[k],label+" "+k);}
function both(source,io={}){const assembled=api.assemble(source),bytes=Array.from(assembled.bytes),s=api.execute(source),b=api.binary(bytes,0,0,{io});assert.ok(!s.error,"source: "+s.error);assert.ok(!b.error,"binary: "+b.error);assert.equal(s.execution.mode,"binary-offset");assert.equal(b.execution.mode,"dynamic-binary");return {s,b,bytes};}
const encodings=[
 ["IN AL, 10h",[0xE4,0x10]],["IN AX, 10h",[0xE5,0x10]],["IN AL, DX",[0xEC]],["IN AX, DX",[0xED]],
 ["OUT 10h, AL",[0xE6,0x10]],["OUT 10h, AX",[0xE7,0x10]],["OUT DX, AL",[0xEE]],["OUT DX, AX",[0xEF]]
];
for(const [source,expected] of encodings)test("encodage/désassemblage "+source,()=>{const bytes=Array.from(api.assemble(source).bytes);assert.deepEqual(bytes,expected);const d=api.disassemble(bytes);assert.equal(d.rows.length,1);assert.deepEqual(Array.from(d.rows[0].bytes),expected);assert.equal(d.rows[0].instruction,source);});
test("IN AL,imm8: lecture du port 10h, AL mis à jour, FLAGS préservés",()=>{
 const src=["PORT 10h, 0ABCDh","MOV AX,0FD7h","PUSH AX","POPF","IN AL,10h","HLT"].join("\n");
 const {s,b}=both(src,{16:0xABCD});for(const st of [s,b]){assert.equal(st.reg.AX&255,0xCD);sameFlags(st,"IN AL,imm8");}
});
test("IN AX,imm8: lecture d'un mot depuis le port immédiat",()=>{
 const src=["PORT 10h, 0ABCDh","IN AX,10h","HLT"].join("\n");
 const {s,b}=both(src,{16:0xABCD});for(const st of [s,b])assert.equal(st.reg.AX,0xABCD);
});
test("IN AL,DX: adresse de port 16 bits",()=>{
 const src=["PORT 1234h, 0BEEFh","MOV DX,1234h","IN AL,DX","HLT"].join("\n");
 const {s,b}=both(src,{0x1234:0xBEEF});for(const st of [s,b])assert.equal(st.reg.AX&255,0xEF);
});
test("IN AX,DX: lecture 16 bits depuis un port DX",()=>{
 const src=["PORT 1234h, 0BEEFh","MOV DX,1234h","IN AX,DX","HLT"].join("\n");
 const {s,b}=both(src,{0x1234:0xBEEF});for(const st of [s,b])assert.equal(st.reg.AX,0xBEEF);
});
test("OUT imm8,AL: écriture octet et FLAGS préservés",()=>{
 const src=["MOV AX,0FD7h","PUSH AX","POPF","MOV AL,5Ah","OUT 10h,AL","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b]){assert.equal(st.io[0x10],0x5A);sameFlags(st,"OUT AL");}
});
test("OUT imm8,AX: écriture mot",()=>{
 const src=["MOV AX,0BEEFh","OUT 10h,AX","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b])assert.equal(st.io[0x10],0xBEEF);
});
test("OUT DX,AL: adresse DX 16 bits et transfert octet",()=>{
 const src=["MOV DX,1234h","MOV AL,0A6h","OUT DX,AL","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b])assert.equal(st.io[0x1234],0xA6);
});
test("OUT DX,AX: adresse DX 16 bits et transfert mot",()=>{
 const src=["MOV DX,0F234h","MOV AX,0CDEFh","OUT DX,AX","HLT"].join("\n");
 const {s,b}=both(src);for(const st of [s,b])assert.equal(st.io[0xF234],0xCDEF);
});
for(const [source,pattern] of [
 ["IN BX,10h",/AL ou AX/],["IN DX,10h",/AL ou AX/],["IN AL,1234h",/00h et FFh/],
 ["OUT 10h,BX",/AL ou AX/],["OUT DX,10h",/AL ou AX/],["OUT 100h,AL",/00h et FFh/]
])test("rejet opérande E/S invalide "+source,()=>assert.throws(()=>api.assemble(source),pattern));
test("PORT refuse un numéro hors 16 bits",()=>{const state=api.execute("PORT 10000h,1\nHLT");assert.ok(state.error&&state.error.includes("16 bits"),state.error||"PORT accepted an invalid port number");});
console.log("8086 IN/OUT audit: "+passed+"/"+(passed+failed)+" tests passed; I/O remains a software port map, not physical hardware.");
if(failed)process.exit(1);
