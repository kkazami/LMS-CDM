import { WORDWISE_CATEGORIES } from "./content-bank";
import type {
  VocabularyWordItem,
  WordWiseCategorySlug,
  WordWiseDifficulty,
  WordWisePartOfSpeech,
} from "./types";

interface BuiltinGeneralWord {
  word: string;
  pronunciation: string;
  partOfSpeech: WordWisePartOfSpeech;
  simpleDefinition: string;
  formalDefinition: string;
  informalEquivalent?: string;
  difficulty: WordWiseDifficulty;
  categorySlug: WordWiseCategorySlug;
  synonyms: string[];
  antonyms: string[];
  example1: string;
  example2: string;
}

const EXTENDED_GENERAL_LEXICON: readonly BuiltinGeneralWord[] = [
  {
    word: "Coherent",
    pronunciation: "/koʊˈhɪr.ənt/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Logical, clear, and well-organized so that all parts fit together smoothly.",
    formalDefinition:
      "Unified and logically consistent in structure, reasoning, and expression across an argument or text.",
    informalEquivalent: "Makes sense / well put together",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    synonyms: ["Logical", "Consistent", "Lucid", "Articulate"],
    antonyms: ["Incoherent", "Disjointed", "Fragmented", "Muddled"],
    example1:
      "Topic sentences and transition words help transform separate notes into a coherent essay.",
    example2:
      "The speaker presented a coherent argument supported by clear historical examples.",
  },
  {
    word: "Corroborate",
    pronunciation: "/kəˈrɒb.ə.reɪt/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To confirm or give support to a statement, theory, or finding with independent evidence.",
    formalDefinition:
      "To strengthen or confirm the validity of an assertion or empirical finding through independent, converging evidence.",
    informalEquivalent: "Back up / confirm",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    synonyms: ["Confirm", "Substantiate", "Verify", "Validate"],
    antonyms: ["Contradict", "Refute", "Disprove", "Undermine"],
    example1:
      "Follow-up interviews were conducted to corroborate the trends observed in the written survey.",
    example2:
      "Independent laboratory tests corroborated the student's experimental measurements.",
  },
  {
    word: "Prevalent",
    pronunciation: "/ˈprɛv.ə.lənt/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Widespread and commonly found in a particular area, group, or time period.",
    formalDefinition:
      "Generally accepted, practiced, or occurring widely across a specified population or temporal context.",
    informalEquivalent: "Common / widespread",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    synonyms: ["Widespread", "Common", "Pervasive", "Predominant"],
    antonyms: ["Rare", "Uncommon", "Infrequent", "Isolated"],
    example1:
      "Digital note-taking has become increasingly prevalent among first-year university students.",
    example2:
      "The essay examines why certain study misconceptions remain prevalent despite scientific research.",
  },
  {
    word: "Acquire",
    pronunciation: "/əˈkwaɪər/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To gain, learn, or come into possession of a skill, habit, or object through effort.",
    formalDefinition:
      "To obtain, develop, or internalize knowledge, proficiency, or resources through deliberate study or experience.",
    informalEquivalent: "Get / pick up",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    synonyms: ["Obtain", "Attain", "Gain", "Cultivate"],
    antonyms: ["Lose", "Forfeit", "Relinquish"],
    example1:
      "Students acquire strong analytical writing skills through regular reading and guided revision.",
    example2:
      "The university library recently acquired digital access to three hundred international journals.",
  },
  {
    word: "Utilize",
    pronunciation: "/ˈjuː.tɪ.laɪz/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To make practical and effective use of a resource, tool, or method.",
    formalDefinition:
      "To employ or put a method, instrument, or resource to purposeful, strategic, and practical use.",
    informalEquivalent: "Use",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    synonyms: ["Employ", "Apply", "Deploy", "Exercise"],
    antonyms: ["Neglect", "Waste", "Misuse"],
    example1:
      "Researchers utilized a mixed-methods design to capture both statistical trends and student narratives.",
    example2:
      "Effective learners utilize spaced repetition flashcards to retain academic terminology.",
  },
  {
    word: "Meticulous",
    pronunciation: "/məˈtɪk.jʊ.ləs/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Showing great attention to detail; very careful, thorough, and precise.",
    formalDefinition:
      "Marked by extreme care, precision, and scrupulous attention to fine detail in execution or analysis.",
    informalEquivalent: "Super careful / detail-oriented",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    synonyms: ["Thorough", "Scrupulous", "Precise", "Painstaking"],
    antonyms: ["Careless", "Sloppy", "Negligent", "Haphazard"],
    example1:
      "Meticulous note-taking during lectures makes exam preparation much more efficient.",
    example2:
      "The historian was praised for her meticulous documentation of primary archival sources.",
  },
  {
    word: "Resilience",
    pronunciation: "/rɪˈzɪl.jəns/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "The capacity to recover quickly from difficulties, setbacks, or challenges.",
    formalDefinition:
      "The psychological or structural capacity to adapt positively and recover equilibrium following adversity or stress.",
    informalEquivalent: "Bouncing back / toughness",
    difficulty: "BEGINNER",
    categorySlug: "analytical-descriptive",
    synonyms: ["Adaptability", "Perseverance", "Fortitude", "Endurance"],
    antonyms: ["Fragility", "Vulnerability", "Helplessness"],
    example1:
      "Academic resilience enables students to view challenging feedback as an opportunity for growth.",
    example2:
      "The study explores how supportive peer networks foster resilience during the first year of college.",
  },
  {
    word: "Eloquent",
    pronunciation: "/ˈɛl.ə.kwənt/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Fluent, persuasive, and expressive in speaking or writing.",
    formalDefinition:
      "Characterized by forceful, fluent, and appropriate expression that moves or persuades an audience.",
    informalEquivalent: "Well-spoken / smooth with words",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    synonyms: ["Articulate", "Expressive", "Persuasive", "Well-spoken"],
    antonyms: ["Inarticulate", "Hesitant", "Tongue-tied"],
    example1:
      "The keynote speaker delivered an eloquent defense of liberal arts education.",
    example2:
      "Reading classic essays helps students develop a more eloquent and confident writing voice.",
  },
  {
    word: "Benevolent",
    pronunciation: "/bəˈnɛv.ə.lənt/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Well-meaning, kind, and motivated by a desire to help others.",
    formalDefinition:
      "Characterized by goodwill, charitable intent, and a disposition to promote the welfare of others.",
    informalEquivalent: "Kind-hearted / generous",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    synonyms: ["Charitable", "Altruistic", "Compassionate", "Magnanimous"],
    antonyms: ["Malevolent", "Selfish", "Hostile", "Unkind"],
    example1:
      "A benevolent alumni foundation funded scholarships for fifty incoming undergraduate students.",
    example2:
      "The philosopher argued that benevolent actions strengthen social trust within a community.",
  },
  {
    word: "Catalyst",
    pronunciation: "/ˈkæt.ə.lɪst/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "An event, person, or factor that sparks significant change or action.",
    formalDefinition:
      "An agent, stimulus, or event that precipitates or accelerates a significant transformation or process.",
    informalEquivalent: "Spark / trigger",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    synonyms: ["Stimulus", "Impetus", "Spark", "Incentive"],
    antonyms: ["Deterrent", "Obstacle", "Hindrance"],
    example1:
      "The invention of the printing press served as a catalyst for widespread literacy across Europe.",
    example2:
      "Participating in the debate tournament was a catalyst for her interest in public policy.",
  },
  {
    word: "Dichotomy",
    pronunciation: "/daɪˈkɒt.ə.mi/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "A sharp division or contrast between two things that are represented as opposites.",
    formalDefinition:
      "A division or contrast between two mutually exclusive or contradictory groups, concepts, or categories.",
    informalEquivalent: "Split / two-way divide",
    difficulty: "ADVANCED",
    categorySlug: "critical-argumentation",
    synonyms: ["Contrast", "Division", "Polarity", "Split"],
    antonyms: ["Unity", "Synthesis", "Continuum"],
    example1:
      "The author challenges the false dichotomy between creative expression and rigorous academic structure.",
    example2:
      "Rather than presenting a strict dichotomy, the study views learning styles along a flexible spectrum.",
  },
  {
    word: "Ephemeral",
    pronunciation: "/ɪˈfɛm.ər.əl/",
    partOfSpeech: "Adjective",
    simpleDefinition: "Lasting for a very short time; fleeting or temporary.",
    formalDefinition:
      "Enduring for only a brief period; transitory and rapidly fading in relevance or existence.",
    informalEquivalent: "Short-lived / passing",
    difficulty: "ADVANCED",
    categorySlug: "analytical-descriptive",
    synonyms: ["Transient", "Fleeting", "Transitory", "Momentary"],
    antonyms: ["Permanent", "Enduring", "Perpetual", "Lasting"],
    example1:
      "Unlike ephemeral social media trends, foundational critical thinking skills remain valuable for a lifetime.",
    example2:
      "Cramming the night before an exam often produces ephemeral recall rather than deep understanding.",
  },
  {
    word: "Lucid",
    pronunciation: "/ˈluː.sɪd/",
    partOfSpeech: "Adjective",
    simpleDefinition: "Expressed clearly; easy to understand and follow.",
    formalDefinition:
      "Readilyintelligible, transparent in reasoning, and free from obscurity or confusion in style.",
    informalEquivalent: "Crystal clear",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    synonyms: ["Clear", "Intelligible", "Coherent", "Transparent"],
    antonyms: ["Obscure", "Murky", "Confusing", "Convoluted"],
    example1:
      "The textbook ispopular among students because it offers lucid explanations of complex statistical concepts.",
    example2:
      "Even when discussing abstract philosophy, strive for lucid prose that guides the reader step by step.",
  },
  {
    word: "Perseverance",
    pronunciation: "/ˌpɜː.sɪˈvɪə.rəns/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "Continued steady effort to achieve a goal despite difficulties, obstacles, or delays.",
    formalDefinition:
      "Steadfast persistence in a course of action, inquiry, or purpose in spite of counterinfluences or discouragement.",
    informalEquivalent: "Grit / sticking with it",
    difficulty: "BEGINNER",
    categorySlug: "analytical-descriptive",
    synonyms: ["Persistence", "Tenacity", "Determination", "Resolve"],
    antonyms: ["Irresolution", "Surrender", "Inconstancy"],
    example1:
      "Completing an original undergraduate thesis requires curiosity, organization, and perseverance.",
    example2:
      "Her perseverance in practicing academic vocabulary paid off during the comprehensive examination.",
  },
  {
    word: "Serendipity",
    pronunciation: "/ˌsɛr.ənˈdɪp.ɪ.ti/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "The occurrence of finding valuable or agreeable things by fortunate chance.",
    formalDefinition:
      "The faculty or phenomenon of making fortunate, unexpected discoveries by accident while investigating another matter.",
    informalEquivalent: "Happy accident / lucky find",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    synonyms: ["Fortuity", "Chance discovery", "Good fortune"],
    antonyms: ["Misfortune", "Design", "Premeditation"],
    example1:
      "Many breakthroughs in the history of science combined rigorous preparation with a moment of serendipity.",
    example2:
      "Browsing the library shelves often leads to serendipity when you discover a book right next to the one you searched for.",
  },
  {
    word: "Altruism",
    pronunciation: "/ˈæl.tru.ɪ.zəm/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "Unselfish concern for the well-being of others, without expecting personal reward.",
    formalDefinition:
      "The principle and moral practice of disinterested and selfless concern for the welfare of other individuals.",
    informalEquivalent: "Selflessness",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    synonyms: ["Selflessness", "Benevolence", "Philanthropy", "Compassion"],
    antonyms: ["Egoism", "Self-interest", "Selfishness"],
    example1:
      "Social psychologists study how empathy and community norms encourage acts of altruism.",
    example2:
      "Peer mentoring programs thrive when upperclassmen volunteer out of genuine altruism.",
  },
  {
    word: "Verbose",
    pronunciation: "/vɜːˈboʊs/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Using or containing more words than are needed; overly wordy.",
    formalDefinition:
      "Characterized by the use of an excess of words, often obscuring clarity and weakening rhetorical impact.",
    informalEquivalent: "Wordy / long-winded",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    synonyms: ["Wordy", "Prolix", "Long-winded", "Circumlocutory"],
    antonyms: ["Concise", "Succinct", "Laconic", "Brief"],
    example1:
      "During revision, replace verbose phrases like 'due to the fact that' with the concise word 'because'.",
    example2:
      "A verbose introduction can distract readers from your central thesis statement.",
  },
  {
    word: "Tenacious",
    pronunciation: "/təˈneɪ.ʃəs/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Holding firmly to a goal, principle, or effort; persistent and determined.",
    formalDefinition:
      "Not readily relinquishing a position, principle, or course of inquiry; persistently determined.",
    informalEquivalent: "Determined / never giving up",
    difficulty: "ADVANCED",
    categorySlug: "analytical-descriptive",
    synonyms: ["Persistent", "Resolute", "Steadfast", "Persevering"],
    antonyms: ["Yielding", "Irresolute", "Half-hearted"],
    example1:
      "The investigative journalist was tenacious in verifying every claim through public records.",
    example2:
      "Tenacious researchers treat unexpected experimental results as clues rather than failures.",
  },
];

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitleCaseWord(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function mapPosString(rawPos: string | undefined): WordWisePartOfSpeech {
  const lower = (rawPos ?? "").toLowerCase();
  if (lower.includes("verb") && !lower.includes("adverb")) return "Verb";
  if (lower.includes("adverb") || lower === "adv") return "Adverb";
  if (lower.includes("adj")) return "Adjective";
  if (
    lower.includes("conjunction") ||
    lower.includes("preposition") ||
    lower.includes("phrase")
  ) {
    return "Phrase";
  }
  return "Noun";
}

function estimateDifficulty(word: string): WordWiseDifficulty {
  const len = word.trim().length;
  if (len <= 7) return "BEGINNER";
  if (len <= 10) return "INTERMEDIATE";
  return "ADVANCED";
}

function inferAcademicCategory(
  partOfSpeech: WordWisePartOfSpeech,
  definition: string
): WordWiseCategorySlug {
  const lower = definition.toLowerCase();
  if (partOfSpeech === "Adverb" || partOfSpeech === "Phrase") {
    return "transition-linking";
  }
  if (
    lower.includes("speak") ||
    lower.includes("write") ||
    lower.includes("express") ||
    lower.includes("communicat") ||
    lower.includes("discuss")
  ) {
    return "academic-communication";
  }
  if (
    lower.includes("argue") ||
    lower.includes("claim") ||
    lower.includes("logic") ||
    lower.includes("reason") ||
    lower.includes("belief") ||
    lower.includes("truth")
  ) {
    return "critical-argumentation";
  }
  if (partOfSpeech === "Adjective") {
    return "analytical-descriptive";
  }
  if (partOfSpeech === "Verb") {
    return "formal-english";
  }
  return "academic-vocabulary";
}

function generatePhoneticFallback(word: string): string {
  const clean = word.trim().toLowerCase();
  return `/${clean}/`;
}

function buildItemFromBuiltin(entry: BuiltinGeneralWord): VocabularyWordItem {
  const slug = normalizeSlug(entry.word);
  const category =
    WORDWISE_CATEGORIES.find((c) => c.slug === entry.categorySlug) ??
    WORDWISE_CATEGORIES[0]!;

  return {
    id: `ww-word-${slug}`,
    word: entry.word,
    slug,
    pronunciation: entry.pronunciation,
    partOfSpeech: entry.partOfSpeech,
    simpleDefinition: entry.simpleDefinition,
    formalDefinition: entry.formalDefinition,
    usageContext: `Used in college essays, academic reading, and formal communication when expressing ${entry.word.toLowerCase()} with precision.`,
    informalEquivalent: entry.informalEquivalent ?? null,
    formalUsageNote: `Use '${entry.word.toLowerCase()}' in formal writing and presentations to elevate clarity and academic tone.`,
    difficulty: entry.difficulty,
    categoryId: category.id,
    categorySlug: category.slug,
    categoryName: category.name,
    synonyms: entry.synonyms,
    antonyms: entry.antonyms,
    examples: [
      {
        id: `ww-ex-${slug}-1`,
        sentence: entry.example1,
        contextNote: "Academic writing & study context",
      },
      {
        id: `ww-ex-${slug}-2`,
        sentence: entry.example2,
        contextNote: "Formal usage example",
      },
    ],
  };
}

export function searchExtendedGeneralLexicon(
  query: string
): VocabularyWordItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return EXTENDED_GENERAL_LEXICON.map(buildItemFromBuiltin);
  }
  return EXTENDED_GENERAL_LEXICON.filter(
    (item) =>
      item.word.toLowerCase().includes(q) ||
      item.simpleDefinition.toLowerCase().includes(q) ||
      item.formalDefinition.toLowerCase().includes(q) ||
      (item.informalEquivalent ?? "").toLowerCase().includes(q) ||
      item.synonyms.some((s) => s.toLowerCase().includes(q))
  ).map(buildItemFromBuiltin);
}

interface FreeDictionaryEntry {
  word?: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string }>;
  meanings?: Array<{
    partOfSpeech?: string;
    synonyms?: string[];
    antonyms?: string[];
    definitions?: Array<{
      definition?: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
  }>;
}

interface DatamuseWordEntry {
  word?: string;
  defs?: string[];
  tags?: string[];
}

export async function lookupGeneralEnglishWord(
  rawQuery: string
): Promise<VocabularyWordItem | null> {
  const cleaned = rawQuery.trim().replace(/\s+/g, " ");
  if (!/^[a-zA-Z][a-zA-Z\s'-]{1,40}$/.test(cleaned)) {
    return null;
  }

  const slug = normalizeSlug(cleaned);
  if (!slug) return null;

  // 1. Check built-in extended lexicon first for instant (<1ms) resolution
  const builtinMatch = EXTENDED_GENERAL_LEXICON.find(
    (w) => normalizeSlug(w.word) === slug
  );
  if (builtinMatch) {
    return buildItemFromBuiltin(builtinMatch);
  }

  // 2. Query Free Dictionary API (https://api.dictionaryapi.dev)
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        cleaned.toLowerCase()
      )}`,
      {
        signal: AbortSignal.timeout(3500),
        headers: { Accept: "application/json" },
      }
    );

    if (res.ok) {
      const payload = (await res.json()) as unknown;
      if (Array.isArray(payload) && payload.length > 0) {
        const entry = payload[0] as FreeDictionaryEntry;
        const headword = toTitleCaseWord(entry.word ?? cleaned);
        const wordSlug = normalizeSlug(headword);
        const phonetic =
          entry.phonetic ||
          entry.phonetics?.find((p) => p.text && p.text.trim().length > 0)
            ?.text ||
          generatePhoneticFallback(headword);

        const meanings = entry.meanings ?? [];
        const primaryMeaning = meanings[0];
        const partOfSpeech = mapPosString(primaryMeaning?.partOfSpeech);

        const allDefs: string[] = [];
        const allExamples: string[] = [];
        const synSet = new Set<string>();
        const antSet = new Set<string>();

        for (const m of meanings) {
          for (const s of m.synonyms ?? []) {
            if (s.trim()) synSet.add(toTitleCaseWord(s));
          }
          for (const a of m.antonyms ?? []) {
            if (a.trim()) antSet.add(toTitleCaseWord(a));
          }
          for (const d of m.definitions ?? []) {
            if (d.definition && d.definition.trim()) {
              allDefs.push(d.definition.trim());
            }
            if (d.example && d.example.trim()) {
              allExamples.push(d.example.trim());
            }
            for (const s of d.synonyms ?? []) {
              if (s.trim()) synSet.add(toTitleCaseWord(s));
            }
            for (const a of d.antonyms ?? []) {
              if (a.trim()) antSet.add(toTitleCaseWord(a));
            }
          }
        }

        if (allDefs.length > 0) {
          const simpleDefinition = allDefs[0]!;
          const formalDefinition =
            allDefs.length > 1
              ? `${allDefs[0]} In formal and academic contexts: ${allDefs[1]}`
              : `${simpleDefinition} Used in formal English and academic discourse for precise expression.`;

          const categorySlug = inferAcademicCategory(
            partOfSpeech,
            simpleDefinition
          );
          const category =
            WORDWISE_CATEGORIES.find((c) => c.slug === categorySlug) ??
            WORDWISE_CATEGORIES[0]!;

          const synonyms =
            synSet.size > 0
              ? Array.from(synSet).slice(0, 6)
              : ["Related term", "Equivalent expression"];
          const antonyms =
            antSet.size > 0
              ? Array.from(antSet).slice(0, 4)
              : ["Opposite concept"];

          const examples = [
            {
              id: `ww-ex-dict-${wordSlug}-1`,
              sentence:
                allExamples[0] ??
                `In academic writing, understanding the precise meaning of "${headword.toLowerCase()}" strengthens analytical clarity.`,
              contextNote: "General & academic English usage",
            },
            {
              id: `ww-ex-dict-${wordSlug}-2`,
              sentence:
                allExamples[1] ??
                `Students can use "${headword.toLowerCase()}" in essays and discussions to express their ideas accurately.`,
              contextNote: "Student writing application",
            },
          ];

          return {
            id: `ww-dict-${wordSlug}`,
            word: headword,
            slug: wordSlug,
            pronunciation: phonetic,
            partOfSpeech,
            simpleDefinition,
            formalDefinition,
            usageContext: `General & academic English dictionary entry (${partOfSpeech.toLowerCase()}). Suitable for student reading comprehension, essays, and formal communication.`,
            informalEquivalent: null,
            formalUsageNote: `When using "${headword.toLowerCase()}" in an essay or presentation, ensure its ${partOfSpeech.toLowerCase()} form matches your sentence structure.`,
            difficulty: estimateDifficulty(headword),
            categoryId: category.id,
            categorySlug: category.slug,
            categoryName: category.name,
            synonyms,
            antonyms,
            examples,
          };
        }
      }
    }
  } catch {
    // Proceed to Datamuse lexical fallback
  }

  // 3. Fallback: Datamuse Open Lexical API (WordNet / Wiktionary definitions)
  try {
    const [defRes, synRes, antRes] = await Promise.all([
      fetch(
        `https://api.datamuse.com/words?sp=${encodeURIComponent(
          cleaned.toLowerCase()
        )}&qe=sp&md=dpfr&max=1`,
        { signal: AbortSignal.timeout(3500) }
      ),
      fetch(
        `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(
          cleaned.toLowerCase()
        )}&max=5`,
        { signal: AbortSignal.timeout(2500) }
      ).catch(() => null),
      fetch(
        `https://api.datamuse.com/words?rel_ant=${encodeURIComponent(
          cleaned.toLowerCase()
        )}&max=4`,
        { signal: AbortSignal.timeout(2500) }
      ).catch(() => null),
    ]);

    if (defRes.ok) {
      const items = (await defRes.json()) as DatamuseWordEntry[];
      const match = items[0];
      if (match && Array.isArray(match.defs) && match.defs.length > 0) {
        const headword = toTitleCaseWord(match.word ?? cleaned);
        const wordSlug = normalizeSlug(headword);
        const rawFirstDef = match.defs[0]!;
        const [posPrefix, ...defParts] = rawFirstDef.split("\t");
        const parsedPos =
          posPrefix === "v"
            ? "Verb"
            : posPrefix === "adj"
              ? "Adjective"
              : posPrefix === "adv"
                ? "Adverb"
                : "Noun";
        const simpleDefinition = defParts.join(" ").trim() || rawFirstDef;
        const secondDef =
          match.defs.length > 1
            ? match.defs[1]!.split("\t").slice(1).join(" ").trim()
            : "";
        const formalDefinition = secondDef
          ? `${simpleDefinition}; furthermore, in formal usage: ${secondDef}.`
          : `${simpleDefinition}. Recognized in general and academic English lexicons.`;

        const synList: string[] = [];
        if (synRes && synRes.ok) {
          const synJson = (await synRes.json()) as Array<{ word?: string }>;
          for (const s of synJson) {
            if (s.word) synList.push(toTitleCaseWord(s.word));
          }
        }
        const antList: string[] = [];
        if (antRes && antRes.ok) {
          const antJson = (await antRes.json()) as Array<{ word?: string }>;
          for (const a of antJson) {
            if (a.word) antList.push(toTitleCaseWord(a.word));
          }
        }

        const categorySlug = inferAcademicCategory(parsedPos, simpleDefinition);
        const category =
          WORDWISE_CATEGORIES.find((c) => c.slug === categorySlug) ??
          WORDWISE_CATEGORIES[0]!;

        return {
          id: `ww-dict-${wordSlug}`,
          word: headword,
          slug: wordSlug,
          pronunciation: generatePhoneticFallback(headword),
          partOfSpeech: parsedPos,
          simpleDefinition,
          formalDefinition,
          usageContext: `General English dictionary entry (${parsedPos.toLowerCase()}) for student reading comprehension and vocabulary expansion.`,
          informalEquivalent: null,
          formalUsageNote: `Use "${headword.toLowerCase()}" accurately as a ${parsedPos.toLowerCase()} in academic or formal writing.`,
          difficulty: estimateDifficulty(headword),
          categoryId: category.id,
          categorySlug: category.slug,
          categoryName: category.name,
          synonyms:
            synList.length > 0
              ? synList
              : ["Similar term", "Contextual synonym"],
          antonyms:
            antList.length > 0 ? antList : ["Contrasting term"],
          examples: [
            {
              id: `ww-ex-dm-${wordSlug}-1`,
              sentence: `Understanding the meaning of "${headword.toLowerCase()}" (${simpleDefinition.toLowerCase()}) helps students read complex texts with confidence.`,
              contextNote: "Reading comprehension context",
            },
            {
              id: `ww-ex-dm-${wordSlug}-2`,
              sentence: `The student incorporated "${headword.toLowerCase()}" into her essay to express the concept with greater precision.`,
              contextNote: "Academic writing application",
            },
          ],
        };
      }
    }
  } catch {
    // Ignore network timeout in offline environments
  }

  return null;
}

const ARPABET_TO_IPA: Record<string, string> = {
  AA: "ɑ", AE: "æ", AH: "ə", AO: "ɔ", AW: "aʊ", AY: "aɪ",
  B: "b", CH: "tʃ", D: "d", DH: "ð", EH: "ɛ", ER: "ɜr",
  EY: "eɪ", F: "f", G: "ɡ", HH: "h", IH: "ɪ", IY: "i",
  JH: "dʒ", K: "k", L: "l", M: "m", N: "n", NG: "ŋ",
  OW: "oʊ", OY: "ɔɪ", P: "p", R: "r", S: "s", SH: "ʃ",
  T: "t", TH: "θ", UH: "ʊ", UW: "u", V: "v", W: "w",
  Y: "j", Z: "z", ZH: "ʒ",
};

function convertDatamusePronToIpa(tags?: string[], fallbackWord = ""): string {
  const pronTag = tags?.find((t) => t.startsWith("pron:"));
  if (pronTag) {
    const tokens = pronTag.slice(5).trim().split(/\s+/);
    let ipa = "";
    for (const tok of tokens) {
      const stress = tok.endsWith("1") ? "ˈ" : tok.endsWith("2") ? "ˌ" : "";
      const base = tok.replace(/[012]$/, "");
      const mapped = ARPABET_TO_IPA[base];
      if (mapped) {
        ipa += stress + mapped;
      }
    }
    if (ipa) return `/${ipa}/`;
  }
  return generatePhoneticFallback(fallbackWord);
}

/**
 * Searches the Free Internet Dictionary (Free Dictionary API + Datamuse WordNet/Wiktionary)
 * directly for default academic view, A-Z letter browse, exact headwords, and prefix matches.
 * Safe to call directly from the browser so it uses 0 Vercel CPU and 0 Neon DB writes.
 */
export async function searchFreeInternetDictionary(
  rawQuery: string,
  signal?: AbortSignal
): Promise<VocabularyWordItem[]> {
  const cleaned = rawQuery.trim().replace(/\s+/g, " ");
  if (cleaned.length > 0 && !/^[a-zA-Z][a-zA-Z\s'-]{0,40}$/.test(cleaned)) {
    return [];
  }

  const resultsBySlug = new Map<string, VocabularyWordItem>();

  const datamuseUrl =
    cleaned.length === 0
      ? "https://api.datamuse.com/words?ml=academic+analysis+strategy&md=dpfr&max=54"
      : `https://api.datamuse.com/words?sp=${encodeURIComponent(
          cleaned.toLowerCase()
        )}*&md=dpfr&max=54`;

  // Fetch exact headword (Free Dictionary API / Datamuse) and live list in parallel
  const [exactItem, prefixEntries] = await Promise.all([
    cleaned.length >= 2
      ? lookupGeneralEnglishWord(cleaned).catch(() => null)
      : Promise.resolve(null),
    fetch(datamuseUrl, { signal: signal ?? AbortSignal.timeout(4000) })
      .then((r) => (r.ok ? (r.json() as Promise<DatamuseWordEntry[]>) : []))
      .catch(() => [] as DatamuseWordEntry[]),
  ]);

  if (exactItem) {
    resultsBySlug.set(exactItem.slug, exactItem);
  }

  for (const entry of prefixEntries) {
    if (!entry.word || !Array.isArray(entry.defs) || entry.defs.length === 0) {
      continue;
    }
    if (!/^[a-zA-Z][a-zA-Z-]{1,30}$/.test(entry.word)) {
      continue;
    }
    const headword = toTitleCaseWord(entry.word);
    const wordSlug = normalizeSlug(headword);
    if (!wordSlug || resultsBySlug.has(wordSlug)) continue;

    const rawFirstDef = entry.defs[0]!;
    const [posPrefix, ...defParts] = rawFirstDef.split("\t");
    const parsedPos: WordWisePartOfSpeech =
      posPrefix === "v"
        ? "Verb"
        : posPrefix === "adj"
          ? "Adjective"
          : posPrefix === "adv"
            ? "Adverb"
            : "Noun";
    const simpleDefinition = defParts.join(" ").trim() || rawFirstDef;
    const secondDef =
      entry.defs.length > 1
        ? entry.defs[1]!.split("\t").slice(1).join(" ").trim()
        : "";
    const formalDefinition = secondDef
      ? `${simpleDefinition} • Additional sense: ${secondDef}`
      : simpleDefinition;

    const categorySlug = inferAcademicCategory(parsedPos, simpleDefinition);
    const category =
      WORDWISE_CATEGORIES.find((c) => c.slug === categorySlug) ??
      WORDWISE_CATEGORIES[0]!;

    const extraDefs = entry.defs
      .slice(1, 3)
      .map((d) => d.split("\t").slice(1).join(" ").trim())
      .filter(Boolean);

    resultsBySlug.set(wordSlug, {
      id: `ww-dict-${wordSlug}`,
      word: headword,
      slug: wordSlug,
      pronunciation: convertDatamusePronToIpa(entry.tags, headword),
      partOfSpeech: parsedPos,
      simpleDefinition,
      formalDefinition,
      usageContext: `Live English Dictionary (${parsedPos}) • WordNet / Wiktionary`,
      informalEquivalent: null,
      formalUsageNote:
        extraDefs[0] ||
        `Verified ${parsedPos.toLowerCase()} entry from the live English lexical database.`,
      difficulty: estimateDifficulty(headword),
      categoryId: category.id,
      categorySlug: category.slug,
      categoryName: category.name,
      synonyms: [],
      antonyms: [],
      examples: extraDefs.map((d, idx) => ({
        id: `ww-ex-dm-${wordSlug}-${idx + 1}`,
        sentence: d,
        contextNote: `Dictionary sense ${idx + 2}`,
      })),
    });
  }

  return Array.from(resultsBySlug.values());
}


