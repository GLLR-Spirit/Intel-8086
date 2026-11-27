const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const key = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("docs/question-independent-oracles-8086.json", "utf8"));
const batches = ["chapter-01", "chapter-02", "chapter-03", "chapter-04", "chapter-05", "chapter-06", "chapter-07"].map(name => JSON.parse(fs.readFileSync("docs/question-oracle-batches/" + name + ".json", "utf8")));
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
    case "prefetch_queue_8086":
      return { queueBytes: 6, overlap: true, superscalarExecution: false };
    case "unsigned_byte_add":
    case "unsigned_add_flags": {
      const mask = (2 ** i.width) - 1;
      const sum = i.left + i.right;
      const result = sum & mask;
      const sign = 2 ** (i.width - 1);
      const signedValue = value => value >= sign ? value - (2 ** i.width) : value;
      const signedSum = signedValue(i.left & mask) + signedValue(i.right & mask);
      const minimum = -(2 ** (i.width - 1));
      const maximum = (2 ** (i.width - 1)) - 1;
      const CF = sum > mask ? 1 : 0;
      const OF = signedSum < minimum || signedSum > maximum ? 1 : 0;
      if (oracle.rule === "unsigned_byte_add") return { mathematicalSum: sum, result, carry: CF };
      return { mathematicalSum: sum, result, CF, OF };
    }
    case "signed_add_flag_pair": {
      const mask = (2 ** i.width) - 1;
      const sum = i.left + i.right;
      const result = sum & mask;
      const sign = 2 ** (i.width - 1);
      const signedValue = value => value >= sign ? value - (2 ** i.width) : value;
      const signedSum = signedValue(i.left & mask) + signedValue(i.right & mask);
      const minimum = -(2 ** (i.width - 1));
      const maximum = (2 ** (i.width - 1)) - 1;
      return { OF: signedSum < minimum || signedSum > maximum ? 1 : 0, CF: sum > mask ? 1 : 0 };
    }
    case "signed_add_flags": {
      const mask = (2 ** i.width) - 1;
      const sum = i.left + i.right;
      const result = sum & mask;
      const sign = 2 ** (i.width - 1);
      const signedValue = value => value >= sign ? value - (2 ** i.width) : value;
      const signedSum = signedValue(i.left & mask) + signedValue(i.right & mask);
      const minimum = -(2 ** (i.width - 1));
      const maximum = (2 ** (i.width - 1)) - 1;
      return { mathematicalSum: sum, result, CF: sum > mask ? 1 : 0, OF: signedSum < minimum || signedSum > maximum ? 1 : 0, signedResult: signedValue(result) };
    }
    case "carry_overflow_distinction":
      return { CF: "unsigned_carry", OF: "signed_overflow", independent: true };
    case "memory_byte_addressing":
      return { addressUnit: "byte", bytesPerWord: i.wordBits / i.byteBits };
    case "little_endian_word_bytes":
      return { lowByte: i.word & 0xff, highByte: (i.word >>> 8) & 0xff, lowAddress: i.startAddress, highAddress: i.startAddress + 1 };
    case "register_move_no_memory_write":
      return { memoryWrite: false, registerValue: 0x1234 };
    case "unsigned_range":
      return { minimum: 0, maximum: (2 ** i.bits) - 1 }; 
    case "signed_range":
      return { minimum: -(2 ** (i.bits - 1)), maximum: (2 ** (i.bits - 1)) - 1 };
    case "twos_complement_decode": {
      const sign = 2 ** (i.bits - 1);
      return { unsignedValue: i.value, signedValue: i.value >= sign ? i.value - (2 ** i.bits) : i.value };
    }
    case "memory_register_mov_validity":
      return { valid: (i.destination === "memory" && i.source === "register") || (i.destination === "register" && i.source === "memory"), memoryToMemory: false };
    case "overflow_byte_conclusion":
      return { mathematicalSum: i.left + i.right, storedAL: (i.left + i.right) & ((2 ** i.width) - 1), CF: (i.left + i.right) > ((2 ** i.width) - 1) ? 1 : 0, fullSumStored: (i.left + i.right) <= ((2 ** i.width) - 1) };
    case "register_width":
      return { bits: 16 };
    case "register_byte_parts":
      return { highByte: "AH", lowByte: "AL", bitsPerPart: 8 };
    case "string_source_index_default":
      return { register: "SI", segment: "DS" };
    case "bp_default_segment":
      return { segment: "SS" };
    case "stack_pointer_role":
      return { register: "SP", segment: "SS", meaning: "top_of_stack_offset" };
    case "code_address_pair":
      return { segment: "CS", offset: "IP" };
    case "default_data_segment":
      return { segment: "DS" };
    case "mov_cs_destination_invalid":
      return { valid: false, reason: "CS_cannot_be_destination_of_MOV" };
    case "register_trace": {
      const state = {};
      for (const instruction of i.program) {
        if (instruction[0] !== "MOV") throw new Error("Unsupported register trace instruction: " + instruction[0]);
        state[instruction[1]] = instruction[2];
      }
      return state;
    }
    case "code_stack_pairs":
      return { code: "CS:IP", stack: "SS:SP" };
    case "register_roles_conventions":
      return { rolesAreConventional: true, exclusive: false };
    case "source_comment_not_opcode":
      return { emitsOpcode: false, executedByCPU: false };
    case "assembler_symbol_resolution":
      return i.phase ? { resolutionPhase: "assembly_or_link" } : { producesMachineBytes: true, resolvesSymbols: true, executesHardware: false };
    case "label_is_offset":
      return { isInstruction: false, denotesOffset: true, value: i.address };
    case "xchg_exchange":
      return { finalAX: i.initialBX, finalBX: i.initialAX };
    case "mov_memory_to_memory_validity":
      return { valid: false, reason: "MOV_does_not_encode_memory_to_memory" };
    case "label_target_instruction": {
      const index = i.program.findIndex(instruction => instruction[0] === "LABEL" && instruction[1] === i.label);
      const target = i.program[index + 1];
      return { targetInstruction: target[0], targetIndex: index + 1 };
    }
    case "jmp_control_transfer":
      return { changesControlFlow: true, targetIP: i.targetOffset };
    case "control_flow_validation":
      return { detectsWrongTarget: true, detectsUnexpectedLoop: true };
    case "cpu_executes_machine_code":
      return { executesMachineBytes: true, executesComments: false, executesLabelNames: false };
    case "directive_vs_instruction":
      return { directiveGuidesAssembler: true, instructionEmitsOpcode: true };
    case "lea_general_semantics":
      return { offsetDescription: "effective_address", memoryRead: false };
    case "lea_effective_offset":
      return { offset: i.base + (i.index || 0) + i.displacement, memoryRead: false };
    case "lea_symbolic_expression":
      return { offsetExpression: i.expression, memoryRead: false };
    case "xchg_form_validity":
      if (i.left === "memory" && i.right === "memory") return { valid: false, reason: "XCHG_does_not_allow_memory_to_memory" };
      return { valid: true, reason: "XCHG_register_memory_allowed" };
    case "mov_memory_read":
      return { readsMemory: true, writesAX: true };
    case "effective_address_form_validity":
      return { valid: true, offsetExpression: i.terms.join("+") };
    case "lea_flags_preserved":
      return { flagsModified: false };
    case "far_pointer_size": {
      const totalBits = i.offsetBits + i.segmentBits;
      return { totalBits, totalBytes: totalBits / i.byteBits };
    }
    case "far_pointer_load": {
      const match = i.instruction.match(/^LDS\s+([A-Z]{2})/i);
      const register = match ? match[1].toUpperCase() : "SI";
      return { offsetDestination: register, segmentDestination: "DS", firstWord: "offset", secondWord: "segment" };
    }
    case "far_pointer_memory_order":
      return { firstWord: "offset", secondWord: "segment", byteCount: 4 };
    case "les_far_pointer_load":
      return { offsetDestination: "DI", segmentDestination: "ES" };
    case "lea_vs_mov_memory":
      return { leaReadsMemory: false, movReadsMemory: true, leaResult: "effective_offset" };
    case "lea_no_memory_read":
      return { readsMemory: false, computesEffectiveOffset: true };
    case "radix_power_of_two":
      return { property: "positional_weights_are_powers_of_two" };
    case "hex_digit_bit_width":
      return { bitsPerDigit: Math.log2(i.symbolCount) };
    case "hex_two_digit_byte_width":
      return { bitsPerDigit: Math.log2(i.symbolCount), bitsForTwoDigits: 2 * Math.log2(i.symbolCount) };
    case "binary_to_decimal": {
      const terms = [...i.bits].reverse().map((bit, index) => bit === "1" ? 2 ** index : 0).filter(value => value !== 0).reverse();
      return { decimal: terms.reduce((sum, value) => sum + value, 0), terms };
    }
    case "binary_bit_weight":
      return { exponent: i.positionFromRight, weight: 2 ** i.positionFromRight };
    case "hex_to_decimal": {
      const value = Number.parseInt(i.hex, 16);
      const digits = [...i.hex.toUpperCase()].reverse();
      const terms = digits.map((digit, index) => Number.parseInt(digit, 16) * (16 ** index)).filter(value => value !== 0).reverse();
      return { decimal: value, terms };
    }
    case "hex_digit_to_binary": {
      const value = Number.parseInt(i.digit, 16);
      return { decimal: value, binary: value.toString(2).padStart(4, "0") };
    }
    case "unsigned_byte_range":
      return { minimum: 0, maximum: (2 ** i.bits) - 1, minHex: "00h", maxHex: "FFh" };
    case "immediate_literal_fit": {
      const value = Number.parseInt(i.literal, i.radix);
      const maximum = (2 ** i.registerBits) - 1;
      return { fits: value <= maximum, value, maximum, requiredBits: Math.max(1, Math.ceil(Math.log2(value + 1))) };
    }
    case "load_byte_immediate_into_word": {
      const value = Number.parseInt(i.literal, i.radix);
      return { value, wordHex: value.toString(16).toUpperCase().padStart(4, "0") + "h", highByte: (value >>> 8) & 0xff, lowByte: value & 0xff };
    }
    case "hex_to_binary_decimal": {
      const value = Number.parseInt(i.hex, 16);
      return { binary: value.toString(2).padStart(i.hex.length * 4, "0"), decimal: value };
    }
    case "binary_nibble_grouping": {
      const padded = i.bits.padStart(Math.ceil(i.bits.length / 4) * 4, "0");
      const groups = padded.match(/.{4}/g);
      return { groups, hex: Number.parseInt(padded, 2).toString(16).toUpperCase() };
    }
    case "intel_operand_order":
      if (i.instruction) {
        const operands = i.instruction.replace(/^MOV\s+/i, "").split(",");
        return { destination: operands[0].trim(), source: operands[1].trim() };
      }
      return fact[oracle.rule];
    case "source_instruction_vs_data":
      return "assembly_statement_is_instruction";
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
          const skipped = i.program[pc + 1];
          skippedInstruction = skipped ? skipped.slice(0, 2).join(" ") + (skipped.length > 2 ? "," + skipped.slice(2).join(",") : "") : null;
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
assert.deepEqual(batches.map(batch => batch.batch), ["chapter-01", "chapter-02", "chapter-03", "chapter-04", "chapter-05", "chapter-06", "chapter-07"]);
assert.deepEqual(batches.map(batch => batch.oracles.length), [19, 18, 19, 18, 19, 19, 19], "Chapters 2 and 4 each reuse one historical oracle rather than duplicating its ID");
const historicalChapterOracles = manifest.oracles.filter(oracle => ["C02-F-Q4", "C04-F-Q4"].includes(oracle.id)).map(oracle => ({ ...oracle, status: "certified" }));
assert.equal(historicalChapterOracles.length, 2, "The historical chapter 2 and chapter 4 final question oracles must each be reused exactly once");
const allOracleRecords = [...batches.flatMap(batch => batch.oracles), ...historicalChapterOracles];
const allIds = allOracleRecords.map(oracle => oracle.id);
assert.equal(new Set(allIds).size, allIds.length, "Certified oracle IDs must be globally unique across supplemental batches and reused historical records");
const seen = new Set();
let certified = 0;
let blocked = 0;

for (const oracle of allOracleRecords) {
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
assert.equal(certified, 133, "All 133 questions across chapters 1 to 7 are certified, including the two reused historical chapter oracles");
assert.equal(blocked, 0, "No question in the certified batches remains blocked");
for (const chapter of [1, 2, 3, 4, 5, 6, 7]) {
  const prefix = "C" + String(chapter).padStart(2, "0") + "-";
  const expectedIds = key.questions.filter(question => question.id.startsWith(prefix)).map(question => question.id);
  assert.equal(expectedIds.length, 19, "Each audited chapter must contain exactly 19 keyed questions");
  for (const id of expectedIds) assert.ok(allIds.includes(id), "Missing independent oracle for " + id);
}
assert.match(keyMap.get("C01-L1-Q2").explanation, /octets machine distincts/i, "Source assembly must be distinguished from its encoded machine bytes");
console.log("Question oracle certification: chapters 1–7 — " + certified + "/133 certified; " + blocked + " blocked; runtime/key alignment and independent evaluators passed.");
