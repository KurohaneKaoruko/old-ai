const { SemanticNetwork } = require("./semantic_network");

function main() {
  const net = new SemanticNetwork();

  net.add("bird", "can", "fly");
  net.add("bird", "can", "lay_eggs");
  net.add("penguin", "is_a", "bird");
  net.add("penguin", "cannot", "fly");
  net.add("robin", "is_a", "bird");
  net.add("robin", "can", "sing");

  for (const animal of ["robin", "penguin"]) {
    const [canFly, trace] = net.can(animal, "fly");
    console.log(`Query: can(${animal}, fly)`);
    console.log("Result:", canFly);
    console.log("Trace:");
    trace.forEach((step) => console.log(" -", step));
    console.log("");
  }

  console.log(
    "Inheritance check: inherits(penguin, bird) =",
    net.inherits("penguin", "bird")
  );
}

main();
