'use strict';
/**
 * web/panels.js — 面板层：把「聊天框 + 自然语言解析」升级为「按算法类型定制的表单 + 类型化可视化」。
 * 仅收录已被取代的过时算法。
 *
 * 为每个适配器挂载两个可选成员：
 *   ui   — 表单 schema（type 决定结果视图，fields 决定控件）
 *   run(state, params) — 结构化执行，返回 { reply, view }
 *
 * view.type 取值：multi / kv / table / bars / tags / gauge / flow
 * 未定义 ui 的算法（纯对话型）回落到原有聊天框。
 */

const { LogicTheorist } = require('../symbolic_reasoning/1956_logic_theorist/logic_theorist');

const { ADAPTERS } = require('./adapters');

/* ---------------------------------------------------------------- 工具 */

const num = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const str = (v, def = '') => (v === undefined || v === null ? def : String(v));

/* ------------------------------------------------- 1. Logic Theorist（证明） */

const logicTheorist = {
  ui: {
    type: 'proof',
    hint: '编辑知识库并请求证明——这是定理证明器最自然的交互形态。',
    submit: '证明',
    fields: [
      { key: 'facts', kind: 'textarea', label: '事实（每行一条谓词）', value: 'human(socrates)' },
      {
        key: 'rules',
        kind: 'textarea',
        label: '规则（前提+前提=>结论，每行一条）',
        value: 'human(socrates)=>mortal(socrates)\nmortal(socrates)=>can_die(socrates)'
      },
      { key: 'goal', kind: 'text', label: '待证明目标', value: 'can_die(socrates)' }
    ]
  },
  run(_state, params) {
    const facts = str(params.facts).split('\n').map((s) => s.trim()).filter(Boolean);
    const rules = [];
    for (const line of str(params.rules).split('\n').map((s) => s.trim()).filter(Boolean)) {
      const m = line.match(/^(.+?)=>(.+)$/);
      if (!m) continue;
      rules.push({
        premises: m[1].split('+').map((s) => s.trim()).filter(Boolean),
        conclusion: m[2].trim()
      });
    }
    const goal = str(params.goal).trim();
    const lt = new LogicTheorist(facts, rules);
    const proof = lt.prove(goal);
    return {
      reply: proof ? `已证明：${goal}（事实 ${facts.length} 条，规则 ${rules.length} 条）` : `以当前知识库无法证明 ${goal}。`,
      view: {
        type: 'multi',
        blocks: [
          {
            type: 'flow',
            title: proof ? '证明树（自顶向下展开）' : '证明失败',
            text: proof ? proof.render() : `facts: [${facts.join(', ')}]\nrules: ${rules.length} 条\nno proof found for ${goal}`
          },
          {
            type: 'kv',
            items: [
              { k: '事实条数', v: String(facts.length) },
              { k: '规则条数', v: String(rules.length) },
              { k: '反链索引键数', v: String(lt.rulesByConclusion.size) }
            ]
          }
        ]
      }
    };
  }
};

/* ------------------------------------------------ 2. Semantic Network（网络） */

const semanticNetwork = {
  ui: {
    type: 'graph',
    hint: '三元组图：左侧建边，右侧按继承/例外推理。',
    submit: '执行',
    fields: [
      {
        key: 'op',
        kind: 'select',
        label: '操作',
        value: 'can',
        options: [
          { value: 'can', label: '能力查询 can(概念, 动作)' },
          { value: 'inherits', label: '继承查询 inherits(概念, 祖先)' },
          { value: 'add', label: '添加三元组 add(源, 关系, 目标)' }
        ]
      },
      {
        key: 'rel',
        kind: 'select',
        label: '关系（add 时生效）',
        value: 'is_a',
        options: [
          { value: 'is_a', label: 'is_a（继承）' },
          { value: 'can', label: 'can（能力）' },
          { value: 'cannot', label: 'cannot（例外）' }
        ]
      },
      { key: 'a', kind: 'text', label: '概念 A', value: 'penguin' },
      { key: 'b', kind: 'text', label: '动作 / 目标 B', value: 'fly' }
    ]
  },
  run(state, params) {
    const a = str(params.a).trim();
    const b = str(params.b).trim();
    const op = str(params.op, 'can');
    let result = '';
    if (op === 'add') {
      state.net.add(a, str(params.rel, 'is_a').toLowerCase(), b);
      result = `已加入 (${a}) -[${params.rel}]-> (${b})`;
    } else if (op === 'inherits') {
      result = `${a} ${state.net.inherits(a, b) ? '继承自' : '不继承自'} ${b}`;
    } else {
      const [ok, trace] = state.net.can(a, b);
      result = `can(${a}, ${b}) = ${ok}\n推理链：\n· ${trace.join('\n· ')}`;
    }
    const rows = [];
    for (const [node, rels] of state.net.edges) {
      for (const [rel, targets] of Object.entries(rels)) {
        for (const t of targets) rows.push([node, rel, t]);
      }
    }
    return {
      reply: result,
      view: {
        type: 'multi',
        blocks: [
          { type: 'kv', title: '推理结果', items: [{ k: '操作', v: op }, { k: '查询', v: `${a} / ${b}` }], note: result },
          { type: 'table', title: `网络中的三元组（${rows.length}）`, columns: ['源', '关系', '目标'], rows }
        ]
      }
    };
  }
};

/* ------------------------------------------------------------- 3. Frames（框架） */

const frames = {
  ui: {
    type: 'slots',
    hint: '框架槽继承：沿父链取值，子框架覆盖父框架。',
    submit: '执行',
    fields: [
      { key: 'op', kind: 'select', label: '操作', value: 'get', options: [
        { value: 'get', label: '查询槽 get' },
        { value: 'add', label: '添加框架 add' }
      ] },
      { key: 'frame', kind: 'text', label: '框架名', value: 'sparrow' },
      { key: 'parent', kind: 'text', label: '父框架（add 时，"-" 为无父）', value: 'bird' },
      { key: 'slot', kind: 'text', label: '槽名', value: 'can_fly' },
      { key: 'value', kind: 'text', label: '槽值（add 时）', value: 'true' }
    ]
  },
  run(state, params) {
    const frame = str(params.frame).trim();
    let result;
    if (str(params.op) === 'add') {
      const raw = str(params.value).trim();
      const val = raw === 'true' ? true : raw === 'false' ? false : /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
      state.fs.addFrame(frame, str(params.parent).trim() === '-' ? null : str(params.parent).trim(), { [str(params.slot).trim()]: val });
      result = `已添加框架 ${frame}（槽 ${params.slot}=${raw}）`;
    } else {
      const [ok, value, source] = state.fs.getSlot(frame, str(params.slot).trim());
      result = ok ? `${frame}.${params.slot} = ${JSON.stringify(value)}（继承自 ${source}）` : `未找到：${source}`;
    }
    const rows = [];
    for (const [name, f] of state.fs.frames) {
      rows.push([name, f.parent === null ? '—' : f.parent, Object.entries(f.slots).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join('，') || '—']);
    }
    return {
      reply: result,
      view: {
        type: 'multi',
        blocks: [
          { type: 'kv', title: '槽查询', items: [{ k: '框架', v: frame }, { k: '槽', v: str(params.slot) }], note: result },
          { type: 'table', title: '框架库', columns: ['框架', '父框架', '自有槽'], rows }
        ]
      }
    };
  }
};

/* -------------------------------------------------------------- 4. MYCIN（专家） */

const mycin = {
  ui: {
    type: 'expert',
    hint: '拖动证据置信度，观察 CF 组合与结论排序。',
    submit: '推理',
    fields: [
      { key: 'fever', kind: 'range', label: 'fever（发热）', min: -1, max: 1, step: 0.1, value: 0.8 },
      { key: 'cough', kind: 'range', label: 'cough（咳嗽）', min: -1, max: 1, step: 0.1, value: 0.7 },
      { key: 'sneeze', kind: 'range', label: 'sneeze（喷嚏）', min: -1, max: 1, step: 0.1, value: 0 }
    ]
  },
  run(state, params) {
    const evidence = { fever: num(params.fever, 0), cough: num(params.cough, 0), sneeze: num(params.sneeze, 0) };
    const [beliefs, trace] = state.engine.infer(evidence);
    const items = Object.entries(beliefs)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .map(([k, v]) => ({ label: k, value: v, max: 1, color: v >= 0 ? 'pos' : 'neg' }));
    return {
      reply: `诊断信念：${items.map((i) => `${i.label}=${i.value.toFixed(3)}`).join('，')}`,
      view: {
        type: 'multi',
        blocks: [
          { type: 'bars', title: '信念强度（|CF| 排序）', items, valueLabel: (v) => v.toFixed(3) },
          { type: 'flow', title: '推理轨迹（确定性因子组合）', text: trace.length ? trace.join('\n') : '（无规则被激活）' }
        ]
      }
    };
  }
};

/* --------------------------------------------------------- 5. Blackboard（黑板） */

const blackboard = {
  ui: {
    type: 'state',
    hint: '勾选传感器特征，触发知识源调度与假设合成。',
    submit: '运行知识源',
    fields: [
      { key: 'loop', kind: 'checkbox', label: '特征 loop（→ PATTERN）', value: false },
      { key: 'branch', kind: 'checkbox', label: '特征 branch（→ RECURSION）', value: false },
      { key: 'call', kind: 'checkbox', label: '特征 call（→ INVOCATION）', value: false }
    ]
  },
  run(state, params) {
    for (const f of ['loop', 'branch', 'call']) {
      if (params[f] === true || params[f] === 'true' || params[f] === 'on') state.board.features.add(f);
    }
    state.sys.run(state.board);
    const items = Object.entries(state.board.hypotheses).map(([k, v]) => ({ label: k, value: v, max: 1 }));
    return {
      reply: items.length ? `黑板假设：${items.map((i) => `${i.label}=${i.value.toFixed(2)}`).join('，')}` : '无假设被激活（勾选上方特征）',
      view: {
        type: 'multi',
        blocks: [
          { type: 'bars', title: '黑板假设（clamp 到 [0,1]）', items, valueLabel: (v) => v.toFixed(2) },
          { type: 'flow', title: '合成轨迹', text: state.board.trace.length ? state.board.trace.join('\n') : '（暂无轨迹）' },
          { type: 'kv', title: '调度状态', items: [
            { k: '已激活特征', v: [...state.board.features].join(', ') || '（无）' },
            { k: '已触发知识源标记', v: [...state.board.firedTokens].join(', ') || '（无）' }
          ] }
        ]
      }
    };
  }
};

/* ----------------------------------------------------- 6. Subsumption（包容） */

const subsumption = {
  ui: {
    type: 'state',
    hint: '设置传感器，高优先级层会抑制低优先级层。',
    submit: '仲裁一步',
    fields: [
      { key: 'obstacle_front', kind: 'checkbox', label: 'obstacle_front（前有障碍）', value: true },
      { key: 'station_visible', kind: 'checkbox', label: 'station_visible（可见充电站）', value: false }
    ]
  },
  run(state, params) {
    const sensors = {
      obstacle_front: params.obstacle_front === true || params.obstacle_front === 'true',
      station_visible: params.station_visible === true || params.station_visible === 'true'
    };
    const [action, layer] = state.ctl.step(sensors);
    return {
      reply: `仲裁输出 ${action}（层 ${layer}）`,
      view: {
        type: 'multi',
        blocks: [
          { type: 'kv', title: '仲裁结果', items: [
            { k: '输出动作', v: action },
            { k: '来源层', v: layer },
            { k: '输入', v: JSON.stringify(sensors) }
          ] },
          { type: 'table', title: '层优先级（高→低）', columns: ['层', '优先级', '触发条件', '本次是否仲裁'], rows: [
            ['avoid', '3', 'obstacle_front', sensors.obstacle_front ? (layer === 'avoid' ? '★ 仲裁' : '触发') : '未触发'],
            ['dock', '2', 'station_visible', sensors.station_visible ? (layer === 'dock' ? '★ 仲裁' : '触发') : '未触发'],
            ['wander', '1', '恒真（兜底）', layer === 'wander' ? '★ 仲裁' : '被抑制']
          ] }
        ]
      }
    };
  }
};

/* ---------------------------------------------------------------- 7. HMM（标注） */

const hmm = {
  ui: {
    type: 'tagger',
    hint: '输入句子，Viterbi 解码出最优词性序列。',
    submit: '标注',
    fields: [{ key: 'words', kind: 'text', label: '句子（空格分词，英文）', value: 'the dog runs' }]
  },
  run(state, params) {
    const words = str(params.words).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return { reply: '请输入至少一个词。', view: { type: 'tags', items: [] } };
    const tags = state.tagger.tag(words);
    const zh = { N: '名词', V: '动词', DET: '限定词' };
    return {
      reply: `标注：${words.map((w, i) => `${w}/${tags[i]}`).join(' ')}`,
      view: {
        type: 'tags',
        title: 'Viterbi 最优路径',
        items: words.map((w, i) => ({ word: w, tag: tags[i], label: zh[tags[i]] || tags[i] }))
      }
    };
  }
};

/* ---------------------------------------------------------------- 8. RBMT（翻译） */

const rbmt = {
  ui: {
    type: 'translate',
    hint: '词级改写规则 + 词典查表；未知词以 [word] 兜底。',
    submit: '翻译',
    fields: [{ key: 'text', kind: 'text', label: '英文句子', value: 'I am student' }]
  },
  run(state, params) {
    const input = str(params.text);
    const out = state.mt.translate(input);
    // 与实现一致的流水线拆解（归一化 → 改写 → 分词 → 词典）
    let normalized = input.trim().toLowerCase().replace(/\s+/g, ' ');
    for (const rule of state.mt.rewriteRules) normalized = normalized.replace(rule.pattern, rule.replacement);
    const tokens = normalized.match(/[a-z_]+/g) || [];
    const rows = tokens.map((t) => [t, state.mt.dictionary[t] ? '✓ 命中词典' : '✗ 未登录（兜底）', state.mt.dictionary[t] || `[${t}]`]);
    return {
      reply: `译文：${out}`,
      view: {
        type: 'multi',
        blocks: [
          { type: 'table', title: '词级对齐', columns: ['源词', '状态', '译词'], rows },
          { type: 'kv', title: '流水线', items: [
            { k: '改写后', v: normalized },
            { k: '分词数', v: String(tokens.length) },
            { k: '输出（粘连拼音）', v: out }
          ] }
        ]
      }
    };
  }
};

/* ------------------------------------------------------------ 9. Haar（视觉） */

const haar = {
  ui: {
    type: 'vision',
    hint: '拖动 Haar 特征值，观察加权投票与阶段阈值判定。',
    submit: '检测',
    fields: [
      { key: 'eye_darkness', kind: 'range', label: 'eye_darkness（阈值 0.6，权重 0.7）', min: 0, max: 1, step: 0.05, value: 0.9 },
      { key: 'nose_bridge', kind: 'range', label: 'nose_bridge（阈值 0.4，权重 0.5）', min: 0, max: 1, step: 0.05, value: 0.8 }
    ]
  },
  run(state, params) {
    const feats = { eye_darkness: num(params.eye_darkness, 0), nose_bridge: num(params.nose_bridge, 0) };
    const r = state.det.predict(feats);
    const weak = state.det.stages[0].weakClassifiers.map((w) => {
      const v = feats[w.feature] ?? 0;
      const pass = w.polarity === '>' ? v > w.threshold : v < w.threshold;
      return [w.feature, v.toFixed(2), w.polarity, w.threshold, pass ? '✓ 通过' : '✗ 失败（贡献 0）', String(w.weight)];
    });
    return {
      reply: r.positive ? '判定：正样本（全部阶段通过）' : `判定：负样本（第 ${r.rejectedAtStage} 阶段被拒，得分 ${r.stageScore.toFixed(2)} < 1.00）`,
      view: {
        type: 'multi',
        blocks: [
          { type: 'gauge', title: '阶段 1 得分 vs 阈值', value: r.positive ? 1.2 : r.stageScore, max: 1.2, threshold: 1.0, valueLabel: (v) => v.toFixed(2) },
          { type: 'kv', title: '判定', items: [
            { k: '结果', v: r.positive ? '正样本 ✓' : '负样本 ✗' },
            { k: '拒绝阶段', v: r.positive ? '—' : String(r.rejectedAtStage) },
            { k: '阶段得分', v: r.positive ? '—' : r.stageScore.toFixed(2) }
          ] },
          { type: 'table', title: '弱分类器明细', columns: ['特征', '取值', '极性', '阈值', '结果', '权重'], rows: weak }
        ]
      }
    };
  }
};

/* ---------------------------------------------------------------- 挂载 */

const PANELS = {
  logic_theorist: logicTheorist,
  semantic_network: semanticNetwork,
  frames,
  mycin,
  blackboard,
  subsumption,
  hmm,
  rbmt,
  haar: haar
};

// 纯对话型（eliza / script_nlu）无面板，走聊天框
for (const a of ADAPTERS) {
  const panel = PANELS[a.id];
  if (panel) {
    a.ui = panel.ui;
    a.run = panel.run;
  } else {
    a.ui = { type: 'chat', hint: '纯对话型算法：直接在下方聊天框输入。' };
  }
}

module.exports = { ADAPTERS };
