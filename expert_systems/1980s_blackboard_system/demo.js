const { Blackboard, BlackboardSystem } = require("./blackboard");

function ksLoopDetector(board) {
  if (!board.features.has("loop") || !board.markOnce("ks_loop_detector")) {
    return false;
  }
  const before = JSON.stringify(board.hypotheses);
  board.addHypothesis("P", 0.4, "ks_loop_detector");
  board.addHypothesis("R", 0.3, "ks_loop_detector");
  return before !== JSON.stringify(board.hypotheses);
}

function ksVerticalDetector(board) {
  if (!board.features.has("vertical_line") || !board.markOnce("ks_vertical_detector")) {
    return false;
  }
  const before = JSON.stringify(board.hypotheses);
  board.addHypothesis("P", 0.3, "ks_vertical_detector");
  board.addHypothesis("I", 0.2, "ks_vertical_detector");
  return before !== JSON.stringify(board.hypotheses);
}

function ksDiagonalDetector(board) {
  if (!board.features.has("diagonal_leg") || !board.markOnce("ks_diagonal_detector")) {
    return false;
  }
  const before = JSON.stringify(board.hypotheses);
  board.addHypothesis("R", 0.4, "ks_diagonal_detector");
  return before !== JSON.stringify(board.hypotheses);
}

function main() {
  const board = new Blackboard(["loop", "vertical_line", "diagonal_leg"]);
  const system = new BlackboardSystem([
    ["loop", ksLoopDetector],
    ["vertical", ksVerticalDetector],
    ["diagonal", ksDiagonalDetector]
  ]);
  const result = system.run(board);

  console.log("Features:", [...result.features].sort().join(", "));
  console.log("\nBlackboard Trace:");
  result.trace.forEach((line) => console.log(" -", line));

  console.log("\nRanked Hypotheses:");
  Object.entries(result.hypotheses)
    .sort((a, b) => b[1] - a[1])
    .forEach(([label, score]) => {
      console.log(` - ${label}: ${score.toFixed(2)}`);
    });
}

main();
