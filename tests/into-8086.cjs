const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};vm.createContext(context);
const injection="\nglobalThis.into8086={assemble:s=>assembleProgram(s),disassemble:b=>disassembleBytes(b),execute:s=>executeAll(s),binary:(b,c,i,st)=>executeBinary(b,c,i,st)};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);assert.notEqual(instrumented,match[1]);vm.runInContext(instrumented,context,{timeout:30000});
const api=context.into8086;assert.ok(api);
let passed=0,failed=0;function test(n,f){try{f();passed++;console.log("PASS "+n);}catch(e){failed++;console.error("FAIL "+n+": "+e.message);}}
const flags=["CF","PF","AF","ZF","SF","TF","IF","DF","OF"];
function sameFlags(a,b,label){for(const k of flags)assert.equal(a[k],b[k],label+" "+k);}
function both(src,cs=0,ip=0,mem={}){const a=api.assemble(src),bytes=Array.from(a.bytes),s=api.execute(src),b=api.binary(bytes,cs,ip,{mem});assert.ok(!s.error,"source "+s.error);assert.ok(!b.error,"binary "+b.error);return {a,bytes,s,b};}
test("INTO opcode CE and disassembly boundary",()=>{const a=Array.from(api.assemble("INTO\nHLT").bytes);assert.deepEqual(a,[0xCE,0xF4]);const d=api.disassemble(a);assert.deepEqual(Array.from(d.rows,r=>r.instruction),["INTO","HLT"]);});
test("OF=0: INTO ne déclenche aucune interruption, ne touche pas la pile",()=>{
 const src=["MOV AL,1","INTO","HLT","HANDLER:","MOV BX,0FFFFh","IRET"].join("\n");
 const {s,b}=both(src);const initial=api.execute("HLT").reg.SP;
 for(const st of [s,b]){assert.equal(st.reg.BX,0);assert.equal(st.reg.SP,initial);assert.equal(st.stack.length,0);assert.equal(st.flags.OF,0);}
});
test("OF=1 source: INTO appelle le vecteur 4 puis IRET restaure CS:IP, FLAGS et SP",()=>{
 const src=["VECTOR 4,HANDLER","MOV AL,7Fh","ADD AL,1","INTO","HLT","HANDLER:","MOV BX,AX","IRET"].join("\n");
 const baseline=api.execute("MOV AL,7Fh\nADD AL,1\nHLT");const state=api.execute(src);
 assert.ok(!state.error,state.error);assert.equal(state.reg.AX&255,0x80);assert.equal(state.reg.BX&255,0x80);
 assert.equal(state.reg.SP,api.execute("HLT").reg.SP);assert.equal(state.stack.length,0);sameFlags(state.flags,baseline.flags,"INTO/IRET restored");
});
test("OF=1 binary: IVT vector 4 is read from physical 00010h",()=>{
 const src=["MOV AL,7Fh","ADD AL,1","INTO","HLT","HANDLER:","MOV BX,AX","IRET"].join("\n");
 const a=api.assemble(src),handler=a.symbols.HANDLER,bytes=Array.from(a.bytes),cs=0x1000,ip=0x0100;
 const mem={0x10:handler&255,0x11:(handler>>8)&255,0x12:cs&255,0x13:(cs>>8)&255};
 const state=api.binary(bytes,cs,ip,{mem});
 assert.ok(!state.error,state.error);assert.equal(state.reg.AX&255,0x80);assert.equal(state.reg.BX&255,0x80);
 assert.equal(state.reg.CS,cs);assert.equal(state.reg.SP,api.execute("HLT").reg.SP);assert.equal(state.stack.length,0);
 assert.equal(state.execution.decodedInstructions,6);
});
console.log("8086 INTO audit: "+passed+"/"+(passed+failed)+" tests passed; vector 4 uses the software/physical IVT model, not asynchronous hardware interrupts.");
if(failed)process.exit(1);
