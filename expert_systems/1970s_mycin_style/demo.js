const { ExpertSystem } = require("./mycin_like");

function main() {
  const rules = [
    { antecedents: ["fever", "cough"], consequent: "diagnosis_flu", certainty: 0.7, label: "R1" },
    { antecedents: ["body_ache", "fever"], consequent: "diagnosis_flu", certainty: 0.6, label: "R2" },
    { antecedents: ["cough"], consequent: "diagnosis_common_cold", certainty: 0.5, label: "R3" },
    { antecedents: ["sneezing"], consequent: "diagnosis_common_cold", certainty: 0.6, label: "R4" }
  ];

  const evidence = {
    fever: 0.8,
    cough: 0.7,
    body_ache: 0.6,
    sneezing: 0.3
  };

  const engine = new ExpertSystem(rules);
  const [beliefs, trace] = engine.infer(evidence);

  console.log("Evidence:");
  Object.entries(evidence).forEach(([fact, cf]) => {
    console.log(` - ${fact}: ${cf.toFixed(2)}`);
  });

  console.log("\nInference Trace:");
  trace.forEach((line) => console.log(" -", line));

  const diagnoses = Object.entries(beliefs)
    .filter(([k]) => k.startsWith("diagnosis_"))
    .sort((a, b) => b[1] - a[1]);

  console.log("\nDiagnosis Ranking (certainty factor):");
  diagnoses.forEach(([name, cf]) => console.log(` - ${name}: ${cf.toFixed(2)}`));
}

main();
