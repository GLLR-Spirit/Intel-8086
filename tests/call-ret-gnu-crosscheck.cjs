const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),vm=require("node:vm");
const {execFileSync}=require("node:child_process"),assert=require("node:assert/strict");
const program=["CALL NEAR_TARGET","CALL AX","CALL FAR 1234h:5678h","RET","RET 1","RETF","RETF 3","NEAR_TARGET: NOP"];
const source=program.join("\n");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};vm.createContext(context);
const inject="\nglobalThis.__callRetGnuApi={assemble:s=>assembleProgram(s)};\n})();\n";
vm.runInContext(match[1].replace(/\n\}\)\(\);\s*$/,inject),context,{timeout:10000});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"8086-call-ret-gnu-"));
try{
 const asm=path.join(dir,"ref.s"),obj=path.join(dir,"ref.o"),bin=path.join(dir,"ref.bin");
 const gnu=[".code16",".text",".global _start","_start:","call near_target","call *%ax","lcall $0x1234, $0x5678","ret","ret $1","lret","lret $3","near_target:","nop",""].join("\n");
 fs.writeFileSync(asm,gnu);execFileSync("as",["--32","-o",obj,asm],{stdio:"pipe"});execFileSync("objcopy",["-O","binary","-j",".text",obj,bin],{stdio:"pipe"});
 const expected=Array.from(fs.readFileSync(bin)),actual=Array.from(context.__callRetGnuApi.assemble(source).bytes);
 assert.deepEqual(actual,expected,"CALL/RET encodings must match GNU as byte-for-byte");
 console.log("CALL/RET GNU as cross-check: PASS");
 console.log(execFileSync("as",["--version"],{encoding:"utf8"}).split("\n")[0]+" with .code16");
 console.log("Compared near direct, near register-indirect, far direct, RET imm16 and RETF imm16 encodings byte-for-byte.");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
