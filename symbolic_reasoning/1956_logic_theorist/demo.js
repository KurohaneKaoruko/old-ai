const { LogicTheorist } = require("./logic_theorist");

function main() {
  const facts = ["human(socrates)", "human(plato)"];
  const rules = [
    {
      premises: ["human(socrates)"],
      conclusion: "mortal(socrates)",
      label: "R1: humans are mortal (instance socrates)"
    },
    {
      premises: ["mortal(socrates)"],
      conclusion: "can_die(socrates)",
      label: "R2: mortals can die"
    },
    {
      premises: ["human(plato)"],
      conclusion: "mortal(plato)",
      label: "R3: humans are mortal (instance plato)"
    }
  ];

  const theorist = new LogicTheorist(facts, rules);
  const goal = "can_die(socrates)";
  const proof = theorist.prove(goal);

  console.log(`Goal: ${goal}`);
  if (!proof) {
    console.log("Result: not provable from current facts/rules");
    return;
  }
  console.log("Result: provable");
  console.log("Proof tree:");
  console.log(proof.render());
}

main();
