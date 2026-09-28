class RuleBasedTranslator {
  constructor() {
    this.rewriteRules = [
      { pattern: /\bi am\b/gi, replacement: "i_am" },
      { pattern: /\bthank you\b/gi, replacement: "thanks" }
    ];
    this.dictionary = {
      hello: "ni_hao",
      i_am: "wo_shi",
      student: "xue_sheng",
      teacher: "lao_shi",
      thanks: "xie_xie",
      goodbye: "zai_jian"
    };
  }

  translate(sentence) {
    let normalized = String(sentence || "").trim().toLowerCase().replace(/\s+/g, " ");
    for (const rule of this.rewriteRules) {
      normalized = normalized.replace(rule.pattern, rule.replacement);
    }
    const tokens = normalized.match(/[a-z_]+/g) || [];
    return tokens.map((token) => this.dictionary[token] || `[${token}]`).join("");
  }
}

module.exports = {
  RuleBasedTranslator
};
