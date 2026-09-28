const readline = require("readline");
const { Eliza } = require("./eliza");

function main() {
  const bot = new Eliza();
  console.log("ELIZA demo. Type 'quit' to exit.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.setPrompt("You: ");
  rl.prompt();

  rl.on("line", (line) => {
    const text = line.trim();
    if (text.toLowerCase() === "quit" || text.toLowerCase() === "exit") {
      console.log("ELIZA: Goodbye.");
      rl.close();
      return;
    }
    console.log("ELIZA:", bot.respond(text));
    rl.prompt();
  });
}

main();
