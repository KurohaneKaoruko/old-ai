'use strict';
/**
 * web/public/app.js — 按算法类型定制的实验台前端。
 *
 * 布局：左侧算法列表 → 右侧「类型化控制面板 + 结果可视化」，聊天框折叠为备用通道。
 * 面板字段由后端 ui schema 驱动（web/panels.js），结果视图由 view.type 分发渲染。
 * 无框架、无依赖，原生 DOM + 手写 SVG。
 */

const CATEGORY_ZH = {
  symbolic_reasoning: '符号推理',
  conversational_agents: '对话智能体',
  knowledge_representation: '知识表示',
  planning_systems: '规划系统',
  expert_systems: '专家系统',
  dialogue_systems: '对话系统',
  robotics_systems: '机器人系统',
  retrieval_reasoning: '检索推理',
  probabilistic_reasoning: '概率推理',
  statistical_nlp: '统计 NLP',
  classical_ml: '经典机器学习',
  language_systems: '语言系统',
  evolutionary_ai: '演化计算',
  computer_vision: '计算机视觉',
  information_retrieval: '信息检索',
  optimization: '优化',
  recommender_systems: '推荐系统',
  nlp_systems: '自然语言处理',
  game_ai: '游戏 AI'
};

const UI_TYPE_ZH = {
  proof: '定理证明台',
  graph: '知识网络',
  planner: '规划器',
  slots: '框架槽位',
  expert: '专家推理',
  state: '状态机 / 传感器',
  search: '案例 / 检索',
  probability: '概率推断',
  classifier: '分类器',
  tagger: '序列标注',
  translate: '机器翻译',
  optimizer: '优化 / 演化',
  vision: '目标检测',
  reco: '推荐器',
  textscore: '文本打分',
  chat: '对话'
};

const SESSION_ID =
  (crypto.randomUUID && crypto.randomUUID()) || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const el = {
  list: document.getElementById('algo-list'),
  main: document.querySelector('.main'),
  name: document.getElementById('algo-name'),
  meta: document.getElementById('algo-meta'),
  form: document.getElementById('control-form'),
  view: document.getElementById('view'),
  reset: document.getElementById('reset-btn'),
  chatBox: document.querySelector('.chat-box'),
  chatLog: document.getElementById('messages'),
  chatInput: document.getElementById('input'),
  chatSend: document.getElementById('send-btn')
};

let catalog = [];
let current = null;
const chats = new Map(); // algorithmId -> [{role, text}]

/* ================================================================ 工具 */

function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

const PALETTE = ['#5b9dff', '#ffb454', '#4ecdc4', '#e06c9f', '#a78bfa', '#f87171'];

function fmt(v) {
  if (typeof v !== 'number') return String(v);
  if (!Number.isFinite(v)) return '—';
  if (v !== 0 && Math.abs(v) < 1e-3) return v.toExponential(2);
  return Number(v.toFixed(4)).toString();
}

/* ======================================================= 视图渲染器 */

const renderers = {};

renderers.kv = (v) => {
  const box = h('div', { class: 'kv' });
  for (const it of v.items || []) {
    box.appendChild(h('div', { class: 'kv-row' }, [h('span', { class: 'kv-k' }, [it.k]), h('span', { class: 'kv-v' }, [it.v])]));
  }
  if (v.note) box.appendChild(h('pre', { class: 'note' }, [v.note]));
  return box;
};

renderers.flow = (v) => h('pre', { class: 'flow' }, [v.text || '（空）']);

renderers.table = (v) => {
  const wrap = h('div', { class: 'table-wrap' });
  const table = h('table', { class: 'tbl' });
  const head = h('tr');
  (v.columns || []).forEach((c, i) => head.appendChild(h('th', i === v.bar ? { class: 'bar-col' } : {}, [c])));
  table.appendChild(h('thead', {}, [head]));
  const body = h('tbody');
  for (const row of v.rows || []) {
    const tr = h('tr');
    row.forEach((cell, i) => {
      const td = h('td');
      if (i === v.bar && typeof cell === 'number') {
        const pct = Math.max(0, Math.min(1, cell / (v.max || 1))) * 100;
        td.appendChild(
          h('div', { class: 'bar-cell' }, [
            h('div', { class: 'bar-track' }, [h('div', { class: 'bar-fill', style: `width:${pct}%` })]),
            h('span', { class: 'bar-num' }, [fmt(cell)])
          ])
        );
      } else {
        td.textContent = fmt(cell);
      }
      tr.appendChild(td);
    });
    body.appendChild(tr);
  }
  table.appendChild(body);
  wrap.appendChild(table);
  if (v.empty) wrap.appendChild(h('p', { class: 'empty' }, [v.empty]));
  return wrap;
};

renderers.bars = (v) => {
  const box = h('div', { class: 'bars' });
  const label = v.valueLabel || fmt;
  if (!v.items || v.items.length === 0) {
    box.appendChild(h('p', { class: 'empty' }, [v.empty || '（无数据）']));
    return box;
  }
  v.items.forEach((it, i) => {
    const pct = Math.max(0, Math.min(1, Math.abs(it.value) / (it.max || 1))) * 100;
    const color = it.color === 'neg' ? PALETTE[5] : it.color === 'pos' ? PALETTE[1] : PALETTE[i % PALETTE.length];
    box.appendChild(
      h('div', { class: 'bar-row' }, [
        h('span', { class: 'bar-label' }, [it.label]),
        h('div', { class: 'bar-track' }, [h('div', { class: 'bar-fill', style: `width:${pct}%;background:${color}` })]),
        h('span', { class: 'bar-num' }, [label(it.value)])
      ])
    );
  });
  return box;
};

renderers.gauge = (v) => {
  const min = v.min ?? 0;
  const max = v.max ?? 1;
  const zero = v.zero ?? min;
  const pos = ((v.value - min) / (max - min)) * 100;
  const zeroPos = ((zero - min) / (max - min)) * 100;
  const svgEl = svg('svg', { viewBox: '0 0 100 10', class: 'gauge', preserveAspectRatio: 'none' });
  svgEl.appendChild(svg('rect', { x: 0, y: 2, width: 100, height: 6, rx: 3, class: 'gauge-track' }));
  svgEl.appendChild(svg('rect', { x: 0, y: 2, width: Math.max(0, Math.min(100, pos)), height: 6, rx: 3, class: 'gauge-fill' }));
  svgEl.appendChild(svg('line', { x1: zeroPos, y1: 0, x2: zeroPos, y2: 10, class: 'gauge-zero' }));
  return h('div', { class: 'gauge-wrap' }, [
    svgEl,
    h('div', { class: 'gauge-legend' }, [
      h('span', {}, [`${min}`]),
      h('span', { class: 'strong' }, [`当前 ${(v.valueLabel || fmt)(v.value)}`]),
      h('span', {}, [`${max}`])
    ])
  ]);
};

renderers.steps = (v) => {
  const box = h('div', { class: 'steps' });
  if (!v.items || v.items.length === 0) {
    box.appendChild(h('p', { class: 'empty' }, [v.emptyText || '（无步骤）']));
  } else {
    v.items.forEach((it) => {
      box.appendChild(
        h('div', { class: 'step' }, [
          h('span', { class: 'step-n' }, [`${it.n}`]),
          h('code', {}, [it.text])
        ])
      );
    });
  }
  if (v.meta && v.meta.length) {
    const m = h('div', { class: 'kv compact' });
    for (const it of v.meta) m.appendChild(h('div', { class: 'kv-row' }, [h('span', { class: 'kv-k' }, [it.k]), h('span', { class: 'kv-v' }, [it.v])]));
    box.appendChild(m);
  }
  return box;
};

renderers.tags = (v) => {
  const box = h('div', { class: 'tags' });
  if (!v.items || !v.items.length) {
    box.appendChild(h('p', { class: 'empty' }, ['（无词）']));
    return box;
  }
  const colorOf = (t) => {
    if (t.startsWith('B-PER') || t.startsWith('I-PER')) return PALETTE[4];
    if (t.startsWith('B-LOC') || t.startsWith('I-LOC')) return PALETTE[2];
    if (t === 'O') return '#5a6478';
    return PALETTE[0];
  };
  for (const it of v.items) {
    box.appendChild(
      h('div', { class: 'tag', style: `border-color:${colorOf(it.tag)}` }, [
        h('div', { class: 'tag-word' }, [it.word]),
        h('div', { class: 'tag-label', style: `color:${colorOf(it.tag)}` }, [`${it.tag} · ${it.label || ''}`])
      ])
    );
  }
  return box;
};

renderers.line = (v) => {
  const W = 640, H = 240, PAD = 40;
  const series = v.series || [];
  const allPts = series.flatMap((s) => s.points);
  if (!allPts.length) return h('p', { class: 'empty' }, ['（无数据）']);
  const useLog = Boolean(v.log);
  const tx = (x) => (x === null ? NaN : x);
  const yVals = allPts.map((p) => p.y).filter((y) => Number.isFinite(y));
  const xVals = allPts.map((p) => p.x).filter((x) => Number.isFinite(x));
  const yMin = useLog ? Math.max(1e-12, Math.min(...yVals.filter((y) => y > 0).concat([1e-12]))) : Math.min(...yVals);
  const yMax = useLog ? Math.max(...yVals) : Math.max(...yVals);
  const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
  const sy = (y) => {
    if (useLog) {
      const lo = Math.log10(yMin), hi = Math.log10(Math.max(yMax, yMin * 10));
      const yy = y > 0 ? (Math.log10(y) - lo) / (hi - lo) : 0;
      return H - PAD - yy * (H - 2 * PAD);
    }
    const span = yMax - yMin || 1;
    return H - PAD - ((y - yMin) / span) * (H - 2 * PAD);
  };
  const sx = (x) => PAD + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * PAD);
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart' });
  // 坐标轴
  root.appendChild(svg('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, class: 'axis' }));
  root.appendChild(svg('line', { x1: PAD, y1: PAD - 8, x2: PAD, y2: H - PAD, class: 'axis' }));
  const yTick = useLog ? Math.log10(yMin) : yMin;
  const yTickMax = useLog ? Math.log10(yMax) : yMax;
  const yLabel = (v) => (useLog ? (v >= 1 ? String(Math.round(v)) : v.toExponential(0)) : String(Number(v.toFixed(2))));
  root.appendChild(svg('text', { x: PAD - 6, y: sy(yMax) + 4, class: 'tick', 'text-anchor': 'end' }, [yLabel(yTickMax)]));
  root.appendChild(svg('text', { x: PAD - 6, y: sy(yMin) + 4, class: 'tick', 'text-anchor': 'end' }, [yLabel(yTick)]));
  root.appendChild(svg('text', { x: PAD, y: H - 8, class: 'tick' }, [`${v.xLabel || 'x'}: ${xMin}…${xMax}`]));
  root.appendChild(svg('text', { x: 4, y: 14, class: 'tick' }, [v.yLabel || 'y']));
  // 曲线
  series.forEach((s, i) => {
    const color = PALETTE[i % PALETTE.length];
    const pts = s.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && (!useLog || p.y > 0));
    if (s.points.length === 1) {
      root.appendChild(svg('circle', { cx: sx(s.points[0].x), cy: sy(s.points[0].y), r: 4, fill: color }));
    } else if (pts.length) {
      root.appendChild(svg('polyline', { points: pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2 }));
      for (const p of pts) root.appendChild(svg('circle', { cx: sx(p.x), cy: sy(p.y), r: 3, fill: color }));
    }
  });
  const wrap = h('div', { class: 'chart-wrap' }, [root]);
  const legend = h('div', { class: 'legend' });
  series.forEach((s, i) => {
    legend.appendChild(h('span', { class: 'legend-item' }, [
      h('i', { style: `background:${PALETTE[i % PALETTE.length]}` }),
      s.name
    ]));
  });
  wrap.appendChild(legend);
  return wrap;
};

function scatterFrame(v, extras) {
  const W = 480, H = 340, PAD = 40;
  const pts = v.points || [];
  const xs = pts.map((p) => p.x).concat(v.query ? [v.query.x] : []);
  const ys = pts.map((p) => p.y).concat(v.query ? [v.query.y] : []);
  let xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
  const pad = 0.6;
  xMin -= pad; xMax += pad; yMin -= pad; yMax += pad;
  const sx = (x) => PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD);
  const sy = (y) => H - PAD - ((y - yMin) / (yMax - yMin)) * (H - 2 * PAD);
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart' });
  root.appendChild(svg('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, class: 'axis' }));
  root.appendChild(svg('line', { x1: PAD, y1: PAD - 10, x2: PAD, y2: H - PAD, class: 'axis' }));
  root.appendChild(svg('text', { x: W - PAD, y: H - 8, class: 'tick', 'text-anchor': 'end' }, [`${v.xLabel}: ${xMin.toFixed(1)}…${xMax.toFixed(1)}`]));
  root.appendChild(svg('text', { x: 4, y: 14, class: 'tick' }, [v.yLabel]));
  extras(root, sx, sy, { xMin, xMax, yMin, yMax });
  const labelColors = new Map();
  for (const p of pts) {
    if (!labelColors.has(p.label)) labelColors.set(p.label, PALETTE[labelColors.size % PALETTE.length]);
  }
  for (const p of pts) {
    const color = labelColors.get(p.label);
    if (p.neighbor) {
      root.appendChild(svg('circle', { cx: sx(p.x), cy: sy(p.y), r: 9, fill: 'none', stroke: color, 'stroke-dasharray': '3 3', opacity: 0.8 }));
    }
    root.appendChild(svg('circle', { cx: sx(p.x), cy: sy(p.y), r: 5, fill: color }));
  }
  if (v.query) {
    root.appendChild(svg('circle', { cx: sx(v.query.x), cy: sy(v.query.y), r: 6, fill: '#fff', stroke: '#10141c', 'stroke-width': 2 }));
    root.appendChild(svg('text', { x: sx(v.query.x) + 10, y: sy(v.query.y) - 8, class: 'point-label' }, [`查询 (${fmt(v.query.x)}, ${fmt(v.query.y)})`]));
  }
  const wrap = h('div', { class: 'chart-wrap' }, [root]);
  const legend = h('div', { class: 'legend' });
  for (const [label, color] of labelColors) {
    legend.appendChild(h('span', { class: 'legend-item' }, [h('i', { style: `background:${color}` }), `类 ${label}`]));
  }
  legend.appendChild(h('span', { class: 'legend-item' }, [h('i', { style: `background:#fff;border:1px solid #10141c` }), '查询点']));
  if (v.points.some((p) => p.neighbor)) legend.appendChild(h('span', { class: 'legend-item' }, ['虚线圈 = 参与投票的近邻']));
  wrap.appendChild(legend);
  return wrap;
}

renderers['scatter-knn'] = (v) => {
  const plot = scatterFrame(v, () => {});
  const box = h('div', {}, [plot]);
  if (v.neighbors) {
    const t = h('div', { class: 'chips' });
    v.neighbors.forEach((n, i) => t.appendChild(h('span', { class: 'chip' }, [`#${i + 1} 类 ${n.label} d=${fmt(n.d)}`])));
    box.appendChild(h('p', { class: 'sub' }, [`最近邻（k=${v.neighbors.length}）`]), t);
  }
  return box;
};

renderers['scatter-svm'] = (v) => {
  const b = v.boundary || { w: [0, 0], b: 0 };
  const [w0, w1] = b.w;
  const plot = scatterFrame(v, (root, sx, sy, b) => {
    // 决策边界：w0*x + w1*y + bb = 0，端点取实际绘图域
    const [w0, w1] = v.boundary ? v.boundary.w : [0, 0];
    const bb = v.boundary ? v.boundary.b : 0;
    if (Math.abs(w1) > 1e-9) {
      const y0 = (-bb - w0 * b.xMin) / w1;
      const y1 = (-bb - w0 * b.xMax) / w1;
      root.appendChild(svg('line', { x1: sx(b.xMin), y1: sy(y0), x2: sx(b.xMax), y2: sy(y1), class: 'boundary' }));
    } else if (Math.abs(w0) > 1e-9) {
      const x = -bb / w0;
      root.appendChild(svg('line', { x1: sx(x), y1: sy(b.yMin), x2: sx(x), y2: sy(b.yMax), class: 'boundary' }));
    }
  });
  return h('div', {}, [
    plot,
    h('div', { class: 'kv compact' }, [
      h('div', { class: 'kv-row' }, [h('span', { class: 'kv-k' }, ['判定']), h('span', { class: 'kv-v' }, [v.prediction])]),
      h('div', { class: 'kv-row' }, [h('span', { class: 'kv-k' }, ['决策得分']), h('span', { class: 'kv-v' }, [fmt(v.score)])]),
      h('div', { class: 'kv-row' }, [h('span', { class: 'kv-k' }, ['w / b']), h('span', { class: 'kv-v' }, [`[${fmt(b.w[0])}, ${fmt(b.w[1])}] / ${fmt(b.b)}`])])
    ])
  ]);
};

renderers.multi = (v) => {
  const box = h('div', { class: 'view' });
  for (const block of v.blocks || []) {
    const section = h('section', { class: 'view-block' });
    if (block.title) section.appendChild(h('h4', {}, [block.title]));
    const fn = renderers[block.type];
    section.appendChild(fn ? fn(block) : h('pre', { class: 'flow' }, [JSON.stringify(block, null, 2)]));
    box.appendChild(section);
  }
  return box;
};

/* ======================================================= 表单与交互 */

function buildField(f) {
  const wrap = h('div', { class: 'field' });
  const id = `f-${f.key}`;
  let input;
  if (f.kind === 'checkbox') {
    input = h('input', { type: 'checkbox', id });
    input.checked = Boolean(f.value);
    wrap.appendChild(h('label', { class: 'check', for: id }, [input, h('span', {}, [f.label])]));
    return wrap;
  }
  if (f.kind === 'select') {
    input = h('select', { id });
    for (const o of f.options || []) {
      const opt = h('option', { value: o.value }, [o.label]);
      if (String(o.value) === String(f.value)) opt.selected = true;
      input.appendChild(opt);
    }
  } else if (f.kind === 'textarea') {
    input = h('textarea', { id, rows: 3 });
    input.value = f.value ?? '';
  } else if (f.kind === 'range') {
    input = h('input', { type: 'range', id, min: f.min, max: f.max, step: f.step || 0.1 });
    input.value = f.value;
    const out = h('span', { class: 'range-val' }, [String(f.value)]);
    input.addEventListener('input', () => { out.textContent = input.value; });
    wrap.appendChild(h('label', { for: id }, [f.label]));
    wrap.appendChild(h('div', { class: 'range-row' }, [input, out]));
    return wrap;
  } else {
    input = h('input', { type: f.kind === 'number' ? 'number' : 'text', id, step: f.step, min: f.min });
    input.value = f.value ?? '';
  }
  wrap.appendChild(h('label', { for: id }, [f.label]));
  wrap.appendChild(input);
  return wrap;
}

function collectParams(algo) {
  const params = {};
  for (const f of algo.ui.fields || []) {
    const node = document.getElementById(`f-${f.key}`);
    if (!node) continue;
    if (f.kind === 'checkbox') params[f.key] = node.checked;
    else if (f.kind === 'number' || f.kind === 'range') params[f.key] = Number(node.value);
    else params[f.key] = node.value;
  }
  return params;
}

function renderPanel(algo) {
  el.form.textContent = '';
  el.view.textContent = '';
  if (!algo.ui || algo.ui.type === 'chat') {
    el.form.appendChild(h('p', { class: 'hint' }, [algo.ui ? algo.ui.hint : '纯对话型算法：直接在下方聊天框输入。']));
    renderChat(algo.id);
    return;
  }
  el.form.appendChild(h('div', { class: 'panel-head' }, [
    h('span', { class: 'badge' }, [UI_TYPE_ZH[algo.ui.type] || algo.ui.type]),
    h('span', { class: 'hint inline' }, [algo.ui.hint || ''])
  ]));
  for (const f of algo.ui.fields || []) el.form.appendChild(buildField(f));
  const submit = h('button', { class: 'btn-primary', type: 'button' }, [algo.ui.submit || '运行']);
  submit.addEventListener('click', () => runPanel(algo, submit));
  el.form.appendChild(h('div', { class: 'form-actions' }, [submit]));
  renderChat(algo.id);
}

async function runPanel(algo, btn) {
  btn.disabled = true;
  btn.textContent = '计算中…';
  el.view.textContent = '';
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ algorithmId: algo.id, sessionId: SESSION_ID, params: collectParams(algo) })
    });
    const data = await res.json();
    if (!res.ok) {
      el.view.appendChild(h('pre', { class: 'flow error' }, [`请求失败（${res.status}）：${data.error || ''}`]));
      return;
    }
    if (data.view) {
      const fn = renderers[data.view.type];
      el.view.appendChild(fn ? fn(data.view) : h('pre', { class: 'flow' }, [JSON.stringify(data.view, null, 2)]));
    } else {
      el.view.appendChild(h('pre', { class: 'flow' }, [data.reply]));
    }
    if (data.reply) el.view.appendChild(h('pre', { class: 'note' }, [data.reply]));
  } catch (err) {
    el.view.appendChild(h('pre', { class: 'flow error' }, [`网络错误：${err.message}`]));
  } finally {
    btn.disabled = false;
    btn.textContent = algo.ui.submit || '运行';
  }
}

/* ============================================================== 聊天 */

function chatLog(algoId) {
  if (!chats.has(algoId)) chats.set(algoId, []);
  return chats.get(algoId);
}

function renderChat(algoId) {
  el.chatLog.textContent = '';
  const log = chatLog(algoId);
  const algo = catalog.find((a) => a.id === algoId);
  if (algo) el.chatLog.appendChild(h('div', { class: 'msg system' }, [algo.intro]));
  for (const m of log) el.chatLog.appendChild(h('div', { class: `msg ${m.role}` }, [m.text]));
  el.chatLog.scrollTop = el.chatLog.scrollHeight;
  el.chatInput.disabled = false;
  el.chatSend.disabled = false;
}

async function sendChat() {
  if (!current) return;
  const text = el.chatInput.value.trim();
  if (!text) return;
  el.chatInput.value = '';
  const log = chatLog(current.id);
  log.push({ role: 'user', text });
  renderChat(current.id);
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ algorithmId: current.id, sessionId: SESSION_ID, text })
    });
    const data = await res.json();
    log.push({ role: data.error ? 'bot error' : 'bot', text: data.reply || data.error || '（无响应）' });
  } catch (err) {
    log.push({ role: 'bot error', text: `网络错误：${err.message}` });
  }
  renderChat(current.id);
}

async function resetSession() {
  if (!current) return;
  await fetch('/api/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: SESSION_ID, algorithmId: current.id })
  }).catch(() => {});
  chats.set(current.id, []);
  renderPanel(current);
  el.view.textContent = '';
}

/* ============================================================== 列表 */

function renderCatalog() {
  const groups = new Map();
  for (const a of catalog) {
    if (!groups.has(a.category)) groups.set(a.category, []);
    groups.get(a.category).push(a);
  }
  el.list.textContent = '';
  for (const [cat, algos] of [...groups].sort((x, y) => x[0].localeCompare(y[0]))) {
    el.list.appendChild(h('div', { class: 'group-title' }, [CATEGORY_ZH[cat] || cat]));
    for (const a of algos.sort((x, y) => x.year - y.year)) {
      const btn = h('button', { type: 'button', class: 'algo-item', 'data-id': a.id }, [
        h('span', { class: 'year' }, [String(a.year)]),
        h('span', { class: 'algo-name' }, [a.name]),
        h('span', { class: 'type-tag' }, [UI_TYPE_ZH[(a.ui && a.ui.type) || 'chat'] || ''])
      ]);
      btn.addEventListener('click', () => select(a.id));
      el.list.appendChild(btn);
    }
  }
}

function select(id) {
  current = catalog.find((a) => a.id === id);
  if (!current) return;
  for (const b of el.list.querySelectorAll('.algo-item')) b.classList.toggle('active', b.dataset.id === id);
  const chatOnly = !current.ui || current.ui.type === 'chat';
  // 纯对话型：无面板/可视化，聊天区放大为主内容；面板型：可视化居左、面板居右
  el.main.classList.toggle('chat-mode', chatOnly);
  el.chatBox.open = chatOnly;
  el.name.textContent = current.name;
  el.meta.textContent = `${current.year} · ${CATEGORY_ZH[current.category] || current.category} · ${UI_TYPE_ZH[(current.ui && current.ui.type) || 'chat'] || ''}`;
  renderPanel(current);
  if (chatOnly) {
    el.chatInput.focus();
  } else {
    const firstInput = el.form.querySelector('input, select, textarea, button');
    if (firstInput) firstInput.focus();
  }
}

/* ============================================================== 启动 */

el.chatSend.addEventListener('click', sendChat);
el.chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
el.reset.addEventListener('click', resetSession);
for (const t of document.querySelectorAll('.chat-box summary')) {
  t.addEventListener('click', () => {
    if (t.parentElement.open) setTimeout(() => el.chatInput.focus(), 0);
  });
}

fetch('/api/algorithms')
  .then((r) => r.json())
  .then((d) => {
    catalog = d.algorithms;
    renderCatalog();
    select('eliza');
  })
  .catch((err) => {
    el.form.appendChild(h('pre', { class: 'flow error' }, [`算法目录加载失败：${err.message}。请确认 node web/server.js 已启动。`]));
  });
