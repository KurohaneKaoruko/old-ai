class Blackboard {
  constructor(features = []) {
    this.features = new Set(features);
    this.hypotheses = Object.create(null);
    this.trace = [];
    this.firedTokens = new Set();
  }

  addHypothesis(label, confidenceDelta, source) {
    const before = this.hypotheses[label] || 0.0;
    const after = Math.max(0.0, Math.min(1.0, before + confidenceDelta));
    if (Math.abs(after - before) < 1e-9) {
      return;
    }
    this.hypotheses[label] = after;
    this.trace.push(`${source}: ${label} ${before.toFixed(2)}->${after.toFixed(2)}`);
  }

  markOnce(token) {
    if (this.firedTokens.has(token)) {
      return false;
    }
    this.firedTokens.add(token);
    return true;
  }
}

class BlackboardSystem {
  constructor(knowledgeSources) {
    this.knowledgeSources = [...knowledgeSources];
  }

  run(board, maxRounds = 10) {
    for (let round = 0; round < maxRounds; round += 1) {
      let changed = false;
      for (const [, sourceFn] of this.knowledgeSources) {
        if (sourceFn(board)) {
          changed = true;
        }
      }
      if (!changed) {
        break;
      }
    }
    return board;
  }
}

module.exports = {
  Blackboard,
  BlackboardSystem
};
