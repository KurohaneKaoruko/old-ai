class HaarLikeCascade {
  constructor(stages) {
    for (const stage of stages) {
      for (const weak of stage.weakClassifiers) {
        if (weak.polarity !== '>' && weak.polarity !== '<') {
          throw new Error(`invalid weak classifier polarity: ${JSON.stringify(weak.polarity)} (expected '>' or '<')`);
        }
      }
    }
    this.stages = stages;
  }

  predict(features) {
    for (let i = 0; i < this.stages.length; i += 1) {
      const stage = this.stages[i];
      let score = 0.0;
      for (const weak of stage.weakClassifiers) {
        const value = features[weak.feature] ?? 0;
        const pass = weak.polarity === '>' ? value > weak.threshold : value < weak.threshold;
        if (pass) score += weak.weight;
      }
      if (score < stage.stageThreshold) {
        return { positive: false, rejectedAtStage: i + 1, stageScore: score };
      }
    }
    return { positive: true, rejectedAtStage: null, stageScore: null };
  }
}

module.exports = {
  HaarLikeCascade
};
