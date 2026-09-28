const { HmmTagger } = require('./hmm_tagger');

function main() {
  const model = new HmmTagger({
    states: ['N', 'V', 'DET'],
    startProb: { N: 0.4, V: 0.1, DET: 0.5 },
    transProb: {
      N: { N: 0.2, V: 0.6, DET: 0.2 },
      V: { N: 0.5, V: 0.1, DET: 0.4 },
      DET: { N: 0.8, V: 0.05, DET: 0.15 }
    },
    emitProb: {
      N: { dog: 0.4, cat: 0.3, food: 0.2, runs: 0.1 },
      V: { eats: 0.5, runs: 0.4, likes: 0.1 },
      DET: { the: 0.6, a: 0.4 }
    }
  });

  const sentence = ['the', 'dog', 'runs'];
  const tags = model.tag(sentence);

  console.log('Sentence:', sentence.join(' '));
  console.log('Tags:', tags.join(' '));
}

main();
