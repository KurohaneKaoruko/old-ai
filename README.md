# AI Lab

> 11 个曾经的 AI 方法，用纯 Node.js（零运行时依赖）逐个重实现，附带可运行的 demo、单元测试与网页交互实验台。
> A zero-dependency Node.js reimplementation lab of 11 historical AI techniques that were once influential and are now superseded — each with runnable demos, tests, and a web workbench.

[![Node](https://img.shields.io/badge/node-%3E%3D18-5fa04e)](https://nodejs.org)
[![Deps](https://img.shields.io/badge/runtime%20deps-0-blue)](#)
[![License](https://img.shields.io/badge/license-see%20LICENSE-informational)](#license)

English | [中文](#中文说明)

---

## Why this repo

Most of the methods here lost to statistical/deep approaches, yet they are the
concepts that still underlie modern systems: inference over graphs, uncertainty
arithmetic, knowledge inheritance, sequence decoding. Each subproject is a
minimal, readable, dependency-free implementation plus a demo you can run in one
command. Where an implementation is deliberately simplified (a teaching choice,
not an oversight), that is stated explicitly — see
[Known simplifications](#known-simplifications).

The collection intentionally excludes techniques that still have practical use
today (nearest neighbours, TF-IDF retrieval, SVMs, PSO, association rules,
behavior trees, …) — this lab is a museum of superseded ideas, not a toolbox.

## Quick start

Requires Node.js ≥ 18 (developed and tested on v22). There is **nothing to
install** for running the code; dev tooling (eslint/prettier) is optional.

```powershell
# 1) Interact with all 11 algorithms in the browser
npm start                       # -> http://localhost:3000

# 2) Run a single algorithm demo
node conversational_agents\1966_eliza\demo.js

# 3) Run every demo in sequence
npm run demo:all

# 4) Run the test suites
npm test                        # 15 assertions (main suite)
node tests\run_tests_alpha.js   # 17 assertions (second suite)
```

The web UI is the fastest way to see everything: each algorithm gets an
interaction panel shaped by its type — the Logic Theorist gets an editable
knowledge base with a proof tree, the semantic network a triple editor with an
inference trace, MYCIN evidence sliders with belief bars, HMM a sentence box
with colored word chips, and so on. A free-text chat remains available as a
collapsible fallback for every algorithm. See
[`web/README.md`](web/README.md) for the API and panel design.

## The 11 algorithms

| Year | Name | Category | Idea in one line |
|------|------|----------|-------------------|
| 1956 | [Logic Theorist](symbolic_reasoning/1956_logic_theorist) | symbolic reasoning | backward-chaining theorem proving over facts and rules |
| 1966 | [ELIZA](conversational_agents/1966_eliza) | conversational agents | pattern matching + pronoun reflection |
| 1968 | [Semantic Network](knowledge_representation/1968_semantic_network) | knowledge representation | `is_a` inheritance with explicit exceptions |
| 1974 | [Frames](knowledge_representation/1974_frames) | knowledge representation | slot inheritance with default overriding |
| 1970s | [MYCIN-style](expert_systems/1970s_mycin_style) | expert systems | certainty factors combined by the classic formulas |
| 1977 | [Script NLU](conversational_agents/1977_script_nlu) | NLP | infer missing events from a known script |
| 1980s | [Blackboard](expert_systems/1980s_blackboard_system) | expert systems | knowledge sources incrementally synthesize hypotheses |
| 1986 | [Subsumption](robotics_systems/1986_subsumption_architecture) | robotics | high-priority behavior layers suppress lower ones |
| 1990s | [HMM Tagger](statistical_nlp/1990s_hmm_tagger) | statistical NLP | Viterbi decoding of part-of-speech tags |
| 1990s | [Rule-Based MT](language_systems/1990s_rule_based_mt) | language | rewrite rules + dictionary translation |
| 2001 | [Haar Cascade](computer_vision/2001_haar_like_cascade) | computer vision | cascade of weak classifiers over window features |

## Repository layout

Each entry is self-contained:

```
<category>/<year>_<name>/
├── README.md      # what it is, how to run it, what it simplifies
├── <impl>.js      # the algorithm, dependency-free
└── demo.js        # a runnable scripted demo
```

```
web/                # typed-panel web UI (server + panels + static page, zero deps)
tests/              # run_tests.js (main) + run_tests_alpha.js (regression)
```

Top-level categories: `symbolic_reasoning`, `conversational_agents`,
`knowledge_representation`, `expert_systems`, `robotics_systems`,
`statistical_nlp`, `language_systems`, `computer_vision`.

## Quality: what was checked and fixed

Every implementation was reviewed for (a) bugs and (b) fidelity to the original
algorithm, with claims verified by execution rather than reading alone. Confirmed
defects were fixed and locked in with regression tests; deliberate simplifications
are documented instead of silently patched. Current state: **32/32 tests pass**
(15 main + 17 regression) and all demos run clean.

Representative fixes (each with a regression test):

* **Logic Theorist** — failures caused by cycle-guard short-circuits were cached
  as absolute, poisoning later queries on the same instance.
* **Blackboard / semantic network / MYCIN** — label or premise names such as
  `constructor` or `__proto__` hit `Object.prototype`, causing crashes or
  always-true checks. Internal maps are prototype-free.
* **Frames** — a cyclic parent chain made `getSlot` hang forever; slots now deep-copy
  their input.
* **ELIZA** — `$&` in user text was re-interpreted as a replacement pattern,
  corrupting replies.
* **HMM** — empty input crashed; degenerate models emitted `null` tags
  silently.

## Known simplifications

These are intentional teaching simplifications (implementation is self-consistent);
they are listed here so the fidelity gap to the original method is explicit:

* **Logic Theorist** — no variable unification/substitution; goal reduction only.
* **ELIZA** — template rotation index instead of true pattern priority; a 6-word
  reflection table.
* **Semantic network** — multi-inheritance `cannot` blocks only its own branch.
* **Script NLU** — "missing step" inference is a set difference; no ordering or
  contextual inference; first matching trigger keyword wins.
* **MYCIN** — conjunction is `min(cf)`; no negative-premise threshold semantics.
* **Blackboard** — linear clamped hypothesis addition; fixed-order knowledge-source
  polling, no priority scheduling or competition resolution.
* **HMM** — no learning; small fixed vocabulary.
* **RBMT** — 2 rewrite rules, tiny dictionary; no longest-match priority;
  output is a concatenated pinyin string; English tokenizer only.
* **Haar cascade** — unnormalized stage threshold (failed weak classifiers add 0,
  not −w); missing features default to 0.

## Testing

```powershell
npm test                        # 15 assertions — core behavior + bug regressions
node tests\run_tests_alpha.js   # 17 assertions — regressions for the second review batch
npm run demo:all                # 11 demos, chained with && (fails fast)
```

Both suites are plain `node:assert` scripts with no test framework. Optional dev
tooling: `npm install && npm run lint && npm run format:check`.

## Contributing a new technique

Only superseded techniques belong here — ask first whether the method still has
real-world use. Then:

1. Put it under the correct category in a new `<year>_<name>/` subproject.
2. Keep the implementation dependency-free and readable; prefer clarity over
   cleverness.
3. Add a runnable `demo.js` and a subproject `README.md` that states what is
   simplified.
4. Add tests to both suites; verify they fail before the fix and pass after.
5. Add a row to the table above and register a chat adapter in
   `web/adapters.js` (one object in the `ADAPTERS` table).

## License

No license file has been chosen yet. Add one (MIT, Apache-2.0, …) before
publishing this code publicly; until then the code is unlicensed and all rights
are reserved by default.

## 中文说明

**AI Lab** 收录 11 种曾经的 AI 方法，用纯
Node.js（无任何运行时依赖）重实现。每个子项目都包含可运行的 `demo.js`、说明
`README.md` 和单元测试；仓库还附带一个零依赖网页实验台
（`npm start` → <http://localhost:3000>）：按算法类型定制交互面板——定理证明给
可编辑知识库与证明树、语义网络给三元组编辑与推理链、MYCIN 给证据滑块与信念条、
HMM 给句子标注词块——另保留可折叠的自由文本聊天作为备用通道。

本仓库**刻意不收录**至今仍有实用价值的方法（kNN、TF-IDF 检索、SVM、PSO、关联
规则、行为树等）——这里是过时思想的博物馆，不是工具箱。

* **快速开始**：`npm start` 打开网页；`npm run demo:all` 跑全部 demo；
  `npm test` 与 `node tests/run_tests_alpha.js` 跑测试（当前 32/32 通过）。
* **实现质量**：全部实现经逐项审查与实测验证，确认的缺陷（Logic Theorist 失败
  缓存污染、原型链属性污染、frames 继承环挂起、ELIZA 的 `$&` 注入、HMM 退化模型
  输出 null 标签等）已修复并配有回归测试。
* **已知简化**：部分实现相对经典算法做了教学性简化（如 Logic Theorist 无变量
  一致化、HMM 无学习能力、行为树式的黑板调度无优先级竞争消解），全部在上文
  [Known simplifications](#known-simplifications) 中显式声明。
* **待定**：仓库尚未选择开源许可证，公开发布前请先添加 LICENSE。
