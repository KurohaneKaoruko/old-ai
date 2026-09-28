class SemanticNetwork {
  constructor() {
    this.edges = new Map();
  }

  _ensureNode(node) {
    if (!this.edges.has(node)) {
      this.edges.set(node, Object.assign(Object.create(null), {
        is_a: new Set(),
        can: new Set(),
        cannot: new Set()
      }));
    }
    return this.edges.get(node);
  }

  add(source, relation, target) {
    const rels = this._ensureNode(source);
    if (!rels[relation]) {
      rels[relation] = new Set();
    }
    rels[relation].add(target);
  }

  can(concept, action) {
    return this._canRecursive(concept, action, new Set());
  }

  _canRecursive(concept, action, visited) {
    if (visited.has(concept)) {
      return [false, [`cycle detected at ${concept}`]];
    }
    visited.add(concept);

    const rels = this._ensureNode(concept);
    if (rels.cannot.has(action)) {
      return [false, [`${concept} cannot ${action} (explicit exception)`]];
    }
    if (rels.can.has(action)) {
      return [true, [`${concept} can ${action} (direct fact)`]];
    }

    for (const parent of rels.is_a) {
      const [ok, trace] = this._canRecursive(parent, action, visited);
      if (ok) {
        return [true, [`${concept} is_a ${parent}`, ...trace]];
      }
    }
    return [false, [`no rule found for ${concept} can ${action}`]];
  }

  inherits(concept, ancestor) {
    return this._inheritsRecursive(concept, ancestor, new Set());
  }

  _inheritsRecursive(concept, ancestor, visited) {
    if (concept === ancestor) {
      return true;
    }
    if (visited.has(concept)) {
      return false;
    }
    visited.add(concept);

    const rels = this._ensureNode(concept);
    for (const parent of rels.is_a) {
      if (this._inheritsRecursive(parent, ancestor, visited)) {
        return true;
      }
    }
    return false;
  }
}

module.exports = {
  SemanticNetwork
};
