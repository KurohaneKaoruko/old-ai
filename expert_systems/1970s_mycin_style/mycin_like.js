function clampCf(value) {
  return Math.max(-1.0, Math.min(1.0, value));
}

function combineCf(existing, nextCf) {
  const x = clampCf(existing);
  const y = clampCf(nextCf);

  if (x >= 0 && y >= 0) {
    return clampCf(x + y * (1 - x));
  }
  if (x < 0 && y < 0) {
    return clampCf(x + y * (1 + x));
  }
  const denominator = 1 - Math.min(Math.abs(x), Math.abs(y));
  if (denominator <= 0) {
    return 0.0;
  }
  return clampCf((x + y) / denominator);
}

class ExpertSystem {
  constructor(rules) {
    this.rules = [...rules];
  }

  infer(evidence, maxIterations = 20, minActivation = 0.01) {
    const beliefs = Object.create(null);
    for (const [k, v] of Object.entries(evidence)) {
      if (!Number.isFinite(v)) {
        throw new TypeError(`evidence '${k}' must be a finite number, got: ${String(v)}`);
      }
      beliefs[k] = clampCf(v);
    }

    const trace = [];
    const lastRulePremiseCf = new Map();

    for (let iter = 0; iter < maxIterations; iter += 1) {
      let changed = false;

      for (let idx = 0; idx < this.rules.length; idx += 1) {
        const rule = this.rules[idx];
        if (rule.antecedents.some((a) => !(a in beliefs))) {
          continue;
        }
        const premiseCf = Math.min(...rule.antecedents.map((a) => beliefs[a]));
        const inferredCf = premiseCf * rule.certainty;
        if (Math.abs(inferredCf) < minActivation) {
          continue;
        }
        const prevPremiseCf = lastRulePremiseCf.get(idx);
        if (prevPremiseCf !== undefined && Math.abs(prevPremiseCf - premiseCf) < 1e-9) {
          continue;
        }

        const previous = beliefs[rule.consequent] || 0.0;
        const combined = combineCf(previous, inferredCf);
        lastRulePremiseCf.set(idx, premiseCf);

        if (Math.abs(combined - previous) < 1e-9) {
          continue;
        }

        beliefs[rule.consequent] = combined;
        changed = true;
        trace.push(
          `${rule.label || "rule"}: min(${JSON.stringify(rule.antecedents)})=${premiseCf.toFixed(2)}, ` +
            `inferred=${inferredCf.toFixed(2)}, ${rule.consequent}: ${previous.toFixed(2)}->${combined.toFixed(2)}`
        );
      }

      if (!changed) {
        break;
      }
    }

    return [beliefs, trace];
  }
}

module.exports = {
  ExpertSystem
};
