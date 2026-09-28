const { RuleBasedTranslator } = require("./rbmt");

function main() {
  const translator = new RuleBasedTranslator();
  const samples = ["Hello", "I am student", "Thank you teacher", "Goodbye"];

  for (const src of samples) {
    const tgt = translator.translate(src);
    console.log(`EN: ${src}`);
    console.log(`ZH: ${tgt}`);
    console.log("");
  }
}

main();
