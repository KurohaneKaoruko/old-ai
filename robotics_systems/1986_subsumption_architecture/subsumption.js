class SubsumptionController {
  constructor(layers) {
    for (const layer of layers) {
      if (!Number.isFinite(layer.priority)) {
        throw new Error(`layer "${layer.name}" must have a finite numeric priority, got: ${layer.priority}`);
      }
    }
    this.layers = [...layers].sort((a, b) => b.priority - a.priority);
  }

  step(state) {
    if (state === null || typeof state !== 'object') {
      throw new Error(`step expects a sensors object, got: ${state === null ? 'null' : typeof state}`);
    }
    for (const layer of this.layers) {
      const decision = layer.behavior(state);
      if (decision) {
        return decision;
      }
    }
    return ["idle", "no behavior triggered"];
  }
}

module.exports = {
  SubsumptionController
};
