import type { SeedVocabularyWord } from "./content-bank";
import type {
  WordWiseCategorySlug,
  WordWiseDifficulty,
  WordWisePartOfSpeech,
} from "./types";

interface CompactSeedWordInput {
  word: string;
  pronunciation: string;
  partOfSpeech: WordWisePartOfSpeech;
  difficulty: WordWiseDifficulty;
  categorySlug: WordWiseCategorySlug;
  simpleDefinition: string;
  formalDefinition: string;
  usageContext: string;
  informalEquivalent?: string | null;
  formalUsageNote?: string | null;
  synonyms: [string, string, ...string[]];
  antonyms: [string, ...string[]];
  example1: string;
  example2: string;
}

function defineWord(input: CompactSeedWordInput): SeedVocabularyWord {
  const slug = input.word
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return {
    id: `ww-word-${slug}`,
    word: input.word,
    slug,
    pronunciation: input.pronunciation,
    partOfSpeech: input.partOfSpeech,
    simpleDefinition: input.simpleDefinition,
    formalDefinition: input.formalDefinition,
    usageContext: input.usageContext,
    informalEquivalent: input.informalEquivalent ?? null,
    formalUsageNote:
      input.formalUsageNote ??
      `Use "${input.word.toLowerCase()}" in academic essays and formal communication for precise expression.`,
    difficulty: input.difficulty,
    categorySlug: input.categorySlug,
    synonyms: [...input.synonyms],
    antonyms: [...input.antonyms],
    examples: [
      {
        id: `ww-ex-${slug}-1`,
        sentence: input.example1,
        contextNote: "Academic writing & research context",
      },
      {
        id: `ww-ex-${slug}-2`,
        sentence: input.example2,
        contextNote: "Student essay & classroom application",
      },
    ],
  };
}

export const EXTENDED_SEED_VOCABULARY_WORDS: readonly SeedVocabularyWord[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Academic Writing & Research (+17 words -> 25 total in category)
  // ═══════════════════════════════════════════════════════════════════════════
  defineWord({
    word: "Corroborate",
    pronunciation: "/kəˈrɒb.ə.reɪt/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "To confirm or give support to a statement, theory, or finding with independent evidence.",
    formalDefinition:
      "To confirm or make more certain by providing additional, independent evidence or empirical verification.",
    usageContext:
      "Used in research papers and essays when showing that multiple sources support the same conclusion.",
    informalEquivalent: "Back up / confirm",
    synonyms: ["Confirm", "Verify", "Validate", "Substantiate"],
    antonyms: ["Contradict", "Refute", "Disprove"],
    example1:
      "Follow-up interviews were conducted to corroborate the trends observed in the written survey.",
    example2:
      "Historical records corroborate the author's account of 19th-century educational reforms.",
  }),
  defineWord({
    word: "Postulate",
    pronunciation: "/ˈpɒs.tjʊ.leɪt/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "To suggest or assume the existence or truth of something as a starting point for reasoning.",
    formalDefinition:
      "To put forward or assume a proposition as a fundamental premise for theoretical reasoning or scholarly investigation.",
    usageContext:
      "Used when introducing theoretical models or foundational assumptions in academic papers.",
    informalEquivalent: "Suggest / assume",
    synonyms: ["Hypothesize", "Propose", "Posit", "Theorize"],
    antonyms: ["Disprove", "Refute", "Reject"],
    example1:
      "Cognitive researchers postulate that active recall strengthens long-term memory pathways.",
    example2:
      "The authors postulate a direct link between early literacy exposure and analytical reading speed.",
  }),
  defineWord({
    word: "Extrapolate",
    pronunciation: "/ɪkˈstræp.ə.leɪt/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "To estimate or conclude something by extending known information or trends into an unknown area.",
    formalDefinition:
      "To infer or project unknown values or broader conclusions from existing empirical trends or sample observations.",
    usageContext:
      "Used in data analysis, research discussions, and scientific or social science essays.",
    informalEquivalent: "Project / guess from trends",
    synonyms: ["Project", "Infer", "Deduce", "Generalize"],
    antonyms: ["Measure directly", "Overlook"],
    example1:
      "While the sample is informative, researchers should be cautious when attempting to extrapolate findings to all universities.",
    example2:
      "From the five-year enrollment data, the committee was able to extrapolate future classroom capacity needs.",
  }),
  defineWord({
    word: "Delineate",
    pronunciation: "/dɪˈlɪn.i.eɪt/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "To describe, outline, or mark the exact boundaries of something clearly and precisely.",
    formalDefinition:
      "To portray, define, or establish the precise conceptual boundaries and scope of a subject or framework.",
    usageContext:
      "Used in introductions and methodology sections to define the scope of a paper.",
    informalEquivalent: "Outline / spell out",
    synonyms: ["Outline", "Define", "Demarcate", "Specify"],
    antonyms: ["Blur", "Confuse", "Obscure"],
    example1:
      "The opening chapter delineates the scope and theoretical boundaries of the study.",
    example2:
      "Clear rubric criteria delineate the expectations for analytical depth and citation accuracy.",
  }),
  defineWord({
    word: "Contextualize",
    pronunciation: "/kənˈtɛks.tʃu.ə.laɪz/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "To place a fact, quote, or event in its proper background setting so it can be accurately understood.",
    formalDefinition:
      "To situate a text, phenomenon, or empirical finding within its broader historical, cultural, or theoretical framework.",
    usageContext:
      "Used in literature reviews, history essays, and textual analysis before introducing evidence.",
    informalEquivalent: "Give background on",
    synonyms: ["Frame", "Situate", "Background", "Interpret"],
    antonyms: ["Isolate", "Misrepresent"],
    example1:
      "Before analyzing the speech, the essay contextualizes the political climate of the decade.",
    example2:
      "Effective writers always contextualize direct quotations rather than dropping them abruptly into a paragraph.",
  }),
  defineWord({
    word: "Conceptualize",
    pronunciation: "/kənˈsɛp.tʃu.ə.laɪz/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "To form a clear mental concept or theoretical idea of how something works.",
    formalDefinition:
      "To formulate an abstract theoretical model or overarching principle to explain complex observations.",
    usageContext:
      "Used when explaining how scholars define or model abstract phenomena.",
    informalEquivalent: "Picture / think up",
    synonyms: ["Formulate", "Envision", "Conceive", "Model"],
    antonyms: ["Misunderstand", "Ignore"],
    example1:
      "Modern educators conceptualize student engagement as a multidimensional process.",
    example2:
      "The diagram helps readers conceptualize the relationship between motivation and study persistence.",
  }),
  defineWord({
    word: "Qualitative",
    pronunciation: "/ˈkwɒl.ɪ.tə.tɪv/",
    partOfSpeech: "Adjective",
    difficulty: "BEGINNER",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "Relating to descriptions, meanings, and characteristics rather than numbers or measurements.",
    formalDefinition:
      "Pertaining to non-numerical inquiry that examines lived experiences, open-ended responses, and thematic patterns.",
    usageContext:
      "Used in research methods when describing interviews, case studies, or thematic observations.",
    informalEquivalent: "Descriptive / non-number",
    synonyms: ["Descriptive", "Thematic", "Interpretive", "Observational"],
    antonyms: ["Quantitative", "Numerical", "Statistical"],
    example1:
      "The qualitative portion of the study analyzed open-ended reflections from twenty-five students.",
    example2:
      "Qualitative observations revealed subtle classroom dynamics that test scores alone could not capture.",
  }),
  defineWord({
    word: "Quantitative",
    pronunciation: "/ˈkwɒn.tɪ.tə.tɪv/",
    partOfSpeech: "Adjective",
    difficulty: "BEGINNER",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "Relating to data that can be measured and expressed using numbers or statistics.",
    formalDefinition:
      "Pertaining to empirical investigation based on numerical measurement, statistical analysis, and quantifiable variables.",
    usageContext:
      "Used in research papers, lab reports, and statistical analyses.",
    informalEquivalent: "Number-based / measurable",
    synonyms: ["Numerical", "Statistical", "Measurable", "Empirical"],
    antonyms: ["Qualitative", "Subjective", "Anecdotal"],
    example1:
      "Quantitative analysis of the exam scores showed a statistically significant improvement.",
    example2:
      "Combining quantitative metrics with student interviews produced a balanced evaluation.",
  }),
  defineWord({
    word: "Variable",
    pronunciation: "/ˈvɛə.ri.ə.bəl/",
    partOfSpeech: "Noun",
    difficulty: "BEGINNER",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "A factor, trait, or condition that can change or be measured in an experiment or study.",
    formalDefinition:
      "A measurable attribute, factor, or condition that can assume different values in an empirical investigation.",
    usageContext:
      "Used in scientific reports, psychology papers, and research methodology sections.",
    informalEquivalent: "Changing factor",
    synonyms: ["Factor", "Parameter", "Element", "Determinant"],
    antonyms: ["Constant", "Invariant"],
    example1:
      "Sleep duration was treated as the primary independent variable in the study.",
    example2:
      "Researchers controlled for external variables such as prior coursework and study time.",
  }),
  defineWord({
    word: "Correlation",
    pronunciation: "/ˌkɒr.əˈleɪ.ʃən/",
    partOfSpeech: "Noun",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "A mutual relationship or connection in which two or more things change together.",
    formalDefinition:
      "A statistical or conceptual association indicating the degree to which two variables fluctuate in relation to one another.",
    usageContext:
      "Used in data analysis and research essays when discussing how two factors relate without overclaiming causation.",
    informalEquivalent: "Link / connection",
    synonyms: ["Association", "Relationship", "Linkage", "Correspondence"],
    antonyms: ["Independence", "Disconnection", "Divergence"],
    example1:
      "The data indicate a strong positive correlation between regular library attendance and GPA.",
    example2:
      "In academic writing, students must remember that correlation does not automatically prove causation.",
  }),
  defineWord({
    word: "Causation",
    pronunciation: "/kɔːˈzeɪ.ʃən/",
    partOfSpeech: "Noun",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "The action of causing something; a direct cause-and-effect relationship between two events.",
    formalDefinition:
      "A demonstrable relationship in which change in one phenomenon directly produces an effect in another.",
    usageContext:
      "Used in analytical essays and research methodology to distinguish direct causes from mere coincidences.",
    informalEquivalent: "Direct cause",
    synonyms: ["Causality", "Etiology", "Direct agency", "Determinism"],
    antonyms: ["Coincidence", "Randomness"],
    example1:
      "Controlled experiments are required to establish causation rather than simple association.",
    example2:
      "The essay examines the complex causation behind declining print newspaper readership.",
  }),
  defineWord({
    word: "Replication",
    pronunciation: "/ˌrɛp.lɪˈkeɪ.ʃən/",
    partOfSpeech: "Noun",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "The repetition of a research study or experiment to verify whether the original findings hold true.",
    formalDefinition:
      "The independent reproduction of an empirical study using identical or comparable procedures to confirm reliability.",
    usageContext:
      "Used in research reviews and scientific discussions regarding study reliability.",
    informalEquivalent: "Repeating a study",
    synonyms: ["Reproduction", "Verification", "Duplication", "Confirmation"],
    antonyms: ["Originality", "Single trial"],
    example1:
      "Successful replication of the experiment across three campuses strengthened confidence in the results.",
    example2:
      "Transparent methodology enables independent replication by future student researchers.",
  }),
  defineWord({
    word: "Criterion",
    pronunciation: "/kraɪˈtɪə.ri.ən/",
    partOfSpeech: "Noun",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "A standard, rule, or principle by which something is judged, evaluated, or decided.",
    formalDefinition:
      "An explicit standard, benchmark, or evaluative principle against which evidence or performance is assessed.",
    usageContext:
      "Used in comparative essays, rubrics, and evaluative writing (plural: criteria).",
    informalEquivalent: "Rule / standard",
    synonyms: ["Standard", "Benchmark", "Measure", "Touchstone"],
    antonyms: ["Guesswork", "Arbitrariness"],
    example1:
      "Peer-reviewed publication was the primary criterion for selecting sources in the literature review.",
    example2:
      "Each proposal was evaluated against a clear criterion of feasibility and academic rigor.",
  }),
  defineWord({
    word: "Phenomenon",
    pronunciation: "/fəˈnɒm.ɪ.nən/",
    partOfSpeech: "Noun",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "An observable fact, event, or trend that can be studied and explained scientifically or socially.",
    formalDefinition:
      "An observable occurrence, pattern, or trend that serves as the object of systematic scholarly inquiry.",
    usageContext:
      "Used in social sciences, natural sciences, and analytical essays (plural: phenomena).",
    informalEquivalent: "Happening / trend",
    synonyms: ["Occurrence", "Event", "Manifestation", "Trend"],
    antonyms: ["Normality", "Inaction"],
    example1:
      "Digital burnout is a widespread phenomenon among university students balancing work and study.",
    example2:
      "The paper investigates the phenomenon of confirmation bias in online news consumption.",
  }),
  defineWord({
    word: "Discourse",
    pronunciation: "/ˈdɪs.kɔːs/",
    partOfSpeech: "Noun",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "Written or spoken communication and debate about a serious or academic subject.",
    formalDefinition:
      "Formal, orderly, and extended expression of thought on a subject in scholarly writing or public debate.",
    usageContext:
      "Used in humanities, social sciences, and communication essays.",
    informalEquivalent: "Discussion / talk",
    synonyms: ["Dialogue", "Discussion", "Debate", "Rhetoric"],
    antonyms: ["Silence", "Reticence"],
    example1:
      "Respectful academic discourse requires listening carefully to opposing evidence.",
    example2:
      "The course examines how environmental policy is framed in contemporary public discourse.",
  }),
  defineWord({
    word: "Pedagogy",
    pronunciation: "/ˈpɛd.ə.ɡɒdʒ.i/",
    partOfSpeech: "Noun",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "The method, theory, and practice of teaching and learning in an academic setting.",
    formalDefinition:
      "The art, science, and theoretical framework of instructional design and educational practice.",
    usageContext:
      "Used in education essays, reflective learning journals, and curriculum discussions.",
    informalEquivalent: "Teaching style",
    synonyms: ["Instruction", "Education", "Didactics", "Teaching methodology"],
    antonyms: ["Neglect", "Unstructured learning"],
    example1:
      "Collaborative pedagogy encourages students to solve complex problems in small seminar groups.",
    example2:
      "Modern pedagogy emphasizes critical thinking over rote memorization.",
  }),
  defineWord({
    word: "Taxonomy",
    pronunciation: "/tækˈsɒn.ə.mi/",
    partOfSpeech: "Noun",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "An organized system for classifying and grouping concepts, items, or ideas into categories.",
    formalDefinition:
      "A hierarchical scheme of classification in which concepts or entities are organized into structured categories.",
    usageContext:
      "Used when categorizing theories, concepts, or analytical frameworks in research papers.",
    informalEquivalent: "Classification system",
    synonyms: ["Classification", "Categorization", "Typology", "Hierarchy"],
    antonyms: ["Disorder", "Randomness"],
    example1:
      "Bloom's taxonomy classifies learning objectives from basic recall to higher-order evaluation.",
    example2:
      "The researchers developed a clear taxonomy of common argumentative fallacies.",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Formal Replacements (+17 words -> 25 total in category)
  // ═══════════════════════════════════════════════════════════════════════════
  defineWord({
    word: "Acquire",
    pronunciation: "/əˈkwaɪər/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    simpleDefinition:
      "To gain, obtain, or develop a skill, habit, or piece of knowledge through effort.",
    formalDefinition:
      "To come into possession of or develop a competency, resource, or body of knowledge through sustained effort.",
    usageContext:
      "Used in academic writing as a formal replacement for 'get' or 'pick up'.",
    informalEquivalent: "Get / pick up",
    synonyms: ["Obtain", "Attain", "Gain", "Cultivate"],
    antonyms: ["Lose", "Forfeit", "Relinquish"],
    example1:
      "Students acquire advanced research skills by evaluating primary academic journals.",
    example2:
      "Over the semester, participants acquired greater confidence in formal public speaking.",
  }),
  defineWord({
    word: "Utilize",
    pronunciation: "/ˈjuː.tɪ.laɪz/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    simpleDefinition:
      "To make practical and effective use of a resource, tool, or method.",
    formalDefinition:
      "To deploy or put to practical, purposeful use a specific methodology, instrument, or resource.",
    usageContext:
      "Used in methodology sections and formal reports to describe how tools or frameworks were applied.",
    informalEquivalent: "Use",
    synonyms: ["Employ", "Apply", "Deploy", "Harness"],
    antonyms: ["Waste", "Neglect", "Discard"],
    example1:
      "The research team utilized a double-blind survey design to minimize respondent bias.",
    example2:
      "Students are encouraged to utilize university library databases when compiling their bibliographies.",
  }),
  defineWord({
    word: "Facilitate",
    pronunciation: "/fəˈsɪl.ɪ.teɪt/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "formal-english",
    simpleDefinition:
      "To make an action, process, or discussion easier and more productive.",
    formalDefinition:
      "To render an academic, analytical, or collaborative process easier and more achievable.",
    usageContext:
      "Used in formal essays and reports instead of 'make easier' or 'help along'.",
    informalEquivalent: "Make easier / help along",
    synonyms: ["Enable", "Promote", "Expedite", "Support"],
    antonyms: ["Hinder", "Impede", "Obstruct"],
    example1:
      "Structured peer-review checklists facilitate constructive feedback during writing workshops.",
    example2:
      "Visual outlines facilitate comprehension of complex historical timelines.",
  }),
  defineWord({
    word: "Implement",
    pronunciation: "/ˈɪm.plɪ.mɛnt/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    simpleDefinition:
      "To put a decision, plan, or method into actual effect.",
    formalDefinition:
      "To execute and carry into practical effect a planned policy, methodology, or recommendation.",
    usageContext:
      "Used in policy essays, action plans, and research recommendations instead of 'carry out' or 'put in place'.",
    informalEquivalent: "Put in place / carry out",
    synonyms: ["Execute", "Enact", "Apply", "Institute"],
    antonyms: ["Abandon", "Cancel", "Neglect"],
    example1:
      "The university implemented a new tutoring mentorship program for first-year students.",
    example2:
      "To improve time management, students can implement a weekly study schedule.",
  }),
  defineWord({
    word: "Modify",
    pronunciation: "/ˈmɒd.ɪ.faɪ/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    simpleDefinition:
      "To make partial or minor changes to something in order to improve it or make it fit better.",
    formalDefinition:
      "To alter, adjust, or revise a procedure, hypothesis, or text to improve accuracy or suitability.",
    usageContext:
      "Used in academic writing as a formal alternative to 'change' or 'tweak'.",
    informalEquivalent: "Change / tweak",
    synonyms: ["Alter", "Adjust", "Revise", "Adapt"],
    antonyms: ["Preserve", "Maintain", "Freeze"],
    example1:
      "After the pilot test, the researchers modified three ambiguous survey questions.",
    example2:
      "Writers often modify their thesis statement as new evidence emerges during research.",
  }),
  defineWord({
    word: "Retain",
    pronunciation: "/rɪˈteɪn/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    simpleDefinition:
      "To continue to have, keep, or remember something over time.",
    formalDefinition:
      "To keep in possession, preserve in memory, or maintain an established condition over time.",
    usageContext:
      "Used in essays and scientific writing instead of 'keep' or 'hold on to'.",
    informalEquivalent: "Keep / hold on to",
    synonyms: ["Preserve", "Maintain", "Keep", "Remember"],
    antonyms: ["Lose", "Discard", "Forget"],
    example1:
      "Students who review their notes within twenty-four hours retain significantly more information.",
    example2:
      "The revised edition retains the core chapters while updating the statistical tables.",
  }),
  defineWord({
    word: "Eliminate",
    pronunciation: "/ɪˈlɪm.ɪ.neɪt/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    simpleDefinition:
      "To completely remove or get rid of something that is unwanted or unnecessary.",
    formalDefinition:
      "To exclude, remove, or eradicate an extraneous variable, error, or barrier from a system or text.",
    usageContext:
      "Used in formal writing as a replacement for 'get rid of' or 'cut out'.",
    informalEquivalent: "Get rid of / cut out",
    synonyms: ["Remove", "Eradicate", "Exclude", "Omit"],
    antonyms: ["Include", "Retain", "Add"],
    example1:
      "Careful proofreading helps eliminate repetitive phrasing and grammatical errors.",
    example2:
      "Randomized assignment was used to eliminate selection bias in the experiment.",
  }),
  defineWord({
    word: "Establish",
    pronunciation: "/ɪˈstæb.lɪʃ/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    simpleDefinition:
      "To set up something on a firm basis, or to prove that a fact or claim is true.",
    formalDefinition:
      "To found, institute, or demonstrate the validity of a claim beyond reasonable doubt.",
    usageContext:
      "Used in essays and research papers instead of 'set up' or 'show for sure'.",
    informalEquivalent: "Set up / prove",
    synonyms: ["Institute", "Demonstrate", "Confirm", "Found"],
    antonyms: ["Dismantle", "Disprove", "Abolish"],
    example1:
      "The opening paragraph establishes the historical importance of the treaty.",
    example2:
      "Before beginning a group project, members should establish clear deadlines and roles.",
  }),
  defineWord({
    word: "Verify",
    pronunciation: "/ˈvɛr.ɪ.faɪ/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    simpleDefinition:
      "To make sure or demonstrate that a fact, quotation, or calculation is true and accurate.",
    formalDefinition:
      "To confirm the truth, accuracy, or authenticity of a statement or datum through independent examination.",
    usageContext:
      "Used in academic research and source evaluation instead of 'double-check'.",
    informalEquivalent: "Check / double-check",
    synonyms: ["Confirm", "Validate", "Authenticate", "Corroborate"],
    antonyms: ["Disprove", "Invalidate", "Assume"],
    example1:
      "Students should always verify the publication details of online articles before citing them.",
    example2:
      "A second analyst reviewed the spreadsheet to verify the accuracy of the totals.",
  }),
  defineWord({
    word: "Ascertain",
    pronunciation: "/ˌæs.əˈteɪn/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "formal-english",
    simpleDefinition:
      "To find something out for certain through careful inquiry or investigation.",
    formalDefinition:
      "To discover and establish with certainty through deliberate inquiry, examination, or research.",
    usageContext:
      "Used in formal reports and academic investigations instead of 'find out'.",
    informalEquivalent: "Find out for sure",
    synonyms: ["Determine", "Discover", "Verify", "Establish"],
    antonyms: ["Overlook", "Guess", "Speculate"],
    example1:
      "The survey was designed to ascertain which study resources students found most effective.",
    example2:
      "Historians examined archival letters to ascertain the author's original intentions.",
  }),
  defineWord({
    word: "Endeavor",
    pronunciation: "/ɛnˈdɛv.ər/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "formal-english",
    simpleDefinition:
      "To try hard to do or achieve something meaningful.",
    formalDefinition:
      "To exert sustained, purposeful effort toward achieving a scholarly or professional objective.",
    usageContext:
      "Used in formal statements and essays instead of 'try hard'.",
    informalEquivalent: "Try hard",
    synonyms: ["Strive", "Attempt", "Undertake", "Aspire"],
    antonyms: ["Neglect", "Abandon", "Give up"],
    example1:
      "Scholars endeavor to present complex theories in clear, accessible language.",
    example2:
      "The research team endeavored to include participants from diverse academic backgrounds.",
  }),
  defineWord({
    word: "Terminate",
    pronunciation: "/ˈtɜː.mɪ.neɪt/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "formal-english",
    simpleDefinition:
      "To bring a process, study, or arrangement to an official end.",
    formalDefinition:
      "To bring an activity, observation period, or formal arrangement to a conclusion.",
    usageContext:
      "Used in formal writing instead of 'end' or 'stop'.",
    informalEquivalent: "End / stop",
    synonyms: ["Conclude", "Cease", "Discontinue", "Complete"],
    antonyms: ["Commence", "Initiate", "Continue"],
    example1:
      "The observation phase terminated after twelve weeks of classroom data collection.",
    example2:
      "Participants were informed that they could terminate their involvement in the study at any time.",
  }),
  defineWord({
    word: "Prioritize",
    pronunciation: "/praɪˈɒr.ɪ.taɪz/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    simpleDefinition:
      "To treat something as more important than other things and deal with it first.",
    formalDefinition:
      "To arrange or address tasks, variables, or objectives in order of relative importance or urgency.",
    usageContext:
      "Used in essays, study planning, and policy recommendations instead of 'put first'.",
    informalEquivalent: "Put first",
    synonyms: ["Rank", "Emphasize", "Foreground", "Privilege"],
    antonyms: ["Neglect", "Subordinate", "Postpone"],
    example1:
      "Effective essay writers prioritize primary peer-reviewed evidence over unverified blog posts.",
    example2:
      "The committee voted to prioritize reading literacy initiatives in the upcoming academic year.",
  }),
  defineWord({
    word: "Compensate",
    pronunciation: "/ˈkɒm.pɛn.seɪt/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "formal-english",
    simpleDefinition:
      "To make up for a weakness, limitation, or lack in another area.",
    formalDefinition:
      "To offset, counterbalance, or make amends for a methodological limitation or deficiency.",
    usageContext:
      "Used in research limitations and analytical essays instead of 'make up for'.",
    informalEquivalent: "Make up for",
    synonyms: ["Offset", "Counterbalance", "Make amends", "Redress"],
    antonyms: ["Worsen", "Exacerbate"],
    example1:
      "To compensate for the small sample size, the researchers conducted in-depth follow-up interviews.",
    example2:
      "Strong visual charts cannot compensate for a lack of rigorous textual analysis.",
  }),
  defineWord({
    word: "Accelerate",
    pronunciation: "/əkˈsɛl.ə.reɪt/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "formal-english",
    simpleDefinition:
      "To cause a process or development to happen faster or sooner.",
    formalDefinition:
      "To increase the rate, speed, or progression of a developmental or empirical process.",
    usageContext:
      "Used in academic essays instead of 'speed up'.",
    informalEquivalent: "Speed up",
    synonyms: ["Expedite", "Hasten", "Quicken", "Catalyze"],
    antonyms: ["Decelerate", "Retard", "Slow down"],
    example1:
      "Interactive feedback tools can accelerate vocabulary acquisition among first-year students.",
    example2:
      "Digital archives have accelerated the pace at which historians can cross-reference manuscripts.",
  }),
  defineWord({
    word: "Diminish",
    pronunciation: "/dɪˈmɪn.ɪʃ/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "formal-english",
    simpleDefinition:
      "To make or become smaller, weaker, or less important.",
    formalDefinition:
      "To reduce in extent, intensity, or significance over time or under specific conditions.",
    usageContext:
      "Used in formal writing instead of 'lessen', 'shrink', or 'die down'.",
    informalEquivalent: "Lessen / go down",
    synonyms: ["Decrease", "Decline", "Lessen", "Abate"],
    antonyms: ["Increase", "Amplify", "Enhance"],
    example1:
      "Without regular review, comprehension of newly learned terminology can rapidly diminish.",
    example2:
      "Minor formatting errors should not diminish the overall value of the student's research.",
  }),
  defineWord({
    word: "Exacerbate",
    pronunciation: "/ɪɡˈzæs.ə.beɪt/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "formal-english",
    simpleDefinition:
      "To make a problem, bad situation, or negative feeling worse.",
    formalDefinition:
      "To intensify the severity, difficulty, or negative impact of an existing problem or condition.",
    usageContext:
      "Used in analytical and social science essays instead of 'make worse'.",
    informalEquivalent: "Make worse",
    synonyms: ["Aggravate", "Worsen", "Intensify", "Compound"],
    antonyms: ["Alleviate", "Mitigate", "Relieve"],
    example1:
      "Cramming the night before an examination often exacerbates test anxiety and fatigue.",
    example2:
      "Unequal access to high-speed internet can exacerbate educational disparities.",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Transition & Connecting Words (+17 words -> 25 total in category)
  // ═══════════════════════════════════════════════════════════════════════════
  defineWord({
    word: "Therefore",
    pronunciation: "/ˈðɛə.fɔːr/",
    partOfSpeech: "Adverb",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    simpleDefinition:
      "For that reason; as a logical result of what was just stated.",
    formalDefinition:
      "A logical conjunctive adverb introducing a necessary conclusion or consequence drawn from preceding premises.",
    usageContext:
      "Used in essays, proofs, and conclusions to signal a logical deduction.",
    informalEquivalent: "So",
    synonyms: ["Consequently", "Thus", "Hence", "Accordingly"],
    antonyms: ["Nevertheless", "Regardless"],
    example1:
      "The sample included only one department; therefore, the findings cannot be generalized campus-wide.",
    example2:
      "All three sources confirm the date of the manuscript, and we can therefore treat the timeline as reliable.",
  }),
  defineWord({
    word: "Thus",
    pronunciation: "/ðʌs/",
    partOfSpeech: "Adverb",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    simpleDefinition:
      "As a result or consequence of this; in this way.",
    formalDefinition:
      "Consequently; in the manner just indicated or as a direct logical outcome of the preceding statement.",
    usageContext:
      "Used in concise academic prose to connect cause and effect or premise and conclusion.",
    informalEquivalent: "So / this way",
    synonyms: ["Therefore", "Hence", "Consequently", "Accordingly"],
    antonyms: ["Nonetheless", "Conversely"],
    example1:
      "The new software automated citation formatting, thus saving students hours of manual editing.",
    example2:
      "Both hypotheses were supported by the data; thus, the theoretical model was retained.",
  }),
  defineWord({
    word: "Hence",
    pronunciation: "/hɛns/",
    partOfSpeech: "Adverb",
    difficulty: "INTERMEDIATE",
    categorySlug: "transition-linking",
    simpleDefinition:
      "As a consequence; for this reason.",
    formalDefinition:
      "From this premise or fact; as a direct inference or logical consequence.",
    usageContext:
      "Used in formal analytical writing to introduce a conclusion derived from evidence.",
    informalEquivalent: "That's why / so",
    synonyms: ["Therefore", "Thus", "Consequently", "For this reason"],
    antonyms: ["Despite this", "Even so"],
    example1:
      "Primary manuscripts from the period are fragile; hence, researchers rely on high-resolution digital scans.",
    example2:
      "Vocabulary depth strongly predicts reading comprehension, hence its central role in academic readiness.",
  }),
  defineWord({
    word: "Accordingly",
    pronunciation: "/əˈkɔː.dɪŋ.li/",
    partOfSpeech: "Adverb",
    difficulty: "INTERMEDIATE",
    categorySlug: "transition-linking",
    simpleDefinition:
      "In a way that is appropriate to the particular circumstances; therefore.",
    formalDefinition:
      "In conformity with the preceding facts or premises; consequently and appropriately.",
    usageContext:
      "Used in formal essays and reports to show how an action or conclusion follows from the situation.",
    informalEquivalent: "So / to match",
    synonyms: ["Consequently", "Therefore", "Correspondingly", "Appropriately"],
    antonyms: ["Inappropriately", "Regardless"],
    example1:
      "The initial survey instructions proved too lengthy; accordingly, the form was simplified for the main trial.",
    example2:
      "Students were given two extra weeks for archival research and adjusted their outlines accordingly.",
  }),
  defineWord({
    word: "Nonetheless",
    pronunciation: "/ˌnʌn.ðəˈlɛs/",
    partOfSpeech: "Adverb",
    difficulty: "INTERMEDIATE",
    categorySlug: "transition-linking",
    simpleDefinition:
      "In spite of what has just been said; however.",
    formalDefinition:
      "Notwithstanding the preceding concession or limitation; even so.",
    usageContext:
      "Used in balanced academic arguments to pivot from a limitation back to a main claim.",
    informalEquivalent: "Still / even so",
    synonyms: ["Nevertheless", "However", "Notwithstanding", "Yet"],
    antonyms: ["Therefore", "Consequently"],
    example1:
      "The documentary omits several minor events; nonetheless, it provides an accurate overview of the era.",
    example2:
      "Learning academic terminology requires consistent effort, yet the long-term benefits are nonetheless substantial.",
  }),
  defineWord({
    word: "Whereas",
    pronunciation: "/wɛərˈæz/",
    partOfSpeech: "Phrase",
    difficulty: "INTERMEDIATE",
    categorySlug: "transition-linking",
    simpleDefinition:
      "In contrast or comparison with the fact that.",
    formalDefinition:
      "A subordinating conjunction used to contrast two parallel facts, findings, or theoretical positions within a single sentence.",
    usageContext:
      "Used in comparative essays to contrast two ideas smoothly in one sentence.",
    informalEquivalent: "While on the other hand",
    synonyms: ["While", "By contrast", "Conversely", "In comparison"],
    antonyms: ["Similarly", "Likewise"],
    example1:
      "Quantitative studies measure statistical frequency, whereas qualitative studies explore personal meaning.",
    example2:
      "Summaries condense the main points of a text, whereas critiques evaluate the strength of its arguments.",
  }),
  defineWord({
    word: "Likewise",
    pronunciation: "/ˈlaɪk.waɪz/",
    partOfSpeech: "Adverb",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    simpleDefinition:
      "In the same way; also or similarly.",
    formalDefinition:
      "In a parallel or comparable manner; similarly.",
    usageContext:
      "Used in essays to connect two similar examples, findings, or arguments.",
    informalEquivalent: "In the same way / too",
    synonyms: ["Similarly", "Correspondingly", "By the same token", "Equally"],
    antonyms: ["Conversely", "On the contrary"],
    example1:
      "Clear topic sentences guide the reader through an essay; likewise, clear slide titles structure a presentation.",
    example2:
      "First-year students benefited from peer mentoring, and sophomore participants likewise reported higher confidence.",
  }),
  defineWord({
    word: "Similarly",
    pronunciation: "/ˈsɪm.ɪ.lə.li/",
    partOfSpeech: "Adverb",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    simpleDefinition:
      "In a way that resembles or corresponds to the previous point.",
    formalDefinition:
      "In an analogous or comparable manner; used to introduce a parallel piece of evidence.",
    usageContext:
      "Used in comparative essays and literature reviews when drawing parallels between two studies.",
    informalEquivalent: "Just like that",
    synonyms: ["Likewise", "Analogously", "Correspondingly", "In like manner"],
    antonyms: ["Conversely", "Differently"],
    example1:
      "Smith (2023) linked active note-taking to higher retention; similarly, Lee (2024) found that summarizing lectures improved recall.",
    example2:
      "Just as athletes warm up before competition, writers similarly benefit from outlining before drafting.",
  }),
  defineWord({
    word: "Specifically",
    pronunciation: "/spəˈsɪf.ɪ.kli/",
    partOfSpeech: "Adverb",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    simpleDefinition:
      "In a way that is exact, clear, and focused on a particular detail.",
    formalDefinition:
      "Used to narrow a general statement to a precise instance, mechanism, or empirical detail.",
    usageContext:
      "Used after a broad topic sentence to zoom in on the exact focus of a paragraph.",
    informalEquivalent: "To be exact",
    synonyms: ["In particular", "Particularly", "Explicitly", "Precisely"],
    antonyms: ["Generally", "Vaguely", "Broadly"],
    example1:
      "The paper examines study habits—specifically, how spaced repetition affects vocabulary mastery.",
    example2:
      "Several factors influenced the outcome, specifically the duration of instruction and class size.",
  }),
  defineWord({
    word: "Notably",
    pronunciation: "/ˈnəʊ.tə.bli/",
    partOfSpeech: "Adverb",
    difficulty: "INTERMEDIATE",
    categorySlug: "transition-linking",
    simpleDefinition:
      "In particular; especially or in a way that deserves special attention.",
    formalDefinition:
      "Used to highlight a particularly significant, striking, or illustrative example or finding.",
    usageContext:
      "Used in data discussions and literature reviews to call attention to a key result.",
    informalEquivalent: "Especially / worth noting",
    synonyms: ["Especially", "Particularly", "Significantly", "Markedly"],
    antonyms: ["Insignificantly", "Slightly"],
    example1:
      "Several cohorts improved their writing scores, most notably students who attended weekly feedback sessions.",
    example2:
      "Notably, over eighty percent of respondents preferred interactive examples over static word lists.",
  }),
  defineWord({
    word: "Concurrently",
    pronunciation: "/kənˈkʌr.ənt.li/",
    partOfSpeech: "Adverb",
    difficulty: "ADVANCED",
    categorySlug: "transition-linking",
    simpleDefinition:
      "At the same time; happening side by side with something else.",
    formalDefinition:
      "Simultaneously; occurring or operating in parallel within the same timeframe.",
    usageContext:
      "Used in methodology and historical timelines instead of 'at the same time'.",
    informalEquivalent: "At the same time",
    synonyms: ["Simultaneously", "In parallel", "Coincidentally", "Together"],
    antonyms: ["Subsequently", "Previously", "Sequentially"],
    example1:
      "Students completed the reading comprehension module while concurrently keeping a vocabulary journal.",
    example2:
      "Two independent research teams concurrently arrived at the same mathematical proof.",
  }),
  defineWord({
    word: "Previously",
    pronunciation: "/ˈpriː.vi.əs.li/",
    partOfSpeech: "Adverb",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    simpleDefinition:
      "At an earlier time; before the current point or study.",
    formalDefinition:
      "Prior to the period, section, or investigation currently under discussion.",
    usageContext:
      "Used to refer back to earlier sections of an essay or prior published research.",
    informalEquivalent: "Before / earlier",
    synonyms: ["Earlier", "Prior to this", "Formerly", "Antecedently"],
    antonyms: ["Subsequently", "Later", "Afterward"],
    example1:
      "As noted previously in the literature review, early studies relied on small sample sizes.",
    example2:
      "Concepts that previously seemed abstract became clear once illustrated with real examples.",
  }),
  defineWord({
    word: "Ultimately",
    pronunciation: "/ˈʌl.tɪ.mət.li/",
    partOfSpeech: "Adverb",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    simpleDefinition:
      "Finally; in the end, after everything else has been considered.",
    formalDefinition:
      "In the final analysis; at the conclusion of a series of events or analytical steps.",
    usageContext:
      "Used in concluding paragraphs to state the overarching takeaway of an essay.",
    informalEquivalent: "In the end",
    synonyms: ["Finally", "Eventually", "In conclusion", "Fundamentally"],
    antonyms: ["Initially", "Preliminarily"],
    example1:
      "Ultimately, clear academic writing depends on both precise vocabulary and logical structure.",
    example2:
      "While several factors contributed to the delay, the project ultimately achieved all of its learning goals.",
  }),
  defineWord({
    word: "Paradoxically",
    pronunciation: "/ˌpær.əˈdɒk.sɪ.kli/",
    partOfSpeech: "Adverb",
    difficulty: "ADVANCED",
    categorySlug: "transition-linking",
    simpleDefinition:
      "In a way that seems contradictory or surprising, yet is actually true.",
    formalDefinition:
      "In a manner that appears self-contradictory or counterintuitive on the surface but reveals an underlying truth.",
    usageContext:
      "Used in analytical essays to introduce an unexpected or counterintuitive finding.",
    informalEquivalent: "Surprisingly / oddly enough",
    synonyms: ["Counterintuitively", "Ironically", "Unexpectedly", "Curiously"],
    antonyms: ["Predictably", "Expectedly"],
    example1:
      "Paradoxically, students who took brief breaks during study sessions completed their assignments faster.",
    example2:
      "Having too many reference sources can, paradoxically, make it harder to start drafting an essay.",
  }),
  defineWord({
    word: "Alternatively",
    pronunciation: "/ɔːlˈtɜː.nə.tɪv.li/",
    partOfSpeech: "Adverb",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    simpleDefinition:
      "As another option, possibility, or explanation.",
    formalDefinition:
      "Used to introduce a second, mutually distinct interpretation, method, or course of action.",
    usageContext:
      "Used when presenting competing explanations or alternative solutions in an essay.",
    informalEquivalent: "Or else / instead",
    synonyms: ["Instead", "On the other hand", "As another option", "Conversely"],
    antonyms: ["Additionally", "Similarly"],
    example1:
      "Researchers may collect responses via online forms; alternatively, they may conduct in-person interviews.",
    example2:
      "The decline in scores may reflect test fatigue, or, alternatively, a change in assessment format.",
  }),
  defineWord({
    word: "Collectively",
    pronunciation: "/kəˈlɛk.tɪv.li/",
    partOfSpeech: "Adverb",
    difficulty: "INTERMEDIATE",
    categorySlug: "transition-linking",
    simpleDefinition:
      "Taken together as a whole group rather than individually.",
    formalDefinition:
      "Considered as a unified aggregate or combined body of evidence.",
    usageContext:
      "Used when synthesizing multiple studies or pieces of evidence into a single conclusion.",
    informalEquivalent: "All together",
    synonyms: ["Jointly", "Together", "In aggregate", "As a whole"],
    antonyms: ["Individually", "Separately"],
    example1:
      "Collectively, these five studies demonstrate the effectiveness of active vocabulary practice.",
    example2:
      "The committee members collectively endorsed the revised academic integrity guidelines.",
  }),
  defineWord({
    word: "Invariably",
    pronunciation: "/ɪnˈvɛə.ri.ə.bli/",
    partOfSpeech: "Adverb",
    difficulty: "ADVANCED",
    categorySlug: "transition-linking",
    simpleDefinition:
      "In every case or on every occasion; always without exception.",
    formalDefinition:
      "Consistently and without exception across all observed instances.",
    usageContext:
      "Used in formal writing when describing a pattern that holds true across cases.",
    informalEquivalent: "Every single time",
    synonyms: ["Consistently", "Always", "Uniformly", "Without exception"],
    antonyms: ["Rarely", "Seldom", "Occasionally"],
    example1:
      "Unclear research questions invariably lead to unfocused literature reviews.",
    example2:
      "Students who outline their main claims before writing invariably produce more coherent essays.",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Analytical & Descriptive (+17 words -> 25 total in category)
  // ═══════════════════════════════════════════════════════════════════════════
  defineWord({
    word: "Coherent",
    pronunciation: "/kəʊˈhɪə.rənt/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Logical, clear, and well-organized so that all parts fit together smoothly.",
    formalDefinition:
      "Characterized by logical interconnection, clarity of structure, and consistent integration of ideas.",
    usageContext:
      "Used to evaluate essays, arguments, theoretical frameworks, and presentations.",
    informalEquivalent: "Clear and connected",
    synonyms: ["Logical", "Cohesive", "Consistent", "Structured"],
    antonyms: ["Disjointed", "Incoherent", "Fragmented"],
    example1:
      "Transition words help transform separate paragraphs into a coherent academic argument.",
    example2:
      "The speaker presented a coherent overview of the historical causes of inflation.",
  }),
  defineWord({
    word: "Meticulous",
    pronunciation: "/məˈtɪk.jʊ.ləs/",
    partOfSpeech: "Adjective",
    difficulty: "ADVANCED",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Showing great attention to detail; very careful and precise.",
    formalDefinition:
      "Marked by extreme care, precision, and thoroughness in the execution of scholarly or technical work.",
    usageContext:
      "Used to describe careful research methods, archival work, or editing.",
    informalEquivalent: "Super careful",
    synonyms: ["Thorough", "Precise", "Scrupulous", "Painstaking"],
    antonyms: ["Careless", "Sloppy", "Negligent"],
    example1:
      "Meticulous citation of primary sources strengthens the credibility of a research paper.",
    example2:
      "The laboratory assistant kept meticulous records of every experimental trial.",
  }),
  defineWord({
    word: "Prevalent",
    pronunciation: "/ˈprɛv.əl.ənt/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Widespread and commonly found in a particular area, group, or time period.",
    formalDefinition:
      "Widely existing, practiced, or accepted within a specified population or historical period.",
    usageContext:
      "Used in social science and research papers instead of 'common' or 'everywhere'.",
    informalEquivalent: "Very common",
    synonyms: ["Widespread", "Pervasive", "Common", "Predominant"],
    antonyms: ["Rare", "Uncommon", "Infrequent"],
    example1:
      "Digital note-taking has become increasingly prevalent in undergraduate lecture halls.",
    example2:
      "The article challenges a prevalent misconception about how memory consolidation works.",
  }),
  defineWord({
    word: "Fundamental",
    pronunciation: "/ˌfʌn.dəˈmɛn.təl/",
    partOfSpeech: "Adjective",
    difficulty: "BEGINNER",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Forming a necessary base or core; of central importance.",
    formalDefinition:
      "Serving as an essential foundation, primary principle, or underlying basis of a system or theory.",
    usageContext:
      "Used when describing core principles, concepts, or research questions.",
    informalEquivalent: "Basic / core",
    synonyms: ["Essential", "Foundational", "Primary", "Core"],
    antonyms: ["Secondary", "Trivial", "Peripheral"],
    example1:
      "Understanding the difference between fact and opinion is fundamental to critical reading.",
    example2:
      "The two economists disagreed on the fundamental causes of the market shift.",
  }),
  defineWord({
    word: "Substantial",
    pronunciation: "/səbˈstæn.ʃəl/",
    partOfSpeech: "Adjective",
    difficulty: "BEGINNER",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Of considerable importance, size, or worth; large and meaningful.",
    formalDefinition:
      "Of ample or considerable amount, degree, or scholarly weight.",
    usageContext:
      "Used in formal writing instead of 'a lot of' or 'big' when describing evidence or change.",
    informalEquivalent: "Big / a lot of",
    synonyms: ["Considerable", "Significant", "Extensive", "Marked"],
    antonyms: ["Negligible", "Minor", "Slight"],
    example1:
      "A substantial body of research supports the use of formative feedback in writing instruction.",
    example2:
      "The revised curriculum includes substantial changes to the first-year seminar reading list.",
  }),
  defineWord({
    word: "Negligible",
    pronunciation: "/ˈnɛɡ.lɪ.dʒə.bəl/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "So small or unimportant as to be not worth considering.",
    formalDefinition:
      "Insignificant in magnitude or effect; statistically or practically too small to warrant concern.",
    usageContext:
      "Used in data analysis and research discussions when a difference is tiny.",
    informalEquivalent: "Tiny / next to nothing",
    synonyms: ["Insignificant", "Minimal", "Trivial", "Minute"],
    antonyms: ["Substantial", "Significant", "Major"],
    example1:
      "The difference in completion time between the two groups was statistically negligible.",
    example2:
      "Background noise had a negligible effect on the participants' reading accuracy.",
  }),
  defineWord({
    word: "Pervasive",
    pronunciation: "/pəˈveɪ.sɪv/",
    partOfSpeech: "Adjective",
    difficulty: "ADVANCED",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Spreading widely throughout an area, society, or group of people.",
    formalDefinition:
      "Present and felt throughout every part of a system, culture, or institution.",
    usageContext:
      "Used in cultural, technological, and sociological essays to describe widespread influences.",
    informalEquivalent: "Everywhere",
    synonyms: ["Ubiquitous", "Widespread", "Omnipresent", "Prevalent"],
    antonyms: ["Localized", "Isolated", "Rare"],
    example1:
      "The essay examines the pervasive influence of short-form video on student attention spans.",
    example2:
      "Smartphone notifications have become a pervasive distraction in modern study environments.",
  }),
  defineWord({
    word: "Explicit",
    pronunciation: "/ɪkˈsplɪs.ɪt/",
    partOfSpeech: "Adjective",
    difficulty: "BEGINNER",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Stated clearly and in detail, leaving no room for confusion or doubt.",
    formalDefinition:
      "Fully and clearly expressed or defined, leaving nothing merely implied or ambiguous.",
    usageContext:
      "Used to contrast directly stated ideas with implied ('implicit') meanings.",
    informalEquivalent: "Crystal clear / spelled out",
    synonyms: ["Clear", "Direct", "Unambiguous", "Express"],
    antonyms: ["Implicit", "Vague", "Unstated"],
    example1:
      "The syllabus provides explicit instructions on how to format in-text citations.",
    example2:
      "Researchers must obtain explicit consent from participants before recording interviews.",
  }),
  defineWord({
    word: "Implicit",
    pronunciation: "/ɪmˈplɪs.ɪt/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Suggested or understood without being stated directly.",
    formalDefinition:
      "Implied or understood indirectly through context or underlying assumptions rather than expressly stated.",
    usageContext:
      "Used in literary analysis, critical reading, and argument evaluation.",
    informalEquivalent: "Unstated / hinted at",
    synonyms: ["Implied", "Unstated", "Tacit", "Underlying"],
    antonyms: ["Explicit", "Stated", "Express"],
    example1:
      "Critical readers look for the implicit assumptions beneath an author's main claim.",
    example2:
      "There was an implicit agreement among group members to share research notes equally.",
  }),
  defineWord({
    word: "Rigorous",
    pronunciation: "/ˈrɪɡ.ər.əs/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Extremely thorough, exhaustive, and accurate in method or analysis.",
    formalDefinition:
      "Adhering strictly to exacting methodological standards, logical precision, and empirical verification.",
    usageContext:
      "Used to praise thorough academic research, testing, or scholarship.",
    informalEquivalent: "Strict and thorough",
    synonyms: ["Thorough", "Stringent", "Exact", "Methodical"],
    antonyms: ["Lax", "Superficial", "Careless"],
    example1:
      "The journal accepts only studies that demonstrate rigorous methodological design.",
    example2:
      "Rigorous peer review helped the authors identify and correct an error in their analysis.",
  }),
  defineWord({
    word: "Superficial",
    pronunciation: "/ˌsuː.pəˈfɪʃ.əl/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Examining only the surface of something without looking at deeper meaning or complexity.",
    formalDefinition:
      "Concerned only with what is apparent or obvious; lacking analytical depth or thoroughness.",
    usageContext:
      "Used in critiques when an argument or summary lacks depth.",
    informalEquivalent: "Surface-level / shallow",
    synonyms: ["Shallow", "Cursory", "Surface-level", "Perfunctory"],
    antonyms: ["Profound", "Comprehensive", "Thorough"],
    example1:
      "A superficial reading of the poem misses its historical irony.",
    example2:
      "The report was criticized for offering only a superficial analysis of student feedback.",
  }),
  defineWord({
    word: "Pragmatic",
    pronunciation: "/præɡˈmæt.ɪk/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Dealing with things sensibly and realistically in a way that is based on practical results.",
    formalDefinition:
      "Guided by practical consequences, feasibility, and real-world application rather than abstract theory alone.",
    usageContext:
      "Used in policy essays, problem-solving discussions, and applied research.",
    informalEquivalent: "Practical / realistic",
    synonyms: ["Practical", "Realistic", "Sensible", "Applied"],
    antonyms: ["Idealistic", "Impractical", "Theoretical"],
    example1:
      "The committee adopted a pragmatic approach to extending library hours during finals week.",
    example2:
      "While the theory is ambitious, the authors also offer pragmatic recommendations for teachers.",
  }),
  defineWord({
    word: "Holistic",
    pronunciation: "/həʊˈlɪs.tɪk/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Looking at the whole system rather than just examining individual parts in isolation.",
    formalDefinition:
      "Characterized by comprehension of the parts of something as intimately interconnected and explicable only by reference to the whole.",
    usageContext:
      "Used in education, psychology, health, and interdisciplinary essays.",
    informalEquivalent: "Whole-picture",
    synonyms: ["Comprehensive", "Integrated", "Whole-system", "All-encompassing"],
    antonyms: ["Fragmented", "Narrow", "Atomistic"],
    example1:
      "A holistic evaluation of student success considers wellbeing alongside test scores.",
    example2:
      "The textbook takes a holistic view of environmental sustainability.",
  }),
  defineWord({
    word: "Systematic",
    pronunciation: "/ˌsɪs.təˈmæt.ɪk/",
    partOfSpeech: "Adjective",
    difficulty: "BEGINNER",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Done or acting according to a fixed, organized plan or system; methodical.",
    formalDefinition:
      "Conducted according to a step-by-step, ordered, and repeatable methodological plan.",
    usageContext:
      "Used in literature reviews, lab reports, and research methodology sections.",
    informalEquivalent: "Step-by-step / organized",
    synonyms: ["Methodical", "Structured", "Orderly", "Organized"],
    antonyms: ["Haphazard", "Random", "Unsystematic"],
    example1:
      "A systematic review of the literature identified forty-two relevant peer-reviewed studies.",
    example2:
      "Taking a systematic approach to proofreading helps catch both structural and grammatical errors.",
  }),
  defineWord({
    word: "Salient",
    pronunciation: "/ˈseɪ.li.ənt/",
    partOfSpeech: "Adjective",
    difficulty: "ADVANCED",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Most noticeable, important, or prominent.",
    formalDefinition:
      "Standing out conspicuously; of primary significance in an analysis or summary.",
    usageContext:
      "Used when summarizing the most important points of an article or dataset.",
    informalEquivalent: "Main / standout",
    synonyms: ["Prominent", "Notable", "Principal", "Key"],
    antonyms: ["Inconspicuous", "Minor", "Peripheral"],
    example1:
      "The concluding section summarizes the most salient findings of the three-year study.",
    example2:
      "During her presentation, she highlighted three salient differences between the two historical periods.",
  }),
  defineWord({
    word: "Distinct",
    pronunciation: "/dɪˈstɪŋkt/",
    partOfSpeech: "Adjective",
    difficulty: "BEGINNER",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Clearly separate and different from something else.",
    formalDefinition:
      "Readily distinguishable from all others; discrete in nature, category, or function.",
    usageContext:
      "Used when categorizing concepts or contrasting two separate phenomena.",
    informalEquivalent: "Clearly different",
    synonyms: ["Separate", "Discrete", "Differentiated", "Unique"],
    antonyms: ["Identical", "Indistinguishable", "Overlapping"],
    example1:
      "The essay divides the literary movement into three distinct historical phases.",
    example2:
      "Although related, academic integrity and citation style are two distinct concepts.",
  }),
  defineWord({
    word: "Analogous",
    pronunciation: "/əˈnæl.ə.ɡəs/",
    partOfSpeech: "Adjective",
    difficulty: "ADVANCED",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Comparable in certain respects, typically in a way that makes clearer the nature of the things compared.",
    formalDefinition:
      "Possessing structural or functional correspondence that permits valid comparison across domains.",
    usageContext:
      "Used in comparative essays and scientific explanations when drawing an analogy.",
    informalEquivalent: "Similar to / like",
    synonyms: ["Comparable", "Parallel", "Similar", "Akin"],
    antonyms: ["Disparate", "Unrelated", "Dissimilar"],
    example1:
      "An essay outline functions in a manner analogous to an architect's blueprint.",
    example2:
      "Researchers observed analogous patterns of language acquisition in both age groups.",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Critical Reading & Argumentation (+17 words -> 25 total in category)
  // ═══════════════════════════════════════════════════════════════════════════
  defineWord({
    word: "Assertion",
    pronunciation: "/əˈsɜː.ʃən/",
    partOfSpeech: "Noun",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "A confident and forceful statement of fact or belief that requires evidence in academic writing.",
    formalDefinition:
      "A declarative proposition or claim advanced in an argument that must be substantiated with evidence.",
    usageContext:
      "Used when analyzing an author's claims or introducing arguments in an essay.",
    informalEquivalent: "Bold claim",
    synonyms: ["Claim", "Contention", "Declaration", "Proposition"],
    antonyms: ["Question", "Denial", "Doubt"],
    example1:
      "The reviewer noted that the author's central assertion lacked statistical support.",
    example2:
      "In persuasive writing, every major assertion should be followed by credible evidence.",
  }),
  defineWord({
    word: "Contention",
    pronunciation: "/kənˈtɛn.ʃən/",
    partOfSpeech: "Noun",
    difficulty: "ADVANCED",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "A central point or argument that a writer or speaker is working to prove.",
    formalDefinition:
      "A main thesis or point maintained in a scholarly argument, or an area of active dispute.",
    usageContext:
      "Used in argumentative essays and critical book reviews.",
    informalEquivalent: "Main point / disagreement",
    synonyms: ["Argument", "Thesis", "Claim", "Position"],
    antonyms: ["Agreement", "Harmony"],
    example1:
      "It is the author's main contention that early reading habits shape lifelong critical thinking.",
    example2:
      "Funding allocation remained a point of contention among the committee members.",
  }),
  defineWord({
    word: "Presupposition",
    pronunciation: "/ˌpriː.sʌp.əˈzɪʃ.ən/",
    partOfSpeech: "Noun",
    difficulty: "ADVANCED",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "Something silently assumed beforehand at the beginning of a line of argument.",
    formalDefinition:
      "An implicit assumption taken for granted in advance of an argument or inquiry.",
    usageContext:
      "Used in critical reading to uncover hidden assumptions in a text.",
    informalEquivalent: "Hidden assumption",
    synonyms: ["Assumption", "Premise", "Preconception", "Postulate"],
    antonyms: ["Proven fact", "Conclusion"],
    example1:
      "Critical readers examine the unstated presuppositions behind an editorial argument.",
    example2:
      "The question itself rests on the presupposition that standardized tests measure creativity.",
  }),
  defineWord({
    word: "Rhetoric",
    pronunciation: "/ˈrɛt.ər.ɪk/",
    partOfSpeech: "Noun",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "The art of effective or persuasive speaking and writing.",
    formalDefinition:
      "The study and practice of persuasive composition, argumentative structure, and stylistic technique.",
    usageContext:
      "Used in rhetorical analysis essays and communication courses.",
    informalEquivalent: "Persuasive language",
    synonyms: ["Oratory", "Eloquence", "Persuasion", "Discourse"],
    antonyms: ["Inarticulateness", "Plainness"],
    example1:
      "The essay analyzes how the speech uses classical rhetoric to appeal to civic duty.",
    example2:
      "Strong academic arguments rely on verifiable evidence rather than emotional rhetoric alone.",
  }),
  defineWord({
    word: "Inference",
    pronunciation: "/ˈɪn.fər.əns/",
    partOfSpeech: "Noun",
    difficulty: "BEGINNER",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "A conclusion reached on the basis of evidence and reasoning rather than direct statement.",
    formalDefinition:
      "A logical conclusion derived by reasoning from observed evidence or established premises.",
    usageContext:
      "Used in reading comprehension, logic, and research interpretation.",
    informalEquivalent: "Educated conclusion",
    synonyms: ["Deduction", "Conclusion", "Corollary", "Implication"],
    antonyms: ["Wild guess", "Direct observation"],
    example1:
      "Readers can draw a clear inference about the character's motives from her opening letter.",
    example2:
      "Statistical inference allows researchers to estimate population trends from a representative sample.",
  }),
  defineWord({
    word: "Deduction",
    pronunciation: "/dɪˈdʌk.ʃən/",
    partOfSpeech: "Noun",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "Reasoning from a general principle or rule to reach a specific logical conclusion.",
    formalDefinition:
      "The process of reasoning in which a specific conclusion necessarily follows from general premises.",
    usageContext:
      "Used in logic, philosophy, mathematics, and analytical writing.",
    informalEquivalent: "Top-down reasoning",
    synonyms: ["Inference", "Logical conclusion", "Syllogism", "Reasoning"],
    antonyms: ["Guesswork", "Intuition"],
    example1:
      "Through careful deduction, the historian dated the unsigned letter to the spring of 1898.",
    example2:
      "Deductive arguments guarantee their conclusion if the initial premises are true.",
  }),
  defineWord({
    word: "Induction",
    pronunciation: "/ɪnˈdʌk.ʃən/",
    partOfSpeech: "Noun",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "Reasoning from specific observations and examples to form a general rule or conclusion.",
    formalDefinition:
      "The derivation of general principles or probabilistic conclusions from specific empirical observations.",
    usageContext:
      "Used in scientific methodology and critical thinking courses.",
    informalEquivalent: "Bottom-up reasoning",
    synonyms: ["Generalization", "Empirical inference", "Synthesizing"],
    antonyms: ["Deduction", "A priori assumption"],
    example1:
      "Scientific inquiry often begins with induction, observing patterns across dozens of cases.",
    example2:
      "Reasoning by induction requires a sufficiently large and representative set of examples.",
  }),
  defineWord({
    word: "Nuanced",
    pronunciation: "/ˈnjuː.ɑːnst/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "Showing careful awareness of subtle shades of meaning, complexity, or perspective.",
    formalDefinition:
      "Characterized by subtle distinctions, balanced perspective, and sensitivity to complexity.",
    usageContext:
      "Used to praise sophisticated essays that avoid oversimplified black-and-white claims.",
    informalEquivalent: "Balanced and detailed",
    synonyms: ["Subtle", "Balanced", "Sophisticated", "Refined"],
    antonyms: ["Simplistic", "One-sided", "Crude"],
    example1:
      "Instead of taking an extreme stance, the student offered a nuanced analysis of remote learning.",
    example2:
      "A nuanced reading of the historical debate recognizes valid concerns on both sides.",
  }),
  defineWord({
    word: "Subjective",
    pronunciation: "/səbˈdʒɛk.tɪv/",
    partOfSpeech: "Adjective",
    difficulty: "BEGINNER",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "Based on personal feelings, tastes, or opinions rather than external facts.",
    formalDefinition:
      "Proceeding from or shaped by individual perspective, personal feeling, or internal interpretation.",
    usageContext:
      "Used in contrast with 'objective' when evaluating sources or responses.",
    informalEquivalent: "Opinion-based",
    synonyms: ["Personal", "Individual", "Impressionistic", "Perspective-bound"],
    antonyms: ["Objective", "Impartial", "Factual"],
    example1:
      "While book enjoyment is subjective, an author's use of historical evidence can be evaluated objectively.",
    example2:
      "Grading rubrics help reduce subjective variation across different evaluators.",
  }),
  defineWord({
    word: "Validity",
    pronunciation: "/vəˈlɪd.ɪ.ti/",
    partOfSpeech: "Noun",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "The quality of being logically sound, well-grounded, or measuring what it claims to measure.",
    formalDefinition:
      "The extent to which a logical argument is structurally sound or an assessment accurately measures its intended construct.",
    usageContext:
      "Used in critical evaluation of arguments and research instruments.",
    informalEquivalent: "Soundness / accuracy",
    synonyms: ["Soundness", "Legitimacy", "Cogency", "Accuracy"],
    antonyms: ["Invalidity", "Fallacy", "Inaccuracy"],
    example1:
      "The literature review questions the validity of studies that relied solely on self-reported memory.",
    example2:
      "Before accepting a conclusion, critical thinkers examine the validity of the underlying premises.",
  }),
  defineWord({
    word: "Reliability",
    pronunciation: "/rɪˌlaɪ.əˈbɪl.ɪ.ti/",
    partOfSpeech: "Noun",
    difficulty: "BEGINNER",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "The quality of being trustworthy or producing consistent results every time it is tested.",
    formalDefinition:
      "The degree to which an assessment instrument or source yields consistent, reproducible results across repeated trials.",
    usageContext:
      "Used when evaluating sources, tests, and research measurements.",
    informalEquivalent: "Consistency / trustworthiness",
    synonyms: ["Consistency", "Dependability", "Trustworthiness", "Stability"],
    antonyms: ["Unreliability", "Inconsistency"],
    example1:
      "Students must evaluate the reliability of websites before using them in academic papers.",
    example2:
      "Test-retest reliability was confirmed by administering the assessment twice over a two-week interval.",
  }),
  defineWord({
    word: "Scrutinize",
    pronunciation: "/ˈskruː.tɪ.naɪz/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "To examine or inspect something very closely and critically.",
    formalDefinition:
      "To subject a claim, document, or dataset to minute, critical examination.",
    usageContext:
      "Used in critical reading and peer review contexts.",
    informalEquivalent: "Inspect closely",
    synonyms: ["Examine", "Inspect", "Analyze", "Investigate"],
    antonyms: ["Skim", "Overlook", "Glance at"],
    example1:
      "Peer reviewers scrutinize every statistical table before recommending a manuscript for publication.",
    example2:
      "Critical readers scrutinize the evidence behind persuasive headlines.",
  }),
  defineWord({
    word: "Critique",
    pronunciation: "/krɪˈtiːk/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "To evaluate a theory, article, or work in a detailed and balanced analytical way.",
    formalDefinition:
      "To assess systematically both the strengths and methodological limitations of a scholarly or creative work.",
    usageContext:
      "Used in critical response papers, peer review, and seminar discussions.",
    informalEquivalent: "Review / evaluate",
    synonyms: ["Evaluate", "Assess", "Appraise", "Analyze"],
    antonyms: ["Accept blindly", "Ignore"],
    example1:
      "In a scholarly critique, students evaluate both the strengths and the weaknesses of an author's argument.",
    example2:
      "Workshop participants were asked to critique two classmates' draft introductions constructively.",
  }),
  defineWord({
    word: "Vindicate",
    pronunciation: "/ˈvɪn.dɪ.keɪt/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "To show that a belief, theory, or person was right or justified after earlier doubt.",
    formalDefinition:
      "To substantiate or justify a previously questioned claim or hypothesis through new evidence.",
    usageContext:
      "Used when new evidence proves an earlier theory or scholar was right.",
    informalEquivalent: "Prove right",
    synonyms: ["Justify", "Validate", "Confirm", "Exonerate"],
    antonyms: ["Disprove", "Discredit", "Refute"],
    example1:
      "Recent archaeological discoveries vindicated the historian's earlier hypothesis.",
    example2:
      "Long-term test results vindicated the department's decision to emphasize writing workshops.",
  }),
  defineWord({
    word: "Underpin",
    pronunciation: "/ˌʌn.dəˈpɪn/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "To support, justify, or form the foundation for a theory, claim, or argument.",
    formalDefinition:
      "To serve as the foundational evidence or theoretical basis supporting a broader thesis.",
    usageContext:
      "Used when describing the core evidence or principles supporting an argument.",
    informalEquivalent: "Back up / form the base of",
    synonyms: ["Support", "Buttress", "Sustain", "Anchor"],
    antonyms: ["Undermine", "Weaken", "Subvert"],
    example1:
      "Three decades of cognitive research underpin the principles of spaced vocabulary review.",
    example2:
      "Primary archival documents underpin the biography's central chapters.",
  }),
  defineWord({
    word: "Undermine",
    pronunciation: "/ˌʌn.dəˈmaɪn/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "To weaken or damage the credibility, foundation, or effectiveness of an argument.",
    formalDefinition:
      "To erode the logical foundation, credibility, or persuasive force of a thesis or institution.",
    usageContext:
      "Used in critical analysis when explaining how a flaw or contradiction weakens a claim.",
    informalEquivalent: "Weaken / hurt",
    synonyms: ["Weaken", "Erode", "Compromise", "Subvert"],
    antonyms: ["Strengthen", "Underpin", "Bolster"],
    example1:
      "Relying on outdated statistics can undermine an otherwise persuasive essay.",
    example2:
      "Unacknowledged contradictions in the witness accounts undermined the author's conclusion.",
  }),
  defineWord({
    word: "Reconcile",
    pronunciation: "/ˈrɛk.ən.saɪl/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "To find a way in which two seemingly conflicting ideas or findings can both be true or compatible.",
    formalDefinition:
      "To harmonize or resolve apparent discrepancies between competing datasets, theories, or viewpoints.",
    usageContext:
      "Used in synthesis essays and literature reviews when resolving conflicting findings.",
    informalEquivalent: "Bring together / resolve",
    synonyms: ["Harmonize", "Resolve", "Integrate", "Synthesize"],
    antonyms: ["Separate", "Polarize", "Conflict"],
    example1:
      "The final section of the paper attempts to reconcile the conflicting results of the two surveys.",
    example2:
      "Scholars have long sought to reconcile individual liberty with collective civic responsibility.",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Formal & Classroom Communication (+17 words -> 25 total in category)
  // ═══════════════════════════════════════════════════════════════════════════
  defineWord({
    word: "Eloquent",
    pronunciation: "/ˈɛl.ə.kwənt/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    simpleDefinition:
      "Fluent, clear, and persuasive in speaking or writing.",
    formalDefinition:
      "Characterized by fluent, forceful, and apt expression in public speaking or formal composition.",
    usageContext:
      "Used to describe persuasive presentations, speeches, and polished essays.",
    informalEquivalent: "Well-spoken",
    synonyms: ["Articulate", "Expressive", "Fluent", "Persuasive"],
    antonyms: ["Inarticulate", "Hesitant", "Unclear"],
    example1:
      "The student delivered an eloquent defense of her capstone research project.",
    example2:
      "An eloquent introduction captures the audience's attention while stating the thesis clearly.",
  }),
  defineWord({
    word: "Concise",
    pronunciation: "/kənˈsaɪs/",
    partOfSpeech: "Adjective",
    difficulty: "BEGINNER",
    categorySlug: "academic-communication",
    simpleDefinition:
      "Giving a lot of information clearly and in a few words; brief but complete.",
    formalDefinition:
      "Expressing much in few words; free from unnecessary elaboration or redundancy.",
    usageContext:
      "Used in writing feedback, abstracts, executive summaries, and slide design.",
    informalEquivalent: "Short and clear",
    synonyms: ["Succinct", "Brief", "Pithy", "Compact"],
    antonyms: ["Verbose", "Wordy", "Rambling"],
    example1:
      "A research abstract should provide a concise summary of the study's purpose, methods, and results.",
    example2:
      "Replacing wordy phrases with precise verbs makes academic writing more concise.",
  }),
  defineWord({
    word: "Succinct",
    pronunciation: "/səkˈsɪŋkt/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    simpleDefinition:
      "Briefly and clearly expressed, without wasted words.",
    formalDefinition:
      "Marked by compact, precise expression without superfluous words.",
    usageContext:
      "Used when praising clear, focused answers in seminars, exams, and summaries.",
    informalEquivalent: "Short and to the point",
    synonyms: ["Concise", "Terse", "Compact", "Focused"],
    antonyms: ["Wordy", "Lengthy", "Diffuse"],
    example1:
      "During the Q&A session, the presenter gave a succinct explanation of her sampling method.",
    example2:
      "Each paragraph should begin with a succinct topic sentence.",
  }),
  defineWord({
    word: "Verbose",
    pronunciation: "/vɜːˈbəʊs/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    simpleDefinition:
      "Using or containing more words than are needed; overly wordy.",
    formalDefinition:
      "Characterized by the use of an excessive number of words that obscure rather than clarify meaning.",
    usageContext:
      "Used in writing revision and peer review when trimming unnecessary wordiness.",
    informalEquivalent: "Too wordy",
    synonyms: ["Wordy", "Long-winded", "Prolix", "Redundant"],
    antonyms: ["Concise", "Succinct", "Laconic"],
    example1:
      "The first draft was overly verbose, so the writer edited out repetitive adjectives.",
    example2:
      "Academic writing should be formal and precise, not unnecessarily verbose.",
  }),
  defineWord({
    word: "Lucid",
    pronunciation: "/ˈluː.sɪd/",
    partOfSpeech: "Adjective",
    difficulty: "ADVANCED",
    categorySlug: "academic-communication",
    simpleDefinition:
      "Expressed clearly; easy to understand even when the topic is difficult.",
    formalDefinition:
      "marked by intellectual clarity, transparency of thought, and ease of comprehension.",
    usageContext:
      "Used to describe clear explanations of complex theories in lectures or essays.",
    informalEquivalent: "Easy to follow",
    synonyms: ["Clear", "Intelligible", "Transparent", "Cogent"],
    antonyms: ["Obscure", "Confusing", "Muddled"],
    example1:
      "The textbook offers a lucid explanation of macroeconomic supply and demand.",
    example2:
      "Her lucid presentation made a complex statistical model accessible to the entire class.",
  }),
  defineWord({
    word: "Paraphrase",
    pronunciation: "/ˈpær.ə.freɪz/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To express the meaning of a writer or speaker using different words, while still citing the original source.",
    formalDefinition:
      "To restate a passage or idea in one's own words and sentence structure to achieve clarity while attributing the original author.",
    usageContext:
      "Essential in academic writing, research papers, and avoiding plagiarism.",
    informalEquivalent: "Put in your own words",
    synonyms: ["Restate", "Reword", "Rephrase", "Render"],
    antonyms: ["Quote verbatim", "Copy"],
    example1:
      "Rather than stringing together long quotations, strong writers paraphrase key findings and cite the source.",
    example2:
      "In seminar discussions, paraphrasing a classmate's point confirms that you understood their perspective.",
  }),
  defineWord({
    word: "Mediate",
    pronunciation: "/ˈmiː.di.eɪt/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To help two disagreeing sides reach an understanding or agreement during a discussion.",
    formalDefinition:
      "To intervene constructively between differing viewpoints or parties in order to promote mutual understanding and resolution.",
    usageContext:
      "Used in group discussions, seminar moderation, and conflict-resolution contexts.",
    informalEquivalent: "Step in and help settle",
    synonyms: ["Moderate", "Reconcile", "Arbitrate", "Facilitate"],
    antonyms: ["Provoke", "Divide", "Polarize"],
    example1:
      "The seminar moderator helped mediate the debate between the two competing student panels.",
    example2:
      "Effective team leaders mediate disagreements by focusing on shared project goals.",
  }),
  defineWord({
    word: "Reiterate",
    pronunciation: "/riˈɪt.ə.reɪt/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To say or state something again for emphasis and clarity.",
    formalDefinition:
      "To restate an essential point or principle for emphasis and retention.",
    usageContext:
      "Used in conclusions, presentations, and formal emails instead of 'repeat again'.",
    informalEquivalent: "Say again",
    synonyms: ["Restate", "Emphasize", "Reaffirm", "Repeat"],
    antonyms: ["Retract", "Omit"],
    example1:
      "In her closing slide, the presenter reiterated the three core recommendations of the study.",
    example2:
      "The professor reiterated the importance of submitting original work with complete citations.",
  }),
  defineWord({
    word: "Emphasize",
    pronunciation: "/ˈɛm.fə.saɪz/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To give special importance or prominence to a point in speaking or writing.",
    formalDefinition:
      "To stress or foreground a concept, finding, or principle as particularly significant.",
    usageContext:
      "Used in essays, presentations, and summaries to highlight key points.",
    informalEquivalent: "Stress / point out",
    synonyms: ["Highlight", "Underscore", "Stress", "Foreground"],
    antonyms: ["Downplay", "Minimize", "Overlook"],
    example1:
      "Recent educational studies emphasize the value of active recall over passive re-reading.",
    example2:
      "During the orientation, advisers emphasized the academic support services available on campus.",
  }),
  defineWord({
    word: "Underscore",
    pronunciation: "/ˌʌn.dəˈskɔːr/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To emphasize or show that something is especially important.",
    formalDefinition:
      "To accentuate or draw heightened attention to the importance of a fact or implication.",
    usageContext:
      "Used in analytical conclusions and formal presentations.",
    informalEquivalent: "Highlight / drive home",
    synonyms: ["Emphasize", "Highlight", "Accentuate", "Reinforce"],
    antonyms: ["Downplay", "Understate"],
    example1:
      "These survey results underscore the need for clearer study guides before midterm exams.",
    example2:
      "The keynote speaker underscored the connection between ethical leadership and transparent communication.",
  }),
  defineWord({
    word: "Acknowledge",
    pronunciation: "/əkˈnɒl.ɪdʒ/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To accept or admit the existence, truth, or contribution of something.",
    formalDefinition:
      "To recognize formally the validity of a limitation, counterargument, or scholarly contribution.",
    usageContext:
      "Used in research limitations, citations, and respectful classroom debate.",
    informalEquivalent: "Admit / give credit to",
    synonyms: ["Recognize", "Admit", "Credit", "Concede"],
    antonyms: ["Deny", "Ignore", "Dismiss"],
    example1:
      "Responsible researchers always acknowledge the limitations of their sample size.",
    example2:
      "In the preface, the author acknowledges the librarians who assisted with archival documents.",
  }),
  defineWord({
    word: "Inquire",
    pronunciation: "/ɪnˈkwaɪər/",
    partOfSpeech: "Verb",
    difficulty: "BEGINNER",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To ask formally for information or investigate a question.",
    formalDefinition:
      "To seek information by questioning or to conduct a systematic investigation into a matter.",
    usageContext:
      "Used in formal emails, interviews, and academic correspondence instead of 'ask about'.",
    informalEquivalent: "Ask about",
    synonyms: ["Ask", "Query", "Investigate", "Probe"],
    antonyms: ["Answer", "Reply", "Ignore"],
    example1:
      "I am writing to inquire about undergraduate research assistant opportunities for the spring semester.",
    example2:
      "The committee inquired into the causes of the scheduling conflict.",
  }),
  defineWord({
    word: "Deliberate",
    pronunciation: "/dɪˈlɪb.ə.reɪt/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To engage in long and careful consideration or discussion before reaching a decision.",
    formalDefinition:
      "To weigh options and evidence carefully and methodically in group consultation.",
    usageContext:
      "Used in seminar discussions, committees, and case study debates.",
    informalEquivalent: "Talk over carefully",
    synonyms: ["Consider", "Debate", "Reflect", "Confer"],
    antonyms: ["Rush", "Decide impulsively"],
    example1:
      "The student panel deliberated for an hour before selecting the winning research poster.",
    example2:
      "Group members deliberated on the most ethical solution to the case study dilemma.",
  }),
  defineWord({
    word: "Advocate",
    pronunciation: "/ˈæd.və.keɪt/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To publicly recommend or support a particular policy, method, or viewpoint.",
    formalDefinition:
      "To argue in favor of or recommend a specific policy, reform, or theoretical approach using reasoned evidence.",
    usageContext:
      "Used in persuasive essays, policy proposals, and debates.",
    informalEquivalent: "Push for / support",
    synonyms: ["Recommend", "Champion", "Propose", "Endorse"],
    antonyms: ["Oppose", "Criticize", "Reject"],
    example1:
      "Many educators advocate open-access textbooks to reduce financial barriers for college students.",
    example2:
      "In her concluding chapter, the author advocates a balanced approach to digital literacy.",
  }),
  defineWord({
    word: "Stipulate",
    pronunciation: "/ˈstɪp.jʊ.leɪt/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To demand or specify a requirement clearly as part of an agreement or rule.",
    formalDefinition:
      "To specify an essential condition or requirement within an academic guideline, syllabus, or agreement.",
    usageContext:
      "Used when referring to syllabus guidelines, research rules, or formal policies.",
    informalEquivalent: "Require / spell out",
    synonyms: ["Specify", "Require", "Mandate", "Prescribe"],
    antonyms: ["Waive", "Leave optional"],
    example1:
      "The course syllabus stipulates that all essays must follow APA 7th edition formatting.",
    example2:
      "Ethics guidelines stipulate that participant data must remain confidential.",
  }),
  defineWord({
    word: "Elucidate",
    pronunciation: "/ɪˈluː.sɪ.deɪt/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To make something complex clear; to explain in a way that sheds light on a difficult topic.",
    formalDefinition:
      "To make lucid or clear by providing thorough explanation, illustration, or analysis.",
    usageContext:
      "Used in lectures, essays, and presentations when clarifying complex ideas.",
    informalEquivalent: "Make clear / shed light on",
    synonyms: ["Clarify", "Illuminate", "Explain", "Explicate"],
    antonyms: ["Obscure", "Confuse", "Complicate"],
    example1:
      "The professor used a real-world case study to elucidate the abstract economic principle.",
    example2:
      "Annotated diagrams help elucidate the stages of cellular respiration.",
  }),
  defineWord({
    word: "Formulate",
    pronunciation: "/ˈfɔː.mjʊ.leɪt/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To create, prepare, or express a plan, question, or theory methodically and clearly.",
    formalDefinition:
      "To devise and state a research question, thesis, or strategic plan in systematic and precise terms.",
    usageContext:
      "Used when developing research questions, thesis statements, or responses.",
    informalEquivalent: "Put together / come up with",
    synonyms: ["Devise", "Develop", "Frame", "Construct"],
    antonyms: ["Improvise", "Dismantle"],
    example1:
      "The first step in any research project is to formulate a focused, answerable question.",
    example2:
      "Students were given ten minutes to formulate a structured response to the debate prompt.",
  }),
  defineWord({
    word: "Synthesize",
    pronunciation: "/ˈsɪn.θə.saɪz/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "To combine findings or ideas from multiple sources into a unified analysis.",
    formalDefinition:
      "To integrate diverse empirical findings or theoretical perspectives into a coherent whole.",
    usageContext:
      "Used in literature reviews and comparative essays.",
    informalEquivalent: "Put together",
    synonyms: ["Integrate", "Unify", "Combine", "Amalgamate"],
    antonyms: ["Separate", "Fragment"],
    example1:
      "The essay synthesizes evidence from five longitudinal studies.",
    example2:
      "Strong researchers synthesize competing viewpoints rather than listing them in isolation.",
  }),
  defineWord({
    word: "Alleviate",
    pronunciation: "/əˈliː.vi.eɪt/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "formal-english",
    simpleDefinition:
      "To make a problem, burden, or difficulty less severe.",
    formalDefinition:
      "To lessen, relieve, or mitigate the severity of a difficulty or adverse condition.",
    usageContext:
      "Used in formal writing instead of 'ease' or 'make less bad'.",
    informalEquivalent: "Ease / make better",
    synonyms: ["Mitigate", "Relieve", "Ease", "Ameliorate"],
    antonyms: ["Exacerbate", "Aggravate", "Worsen"],
    example1:
      "Early orientation workshops help alleviate academic anxiety among incoming freshmen.",
    example2:
      "Open-source textbooks can alleviate the financial burden of university coursework.",
  }),
  defineWord({
    word: "Presumably",
    pronunciation: "/prɪˈzjuː.mə.bli/",
    partOfSpeech: "Adverb",
    difficulty: "INTERMEDIATE",
    categorySlug: "transition-linking",
    simpleDefinition:
      "Used to convey that what is asserted is very likely true based on reasonable evidence.",
    formalDefinition:
      "By reasonable assumption; as may be inferred from the available evidence in the absence of direct proof.",
    usageContext:
      "Used in cautious academic interpretation when full proof is not yet available.",
    informalEquivalent: "Probably / I guess",
    synonyms: ["Plausibly", "Evidently", "Apparently", "Seemingly"],
    antonyms: ["Unlikely", "Improbably"],
    example1:
      "Several pages of the diary are missing, presumably lost during the archive relocation.",
    example2:
      "The higher response rate in the second group was presumably due to the shorter survey format.",
  }),
  defineWord({
    word: "Exhaustive",
    pronunciation: "/ɪɡˈzɔː.stɪv/",
    partOfSpeech: "Adjective",
    difficulty: "ADVANCED",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Examining, including, or considering every possible aspect and detail; completely thorough.",
    formalDefinition:
      "Comprehending all relevant elements or possibilities of an inquiry without omission.",
    usageContext:
      "Used to describe comprehensive bibliographies, archival searches, or analyses.",
    informalEquivalent: "Complete / leaving nothing out",
    synonyms: ["Comprehensive", "Thorough", "Encyclopedic", "Complete"],
    antonyms: ["Incomplete", "Partial", "Cursory"],
    example1:
      "After an exhaustive review of the archival records, the team located the original charter.",
    example2:
      "While this bibliography is not exhaustive, it includes the foundational works in the field.",
  }),
  defineWord({
    word: "Corroboration",
    pronunciation: "/kəˌrɒb.əˈreɪ.ʃən/",
    partOfSpeech: "Noun",
    difficulty: "ADVANCED",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "Independent evidence that confirms or supports a statement, theory, or finding.",
    formalDefinition:
      "Independent empirical or documentary evidence that confirms the validity of a proposition.",
    usageContext:
      "Used when evaluating whether a claim has independent backing.",
    informalEquivalent: "Backing / proof",
    synonyms: ["Confirmation", "Verification", "Validation", "Support"],
    antonyms: ["Refutation", "Contradiction"],
    example1:
      "Historians require independent corroboration before accepting a single eyewitness account.",
    example2:
      "The laboratory measurements provided direct corroboration of the theoretical model.",
  }),
  defineWord({
    word: "Explicate",
    pronunciation: "/ˈɛk.splɪ.keɪt/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "academic-communication",
    simpleDefinition:
      "To analyze and develop an idea, poem, or principle in detail so its meaning is clear.",
    formalDefinition:
      "To unfold and analyze systematically the implicit meanings and structure of a text or theory.",
    usageContext:
      "Used in literary criticism, philosophy essays, and theoretical presentations.",
    informalEquivalent: "Unpack / explain in detail",
    synonyms: ["Elucidate", "Interpret", "Expound", "Unpack"],
    antonyms: ["Obscure", "Summarize briefly"],
    example1:
      "In the first half of the seminar, the student explicated the central metaphor of the sonnet.",
    example2:
      "The chapter explicates the relationship between ethical theory and classroom practice.",
  }),
  defineWord({
    word: "Theorize",
    pronunciation: "/ˈθɪə.raɪz/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "To form a theory or set of principles to explain why something happens.",
    formalDefinition:
      "To construct a coherent theoretical explanation for observed phenomena.",
    usageContext:
      "Used in humanities, social sciences, and natural sciences essays.",
    informalEquivalent: "Come up with a theory",
    synonyms: ["Hypothesize", "Postulate", "Speculate", "Conceptualize"],
    antonyms: ["Observe passively", "Disprove"],
    example1:
      "Linguists theorize that exposure to diverse reading materials accelerates syntax mastery.",
    example2:
      "Early sociologists theorized that urbanization would reshape community traditions.",
  }),
  defineWord({
    word: "Operationalize",
    pronunciation: "/ˌɒp.ərˈeɪ.ʃən.əl.aɪz/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "To define an abstract concept in a way that allows it to be clearly measured in a study.",
    formalDefinition:
      "To translate an abstract theoretical construct into observable, measurable variables for empirical research.",
    usageContext:
      "Used in research methodology sections when defining how concepts are measured.",
    informalEquivalent: "Turn into something measurable",
    synonyms: ["Measure", "Quantify", "Define", "Standardize"],
    antonyms: ["Obscure", "Abstract"],
    example1:
      "The researchers operationalized 'student engagement' using weekly participation logs and quiz completion rates.",
    example2:
      "Before designing a survey, scholars must operationalize each abstract variable.",
  }),
  defineWord({
    word: "Augment",
    pronunciation: "/ɔːɡˈmɛnt/",
    partOfSpeech: "Verb",
    difficulty: "ADVANCED",
    categorySlug: "formal-english",
    simpleDefinition:
      "To make something greater, stronger, or more complete by adding to it.",
    formalDefinition:
      "To enlarge, supplement, or strengthen in size, scope, or effectiveness.",
    usageContext:
      "Used in formal writing instead of 'add to' or 'boost'.",
    informalEquivalent: "Add to / boost",
    synonyms: ["Supplement", "Enhance", "Expand", "Amplify"],
    antonyms: ["Diminish", "Reduce", "Deplete"],
    example1:
      "Interactive audio exercises augment traditional textbook reading assignments.",
    example2:
      "The author augmented her archival research with oral history interviews.",
  }),
  defineWord({
    word: "Cultivate",
    pronunciation: "/ˈkʌl.tɪ.veɪt/",
    partOfSpeech: "Verb",
    difficulty: "INTERMEDIATE",
    categorySlug: "formal-english",
    simpleDefinition:
      "To develop, nurture, or improve a skill, habit, or quality over time.",
    formalDefinition:
      "To foster and develop an intellectual habit, skill, or disposition through deliberate practice.",
    usageContext:
      "Used in education and reflective essays instead of 'build up'.",
    informalEquivalent: "Build up / grow",
    synonyms: ["Foster", "Nurture", "Develop", "Encourage"],
    antonyms: ["Neglect", "Stifle", "Discourage"],
    example1:
      "University seminars are designed to cultivate independent critical thinking.",
    example2:
      "Daily reading helps students cultivate a rich and versatile academic vocabulary.",
  }),
  defineWord({
    word: "Heretofore",
    pronunciation: "/ˌhɪə.tʊˈfɔːr/",
    partOfSpeech: "Adverb",
    difficulty: "ADVANCED",
    categorySlug: "transition-linking",
    simpleDefinition:
      "Before now; up to this point in time or in the text.",
    formalDefinition:
      "Up to the present time or point of analysis; previously.",
    usageContext:
      "Used in formal historical, legal, and scholarly prose.",
    informalEquivalent: "Up until now",
    synonyms: ["Previously", "Hitherto", "Formerly", "Prior to this"],
    antonyms: ["Henceforth", "Subsequently", "Hereafter"],
    example1:
      "The newly discovered letters shed light on a heretofore unexamined period of the poet's life.",
    example2:
      "Variables that had heretofore been ignored proved central to the final model.",
  }),
  defineWord({
    word: "Consecutively",
    pronunciation: "/kənˈsɛk.jʊ.tɪv.li/",
    partOfSpeech: "Adverb",
    difficulty: "BEGINNER",
    categorySlug: "transition-linking",
    simpleDefinition:
      "In an unbroken sequence; one right after another without interruption.",
    formalDefinition:
      "Following continuously in unbroken chronological or numerical order.",
    usageContext:
      "Used when describing experimental trials, longitudinal timelines, or streaks.",
    informalEquivalent: "In a row / back to back",
    synonyms: ["Successively", "Sequentially", "Continuously", "In succession"],
    antonyms: ["Intermittently", "Sporadically"],
    example1:
      "Participants completed the reading assessment on five consecutively scheduled mornings.",
    example2:
      "Pages in an academic manuscript should be numbered consecutively from the title page to the references.",
  }),
  defineWord({
    word: "Multifaceted",
    pronunciation: "/ˌmʌl.tiˈfæs.ɪ.tɪd/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Having many different sides, aspects, or features to consider.",
    formalDefinition:
      "Comprising numerous distinct dimensions, perspectives, or contributing factors.",
    usageContext:
      "Used in essay introductions and thesis statements when describing complex topics.",
    informalEquivalent: "Many-sided",
    synonyms: ["Complex", "Multidimensional", "Varied", "Nuanced"],
    antonyms: ["Simple", "One-dimensional", "Uniform"],
    example1:
      "Academic motivation is a multifaceted concept influenced by curiosity, goals, and classroom support.",
    example2:
      "The essay offers a multifaceted examination of renewable energy adoption.",
  }),
  defineWord({
    word: "Tangible",
    pronunciation: "/ˈtæn.dʒə.bəl/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "analytical-descriptive",
    simpleDefinition:
      "Clear and definite; real enough to be seen, measured, or experienced.",
    formalDefinition:
      "Capable of being precisely perceived, verified, or measured; concrete rather than purely abstract.",
    usageContext:
      "Used when contrasting concrete outcomes with abstract theories.",
    informalEquivalent: "Real / concrete",
    synonyms: ["Concrete", "Measurable", "Palpable", "Substantial"],
    antonyms: ["Intangible", "Abstract", "Vague"],
    example1:
      "Peer tutoring produced tangible improvements in first-year essay scores.",
    example2:
      "The report translates abstract sustainability goals into tangible campus initiatives.",
  }),
  defineWord({
    word: "Cogent",
    pronunciation: "/ˈkəʊ.dʒənt/",
    partOfSpeech: "Adjective",
    difficulty: "ADVANCED",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "Clear, logical, and convincing in argument.",
    formalDefinition:
      "Appealing forcibly to the mind or reason; logically sound and persuasive.",
    usageContext:
      "Used to praise well-reasoned essays, rebuttals, and scholarly arguments.",
    informalEquivalent: "Convincing and logical",
    synonyms: ["Convincing", "Compelling", "Persuasive", "Sound"],
    antonyms: ["Weak", "Unconvincing", "Illogical"],
    example1:
      "The author presents a cogent argument for expanding undergraduate research fellowships.",
    example2:
      "A cogent rebuttal addresses the strongest version of the opposing viewpoint.",
  }),
  defineWord({
    word: "Tenable",
    pronunciation: "/ˈtɛn.ə.bəl/",
    partOfSpeech: "Adjective",
    difficulty: "ADVANCED",
    categorySlug: "critical-argumentation",
    simpleDefinition:
      "Able to be defended or maintained against criticism or attack.",
    formalDefinition:
      "Capable of being logically maintained or defended with evidence against scholarly critique.",
    usageContext:
      "Used when evaluating whether a hypothesis or position holds up under scrutiny.",
    informalEquivalent: "Defensible",
    synonyms: ["Defensible", "Viable", "Justifiable", "Plausible"],
    antonyms: ["Untenable", "Indefensible", "Flawed"],
    example1:
      "In light of the new archival evidence, the earlier chronology is no longer tenable.",
    example2:
      "The essay demonstrates why a balanced regulatory framework remains the most tenable solution.",
  }),
  defineWord({
    word: "Colloquial",
    pronunciation: "/kəˈləʊ.kwi.əl/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-communication",
    simpleDefinition:
      "Used in ordinary, everyday conversation rather than in formal speech or academic writing.",
    formalDefinition:
      "Characteristic of informal spoken conversation and therefore generally unsuitable for formal academic prose.",
    usageContext:
      "Used in writing instruction to distinguish everyday slang or idioms from formal style.",
    informalEquivalent: "Everyday / casual",
    synonyms: ["Conversational", "Informal", "Vernacular", "Casual"],
    antonyms: ["Formal", "Scholarly", "Academic"],
    example1:
      "When revising an essay draft, students should replace colloquial expressions with precise academic vocabulary.",
    example2:
      "While colloquial phrasing works well in casual conversation, research papers require a formal tone.",
  }),
  defineWord({
    word: "Hierarchy",
    pronunciation: "/ˈhaɪ.ə.rɑːr.ki/",
    partOfSpeech: "Noun",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "A system in which people, ideas, or items are ranked one above another according to status, authority, or importance.",
    formalDefinition:
      "A structured classification or organizational system in which elements are arranged in graded ranks or levels of authority, abstraction, or priority.",
    usageContext:
      "Used in organizational theory, conceptual frameworks, and evidence classification.",
    informalEquivalent: "Pecking order / ranking",
    synonyms: ["Ranking", "Stratification", "Order", "Grading"],
    antonyms: ["Equality", "Disorder", "Flatness"],
    example1:
      "Maslow's hierarchy of needs remains a foundational framework in organizational behavior courses.",
    example2:
      "Researchers establish a clear hierarchy of evidence when synthesizing clinical and empirical studies.",
  }),
  defineWord({
    word: "Hierarchical",
    pronunciation: "/ˌhaɪ.əˈrɑːr.kɪ.kəl/",
    partOfSpeech: "Adjective",
    difficulty: "INTERMEDIATE",
    categorySlug: "academic-vocabulary",
    simpleDefinition:
      "Arranged in an order of rank, grade, or level from highest to lowest.",
    formalDefinition:
      "Characterized by or organized into graded levels of authority, classification, or structural dependency.",
    usageContext:
      "Used in systems analysis, management structures, and multi-level research models.",
    informalEquivalent: "Top-down / ranked",
    synonyms: ["Stratified", "Graded", "Ranked", "Tiered"],
    antonyms: ["Egalitarian", "Flat", "Non-hierarchical"],
    example1:
      "The corporation transitioned from a rigid hierarchical structure to a collaborative cross-functional model.",
    example2:
      "Hierarchical regression analysis was used to evaluate the incremental variance explained by each predictor.",
  }),
];
