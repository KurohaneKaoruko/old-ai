'use strict';
/**
 * web/adapters.js — 历史AI算法的对话适配器注册表（仅收录已被取代的过时方法）。
 *
 * 每个适配器：
 *   id / name / year / category / conversational — 元信息（/api/algorithms 返回）
 *   intro  — 算法首次打开时的系统欢迎消息（含用法）
 *   create() — 创建该算法的会话状态（有状态算法在此持实例）
 *   handle(state, text) — 用户文本 → 回复字符串。任何抛错由 server 捕获转为友好消息。
 *
 * 设计约束：仅 require 仓库内算法模块 + Node 内置；新增算法只需追加一个注册项。
 */

const { LogicTheorist } = require('../symbolic_reasoning/1956_logic_theorist/logic_theorist');
const { Eliza } = require('../conversational_agents/1966_eliza/eliza');
const { SemanticNetwork } = require('../knowledge_representation/1968_semantic_network/semantic_network');
const { FrameSystem } = require('../knowledge_representation/1974_frames/frames');
const { ScriptNLU } = require('../conversational_agents/1977_script_nlu/script_nlu');
const { ExpertSystem } = require('../expert_systems/1970s_mycin_style/mycin_like');
const { Blackboard, BlackboardSystem } = require('../expert_systems/1980s_blackboard_system/blackboard');
const { SubsumptionController } = require('../robotics_systems/1986_subsumption_architecture/subsumption');
const { HmmTagger } = require('../statistical_nlp/1990s_hmm_tagger/hmm_tagger');
const { RuleBasedTranslator } = require('../language_systems/1990s_rule_based_mt/rbmt');
const { HaarLikeCascade } = require('../computer_vision/2001_haar_like_cascade/cascade');

/* ---------------------------------------------------------------- 解析工具 */

/** 提取 key=value 对（值为数字或 true/false）。"fever=0.8, obstacle_front=true" → {fever:0.8, obstacle_front:true} */
function extractPairs(text) {
  const out = {};
  const re = /([a-zA-Z_]\w*)\s*=\s*(-?\d+(?:\.\d+)?|true|false)/gi;
  let m;
  while ((m = re.exec(String(text))) !== null) {
    const raw = m[2].toLowerCase();
    out[m[1]] = raw === 'true' ? true : raw === 'false' ? false : Number(raw);
  }
  return out;
}

/** 取数值型 key=value 对 */
function numericPairs(text) {
  const out = {};
  for (const [k, v] of Object.entries(extractPairs(text))) {
    if (typeof v === 'number') out[k] = v;
  }
  return out;
}

/** 取布尔型 key=value 对 */
function boolPairs(text) {
  const out = {};
  for (const [k, v] of Object.entries(extractPairs(text))) {
    if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

function fmt(x) {
  return typeof x === 'number' ? (Number.isInteger(x) ? String(x) : x.toFixed(4)) : String(x);
}

/* ------------------------------------------------------- 1. Logic Theorist */

const logicTheorist = {
  id: 'logic_theorist',
  name: 'Logic Theorist 符号定理证明',
  year: 1956,
  category: 'symbolic_reasoning',
  conversational: false,
  intro:
    '1956 Logic Theorist：反向链定理证明（无变量一致化，README 已声明简化）。\n' +
    '预置事实 human(socrates) 与规则链。\n' +
    '· prove mortal(socrates) —— 证明目标（支持证明树输出）\n' +
    '· add fact mortal(plato) —— 添加事实\n' +
    '· add rule mortal(plato)+human(plato)=>can_die(plato) —— 添加规则（前提用 + 连接）',
  create() {
    return {
      lt: new LogicTheorist(['human(socrates)'], [
        { premises: ['human(socrates)'], conclusion: 'mortal(socrates)' },
        { premises: ['mortal(socrates)'], conclusion: 'can_die(socrates)' }
      ])
    };
  },
  handle(state, text) {
    const t = String(text).trim();
    let m = t.match(/^prove\s+(.+)$/i);
    if (m) {
      const goal = m[1].trim();
      const proof = state.lt.prove(goal);
      return proof ? `已证明 ✓\n${proof.render()}` : `以当前事实/规则集无法证明 "${goal}"。`;
    }
    m = t.match(/^add fact\s+(.+)$/i);
    if (m) {
      state.lt.facts.add(m[1].trim());
      return `已加入事实：${m[1].trim()}（当前共 ${state.lt.facts.size} 条）。`;
    }
    m = t.match(/^add rule\s+(.+?)=>(.+)$/i);
    if (m) {
      const premises = m[1].split('+').map((s) => s.trim()).filter(Boolean);
      const conclusion = m[2].trim();
      // 直接扩充内部规则索引（仓库未提供 addRule API；此处为只增不改）
      if (!state.lt.rulesByConclusion.has(conclusion)) {
        state.lt.rulesByConclusion.set(conclusion, []);
      }
      state.lt.rulesByConclusion.get(conclusion).push({ premises, conclusion });
      return `已加入规则：${premises.join(' ∧ ')} ⇒ ${conclusion}`;
    }
    if (/\w+\(.+\)/.test(t)) {
      // 自由输入形如 pred(args) 时按 prove 处理
      const proof = state.lt.prove(t);
      return proof ? `已证明 ✓\n${proof.render()}` : `以当前事实/规则集无法证明 "${t}"。`;
    }
    return '用法：prove <目标> ｜ add fact <事实> ｜ add rule <前提+前提>=><结论>。例如：prove can_die(socrates)';
  }
};

/* ---------------------------------------------------------------- 2. ELIZA */

const eliza = {
  id: 'eliza',
  name: 'ELIZA 模式匹配聊天机器人',
  year: 1966,
  category: 'conversational_agents',
  conversational: true,
  intro: '1966 ELIZA：Weizenbaum 的模式匹配聊天机器人，会做代词反射。直接聊天即可，例如 "I need help"、"I feel sad"、"my mother is ill"。',
  create() {
    return { bot: new Eliza() };
  },
  handle(state, text) {
    return state.bot.respond(text);
  }
};

/* ----------------------------------------------------- 3. Semantic Network */

const semanticNetwork = {
  id: 'semantic_network',
  name: '语义网络（继承 + 例外）',
  year: 1968,
  category: 'knowledge_representation',
  conversational: false,
  intro:
    '1968 语义网络：is_a 继承推理，cannot 显式例外优先于 can。\n' +
    '预置：bird can fly；penguin is_a bird；penguin cannot fly。\n' +
    '· can penguin fly —— 查询能力（返回推理链）\n' +
    '· add tweety is_a bird —— 添加三元组（关系：is_a / can / cannot）\n' +
    '· inherits penguin bird —— 查询祖先链',
  create() {
    const net = new SemanticNetwork();
    net.add('bird', 'can', 'fly');
    net.add('penguin', 'is_a', 'bird');
    net.add('penguin', 'cannot', 'fly');
    return { net };
  },
  handle(state, text) {
    const t = String(text).trim();
    let m = t.match(/^can\s+(\S+)\s+(\S+)$/i);
    if (m) {
      const [ok, trace] = state.net.can(m[1], m[2]);
      return `can(${m[1]}, ${m[2]}) = ${ok}\n推理链：\n· ${trace.join('\n· ')}`;
    }
    m = t.match(/^inherits\s+(\S+)\s+(\S+)$/i);
    if (m) {
      return `${m[1]} ${state.net.inherits(m[1], m[2]) ? '继承自' : '不继承自'} ${m[2]}`;
    }
    m = t.match(/^add\s+(\S+)\s+(is_a|can|cannot)\s+(\S+)$/i);
    if (m) {
      state.net.add(m[1], m[2].toLowerCase(), m[3]);
      return `已加入：(${m[1]}) -[${m[2]}]-> (${m[3]})`;
    }
    return '用法：can <概念> <动作> ｜ add <概念> <is_a|can|cannot> <目标> ｜ inherits <概念> <祖先>。例如：can penguin fly';
  }
};

/* ---------------------------------------------------------------- 4. Frames */

const frames = {
  id: 'frames',
  name: '框架知识表示',
  year: 1974,
  category: 'knowledge_representation',
  conversational: false,
  intro:
    '1974 FrameSystem：槽继承链，子框架覆盖父框架默认值。\n' +
    '预置：animal(can_move=true) ← bird(can_fly=true) ← penguin(can_fly=false)。\n' +
    '· get penguin can_fly —— 沿继承链取槽（返回值与定义处）\n' +
    '· add sparrow bird can_fly=true,color=brown —— 添加子框架（parent 为 "-" 表示无父）',
  create() {
    const fs = new FrameSystem();
    fs.addFrame('animal', null, { can_move: true });
    fs.addFrame('bird', 'animal', { can_fly: true });
    fs.addFrame('penguin', 'bird', { can_fly: false });
    return { fs };
  },
  _parseVal(v) {
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v;
  },
  handle(state, text) {
    const t = String(text).trim();
    let m = t.match(/^get\s+(\S+)\s+(\S+)$/i);
    if (m) {
      const [ok, value, source] = state.fs.getSlot(m[1], m[2]);
      return ok ? `${m[1]}.${m[2]} = ${fmt(value)}（定义于 ${source}）` : `未找到：${source}`;
    }
    m = t.match(/^add\s+(\S+)\s+(\S+)\s+(.+)$/i);
    if (m) {
      const slots = {};
      for (const pair of m[3].split(/[,，]+/)) {
        const [k, v] = pair.split('=');
        if (!k || v === undefined) return `槽定义格式错误："${pair}"，应为 slot=value。`;
        slots[k.trim()] = this._parseVal(v.trim());
      }
      state.fs.addFrame(m[1], m[2] === '-' ? null : m[2], slots);
      return `已添加框架 ${m[1]}（parent=${m[2]}，槽：${Object.entries(slots).map(([k, v]) => `${k}=${fmt(v)}`).join(', ')}）。`;
    }
    const fallback = t.split(/\s+/);
    if (fallback.length === 2) return this.handle(state, `get ${fallback[0]} ${fallback[1]}`);
    return '用法：get <框架> <槽> ｜ add <框架> <父框架|-> <槽=值, …>。例如：get penguin can_fly';
  }
};

/* -------------------------------------------------------------- 5. ScriptNLU */

const RESTAURANT_SCRIPT = {
  name: 'restaurant_visit',
  orderedSteps: ['enter_restaurant', 'sit_down', 'order_food', 'eat_food', 'pay_bill', 'leave_restaurant'],
  triggerKeywords: {
    enter_restaurant: ['arrive', 'enter', 'walked in'],
    sit_down: ['table', 'sit'],
    order_food: ['order', 'menu', 'steak', 'dish'],
    eat_food: ['ate', 'eat', 'delicious'],
    pay_bill: ['bill', 'pay', 'check'],
    leave_restaurant: ['left', 'leave', 'heading home']
  }
};

const scriptNlu = {
  id: 'script_nlu',
  name: '脚本 NLU（餐厅脚本）',
  year: 1977,
  category: 'conversational_agents',
  conversational: true,
  intro:
    '1977 ScriptNLU：Schank 的脚本理解——用预置"餐厅脚本"推断事件序列中缺失的步骤。\n' +
    '直接用一句话报告一个事件（如 "I sat at a table"），我会持续汇报脚本推断结果；输入 restart 清空已述事件。',
  create() {
    return { nlu: new ScriptNLU(RESTAURANT_SCRIPT), utterances: [] };
  },
  handle(state, text) {
    const t = String(text).trim();
    if (/^restart$/i.test(t)) {
      state.utterances = [];
      return '已清空事件序列，重新开始。';
    }
    state.utterances.push(t);
    const [, missing] = state.nlu.interpret(state.utterances);
    const recognized = RESTAURANT_SCRIPT.orderedSteps.length - missing.length;
    return `已识别 ${recognized}/${RESTAURANT_SCRIPT.orderedSteps.length} 个脚本步。` +
      (missing.length ? `缺失步骤：${missing.join(', ')}` : '脚本步已全部覆盖 ✓');
  }
};

/* ---------------------------------------------------------------- 6. MYCIN */

const mycin = {
  id: 'mycin',
  name: 'MYCIN 型专家系统（确定性因子）',
  year: 1975,
  category: 'expert_systems',
  conversational: false,
  intro:
    '1970s MYCIN 型专家系统：CF 不确定推理（同结论规则按经典公式组合）。\n' +
    '预置规则：fever+cough→flu(0.7)；cough→common_cold(0.5)；sneeze→allergy(0.6)。\n' +
    '输入证据如：fever=0.8, cough=0.7 —— 输出各诊断置信度与推理轨迹。',
  create() {
    return {
      engine: new ExpertSystem([
        { antecedents: ['fever', 'cough'], consequent: 'diagnosis_flu', certainty: 0.7 },
        { antecedents: ['cough'], consequent: 'diagnosis_common_cold', certainty: 0.5 },
        { antecedents: ['sneeze'], consequent: 'diagnosis_allergy', certainty: 0.6 }
      ])
    };
  },
  handle(state, text) {
    const evidence = numericPairs(text);
    const keys = Object.keys(evidence);
    if (keys.length === 0) {
      return '用法：输入 "症状=置信度" 对，例如：fever=0.8, cough=0.7（数值范围不限，内部截断到 [-1,1]）。';
    }
    const [beliefs, trace] = state.engine.infer(evidence);
    const ranked = Object.entries(beliefs)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .map(([k, v]) => `· ${k}: ${v.toFixed(3)}`);
    return `证据：${keys.map((k) => `${k}=${fmt(evidence[k])}`).join(', ')}\n推断结论（按 |CF| 排序）：\n${ranked.join('\n') || '·（无结论被激活）'}` +
      (trace.length ? `\n推理轨迹（最近 5 条）：\n· ${trace.slice(-5).join('\n· ')}` : '');
  }
};

/* ------------------------------------------------------------ 7. Blackboard */

function buildBlackboard() {
  const board = new Blackboard([]);
  const ksExtract = (b) => {
    let fired = false;
    const contributions = { loop: ['PATTERN', 0.4], branch: ['RECURSION', 0.5], call: ['INVOCATION', 0.3] };
    for (const f of b.features) {
      const hit = contributions[f];
      if (hit && b.markOnce(`extract:${f}`)) {
        b.addHypothesis(hit[0], hit[1], 'KS-extract');
        fired = true;
      }
    }
    return fired;
  };
  const ksRefine = (b) => {
    if ((b.hypotheses.PATTERN || 0) > 0.35 && b.markOnce('refine:pattern')) {
      b.addHypothesis('PATTERN', 0.2, 'KS-refine');
      return true;
    }
    return false;
  };
  const sys = new BlackboardSystem([['extract', ksExtract], ['refine', ksRefine]]);
  return { board, sys };
}

const blackboard = {
  id: 'blackboard',
  name: '黑板架构系统',
  year: 1980,
  category: 'expert_systems',
  conversational: false,
  intro:
    '1980s 黑板架构：多知识源围绕共享黑板增量合成假设。\n' +
    '预置知识源：KS-extract（loop→PATTERN+0.4、branch→RECURSION+0.5、call→INVOCATION+0.3）、KS-refine（PATTERN>0.35 时再 +0.2）。\n' +
    '· add loop branch —— 添加特征并运行求解\n' +
    '· run —— 重新运行知识源调度',
  create() {
    return buildBlackboard();
  },
  handle(state, text) {
    const t = String(text).trim();
    const m = t.match(/^add\s+(.+)$/i);
    if (m) {
      const feats = m[1].split(/[\s,，]+/).filter(Boolean);
      for (const f of feats) state.board.features.add(f);
    } else if (!/^run$/i.test(t)) {
      return '用法：add <特征…>（可用特征：loop / branch / call）或 run。例如：add loop branch';
    }
    state.sys.run(state.board);
    const hyps = Object.entries(state.board.hypotheses);
    const lines = hyps.length
      ? hyps.map(([k, v]) => `· ${k}: ${v.toFixed(2)}`).join('\n')
      : '·（无假设被激活——试试 add loop branch）';
    const recent = state.board.trace.slice(-5);
    return `黑板假设：\n${lines}` + (recent.length ? `\n最近轨迹：\n· ${recent.join('\n· ')}` : '');
  }
};

/* ---------------------------------------------------------- 8. Subsumption */

const subsumption = {
  id: 'subsumption',
  name: 'Subsumption 包容架构',
  year: 1986,
  category: 'robotics_systems',
  conversational: false,
  intro:
    '1986 Brooks 包容架构：高优先级层抑制低优先级层（avoid > dock > wander）。\n' +
    '· 输入传感器如 obstacle_front=true 或 station_visible=true\n' +
    '· 也可直接说 "有障碍物" / "看到充电站"',
  create() {
    return {
      ctl: new SubsumptionController([
        { name: 'avoid', priority: 3, behavior: (s) => (s.obstacle_front ? ['turn_right', 'avoid'] : null) },
        { name: 'dock', priority: 2, behavior: (s) => (s.station_visible ? ['move_to_station', 'dock'] : null) },
        { name: 'wander', priority: 1, behavior: () => ['forward', 'wander'] }
      ])
    };
  },
  handle(state, text) {
    const t = String(text).toLowerCase();
    const sensors = boolPairs(text);
    if (Object.keys(sensors).length === 0) {
      if (/障碍|obstacle|撞/.test(t)) sensors.obstacle_front = true;
      else if (/充电|station|dock|停靠/.test(t)) sensors.station_visible = true;
    }
    const [action, layer] = state.ctl.step(sensors);
    const echoed = Object.keys(sensors).length ? JSON.stringify(sensors) : '{}（无传感器触发）';
    return `传感器输入：${echoed}\n仲裁输出：${action}（来源层：${layer}）`;
  }
};

/* ---------------------------------------------------------------- 9. HMM */

const hmm = {
  id: 'hmm',
  name: 'HMM 词性标注（Viterbi）',
  year: 1990,
  category: 'statistical_nlp',
  conversational: true,
  intro:
    '1990s HMM 词性标注：Viterbi 解码，状态集 {DET, N, V}。词典很小（the/dog/runs/barks/cat/fish 等），未知词走 epsilon 回退。\n' +
    '直接输入空格分词的英文短句，如 "the dog runs"。',
  create() {
    return {
      tagger: new HmmTagger({
        states: ['N', 'V', 'DET'],
        startProb: { N: 0.4, V: 0.1, DET: 0.5 },
        transProb: {
          N: { N: 0.2, V: 0.6, DET: 0.2 },
          V: { N: 0.5, V: 0.1, DET: 0.4 },
          DET: { N: 0.8, V: 0.05, DET: 0.15 }
        },
        emitProb: {
          N: { dog: 0.4, cat: 0.3, fish: 0.2, runs: 0.1 },
          V: { runs: 0.4, barks: 0.3, eats: 0.3 },
          DET: { the: 0.6, a: 0.4 }
        }
      })
    };
  },
  handle(state, text) {
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '请输入要标注的英文句子（空格分词），如 "the dog runs"。';
    try {
      const tags = state.tagger.tag(words);
      const pairs = words.map((w, i) => `${w}/${tags[i]}`).join(' ');
      return `标注结果：${pairs}`;
    } catch (err) {
      return `标注失败：${err.message}`;
    }
  }
};

/* ---------------------------------------------------------------- 10. RBMT */

const rbmt = {
  id: 'rbmt',
  name: '规则机器翻译（EN→拼音）',
  year: 1990,
  category: 'language_systems',
  conversational: true,
  intro:
    '1990s RBMT：词级规则翻译演示（词表极小：hello/i am/student/teacher/thank you/goodbye，未知词以 [word] 兜底，输出为粘连拼音串）。\n' +
    '直接输入英文短句，如 "I am student"。',
  create() {
    return { mt: new RuleBasedTranslator() };
  },
  handle(state, text) {
    const out = state.mt.translate(String(text));
    return out ? `译文：${out}` : '输入为空。';
  }
};

/* ---------------------------------------------------------------- 11. Haar */

const haar = {
  id: 'haar',
  name: 'Haar 级联检测器',
  year: 2001,
  category: 'computer_vision',
  conversational: false,
  intro:
    '2001 Viola-Jones 型 Haar 级联（玩具版，单阶段，未归一化阈值投票）。\n' +
    '特征：eye_darkness>0.6（权重 0.7）、nose_bridge>0.4（权重 0.5），阶段阈值 1.0。\n' +
    '输入如：eye_darkness=0.9, nose_bridge=0.8',
  create() {
    return {
      det: new HaarLikeCascade([
        {
          stageThreshold: 1.0,
          weakClassifiers: [
            { feature: 'eye_darkness', threshold: 0.6, polarity: '>', weight: 0.7 },
            { feature: 'nose_bridge', threshold: 0.4, polarity: '>', weight: 0.5 }
          ]
        }
      ])
    };
  },
  handle(state, text) {
    const feats = numericPairs(text);
    const keys = Object.keys(feats);
    if (keys.length === 0) return '用法：输入特征=数值对，例如：eye_darkness=0.9, nose_bridge=0.8（缺失特征按 0 处理）。';
    const r = state.det.predict(feats);
    return r.positive
      ? `判定：正样本 ✓（全部阶段通过）`
      : `判定：负样本 ✗（在第 ${r.rejectedAtStage} 阶段被拒，阶段得分 ${r.stageScore.toFixed(2)} < 阈值 1.00）`;
  }
};

/* ----------------------------------------------------------------- 注册表 */

const ADAPTERS = [
  logicTheorist,
  eliza,
  semanticNetwork,
  frames,
  scriptNlu,
  mycin,
  blackboard,
  subsumption,
  hmm,
  rbmt,
  haar
];

module.exports = { ADAPTERS };
