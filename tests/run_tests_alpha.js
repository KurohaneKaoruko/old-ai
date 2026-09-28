// tests/run_tests_alpha.js
// 独立回归测试（修复批次 B）：不依赖 tests/run_tests.js，自带断言与 PASS/FAIL 汇总。
// 运行：node tests/run_tests_alpha.js

const assert = require("assert");
const path = require("path");

const { Blackboard, BlackboardSystem } = require(path.join(__dirname, "..", "expert_systems", "1980s_blackboard_system", "blackboard"));
const { FrameSystem } = require(path.join(__dirname, "..", "knowledge_representation", "1974_frames", "frames"));
const { SemanticNetwork } = require(path.join(__dirname, "..", "knowledge_representation", "1968_semantic_network", "semantic_network"));
const { LogicTheorist } = require(path.join(__dirname, "..", "symbolic_reasoning", "1956_logic_theorist", "logic_theorist"));
const { Eliza } = require(path.join(__dirname, "..", "conversational_agents", "1966_eliza", "eliza"));
const { ScriptNLU } = require(path.join(__dirname, "..", "conversational_agents", "1977_script_nlu", "script_nlu"));
const { ExpertSystem } = require(path.join(__dirname, "..", "expert_systems", "1970s_mycin_style", "mycin_like"));

function restaurantScript() {
  return {
    name: "restaurant_visit",
    orderedSteps: [
      "enter_restaurant",
      "sit_down",
      "order_food",
      "eat_food",
      "pay_bill",
      "leave_restaurant"
    ],
    triggerKeywords: {
      enter_restaurant: ["enter", "arrive", "walked in"],
      sit_down: ["sit", "table", "seated"],
      order_food: ["order", "menu"],
      eat_food: ["eat", "ate", "meal"],
      pay_bill: ["pay", "bill", "cashier"],
      leave_restaurant: ["leave", "left", "exit"]
    }
  };
}

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (err) {
    failed += 1;
    failures.push({ name, message: err.message });
    console.log(`FAIL: ${name}`);
    console.log(`      ${err.message}`);
  }
}

// ---------------------------------------------------------------- blackboard
test("blackboard: 'constructor'/'__proto__'/'toString' labels are safe (regression)", () => {
  const board = new Blackboard();
  board.addHypothesis("constructor", 0.5, "ks");
  assert.strictEqual(board.hypotheses.constructor, 0.5);
  board.addHypothesis("__proto__", 0.3, "ks");
  assert.strictEqual(board.hypotheses["__proto__"], 0.3);
  board.addHypothesis("toString", 0.4, "ks");
  assert.strictEqual(board.hypotheses.toString, 0.4);
});

test("blackboard: multi-KS aggregation main path still works", () => {
  const board = new Blackboard(["loop", "vertical_line", "diagonal_leg"]);
  const system = new BlackboardSystem([
    ["loop", (b) => {
      if (!b.markOnce("ks_loop")) return false;
      b.addHypothesis("P", 0.4, "ks_loop");
      b.addHypothesis("R", 0.3, "ks_loop");
      return true;
    }],
    ["vertical", (b) => {
      if (!b.markOnce("ks_vertical")) return false;
      b.addHypothesis("P", 0.3, "ks_vertical");
      b.addHypothesis("I", 0.2, "ks_vertical");
      return true;
    }],
    ["diagonal", (b) => {
      if (!b.markOnce("ks_diagonal")) return false;
      b.addHypothesis("R", 0.4, "ks_diagonal");
      return true;
    }]
  ]);
  const result = system.run(board);
  assert.ok(Math.abs(result.hypotheses.P - 0.7) < 1e-9);
  assert.ok(Math.abs(result.hypotheses.R - 0.7) < 1e-9);
  assert.ok(Math.abs(result.hypotheses.I - 0.2) < 1e-9);
  assert.strictEqual(result.trace.length, 5);
});

// -------------------------------------------------------------------- frames
test("frames: parent-chain cycle throws instead of hanging (regression)", () => {
  const fs = new FrameSystem();
  fs.addFrame("a", "b");
  fs.addFrame("b", "a");
  assert.throws(() => fs.getSlot("a", "x"), /inheritance cycle/);
});

test("frames: addFrame deep-clones slots (regression)", () => {
  const fs = new FrameSystem();
  const slots = { pos: { x: 1 } };
  fs.addFrame("f", null, slots);
  slots.pos.x = 999;
  const [ok, value] = fs.getSlot("f", "pos");
  assert.ok(ok);
  assert.strictEqual(value.x, 1);
});

test("frames: slot inheritance main path (penguin chain)", () => {
  const fs = new FrameSystem();
  fs.addFrame("animal", null, { can_move: true, body_temp: "variable" });
  fs.addFrame("bird", "animal", { can_fly: true, has_feathers: true });
  fs.addFrame("penguin", "bird", { can_fly: false, habitat: "antarctic" });
  assert.deepStrictEqual(fs.getSlot("penguin", "can_fly"), [true, false, "penguin.can_fly"]);
  assert.strictEqual(fs.getSlot("penguin", "has_feathers")[1], true);
  assert.strictEqual(fs.getSlot("penguin", "can_move")[1], true);
  assert.strictEqual(fs.getSlot("penguin", "body_temp")[1], "variable");
  assert.strictEqual(fs.getSlot("penguin", "habitat")[1], "antarctic");
});

// ------------------------------------------------------------- logic_theorist
test("logic_theorist: path-related failure is not cached (regression)", () => {
  const lt = new LogicTheorist(["d"], [
    { premises: ["b"], conclusion: "a" },
    { premises: ["c"], conclusion: "a" },
    { premises: ["a"], conclusion: "b" },
    { premises: ["d"], conclusion: "c" }
  ]);
  const p1 = lt.prove("a");
  assert.ok(p1, "prove(a) should succeed");
  const p2 = lt.prove("b");
  assert.ok(p2, "prove(b) must still succeed on the same instance after prove(a)");
});

test("logic_theorist: chained goal main path (socrates)", () => {
  const lt = new LogicTheorist(["human(socrates)", "human(plato)"], [
    { premises: ["human(socrates)"], conclusion: "mortal(socrates)", label: "R1" },
    { premises: ["mortal(socrates)"], conclusion: "can_die(socrates)", label: "R2" },
    { premises: ["human(plato)"], conclusion: "mortal(plato)", label: "R3" }
  ]);
  const proof = lt.prove("can_die(socrates)");
  assert.ok(proof, "chained goal should be provable");
  assert.match(proof.render(), /can_die\(socrates\) \(R2\)/);
});

test("logic_theorist: path-independent failure (no rules) still reports not provable", () => {
  const lt = new LogicTheorist(["x"], []);
  assert.ok(!lt.prove("nope"));
  assert.ok(!lt.prove("nope"));
});

// ----------------------------------------------------------- semantic_network
test("semantic_network: '__proto__'/'constructor'/'toString' relations are safe (regression)", () => {
  const net = new SemanticNetwork();
  net.add("n", "__proto__", "x");
  net.add("m", "constructor", "x");
  net.add("k", "toString", "x");
  assert.ok(net.edges.get("n")["__proto__"] instanceof Set);
  assert.ok(net.edges.get("n")["__proto__"].has("x"));
  assert.ok(net.edges.get("m")["constructor"] instanceof Set);
  assert.ok(net.edges.get("m")["constructor"].has("x"));
  assert.ok(net.edges.get("k")["toString"] instanceof Set);
  assert.ok(net.edges.get("k")["toString"].has("x"));
});

test("semantic_network: inheritance and cannot-exception main path", () => {
  const net = new SemanticNetwork();
  net.add("bird", "can", "fly");
  net.add("bird", "can", "lay_eggs");
  net.add("penguin", "is_a", "bird");
  net.add("penguin", "cannot", "fly");
  net.add("robin", "is_a", "bird");
  net.add("robin", "can", "sing");
  const [robinFly, robinTrace] = net.can("robin", "fly");
  assert.strictEqual(robinFly, true);
  assert.match(robinTrace[robinTrace.length - 1], /bird can fly \(direct fact\)/);
  const [penguinFly, penguinTrace] = net.can("penguin", "fly");
  assert.strictEqual(penguinFly, false);
  assert.match(penguinTrace[0], /penguin cannot fly/);
  assert.strictEqual(net.inherits("penguin", "bird"), true);
});

// ---------------------------------------------------------------------- eliza
test("eliza: '$&' in reflected text cannot leak template placeholder (regression)", () => {
  const bot = new Eliza();
  const reply = bot.respond("I need $& x");
  assert.ok(!reply.includes("{0}"), `placeholder leaked: ${reply}`);
  assert.ok(reply.includes("$& x"), `reflected content missing: ${reply}`);
});

test("eliza: need pattern with template rotation main path", () => {
  const bot = new Eliza();
  assert.strictEqual(bot.respond("I need help"), "Why do you need help?");
  assert.strictEqual(bot.respond("I need rest"), "What would it mean if you got rest?");
});

// ----------------------------------------------------------------- script_nlu
test("script_nlu: keyword matching uses word boundaries (regression)", () => {
  const nlu = new ScriptNLU(restaurantScript());
  const [obs1] = nlu.interpret(["the situation at the border"]);
  assert.deepStrictEqual(obs1, ["unknown"], `'situation' must not match keyword 'sit': ${JSON.stringify(obs1)}`);
  const [obs2] = nlu.interpret(["we crossed the border at noon"]);
  assert.deepStrictEqual(obs2, ["unknown"], `'border' must not match keyword 'order': ${JSON.stringify(obs2)}`);
});

test("script_nlu: story interpretation infers missing pay_bill (main path)", () => {
  const nlu = new ScriptNLU(restaurantScript());
  const [observed, missing] = nlu.interpret([
    "I arrived at a small cafe.",
    "I sat at a table near the window.",
    "I ordered noodles and tea.",
    "I ate quietly while reading.",
    "Then I left quickly for work."
  ]);
  assert.ok(observed.includes("sit_down"));
  assert.ok(observed.includes("eat_food"));
  assert.ok(observed.includes("leave_restaurant"));
  assert.ok(missing.includes("pay_bill"), `pay_bill should be inferred missing: ${JSON.stringify(missing)}`);
});

// ---------------------------------------------------------------------- mycin
test("mycin: 'toString' antecedent no longer hits prototype chain (regression)", () => {
  const es = new ExpertSystem([{ antecedents: ["toString"], consequent: "diag_x", certainty: 0.9 }]);
  const [beliefs] = es.infer({ fever: 0.8 });
  assert.strictEqual(beliefs.diag_x, undefined);
});

test("mycin: non-finite evidence values are rejected (regression)", () => {
  const es = new ExpertSystem([{ antecedents: ["fever"], consequent: "diag_x", certainty: 0.9 }]);
  assert.throws(() => es.infer({ fever: NaN }), /finite number/);
  assert.throws(() => es.infer({ fever: "high" }), /finite number/);
});

test("mycin: flu ranks above common cold main path", () => {
  const rules = [
    { antecedents: ["fever", "cough"], consequent: "diagnosis_flu", certainty: 0.7, label: "R1" },
    { antecedents: ["body_ache", "fever"], consequent: "diagnosis_flu", certainty: 0.6, label: "R2" },
    { antecedents: ["cough"], consequent: "diagnosis_common_cold", certainty: 0.5, label: "R3" },
    { antecedents: ["sneezing"], consequent: "diagnosis_common_cold", certainty: 0.6, label: "R4" }
  ];
  const es = new ExpertSystem(rules);
  const [beliefs] = es.infer({ fever: 0.8, cough: 0.7, body_ache: 0.6, sneezing: 0.3 });
  assert.ok(beliefs.diagnosis_flu > beliefs.diagnosis_common_cold, `flu=${beliefs.diagnosis_flu} cold=${beliefs.diagnosis_common_cold}`);
  assert.ok(beliefs.diagnosis_flu > 0.6);
});

// ------------------------------------------------------------------- summary
console.log("");
console.log(`Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  failures.forEach((f) => console.log(`  FAILED: ${f.name} — ${f.message}`));
  process.exitCode = 1;
}
