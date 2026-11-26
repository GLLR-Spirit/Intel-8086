const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};vm.createContext(context);
const inject="\nglobalThis.api={assemble:s=>assembleProgram(s),disassemble:b=>disassembleBytes(b),execute:s=>executeAll(s),binary:(b,c,i,s)=>executeBinary(b,c,i,s)};\n})();\n";
vm.runInContext(match[1].replace(/\n\}\)\(\);\s*$/,inject),context,{timeout:10000});const api=context.api;assert.ok(api);
let pass=0,fail=0;function test(n,f){try{f();pass++;}catch(e){fail++;console.error("FAIL "+n+": "+e.message);}}
const regs=["AX","CX","DX","BX","SP","BP","SI","DI"],forms=["[BX+SI]","[BX+DI]","[BP+SI]","[BP+DI]","[SI]","[DI]","[BP]","[BX]","[1234h]"];
function program(op,ea,seg="DS",dest="AX",prefix=""){
 const base=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV SS,AX","MOV AX,3000h","MOV ES,AX",
 "MOV BX,0100h","MOV BP,0200h","MOV SI,0030h","MOV DI,0040h"];
 const mem=prefix+ea;
 base.push("MOV AX,5678h","MOV WORD PTR "+mem+",AX","MOV AX,1234h","MOV WORD PTR "+prefix+ea.replace(/\]$/,"+2]")+",AX");
 base.push(op+" "+dest+", "+prefix+ea,"HLT");
 return base.join("\n");
}
function both(src){const a=api.execute(src);assert.ok(!a.error,a.error||"source");const asm=api.assemble(src);const b=api.binary(Array.from(asm.bytes),0,0);assert.ok(!b.error,b.error||"binary");return [a,b,Array.from(asm.bytes)];}
function core(a,b,label){for(const r of ["AX","BX","CX","DX","SP","BP","SI","DI","CS","DS","ES","SS"])assert.equal(a.reg[r],b.reg[r],label+" "+r);for(const f of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])assert.equal(a.flags[f],b.flags[f],label+" "+f);}
for(const op of ["LDS","LES"])for(const ea of forms)test(op+" 16:16 pointer "+ea,()=>{
 const [a,b]=both(program(op,ea,"DS","CX"));
 for(const s of [a,b]){assert.equal(s.reg.CX,0x5678,op+" offset low word");assert.equal(s.reg[op==="LDS"?"DS":"ES"],0x1234,op+" segment high word");}
 core(a,b,op+" "+ea);
});
for(const op of ["LDS","LES"])for(const d of regs)test(op+" destination "+d,()=>{
 const [a,b]=both(program(op,"[BX+SI]","DS",d));
 assert.equal(a.reg[d],0x5678);assert.equal(b.reg[d],0x5678);
 assert.equal(a.reg[op==="LDS"?"DS":"ES"],0x1234);assert.equal(b.reg[op==="LDS"?"DS":"ES"],0x1234);
});
for(const op of ["LDS","LES"])test(op+" segment override ES memory source",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV BX,0100h","MOV AX,5678h","MOV WORD PTR ES:[BX],AX","MOV AX,1234h","MOV WORD PTR ES:[BX+2],AX",op+" CX,ES:[BX]","HLT"].join("\n");
 const [a,b]=both(src);for(const s of [a,b]){assert.equal(s.reg.CX,0x5678);assert.equal(s.reg[op==="LDS"?"DS":"ES"],0x1234);assert.equal(s.reg.DS,op==="LDS"?0x1234:0x1000);}
});
for(const op of ["LDS","LES"])test(op+" BP default SS segment",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV SS,AX","MOV BP,0100h","MOV AX,5678h","MOV WORD PTR SS:[BP],AX","MOV AX,1234h","MOV WORD PTR SS:[BP+2],AX",op+" CX,[BP]","HLT"].join("\n");
 const [a,b]=both(src);for(const s of [a,b]){assert.equal(s.reg.CX,0x5678);assert.equal(s.reg[op==="LDS"?"DS":"ES"],0x1234);}
});
for(const op of ["LDS","LES"])test(op+" pointer wraps offset at FFFFh",()=>{
 const src=["MOV AX,1000h","MOV DS,AX","MOV BX,0FFFFh","MOV AX,5678h","MOV BYTE PTR [BX],78h","MOV BYTE PTR [0h],56h","MOV BYTE PTR [1h],34h","MOV BYTE PTR [2h],12h",op+" CX,[BX]","HLT"].join("\n");
 const [a,b]=both(src);for(const s of [a,b]){assert.equal(s.reg.CX,0x5678);assert.equal(s.reg[op==="LDS"?"DS":"ES"],0x1234);}
});
for(const op of ["LDS","LES"])test(op+" preserves all nine FLAGS",()=>{
 const src=["MOV BX,0100h","MOV AX,5678h","MOV WORD PTR [BX],AX","MOV AX,1234h","MOV WORD PTR [BX+2],AX","MOV AX,0FD7h","PUSH AX","POPF",op+" CX,[BX]","HLT"].join("\n");
 const [a,b]=both(src);for(const s of [a,b])for(const f of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])assert.equal(s.flags[f],1,op+" FLAGS."+f);
 core(a,b,op+" flags");
});
for(const op of ["LDS","LES"])test(op+" ModR/M memory encoding and decoding",()=>{
 const bytes=Array.from(api.assemble(op+" DX,[BP+SI+4]").bytes),expected=op==="LES"?[0xC4,0x52,0x04]:[0xC5,0x52,0x04];
 assert.deepEqual(bytes,expected);const d=api.disassemble(bytes);assert.equal(d.rows[0].instruction,op+" DX, [BP+SI+4]");
});
for(const op of ["LDS","LES"])test(op+" segment prefix disassembly",()=>{
 const bytes=Array.from(api.assemble(op+" CX,ES:[BX+SI+4]").bytes);
 assert.deepEqual(bytes,[0x26,op==="LES"?0xC4:0xC5,0x48,0x04]);
 assert.equal(api.disassemble(bytes).rows[0].instruction,op+" CX, ES:[BX+SI+4]");
});
for(const op of ["LDS","LES"])test(op+" disassembler rejects ModR/M mod=11",()=>{
 const byte=op==="LES"?0xC4:0xC5;assert.ok(api.disassemble([byte,0xC0]).rows[0].instruction.startsWith("DB "));
});
for(const op of ["LDS","LES"])for(const [name,src,re] of [
 ["memory destination",op+" WORD PTR [BX],AX",/registre général 16 bits/],
 ["byte destination",op+" AL,[BX]",/registre général 16 bits/],
 ["segment destination",op+" DS,[BX]",/registre général 16 bits/],
 ["register source",op+" AX,BX",/opérande mémoire/],
 ["immediate source",op+" AX,1234h",/opérande mémoire/],
 ["qualified WORD source",op+" AX,WORD PTR [BX]",/pointeur mémoire 16:16/],
 ["qualified BYTE source",op+" AX,BYTE PTR [BX]",/pointeur mémoire 16:16/],
 ["FAR PTR source",op+" AX,FAR PTR [BX]",/pointeur mémoire 16:16/],
 ["invalid address combination",op+" AX,[BX+BP]",/Combinaison/],
 ["disp outside signed/unsigned range",op+" AX,[BX+65536]",/hors plage/]
])test(op+" rejects "+name,()=>assert.throws(()=>api.assemble(src+"\nHLT"),re));
test("LEA regression remains supported",()=>{const x=api.assemble("LEA AX,[BX+SI+4]");assert.deepEqual(Array.from(x.bytes),[0x8D,0x40,4]);});
console.log("LDS/LES 8086 audit: "+pass+"/"+(pass+fail)+" passed");if(fail)process.exit(1);
