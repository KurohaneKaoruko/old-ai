class FrameSystem {
  constructor() {
    this.frames = new Map();
  }

  addFrame(name, parent = null, slots = {}) {
    this.frames.set(name, {
      name,
      parent,
      slots: structuredClone(slots)
    });
  }

  getSlot(frameName, slot) {
    let current = frameName;
    const visited = new Set();
    while (current !== null) {
      if (visited.has(current)) {
        throw new Error(`inheritance cycle detected at frame: ${current}`);
      }
      visited.add(current);
      const frame = this.frames.get(current);
      if (!frame) {
        return [false, null, `missing frame: ${current}`];
      }
      if (Object.prototype.hasOwnProperty.call(frame.slots, slot)) {
        return [true, frame.slots[slot], `${current}.${slot}`];
      }
      current = frame.parent;
    }
    return [false, null, `slot '${slot}' not found in hierarchy`];
  }
}

module.exports = {
  FrameSystem
};
