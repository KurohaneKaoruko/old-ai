const assert = require('node:assert/strict');

const { LogicTheorist } = require('../symbolic_reasoning/1956_logic_theorist/logic_theorist');
const { SemanticNetwork } = require('../knowledge_representation/1968_semantic_network/semantic_network');
const { FrameSystem } = require('../knowledge_representation/1974_frames/frames');
const { Eliza } = require('../conversational_agents/1966_eliza/eliza');
const { ScriptNLU } = require('../conversational_agents/1977_script_nlu/script_nlu');
const { ExpertSystem } = require('../expert_systems/1970s_mycin_style/mycin_like');
const { Blackboard, BlackboardSystem } = require('../expert_systems/1980s_blackboard_system/blackboard');
const { SubsumptionController } = require('../robotics_systems/1986_subsumption_architecture/subsumption');
const { HmmTagger } = require('../statistical_nlp/1990s_hmm_tagger/hmm_tagger');
const { RuleBasedTranslator } = require('../language_systems/1990s_rule_based_mt/rbmt');
const { HaarLikeCascade } = require('../computer_vision/2001_haar_like_cascade/cascade');

const tests = [];
const add = (name, fn) => tests.push({ name, fn });

add('logic theorist proves chained goal', () => {
  const theorist = new LogicTheorist(['human(socrates)'], [
    { premises: ['human(socrates)'], conclusion: 'mortal(socrates)' },
    { premises: ['mortal(socrates)'], conclusion: 'can_die(socrates)' }
  ]);
  const proof = theorist.prove('can_die(socrates)');
  assert.ok(proof);
});

add('semantic network exception works', () => {
  const net = new SemanticNetwork();
  net.add('bird', 'can', 'fly');
  net.add('penguin', 'is_a', 'bird');
  net.add('penguin', 'cannot', 'fly');
  assert.equal(net.can('penguin', 'fly')[0], false);
});

add('frame inheritance and override', () => {
  const fs = new FrameSystem();
  fs.addFrame('animal', null, { can_move: true });
  fs.addFrame('bird', 'animal', { can_fly: true });
  fs.addFrame('penguin', 'bird', { can_fly: false });
  assert.equal(fs.getSlot('penguin', 'can_move')[1], true);
  assert.equal(fs.getSlot('penguin', 'can_fly')[1], false);
});

add('eliza responds to need pattern', () => {
  const bot = new Eliza();
  assert.match(bot.respond('I need help'), /need help|got help/i);
});

add('script nlu infers missing pay_bill', () => {
  const nlu = new ScriptNLU({
    name: 'restaurant_visit',
    orderedSteps: [
      'enter_restaurant',
      'sit_down',
      'order_food',
      'eat_food',
      'pay_bill',
      'leave_restaurant'
    ],
    triggerKeywords: {
      enter_restaurant: ['arrive'],
      sit_down: ['table'],
      order_food: ['order'],
      eat_food: ['ate'],
      pay_bill: ['bill'],
      leave_restaurant: ['left']
    }
  });
  const [, missing] = nlu.interpret(['I arrive', 'I sat at a table', 'I order', 'I ate', 'I left']);
  assert.ok(missing.includes('pay_bill'));
});

add('mycin ranks flu above cold', () => {
  const engine = new ExpertSystem([
    { antecedents: ['fever', 'cough'], consequent: 'diagnosis_flu', certainty: 0.7 },
    { antecedents: ['cough'], consequent: 'diagnosis_common_cold', certainty: 0.5 }
  ]);
  const [beliefs] = engine.infer({ fever: 0.8, cough: 0.7 });
  assert.ok(beliefs.diagnosis_flu > beliefs.diagnosis_common_cold);
});

add('blackboard aggregates scores', () => {
  const board = new Blackboard(['loop']);
  const sys = new BlackboardSystem([
    [
      'loop',
      (b) => {
        if (!b.features.has('loop') || !b.markOnce('loop')) return false;
        b.addHypothesis('P', 0.4, 'ks');
        return true;
      }
    ]
  ]);
  sys.run(board);
  assert.equal(board.hypotheses.P, 0.4);
});

add('subsumption prioritizes obstacle behavior', () => {
  const controller = new SubsumptionController([
    { name: 'wander', priority: 1, behavior: () => ['forward', 'wander'] },
    { name: 'avoid', priority: 3, behavior: (s) => (s.obstacle_front ? ['turn_right', 'avoid'] : null) }
  ]);
  assert.equal(controller.step({ obstacle_front: true })[0], 'turn_right');
});

add('hmm returns tag sequence', () => {
  const tagger = new HmmTagger({
    states: ['N', 'V', 'DET'],
    startProb: { N: 0.4, V: 0.1, DET: 0.5 },
    transProb: {
      N: { N: 0.2, V: 0.6, DET: 0.2 },
      V: { N: 0.5, V: 0.1, DET: 0.4 },
      DET: { N: 0.8, V: 0.05, DET: 0.15 }
    },
    emitProb: {
      N: { dog: 0.4, runs: 0.1 },
      V: { runs: 0.4 },
      DET: { the: 0.6 }
    }
  });
  const tags = tagger.tag(['the', 'dog', 'runs']);
  assert.equal(tags.length, 3);
});

add('rbmt rewrite works', () => {
  const mt = new RuleBasedTranslator();
  assert.equal(mt.translate('I am student'), 'wo_shixue_sheng');
});

add('haar-like cascade rejects weak window', () => {
  const det = new HaarLikeCascade([
    {
      stageThreshold: 1.0,
      weakClassifiers: [
        { feature: 'eye_darkness', threshold: 0.6, polarity: '>', weight: 0.7 },
        { feature: 'nose_bridge', threshold: 0.4, polarity: '>', weight: 0.5 }
      ]
    }
  ]);
  assert.equal(det.predict({ eye_darkness: 0.1, nose_bridge: 0.1 }).positive, false);
});

// ---- regression tests for fix batch A (append-only) ----

add('hmm tagger empty input and degenerate model', () => {
  const tagger = new HmmTagger({
    states: ['N', 'V', 'DET'],
    startProb: { N: 0.4, V: 0.1, DET: 0.5 },
    transProb: {
      N: { N: 0.2, V: 0.6, DET: 0.2 },
      V: { N: 0.5, V: 0.1, DET: 0.4 },
      DET: { N: 0.8, V: 0.05, DET: 0.15 }
    },
    emitProb: {
      N: { dog: 0.4, runs: 0.1 },
      V: { runs: 0.4 },
      DET: { the: 0.6 }
    }
  });
  assert.deepEqual(tagger.tag([]), []);
  const degenerate = new HmmTagger({
    states: ['N', 'V'],
    startProb: { N: 0.5, V: 0.5 },
    transProb: { N: { N: 0, V: 0 }, V: { N: 0, V: 0 } },
    emitProb: { N: { dog: 1 }, V: { runs: 1 } }
  });
  assert.throws(() => degenerate.tag(['dog', 'runs']), /backtrace failed/);
  assert.deepEqual(tagger.tag(['the', 'dog', 'runs']), ['DET', 'N', 'V']);
});

add('rbmt normalizes extra whitespace', () => {
  const mt = new RuleBasedTranslator();
  const out = mt.translate('I  am fine');
  assert.ok(out.startsWith('wo_shi'));
  assert.ok(!out.includes('[i][am][fine]'));
  assert.equal(mt.translate('I am student'), 'wo_shixue_sheng');
});

add('haar cascade rejects invalid polarity', () => {
  assert.throws(
    () =>
      new HaarLikeCascade([
        { stageThreshold: 1.0, weakClassifiers: [{ feature: 'f', threshold: 0.5, polarity: '=', weight: 1.0 }] }
      ]),
    /polarity/
  );
  const det = new HaarLikeCascade([
    {
      stageThreshold: 1.0,
      weakClassifiers: [
        { feature: 'a', threshold: 0.6, polarity: '>', weight: 0.7 },
        { feature: 'b', threshold: 0.4, polarity: '<', weight: 0.5 }
      ]
    }
  ]);
  assert.equal(det.predict({ a: 0.9, b: 0.1 }).positive, true);
  assert.equal(det.predict({ a: 0.1, b: 0.9 }).positive, false);
});

add('subsumption validates priority and sensors', () => {
  const controller = new SubsumptionController([
    { name: 'wander', priority: 1, behavior: () => ['forward', 'wander'] },
    { name: 'avoid', priority: 3, behavior: (s) => (s.obstacle_front ? ['turn_right', 'avoid'] : null) }
  ]);
  assert.throws(() => new SubsumptionController([{ name: 'x', behavior: () => null }]), /priority/);
  assert.throws(() => controller.step(null), /sensors object/);
  assert.equal(controller.step({ obstacle_front: true })[0], 'turn_right');
});

let passed = 0;
for (const t of tests) {
  try {
    t.fn();
    passed += 1;
    console.log(`PASS - ${t.name}`);
  } catch (err) {
    console.log(`FAIL - ${t.name}`);
    console.log(err.message);
    process.exitCode = 1;
  }
}
console.log(`\nSummary: ${passed}/${tests.length} tests passed.`);
