const { ScriptNLU } = require("./script_nlu");

function main() {
  const restaurantScript = {
    name: "restaurant_visit",
    orderedSteps: [
      "enter_restaurant",
      "sit_down",
      "order_food",
      "eat_food",
      "pay_bill",
      "leave_restaurant"
    ],
    triggerKeywords: {
      enter_restaurant: ["enter", "arrive", "walked in"],
      sit_down: ["sit", "table", "seated"],
      order_food: ["order", "menu"],
      eat_food: ["eat", "ate", "meal"],
      pay_bill: ["pay", "bill", "cashier"],
      leave_restaurant: ["leave", "left", "exit"]
    }
  };

  const storyEvents = [
    "I arrived at a small cafe.",
    "I sat at a table near the window.",
    "I ordered noodles and tea.",
    "I ate quietly while reading.",
    "Then I left quickly for work."
  ];

  const nlu = new ScriptNLU(restaurantScript);
  const [observed, missing] = nlu.interpret(storyEvents);

  console.log("Script:", restaurantScript.name);
  console.log("Observed steps:");
  observed.forEach((step) => console.log(" -", step));

  console.log("\nInferred missing steps:");
  missing.forEach((step) => console.log(" -", step));
}

main();
