const { FrameSystem } = require("./frames");

function main() {
  const fs = new FrameSystem();
  fs.addFrame("animal", null, { can_move: true, body_temp: "variable" });
  fs.addFrame("bird", "animal", { can_fly: true, has_feathers: true });
  fs.addFrame("penguin", "bird", { can_fly: false, habitat: "antarctic" });

  const queries = [
    ["penguin", "can_fly"],
    ["penguin", "has_feathers"],
    ["penguin", "can_move"],
    ["penguin", "body_temp"],
    ["penguin", "habitat"]
  ];

  for (const [frameName, slot] of queries) {
    const [ok, value, source] = fs.getSlot(frameName, slot);
    if (ok) {
      console.log(`${frameName}.${slot} = ${value} (from ${source})`);
    } else {
      console.log(`${frameName}.${slot}: ${source}`);
    }
  }
}

main();
