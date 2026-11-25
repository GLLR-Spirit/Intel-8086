const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),vm=require("node:vm");
const {execFileSync}=require("node:child_process"),assert=require("node:assert/strict");
const registers=["AX","CX","DX","BX","SP","BP","SI","DI"];
const forms=["[BX+SI]","[BX+DI]","[BP+SI]","[BP+DI]","[SI]","[DI]","[BP]","[BX]"];
const program=[];
for(const op of ["LDS","LES"])for(const r of registers)for(const ea of forms)program.push(op+" "+r+", "+ea);
for(const op of ["LDS","LES"])for(const d of [-32768,-129,-128,-1,0,1,127,128,32767])program.push(op+" AX, [BX+SI"+(d<0?String(d):"+"+d)+"]");
for(const op of ["LDS","LES"])program.push(op+" DX, [0x1234]",""+op+" AX, [0xffff]",""+op+" SP, [BP]",""+op+" DI, ES:[BX+DI+127]",""+op+" SI, CS:[BP+SI-128]",""+op+" CX, SS:[BP+DI+32767]",""+op+" BX, DS:[BX+SI-32768]");
const source=program.join("\n");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};vm.createContext(context);
const injection="\nglobalThis.__ldsLesGnuApi={assemble:source=>assembleProgram(source)};\n})();\n";
vm.runInContext(match[1].replace(/\n\}\)\(\);\s*$/,injection),context,{timeout:10000});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"8086-lds-les-gnu-"));
try{
 const asm=path.join(dir,"farptr.s"),obj=path.join(dir,"farptr.o"),bin=path.join(dir,"farptr.bin");
 fs.writeFileSync(asm,[".intel_syntax noprefix",".code16",".text",".global _start","_start:",source,""].join("\n"));
 execFileSync("as",["--32","-o",obj,asm],{stdio:"pipe"});
 execFileSync("objcopy",["-O","binary","-j",".text",obj,bin],{stdio:"pipe"});
 const expected=Array.from(fs.readFileSync(bin)),actual=Array.from(context.__ldsLesGnuApi.assemble(source).bytes);
 assert.deepEqual(actual,expected,"LDS/LES project encoders must match GNU as byte-for-byte");
 console.log("LDS/LES GNU as cross-check: PASS");
 console.log(execFileSync("as",["--version"],{encoding:"utf8"}).split("\n")[0]+" with .code16");
 console.log("Compared "+program.length+" LDS/LES instructions byte-for-byte: 128 destination/address combinations, displacement boundaries, direct disp16 and segment prefixes.");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
