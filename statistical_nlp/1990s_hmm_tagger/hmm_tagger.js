class HmmTagger {
  constructor({ states, startProb, transProb, emitProb }) {
    this.states = states;
    this.startProb = startProb;
    this.transProb = transProb;
    this.emitProb = emitProb;
    this.epsilon = 1e-9;
  }

  _pEmit(state, word) {
    return this.emitProb[state]?.[word] ?? this.epsilon;
  }

  _pTrans(prev, next) {
    return this.transProb[prev]?.[next] ?? this.epsilon;
  }

  tag(words) {
    if (!Array.isArray(words) || words.length === 0) return [];

    const dp = [];
    const back = [];

    dp[0] = {};
    back[0] = {};
    for (const s of this.states) {
      dp[0][s] = Math.log(this.startProb[s] ?? this.epsilon) + Math.log(this._pEmit(s, words[0]));
      back[0][s] = null;
    }

    for (let t = 1; t < words.length; t += 1) {
      dp[t] = {};
      back[t] = {};
      for (const s of this.states) {
        let bestPrev = null;
        let bestScore = -Infinity;
        for (const p of this.states) {
          const score = dp[t - 1][p] + Math.log(this._pTrans(p, s)) + Math.log(this._pEmit(s, words[t]));
          if (score > bestScore) {
            bestScore = score;
            bestPrev = p;
          }
        }
        dp[t][s] = bestScore;
        back[t][s] = bestPrev;
      }
    }

    let bestLast = this.states[0];
    let bestFinal = -Infinity;
    const lastT = words.length - 1;
    for (const s of this.states) {
      if (dp[lastT][s] > bestFinal) {
        bestFinal = dp[lastT][s];
        bestLast = s;
      }
    }

    const tags = Array(words.length);
    tags[lastT] = bestLast;
    for (let t = lastT; t > 0; t -= 1) {
      const prev = back[t][tags[t]];
      if (prev === null || prev === undefined) {
        throw new Error(
          `HMM backtrace failed: no valid predecessor for state "${tags[t]}" at position ${t - 1} (degenerate transition model?)`
        );
      }
      tags[t - 1] = prev;
    }
    return tags;
  }
}

module.exports = {
  HmmTagger
};
