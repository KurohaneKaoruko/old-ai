class ScriptNLU {
  constructor(script) {
    this.script = script;
  }

  interpret(events) {
    const observed = events.map((e) => this._normalize(e));
    const observedSet = new Set(observed);
    const missing = [];
    for (const step of this.script.orderedSteps) {
      if (!observedSet.has(step)) {
        missing.push(step);
      }
    }
    return [observed, missing];
  }

  _normalize(text) {
    const lowered = String(text || "").toLowerCase();
    for (const [step, keywords] of Object.entries(this.script.triggerKeywords)) {
      if (keywords.some((kw) => ScriptNLU._matchKeyword(lowered, kw))) {
        return step;
      }
    }
    return "unknown";
  }

  static _matchKeyword(lowered, keyword) {
    const escaped = String(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(lowered);
  }
}

module.exports = {
  ScriptNLU
};
