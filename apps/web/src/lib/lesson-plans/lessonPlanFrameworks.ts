import type { LessonPlanFramework, FrameworkId } from "./types";

export const LESSON_PLAN_FRAMEWORKS: readonly LessonPlanFramework[] = [
  {
    id: "ilaw",
    name: "ILAW Framework",
    unitLabel: "Elements",
    count: 4,
    items: [
      {
        id: "intentions",
        label: "I: Intentions",
        description:
          "Learning competencies (the competencies targeted in the session contributing to progressive mastery) and learning objectives (competencies unpacked, clustered or sequenced into clear, focused, manageable objectives aligned with learner readiness, instructional context and available learning time).",
        subItems: [
          {
            name: "Learning competencies",
            description:
              "the competencies targeted in the session; they may span several lessons, with each session contributing to progressive mastery.",
          },
          {
            name: "Learning objectives",
            description:
              "competencies unpacked, clustered or sequenced into clear, focused, manageable objectives aligned with learner readiness, instructional context and available learning time.",
          },
        ],
      },
      {
        id: "learning-experience",
        label: "L: Learning Experience",
        description:
          "Learning resources (relevant resources aligned with objectives plus alternative home-based resources), pre-lesson activity (brief introductory activity/routine activating prior knowledge), lesson flow (learning design principles applied coherently and responsively to learner responses), and opportunities for integration and contextualization (cross-curricular, real-life, cultural or community-based connections).",
        subItems: [
          {
            name: "Learning resources",
            description:
              "relevant, appropriate resources aligned with the objectives, plus alternative resources for home-based learning if face-to-face instruction is interrupted.",
          },
          {
            name: "Pre-lesson activity",
            description:
              "a brief introductory activity, routine or check-in that activates prior knowledge and prepares learners.",
          },
          {
            name: "Lesson flow",
            description:
              "learning design principles applied so the experience is coherent, engaging, responsive and developmentally appropriate; adjusted to learner responses rather than rigidly following the plan.",
          },
          {
            name: "Opportunities for integration and contextualization",
            description:
              "connections within and across learning areas, and real-life, cultural or community-based contexts.",
          },
        ],
      },
      {
        id: "assessing-learning",
        label: "A: Assessing Learning",
        description:
          "Formative assessments: formative checks throughout the session to monitor understanding and progress toward the objectives, guide immediate instructional adjustments, and identify learners needing support.",
        subItems: [
          {
            name: "Formative assessments",
            description:
              "formative checks throughout the session to monitor understanding and progress toward the objectives, guide immediate instructional adjustments, and identify learners needing support.",
          },
        ],
      },
      {
        id: "ways-forward",
        label: "W: Ways Forward",
        description:
          "Reflective practice (reflecting on teaching experience and evidence of learning at the end of each session to identify next steps like remediation, reteaching or enrichment) and extended learning opportunities (additional learning experiences within or beyond the classroom serving as enrichment or remediation).",
        subItems: [
          {
            name: "Reflective practice",
            description:
              "reflect on the teaching experience and evidence of learning at the end of each session, then identify next steps such as remediation, reteaching or enrichment.",
          },
          {
            name: "Extended learning opportunities",
            description:
              "additional learning experiences within or beyond the classroom, which may serve as enrichment or remediation.",
          },
        ],
      },
    ],
    shortDescription:
      "DepEd's ILAW Framework: the four core elements teachers use in lesson planning. A lesson plan is sufficient when the learning intentions, learning experience, assessment approach and ways forward are evident and aligned. Teachers are not required to add components beyond the framework, and the sample guide is not a required national template.",
    originNote:
      "DepEd Order No. 016, s. 2026, Section V.A (ILAW Framework). Four core elements for lesson planning.",
    sourceCitation:
      "Department of Education (2026). DepEd Order No. 016, s. 2026, Guidelines on Lesson Planning and Learning Design, Section V.A (ILAW Framework). Full text attached to DepEd Gapan City Division Memorandum No. 217, s. 2026.",
    sourceLinks: [
      {
        label:
          "DO 016, s. 2026 full text (attached to DepEd Gapan City Division Memo 217)",
        url: "https://region3.deped.gov.ph/gapan/deped-gapan-city-division-memorandum-no-217-s-2026/",
      },
      {
        label: "DepEd Orders (official list)",
        url: "https://www.deped.gov.ph/category/issuances/deped-orders/",
      },
    ],
    sourceNote:
      "Elements and items follow Section V.A of the Order. The Order's Annex B lesson planning guide is a reference tool only, not a required template.",
    aiAssistanceNote:
      "AI use in lesson planning is covered by DepEd Order No. 003, s. 2026 (Foundational Guidelines on Artificial Intelligence in Basic Education), which DO 016 cites. Check the latest DepEd issuances before using AI tools.",
    stages: [
      {
        id: "intentions",
        name: "Intentions",
        purpose:
          "Target learning competencies contributing to progressive mastery, unpacked into clear, focused learning objectives aligned with learner readiness, instructional context, and available learning time.",
        teacherDoes: [
          "Identifies targeted learning competencies that contribute to progressive student mastery across sessions.",
          "Unpacks, clusters, or sequences competencies into clear, focused, and manageable objectives aligned with learner readiness and learning time.",
        ],
        learnersDo: [
          "Understand session learning competencies and articulate specific lesson objectives in their own words.",
          "Connect target objectives to their current readiness and personal learning goals.",
        ],
        writingTip:
          "Write measurable objectives that unpack targeted competencies into clear, student-centered milestones appropriate for available learning time.",
        guideQuestions: [
          "What competencies are targeted in this session, and how do they contribute to progressive mastery?",
          "How are competencies unpacked into clear, focused objectives aligned with learner readiness, context, and time?",
        ],
      },
      {
        id: "learning-experience",
        name: "Learning Experience",
        purpose:
          "Provide relevant learning resources, an introductory pre-lesson activity, a responsive lesson flow, and opportunities for integration and contextualization.",
        teacherDoes: [
          "Prepares aligned learning resources (including alternative resources for home-based learning) and leads a brief pre-lesson activity to activate prior knowledge.",
          "Applies responsive learning design principles across the lesson flow, adapting to learner responses and integrating cross-curricular and cultural contexts.",
        ],
        learnersDo: [
          "Participate in the pre-lesson routine and engage actively with learning resources throughout the coherent lesson flow.",
          "Make meaningful connections across learning areas and apply concepts to real-life and community contexts.",
        ],
        writingTip:
          "Design a flexible, responsive lesson flow with clear pre-lesson activities, backup resources, and authentic cultural or community integration.",
        guideQuestions: [
          "What aligned resources (including alternative home-based resources) and pre-lesson activities prepare learners?",
          "How does the lesson flow respond to learner responses while integrating cross-curricular and cultural or community contexts?",
        ],
      },
      {
        id: "assessing-learning",
        name: "Assessing Learning",
        purpose:
          "Conduct formative checks throughout the session to monitor understanding and progress toward the objectives, guide immediate instructional adjustments, and identify learners needing support.",
        teacherDoes: [
          "Conducts formative checks throughout the session to monitor understanding and progress toward the objectives.",
          "Uses formative evidence to make immediate instructional adjustments and identify learners needing additional support.",
        ],
        learnersDo: [
          "Engage in formative checks and demonstrate their emerging understanding against the objectives.",
          "Respond to timely feedback and clarify misunderstandings during the session.",
        ],
        writingTip:
          "Embed formative checks throughout the lesson to inform real-time instructional adjustments rather than waiting until the end.",
        guideQuestions: [
          "What formative checks throughout the session monitor understanding and progress toward the objectives?",
          "How will formative assessment evidence guide immediate instructional adjustments and identify learners needing support?",
        ],
      },
      {
        id: "ways-forward",
        name: "Ways Forward",
        purpose:
          "Engage in reflective practice on teaching experience and learning evidence at the end of each session, and provide extended learning opportunities for remediation or enrichment.",
        teacherDoes: [
          "Reflects on the teaching experience and evidence of learning at the end of the session to identify next instructional steps.",
          "Designs extended learning opportunities (remediation, reteaching, or enrichment) within or beyond the classroom.",
        ],
        learnersDo: [
          "Reflect on their learning evidence and participate in targeted remediation, reteaching, or enrichment activities.",
          "Engage in extended learning opportunities within or beyond the classroom.",
        ],
        writingTip:
          "Base next steps on concrete session evidence, clearly outlining reflective insights and tailored extended learning opportunities.",
        guideQuestions: [
          "What next instructional steps (remediation, reteaching, or enrichment) does reflective practice indicate based on evidence of learning?",
          "What extended learning opportunities within or beyond the classroom will support or enrich learner progress?",
        ],
      },
    ],
    samplePlan: {
      title: "Plant Roots and Water Absorption",
      subject: "Elementary Science",
      gradeLevel: "Grade 4",
      topic: "Parts and Functions of Plant Roots",
      learningCompetency:
        "Describe the specialized structures of terrestrial plants and their functions.",
      learningObjectives:
        "1. Identify the difference between taproot and fibrous root systems.\n2. Explain how root hairs absorb water and minerals from soil to sustain plant life.",
      materials:
        "Potted weed samples with washed roots, magnifying lenses, clear cups with dyed water and celery stalks, student observation worksheets.",
      sections: [
        {
          stageId: "intentions",
          stageName: "Intentions",
          content:
            "Lesson Targets:\n- By the end of this 45-minute lesson, Grade 4 pupils will distinguish between taproots and fibrous roots with at least 80% accuracy on visual cards.\n- Pupils will explain the role of root hairs in absorbing moisture through an illustrated diagram.\n\nEssential Question:\nHow do plant roots keep plants firmly anchored while gathering water hidden beneath the soil?",
          annotation:
            "Clearly anchors the session to specific, observable targets and introduces an engaging essential question.",
        },
        {
          stageId: "learning-experience",
          stageName: "Learning Experience",
          content:
            "Phase 1 - Root Gallery Observation (15 mins):\n- In groups of four, learners examine real plant samples (grass for fibrous, carrot/dandelion for taproot) using hand lenses.\n- Pupils record root thickness, branching patterns, and presence of tiny root hairs on their observation sheets.\n\nPhase 2 - Class Discovery & Guided Discussion (15 mins):\n- Teacher leads a whole-class synthesis connecting observed branching to stability in heavy soil.\n- Demonstration: Teacher shows a celery stalk immersed in red dye, showing colored xylem veins carrying moisture up from the base.",
          annotation:
            "Balances sensory investigation in small groups with teacher-guided conceptual development and live demonstration.",
        },
        {
          stageId: "assessing-learning",
          stageName: "Assessing Learning",
          content:
            "Formative Check (10 mins):\n1. Quick-Sort Activity: Pupils sort 6 illustrated plant cards into Taproot vs. Fibrous Root categories on individual mini-boards.\n2. Exit Ticket Question: 'Why does grass pull out in clumps during weeding while a dandelion requires deeper digging? Explain using root types.'",
          annotation:
            "Pairs a rapid identification task with a short explanatory prompt measuring conceptual reasoning.",
        },
        {
          stageId: "ways-forward",
          stageName: "Ways Forward",
          content:
            "Remediation (Emerging understanding):\n- Guided picture matching with the teacher using 3D plastic root models and simplified flashcards focusing on root thickness.\n\nEnrichment (Proficient learners):\n- Investigate aerial roots (e.g., mangrove and orchid roots) and draft a brief index-card report on how roots adapt to wetland or humid air environments.",
          annotation:
            "Differentiates instructional follow-up into a tactile remedial path and an authentic environmental inquiry extension.",
        },
      ],
    },
  },
  {
    id: "4as",
    name: "4A's Framework",
    unitLabel: "Stages",
    count: 4,
    items: [
      {
        id: "activity",
        label: "Activity",
        description:
          "learners gain new knowledge and skills through a hands-on learning experience.",
      },
      {
        id: "analysis",
        label: "Analysis",
        description:
          "learners process the experience and link it to what they already know.",
      },
      {
        id: "abstraction",
        label: "Abstraction",
        description:
          "learners generalize and draw out new understanding from the experience.",
      },
      {
        id: "application",
        label: "Application",
        description:
          "learners try out and apply the new skills; successful application starts a new 4A cycle.",
      },
    ],
    shortDescription:
      "Experiential, constructivist lesson sequence: Activity, Analysis, Abstraction, Application. Learners build knowledge through experience and repeat the cycle.",
    originNote:
      "DepEd ALS-EST constructivist learning sequence: Activity, Analysis, Abstraction, and Application.",
    sourceCitation:
      "Department of Education, Philippines. ALS-EST Handbook for Implementers, Chapter 6: Learning Delivery, section 'Adult Learning and Constructivism' (Figure 6-1, The 4As of Adult Learning, adopted from the ALS Manual of Operations).",
    sourceLinks: [
      {
        label: "DepEd ALS-EST Handbook, Chapter 6: Learning Delivery (PDF)",
        url: "https://www.deped.gov.ph/als-est/PDF/ALS-EST_Handbook_Chapter06.pdf",
      },
    ],
    sourceNote:
      "DepEd's ALS-EST Handbook presents the 4A's (Activity, Analysis, Abstraction, Application) within a constructivist, experiential approach and credits the figure to the ALS Manual; it does not name an original author. The 4A's is also widely used in Philippine teacher education and is often compared to Kolb's experiential learning cycle. It is not a lesson plan format prescribed by DepEd Order No. 016, s. 2026.",
    stages: [
      {
        id: "activity",
        name: "Activity",
        purpose:
          "Engage learners in a hands-on learning experience where they gain new knowledge and skills.",
        teacherDoes: [
          "Sets up materials, guidelines, and safety or procedural parameters for the hands-on task.",
          "Circulates to observe learner dynamics and facilitate experiential engagement.",
        ],
        learnersDo: [
          "Participate actively in the hands-on task, experiment, or simulation to gain new knowledge and skills.",
          "Record initial observations, data, or personal reactions from the concrete experience.",
        ],
        writingTip:
          "Design a hands-on activity where learners directly experience concepts and skills before formalization.",
        guideQuestions: [
          "What hands-on learning experience will allow learners to gain new knowledge and skills concretely?",
          "How will the activity engage learners and generate meaningful observations for reflection?",
        ],
      },
      {
        id: "analysis",
        name: "Analysis",
        purpose:
          "Guide learners to process the hands-on experience and link it to what they already know.",
        teacherDoes: [
          "Poses scaffolding questions that prompt learners to process what happened during the activity.",
          "Helps learners connect observations from the activity to their prior knowledge.",
        ],
        learnersDo: [
          "Process the learning experience by sharing observations and analyzing patterns with peers.",
          "Link insights from the activity to what they already know.",
        ],
        writingTip:
          "Sequence analytical questions from descriptive observations to deeper links with prior knowledge.",
        guideQuestions: [
          "What guided questions will help learners process their hands-on experience and spot patterns?",
          "How will learners link what happened during the activity to what they already know?",
        ],
      },
      {
        id: "abstraction",
        name: "Abstraction",
        purpose:
          "Facilitate generalization where learners draw out new understanding and formal principles from the experience.",
        teacherDoes: [
          "Synthesizes learner insights into formal generalizations, standard definitions, and principles.",
          "Clarifies the new understanding drawn out from the activity and analysis.",
        ],
        learnersDo: [
          "Generalize and draw out new understanding from their analyzed experience.",
          "Formulate notes, diagrams, or conceptual summaries expressing the generalized rule.",
        ],
        writingTip:
          "Ensure the generalized understanding directly derives from the activity and analysis stages.",
        guideQuestions: [
          "What core generalization or new understanding should learners draw out from the experience?",
          "How will the teacher support learners in stating the generalized principle without passive lecturing?",
        ],
      },
      {
        id: "application",
        name: "Application",
        purpose:
          "Provide meaningful opportunities for learners to try out and apply the new skills, initiating a new learning cycle.",
        teacherDoes: [
          "Presents novel problems, authentic scenarios, or practical challenges for skill application.",
          "Evaluates learner application of new skills and reinforces the start of new learning cycles.",
        ],
        learnersDo: [
          "Try out and apply the new skills in novel, authentic situations.",
          "Demonstrate practical utility and build confidence to begin subsequent learning cycles.",
        ],
        writingTip:
          "Design authentic application tasks that demonstrate practical transfer of the new skills.",
        guideQuestions: [
          "How will learners try out and apply their new skills in a novel or practical context?",
          "How does successful application reinforce mastery and set the stage for the next learning cycle?",
        ],
      },
    ],
    samplePlan: {
      title: "Perimeter of Rectangles and Squares",
      subject: "Mathematics",
      gradeLevel: "Grade 5",
      topic: "Finding the Perimeter of Quadrilaterals",
      learningCompetency:
        "Find the perimeter of regular and irregular quadrilaterals.",
      learningObjectives:
        "1. Measure the boundary lengths of rectangular classroom objects accurately.\n2. Deduce and apply the perimeter formulas P = 2(l + w) and P = 4s in practical measurement problems.",
      materials:
        "Grid paper, meter sticks, 30cm rulers, index cards, real classroom objects (desk tops, book covers).",
      sections: [
        {
          stageId: "activity",
          stageName: "Activity",
          content:
            "Classroom Border Walk (10 mins):\n- In pairs, pupils use yarn and rulers to trace and measure the exact outer edge of three flat objects: an index card, a textbook cover, and a study table.\n- Pupils record the length of each individual side and compute the total distance around each object by adding all four edges.",
          annotation:
            "Gives students a physical, tactile sense of perimeter as distance traveled around an enclosed boundary.",
        },
        {
          stageId: "analysis",
          stageName: "Analysis",
          content:
            "Guided Discussion Questions (10 mins):\n1. 'What did you notice about the opposite sides of your book cover and index card?' (Pupils observe opposite sides have equal lengths).\n2. 'If opposite sides are identical, did you really need to measure four separate times?'\n3. 'How could you find the total distance using multiplication instead of adding four numbers?'",
          annotation:
            "Prompts students to notice geometric symmetry and discover shortcut operations before seeing the formula.",
        },
        {
          stageId: "abstraction",
          stageName: "Abstraction",
          content:
            "Formalization of Formulas (10 mins):\n- General Definition: Perimeter (P) is the total continuous boundary length enclosing a two-dimensional shape.\n- For Rectangles: P = length + width + length + width = 2 × (length + width) or P = 2l + 2w.\n- For Squares: All 4 sides (s) are congruent, therefore P = 4 × s.\n- Visual board anchor: Color-coded diagram highlighting length in blue and width in orange.",
          annotation:
            "Crystallizes learner observations into standard mathematical notation with clear algebraic representation.",
        },
        {
          stageId: "application",
          stageName: "Application",
          content:
            "Real-World Garden Fencing Challenge (15 mins):\n- Scenario: The school eco-club is building a rectangular vegetable garden measuring 8 meters long and 5 meters wide. Wire mesh costs 75 pesos per meter.\n- Task 1: Calculate the total perimeter of the fence.\n- Task 2: Calculate the total cost of fencing materials needed.\n- Independent practice: Solve 2 additional word problems from the practice worksheet.",
          annotation:
            "Applies the formula to an authentic budgeting and landscaping problem requiring unit conversion and multi-step reasoning.",
        },
      ],
    },
  },
  {
    id: "5es",
    name: "5E's Instructional Model",
    unitLabel: "Stages",
    count: 5,
    items: [
      {
        id: "engage",
        label: "Engage",
        description:
          "Capture curiosity, elicit prior knowledge and surface misconceptions.",
      },
      {
        id: "explore",
        label: "Explore",
        description:
          "Hands-on experiences where learners interact with materials and gather observations.",
      },
      {
        id: "explain",
        label: "Explain",
        description:
          "Learners articulate explanations with evidence, followed by formal concepts and terms.",
      },
      {
        id: "elaborate",
        label: "Elaborate",
        description:
          "Apply concepts to new situations or deeper problem-solving contexts.",
      },
      {
        id: "evaluate",
        label: "Evaluate",
        description:
          "Assess understanding and allow learners to evaluate their progress.",
      },
    ],
    shortDescription:
      "Constructivist, inquiry-based learning cycle developed by the Biological Sciences Curriculum Study (BSCS).",
    originNote:
      "BSCS 5E instructional model designed by Rodger W. Bybee for inquiry science instruction.",
    sourceCitation:
      "Bybee, R. W. (2015). The BSCS 5E Instructional Model: Creating Teachable Moments. Arlington, VA: NSTA Press.",
    sourceLinks: [
      {
        label: "BSCS report: Origins and Effectiveness (2006)",
        url: "https://bscs.org/reports/the-bscs",
      },
    ],
    stages: [
      {
        id: "engage",
        name: "Engage",
        purpose:
          "Capture learner curiosity, uncover prior knowledge or misconceptions, and introduce the focus phenomenon.",
        teacherDoes: [
          "Presents a puzzling phenomenon, short demonstration, or provocative inquiry question.",
          "Collects initial student predictions without revealing whether they are correct.",
        ],
        learnersDo: [
          "Express current ideas, make predictions, and ask exploratory questions.",
          "Show curiosity and identify what they find puzzling.",
        ],
        writingTip:
          "Keep the engagement short and focused on a surprising observation rather than explaining theory upfront.",
        guideQuestions: [
          "What discrepancy, discrepant event, or scenario will spark genuine student curiosity?",
          "How will the opening question reveal existing student conceptions or misunderstandings?",
        ],
      },
      {
        id: "explore",
        name: "Explore",
        purpose:
          "Provide hands-on experiences where learners interact directly with materials, gather data, and test hypotheses.",
        teacherDoes: [
          "Provides lab materials, guiding prompts, and observation guidelines.",
          "Acts as a facilitator, observing group trials and posing probing questions.",
        ],
        learnersDo: [
          "Manipulate materials, conduct trials, record measurements, and test predictions.",
          "Work cooperatively with peers to document evidence.",
        ],
        writingTip:
          "Avoid step-by-step cookbook recipes; give learners room to make decisions and observe genuine outcomes.",
        guideQuestions: [
          "What investigation will provide students with concrete empirical evidence?",
          "What specific observations or measurements will learners collect and record?",
        ],
      },
      {
        id: "explain",
        name: "Explain",
        purpose:
          "Encourage learners to articulate explanations based on their evidence, followed by formal scientific clarification.",
        teacherDoes: [
          "Invites student groups to present their findings and justify claims with evidence.",
          "Introduces formal scientific terms, models, and conceptual explanations.",
        ],
        learnersDo: [
          "Explain observations using data gathered during exploration.",
          "Adopt and integrate formal scientific terminology into their conceptual understanding.",
        ],
        writingTip:
          "Have learners share their explanations first before the teacher introduces the technical vocabulary.",
        guideQuestions: [
          "How will learners be guided to use their evidence to justify their explanations?",
          "What precise scientific vocabulary must be introduced to clarify the phenomenon?",
        ],
      },
      {
        id: "elaborate",
        name: "Elaborate",
        purpose:
          "Deepen student understanding by applying concepts to new situations, related phenomena, or broader contexts.",
        teacherDoes: [
          "Introduces a new context, engineering challenge, or extension scenario.",
          "Encourages learners to make cross-disciplinary or environmental connections.",
        ],
        learnersDo: [
          "Apply conceptual models to solve new problems or explain unfamiliar situations.",
          "Make connections between classroom science and real-world technologies.",
        ],
        writingTip:
          "Ensure the elaboration problem tests the same underlying principle in an unfamiliar setting.",
        guideQuestions: [
          "What new scenario or related phenomenon will challenge learners to extend their concept?",
          "How does this extension deepen conceptual understanding without introducing unrelated ideas?",
        ],
      },
      {
        id: "evaluate",
        name: "Evaluate",
        purpose:
          "Assess learner conceptual mastery and allow learners to reflect on their learning journey.",
        teacherDoes: [
          "Administers formal or informal assessment tasks aligned with target objectives.",
          "Evaluates student ability to apply principles and explain evidence.",
        ],
        learnersDo: [
          "Demonstrate mastery through problem-solving, diagramming, or written argumentation.",
          "Reflect on how their thinking evolved from the Engage stage to the present.",
        ],
        writingTip:
          "Include assessment questions that check for the resolution of the misconception identified in Engage.",
        guideQuestions: [
          "What assessment task will verify whether learners resolved earlier misconceptions?",
          "How will students demonstrate both procedural proficiency and conceptual depth?",
        ],
      },
    ],
    samplePlan: {
      title: "Thermal Conduction in Everyday Materials",
      subject: "Secondary Science",
      gradeLevel: "Grade 7",
      topic: "Heat Transfer by Conduction",
      learningCompetency:
        "Infer the conditions necessary for heat transfer to occur and describe conduction.",
      learningObjectives:
        "1. Explain the mechanism of heat transfer through solid materials at the molecular level.\n2. Classify common materials as thermal conductors or insulators based on experimental rates of heat transfer.",
      materials:
        "Metal spoon, wooden spoon, plastic spoon, hot water container, small butter pats, plastic beads, timer, safety goggles.",
      sections: [
        {
          stageId: "engage",
          stageName: "Engage",
          content:
            "Puzzling Cookware Observation (5 mins):\n- Teacher displays a metal cooking pan with a wooden handle.\n- Prompt: 'Why do cooks prefer wooden handles on stainless steel pans when cooking over high flames?'\n- Learners write quick predictions on sticky notes regarding what happens to heat inside different materials.",
          annotation:
            "Hooks interest with a familiar domestic tool and surfaces pre-existing intuitions about thermal safety.",
        },
        {
          stageId: "explore",
          stageName: "Explore",
          content:
            "Spoon Race Experiment (15 mins):\n- In groups of four, learners place equal-sized pats of butter on the handles of three identical-length spoons (metal, wood, plastic). A small bead is pressed into each butter pat.\n- The bowl ends of all three spoons are submerged simultaneously into a bowl of warm water (approx. 60°C).\n- Pupils time how long it takes for each bead to slide down as the butter melts.",
          annotation:
            "Provides a clean, fair-test laboratory experience with measurable dependent variables (time to slide).",
        },
        {
          stageId: "explain",
          stageName: "Explain",
          content:
            "Student Sharing & Scientific Terminology (10 mins):\n- Student groups present their timing data (metal: ~35 seconds; plastic: ~3 minutes; wood: bead remained in place after 5 mins).\n- Teacher facilitates explanation: Heat transfers through solids via particle collisions (conduction).\n- Key terms defined: Thermal Conductor (allows rapid thermal energy transfer via free electrons/lattice vibrations) vs. Thermal Insulator (resists thermal flow due to tightly bound electrons).",
          annotation:
            "Allows empirical evidence from student data to precede and support formal molecular explanations.",
        },
        {
          stageId: "elaborate",
          stageName: "Elaborate",
          content:
            "Thermos Bottle Design Analysis (10 mins):\n- Learners examine a cross-sectional diagram of a double-walled vacuum flask.\n- Prompt: 'Why does the flask use an empty vacuum space between two walls instead of solid plastic or metal?'\n- Pupils write a 3-sentence explanation linking the absence of particles in a vacuum to the prevention of conduction.",
          annotation:
            "Tests whether students understand that conduction requires matter/particles by asking about an empty vacuum.",
        },
        {
          stageId: "evaluate",
          stageName: "Evaluate",
          content:
            "Formative Mastery Quiz (5 mins):\n1. Conceptual Multiple Choice: Identifying why metals feel colder to touch at room temperature than wood.\n2. Short Constructed Response: Explaining why winter jackets use trapped air between down feathers to keep humans warm.",
          annotation:
            "Assesses both physical intuition and the practical application of insulation principles.",
        },
      ],
    },
  },
  {
    id: "6es",
    name: "6E's STEM Model",
    unitLabel: "Stages",
    count: 6,
    items: [
      {
        id: "engage",
        label: "Engage",
        description:
          "Introduce a real-world problem or technological challenge.",
      },
      {
        id: "explore",
        label: "Explore",
        description:
          "Investigate scientific principles and test materials.",
      },
      {
        id: "explain",
        label: "Explain",
        description:
          "Articulate concepts and mathematical models governing the system.",
      },
      {
        id: "engineer",
        label: "Engineer",
        description: "Learners design, build and test a solution.",
      },
      {
        id: "enrich",
        label: "Enrich",
        description:
          "Transfer to more complex problems, broader contexts or sustainability.",
      },
      {
        id: "evaluate",
        label: "Evaluate",
        description:
          "Assess mastery of science concepts and engineering design skills.",
      },
    ],
    shortDescription:
      "ITEEA's 6E Learning byDeSIGN model. Builds on the BSCS 5E cycle and adds an explicit Engineer (design) phase.",
    originNote:
      "ITEEA 6E Learning byDeSIGN framework integrating the 5E inquiry cycle with iterative engineering design.",
    sourceCitation:
      "Burke, B. N. (2014). The ITEEA 6E Learning byDeSIGN Model. Technology and Engineering Teacher, 73(6), 14-19. International Technology and Engineering Educators Association.",
    sourceLinks: [
      {
        label: "Official Link",
        url: "https://www.iteea.org/6e-learning-bydesign",
      },
    ],
    stages: [
      {
        id: "engage",
        name: "Engage",
        purpose:
          "Introduce a compelling real-world challenge or societal problem that stimulates interest and establishes need.",
        teacherDoes: [
          "Presents a real community problem or technological challenge.",
          "Facilitates student empathy and frames the scope of the design task.",
        ],
        learnersDo: [
          "Discuss the problem's impact on communities and identify personal stakes.",
          "Formulate inquiry questions and preliminary criteria for success.",
        ],
        writingTip:
          "Anchor the challenge in a relatable local context that demands a creative engineering solution.",
        guideQuestions: [
          "What real-world societal or technological problem frames this learning experience?",
          "How does the challenge connect to learners' everyday experiences or community needs?",
        ],
      },
      {
        id: "explore",
        name: "Explore",
        purpose:
          "Investigate underlying scientific principles, test component materials, and benchmark existing solutions.",
        teacherDoes: [
          "Provides diagnostic tests, testing apparatus, and reference resources.",
          "Guides learners in systematic data collection and material analysis.",
        ],
        learnersDo: [
          "Test material properties, analyze constraints, and evaluate failure modes.",
          "Document quantitative data to inform subsequent engineering designs.",
        ],
        writingTip:
          "Frame exploration as material characterization and testing rather than random experimentation.",
        guideQuestions: [
          "What scientific properties must learners investigate before attempting a design?",
          "What baseline data will help learners select appropriate materials for their prototype?",
        ],
      },
      {
        id: "explain",
        name: "Explain",
        purpose:
          "Crystallize the science and mathematical equations governing the behavior of the materials and systems.",
        teacherDoes: [
          "Explains scientific principles, governing equations, and industry standards.",
          "Helps learners map scientific mechanisms to engineering constraints.",
        ],
        learnersDo: [
          "Articulate why certain materials behave differently under specific stresses or conditions.",
          "Use scientific models and mathematical calculations to justify material choices.",
        ],
        writingTip:
          "Demonstrate clearly how scientific theories dictate engineering design trade-offs.",
        guideQuestions: [
          "What fundamental scientific concepts explain the test results gathered during exploration?",
          "How will mathematical reasoning or scientific models justify design decisions?",
        ],
      },
      {
        id: "engineer",
        name: "Engineer",
        purpose:
          "Design, build, test, and iterate a functional prototype under explicit constraints and performance criteria.",
        teacherDoes: [
          "Sets design constraints (budget, dimensions, available materials, deadlines).",
          "Oversees prototype fabrication, ensures safety, and coordinates structured testing.",
        ],
        learnersDo: [
          "Draft technical sketches, assemble functional prototypes, and execute performance tests.",
          "Analyze failure points and iteratively modify their design to optimize performance.",
        ],
        writingTip:
          "Define clear, quantifiable testing criteria (e.g., flow rate, load capacity, cost limit) so success is measurable.",
        guideQuestions: [
          "What measurable constraints and specifications govern the prototype?",
          "How will learners test, document failure modes, and iterate their prototype design?",
        ],
      },
      {
        id: "enrich",
        name: "Enrich",
        purpose:
          "Broaden the design's scope to address sustainability, economic scalability, or interdisciplinary connections.",
        teacherDoes: [
          "Prompts learners to examine environmental impact, production costs, and cultural suitability.",
          "Facilitates connections with ethical design and community implementation.",
        ],
        learnersDo: [
          "Evaluate the lifecycle, carbon footprint, and community affordability of their design.",
          "Propose adaptations for different community environments or scaling scenarios.",
        ],
        writingTip:
          "Push students to consider real-world factors beyond simple mechanical function, such as cost and ecology.",
        guideQuestions: [
          "How can the prototype be made more sustainable, cost-effective, or accessible?",
          "What societal, ethical, or environmental implications emerge from deploying this solution?",
        ],
      },
      {
        id: "evaluate",
        name: "Evaluate",
        purpose:
          "Assess student mastery of both scientific concepts and engineering design competencies using rubrics.",
        teacherDoes: [
          "Evaluates prototype performance, technical documentation, and design presentations.",
          "Provides constructive feedback on technical accuracy and iterative resilience.",
        ],
        learnersDo: [
          "Present prototype results, justify iterations, and reflect on team decision-making.",
          "Evaluate peer prototypes against shared engineering criteria.",
        ],
        writingTip:
          "Use a balanced rubric that awards credit for rigorous iteration and scientific reasoning, not just aesthetic finish.",
        guideQuestions: [
          "How does the assessment measure both scientific understanding and design thinking?",
          "How will students communicate their design process, data, and lessons learned from failure?",
        ],
      },
    ],
    samplePlan: {
      title: "Low-Cost Community Water Filtration Prototype",
      subject: "Science & Technology (STEM)",
      gradeLevel: "Grade 6",
      topic: "Designing a Multi-Layer Gravity Water Filter",
      learningCompetency:
        "Apply properties of mixtures and separation techniques to design a water purification device.",
      learningObjectives:
        "1. Explain the separation mechanisms (sedimentation, mechanical straining, absorption) in multi-layer filtration.\n2. Design and iterate a gravity water filter that reduces water turbidity under specified material constraints.",
      materials:
        "Clean plastic 1.5L bottles, fine sand, coarse sand, gravel, activated charcoal, coffee filters, cotton balls, turbid test water, clear measuring beakers, turbidity chart.",
      sections: [
        {
          stageId: "engage",
          stageName: "Engage",
          content:
            "Emergency Water Scenario (5 mins):\n- Prompt: 'Following a typhoon, municipal water pipes are disrupted, and your barangay has only turbid river water available for non-drinking sanitation tasks.'\n- Problem Statement: How can we build an effective, low-cost gravity filter using locally accessible materials to clear suspended sediments?",
          annotation:
            "Creates immediate personal urgency through a familiar post-typhoon community scenario.",
        },
        {
          stageId: "explore",
          stageName: "Explore",
          content:
            "Material Characterization Lab (15 mins):\n- Student groups test the flow rate and trapping efficiency of single materials: cotton ball, coarse gravel, fine sand, and charcoal.\n- Each team pours 100 mL of turbid water through individual test funnels and notes clarity change and elapsed drainage time.",
          annotation:
            "Enables teams to discover which layer traps coarse debris versus fine particulate before assembling their combined prototype.",
        },
        {
          stageId: "explain",
          stageName: "Explain",
          content:
            "Filtration Mechanics & Particle Separation (10 mins):\n- Teacher and learners synthesize principles:\n  1. Mechanical Straining: Gravel and coarse sand trap large detritus without clogging.\n  2. Fine Particle Trapping: Compact sand catches microscopic suspended silt.\n  3. Adsorption: Porous activated charcoal captures odor and organic discoloration at the surface level.\n- Principle: Multi-stage gradient layering prevents premature clogging of fine layers.",
          annotation:
            "Clarifies the precise scientific phenomena (straining vs. adsorption) to ground engineering choices.",
        },
        {
          stageId: "engineer",
          stageName: "Engineer",
          content:
            "Prototype Build & Iteration (20 mins):\n- Constraint: Teams receive one inverted 1.5L bottle and a maximum height of 15 cm of filtration media.\n- Test Run 1: Team measures effluent clarity (turbidity scale 1-5) and flow time for 250 mL turbid water.\n- Design Iteration: Teams adjust layer ordering or compacting density based on Run 1 failure modes (e.g., flow too slow or sand washed into output).",
          annotation:
            "Implements an explicit design-build-test-iterate cycle with quantitative performance feedback.",
        },
        {
          stageId: "enrich",
          stageName: "Enrich",
          content:
            "Community Scalability & Solar Disinfection (SODIS) (10 mins):\n- Discussion: Clarified water is still not biologically potable. How can communities eliminate pathogens cheaply?\n- Extension: Introduction of SODIS (Solar Water Disinfection) using clear PET bottles exposed to UV sunlight for 6 hours.\n- Cost analysis: Calculating the price per liter of the gravity filter for an evacuation center.",
          annotation:
            "Extends pure physical filtration to public health, biochemical safety, and disaster relief economics.",
        },
        {
          stageId: "evaluate",
          stageName: "Evaluate",
          content:
            "Engineering Showcase Rubric (10 mins):\n- Rubric Scoring: Clarity improvement (40%), Flow efficiency (20%), Iteration documentation (20%), Scientific explanation of layer sequence (20%).\n- Peer Review: Teams inspect neighbor devices and complete a constructive peer audit.",
          annotation:
            "Assesses both prototype performance metrics and the scientific justification of iterative choices.",
        },
      ],
    },
  },
];

export function getFrameworkById(id: string): LessonPlanFramework | undefined {
  return LESSON_PLAN_FRAMEWORKS.find((f) => f.id === id);
}

export function getDefaultFramework(): LessonPlanFramework {
  return LESSON_PLAN_FRAMEWORKS[0]!;
}

export function isValidFrameworkId(id: string): id is FrameworkId {
  return LESSON_PLAN_FRAMEWORKS.some((f) => f.id === id);
}

