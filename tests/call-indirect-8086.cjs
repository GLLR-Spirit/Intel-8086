const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process"),os=require("node:os"),path=require("node:path");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};
vm.createContext(context);
const inject="\nglobalThis.api={assemble:s=>assembleProgram(s),disassemble:b=>disassembleBytes(b),execute:s=>executeAll(s),binary:(b,c,i,s)=>executeBinary(b,c,i,s)};\n})();\n";
vm.runInContext(match[1].replace(/\n\}\)\(\);\s*$/,inject),context,{timeout:20000});
const api=context.api;assert.ok(api);
const flags={CF:1,PF:1,AF:1,ZF:1,SF:1,TF:1,IF:1,DF:1,OF:1};
const regInit={DS:0x1000,SS:0x2000,ES:0x3000,BX:0x20,BP:0x30,SI:4,DI:6};
const segPrefix={ES:0x26,CS:0x2E,SS:0x36,DS:0x3E};
const forms=[
 {name:"[BX+SI]",expr:"BX+SI",offset:0x24,rm:0},
 {name:"[BX+DI]",expr:"BX+DI",offset:0x26,rm:1},
 {name:"[BP+SI]",expr:"BP+SI",offset:0x34,rm:2},
 {name:"[BP+DI]",expr:"BP+DI",offset:0x36,rm:3},
 {name:"[SI]",expr:"SI",offset:0x04,rm:4},
 {name:"[DI]",expr:"DI",offset:0x06,rm:5},
 {name:"[BP]",expr:"BP",offset:0x30,rm:6,dispZero:true},
 {name:"[BX]",expr:"BX",offset:0x20,rm:7},
 {name:"[disp16]",expr:"5000h",offset:0x5000,rm:6,direct:true}
];
const segValue={DS:0x1000,SS:0x2000,ES:0x3000,CS:0};
const allFlags=["CF","PF","AF","ZF","SF","TF","IF","DF","OF"];
function hex(n){return (n&65535).toString(16).toUpperCase().padStart(4,"0")+"h";}
function phys(seg,off){return (((seg<<4)+(off&65535))&0xFFFFF);}
function expr2(form){return form.direct?"5002h":form.expr+"+2";}
function operand(form,seg,far){return (far?"FAR PTR ":"WORD PTR ")+seg+":["+form.expr+"]";}
function addressAdjustment(form,seg){return seg==="CS"&&!form.direct?0x1000:0;}
function effectiveOffset(form,seg){return form.offset+addressAdjustment(form,seg)*(form.direct?0:form.expr.split("+").length);}
function sourceProgram(form,seg,far,sp=0xFFFE){
 const ret=far?"RETF":"RET",delta=addressAdjustment(form,seg);
 let src=[
  "MOV AX, 1000h","MOV DS, AX","MOV AX, 2000h","MOV SS, AX","MOV AX, 3000h","MOV ES, AX",
  "MOV BX, "+hex(0x20+delta),"MOV BP, "+hex(0x30+delta),"MOV SI, "+hex(4+delta),"MOV DI, "+hex(6+delta),
  "MOV AX, 0FD7h","PUSH AX","POPF","MOV SP, "+hex(sp),
  "MOV WORD PTR "+seg+":["+form.expr+"], 1357h"
 ];
 if(far)src.push("MOV WORD PTR "+seg+":["+expr2(form)+"], 1234h");
 src.push("CALL "+operand(form,seg,far),"HLT","TARGET: "+ret);
 let code=src.join("\n"),first=api.assemble(code),target=first.symbols.TARGET;
 code=code.replace("1357h",hex(target));
 return {source:code,target,assembled:api.assemble(code)};
}
function binaryProgram(form,seg,far,sp=0xFFFE){
 const src="CALL "+operand(form,seg,far)+"\nHLT\nTARGET: "+(far?"RETF":"RET");
 const assembled=api.assemble(src),target=assembled.symbols.TARGET,mem={},delta=addressAdjustment(form,seg),off=effectiveOffset(form,seg);
 function put(at,value){mem[phys(segValue[seg],at)]=value&255;}
 put(off,target&255);put(off+1,target>>8);
 if(far){put(off+2,0x34);put(off+3,0x12);mem[phys(0x1234,target)]=0xCB;}
 const regs=Object.assign({},regInit,{BX:regInit.BX+delta,BP:regInit.BP+delta,SI:regInit.SI+delta,DI:regInit.DI+delta,SP:sp});
 const state=api.binary(Array.from(assembled.bytes),0,0,{reg:regs,flags,mem});
 return {state,target,assembled,mem};
}
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS "+name);}
function checkState(s,sp,expectedIP,label){
 assert.ok(!s.error,label+": "+s.error);
 assert.equal(s.reg.CS,0,label+" restored CS");
 assert.equal(s.reg.IP,expectedIP,label+" final IP");
 assert.equal(s.reg.SP,sp,label+" restored SP");
 assert.equal(s.stack.length,0,label+" empty stack");
 for(const f of allFlags)assert.equal(s.flags[f],1,label+" preserved "+f);
}
test("CALL r/m16 register forms encode FF /2 for all eight word registers",()=>{
 const regs=["AX","CX","DX","BX","SP","BP","SI","DI"];
 regs.forEach((r,i)=>{const a=api.assemble("CALL "+r);assert.deepEqual(Array.from(a.bytes),[0xFF,0xD0+i]);const d=api.disassemble(Array.from(a.bytes));assert.equal(d.rows[0].instruction,"CALL "+r);});
});
test("CALL FAR register operand is rejected by the assembler",()=>{
 assert.throws(()=>api.assemble("CALL FAR PTR AX"),/Étiquette inconnue/);
});
test("CALL r/m16 register forms execute near calls in source and binary for all eight registers",()=>{
 const regs=["AX","CX","DX","BX","SP","BP","SI","DI"];
 for(const reg of regs){
  const template=["MOV AX, 2000h","MOV SS, AX","MOV AX, 0FD7h","PUSH AX","POPF","MOV "+reg+", 0000h","CALL "+reg,"HLT","TARGET: RET"].join("\n");
  const first=api.assemble(template),target=first.symbols.TARGET,source=template.replace("0000h",hex(target)),assembled=api.assemble(source);
  const a=api.execute(source),b=api.binary(Array.from(assembled.bytes),0,0);
  checkState(a,target,target,"source CALL "+reg);
  checkState(b,target,target,"binary CALL "+reg);
 }
});
for(const form of forms){
 test("Assembler/disassembler FF /2 near "+form.name,()=>{
  const a=api.assemble("CALL WORD PTR ["+form.expr+"]");
  const expected=form.dispZero?[0xFF,0x56,0x00]:form.direct?[0xFF,0x16,0x00,0x50]:[0xFF,0x10+form.rm];
  assert.deepEqual(Array.from(a.bytes),expected);
  const d=api.disassemble(Array.from(a.bytes));assert.equal(d.rows[0].instruction.startsWith("CALL "),true);
  assert.deepEqual(Array.from(api.assemble(d.rows[0].instruction).bytes),expected);
 });
 test("Assembler/disassembler FF /3 far "+form.name,()=>{
  const a=api.assemble("CALL FAR PTR ["+form.expr+"]");
  const expected=form.dispZero?[0xFF,0x5E,0x00]:form.direct?[0xFF,0x1E,0x00,0x50]:[0xFF,0x18+form.rm];
  assert.deepEqual(Array.from(a.bytes),expected);
  const d=api.disassemble(Array.from(a.bytes));assert.match(d.rows[0].instruction,/^CALL FAR PTR /);
  assert.deepEqual(Array.from(api.assemble(d.rows[0].instruction).bytes),expected);
 });
 for(const seg of ["DS","ES","SS","CS"]){
  for(const far of [false,true]){
   test((far?"Source far":"Source near")+" indirect "+form.name+" with "+seg+" segment",()=>{
    const p=sourceProgram(form,seg,far),s=api.execute(p.source);
    checkState(s,0xFFFE,p.target,"source "+(far?"far":"near")+" "+form.name+" "+seg);
   });
   test((far?"Binary far":"Binary near")+" indirect "+form.name+" with "+seg+" segment",()=>{
    const p=binaryProgram(form,seg,far),s=p.state;
    checkState(s,0xFFFE,p.target,"binary "+(far?"far":"near")+" "+form.name+" "+seg);
   });
  }
 }
}
test("Segment override encoding omits the default segment and emits non-default overrides",()=>{
 const checks=[[forms[0],"DS",null],[forms[2],"SS",null],[forms[8],"DS",null],[forms[0],"ES",0x26],[forms[2],"DS",0x3E],[forms[8],"ES",0x26]];
 for(const [form,seg,prefix] of checks){
  const a=api.assemble("CALL WORD PTR "+seg+":["+form.expr+"]");
  assert.equal(a.bytes[0],prefix===null?0xFF:prefix);
  const f=api.assemble("CALL FAR PTR "+seg+":["+form.expr+"]");
  assert.equal(f.bytes[0],prefix===null?0xFF:prefix);
 }
});
test("Near indirect pointer word wraps offset FFFFh to 0000h in source and binary",()=>{
 const template="MOV AX,1000h\nMOV DS,AX\nMOV WORD PTR DS:[0FFFFh],0000h\nCALL WORD PTR DS:[0FFFFh]\nHLT\nTARGET: RET";
 const first=api.assemble(template),target=first.symbols.TARGET,src=template.replace("0000h",hex(target));
 const a=api.assemble(src),s=api.execute(src);
 assert.ok(!s.error,s.error);assert.equal(s.reg.SP,0xFFFE);assert.equal(s.stack.length,0);assert.equal(s.reg.IP,target);
 const bin=api.assemble("CALL WORD PTR DS:[0FFFFh]\nHLT\nTARGET: RET"),bt=bin.symbols.TARGET;
 const b=api.binary(Array.from(bin.bytes),0,0,{reg:{DS:0x1000},mem:{131071:bt&255,65536:(bt>>8)&255}});
 assert.ok(!b.error,b.error);assert.equal(b.reg.SP,0xFFFE);assert.equal(b.reg.IP,bt);
});
test("Far pointer reads both words across FFFFh/0000h in source and binary",()=>{
 const template="MOV AX,0FFFFh\nMOV DS,AX\nMOV WORD PTR DS:[0FFFEh],0000h\nMOV WORD PTR DS:[0000h],0000h\nCALL FAR PTR DS:[0FFFEh]\nHLT\nTARGET: RETF";
 const first=api.assemble(template),target=first.symbols.TARGET,src=template.replace("0000h",hex(target));
 const a=api.assemble(src),s=api.execute(src);
 assert.ok(!s.error,s.error);assert.equal(s.reg.CS,0);assert.equal(s.reg.SP,0xFFFE);assert.equal(s.stack.length,0);assert.equal(s.reg.IP,target);
 const bin=api.assemble("CALL FAR PTR DS:[0FFFEh]\nHLT\nTARGET: RETF"),bt=bin.symbols.TARGET;
 const mem={};
 mem[phys(0xFFFF,0xFFFE)]=bt&255;mem[phys(0xFFFF,0xFFFF)]=(bt>>8)&255;
 mem[phys(0xFFFF,0)]=0;mem[phys(0xFFFF,1)]=0;
 const b=api.binary(Array.from(bin.bytes),0,0,{reg:{DS:0xFFFF},mem});
 assert.ok(!b.error,b.error);assert.equal(b.reg.CS,0);assert.equal(b.reg.SP,0xFFFE);assert.equal(b.stack.length,0);assert.equal(b.reg.IP,bt);
});
for(const sp of [0x0000,0x0001,0xFFFE]){
 for(const far of [false,true]){
  test("Indirect "+(far?"far":"near")+" call restores SP at boundary "+hex(sp),()=>{
   const form=forms[0],p=binaryProgram(form,"DS",far,sp),s=p.state;
   checkState(s,sp,p.target,"SP boundary "+hex(sp));
  });
 }
}
test("Disassembler rejects truncated FF ModR/M displacement and far-pointer encoding",()=>{
 assert.throws(()=>api.disassemble([0xFF,0x50]),/Flux tronqué/);
 assert.throws(()=>api.disassemble([0xFF,0x1E,0x00]),/Flux tronqué/);
});
test("Disassembler never interprets FF /3 register-direct or non-CALL extensions as CALL",()=>{
 for(const modrm of [0xD8,0xC0,0xC8,0xE0,0xE8,0xF0,0xF8]){
  const d=api.disassemble([0xFF,modrm]);assert.doesNotMatch(d.rows[0].instruction,/^CALL/);
 }
});
test("GNU as .code16 agrees byte-for-byte for all eight near/far memory addressing forms",()=>{
 const gas=[];
 for(const f of forms){
  const expr= f.direct ? "0x5000" :
   f.expr==="BX+SI"?"(%bx,%si)":f.expr==="BX+DI"?"(%bx,%di)":f.expr==="BP+SI"?"(%bp,%si)":f.expr==="BP+DI"?"(%bp,%di)":f.expr==="SI"?"(%si)":f.expr==="DI"?"(%di)":f.expr==="BP"?"0(%bp)":"(%bx)";
  gas.push("call *"+expr,"lcall *"+expr);
 }
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"8086-call-indirect-gnu-"));
 try{
  const asm=path.join(dir,"ref.s"),obj=path.join(dir,"ref.o"),bin=path.join(dir,"ref.bin");
  fs.writeFileSync(asm,[".code16",".text",...gas,""].join("\n"));
  execFileSync("as",["--32","-o",obj,asm],{stdio:"pipe"});
  execFileSync("objcopy",["-O","binary","-j",".text",obj,bin],{stdio:"pipe"});
  const expected=Array.from(fs.readFileSync(bin)),source=forms.map(f=>"CALL WORD PTR ["+f.expr+"]\nCALL FAR PTR ["+f.expr+"]").join("\n");
  const actual=Array.from(api.assemble(source).bytes);
  assert.deepEqual(actual,expected,"project encodings differ from GNU as");
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
console.log("CALL indirect 8086 audit: "+passed+"/"+passed+" passed");
