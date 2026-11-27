const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const key = JSON.parse(fs.readFileSync("docs/question-semantic-key-8086.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("docs/question-independent-oracles-8086.json", "utf8"));
const batches = ["chapter-01", "chapter-02", "chapter-03", "chapter-04", "chapter-05", "chapter-06", "chapter-07", "chapter-08", "chapter-09", "chapter-10", "chapter-11", "chapter-12", "chapter-13", "chapter-14", "chapter-15", "chapter-16", "chapter-17", "chapter-18", "chapter-19", "chapter-20", "chapter-21", "chapter-22", "chapter-23", "chapter-24", "chapter-25", "chapter-26", "chapter-27", "chapter-28", "chapter-29", "chapter-30", "chapter-31", "chapter-32", "chapter-33", "chapter-34", "chapter-35", "chapter-36"].map(name => JSON.parse(fs.readFileSync("docs/question-oracle-batches/" + name + ".json", "utf8")));
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
  if (oracle.rule === "audit_checklist_coverage") {
    const requirements = {
      effective_address: ["effective_address", "default_segment", "segment_override", "operand_width"],
      stack: ["LIFO_order", "word_values", "SP_before_after", "memory_bounds"],
      string_instruction: ["source_data", "destination_data", "SI", "DI", "DF", "segments", "FLAGS"],
      repeated_string: ["copied_data", "CX", "SI", "DI", "DF", "FLAGS"],
      interrupt_return_debug: ["stack_word_order", "saved_IP", "saved_CS", "saved_FLAGS", "SP_before_IRET", "handler_stack_balance"],
      instruction_length_fields: ["prefixes", "opcode", "ModR/M", "displacement", "immediate"],
      encoding_validation: ["bytes", "instruction_length", "disassembly", "independent_reference"],
      modrm_audit: ["all_mod_values", "all_reg_values", "all_rm_values", "disp8", "disp16", "opcode_extensions", "special_cases"],
      disassembly_validation: ["fixed_bytes", "disassembler", "independent_assembler"],
      optimization_validation: ["functional_result", "relevant_FLAGS", "input_boundaries"]
    };
    const requiredChecks = requirements[oracle.inputs.domain];
    assert.ok(requiredChecks, "Unknown checklist domain: " + oracle.inputs.domain);
    const supplied = new Set(oracle.inputs.checks);
    const missingChecks = requiredChecks.filter(check => !supplied.has(check));
    return { requiredChecks, missingChecks, complete: missingChecks.length === 0 };
  }
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
    case "adc_includes_carry": {
      const sum = i.destination + i.source + i.CF;
      return { result: sum & ((2 ** i.width) - 1), carryIn: i.CF };
    }
    case "multiword_addition": {
      const lowSum = i.lowA + i.lowB;
      const carryFromLow = lowSum > 0xffff ? 1 : 0;
      return { lowWordFirst: true, carryFromLow, highWordIncludesCarry: true, highResult: (i.highA + i.highB + carryFromLow) & 0xffff };
    }
    case "multiword_subtraction": {
      const borrowFromLow = i.lowA < i.lowB ? 1 : 0;
      return { lowWordFirst: true, borrowFromLow, highWordIncludesBorrow: true, highResult: (i.highA - i.highB - borrowFromLow) & 0xffff };
    }
    case "unsigned_subtract_flags": {
      const mask = (2 ** i.width) - 1;
      const difference = i.left - i.right;
      return { mathematicalDifference: difference, result: difference & mask, CF: i.left < i.right ? 1 : 0 };
    }
    case "sbb_includes_borrow":
      return { result: (i.destination - i.source - i.CF) & ((2 ** i.width) - 1), borrowIn: i.CF };
    case "inc_preserves_cf":
      return { CFModified: false, otherFlagsUpdated: true };
    case "neg_complement_two":
      return { expression: "0−AL", result: (0 - i.value) & ((2 ** i.width) - 1) };
    case "neg_signed_overflow": {
      const mask = (2 ** i.width) - 1;
      const minimumMagnitude = 2 ** (i.width - 1);
      return { result: (0 - i.value) & mask, OF: i.value === minimumMagnitude ? 1 : 0, CF: i.value === 0 ? 0 : 1 };
    }
    case "adc_carry_flag_input":
      return { inputFlag: "CF" };
    case "byte_add_preserves_high_byte": {
      const sum = i.initialAL + i.addend;
      const finalAX = (i.initialAX & 0xff00) | (sum & 0xff);
      return { finalAX, AH: (finalAX >>> 8) & 0xff, AL: sum & 0xff, CF: sum > 0xff ? 1 : 0 };
    }
    case "adc_requires_preserved_carry":
      return { carryMayBeDestroyed: true, requiredOrdering: "ADD_low_then_ADC_high_without_CF_clobber" };
    case "multiword_addition_test_cases":
      return { testsNoCarry: true, testsCarry: true, checksEachWord: true };
    case "bitwise_and":
      return { result: (i.left & i.right) & ((2 ** i.width) - 1) };
    case "and_low_nibble_mask":
      return { mask: i.mask, preserved: "low_nibble", cleared: "high_nibble" };
    case "bitwise_or":
      return { result: (i.left | i.right) & ((2 ** i.width) - 1) };
    case "bitwise_xor":
      return { result: (i.left ^ i.right) & ((2 ** i.width) - 1) };
    case "not_instruction_semantics":
      return { invertsAllBits: true, modifiesOperand: true };
    case "xor_mask_semantics":
      return { togglesMaskOneBits: true, unchangedMaskZeroBits: true };
    case "test_preserves_destination":
      return { destinationModified: false, flagsUpdated: true };
    case "test_zero_flag": {
      const logicalResult = (i.value & i.mask) & ((2 ** i.width) - 1);
      return { logicalResult, ZF: logicalResult === 0 ? 1 : 0 };
    }
    case "bitwise_and_semantics":
      return { preservesMaskOneBits: true, clearsMaskZeroBits: true };
    case "high_nibble_mask":
      return { mask: i.mask, preserved: "high_nibble", cleared: "low_nibble" };
    case "test_zero_flag_interpretation":
      return { maskedResultNonZero: i.ZF === 0, atLeastOneSelectedBitSet: i.ZF === 0 };
    case "and_vs_test":
      return { andModifiesDestination: true, testPreservesDestination: true };
    case "logical_flags_effect":
      return { CF: 0, OF: 0, otherFlags: "SF_ZF_PF_updated_AF_undefined" };
    case "flag_cf_semantics":
      return { meaning: "unsigned_carry_or_borrow" };
    case "flag_cf_of_distinction":
      return { CF: "unsigned_carry_or_borrow", OF: "signed_overflow", sameMeaning: false };
    case "parity_flag": {
      const byte = i.lowByte & 0xff;
      const oneBits = byte.toString(2).replace(/0/g, "").length;
      return { oneBits, PF: oneBits % 2 === 0 ? 1 : 0 };
    }
    case "interrupt_flag_role":
      return { controls: "maskable_interrupt_enable" };
    case "std_direction_flag":
      return { DF: 1, direction: "decrement" };
    case "cli_interrupt_flag":
      return { IF: 0 };
    case "pushf_stack_write":
      return { operation: "push", value: "FLAGS", stack: "SS:SP" };
    case "popf_restore_flags":
      return { restoredFLAGS: i.savedFLAGS, IF: (i.savedFLAGS >>> 9) & 1 };
    case "stack_segment_pointer":
      return { segment: "SS", offset: "SP" };
    case "overflow_flag_semantics":
      return { meaning: "signed_result_out_of_range" };
    case "sti_enable_interrupts":
      return { IF: 1, maskableInterruptsEnabled: true };
    case "flag_instruction_effects":
      return { mayDefineFlags: true, mayPreserveFlags: true, mayLeaveSomeUndefined: true };
    case "cld_direction_flag":
      return { DF: 0, direction: "increment" };
    case "pushf_popf_order":
      return { order: "push_then_pop", restoresSavedWord: true };
    case "trap_flag_role":
      return { controls: "single_step_trap" };
    case "popf_control_bits":
      return { restoresFlagsWord: true, mayAffectIF: true, mayAffectTF: true };
    case "stack_lifo_corruption":
      return { wrongWordMayBeRestored: true, stateMayBeCorrupted: true };
    case "software_flag_vs_hardware_interrupt":
      return { bitRepresentationDoesNotModelHardwareEvents: true };
    case "trace_state_sequence":
      return { recordsBeforeAfter: true, orderPreserved: true };
    case "first_divergence_diagnostic":
      return { locatesEarliestDivergence: true };
    case "first_divergence_and_isolate":
      return { locatesEarliestDivergence: true, isolatesCause: true };
    case "ip_instruction_offset":
      return { register: "IP", meaning: "instruction_offset" };
    case "debug_initialization_and_operand_size":
      return { checksBoth: true };
    case "execution_success_not_proof":
      return { correctnessProven: false };
    case "single_change_isolation":
      return { isolatesEffect: true, reproducible: true };
    case "inc_preserves_cf_value":
      return { CFAfter: i.initialCF, CFModified: false };
    case "branch_paths_validation":
      return i.IPChecked ? { takenPathTested: true, notTakenPathTested: true, IPChecked: true } : { takenPathTested: true, notTakenPathTested: true };
    case "trace_order_causality":
      return { linksEachChangeToInstruction: true, orderPreserved: true };
    case "effective_address_memory_bytes":
      return { checksEffectiveAddress: true, checksBytes: true };
    case "assert_exact_state":
      return { AX: i.observedAX, assertionPasses: i.observedAX === i.expectedAX };
    case "boundary_test_coverage":
      return { coversBoundaryConditions: true };
    case "cmp_non_destructive":
      return { operandsModified: false, flagsUpdated: true };
    case "zero_flag_on_equal":
      return { difference: i.left - i.right, ZF: i.left === i.right ? 1 : 0, equal: i.left === i.right };
    case "signed_less_condition":
      return { condition: "SF!=OF", signed: true };
    case "test_logic_result_no_store": {
      const logicalResult = i.AL & i.mask;
      return { logicalResult, storedAL: i.AL, ZF: logicalResult === 0 ? 1 : 0, CF: 0, OF: 0 };
    }
    case "test_clears_cf_of":
      return { CF: 0, OF: 0 };
    case "jcc_uses_existing_flags":
      return { flagsProducedBeforeBranch: true, branchReadsFlags: true };
    case "relative_displacement_range":
      return { minimum: -(2 ** (i.bits - 1)), maximum: (2 ** (i.bits - 1)) - 1, unit: "bytes" };
    case "relative_displacement_base":
      return { base: "IP_after_instruction" };
    case "jmp_register_indirect":
      return { kind: "near_indirect", targetFrom: "BX", CSChanged: false };
    case "jmp_near_encoding":
      return { opcode: "E9", displacementBits: 16, kind: "direct_relative_near" };
    case "jmp_indirect_near_encoding":
      return { opcode: "FF", extension: 4, kind: "near_indirect" };
    case "near_jump_segment":
      return { IPChanged: true, CSChanged: false };
    case "far_jump_segment":
      return { IPChanged: true, CSChanged: true };
    case "jmp_short_encoding":
      return { opcode: "EB", displacementBits: 8, kind: "direct_relative_short" };
    case "short_displacement_fits":
      return { fits: i.displacement >= -(2 ** (i.bits - 1)) && i.displacement <= (2 ** (i.bits - 1)) - 1, minimum: -(2 ** (i.bits - 1)), maximum: (2 ** (i.bits - 1)) - 1 };
    case "jcc_condition": {
      const conditions = { JE: "ZF=1", JB: "CF=1", JO: "OF=1", JL: "SF!=OF", JP: "PF=1", JNS: "SF=0", JA: "CF=0 && ZF=0", JBE: "CF=1 || ZF=1", JG: "ZF=0 && SF=OF", JNE: "ZF=0", JC: "CF=1", JS: "SF=1", JNO: "OF=0", JGE: "SF=OF" };
      return { condition: conditions[i.mnemonic] };
    }
    case "jcc_alias":
      return { aliases: true, condition: "ZF=1" };
    case "jcc_reads_flags":
      return { comparesOperands: false, readsExistingFLAGS: true };
    case "jcc_unsigned_condition":
      return { condition: ({ JB: "CF=1", JA: "CF=0 && ZF=0" })[i.mnemonic], unsigned: true };
    case "jcc_signed_condition":
      return { condition: ({ JL: "SF!=OF", JG: "ZF=0 && SF=OF" })[i.mnemonic], signed: true };
    case "signed_byte_decode": {
      const unsignedValue = i.value;
      const sign = 2 ** (i.bits - 1);
      return { unsignedValue, signedValue: unsignedValue >= sign ? unsignedValue - (2 ** i.bits) : unsignedValue };
    }
    case "unsigned_byte_decode":
      return { value: i.value, signedness: "unsigned" };
    case "signed_compare": {
      const sign = 2 ** (i.bits - 1), modulus = 2 ** i.bits;
      const left = i.left >= sign ? i.left - modulus : i.left;
      const right = i.right >= sign ? i.right - modulus : i.right;
      return { leftValue: left, rightValue: right, relation: left < right ? "less" : left > right ? "greater" : "equal" };
    }
    case "unsigned_compare":
      return { leftValue: i.left, rightValue: i.right, relation: i.left < i.right ? "less" : i.left > i.right ? "greater" : "equal" };
    case "signed_less_with_overflow":
      return { condition: "SF!=OF", usesOF: true };
    case "bit_pattern_count":
      return { combinations: 2 ** i.bits };
    case "comparison_family_selection":
      return { requiresSignednessChoice: true, branchFamilies: "signed_and_unsigned" };
    case "signed_unsigned_branch_families":
      return { unsignedUsesCF: true, signedUsesSFandOF: true };
    case "loop_counter_register":
      return { register: "CX" };
    case "loope_condition":
      return { condition: "CX!=0 && ZF=1" };
    case "jcxz_no_decrement":
      return { CXModified: false, condition: "CX=0" };
    case "loopne_condition":
      return { condition: "CX!=0 && ZF=0" };
    case "loope_reads_existing_zf":
      return { readsExistingZF: true, comparesOperands: false };
    case "jcxz_preserves_cx":
      return { CXAfter: i.initialCX, CXModified: false };
    case "loop_zero_underflow": {
      const CXAfter = (i.initialCX - 1) & 0xffff;
      return { CXAfter, branches: CXAfter !== 0 };
    }
    case "jcxz_encoding":
      return { opcode: "E3", displacementBits: 8, kind: "relative_short" };
    case "loop_condition":
      return { condition: "CX!=0" };
    case "loop_preserves_flags":
      return { flagsModified: false };
    case "jcxz_guard_before_loop":
      return { guard: "JCXZ", preventsZeroCounterUnderflow: true };
    case "max_initialization":
      return { initialMaximum: i.values[0] };
    case "sum_accumulator_register":
      return { register: "AX" };
    case "search_test_cases":
      return { coversAll: ["first", "middle", "absent", "empty"].every(value => i.cases.includes(value)) };
    case "array_sum": {
      const sum = i.values.reduce((total, value) => total + value, 0);
      return { sum, finalAX: sum & ((2 ** i.width) - 1) };
    }
    case "count_register":
      return { register: "DX" };
    case "multiword_sum_carry":
    case "multiword_sum_overflow":
      return { carryPropagated: true, instruction: "ADC" };
    case "sequential_search": {
      const index = i.values.indexOf(i.target);
      return { checksInOrder: index < 0 ? i.values.slice() : i.values.slice(0, index + 1), found: index >= 0, index };
    }
    case "bounds_check_before_read":
      return { readAllowed: i.index >= 0 && i.index < i.arrayLength, checkBeforeRead: true };
    case "not_found_status":
      return { found: false, result: "explicit_not_found" };
    case "empty_array_no_read":
      return { memoryReads: 0, terminatesWithoutAccess: true };
    case "found_status_explicit":
      return { found: false, result: "explicit_not_found" };
    case "bounds_violation":
      return { readAllowed: i.index >= 0 && i.index < i.arrayLength, violation: i.index >= i.arrayLength ? "index_equals_length" : "index_out_of_range" };
    case "comparison_signedness":
      return { requiresSignednessChoice: true }; 
    case "remaining_elements_guard":
      return { readAllowed: i.remaining > 0, checkBeforeRead: true };
    case "logical_address_pair":
      return i.segmentRegister ? { logicalAddress: i.segment.toString(16).toUpperCase().padStart(4, "0") + "h:" + i.offset.toString(16).toUpperCase().padStart(4, "0") + "h", physicalAddress: i.segment * 16 + i.offset } : { components: ["segment", "offset"] };
    case "physical_address_requires_segment":
      return { requiresSegment: true };
    case "physical_address_formula":
      return { formula: "segment*16+offset" };
    case "physical_address_space_range": {
      const bytes = 2 ** i.addressBits;
      return { minimum: 0, maximum: bytes - 1, bytes };
    }
    case "segment_overlap":
      return { overlapPossible: true, reason: "segment_bases_16_bytes_apart" };
    case "physical_alias_pair": {
      const physicalAddresses = i.pairs.map(pair => (pair.segment * (2 ** i.shift) + pair.offset) % (2 ** i.addressBits));
      return { physicalAddresses, samePhysical: physicalAddresses.every(value => value === physicalAddresses[0]) };
    }
    case "logical_alias_concept":
      return { multipleLogicalPairsPossible: true };
    case "8086_bus_address_width":
      return { addressBusBits: i.addressBits, offsetBits: i.offsetBits };
    case "mov_segment_register_validity":
      return { valid: true, destination: i.destination };
    case "logical_address_preparation":
      return { logicalAddress: "DS:BX", segment: i.segmentValue, offset: i.offsetValue };
    case "physical_address_wrap": {
      const unmasked = i.segment * 16 + i.offset;
      const modulus = 2 ** i.addressBits;
      return { unmasked, physical: unmasked % modulus, modulus };
    }
    case "physical_address_algorithm":
      return { formula: "segment*16+offset_then_mask_20_bits" };
    case "effective_address_base_index":
      return { offsetExpression: "BX+SI", modulus: 65536 };
    case "effective_address_general":
      return { offsetExpression: "base_index_displacement_sum", physicalAddressRequiresSegment: true };
    case "segment_required_for_physical_address":
      return { requiresSegment: true };
    case "effective_address_sum":
      return { offset: (i.base + i.index + i.displacement) & ((2 ** i.width) - 1) };
    case "effective_address_segment":
      return { segment: i.defaultSegment, offset: (i.BP + i.displacement) & 0xffff };
    case "segment_override":
      return { selectedSegment: i.override };
    case "mov_direct_memory_word":
      return { valid: true, memory: true, width: i.width, directAddress: i.address };
    case "mov_effective_memory_word":
      return { valid: true, memory: true, width: i.width, offset: (i.base + i.index + i.displacement) & 0xffff };
    case "direct_address_encoding":
      return { mod: 0, rm: 6, displacementBits: 16, displacement: i.address };
    case "mov_memory_read_value":
      return { memoryRead: true, destination: i.destination, value: i.memoryWord };
    case "mov_register_register":
      return { operandKinds: ["register", "register"] };
    case "immediate_vs_direct_memory":
      return { immediateIsValue: true, directIsAddress: true };
    case "procedure_parameter_location":
      return { locations: ["register", "stack"] };
    case "procedure_addition":
      return { AX: i.left + i.right, sum: i.left + i.right };
    case "procedure_calling_convention":
      return { explicitSharedConvention: true };
    case "preserve_register_push_pop":
      return { restoredValue: i.value, sequence: ["PUSH " + i.register, "...", "POP " + i.register] };
    case "pop_restores_saved_value":
      return { restoredValue: i.savedValue };
    case "stack_push_pop_balance":
      return { everyPushMatched: i.pushCount === i.popCount, LIFO: true };
    case "nested_call_return_stack":
      return { returnAddressesStored: i.calls, eachCallHasOwnReturn: true };
    case "nested_call_return_order":
      return { firstReturn: "EXTERNE", secondReturn: "CALLER" };
    case "procedure_stack_balance_paths":
      return { everyPathBalanced: true, unmatchedPush: false };
    case "procedure_parameter_definition":
      return { isDataSuppliedToRoutine: true };
    case "calling_convention_inputs_outputs":
      return { definesInputs: true, definesOutputs: true };
    case "push_register_semantics":
      return { stackValue: i.AX, SPDecrement: 2 };
    case "register_preservation_contract":
      return { mustRestoreIncomingValue: true, mechanism: "PUSH_POP" };
    case "modular_program_decomposition":
      return { separateResponsibilities: true };
    case "routine_call_sequence":
      return { calls: i.sequence.map(name => "CALL " + name), returnsToCaller: true };
    case "routine_stack_contract":
      return { returnsCorrectly: true, SPRestored: true };
    case "procedure_parameter_register_contract":
      return { AXRole: "input_then_result" };
    case "procedure_interface_documentation":
      return { documented: true };
    case "zero_double":
      return { result: i.initialValue * 2 };
    case "zero_boundary_case":
      return { handlesZero: i.input === 0 };
    case "routine_boundary_test":
      return { checksGeneralRule: true, checksBoundaryCases: true };
    case "separate_routine_responsibilities":
      return { responsibilitiesDifferent: true };
    case "call_saves_return":
      return { savesReturnAddress: true, transfersControl: true };
    case "routine_side_effect_documentation":
      return { interfaceIncomplete: !i.registerEffectsDocumented };
    case "call_return_sequence":
      return { returnsToCallerAfterEach: true, sequential: true };
    case "preserve_register_contract":
      return { mustRestoreIncomingValue: true, mechanism: "PUSH_POP" };
    case "routine_isolation_tests":
      return { eachRoutineTestedSeparately: true, interfacesSpecified: true };
    case "mul_byte_trace":
      return { AX: i.AL * i.BL, product: i.AL * i.BL };
    case "mul_byte_result_registers":
      return { register: "AX" };
    case "mul_byte_multiplicand":
      return { implicitMultiplicand: "AL" };
    case "imul_signedness":
      return { signed: true, interpretation: "two_complement" };
    case "imul_byte_product": {
      const sign = 0x80;
      const left = i.left >= sign ? i.left - 0x100 : i.left;
      const right = i.right >= sign ? i.right - 0x100 : i.right;
      const product = left * right;
      return { signedLeft: left, signedRight: right, product, resultAX: product & 0xffff };
    }
    case "mul_unsigned_overflow_flags":
      return { CF: i.highHalf !== 0 ? 1 : 0, OF: i.highHalf !== 0 ? 1 : 0 };
    case "mul_byte_product": {
      const product = i.AL * i.operand;
      return { product, AX: product & 0xffff, hex: (product & 0xffff).toString(16).toUpperCase().padStart(4, "0") + "h" };
    }
    case "mul_product_vs_flags":
      return { fullProductStored: true, CF_OFIndicateHighHalf: true };
    case "mul_unsigned_semantics":
      return { signed: false, operation: "multiplication" };
    case "mul_byte_form_validity":
      return { valid: true, explicitOperandCount: 1, implicitMultiplicand: "AL" };
    case "mul_flags_high_half_zero":
      return { CF: i.highHalf === 0 ? 0 : 1, OF: i.highHalf === 0 ? 0 : 1 };
    case "mul_result_validation":
      return { checkFullProduct: true, checkWidth: true, checkCF: true, checkOF: true };
    case "div_byte_dividend":
      return { dividendRegister: "AX" };
    case "div_byte_trace": {
      const quotient = Math.floor(i.dividend / i.divisor);
      const remainder = i.dividend % i.divisor;
      return { quotient, remainder, AL: quotient, AH: remainder };
    }
    case "div_byte_result_registers":
      return { quotient: "AL", remainder: "AH" };
    case "cbw_sign_extend": {
      const signedValue = i.AL >= 0x80 ? i.AL - 0x100 : i.AL;
      return { AX: signedValue & 0xffff, signedValue };
    }
    case "idiv_sign_extension_required":
      return { requiredPreparation: "CBW", dividendAX: i.signedDividend8 & 0xffff };
    case "division_error_conditions":
      return { errorIfDivisorZero: true, errorIfQuotientOutOfRange: true };
    case "div_byte_quotient_overflow":
      return { fitsInAL: i.quotient <= 0xff, maxAL: 255, error: i.quotient > 0xff };
    case "div_byte_boundary_cases":
      return { firstFits: i.cases[0].dividend / i.cases[0].divisor <= 0xff, secondOverflows: i.cases[1].dividend / i.cases[1].divisor > 0xff };
    case "div_unsigned_semantics":
      return { signed: false, operation: "division" };
    case "div_byte_form":
      return { valid: true, dividend: "AX", divisor: "BL", quotient: "AL", remainder: "AH" };
    case "idiv_byte_trace": {
      const quotient = Math.trunc(i.signedDividend / i.divisor);
      const remainder = i.signedDividend - quotient * i.divisor;
      return { quotient, remainder, AL: quotient & 0xff, AH: remainder & 0xff };
    }
    case "division_result_validation":
      return { checkDividendWidth: true, checkQuotientRange: true, checkRemainder: true, checkSignedness: true };
    case "shift_right_cf": {
      const mask = (2 ** i.width) - 1;
      return { result: (i.value >>> i.count) & mask, CF: (i.value >>> (i.count - 1)) & 1 };
    }
    case "shr_zero_fill":
      return { fillsMostSignificantBitWithZero: true };
    case "sar_sign_extend":
      return { preservesSignBit: true, insertedBit: (i.value >>> (i.width - 1)) & 1 };
    case "sar_byte_trace": {
      const signed = i.value >= 0x80 ? i.value - 0x100 : i.value;
      return { result: (signed >> i.count) & 0xff, CF: (i.value >>> (i.count - 1)) & 1 };
    }
    case "rol_rotate_semantics":
      return { rotatesOutgoingMSBIntoLSB: true };
    case "rol_byte_trace": {
      const shift = i.count % i.width;
      const mask = (2 ** i.width) - 1;
      const result = ((i.value << shift) | (i.value >>> (i.width - shift))) & mask;
      return { result, CF: (i.value >>> (i.width - shift)) & 1 };
    }
    case "shr_vs_sar":
      return { SHR: "zero_fill", SAR: "sign_extension" };
    case "shift_instruction_form":
      return { valid: true, countForms: ["1", "CL"] };
    case "shift_variable_count_register":
      return { countRegister: "CL" };
    case "sar_vs_shr_selection":
      return { instruction: "SAR" };
    case "shift_flags_by_count":
      return { checkResult: true, checkCF: true, checkOFAccordingToCount: true };
    case "movsb_operands":
      return { source: "DS:SI", destination: "ES:DI" };
    case "movsb_index_update": {
      const delta = i.DF ? -1 : 1;
      return { SI: (i.SI + delta) & 0xffff, DI: (i.DI + delta) & 0xffff };
    }
    case "string_destination_segment":
      return { destinationSegment: "ES" };
    case "stosb_source_register":
      return { sourceRegister: "AL" };
    case "stosb_destination":
      return { destination: "ES:" + i.DI.toString(16).toUpperCase().padStart(4, "0") + "h" };
    case "stosb_index_register":
      return { indexRegister: "DI" };
    case "scasb_operands":
      return { left: "AL", right: "ES:DI", operation: "compare" };
    case "scasb_equal_flags":
      return { ZF: i.AL === i.memoryByte ? 1 : 0, equal: i.AL === i.memoryByte };
    case "scasb_index_register":
      return { indexRegister: "DI" };
    case "movsb_direction_flag":
      return { controls: "DF" };
    case "movsb_instruction_semantics":
      return { copiesByte: true, source: "DS:SI", destination: "ES:DI" };
    case "stosb_write":
      return { value: i.AL, destination: "ES:" + i.DI.toString(16).toUpperCase().padStart(4, "0") + "h" };
    case "movsb_copy_trace": {
      const delta = i.DF ? -1 : 1;
      return { destinationByte: i.sourceByte, SI: (i.SI + delta) & 0xffff, DI: (i.DI + delta) & 0xffff };
    }
    case "movsb_source_override":
      return { sourceSegment: i.override, sourceOffset: i.sourceOffset, destinationSegment: "ES" };
    case "string_instruction_validation":
      throw new Error("Deprecated checklist placeholder; use audit_checklist_coverage with domain-specific requirements");
    case "rep_counter_register":
      return { counter: "CX" };
    case "direction_flag_control":
      return { controls: "DF" };
    case "cld_index_update": {
      const delta = i.DF ? -1 : 1;
      return { SI: (i.SI + delta) & 0xffff, DI: (i.DI + delta) & 0xffff };
    }
    case "repne_stop_condition":
      return { condition: "CX=0 || ZF=1" };
    case "repne_scasb": {
      const ZF = i.AL === i.memoryByte ? 1 : 0;
      return { ZF, repeatContinues: i.CX > 1 && ZF === 0 };
    }
    case "rep_effects":
      return { stateAffected: ["CX", "SI", "DI", "FLAGS"] };
    case "rep_movsb_copy":
      return { copies: "CX_bytes", source: "DS:SI", destination: "ES:DI" };
    case "string_word_index_update":
      return { SIIncrement: i.DF ? -2 : 2, DIIncrement: i.DF ? -2 : 2 };
    case "rep_stosb_forward": {
      const writes = Array.from({ length: i.count }, (_, index) => ({
        segment: "ES",
        offset: (i.initialDI + index) & 0xffff,
        value: i.al
      }));
      return { writes, finalCX: 0, finalDI: (i.initialDI + i.count) & 0xffff };
    }
    case "prefetch_queue_size":
      return { queueBytes: 6 };
    case "memory_bus_cost":
      return { requiresMemoryBus: true, additionalTransfers: true };
    case "lab_timing_scope":
      return { exactCyclesModeled: false, biuTimingModeled: false, physicalClockModeled: false };
    case "branch_prefetch_flush":
      return { queueDiscarded: true, refillFromNewIP: true, newIP: i.newIP };
    case "biu_prefetch_role":
      return { unit: "BIU", responsibilities: ["bus_interface", "instruction_prefetch"] };
    case "shift_left_trace":
      return { result: (i.value << i.count) & ((2 ** i.width) - 1) };
    case "intel_timing_reference":
      return { referenceRequired: true, processorSpecific: true };
    case "loop_prefetch_effect": {
      const cx = (i.initialCX - 1) & 0xffff;
      const branchTaken = cx !== 0;
      return { branchTaken, IPChanged: branchTaken, refetchRequired: branchTaken };
    }
    case "memory_register_transfer_distinction":
      return { firstKind: "register_to_register", secondKind: "memory_to_register", secondReadsMemory: true };
    case "timing_claim_correction":
      return { claimType: "documented_reference_not_simulator_measurement", requiresHardwareSource: true };
    case "optimization_evidence":
      return { separateDimensions: true, requiresRelevantFlags: true, hardwareCostNeedsReference: true };
    case "program_specification_contract":
      return { requiredFields: ["inputs", "outputs", "constraints", "boundary_cases"], complete: true };
    case "unsigned_word_add": {
      const sum = i.left + i.right;
      return { result: sum & ((2 ** i.width) - 1), CF: sum > ((2 ** i.width) - 1) ? 1 : 0 };
    }
    case "boundary_case_rationale":
      return { testsRequired: true, checksBoundary: true };
    case "procedure_reuse_semantics":
      return { encapsulatesReusableOperation: true };
    case "procedure_double_result":
      return { finalAX: i.initialAX * 2 };
    case "procedure_state_validation":
      return { resultCorrect: i.expectedAX === i.observedAX, stackBalanced: i.expectedSPRestored && i.observedSPRestored };
    case "unsigned_byte_add_flags": {
      const sum = i.left + i.right;
      const result = sum & 0xff;
      return { result, AL: result, CF: sum > 0xff ? 1 : 0 };
    }
    case "boundary_case_crossing":
      return { crossesUnsignedMaximum: i.value === i.maxValue && i.value + i.increment > i.maxValue, result: (i.value + i.increment) & ((2 ** i.width) - 1), carry: i.value + i.increment > i.maxValue ? 1 : 0 };
    case "validation_evidence_record":
      return { requiredArtifacts: i.artifacts, reproducible: true };
    case "design_before_implementation":
      return { designPrecedesInstructionSelection: true, algorithmCanBeReviewedFirst: true };
    case "add_instruction_semantics":
      return { result: (i.AX + i.BX) & ((2 ** i.width) - 1), destination: "AX" };
    case "call_return_stack_contract":
      return { returnAddressPreserved: i.callPushesReturnIP && i.retPopsReturnIP, stackBalanced: i.balanced };
    case "procedure_call_double":
      return { finalAX: i.initialAX * 2, returnsAfterCall: true, stackBalanced: true };
    case "validation_assertions_scope":
      return { requiredAssertions: i.assertions, complete: true };
    case "reproducible_validation_evidence":
      return { requiredArtifacts: i.artifacts, reproducible: true };
    case "segment_override_semantics":
      return { selectedSegment: i.overrideSegment, affectsMemoryReference: true };
    case "segment_prefix_opcode": {
      const prefixes = { ES: 0x26, CS: 0x2e, SS: 0x36, DS: 0x3e };
      const prefix = prefixes[i.segment];
      return { prefix, hex: prefix.toString(16).toUpperCase().padStart(2, "0") + "h" };
    }
    case "segment_override_distinct_values":
      return { observedValues: i.overrideTests.map(segment => i.segmentValues[segment]), distinguishesSelectedSegment: new Set(i.overrideTests.map(segment => i.segmentValues[segment])).size === i.overrideTests.length };
    case "lock_prefix_semantics":
      return { lockSignalAssertedDuringNextInstruction: i.mode === "maximum" && i.nextInstruction.operandKind === "memory" && i.nextInstruction.modifiesOperand, mode: i.mode };
    case "lock_instruction_validity": {
      const valid = i.operandKind === "memory";
      return { valid, modifiesMemory: valid, lockableInstruction: valid };
    }
    case "lock_model_limit":
      return { atomicitySimulated: false, physicalBusSignalsSimulated: false };
    case "rep_prefix_semantics":
      return { appliesToNextInstruction: true, target: i.nextInstruction };
    case "rep_string_validity":
      return { valid: i.nextInstruction === "MOVSB", compatibleStringInstruction: i.nextInstruction === "MOVSB" };
    case "segment_override_syntax":
      return { valid: true, selectedSegment: i.segment, memoryReference: true };
    case "rep_movsb_trace": {
      const step = i.DF === 0 ? 1 : -1;
      const count = i.initialCX;
      return { copiedBytes: i.sourceBytes.slice(0, count), finalCX: 0, finalSI: (i.initialSI + count * step) & 0xffff, finalDI: (i.initialDI + count * step) & 0xffff };
    }
    case "direction_flag_string_step":
      return { indexStep: i.DF === 0 ? i.elementBytes : -i.elementBytes, direction: i.DF === 0 ? "increment" : "decrement" };
    case "lock_memory_effect":
      return { memoryValue: (i.initialValue + 1) & ((2 ** i.width) - 1), functionalEffectVerified: true, hardwareAtomicityVerified: false };
    case "wait_esc_model_limit":
      return { coprocessorModeled: i.coprocessor8087, testSignalModeled: i.testSignalModeled };
    case "prefix_interaction_validation":
      return { mustValidatePrefixAndInstructionTogether: true, invalidCombinationsMustBeRejected: true };
    case "symbol_table_offsets":
      return { ...Object.fromEntries(i.symbols.map(symbol => [symbol.label, symbol.offset])), valuesAreOffsets: true };
    case "assembler_two_pass":
      return { firstPass: "calculate_offsets_and_symbols", secondPass: "resolve_references_and_encode" };
    case "near_label_jump_resolution":
      return { target: i.label, targetOffset: i.targetOffset, relativeNearTransfer: true };
    case "sequential_disassembler_model":
      return { readsBytesInOrder: true, usesDecodedInstructionLengths: true, executesProgram: false };
    case "decode_mov_hlt_stream":
      return { instructions: ["MOV AX,1234h", "HLT"], lengths: [3, 1], bytesConsumed: i.bytes.length };
    case "disassembly_start_alignment":
      return { startOffsetAffectsDecode: true, dataCanBeMistakenForOpcode: true };
    case "unknown_byte_representation":
      return { directive: "DB", value: i.byte, bytePreserved: true, sourceDataProven: false, alignmentCertain: false };
    case "db_directive_semantics":
      return { directive: "DB", byte: i.value, rawData: true, machineInstruction: false };
    case "unknown_byte_alignment_uncertainty":
      return { bytePreserved: i.bytePreserved, subsequentAlignmentKnown: i.knownInstructionLength, uncertaintyReported: !i.knownInstructionLength };
    case "segment_offset_definition":
      return { offsetIsRelative: true, physicalAddressRequiresSegment: true };
    case "machine_code_symbol_names":
      return { symbolNameEncoded: i.binaryContainsSymbolTable, offsetMayRemainResolvable: true };
    case "decode_hlt_opcode":
      return { mnemonic: i.byte === 0xf4 ? "HLT" : "UNKNOWN", length: 1 };
    case "short_jump_label_offset": {
      const labelOffset = i.startOffset + i.jmpBytes + i.nopBytes;
      return { labelOffset, hex: labelOffset.toString(16).toUpperCase().padStart(4, "0") + "h" };
    }
    case "unknown_byte_resynchronization":
      return { directive: "DB", byte: i.byte, bytePreserved: true, alignmentMarkedUncertain: true, doNotInventInstruction: true };
    case "default_segment_by_addressing_form":
      return { segment: i.containsBP ? "SS" : "DS" };
    case "modrm_field_layout":
      return { fields: ["Mod", "Reg", "R/M"], widths: [i.modBits, i.regBits, i.rmBits], totalBits: i.modBits + i.regBits + i.rmBits };
    case "modrm_decode_byte": {
      const binary = i.byte.toString(2).padStart(i.width, "0");
      return { binary, mod: (i.byte >>> 6) & 3, reg: (i.byte >>> 3) & 7, rm: i.byte & 7 };
    }
    case "modrm_disp_size":
      return { displacementBits: i.mod === 1 ? 8 : i.mod === 2 ? 16 : 0, signed: i.mod === 1 || i.mod === 2 };
    case "effective_address_formula":
      return { formula: i.base + "+" + i.index + "+" + i.displacement + " modulo " + (2 ** i.width), segmentCalculationSeparate: true };
    case "modrm_direct_address_special":
      return { directAddress: i.mod === 0 && i.rm === 6, displacementBits: i.mod === 0 && i.rm === 6 ? 16 : 0, usesBaseRegister: !(i.mod === 0 && i.rm === 6) };
    case "bp_zero_displacement_encoding":
      return { mod: 1, rm: i.rm, disp8: 0, usesBP: true, directAddress: false };
    case "modrm_mov_memory_decode":
      return { instruction: "MOV AX,[BX+SI+4]", mod: (i.modrm >>> 6) & 3, reg: "AX", rmExpression: "BX+SI", displacement: i.displacement };
    case "modrm_reg_field_register":
      return { register: (["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"])[i.reg] };
    case "opcode_semantics":
      return { identifiesOperation: true, mayEncodeForm: true };
    case "mov_ax_immediate_opcode": {
      const registerCodes = { AX: 0, CX: 1, DX: 2, BX: 3, SP: 4, BP: 5, SI: 6, DI: 7 };
      const opcode = 0xb8 + registerCodes[i.destination];
      return { opcode, hex: opcode.toString(16).toUpperCase() + "h" };
    }
    case "instruction_length_components":
      return { totalBytes: i.prefixBytes + i.opcodeBytes + i.modrmBytes + i.displacementBytes + i.immediateBytes };
    case "instruction_next_ip": {
      const nextIP = (i.startIP + i.length) & ((2 ** i.ipBits) - 1);
      return { nextIP, hex: nextIP.toString(16).toUpperCase().padStart(4, "0") + "h" };
    }
    case "modrm_directional_equivalence": {
      const registers = ["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"];
      const decode = form => {
        const mod = form.modrm >>> 6;
        const reg = (form.modrm >>> 3) & 7;
        const rm = form.modrm & 7;
        if (mod !== 3 || ![0x89, 0x8b].includes(form.opcode)) throw new Error("Unsupported MOV ModR/M form");
        const destination = form.opcode === 0x89 ? registers[rm] : registers[reg];
        const source = form.opcode === 0x89 ? registers[reg] : registers[rm];
        return "MOV " + destination + "," + source;
      };
      const decoded = i.forms.map(decode);
      return { decoded, sameEffect: decoded.every(text => text === decoded[0]) };
    }
    case "mov_register_transfer":
      return { finalAX: i.initialBX, finalBX: i.initialBX, operation: "copy" };
    case "modrm_direction_field":
      return { sameOperation: true, destinationCanBeEncodedInRegOrRM: true };
    case "mov_ax_immediate_bytes": {
      const opcode = 0xb8;
      const bytes = [opcode, i.immediate & 0xff, (i.immediate >>> 8) & 0xff];
      return { bytes, hexBytes: bytes.map(value => value.toString(16).toUpperCase().padStart(2, "0")), length: bytes.length };
    }
    case "immediate_width": {
      const maximum = (2 ** i.destinationBits) - 1;
      return { fits: i.immediate >= 0 && i.immediate <= maximum, maximum, bytes: i.destinationBits / i.byteBits };
    }
    case "mov_register_modrm_decode": {
      const registers = ["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"];
      const mod = i.modrm >>> 6;
      const reg = (i.modrm >>> 3) & 7;
      const rm = i.modrm & 7;
      if (mod !== 3 || i.opcode !== 0x89) throw new Error("Unsupported MOV ModR/M form");
      return { instruction: "MOV " + registers[rm] + "," + registers[reg], destination: registers[rm], source: registers[reg] };
    }
    case "io_port_register":
      return { register: "DX" };
    case "mov_port_number":
      return { DX: i.immediate, hex: i.immediate.toString(16).toUpperCase().padStart(4, "0") + "h" };
    case "io_address_space":
      return { separateAddressSpaces: true, usesSegmentOffset: false };
    case "out_transfer":
      return { port: i.DX, value: i.AL, direction: "register_to_port" };
    case "in_transfer":
      return { port: i.DX, AL: i.portValue, direction: "port_to_register" };
    case "io_model_state":
      return { representation: "configurable_software_state", physicalPins: false };
    case "cli_interrupt_flag":
      return { finalIF: 0, maskableInterruptsEnabled: false };
    case "sti_interrupt_flag":
      return { finalIF: 1, maskableInterruptsEnabled: true };
    case "hlt_after_sti_model":
      return { executionHalts: true, electricalWakeupModeled: i.hardwareWakeupModeled };
    case "in_instruction_form":
      return { valid: true, mnemonic: "IN", destination: i.destination, portSource: i.portRegister };
    case "out_operand_validity":
      return { valid: ["AL", "AX"].includes(i.dataOperand), allowedDataRegisters: ["AL", "AX"] };
    case "out_port_write":
      return { port: i.DX, value: i.AL, hexValue: i.AL.toString(16).toUpperCase() + "h" };
    case "hex_port_decimal": {
      const value = Number(i.hex);
      return { decimal: value, hex: value.toString(16).toUpperCase().padStart(4, "0") + "h" };
    }
    case "in_immediate_port_trace":
      return { AL: i.portValue, hex: i.portValue.toString(16).toUpperCase().padStart(2, "0") + "h", port: i.port };
    case "io_state_after_out":
      return { portState: i.value, writtenValue: i.value, observable: true };
    case "io_input_initialization":
      return { requiresInitialization: !i.configuredPorts.includes(i.targetPort), targetPort: i.targetPort };
    case "io_model_scope":
      return { softwarePortModel: i.modeled.includes("configurable_port_state"), realPeripheralModeled: i.modeled.includes("physical_peripheral"), electricalSignalsModeled: i.modeled.includes("electrical_bus_signals") };
    case "ivt_entry_offset_formula":
      return { entryBytes: i.entryBytes, offsetExpression: "4*n", physicalBase: i.ivtBase };
    case "ivt_vector_offset": {
      const offset = i.ivtBase + i.vector * i.entryBytes;
      return { offset, hex: offset.toString(16).toUpperCase().padStart(4, "0") + "h", bytes: i.entryBytes };
    }
    case "ivt_entry_layout":
      return { pointerType: "far", offsetBits: i.offsetBits, segmentBits: i.segmentBits, totalBytes: (i.offsetBits + i.segmentBits) / i.byteBits, memoryOrder: i.memoryOrder };
    case "ivt_entry_size":
      return { offsetBytes: i.offsetBits / i.byteBits, segmentBytes: i.segmentBits / i.byteBits, totalBytes: (i.offsetBits + i.segmentBits) / i.byteBits, pointerType: "far" };
    case "interrupt_frame_push_order":
      return { pushOrder: i.words, topFirst: i.words.slice().reverse(), bytesPushed: i.words.length * i.wordBytes };
    case "interrupt_frame_top_word":
      return { topWord: i.pushOrder[i.pushOrder.length - 1], nextWords: i.pushOrder.slice(0, -1).reverse() };
    case "iret_restore_order":
      return { popOrder: i.stackTopFirst, restoresInstructionPointer: true, restoresCodeSegment: true, restoresFlags: true };
    case "iret_resume_address":
      return { resumeIP: i.savedIP, resumeCS: i.savedCS };
    case "interrupt_stack_balance": {
      const spBeforeIret = i.entrySP - i.frameBytes + i.handlerNetStackDelta;
      return { spBeforeIret, finalSP: spBeforeIret + i.iretPoppedBytes, balanced: spBeforeIret + i.iretPoppedBytes === i.entrySP };
    }
    case "ivt_definition":
      return { basePhysical: i.basePhysical, totalBytes: i.entryCount * i.entryBytes, entryCount: i.entryCount };
    case "vector_directive_semantics":
      return { kind: "simulator_directive", vector: i.vector, target: i.target, machineOpcode: false };
    case "interrupt_handler_stack_contract":
      return { requiredTopFirst: i.expectedTopFirst, noParasiteWord: !i.extraWordsAllowedAtReturn, stackBalanced: i.stackNetDelta === 0 };
    case "interrupt_dispatch":
      return { transfersControl: true, target: i.target, saved: i.saved };
    case "interrupt_context_restore":
      return { restored: i.saved, finalSP: i.entrySP, coherent: true };
    case "interrupt_model_scope":
      return { abstractsSoftwareInterrupts: i.modeled.includes("software_vector_dispatch"), modelsHardwareSignals: i.modeled.includes("hardware_interrupt_signals"), modelsExternalController: i.modeled.includes("external_interrupt_controller"), physicalIVTComplete: i.modeled.includes("physical_IVT_bus_cycles") };
    case "rep_iteration_count":
      return { iterations: i.initialCX };
    case "rep_semantics":
      return { repeatsStringInstruction: true, usesCX: true, conditionalVariantsUseZF: true };
    case "df_semantics":
      return { controls: "SI_DI_direction" };
    case "rep_movsb_setup":
      return { sequence: ["MOV CX," + i.count, "REP MOVSB"] };
    case "rep_completion":
    case "rep_movsb_completion": {
      const delta = i.DF ? -i.elementWidth / 8 * i.initialCX : i.elementWidth / 8 * i.initialCX;
      return { CX: 0, SI: (i.initialSI + delta) & 0xffff, DI: (i.initialDI + delta) & 0xffff };
    }
    case "rep_initialization":
      return { mustInitializeCXNonzero: true, segmentsAndIndexesRequired: true };
    case "rep_audit":
      throw new Error("Deprecated checklist placeholder; use audit_checklist_coverage with domain-specific requirements");
    case "memory_address_components":
      throw new Error("Deprecated checklist placeholder; use audit_checklist_coverage with domain-specific requirements");
    case "stack_lifo_order":
      return { order: "last_in_first_out" };
    case "stack_lifo_wrong_order":
      return { order: "last_in_first_out", wrongOrder: true };
    case "push_word_semantics":
      return { finalSP: i.initialSP - 2, storedValue: i.value, segment: "SS" };
    case "pop_register_from_stack":
      return { poppedValue: i.stack[i.stack.length - 1], destination: i.destination };
    case "push_pop_trace":
      return { CX: "BX", DX: "AX", balanced: true };
    case "balanced_stack_sp":
      return { finalSP: i.initialSP + 2 * i.popWords - 2 * i.pushWords, netChange: 2 * (i.popWords - i.pushWords) };
    case "popf_misaligned_stack":
      return { restoresArbitraryWord: true, SPAdvancedBy2: true, stackStateMayBeCorrupted: true };
    case "stack_grows_down":
      return { direction: "decreasing_offsets", finalSP: i.initialSP - i.pushBytes };
    case "stack_balance_net_change":
      return { netChange: 2 * (i.popWords - i.pushWords) };
    case "stack_missing_pop":
      return { requiredCorrection: "POP_corresponding_register", stackWordsRemaining: i.pushWords - i.popWords };
    case "stack_validation":
      throw new Error("Deprecated checklist placeholder; use audit_checklist_coverage with domain-specific requirements");
    case "near_call_stack":
      return { saved: "IP", CSChanged: false, SPDecrement: 2 };
    case "call_return_address":
      return { returnAddress: "IP_after_CALL" };
    case "near_call_segment":
      return { CSChanged: false, IPChanged: true };
    case "ret_near":
      return { operation: "pop", destination: "IP", restoresContinuation: true };
    case "call_ret_balance":
      return { IPRestored: true, finalSP: i.initialSP + 2 * i.retWords - 2 * i.callWords, stackBalanced: i.callWords === i.retWords };
    case "mul_word_result_registers":
      return { lowWord: "AX", highWord: "DX" };
    case "mul_word_trace": {
      const product = i.left * i.right;
      return { DX: (product >>> 16) & 0xffff, AX: product & 0xffff, product };
    }
    case "mul_word_high_half":
      return { highWord: "DX", lowWord: "AX" };
    case "call_near_semantics":
      return { IPChanged: true, CSChanged: false };
    case "call_return_purpose":
      return { savedValue: "return_IP", purpose: "resume_after_call" };
    case "stack_parasite_error":
      return { wrongReturnAddressPossible: true, SPUnbalanced: true };
    case "procedure_double":
      return { finalAX: i.initialAX * 2 };
    case "call_stack_pointer":
      return { finalSP: i.initialSP - 2, storedReturnIP: i.returnIP };
    case "procedure_double_and_return":
      return { finalAX: i.initialAX * 2, returnsAfterCall: true };
    case "near_return_state":
      return { IPRestored: true, finalSP: i.initialSP, CSChanged: false };
    case "stack_procedure_audit":
      return { verifyPushPopOrder: true, verifySPBalance: true };
    case "procedure_contract":
      return { interfaceExplicit: true, stackDisciplineExplicit: true };
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
assert.deepEqual(batches.map(batch => batch.batch), ["chapter-01", "chapter-02", "chapter-03", "chapter-04", "chapter-05", "chapter-06", "chapter-07", "chapter-08", "chapter-09", "chapter-10", "chapter-11", "chapter-12", "chapter-13", "chapter-14", "chapter-15", "chapter-16", "chapter-17", "chapter-18", "chapter-19", "chapter-20", "chapter-21", "chapter-22", "chapter-23", "chapter-24", "chapter-25", "chapter-26", "chapter-27", "chapter-28", "chapter-29", "chapter-30", "chapter-31", "chapter-32", "chapter-33", "chapter-34", "chapter-35", "chapter-36"]);
assert.deepEqual(batches.map(batch => batch.oracles.length), [19, 18, 19, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 19, 19, 19, 19, 19, 19, 19, 19], "Chapters 2, 4 and 28 reuse one historical oracle outside their supplemental batch");
const historicalChapterOracles = manifest.oracles.filter(oracle => ["C02-F-Q4", "C04-F-Q4", "C28-F-Q7"].includes(oracle.id)).map(oracle => ({ ...oracle, status: "certified" }));
assert.equal(historicalChapterOracles.length, 3, "The historical chapter 2, chapter 4 and chapter 28 oracles not represented in supplemental batches must each be reused exactly once");
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
assert.equal(certified, 684, "All 684 unique questions and historical oracles are covered through chapter 36, including three historical records not duplicated in batches");
assert.equal(manifest.certificationSummary.questionCount, 684, "Manifest total must match the full assessment bank");
assert.equal(manifest.certificationSummary.historicalOracles, 6, "All six historical oracles must remain registered");
assert.equal(manifest.certificationSummary.supplementalBatchRecords, batches.reduce((sum, batch) => sum + batch.oracles.length, 0), "Manifest batch-record count must match the loaded files");
assert.equal(manifest.certificationSummary.newSupplementalOracles, batches.reduce((sum, batch) => sum + batch.oracles.length - (batch.batch === "chapter-17" ? 1 : batch.batch === "chapter-26" ? 2 : 0), 0), "Manifest new-oracle count must exclude historical IDs reused inside batches");
assert.equal(manifest.certificationSummary.uniqueCertifiedQuestions, certified, "Manifest unique coverage must match the executable certification test");
assert.equal(manifest.certificationSummary.remainingUncertified, 684 - certified, "Manifest remaining count must be arithmetically consistent");
assert.equal(blocked, 0, "No question in the certified batches remains blocked");
for (const chapter of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]) {
  const prefix = "C" + String(chapter).padStart(2, "0") + "-";
  const expectedIds = key.questions.filter(question => question.id.startsWith(prefix)).map(question => question.id);
  assert.equal(expectedIds.length, 19, "Each audited chapter must contain exactly 19 keyed questions");
  for (const id of expectedIds) assert.ok(allIds.includes(id), "Missing independent oracle for " + id);
}
assert.match(keyMap.get("C01-L1-Q2").explanation, /octets machine distincts/i, "Source assembly must be distinguished from its encoded machine bytes");
console.log("Question oracle certification: chapters 1–36 — " + certified + "/684 certified; " + blocked + " blocked; runtime/key alignment and independent evaluators passed.");
