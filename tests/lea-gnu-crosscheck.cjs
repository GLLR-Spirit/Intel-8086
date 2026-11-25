const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),vm=require("node:vm");
const {execFileSync}=require("node:child_process"),assert=require("node:assert/strict");
const registers=["AX","CX","DX","BX","SP","BP","SI","DI"];
const forms=["[BX+SI]","[BX+DI]","[BP+SI]","[BP+DI]","[SI]","[DI]","[BP]","[BX]"];
const program=[];
for(const r of registers)for(const ea of forms)program.push("LEA "+r+", "+ea);
for(const d of [-32768,-129,-128,-1,0,1,127,128,32767])program.push("LEA AX, [BX+SI"+(d<0?String(d):"+"+d)+"]");
program.push("LEA DX,[1234h]","LEA AX,[0FFFFh]","LEA SP,[BP]","LEA DI,ES:[BX+DI+127]","LEA SI,CS:[BP+SI-128]","LEA CX,SS:[BP+DI+32767]","LEA BX,DS:[BX+SI-32768]");
const source=program.join("\n");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,"Application script must exist");
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};
vm.createContext(context);
const injection="\nglobalThis.__leaGnuApi={assemble:source=>assembleProgram(source)};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);
assert.notEqual(instrumented,match[1],"Audit API injection point must exist");
vm.runInContext(instrumented,context,{timeout:10000});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"8086-lea-gnu-"));
try{
 const asm=path.join(dir,"lea.s"),obj=path.join(dir,"lea.o"),bin=path.join(dir,"lea.bin");
 fs.writeFileSync(asm,[".intel_syntax noprefix",".code16",".text",".global _start","_start:",source,""].join("\n"));
 execFileSync("as",["--32","-o",obj,asm],{stdio:"pipe"});
 execFileSync("objcopy",["-O","binary","-j",".text",obj,bin],{stdio:"pipe"});
 const expected=Array.from(fs.readFileSync(bin)),actual=Array.from(context.__leaGnuApi.assemble(source).bytes);
 assert.deepEqual(actual,expected,"Project LEA encoder must match GNU as byte-for-byte");
 const fixed=Array.from(context.__leaGnuApi.assemble("LEA AX,[BX+SI+4]\nLEA DX,[1234h]\nLEA AX,[BP]").bytes);
 assert.deepEqual(fixed,[0x8D,0x40,0x04,0x8D,0x16,0x34,0x12,0x8D,0x46,0x00],"Fixed Intel LEA vectors");
 console.log("LEA GNU as cross-check: PASS");
 console.log(execFileSync("as",["--version"],{encoding:"utf8"}).split("\n")[0]+" with .code16");
 console.log("Compared "+program.length+" LEA instructions byte-for-byte: 64 destination/address combinations, displacement boundaries, direct disp16 and segment prefixes.");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
