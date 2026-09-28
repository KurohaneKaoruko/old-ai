const { SubsumptionController } = require("./subsumption");

function avoidCollision(state) {
  if (state.obstacle_front) {
    return ["turn_right", "avoid_collision suppresses roaming"];
  }
  return null;
}

function seekCharging(state) {
  if (state.battery_low && state.charging_station_visible) {
    return ["move_to_station", "seek_charging suppresses roaming"];
  }
  return null;
}

function wander() {
  return ["forward", "wander default behavior"];
}

function main() {
  const controller = new SubsumptionController([
    { name: "avoid_collision", priority: 3, behavior: avoidCollision },
    { name: "seek_charging", priority: 2, behavior: seekCharging },
    { name: "wander", priority: 1, behavior: wander }
  ]);

  const timeline = [
    { obstacle_front: false, battery_low: false, charging_station_visible: false },
    { obstacle_front: true, battery_low: false, charging_station_visible: false },
    { obstacle_front: false, battery_low: true, charging_station_visible: true }
  ];

  timeline.forEach((state, idx) => {
    const [action, reason] = controller.step(state);
    console.log(`t${idx + 1}: state=${JSON.stringify(state)}`);
    console.log(` -> action=${action}, reason=${reason}`);
  });
}

main();
