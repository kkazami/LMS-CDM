import type {
  FormalInformalComparisonItem,
  VocabularyCategoryItem,
  VocabularyWordItem,
  WordWiseCategorySlug,
  WordWiseDifficulty,
  WordWisePartOfSpeech,
} from "./types";
import { EXTENDED_SEED_VOCABULARY_WORDS } from "./extended-seed-words";

export interface SeedVocabularyWord {
  id: string;
  word: string;
  slug: string;
  pronunciation: string;
  partOfSpeech: WordWisePartOfSpeech;
  simpleDefinition: string;
  formalDefinition: string;
  usageContext: string;
  informalEquivalent: string | null;
  formalUsageNote: string | null;
  difficulty: WordWiseDifficulty;
  categorySlug: WordWiseCategorySlug;
  synonyms: string[];
  antonyms: string[];
  examples: Array<{
    id: string;
    sentence: string;
    contextNote: string;
  }>;
}

export const WORDWISE_CATEGORIES: readonly Omit<
  VocabularyCategoryItem,
  "wordCount"
>[] = [
  {
    id: "ww-cat-academic",
    slug: "academic-vocabulary",
    name: "Academic Writing & Research",
    description:
      "Essential verbs, nouns, and concepts used in college essays, research papers, literature reviews, and academic inquiry.",
    sortOrder: 1,
  },
  {
    id: "ww-cat-formal",
    slug: "formal-english",
    name: "Formal Replacements",
    description:
      "High-utility formal words that replace casual or conversational phrasing in college essays, reports, and academic writing.",
    sortOrder: 2,
  },
  {
    id: "ww-cat-transitions",
    slug: "transition-linking",
    name: "Transition & Connecting Words",
    description:
      "Cohesive linking words and discourse markers for structuring logical arguments, contrasts, cause-and-effect, and conclusions.",
    sortOrder: 3,
  },
  {
    id: "ww-cat-analytical",
    slug: "analytical-descriptive",
    name: "Analytical & Descriptive",
    description:
      "Precise adjectives and analytical terms for evaluating evidence, describing scope, and expressing nuance in student writing.",
    sortOrder: 4,
  },
  {
    id: "ww-cat-argumentation",
    slug: "critical-argumentation",
    name: "Critical Reading & Argumentation",
    description:
      "Vocabulary for examining claims, synthesizing viewpoints, identifying assumptions, and defending a thesis in essays and debates.",
    sortOrder: 5,
  },
  {
    id: "ww-cat-comm",
    slug: "academic-communication",
    name: "Formal & Classroom Communication",
    description:
      "Vocabulary for academic presentations, seminar discussions, thesis defense, formal correspondence, and constructive peer feedback.",
    sortOrder: 6,
  },
] as const;

const CORE_SEED_VOCABULARY_WORDS: readonly SeedVocabularyWord[] = [
  // ─── 1. Academic Writing & Research ───
  {
    id: "ww-word-analyze",
    word: "Analyze",
    slug: "analyze",
    pronunciation: "/ˈæn.ə.laɪz/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To examine something carefully by breaking it into parts to understand how it works or what it means.",
    formalDefinition:
      "To examine methodically and in detail the constitution, structure, or interrelationships of a subject for purposes of explanation and interpretation.",
    usageContext:
      "Used in essay prompts, research papers, laboratory reports, and reading comprehension assignments.",
    informalEquivalent: "Look closely at / break down",
    formalUsageNote:
      "Use 'analyze' instead of 'look at' when explaining how you examined data, texts, or arguments in an academic paper.",
    difficulty: "BEGINNER",
    categorySlug: "academic-vocabulary",
    synonyms: ["Examine", "Evaluate", "Investigate", "Dissect"],
    antonyms: ["Ignore", "Overlook", "Guess"],
    examples: [
      {
        id: "ww-ex-analyze-1",
        sentence:
          "In the second section of the essay, we analyze how study habits influence long-term academic retention.",
        contextNote: "College essay structure",
      },
      {
        id: "ww-ex-analyze-2",
        sentence:
          "Students were asked to analyze three primary historical sources and compare their perspectives.",
        contextNote: "Critical reading assignment",
      },
    ],
  },
  {
    id: "ww-word-empirical",
    word: "Empirical",
    slug: "empirical",
    pronunciation: "/ɛmˈpɪr.ɪ.kəl/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Based on real observation, direct experience, or measurable evidence rather than pure theory.",
    formalDefinition:
      "Derived from or verifiable by observation, experiment, and quantitative or qualitative evidence rather than theoretical assumptions alone.",
    usageContext:
      "Used in research papers, science and social science essays, and literature reviews when citing real-world data.",
    informalEquivalent: "Real-world / hands-on",
    formalUsageNote:
      "Use 'empirical' in research papers and thesis chapters when referring to evidence gathered through experiments, surveys, or observation.",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    synonyms: ["Observational", "Evidence-based", "Experimental", "Factual"],
    antonyms: ["Theoretical", "Speculative", "Hypothetical", "Conjectural"],
    examples: [
      {
        id: "ww-ex-empirical-1",
        sentence:
          "The author supports her claim with empirical evidence collected from a two-year university study.",
        contextNote: "Academic research evaluation",
      },
      {
        id: "ww-ex-empirical-2",
        sentence:
          "Without empirical data, the argument remains an untested hypothesis rather than a proven conclusion.",
        contextNote: "Research methodology",
      },
    ],
  },
  {
    id: "ww-word-paradigm",
    word: "Paradigm",
    slug: "paradigm",
    pronunciation: "/ˈpær.ə.daɪm/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "A typical model, pattern, or framework for understanding how something works.",
    formalDefinition:
      "A distinct set of concepts, thought patterns, theories, and standards that constitutes a legitimate way of viewing reality within an intellectual discipline.",
    usageContext:
      "Used in theoretical frameworks, research papers, and reflective essays when discussing shifts in perspective.",
    informalEquivalent: "Way of thinking / model",
    formalUsageNote:
      "Use 'paradigm' when discussing a foundational model or a major shift in how scholars understand a topic.",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    synonyms: ["Framework", "Model", "Archetype", "Conceptual lens"],
    antonyms: ["Anomaly", "Exception", "Disorder"],
    examples: [
      {
        id: "ww-ex-paradigm-1",
        sentence:
          "Digital libraries have created a new paradigm for how university students access scholarly journals.",
        contextNote: "Educational technology essay",
      },
      {
        id: "ww-ex-paradigm-2",
        sentence:
          "Chapter Two introduces the theoretical paradigm that guides our qualitative analysis.",
        contextNote: "Thesis theoretical framework",
      },
    ],
  },
  {
    id: "ww-word-substantiate",
    word: "Substantiate",
    slug: "substantiate",
    pronunciation: "/səbˈstæn.ʃi.eɪt/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To prove or support a claim with reliable facts, citations, or evidence.",
    formalDefinition:
      "To provide competent, verifiable evidence or authoritative citations to establish the truth or validity of a proposition.",
    usageContext:
      "Used in argumentative essays, research critiques, and formal debates.",
    informalEquivalent: "Back up / prove",
    formalUsageNote:
      "Replace 'back up' with 'substantiate' when explaining how evidence or citations support your thesis statement.",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    synonyms: ["Corroborate", "Validate", "Verify", "Confirm"],
    antonyms: ["Refute", "Disprove", "Contradict", "Undermine"],
    examples: [
      {
        id: "ww-ex-substantiate-1",
        sentence:
          "Every major claim in your argumentative essay must be substantiated with peer-reviewed sources.",
        contextNote: "Academic writing rubric",
      },
      {
        id: "ww-ex-substantiate-2",
        sentence:
          "The researcher used statistical tables to substantiate the findings presented in the conclusion.",
        contextNote: "Research report writing",
      },
    ],
  },
  {
    id: "ww-word-methodology",
    word: "Methodology",
    slug: "methodology",
    pronunciation: "/ˌmɛθ.əˈdɒl.ə.dʒi/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "A structured system of methods and rules used to conduct a study or project.",
    formalDefinition:
      "A systematic, theoretical analysis of the procedures and principles applied to a field of study, inquiry, or investigation.",
    usageContext:
      "Used in thesis chapters, research proposals, science reports, and project documentation.",
    informalEquivalent: "How we did it",
    formalUsageNote:
      "Use 'methodology' when explaining the rationale and structured steps behind an inquiry or research design.",
    difficulty: "BEGINNER",
    categorySlug: "academic-vocabulary",
    synonyms: ["Approach", "Procedure", "System", "Framework"],
    antonyms: ["Haphazardness", "Improvisation", "Disorganization"],
    examples: [
      {
        id: "ww-ex-methodology-1",
        sentence:
          "Section three of the paper outlines the research methodology used to survey undergraduate students.",
        contextNote: "Academic research design",
      },
      {
        id: "ww-ex-methodology-2",
        sentence:
          "A clear methodology allows other scholars to replicate the study and verify its conclusions.",
        contextNote: "Scientific inquiry",
      },
    ],
  },
  {
    id: "ww-word-correlate",
    word: "Correlate",
    slug: "correlate",
    pronunciation: "/ˈkɒr.ə.leɪt/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To show a mutual relationship or connection between two or more things.",
    formalDefinition:
      "To establish or demonstrate a reciprocal or statistical relationship in which changes in one variable are associated with changes in another.",
    usageContext:
      "Used when interpreting survey results, statistics, and patterns in academic papers.",
    informalEquivalent: "Link / connect",
    formalUsageNote:
      "Use 'correlate' when discussing associations between variables without overclaiming direct causation.",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    synonyms: ["Associate", "Connect", "Parallel", "Correspond"],
    antonyms: ["Disconnect", "Dissociate", "Diverge"],
    examples: [
      {
        id: "ww-ex-correlate-1",
        sentence:
          "Consistent reading habits strongly correlate with higher vocabulary comprehension scores.",
        contextNote: "Educational research",
      },
      {
        id: "ww-ex-correlate-2",
        sentence:
          "The study examines how sleep duration correlates with students' problem-solving accuracy.",
        contextNote: "Quantitative study",
      },
    ],
  },
  {
    id: "ww-word-synthesize",
    word: "Synthesize",
    slug: "synthesize",
    pronunciation: "/ˈsɪn.θə.saɪz/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To combine separate ideas, facts, or sources into one clear, unified whole.",
    formalDefinition:
      "To integrate diverse data points, literature findings, or theoretical perspectives into a coherent analytical summary or framework.",
    usageContext:
      "Used in literature reviews, comparative essays, and comprehensive exam responses.",
    informalEquivalent: "Put together / combine",
    formalUsageNote:
      "Prefer 'synthesize' over 'put together' when combining multiple readings into an original analytical conclusion.",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    synonyms: ["Integrate", "Consolidate", "Unify", "Amalgamate"],
    antonyms: ["Separate", "Fragment", "Divide", "Isolate"],
    examples: [
      {
        id: "ww-ex-synthesize-1",
        sentence:
          "A strong literature review does not merely list articles; it synthesizes common themes across authors.",
        contextNote: "Literature review guide",
      },
      {
        id: "ww-ex-synthesize-2",
        sentence:
          "In your concluding paragraph, synthesize the main arguments to show how they answer the research question.",
        contextNote: "Essay composition",
      },
    ],
  },
  {
    id: "ww-word-hypothesis",
    word: "Hypothesis",
    slug: "hypothesis",
    pronunciation: "/haɪˈpɒθ.ə.sɪs/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "A testable proposed explanation for a phenomenon made as a starting point for investigation.",
    formalDefinition:
      "A supposition or proposed explanation formulated on the basis of limited evidence as a starting point for further empirical investigation.",
    usageContext:
      "Used in research proposals, experimental reports, and analytical essays.",
    informalEquivalent: "Educated guess",
    formalUsageNote:
      "Use 'hypothesis' rather than 'guess' when stating a testable prediction in a study or paper.",
    difficulty: "BEGINNER",
    categorySlug: "academic-vocabulary",
    synonyms: ["Proposition", "Postulate", "Premise", "Conjecture"],
    antonyms: ["Certainty", "Proof", "Axiom"],
    examples: [
      {
        id: "ww-ex-hypothesis-1",
        sentence:
          "Our initial hypothesis predicted that spaced repetition would double vocabulary retention over four weeks.",
        contextNote: "Experimental study",
      },
      {
        id: "ww-ex-hypothesis-2",
        sentence:
          "The data collected during the experiment supported the first hypothesis but rejected the second.",
        contextNote: "Research results discussion",
      },
    ],
  },

  // ─── 2. Formal Replacements for Everyday Words (8 words) ───
  {
    id: "ww-word-determine",
    word: "Determine",
    slug: "determine",
    pronunciation: "/dɪˈtɜː.mɪn/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To discover the exact facts about something or officially decide what will happen.",
    formalDefinition:
      "To ascertain or establish conclusively after investigation, calculation, or formal deliberation.",
    usageContext:
      "Replaces 'find out' in academic papers, research reports, and formal essays.",
    informalEquivalent: "Find out",
    formalUsageNote:
      "Use 'determine' instead of 'find out' in formal reports, research objectives, and academic essays.",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    synonyms: ["Ascertain", "Establish", "Verify", "Conclude"],
    antonyms: ["Guess", "Overlook", "Speculate"],
    examples: [
      {
        id: "ww-ex-determine-1",
        sentence:
          "The primary aim of this study is to determine the key factors that motivate self-directed learning.",
        contextNote: "Research objective statement",
      },
      {
        id: "ww-ex-determine-2",
        sentence:
          "Researchers analyzed the archive records to determine the exact date of the manuscript.",
        contextNote: "Historical analysis",
      },
    ],
  },
  {
    id: "ww-word-numerous",
    word: "Numerous",
    slug: "numerous",
    pronunciation: "/ˈnjuː.mə.rəs/",
    partOfSpeech: "Adjective",
    simpleDefinition: "Consisting of many items, individuals, or examples.",
    formalDefinition:
      "Comprising a large number of distinct instances, participants, or empirical observations.",
    usageContext:
      "Replaces conversational phrases like 'a lot of' or 'lots of' in formal academic writing.",
    informalEquivalent: "A lot of",
    formalUsageNote:
      "Use 'numerous' with countable plural nouns instead of 'a lot of' in academic prose.",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    synonyms: ["Multiple", "Abundant", "Extensive", "Several"],
    antonyms: ["Few", "Scarce", "Rare", "Limited"],
    examples: [
      {
        id: "ww-ex-numerous-1",
        sentence:
          "Numerous scholars have examined the relationship between bilingualism and cognitive flexibility.",
        contextNote: "Academic literature review",
      },
      {
        id: "ww-ex-numerous-2",
        sentence:
          "The author cites numerous historical examples to illustrate the resilience of local communities.",
        contextNote: "Analytical essay",
      },
    ],
  },
  {
    id: "ww-word-demonstrate",
    word: "Demonstrate",
    slug: "demonstrate",
    pronunciation: "/ˈdɛm.ən.streɪt/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To clearly show a skill, quality, or fact through evidence or examples.",
    formalDefinition:
      "To manifest, prove, or exhibit clearly through empirical evidence, logical reasoning, or structured presentation.",
    usageContext:
      "Replaces 'show' in essays, research findings, and academic presentations.",
    informalEquivalent: "Show",
    formalUsageNote:
      "Use 'demonstrate' instead of 'show' when explaining what your evidence or findings prove.",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    synonyms: ["Exhibit", "Illustrate", "Evince", "Manifest"],
    antonyms: ["Conceal", "Obscure", "Disprove"],
    examples: [
      {
        id: "ww-ex-demonstrate-1",
        sentence:
          "The experiment results demonstrate a clear improvement in reading speed after guided practice.",
        contextNote: "Research findings",
      },
      {
        id: "ww-ex-demonstrate-2",
        sentence:
          "Students must demonstrate critical thinking by evaluating both sides of the ethical dilemma.",
        contextNote: "Course learning outcome",
      },
    ],
  },
  {
    id: "ww-word-ensure",
    word: "Ensure",
    slug: "ensure",
    pronunciation: "/ɪnˈʃʊər/",
    partOfSpeech: "Verb",
    simpleDefinition: "To make certain that something happens or is accurate.",
    formalDefinition:
      "To guarantee or take deliberate procedural measures so that a required standard, outcome, or condition is fulfilled.",
    usageContext:
      "Replaces 'make sure' in research methods, project proposals, and formal writing.",
    informalEquivalent: "Make sure",
    formalUsageNote:
      "Always prefer 'ensure' over 'make sure' in academic papers, proposals, and formal correspondence.",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    synonyms: ["Guarantee", "Secure", "Safeguard", "Verify"],
    antonyms: ["Endanger", "Neglect", "Jeopardize"],
    examples: [
      {
        id: "ww-ex-ensure-1",
        sentence:
          "Double-blind peer review is used to ensure objectivity and fairness in academic publishing.",
        contextNote: "Research ethics",
      },
      {
        id: "ww-ex-ensure-2",
        sentence:
          "Proofreading your citations carefully will ensure that all sources follow APA guidelines.",
        contextNote: "Academic writing advice",
      },
    ],
  },
  {
    id: "ww-word-facilitate",
    word: "Facilitate",
    slug: "facilitate",
    pronunciation: "/fəˈsɪl.ɪ.teɪt/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To make a process, discussion, or learning activity easier and more effective.",
    formalDefinition:
      "To enable, streamline, or guide a structured process, inquiry, or collaborative exchange toward its objective.",
    usageContext:
      "Commonly used in education, communication studies, and project reports.",
    informalEquivalent: "Help / make easier",
    formalUsageNote:
      "Use 'facilitate' when describing how a method, tool, or moderator helps a process succeed.",
    difficulty: "INTERMEDIATE",
    categorySlug: "formal-english",
    synonyms: ["Enable", "Expedite", "Assist", "Promote"],
    antonyms: ["Hinder", "Impede", "Obstruct", "Complicate"],
    examples: [
      {
        id: "ww-ex-facilitate-1",
        sentence:
          "Visual concept maps facilitate deeper comprehension of complex scientific processes.",
        contextNote: "Learning strategy research",
      },
      {
        id: "ww-ex-facilitate-2",
        sentence:
          "The seminar leader asked open-ended questions to facilitate a productive class discussion.",
        contextNote: "Classroom seminar",
      },
    ],
  },
  {
    id: "ww-word-mitigate",
    word: "Mitigate",
    slug: "mitigate",
    pronunciation: "/ˈmɪt.ɪ.ɡeɪt/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To make a problem, limitation, or negative effect less severe or harmful.",
    formalDefinition:
      "To lessen the gravity, severity, or adverse impact of an identified problem, bias, or limitation.",
    usageContext:
      "Essential when discussing study limitations, environmental solutions, or policy recommendations.",
    informalEquivalent: "Lessen / soften",
    formalUsageNote:
      "Pair 'mitigate' with nouns like 'bias', 'impact', 'risk', or 'limitation' in academic reports.",
    difficulty: "ADVANCED",
    categorySlug: "formal-english",
    synonyms: ["Alleviate", "Reduce", "Minimize", "Attenuate"],
    antonyms: ["Aggravate", "Exacerbate", "Intensify", "Worsen"],
    examples: [
      {
        id: "ww-ex-mitigate-1",
        sentence:
          "Anonymous questionnaires were used to mitigate response bias among survey participants.",
        contextNote: "Research limitations section",
      },
      {
        id: "ww-ex-mitigate-2",
        sentence:
          "Urban green spaces help mitigate the effects of rising summer temperatures in densely populated cities.",
        contextNote: "Environmental studies essay",
      },
    ],
  },
  {
    id: "ww-word-commence",
    word: "Commence",
    slug: "commence",
    pronunciation: "/kəˈmɛns/",
    partOfSpeech: "Verb",
    simpleDefinition: "To begin or start an event, project, or process.",
    formalDefinition:
      "To enter upon, initiate, or formally begin a scheduled proceeding, investigation, or academic program.",
    usageContext:
      "Replaces 'start' or 'kick off' in formal announcements, research timelines, and academic reports.",
    informalEquivalent: "Start / kick off",
    formalUsageNote:
      "Use 'commence' or 'initiate' instead of 'kick off' in formal schedules and academic writing.",
    difficulty: "INTERMEDIATE",
    categorySlug: "formal-english",
    synonyms: ["Initiate", "Begin", "Inaugurate", "Launch"],
    antonyms: ["Conclude", "Terminate", "Cease", "Finish"],
    examples: [
      {
        id: "ww-ex-commence-1",
        sentence:
          "Data collection will commence immediately after the ethics review board approves the study protocol.",
        contextNote: "Research proposal timeline",
      },
      {
        id: "ww-ex-commence-2",
        sentence:
          "The annual undergraduate research symposium will commence at nine o'clock in the main auditorium.",
        contextNote: "Formal academic announcement",
      },
    ],
  },
  {
    id: "ww-word-sufficient",
    word: "Sufficient",
    slug: "sufficient",
    pronunciation: "/səˈfɪʃ.ənt/",
    partOfSpeech: "Adjective",
    simpleDefinition: "Enough to meet a need or accomplish a purpose.",
    formalDefinition:
      "Adequate in quantity, quality, or scope to satisfy a logical condition, evidentiary standard, or practical requirement.",
    usageContext:
      "Replaces 'enough' in argumentative essays, research evaluations, and formal reports.",
    informalEquivalent: "Enough",
    formalUsageNote:
      "Prefer 'sufficient' over 'enough' when evaluating whether evidence or sample size is adequate.",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    synonyms: ["Adequate", "Ample", "Satisfactory", "Commensurate"],
    antonyms: ["Insufficient", "Inadequate", "Deficient", "Scant"],
    examples: [
      {
        id: "ww-ex-sufficient-1",
        sentence:
          "A sample of two hundred participants provided sufficient statistical power for the analysis.",
        contextNote: "Quantitative methods",
      },
      {
        id: "ww-ex-sufficient-2",
        sentence:
          "Students should allocate sufficient time to revise and proofread their final research papers.",
        contextNote: "Study skills guide",
      },
    ],
  },

  // ─── 3. Transition & Connecting Words (8 words) ───
  {
    id: "ww-word-furthermore",
    word: "Furthermore",
    slug: "furthermore",
    pronunciation: "/ˌfɜː.ðəˈmɔːr/",
    partOfSpeech: "Adverb",
    simpleDefinition:
      "In addition; used to introduce a fresh point that adds more support to what was just said.",
    formalDefinition:
      "Moreover; besides; used as a conjunctive adverb to introduce an additional, reinforcing proposition in formal discourse.",
    usageContext:
      "Used at the beginning of a sentence in essays and formal speeches to add a supporting argument.",
    informalEquivalent: "Also / plus / on top of that",
    formalUsageNote:
      "Place a comma after 'Furthermore,' at the start of a sentence when adding a stronger supporting point.",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    synonyms: ["Moreover", "Additionally", "In addition", "Further"],
    antonyms: ["Instead", "Conversely"],
    examples: [
      {
        id: "ww-ex-furthermore-1",
        sentence:
          "Regular exercise improves cardiovascular health; furthermore, it enhances concentration during study sessions.",
        contextNote: "Argumentative essay transition",
      },
      {
        id: "ww-ex-furthermore-2",
        sentence:
          "The proposed library expansion will double seating capacity. Furthermore, it will provide twenty quiet group study rooms.",
        contextNote: "Persuasive proposal",
      },
    ],
  },
  {
    id: "ww-word-consequently",
    word: "Consequently",
    slug: "consequently",
    pronunciation: "/ˈkɒn.sɪ.kwənt.li/",
    partOfSpeech: "Adverb",
    simpleDefinition:
      "As a result; therefore; showing that one event or idea is caused by another.",
    formalDefinition:
      "As a logical or natural effect, result, or inference following from a preceding statement or condition.",
    usageContext:
      "Used in cause-and-effect essays, scientific conclusions, and analytical reports.",
    informalEquivalent: "So / because of that",
    formalUsageNote:
      "Use 'consequently' instead of starting academic sentences with 'So' when expressing a direct result.",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    synonyms: ["Therefore", "Thus", "Accordingly", "Hence"],
    antonyms: ["Regardless", "Nevertheless", "Despite this"],
    examples: [
      {
        id: "ww-ex-consequently-1",
        sentence:
          "Several archival documents were damaged by humidity; consequently, historians relied on secondary transcripts.",
        contextNote: "Cause-and-effect transition",
      },
      {
        id: "ww-ex-consequently-2",
        sentence:
          "The survey instructions were clear and concise. Consequently, ninety-four percent of respondents completed every item.",
        contextNote: "Research report discussion",
      },
    ],
  },
  {
    id: "ww-word-nevertheless",
    word: "Nevertheless",
    slug: "nevertheless",
    pronunciation: "/ˌnɛv.ə.ðəˈlɛs/",
    partOfSpeech: "Adverb",
    simpleDefinition:
      "In spite of that; however; used when something happens despite an obstacle or contrasting fact.",
    formalDefinition:
      "Notwithstanding a preceding concession or limitation; nonetheless; used to introduce a contrasting yet valid conclusion.",
    usageContext:
      "Used in essays and literature reviews when acknowledging a limitation before restating a core point.",
    informalEquivalent: "Still / even so / anyway",
    formalUsageNote:
      "Use 'nevertheless' instead of 'anyway' or 'still' when conceding a point in an academic argument.",
    difficulty: "INTERMEDIATE",
    categorySlug: "transition-linking",
    synonyms: ["Nonetheless", "However", "Notwithstanding", "Even so"],
    antonyms: ["Therefore", "Consequently", "Accordingly"],
    examples: [
      {
        id: "ww-ex-nevertheless-1",
        sentence:
          "The initial sample size was modest; nevertheless, the study revealed a consistent and meaningful pattern.",
        contextNote: "Concession & contrast in research",
      },
      {
        id: "ww-ex-nevertheless-2",
        sentence:
          "Learning academic vocabulary requires consistent practice. Nevertheless, the long-term benefits for writing clarity are substantial.",
        contextNote: "Reflective student essay",
      },
    ],
  },
  {
    id: "ww-word-conversely",
    word: "Conversely",
    slug: "conversely",
    pronunciation: "/ˈkɒn.vɜːs.li/",
    partOfSpeech: "Adverb",
    simpleDefinition:
      "On the other hand; introducing an opposite or reversed situation.",
    formalDefinition:
      "In an inverted or opposite manner; used to introduce a statement that reverses or contrasts with the terms of the preceding proposition.",
    usageContext:
      "Used in compare-and-contrast essays, data interpretation, and balanced arguments.",
    informalEquivalent: "On the flip side",
    formalUsageNote:
      "Use 'conversely' when comparing two opposite trends or contrasting viewpoints in an essay.",
    difficulty: "INTERMEDIATE",
    categorySlug: "transition-linking",
    synonyms: ["In contrast", "On the contrary", "Alternatively", "Contrariwise"],
    antonyms: ["Similarly", "Likewise", "Correspondingly"],
    examples: [
      {
        id: "ww-ex-conversely-1",
        sentence:
          "Active recall strengthens long-term memory; conversely, passive rereading often creates a false sense of familiarity.",
        contextNote: "Compare-and-contrast essay",
      },
      {
        id: "ww-ex-conversely-2",
        sentence:
          "Morning classes saw high attendance rates. Conversely, late-afternoon electives experienced more frequent absences.",
        contextNote: "Data comparison",
      },
    ],
  },
  {
    id: "ww-word-subsequently",
    word: "Subsequently",
    slug: "subsequently",
    pronunciation: "/ˈsʌb.sɪ.kwənt.li/",
    partOfSpeech: "Adverb",
    simpleDefinition:
      "Afterward; happening or coming after something else in time.",
    formalDefinition:
      "In a succeeding temporal stage; following a previously stated event in chronological or procedural sequence.",
    usageContext:
      "Used in chronological narratives, historical essays, and step-by-step methodology descriptions.",
    informalEquivalent: "Later on / after that",
    formalUsageNote:
      "Replace 'after that' or 'later on' with 'subsequently' when describing sequential events in formal writing.",
    difficulty: "INTERMEDIATE",
    categorySlug: "transition-linking",
    synonyms: ["Thereafter", "Afterward", "Successively", "Later"],
    antonyms: ["Previously", "Formerly", "Prior", "Initially"],
    examples: [
      {
        id: "ww-ex-subsequently-1",
        sentence:
          "Participants completed a baseline vocabulary test and were subsequently assigned to one of two study groups.",
        contextNote: "Experimental procedure",
      },
      {
        id: "ww-ex-subsequently-2",
        sentence:
          "The draft proposal was reviewed by the faculty panel and subsequently revised to include clearer objectives.",
        contextNote: "Academic project narrative",
      },
    ],
  },
  {
    id: "ww-word-notwithstanding",
    word: "Notwithstanding",
    slug: "notwithstanding",
    pronunciation: "/ˌnɒt.wɪθˈstæn.dɪŋ/",
    partOfSpeech: "Adverb",
    simpleDefinition:
      "In spite of; despite the fact or limitation just mentioned.",
    formalDefinition:
      "Without being prevented or invalidated by; used to acknowledge an obstacle or counterargument while maintaining the primary claim.",
    usageContext:
      "Used in advanced academic writing, legal/policy analysis, and formal debates.",
    informalEquivalent: "Despite / even with",
    formalUsageNote:
      "Can be used before a noun phrase ('Notwithstanding these limitations, ...') or as a formal conjunctive adverb.",
    difficulty: "ADVANCED",
    categorySlug: "transition-linking",
    synonyms: ["Despite", "Regardless of", "Nevertheless", "Nonetheless"],
    antonyms: ["Because of", "Owing to", "Due to"],
    examples: [
      {
        id: "ww-ex-notwithstanding-1",
        sentence:
          "Notwithstanding the brief duration of the pilot study, the findings offer valuable insights for educators.",
        contextNote: "Academic discussion section",
      },
      {
        id: "ww-ex-notwithstanding-2",
        sentence:
          "Several technical challenges arose during the semester; notwithstanding, the research team completed the archive on schedule.",
        contextNote: "Formal report",
      },
    ],
  },
  {
    id: "ww-word-whereas",
    word: "Whereas",
    slug: "whereas",
    pronunciation: "/weərˈæz/",
    partOfSpeech: "Phrase",
    simpleDefinition:
      "In contrast or comparison with the fact that; while on the contrary.",
    formalDefinition:
      "Taking into consideration the fact that; used as a subordinating conjunction to contrast two parallel clauses directly.",
    usageContext:
      "Used in comparative essays, thesis statements, and analytical summaries.",
    informalEquivalent: "While / but",
    formalUsageNote:
      "Use 'whereas' (preceded by a comma) to join two contrasting clauses cleanly within a single sentence.",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    synonyms: ["While", "By contrast", "In comparison", "On the other hand"],
    antonyms: ["Similarly", "Likewise", "Equally"],
    examples: [
      {
        id: "ww-ex-whereas-1",
        sentence:
          "Quantitative research focuses on numerical measurement, whereas qualitative inquiry explores lived experiences.",
        contextNote: "Research methods comparison",
      },
      {
        id: "ww-ex-whereas-2",
        sentence:
          "Informal conversation relies heavily on context and tone, whereas academic prose requires explicit precision.",
        contextNote: "Language & writing essay",
      },
    ],
  },
  {
    id: "ww-word-accordingly",
    word: "Accordingly",
    slug: "accordingly",
    pronunciation: "/əˈkɔː.dɪŋ.li/",
    partOfSpeech: "Adverb",
    simpleDefinition:
      "In a way that is appropriate to the circumstances; therefore.",
    formalDefinition:
      "In conformity with a given set of facts or premises; as a logical and appropriate consequence.",
    usageContext:
      "Used when explaining how a decision, method, or conclusion follows logically from prior facts.",
    informalEquivalent: "So / to match that",
    formalUsageNote:
      "Use 'accordingly' when showing both logical consequence and appropriate adjustment.",
    difficulty: "INTERMEDIATE",
    categorySlug: "transition-linking",
    synonyms: ["Consequently", "Therefore", "Correspondingly", "Appropriately"],
    antonyms: ["Inappropriately", "Disproportionately", "Conversely"],
    examples: [
      {
        id: "ww-ex-accordingly-1",
        sentence:
          "The research question required detailed personal narratives; accordingly, the team selected semi-structured interviews.",
        contextNote: "Research design justification",
      },
      {
        id: "ww-ex-accordingly-2",
        sentence:
          "Academic writing demands verifiable evidence. Accordingly, unsupported opinions should be removed during revision.",
        contextNote: "Essay revision guide",
      },
    ],
  },

  // ─── 4. Analytical & Descriptive Vocabulary (8 words) ───
  {
    id: "ww-word-comprehensive",
    word: "Comprehensive",
    slug: "comprehensive",
    pronunciation: "/ˌkɒm.prɪˈhɛn.sɪv/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Complete and thorough; including all or nearly all important details and aspects.",
    formalDefinition:
      "Of large scope; covering or involving all or nearly all elements, perspectives, or relevant dimensions of a subject.",
    usageContext:
      "Used to describe thorough literature reviews, study guides, evaluations, and examinations.",
    informalEquivalent: "All-in-one / complete",
    formalUsageNote:
      "Use 'comprehensive' when describing a review or analysis that covers every major aspect of a topic.",
    difficulty: "BEGINNER",
    categorySlug: "analytical-descriptive",
    synonyms: ["Exhaustive", "Thorough", "Extensive", "All-inclusive"],
    antonyms: ["Partial", "Incomplete", "Superficial", "Narrow"],
    examples: [
      {
        id: "ww-ex-comprehensive-1",
        sentence:
          "The article provides a comprehensive overview of renewable energy policies across Southeast Asia.",
        contextNote: "Literature review summary",
      },
      {
        id: "ww-ex-comprehensive-2",
        sentence:
          "Before writing the final report, the group conducted a comprehensive review of fifty published studies.",
        contextNote: "Academic research process",
      },
    ],
  },
  {
    id: "ww-word-significant",
    word: "Significant",
    slug: "significant",
    pronunciation: "/sɪɡˈnɪf.ɪ.kənt/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Large or important enough to be noticed, measured, or have a real effect.",
    formalDefinition:
      "Sufficiently great or important to be worthy of attention; in statistics, unlikely to have occurred by random chance alone.",
    usageContext:
      "Used across all academic disciplines to describe meaningful differences, impacts, or findings.",
    informalEquivalent: "Big / major",
    formalUsageNote:
      "Replace vague words like 'big' or 'huge' with 'significant' or 'substantial' in formal writing.",
    difficulty: "BEGINNER",
    categorySlug: "analytical-descriptive",
    synonyms: ["Substantial", "Notable", "Considerable", "Meaningful"],
    antonyms: ["Insignificant", "Negligible", "Trivial", "Minor"],
    examples: [
      {
        id: "ww-ex-significant-1",
        sentence:
          "The study found a significant improvement in essay organization among students who used outlines.",
        contextNote: "Educational research finding",
      },
      {
        id: "ww-ex-significant-2",
        sentence:
          "Peer tutoring made a significant contribution to first-year student confidence.",
        contextNote: "Program evaluation report",
      },
    ],
  },
  {
    id: "ww-word-ambiguous",
    word: "Ambiguous",
    slug: "ambiguous",
    pronunciation: "/æmˈbɪɡ.ju.əs/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Open to more than one meaning or interpretation; unclear or imprecise.",
    formalDefinition:
      "Liable to more than one interpretation; lacking clear, definitive precision in phrasing, intent, or outcome.",
    usageContext:
      "Used when critiquing unclear survey questions, vague policy language, or mixed research results.",
    informalEquivalent: "Vague / confusing",
    formalUsageNote:
      "Use 'ambiguous' when pointing out that a statement or finding can be interpreted in more than one way.",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    synonyms: ["Equivocal", "Unclear", "Indeterminate", "Cryptic"],
    antonyms: ["Unambiguous", "Explicit", "Clear", "Definitive"],
    examples: [
      {
        id: "ww-ex-ambiguous-1",
        sentence:
          "Two survey items were rewritten during pilot testing because participants found the wording ambiguous.",
        contextNote: "Survey instrument design",
      },
      {
        id: "ww-ex-ambiguous-2",
        sentence:
          "Avoid ambiguous pronouns in academic essays so the reader always knows which noun you are referencing.",
        contextNote: "Grammar & style instruction",
      },
    ],
  },
  {
    id: "ww-word-feasible",
    word: "Feasible",
    slug: "feasible",
    pronunciation: "/ˈfiː.zə.bəl/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Possible and practical to do easily or conveniently with available resources.",
    formalDefinition:
      "Capable of being accomplished, executed, or brought about practically within given constraints of time, cost, and method.",
    usageContext:
      "Used in project proposals, capstone recommendations, and problem-solving essays.",
    informalEquivalent: "Doable / workable",
    formalUsageNote:
      "Use 'feasible' instead of 'doable' when evaluating whether a proposed solution is practical.",
    difficulty: "BEGINNER",
    categorySlug: "analytical-descriptive",
    synonyms: ["Viable", "Practical", "Achievable", "Workable"],
    antonyms: ["Infeasible", "Impractical", "Unrealistic", "Impossible"],
    examples: [
      {
        id: "ww-ex-feasible-1",
        sentence:
          "The concluding section proposes three feasible recommendations that campus libraries can implement immediately.",
        contextNote: "Capstone recommendation",
      },
      {
        id: "ww-ex-feasible-2",
        sentence:
          "Advisors review each thesis timeline to ensure the scope of research is feasible within one semester.",
        contextNote: "Thesis advising",
      },
    ],
  },
  {
    id: "ww-word-paramount",
    word: "Paramount",
    slug: "paramount",
    pronunciation: "/ˈpær.ə.maʊnt/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "More important than anything else; of supreme priority.",
    formalDefinition:
      "Superior to all others in importance, weight, or authority; requiring primary consideration.",
    usageContext:
      "Used in persuasive essays, ethics discussions, and formal conclusions.",
    informalEquivalent: "Top priority / super important",
    formalUsageNote:
      "Often used in the phrase 'of paramount importance' in formal academic and policy writing.",
    difficulty: "ADVANCED",
    categorySlug: "analytical-descriptive",
    synonyms: ["Supreme", "Foremost", "Predominant", "Vital"],
    antonyms: ["Secondary", "Subordinate", "Trivial", "Peripheral"],
    examples: [
      {
        id: "ww-ex-paramount-1",
        sentence:
          "Protecting participant privacy is of paramount importance when conducting interviews with students.",
        contextNote: "Research ethics statement",
      },
      {
        id: "ww-ex-paramount-2",
        sentence:
          "Academic integrity remains paramount in all university coursework and scholarly publications.",
        contextNote: "University honor code",
      },
    ],
  },
  {
    id: "ww-word-inherent",
    word: "Inherent",
    slug: "inherent",
    pronunciation: "/ɪnˈhɛr.ənt/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Existing as a natural, permanent, and inseparable part of something.",
    formalDefinition:
      "Vested in or existing in something as a permanent, essential, or characteristic attribute.",
    usageContext:
      "Used when analyzing built-in characteristics, strengths, or limitations of a method or system.",
    informalEquivalent: "Built-in / natural",
    formalUsageNote:
      "Commonly followed by the preposition 'in' (e.g., 'limitations inherent in self-reported surveys').",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    synonyms: ["Intrinsic", "Innate", "Fundamental", "Built-in"],
    antonyms: ["Extrinsic", "External", "Acquired", "Superficial"],
    examples: [
      {
        id: "ww-ex-inherent-1",
        sentence:
          "The researcher acknowledged the subjectivity inherent in small-group case studies.",
        contextNote: "Methodological reflection",
      },
      {
        id: "ww-ex-inherent-2",
        sentence:
          "Curiosity and open-mindedness are inherent qualities of effective lifelong learners.",
        contextNote: "Educational philosophy essay",
      },
    ],
  },
  {
    id: "ww-word-plausible",
    word: "Plausible",
    slug: "plausible",
    pronunciation: "/ˈplɔː.zə.bəl/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Seeming reasonable, believable, or probable based on the available evidence.",
    formalDefinition:
      "Appearing worthy of belief or acceptance; logically credible and consistent with known facts, though not yet conclusively proven.",
    usageContext:
      "Used when evaluating competing explanations, historical theories, or scientific interpretations.",
    informalEquivalent: "Believable / makes sense",
    formalUsageNote:
      "Use 'plausible' to describe an explanation that is logically reasonable and merits further investigation.",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    synonyms: ["Credible", "Believable", "Conceivable", "Reasonable"],
    antonyms: ["Implausible", "Unlikely", "Improbable", "Far-fetched"],
    examples: [
      {
        id: "ww-ex-plausible-1",
        sentence:
          "The author offers a plausible explanation for why digital note-taking produced mixed test results.",
        contextNote: "Critical article review",
      },
      {
        id: "ww-ex-plausible-2",
        sentence:
          "While both theories sound plausible, only the second is supported by longitudinal data.",
        contextNote: "Comparative evaluation",
      },
    ],
  },
  {
    id: "ww-word-ubiquitous",
    word: "Ubiquitous",
    slug: "ubiquitous",
    pronunciation: "/juːˈbɪk.wɪ.təs/",
    partOfSpeech: "Adjective",
    simpleDefinition: "Present, appearing, or found everywhere at the same time.",
    formalDefinition:
      "Existing or being everywhere simultaneously; pervasive and encountered constantly in contemporary life or practice.",
    usageContext:
      "Used in essays on technology, culture, media, and modern society.",
    informalEquivalent: "Everywhere you look",
    formalUsageNote:
      "Use 'ubiquitous' instead of 'everywhere' when describing widespread technologies or cultural practices.",
    difficulty: "ADVANCED",
    categorySlug: "analytical-descriptive",
    synonyms: ["Pervasive", "Omnipresent", "Universal", "Widespread"],
    antonyms: ["Rare", "Scarce", "Infrequent", "Localized"],
    examples: [
      {
        id: "ww-ex-ubiquitous-1",
        sentence:
          "Mobile devices have become ubiquitous on university campuses, transforming how students collaborate.",
        contextNote: "Technology & education essay",
      },
      {
        id: "ww-ex-ubiquitous-2",
        sentence:
          "Because online search engines are ubiquitous, information literacy skills are more critical than ever.",
        contextNote: "Media literacy argument",
      },
    ],
  },

  // ─── 5. Critical Reading & Argumentation (8 words) ───
  {
    id: "ww-word-infer",
    word: "Infer",
    slug: "infer",
    pronunciation: "/ɪnˈfɜːr/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To reach a logical conclusion based on evidence and reasoning rather than explicit statements.",
    formalDefinition:
      "To deduce or conclude information from evidence and logical reasoning rather than from direct, explicit assertion.",
    usageContext:
      "Used in reading comprehension, data interpretation, and literary or historical analysis.",
    informalEquivalent: "Read between the lines / figure out",
    formalUsageNote:
      "Remember the distinction: a writer or speaker 'implies', whereas a reader or listener 'infers'.",
    difficulty: "BEGINNER",
    categorySlug: "critical-argumentation",
    synonyms: ["Deduce", "Conclude", "Surmise", "Extrapolate"],
    antonyms: ["State explicitly", "Misinterpret"],
    examples: [
      {
        id: "ww-ex-infer-1",
        sentence:
          "From the author's tone and word choice, readers can infer a skeptical attitude toward rapid urbanization.",
        contextNote: "Reading comprehension analysis",
      },
      {
        id: "ww-ex-infer-2",
        sentence:
          "Researchers can infer seasonal migration patterns from archaeological evidence found at the site.",
        contextNote: "Analytical inference",
      },
    ],
  },
  {
    id: "ww-word-refute",
    word: "Refute",
    slug: "refute",
    pronunciation: "/rɪˈfjuːt/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To prove that a statement, theory, or argument is wrong or false using evidence.",
    formalDefinition:
      "To overthrow or disprove an argument, accusation, or hypothesis by presenting decisive counterevidence or logical demonstration.",
    usageContext:
      "Used in argumentative essays, counterargument paragraphs, and formal debates.",
    informalEquivalent: "Prove wrong / shoot down",
    formalUsageNote:
      "Note that 'refute' means to prove false with evidence, whereas 'reject' or 'deny' merely states disagreement.",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    synonyms: ["Disprove", "Rebut", "Invalidate", "Debunk"],
    antonyms: ["Confirm", "Substantiate", "Corroborate", "Verify"],
    examples: [
      {
        id: "ww-ex-refute-1",
        sentence:
          "In the third paragraph, the essay refutes the common misconception that bilingualism delays early reading.",
        contextNote: "Counterargument paragraph",
      },
      {
        id: "ww-ex-refute-2",
        sentence:
          "Recent longitudinal data refute earlier claims that online courses inherently lower student engagement.",
        contextNote: "Academic debate",
      },
    ],
  },
  {
    id: "ww-word-scrutinize",
    word: "Scrutinize",
    slug: "scrutinize",
    pronunciation: "/ˈskruː.tɪ.naɪz/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To examine or inspect something very closely and critically.",
    formalDefinition:
      "To subject a text, dataset, or argument to minute, rigorous, and critical examination in order to verify accuracy or detect flaws.",
    usageContext:
      "Used in source evaluation, peer review, and critical reading essays.",
    informalEquivalent: "Go over with a fine-tooth comb",
    formalUsageNote:
      "Use 'scrutinize' when emphasizing careful critical inspection of sources, claims, or evidence.",
    difficulty: "ADVANCED",
    categorySlug: "critical-argumentation",
    synonyms: ["Inspect", "Examine", "Probe", "Audit"],
    antonyms: ["Skim", "Glance", "Overlook"],
    examples: [
      {
        id: "ww-ex-scrutinize-1",
        sentence:
          "Critical readers scrutinize the funding sources and methodology of a study before accepting its conclusions.",
        contextNote: "Information literacy",
      },
      {
        id: "ww-ex-scrutinize-2",
        sentence:
          "The editorial board scrutinized every statistical table prior to approving the manuscript for publication.",
        contextNote: "Peer review process",
      },
    ],
  },
  {
    id: "ww-word-delineate",
    word: "Delineate",
    slug: "delineate",
    pronunciation: "/dɪˈlɪn.i.eɪt/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To describe, outline, or mark the boundaries of something clearly and precisely.",
    formalDefinition:
      "To trace the outline of; to describe, portray, or define concepts, categories, or boundaries with precision and detail.",
    usageContext:
      "Used in introductions, conceptual definitions, and scope-of-study sections.",
    informalEquivalent: "Spell out / map out",
    formalUsageNote:
      "Use 'delineate' when explaining how an essay or study defines the exact boundaries between concepts.",
    difficulty: "ADVANCED",
    categorySlug: "critical-argumentation",
    synonyms: ["Outline", "Define", "Demarcate", "Specify"],
    antonyms: ["Blur", "Confuse", "Muddle", "Obscure"],
    examples: [
      {
        id: "ww-ex-delineate-1",
        sentence:
          "The introductory chapter clearly delineates the scope and limitations of the research project.",
        contextNote: "Thesis introduction",
      },
      {
        id: "ww-ex-delineate-2",
        sentence:
          "To avoid confusion, the author delineates the difference between intrinsic and extrinsic motivation.",
        contextNote: "Conceptual definition",
      },
    ],
  },
  {
    id: "ww-word-juxtapose",
    word: "Juxtapose",
    slug: "juxtapose",
    pronunciation: "/ˌdʒʌk.stəˈpoʊz/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To place two contrasting ideas, texts, or images side by side to highlight their differences or connections.",
    formalDefinition:
      "To place two or more distinct concepts, narratives, or phenomena in close proximity for analytical comparison or rhetorical contrast.",
    usageContext:
      "Used in comparative literature, historical analysis, media studies, and synthesis essays.",
    informalEquivalent: "Put side by side",
    formalUsageNote:
      "Use 'juxtapose' in comparative essays when analyzing how two texts or viewpoints illuminate each other.",
    difficulty: "ADVANCED",
    categorySlug: "critical-argumentation",
    synonyms: ["Contrast", "Compare", "Pair", "Counterpose"],
    antonyms: ["Isolate", "Separate", "Unify"],
    examples: [
      {
        id: "ww-ex-juxtapose-1",
        sentence:
          "The essay juxtaposes classical rhetorical theory with modern digital communication practices.",
        contextNote: "Comparative essay",
      },
      {
        id: "ww-ex-juxtapose-2",
        sentence:
          "By juxtaposing rural and urban case studies, the researcher highlights regional disparities in internet access.",
        contextNote: "Sociological analysis",
      },
    ],
  },
  {
    id: "ww-word-nuance",
    word: "Nuance",
    slug: "nuance",
    pronunciation: "/ˈnjuː.ɑːns/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "A subtle difference or shade of meaning, expression, or perspective.",
    formalDefinition:
      "A subtle distinction, variation, or gradation in meaning, tone, or analytical interpretation.",
    usageContext:
      "Used in literary analysis, language studies, and complex argumentative writing.",
    informalEquivalent: "Subtle detail / fine point",
    formalUsageNote:
      "Use 'nuance' (or the adjective 'nuanced') to praise an argument that avoids oversimplification.",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    synonyms: ["Subtlety", "Distinction", "Refinement", "Gradation"],
    antonyms: ["Oversimplification", "Bluntness", "Generalization"],
    examples: [
      {
        id: "ww-ex-nuance-1",
        sentence:
          "Understanding the nuances of formal vocabulary helps students express complex ideas with precision.",
        contextNote: "Academic language learning",
      },
      {
        id: "ww-ex-nuance-2",
        sentence:
          "Rather than taking an extreme position, the author presents a nuanced analysis of artificial intelligence in education.",
        contextNote: "Argumentative essay evaluation",
      },
    ],
  },
  {
    id: "ww-word-premise",
    word: "Premise",
    slug: "premise",
    pronunciation: "/ˈprɛm.ɪs/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "A basic statement or assumption that forms the foundation for an argument or conclusion.",
    formalDefinition:
      "A previous statement or proposition from which another is inferred or follows as a logical conclusion.",
    usageContext:
      "Used in logic, critical thinking, philosophy, and argumentative essay analysis.",
    informalEquivalent: "Starting idea / assumption",
    formalUsageNote:
      "Use 'premise' when examining the foundational assumptions on which an author's argument rests.",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    synonyms: ["Proposition", "Assumption", "Foundation", "Postulate"],
    antonyms: ["Conclusion", "Deduction", "Afterthought"],
    examples: [
      {
        id: "ww-ex-premise-1",
        sentence:
          "The entire argument rests on the premise that all students have equal access to high-speed internet.",
        contextNote: "Critical evaluation of an argument",
      },
      {
        id: "ww-ex-premise-2",
        sentence:
          "If the underlying premise of a syllogism is flawed, the resulting conclusion cannot be trusted.",
        contextNote: "Logic & critical thinking",
      },
    ],
  },
  {
    id: "ww-word-pragmatic",
    word: "Pragmatic",
    slug: "pragmatic",
    pronunciation: "/præɡˈmæt.ɪk/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Dealing with problems in a sensible, practical way based on real-world conditions rather than strict theory.",
    formalDefinition:
      "Guided by practical experience, realistic constraints, and observable outcomes rather than abstract or idealistic considerations.",
    usageContext:
      "Used in policy essays, problem-solving proposals, and reflective writing.",
    informalEquivalent: "Down-to-earth / practical",
    formalUsageNote:
      "Use 'pragmatic' to describe solutions or approaches that prioritize practical effectiveness.",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    synonyms: ["Practical", "Realistic", "Sensible", "Matter-of-fact"],
    antonyms: ["Idealistic", "Impractical", "Utopian", "Dogmatic"],
    examples: [
      {
        id: "ww-ex-pragmatic-1",
        sentence:
          "The committee adopted a pragmatic approach to scheduling that accommodated working students.",
        contextNote: "Campus policy discussion",
      },
      {
        id: "ww-ex-pragmatic-2",
        sentence:
          "A strong conclusion offers pragmatic recommendations grounded in the findings of the study.",
        contextNote: "Research paper writing",
      },
    ],
  },

  // ─── 6. Formal & Classroom Communication (8 words) ───
  {
    id: "ww-word-articulate",
    word: "Articulate",
    slug: "articulate",
    pronunciation: "/ɑːˈtɪk.jʊ.leɪt/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To express an idea, argument, or goal clearly, fluently, and effectively.",
    formalDefinition:
      "To formulate and communicate complex concepts, arguments, or objectives with precision, coherence, and persuasive clarity.",
    usageContext:
      "Used in oral presentations, thesis defenses, seminar discussions, and essay introductions.",
    informalEquivalent: "Put into words / explain",
    formalUsageNote:
      "Use 'articulate' instead of 'talk about' when emphasizing clarity and structure in speaking or writing.",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    synonyms: ["Enunciate", "Express", "Convey", "Formulate"],
    antonyms: ["Mumble", "Obscure", "Misstate"],
    examples: [
      {
        id: "ww-ex-articulate-1",
        sentence:
          "Every thesis introduction should clearly articulate the central research question and its significance.",
        contextNote: "Academic writing structure",
      },
      {
        id: "ww-ex-articulate-2",
        sentence:
          "During the oral defense, the presenter was able to articulate her methodology with confidence and clarity.",
        contextNote: "Classroom presentation",
      },
    ],
  },
  {
    id: "ww-word-concise",
    word: "Concise",
    slug: "concise",
    pronunciation: "/kənˈsaɪs/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Giving a lot of clear information in few words, without unnecessary filler.",
    formalDefinition:
      "Characterized by economy of expression; conveying essential analysis and meaning comprehensively yet briefly.",
    usageContext:
      "Essential for research abstracts, thesis statements, slide presentations, and academic summaries.",
    informalEquivalent: "Short and to the point",
    formalUsageNote:
      "Use 'concise' to describe effective academic writing that eliminates wordiness and repetition.",
    difficulty: "BEGINNER",
    categorySlug: "academic-communication",
    synonyms: ["Succinct", "Pithy", "Brief", "Focused"],
    antonyms: ["Verbose", "Wordy", "Redundant", "Rambling"],
    examples: [
      {
        id: "ww-ex-concise-1",
        sentence:
          "A research abstract should provide a concise two-hundred-word summary of the study's purpose, methods, and results.",
        contextNote: "Research abstract writing",
      },
      {
        id: "ww-ex-concise-2",
        sentence:
          "Replacing long conversational phrases with precise academic verbs makes your writing more concise.",
        contextNote: "Revision & style guide",
      },
    ],
  },
  {
    id: "ww-word-constructive",
    word: "Constructive",
    slug: "constructive",
    pronunciation: "/kənˈstrʌk.tɪv/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Helpful and intended to improve someone's work or understanding rather than merely criticize.",
    formalDefinition:
      "Serving to promote development, actionable improvement, and deeper understanding through specific, respectful, and objective feedback.",
    usageContext:
      "Used in peer review workshops, group projects, and classroom critiques.",
    informalEquivalent: "Helpful / positive",
    formalUsageNote:
      "Pair 'constructive' with 'feedback', 'critique', or 'dialogue' in academic workshops.",
    difficulty: "BEGINNER",
    categorySlug: "academic-communication",
    synonyms: ["Productive", "Developmental", "Solution-oriented", "Beneficial"],
    antonyms: ["Destructive", "Disparaging", "Hostile", "Unhelpful"],
    examples: [
      {
        id: "ww-ex-constructive-1",
        sentence:
          "During the writing workshop, classmates exchanged constructive feedback on each other's draft essays.",
        contextNote: "Peer review workshop",
      },
      {
        id: "ww-ex-constructive-2",
        sentence:
          "Constructive dialogue in seminar discussions allows students to refine their arguments respectfully.",
        contextNote: "Classroom seminar",
      },
    ],
  },
  {
    id: "ww-word-consensus",
    word: "Consensus",
    slug: "consensus",
    pronunciation: "/kənˈsɛn.səs/",
    partOfSpeech: "Noun",
    simpleDefinition:
      "General agreement reached by a group or scholarly community after discussion.",
    formalDefinition:
      "A collective judgment or shared agreement achieved among scholars, researchers, or group members through deliberative consultation.",
    usageContext:
      "Used when describing scholarly agreement in a literature review or group decision-making.",
    informalEquivalent: "Everyone agreeing",
    formalUsageNote:
      "Avoid the redundant phrase 'general consensus of opinion'—simply write 'reach a consensus' or 'scholarly consensus'.",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    synonyms: ["Accord", "Unanimity", "Harmony", "Concurrence"],
    antonyms: ["Disagreement", "Discord", "Dissension"],
    examples: [
      {
        id: "ww-ex-consensus-1",
        sentence:
          "There is broad scholarly consensus that early reading intervention strengthens long-term literacy.",
        contextNote: "Literature review synthesis",
      },
      {
        id: "ww-ex-consensus-2",
        sentence:
          "After reviewing all research topics, the study group reached a consensus on their final project theme.",
        contextNote: "Collaborative group project",
      },
    ],
  },
  {
    id: "ww-word-diplomatic",
    word: "Diplomatic",
    slug: "diplomatic",
    pronunciation: "/ˌdɪp.ləˈmæt.ɪk/",
    partOfSpeech: "Adjective",
    simpleDefinition:
      "Handling sensitive discussions and disagreements with tact, respect, and fairness.",
    formalDefinition:
      "Demonstrating tact, composure, and sensitivity in managing differing viewpoints or delicate interpersonal communications.",
    usageContext:
      "Critical in academic debates, group work, formal emails, and responding to critiques.",
    informalEquivalent: "Polite / careful with words",
    formalUsageNote:
      "Use 'diplomatic' to describe tactful phrasing that maintains respect during academic disagreements.",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    synonyms: ["Tactful", "Judicious", "Discreet", "Courteous"],
    antonyms: ["Blunt", "Tactless", "Confrontational", "Abrasive"],
    examples: [
      {
        id: "ww-ex-diplomatic-1",
        sentence:
          "The panelist gave a diplomatic response that acknowledged the critique while defending her research findings.",
        contextNote: "Academic conference Q&A",
      },
      {
        id: "ww-ex-diplomatic-2",
        sentence:
          "Using diplomatic language in peer reviews encourages classmates to stay open to revision.",
        contextNote: "Collaborative learning",
      },
    ],
  },
  {
    id: "ww-word-disseminate",
    word: "Disseminate",
    slug: "disseminate",
    pronunciation: "/dɪˈsɛm.ɪ.neɪt/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To share, publish, or circulate important research, knowledge, or information widely.",
    formalDefinition:
      "To broadcast, circulate, or distribute scholarly findings, educational resources, or official information systematically across an audience.",
    usageContext:
      "Used in academic publishing, research ethics, and knowledge-sharing discussions.",
    informalEquivalent: "Send out / spread",
    formalUsageNote:
      "Replace 'send out' or 'spread' with 'disseminate' when referring to research findings or educational materials.",
    difficulty: "ADVANCED",
    categorySlug: "academic-communication",
    synonyms: ["Circulate", "Distribute", "Publish", "Broadcast"],
    antonyms: ["Withhold", "Suppress", "Conceal"],
    examples: [
      {
        id: "ww-ex-disseminate-1",
        sentence:
          "Open-access journals allow universities to disseminate new scientific discoveries to students worldwide.",
        contextNote: "Scholarly communication",
      },
      {
        id: "ww-ex-disseminate-2",
        sentence:
          "The student research society organized a forum to disseminate findings from senior capstone projects.",
        contextNote: "Campus research symposium",
      },
    ],
  },
  {
    id: "ww-word-clarify",
    word: "Clarify",
    slug: "clarify",
    pronunciation: "/ˈklær.ɪ.faɪ/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To make a statement, concept, or question easier to understand by removing confusion.",
    formalDefinition:
      "To make an idea, definition, or proposition intelligible and free from ambiguity through precise explanation or illustration.",
    usageContext:
      "Used in essays, classroom Q&A sessions, and formal emails to professors.",
    informalEquivalent: "Clear up",
    formalUsageNote:
      "Use 'clarify' instead of 'clear up' when asking questions in class or defining terms in an essay.",
    difficulty: "BEGINNER",
    categorySlug: "academic-communication",
    synonyms: ["Elucidate", "Explain", "Illuminate", "Specify"],
    antonyms: ["Confuse", "Obscure", "Complicate", "Muddle"],
    examples: [
      {
        id: "ww-ex-clarify-1",
        sentence:
          "Could you please clarify whether the literature review requires five or8 peer-reviewed journal articles?",
        contextNote: "Formal email to a professor",
      },
      {
        id: "ww-ex-clarify-2",
        sentence:
          "The author includes a glossary of terms to clarify technical concepts for general readers.",
        contextNote: "Academic text analysis",
      },
    ],
  },
  {
    id: "ww-word-elaborate",
    word: "Elaborate",
    slug: "elaborate",
    pronunciation: "/ɪˈlæb.ə.reɪt/",
    partOfSpeech: "Verb",
    simpleDefinition:
      "To explain something in greater detail by adding more examples, evidence, or analysis.",
    formalDefinition:
      "To develop or present a theory, argument, or statement in further detail in order to deepen comprehension.",
    usageContext:
      "Used in essay prompts, oral exams, and paragraph development.",
    informalEquivalent: "Go into more detail / say more",
    formalUsageNote:
      "Commonly followed by 'on' or 'upon' (e.g., 'Section Two elaborates on this argument').",
    difficulty: "BEGINNER",
    categorySlug: "academic-communication",
    synonyms: ["Expand", "Develop", "Amplify", "Detail"],
    antonyms: ["Condense", "Abbreviate", "Summarize"],
    examples: [
      {
        id: "ww-ex-elaborate-1",
        sentence:
          "In your body paragraphs, elaborate on each topic sentence using concrete examples from the text.",
        contextNote: "Essay writing instruction",
      },
      {
        id: "ww-ex-elaborate-2",
        sentence:
          "During the seminar, the professor asked the student to elaborate on her interpretation of the poem.",
        contextNote: "Classroom discussion",
      },
    ],
  },
] as const;

export const CORE_CATEGORY_SEED_WORDS: readonly SeedVocabularyWord[] = (() => {
  const bySlug = new Map<string, SeedVocabularyWord>();
  for (const w of [
    ...CORE_SEED_VOCABULARY_WORDS,
    ...EXTENDED_SEED_VOCABULARY_WORDS,
  ]) {
    if (!bySlug.has(w.slug)) {
      bySlug.set(w.slug, w);
    }
  }
  return Array.from(bySlug.values());
})();

export const SEED_VOCABULARY_WORDS: readonly SeedVocabularyWord[] =
  CORE_CATEGORY_SEED_WORDS;

export const FORMAL_INFORMAL_COMPARISONS: readonly FormalInformalComparisonItem[] =
  [
    {
      id: "ww-cmp-1",
      informalExpression: "Find out",
      formalAlternative: "Determine",
      partOfSpeech: "Verb",
      pronunciation: "/dɪˈtɜː.mɪn/",
      categoryName: "Formal Replacements",
      whenAppropriate:
        "Use in research papers, lab reports, and analytical essays when establishing facts through investigation.",
      informalSentence:
        "The study tries to find out why students prefer interactive study tools.",
      formalSentence:
        "The study seeks to determine why students prefer interactive learning tools.",
      relatedWordSlug: "determine",
    },
    {
      id: "ww-cmp-2",
      informalExpression: "A lot of",
      formalAlternative: "Numerous",
      partOfSpeech: "Adjective",
      pronunciation: "/ˈnjuː.mə.rəs/",
      categoryName: "Formal Replacements",
      whenAppropriate:
        "Use before countable plural nouns in college essays, literature reviews, and formal reports.",
      informalSentence:
        "A lot of studies show that spaced practice improves memory.",
      formalSentence:
        "Numerous studies demonstrate that spaced practice improves long-term retention.",
      relatedWordSlug: "numerous",
    },
    {
      id: "ww-cmp-3",
      informalExpression: "Get better",
      formalAlternative: "Improve",
      partOfSpeech: "Verb",
      pronunciation: "/ɪmˈpruːv/",
      categoryName: "Formal Replacements",
      whenAppropriate:
        "Use in academic reflections, research findings, and progress reports when describing measurable growth.",
      informalSentence:
        "Regular peer feedback helped the students' essay drafts get better.",
      formalSentence:
        "Regular peer feedback helped improve the clarity and structure of the students' essay drafts.",
      relatedWordSlug: "constructive",
    },
    {
      id: "ww-cmp-4",
      informalExpression: "Talk about",
      formalAlternative: "Discuss",
      partOfSpeech: "Verb",
      pronunciation: "/dɪˈskʌs/",
      categoryName: "Formal & Classroom Communication",
      whenAppropriate:
        "Use in essay introductions, literature reviews, and seminar summaries when examining a topic formally.",
      informalSentence:
        "In this paper, I will talk about the causes of digital fatigue among students.",
      formalSentence:
        "This paper will discuss the primary causes of digital fatigue among university students.",
      relatedWordSlug: "articulate",
    },
    {
      id: "ww-cmp-5",
      informalExpression: "Show",
      formalAlternative: "Demonstrate",
      partOfSpeech: "Verb",
      pronunciation: "/ˈdɛm.ən.streɪt/",
      categoryName: "Formal Replacements",
      whenAppropriate:
        "Use in research findings, analytical essays, and presentations when proving a point with evidence.",
      informalSentence:
        "The survey results show a strong link between reading habits and vocabulary size.",
      formalSentence:
        "The survey results demonstrate a strong correlation between reading habits and vocabulary breadth.",
      relatedWordSlug: "demonstrate",
    },
    {
      id: "ww-cmp-6",
      informalExpression: "Help",
      formalAlternative: "Assist",
      partOfSpeech: "Verb",
      pronunciation: "/əˈsɪst/",
      categoryName: "Formal & Classroom Communication",
      whenAppropriate:
        "Use in formal correspondence, project descriptions, and academic support documentation.",
      informalSentence:
        "Peer mentors will help first-year students organize their research citations.",
      formalSentence:
        "Peer mentors will assist first-year students in organizing their academic citations.",
      relatedWordSlug: "facilitate",
    },
    {
      id: "ww-cmp-7",
      informalExpression: "Make sure",
      formalAlternative: "Ensure",
      partOfSpeech: "Verb",
      pronunciation: "/ɪnˈʃʊər/",
      categoryName: "Formal Replacements",
      whenAppropriate:
        "Use in research methodology sections, project proposals, and formal guidelines.",
      informalSentence:
        "Researchers must make sure all survey responses remain anonymous.",
      formalSentence:
        "Researchers must ensure that all participant survey responses remain anonymous.",
      relatedWordSlug: "ensure",
    },
    {
      id: "ww-cmp-8",
      informalExpression: "Back up",
      formalAlternative: "Substantiate",
      partOfSpeech: "Verb",
      pronunciation: "/səbˈstæn.ʃi.eɪt/",
      categoryName: "Academic Writing & Research",
      whenAppropriate:
        "Use in argumentative essays and critical reviews when supporting claims with verifiable evidence.",
      informalSentence:
        "You need to back up your main argument with peer-reviewed sources.",
      formalSentence:
        "You must substantiate your central thesis with peer-reviewed scholarly sources.",
      relatedWordSlug: "substantiate",
    },
    {
      id: "ww-cmp-9",
      informalExpression: "Send out",
      formalAlternative: "Disseminate",
      partOfSpeech: "Verb",
      pronunciation: "/dɪˈsɛm.ɪ.neɪt/",
      categoryName: "Formal & Classroom Communication",
      whenAppropriate:
        "Use when sharing research findings, questionnaires, or official academic publications.",
      informalSentence:
        "The research team will send out the questionnaire to three hundred students.",
      formalSentence:
        "The research team will disseminate the questionnaire to three hundred undergraduate respondents.",
      relatedWordSlug: "disseminate",
    },
    {
      id: "ww-cmp-10",
      informalExpression: "Look closely at",
      formalAlternative: "Analyze",
      partOfSpeech: "Verb",
      pronunciation: "/ˈæn.ə.laɪz/",
      categoryName: "Academic Writing & Research",
      whenAppropriate:
        "Use in essay thesis statements and research papers when breaking down evidence systematically.",
      informalSentence:
        "This essay looks closely at how social media affects study focus.",
      formalSentence:
        "This essay analyzes how social media usage affects sustained academic focus.",
      relatedWordSlug: "analyze",
    },
    {
      id: "ww-cmp-11",
      informalExpression: "Start",
      formalAlternative: "Commence",
      partOfSpeech: "Verb",
      pronunciation: "/kəˈmɛns/",
      categoryName: "Formal Replacements",
      whenAppropriate:
        "Use in formal schedules, research timelines, and official academic notices.",
      informalSentence:
        "The second phase of data collection will start in November.",
      formalSentence:
        "The second phase of data collection will commence in November.",
      relatedWordSlug: "commence",
    },
    {
      id: "ww-cmp-12",
      informalExpression: "Enough",
      formalAlternative: "Sufficient",
      partOfSpeech: "Adjective",
      pronunciation: "/səˈfɪʃ.ənt/",
      categoryName: "Formal Replacements",
      whenAppropriate:
        "Use when evaluating whether evidence, time, or sample size is adequate in academic writing.",
      informalSentence:
        "The author did not provide enough evidence to prove the claim.",
      formalSentence:
        "The author did not provide sufficient evidence to substantiate the claim.",
      relatedWordSlug: "sufficient",
    },
  ] as const;

export function getTodayDateKey(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDeterministicWordOfTheDay(
  words: readonly VocabularyWordItem[],
  dateKey: string = getTodayDateKey()
): VocabularyWordItem {
  if (words.length === 0) {
    throw new Error("Cannot select Word of the Day from an empty word list.");
  }

  const sorted = [...words].sort((a, b) => a.slug.localeCompare(b.slug));
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = Math.abs(hash) % sorted.length;
  return sorted[index]!;
}

function mapSeedWordsToVocabularyItems(
  seeds: readonly SeedVocabularyWord[]
): VocabularyWordItem[] {
  const categoryMap = new Map(
    WORDWISE_CATEGORIES.map((c) => [c.slug, c] as const)
  );

  return seeds.map((seed) => {
    const cat = categoryMap.get(seed.categorySlug)!;
    return {
      id: seed.id,
      word: seed.word,
      slug: seed.slug,
      pronunciation: seed.pronunciation,
      partOfSpeech: seed.partOfSpeech,
      simpleDefinition: seed.simpleDefinition,
      formalDefinition: seed.formalDefinition,
      usageContext: seed.usageContext,
      informalEquivalent: seed.informalEquivalent,
      formalUsageNote: seed.formalUsageNote,
      difficulty: seed.difficulty,
      categoryId: cat.id,
      categorySlug: seed.categorySlug,
      categoryName: cat.name,
      synonyms: [...seed.synonyms],
      antonyms: [...seed.antonyms],
      examples: seed.examples.map((ex) => ({
        id: ex.id,
        sentence: ex.sentence,
        contextNote: ex.contextNote,
      })),
    };
  });
}

export function buildCoreCategoryVocabularyWords(): VocabularyWordItem[] {
  return mapSeedWordsToVocabularyItems(CORE_CATEGORY_SEED_WORDS);
}

export function buildInMemoryVocabularyWords(): VocabularyWordItem[] {
  return mapSeedWordsToVocabularyItems(SEED_VOCABULARY_WORDS);
}
