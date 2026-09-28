class ProofNode {
  constructor(statement, reason, children = []) {
    this.statement = statement;
    this.reason = reason;
    this.children = children;
  }

  render(indent = 0) {
    const pad = "  ".repeat(indent);
    const line = `${pad}- ${this.statement} (${this.reason})`;
    if (this.children.length === 0) {
      return line;
    }
    return [line, ...this.children.map((child) => child.render(indent + 1))].join("\n");
  }
}

class LogicTheorist {
  constructor(facts, rules) {
    this.facts = new Set(facts);
    this.rulesByConclusion = new Map();
    for (const rule of rules) {
      if (!this.rulesByConclusion.has(rule.conclusion)) {
        this.rulesByConclusion.set(rule.conclusion, []);
      }
      this.rulesByConclusion.get(rule.conclusion).push(rule);
    }
    this.failedCache = new Set();
  }

  prove(goal) {
    return this._prove(goal, new Set());
  }

  _prove(goal, path) {
    if (this.facts.has(goal)) {
      return new ProofNode(goal, "fact");
    }
    if (path.has(goal) || this.failedCache.has(goal)) {
      return null;
    }

    const rules = this.rulesByConclusion.get(goal) || [];
    if (rules.length === 0) {
      this.failedCache.add(goal);
      return null;
    }

    path.add(goal);
    try {
      for (const rule of rules) {
        const children = [];
        let success = true;
        for (const premise of rule.premises) {
          const proof = this._prove(premise, path);
          if (!proof) {
            success = false;
            break;
          }
          children.push(proof);
        }
        if (success) {
          return new ProofNode(goal, rule.label || "rule", children);
        }
      }
      return null;
    } finally {
      path.delete(goal);
    }
  }
}

module.exports = {
  LogicTheorist,
  ProofNode
};
