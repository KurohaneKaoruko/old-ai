const { HaarLikeCascade } = require('./cascade');

function main() {
  const detector = new HaarLikeCascade([
    {
      stageThreshold: 1.0,
      weakClassifiers: [
        { feature: 'eye_darkness', threshold: 0.6, polarity: '>', weight: 0.7 },
        { feature: 'nose_bridge', threshold: 0.4, polarity: '>', weight: 0.5 }
      ]
    },
    {
      stageThreshold: 0.8,
      weakClassifiers: [
        { feature: 'cheek_symmetry', threshold: 0.5, polarity: '>', weight: 0.6 },
        { feature: 'mouth_contrast', threshold: 0.45, polarity: '>', weight: 0.5 }
      ]
    }
  ]);

  const windows = [
    { id: 'W1', eye_darkness: 0.7, nose_bridge: 0.5, cheek_symmetry: 0.6, mouth_contrast: 0.5 },
    { id: 'W2', eye_darkness: 0.3, nose_bridge: 0.2, cheek_symmetry: 0.7, mouth_contrast: 0.6 },
    { id: 'W3', eye_darkness: 0.8, nose_bridge: 0.5, cheek_symmetry: 0.2, mouth_contrast: 0.3 }
  ];

  for (const w of windows) {
    const result = detector.predict(w);
    console.log(w.id, result);
  }
}

main();
