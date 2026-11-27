const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const key = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json", "utf8"));
const batches = ["chapter-01", "chapter-02"].map(name => JSON.parse(fs.readFileSync("docs/question-oracle-batches/" + name + ".json", "utf8")));
const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Inline application script must exist");

const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, value: "", textContent: "", innerHTML: "", className: "",
    dataset: {}, onclick: null, oninput: null, onchange: null
  });
  return elements.get(id);
}
const document = { getElementById: element, querySelectorAll: () => [] };
const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const context = { document, localStorage, console, confirm: () => true };
const instrumented = match[1].replace(/\}\)\(\);\s*$/, 
  "globalThis.__learningData = { chapterLearning };})();");
assert.notEqual(instrumented, match[1], "Application closure must be instrumented");
vm.runInNewContext(instrumented, context, { timeout: 5000 });
const runtime = context.__learningData;
assert.ok(runtime, "Runtime learning bank must be exposed");

const runtimeQuestions = new Map();
runtime.chapterLearning.forEach((chapter, ci) => {
  chapter.lessons.forEach((lesson, li) => lesson.quiz.forEach((q, qi) => {
    runtimeQuestions.set("C" + String(ci + 1).padStart(2, "0") + "-L" + (li + 1) + "-Q" + (qi + 1), q);
  }));
  chapter.quiz.forEach((q, qi) => {
    runtimeQuestions.set("C" + String(ci + 1).padStart(2, "0") + "-F-Q" + (qi + 1), q);
  });
});

const fact = {
  microprocessor_role: "fetch_decode_execute",
  instruction_data_distinction: "distinct_roles_same_memory",
  x86_family_variation: "shared_lineage_not_identical_buses",
  lab_scope: "pedagogical_software_model",
  intel_operand_order: { destination: "AX", source: "1234h" },
  separate_register_and_address_width: { registerBits: 16, addressBits: 20 },
  "8086_widths_tuple": { generalRegisters: 16, dataBus: 16, addressBus: 20 },
  eu_function: "decode_and_execute",
  alu_function: "arithmetic_and_logic",
  eu_biu_responsibility: "biu_manages_bus",
  biu_function: "bus_and_prefetch",
  control_transfer_prefetch: "flush_and_refill",
  "prefetch_queue_capacity": { bytes: 6 },
  eu_biu_work_split: { biu: "external_bus_and_prefetch", eu: "instruction_decode_and_execution" }
};

function independentlyCompute(oracle) {
  const i = oracle.inputs;
  switch (oracle.rule) {
    case "microprocessor_role":
    case "instruction_data_distinction":
    case "x86_family_variation":
    case "lab_scope":
    case "intel_operand_order":
    case "separate_register_and_address_width":
    case "8086_widths_tuple":
    case "eu_function":
    case "alu_function":
    case "eu_biu_responsibility":
    case "biu_function":
    case "control_transfer_prefetch":
    case "prefetch_queue_capacity":
    case "eu_biu_work_split":
      return fact[oracle.rule];
    case "source_instruction_vs_data":
      return "assembly_statement_is_instruction";
    case "intel_operand_order_generic": {
      const operands = i.instruction.replace(/^MOV\s+/i, "").split(",");
      return { destination: operands[0].trim(), source: operands[1].trim() };
    }
    case "segment_offset_address": {
      const linear = i.segment * (2 ** i.shift) + i.offset;
      return { linear, physical: linear % (2 ** i.addressBits) };
    }
    case "prefetch_overlap":
      return { overlap: Boolean(i.euExecution && i.biuFetch), superscalar: false };
    case "alu_add_trace": {
      const sum = i.left + i.right;
      return { sum, result: sum % (2 ** i.width) };
    }
    case "jump_program_trace": {
      let ax = i.initialAX;
      let pc = 0;
      let halted = false;
      const labels = new Map();
      i.program.forEach((instruction, index) => {
        if (instruction[0] === "LABEL") labels.set(instruction[1], index);
      });
      let skippedInstruction = null;
      for (let steps = 0; pc < i.program.length && steps < 20; steps++) {
        const instruction = i.program[pc];
        if (instruction[0] === "MOV" && instruction[1] === "AX") { ax = instruction[2]; pc++; }
        else if (instruction[0] === "JMP") {
          skippedInstruction = i.program[pc + 1]?.slice(0, 2).join(" ");
          pc = labels.get(instruction[1]);
        } else if (instruction[0] === "LABEL") pc++;
        else if (instruction[0] === "HLT") { halted = true; break; }
        else throw new Error("Unsupported jump trace instruction: " + instruction[0]);
      }
      return { finalAX: ax, halted, skippedInstruction };
    }
    case "8086_address_bus_width":
      return { addressBits: i.processor === "8086" ? 20 : null };
    case "address_space_capacity": {
      const addresses = 2 ** i.addressBits;
      return { addresses, bytes: addresses * i.bytesPerAddress, mebibytes: addresses * i.bytesPerAddress / 1048576 };
    }
    case "8086_external_data_bus_width":
      return { dataBits: i.processor === "8086" ? 16 : null };
    case "8088_external_data_bus_width":
      return { dataBits: i.processor === "8088" ? 8 : null };
    case "immediate_fits_register": {
      const maxValue = 2 ** i.registerBits - 1;
      return {
        fits: i.immediate <= maxValue,
        maxValue,
        requiredBits: Math.ceil(Math.log2(i.immediate + 1))
      };
    }
    case "write_low_byte_preserve_high": {
      const finalAX = (i.initialAX & 0xff00) | (i.newAL & 0xff);
      return { finalAX, finalAH: finalAX >>> 8, finalAL: finalAX & 0xff };
    }
    case "simple_program_trace": {
      let ax = i.initialAX;
      let halted = false;
      for (const instruction of i.program) {
        if (instruction[0] === "MOV" && instruction[1] === "AX") ax = instruction[2];
        else if (instruction[0] === "HLT") halted = true;
        else throw new Error("Unsupported independent trace instruction: " + instruction[0]);
      }
      return { finalAX: ax, halted };
    }
    case "address_range": {
      const maximum = 2 ** i.addressBits - 1;
      return {
        minimum: 0,
        maximum,
        hexMinimum: "00000h",
        hexMaximum: maximum.toString(16).toUpperCase().padStart(5, "0") + "h"
      };
    }
    default:
      throw new Error("No independent evaluator registered for rule " + oracle.rule);
  }
}

const keyMap = new Map(key.questions.map(q => [q.id, q]));
assert.deepEqual(batches.map(batch => batch.batch), ["chapter-01", "chapter-02"]);
assert.ok(batches.every(batch => batch.oracles.length === 19), "Each certified chapter batch must contain 19 oracle records");
const seen = new Set();
let certified = 0;
let blocked = 0;

for (const oracle of batches.flatMap(batch => batch.oracles)) {
  assert.ok(!seen.has(oracle.id), "Duplicate oracle ID: " + oracle.id);
  seen.add(oracle.id);
  const keyed = keyMap.get(oracle.id);
  const live = runtimeQuestions.get(oracle.id);
  assert.ok(keyed, "Oracle must resolve to semantic-key item " + oracle.id);
  assert.ok(live, "Oracle must resolve to runtime question " + oracle.id);
  assert.deepEqual(Array.from(keyed.choices).slice().sort(), Array.from(live[1]).slice().sort(), oracle.id + " runtime choices must match the semantic key as a set (display order may be shuffled)");
  assert.equal(keyed.correctAnswer, live[1][live[2]], oracle.id + " runtime answer must match the semantic key");
  assert.equal(oracle.correctAnswer, keyed.correctAnswer, oracle.id + " oracle answer must be independently aligned to the actual item");
  assert.deepEqual(oracle.expected, independentlyCompute(oracle), oracle.id + " independent rule calculation");
  assert.equal(oracle.distractorRationales.length, 2, oracle.id + " must explain both distractors");
  const wrongChoices = keyed.choices.filter(choice => choice !== keyed.correctAnswer);
  assert.deepEqual(
    oracle.distractorRationales.map(item => item.choice).sort(),
    wrongChoices.slice().sort(),
    oracle.id + " must explain exactly the two displayed wrong choices"
  );
  for (const rationale of oracle.distractorRationales) {
    assert.ok(rationale.reason.trim().length >= 25, oracle.id + " distractor rationale must be substantive");
  }
  assert.ok(oracle.derivation.trim().length >= 80, oracle.id + " must contain an independent derivation");
  assert.ok(oracle.reference && oracle.reference.trim().length >= 20, oracle.id + " must identify a technical reference");
  if (oracle.status === "certified") certified++;
  else if (oracle.status === "blocked") {
    blocked++;
    assert.ok(oracle.blocker && oracle.blocker.length >= 30, oracle.id + " blocked status must explain the required correction");

  } else {
    assert.fail("Unknown oracle status for " + oracle.id + ": " + oracle.status);
  }
}
assert.equal(certified, 38, "All 38 questions in chapters 1 and 2 are certified");
assert.equal(blocked, 0, "No question in the certified batches remains blocked");
assert.match(keyMap.get("C01-L1-Q2").explanation, /octets machine distincts/i, "Source assembly must be distinguished from its encoded machine bytes");
console.log("Question oracle certification: chapters 1–2 — " + certified + "/38 certified; " + blocked + " blocked; runtime/key alignment and independent evaluators passed.");
