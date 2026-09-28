const { Eliza } = require('./eliza');

function main() {
  const bot = new Eliza();
  const input = 'I need support';
  const output = bot.respond(input);
  console.log('ELIZA smoke input:', input);
  console.log('ELIZA smoke output:', output);
}

main();
