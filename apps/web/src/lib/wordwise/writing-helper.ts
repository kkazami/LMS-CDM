import type {
  WritingImprovementResult,
  WritingImprovementSuggestion,
} from "./types";

interface PhraseReplacementRule {
  id: string;
  informalPhrase: string;
  pattern: RegExp;
  recommendedReplacement: string;
  alternatives: string[];
  explanation: string;
  usageContext: string;
}

export const WRITING_IMPROVEMENT_DISCLAIMER =
  "Suggestions are based on curated academic and business vocabulary rules, not AI generation.";

const PHRASE_REPLACEMENT_RULES: readonly PhraseReplacementRule[] = [
  {
    id: "rule-find-out",
    informalPhrase: "find out",
    pattern: /\bfind(?:s|ing)? out\b/gi,
    recommendedReplacement: "determine",
    alternatives: ["ascertain", "establish", "verify"],
    explanation:
      "Replace conversational phrasal verbs like 'find out' with 'determine' or 'ascertain' in formal reports and academic research.",
    usageContext: "Research findings, audit reports & HR investigations",
  },
  {
    id: "rule-found-out",
    informalPhrase: "found out",
    pattern: /\bfound out\b/gi,
    recommendedReplacement: "determined",
    alternatives: ["ascertained", "established", "verified"],
    explanation:
      "Use 'determined' or 'established' instead of 'found out' when reporting completed investigations or study results.",
    usageContext: "Past-tense research & incident documentation",
  },
  {
    id: "rule-a-lot-of",
    informalPhrase: "a lot of",
    pattern: /\ba lot of\b|\blots of\b/gi,
    recommendedReplacement: "numerous",
    alternatives: ["substantial", "multiple", "extensive"],
    explanation:
      "'A lot of' and 'lots of' are conversational. Use 'numerous' for countable nouns or 'substantial' for uncountable nouns.",
    usageContext: "Academic essays, feasibility studies & executive summaries",
  },
  {
    id: "rule-get-better",
    informalPhrase: "get better",
    pattern: /\bget(?:s|ting)? better\b/gi,
    recommendedReplacement: "improve",
    alternatives: ["enhance", "strengthen", "advance"],
    explanation:
      "Use precise verbs such as 'improve' or 'enhance' instead of 'get better' when describing performance or operational gains.",
    usageContext: "Performance appraisals & operational reviews",
  },
  {
    id: "rule-talk-about",
    informalPhrase: "talk about",
    pattern: /\btalk(?:s|ed|ing)? about\b/gi,
    recommendedReplacement: "discuss",
    alternatives: ["examine", "address", "articulate"],
    explanation:
      "Replace 'talk about' with 'discuss', 'examine', or 'articulate' in formal meeting minutes and academic papers.",
    usageContext: "Committee agendas, minutes & literature reviews",
  },
  {
    id: "rule-show",
    informalPhrase: "show",
    pattern: /\bshow(?:s|n|ed|ing)?\b/gi,
    recommendedReplacement: "demonstrate",
    alternatives: ["illustrate", "indicate", "evince"],
    explanation:
      "In formal writing, 'demonstrate' or 'indicate' conveys stronger evidentiary support than 'show'.",
    usageContext: "Competency assessments & empirical data reporting",
  },
  {
    id: "rule-help",
    informalPhrase: "help",
    pattern: /\bhelp(?:s|ed|ing)?\b/gi,
    recommendedReplacement: "assist",
    alternatives: ["facilitate", "support", "enable"],
    explanation:
      "Prefer 'assist' (for people) or 'facilitate' (for processes) over 'help' in formal business writing.",
    usageContext: "Job descriptions, SOPs & stakeholder correspondence",
  },
  {
    id: "rule-make-sure",
    informalPhrase: "make sure",
    pattern: /\bmake(?:s|ing)? sure\b|\bmade sure\b/gi,
    recommendedReplacement: "ensure",
    alternatives: ["guarantee", "verify", "safeguard"],
    explanation:
      "'Ensure' is the standard formal verb for policies, internal controls, and compliance documentation.",
    usageContext: "Compliance manuals, HR policies & contracts",
  },
  {
    id: "rule-back-up",
    informalPhrase: "back up",
    pattern: /\bback(?:s|ed|ing)? up\b/gi,
    recommendedReplacement: "substantiate",
    alternatives: ["corroborate", "validate", "verify"],
    explanation:
      "Use 'substantiate' or 'corroborate' instead of 'back up' when supporting claims with data or documentation.",
    usageContext: "Academic arguments & appraisal justifications",
  },
  {
    id: "rule-send-out",
    informalPhrase: "send out",
    pattern: /\bsend(?:s|ing)? out\b|\bsent out\b/gi,
    recommendedReplacement: "disseminate",
    alternatives: ["circulate", "distribute", "issue"],
    explanation:
      "Use 'disseminate' or 'circulate' when referring to official memoranda, policies, or survey instruments.",
    usageContext: "Internal corporate communications & policy rollouts",
  },
  {
    id: "rule-look-into",
    informalPhrase: "look into",
    pattern: /\blook(?:s|ed|ing)? into\b/gi,
    recommendedReplacement: "investigate",
    alternatives: ["evaluate", "examine", "review"],
    explanation:
      "Replace the phrasal verb 'look into' with 'investigate' or 'examine' in administrative and HR reports.",
    usageContext: "Grievance handling & audit inquiries",
  },
  {
    id: "rule-set-up",
    informalPhrase: "set up",
    pattern: /\bset(?:s|ting)? up\b/gi,
    recommendedReplacement: "establish",
    alternatives: ["institute", "implement", "configure"],
    explanation:
      "Use 'establish' or 'implement' instead of 'set up' when describing organizational systems, policies, or ventures.",
    usageContext: "Business planning & organizational design",
  },
  {
    id: "rule-put-off",
    informalPhrase: "put off",
    pattern: /\bput(?:s|ting)? off\b/gi,
    recommendedReplacement: "postpone",
    alternatives: ["defer", "reschedule", "adjourn"],
    explanation:
      "Use 'postpone' or 'defer' rather than 'put off' in formal scheduling and project management notices.",
    usageContext: "Project schedules & official notices",
  },
  {
    id: "rule-deal-with",
    informalPhrase: "deal with",
    pattern: /\bdeal(?:s|ing)? with\b|\bdealt with\b/gi,
    recommendedReplacement: "address",
    alternatives: ["manage", "resolve", "mitigate"],
    explanation:
      "Replace 'deal with' with 'address', 'manage', or 'mitigate' to convey professional accountability.",
    usageContext: "Employee relations, risk management & client service",
  },
  {
    id: "rule-ask-for",
    informalPhrase: "ask for",
    pattern: /\bask(?:s|ed|ing)? for\b/gi,
    recommendedReplacement: "request",
    alternatives: ["requisition", "solicit", "apply for"],
    explanation:
      "Use 'request' or 'solicit' instead of 'ask for' in business correspondence and procurement memos.",
    usageContext: "Formal letters, budget requests & procurement",
  },
  {
    id: "rule-point-out",
    informalPhrase: "point out",
    pattern: /\bpoint(?:s|ed|ing)? out\b/gi,
    recommendedReplacement: "indicate",
    alternatives: ["highlight", "emphasize", "note"],
    explanation:
      "Use 'indicate', 'highlight', or 'emphasize' instead of 'point out' in analytical writing.",
    usageContext: "Executive briefings & case study analysis",
  },
  {
    id: "rule-cut-down",
    informalPhrase: "cut down",
    pattern: /\bcut(?:s|ting)? down\b/gi,
    recommendedReplacement: "reduce",
    alternatives: ["minimize", "curtail", "mitigate"],
    explanation:
      "Replace 'cut down' with 'reduce' or 'minimize' when discussing expenses, turnover, or operational waste.",
    usageContext: "Cost control & workforce retention reports",
  },
  {
    id: "rule-keep-up",
    informalPhrase: "keep up",
    pattern: /\bkeep(?:s|ing)? up\b|\bkept up\b/gi,
    recommendedReplacement: "maintain",
    alternatives: ["sustain", "preserve", "uphold"],
    explanation:
      "Use 'maintain' or 'sustain' instead of 'keep up' when referring to quality standards or compliance.",
    usageContext: "Quality assurance & performance standards",
  },
  {
    id: "rule-pay-package",
    informalPhrase: "pay package",
    pattern: /\bpay package(?:s)?\b/gi,
    recommendedReplacement: "remuneration package",
    alternatives: ["compensation structure", "total rewards package"],
    explanation:
      "In HRM and employment contracts, use 'remuneration package' or 'compensation structure' instead of 'pay package'.",
    usageContext: "Compensation & benefits administration",
  },
  {
    id: "rule-put-together",
    informalPhrase: "put together",
    pattern: /\bput(?:s|ting)? together\b/gi,
    recommendedReplacement: "synthesize",
    alternatives: ["compile", "consolidate", "formulate"],
    explanation:
      "Use 'synthesize', 'compile', or 'formulate' instead of 'put together' when preparing reports or proposals.",
    usageContext: "Research synthesis & proposal preparation",
  },
];

function matchCapitalization(source: string, replacement: string): string {
  if (!source || !replacement) return replacement;
  if (source === source.toUpperCase() && source.length > 1) {
    return replacement.toUpperCase();
  }
  const firstChar = source.charAt(0);
  if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function sanitizeWritingInput(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 2500);
}

export function analyzeAcademicWriting(rawInput: string): WritingImprovementResult {
  const originalText = sanitizeWritingInput(rawInput);

  if (!originalText) {
    return {
      originalText: "",
      improvedText: "",
      suggestions: [],
      wordCount: 0,
      sentenceCount: 0,
      formalityScorePct: 100,
      disclaimer: WRITING_IMPROVEMENT_DISCLAIMER,
    };
  }

  const rawMatches: WritingImprovementSuggestion[] = [];

  for (const rule of PHRASE_REPLACEMENT_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null = regex.exec(originalText);
    while (match !== null) {
      const matchedText = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + matchedText.length;

      // Avoid overlapping matches
      const overlaps = rawMatches.some(
        (existing) => startIndex < existing.endIndex && endIndex > existing.startIndex
      );

      if (!overlaps) {
        const casedReplacement = matchCapitalization(
          matchedText,
          rule.recommendedReplacement
        );
        rawMatches.push({
          id: `${rule.id}-${startIndex}`,
          matchedText,
          startIndex,
          endIndex,
          informalPhrase: rule.informalPhrase,
          recommendedReplacement: casedReplacement,
          alternatives: rule.alternatives.map((alt) =>
            matchCapitalization(matchedText, alt)
          ),
          explanation: rule.explanation,
          usageContext: rule.usageContext,
        });
      }

      match = regex.exec(originalText);
    }
  }

  const suggestions = rawMatches.sort((a, b) => a.startIndex - b.startIndex);

  let improvedText = "";
  let cursor = 0;
  for (const suggestion of suggestions) {
    improvedText += originalText.slice(cursor, suggestion.startIndex);
    improvedText += suggestion.recommendedReplacement;
    cursor = suggestion.endIndex;
  }
  improvedText += originalText.slice(cursor);

  const words = originalText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = originalText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sentenceCount = Math.max(1, sentences.length);

  // Calculate a transparent rule-based formality indicator
  const penalty = suggestions.length * 12;
  const formalityScorePct = Math.max(20, Math.min(100, 100 - penalty));

  return {
    originalText,
    improvedText,
    suggestions,
    wordCount,
    sentenceCount,
    formalityScorePct,
    disclaimer: WRITING_IMPROVEMENT_DISCLAIMER,
  };
}

