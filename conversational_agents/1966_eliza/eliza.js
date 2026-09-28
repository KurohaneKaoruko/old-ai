class Eliza {
  constructor() {
    this.reflections = {
      i: "you",
      me: "you",
      my: "your",
      am: "are",
      you: "I",
      your: "my"
    };

    this.rules = [
      {
        pattern: /.*\bi need (.*)/i,
        templates: ["Why do you need {0}?", "What would it mean if you got {0}?"]
      },
      {
        pattern: /.*\bi am (.*)/i,
        templates: ["How long have you been {0}?", "Why do you say you are {0}?"]
      },
      {
        pattern: /.*\bi feel (.*)/i,
        templates: ["Do you often feel {0}?", "What makes you feel {0}?"]
      },
      {
        pattern: /.*\bmy (.*)/i,
        templates: ["Tell me more about your {0}.", "How does your {0} affect you?"]
      },
      {
        pattern: /.*\b(mother|father|family)\b(.*)/i,
        templates: ["Tell me more about your family.", "How do you feel about your family?"]
      }
    ];

    this.fallback = [
      "Please go on.",
      "Can you elaborate on that?",
      "Why do you say that?",
      "I see. Continue."
    ];

    this.ruleIndex = 0;
    this.fallbackIndex = 0;
  }

  respond(text) {
    const cleaned = String(text || "").trim();
    if (!cleaned) {
      return "Say something, and we can explore it.";
    }

    for (const rule of this.rules) {
      const match = cleaned.match(rule.pattern);
      if (!match) {
        continue;
      }

      const groups = match
        .slice(1)
        .filter((g) => g !== undefined && g !== null)
        .map((g) => g.trim().replace(/[.!?]+$/g, ""));
      const template = this._chooseTemplate(rule.templates);
      if (template.includes("{0}")) {
        const reflected = this._reflect(groups[0] || "");
        return template.replace("{0}", () => reflected);
      }
      return template;
    }

    return this._chooseFallback();
  }

  _reflect(fragment) {
    return fragment
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => this.reflections[w.toLowerCase()] || w)
      .join(" ");
  }

  _chooseTemplate(templates) {
    const value = templates[this.ruleIndex % templates.length];
    this.ruleIndex += 1;
    return value;
  }

  _chooseFallback() {
    const value = this.fallback[this.fallbackIndex % this.fallback.length];
    this.fallbackIndex += 1;
    return value;
  }
}

module.exports = {
  Eliza
};
