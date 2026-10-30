import type {
  InterviewQuestionItem,
  RecruiterScenarioItem,
  QuizQuestionItem,
} from "./types";

export const PREDEFINED_QUESTIONS: InterviewQuestionItem[] = [
  // ─── 1. General Job Interview (6 Questions) ───
  {
    id: "gen-01",
    category: "GENERAL",
    difficulty: "ENTRY",
    jobPosition: "Junior Business Associate / Fresh Graduate",
    situation: "Opening interview question for entry-level candidates evaluating self-awareness and career alignment.",
    questionText: "Can you tell me about yourself and why you are interested in this position?",
    modelAnswer:
      "I recently graduated with a degree in Business Administration, where I focused on operational efficiency and customer-focused market research. During my academic internships, I led a project that streamlined inventory tracking for a local enterprise, improving record accuracy by 25%. I am eager to bring my analytical mindset, strong communication skills, and collaborative work ethic to this role, where I can actively contribute to your team's growth while learning from experienced professionals.",
    interviewTip:
      "Use the Present-Past-Future framework: briefly state where you are now, highlight a relevant past achievement or academic project, and conclude with why this specific role is your ideal next step.",
    evaluationCriteria: [
      "Clear, professional structure (Present-Past-Future)",
      "Highlights measurable outcomes or practical contributions",
      "Connects personal motivation directly to the organization",
    ],
    competency: "Self-Awareness & Professional Articulation",
  },
  {
    id: "gen-02",
    category: "GENERAL",
    difficulty: "INTERMEDIATE",
    jobPosition: "Business Operations Specialist",
    situation: "Assessing how candidates evaluate their professional growth and address areas of development.",
    questionText: "What is your greatest professional weakness, and how have you worked to overcome it?",
    modelAnswer:
      "Early in my coursework, I had a tendency to take on too many tasks independently because I wanted to ensure everything was done thoroughly. However, during a major business capstone project, I realized this approach risked burnout and delayed milestones. To improve, I adopted collaborative task boards like Trello, learned to delegate based on team members' individual strengths, and established weekly progress checkpoints. As a result, our team delivered the project two days ahead of schedule.",
    interviewTip:
      "Choose a genuine, non-critical weakness, emphasize the specific self-correction steps you took, and demonstrate positive tangible results.",
    evaluationCriteria: [
      "Demonstrates honest self-reflection without sounding defensive",
      "Outlines concrete corrective actions taken",
      "Shows measurable progress and improved teamwork",
    ],
    competency: "Continuous Improvement & Accountability",
  },
  {
    id: "gen-03",
    category: "GENERAL",
    difficulty: "ENTRY",
    jobPosition: "Management Trainee",
    situation: "Evaluating applicant long-term career ambition and company alignment.",
    questionText: "Where do you see yourself in three to five years?",
    modelAnswer:
      "In the next three to five years, my goal is to deepen my functional expertise in business operations and supply chain management. In the first couple of years, I aim to master this position, consistently meet key deliverables, and earn relevant certifications. Over time, I aspire to take on project leadership responsibilities, mentor incoming trainees, and contribute strategic insights to optimize department-level workflows.",
    interviewTip:
      "Align your ambitions with realistic growth stages within the company. Focus on skills mastery first, followed by value-add leadership.",
    evaluationCriteria: [
      "Realistic progression grounded in core competencies",
      "Commitment to continuous learning and organizational contribution",
      "Balance between personal ambition and team impact",
    ],
    competency: "Goal Setting & Career Vision",
  },
  {
    id: "gen-04",
    category: "GENERAL",
    difficulty: "INTERMEDIATE",
    jobPosition: "Administrative Officer",
    situation: "Assessing candidate composure and workflow prioritization when multiple urgent demands arise.",
    questionText: "How do you handle high-pressure deadlines or multiple competing priorities?",
    modelAnswer:
      "When facing competing priorities, I begin by organizing tasks using the Eisenhower Matrix—categorizing them by urgency and strategic importance. For instance, when exam season coincided with our student organization's annual conference, I created a master checklist, communicated transparently with my faculty adviser regarding milestone dates, and dedicated uninterrupted focus blocks to high-impact deliverables. This allowed us to execute the event seamlessly while maintaining a 3.8 GPA.",
    interviewTip:
      "Mention a specific prioritization technique and give concrete evidence of how transparent communication prevents dropped balls.",
    evaluationCriteria: [
      "Structured prioritization method described",
      "Calm, proactive communication with stakeholders",
      "Demonstrated ability to deliver quality under pressure",
    ],
    competency: "Time Management & Stress Resilience",
  },
  {
    id: "gen-05",
    category: "GENERAL",
    difficulty: "ENTRY",
    jobPosition: "Corporate Communication Assistant",
    situation: "Assessing research effort and genuine alignment with organizational culture and values.",
    questionText: "Why do you want to work for our organization rather than our competitors?",
    modelAnswer:
      "I have closely followed your organization's commitment to community-driven digital transformation and workplace sustainability. Unlike competitors who focus purely on transactional expansion, your recent initiative empowering local MSMEs with modern digital tools resonates strongly with my personal values. I want to contribute to an organization whose commercial success creates measurable, positive social impact.",
    interviewTip:
      "Research the organization's recent press releases, core values, or flagship community initiatives before answering.",
    evaluationCriteria: [
      "Specific knowledge of the company beyond the job posting",
      "Authentic alignment with mission and workplace culture",
      "Expresses passion for the company's long-term vision",
    ],
    competency: "Organizational Alignment & Company Research",
  },
  {
    id: "gen-06",
    category: "GENERAL",
    difficulty: "ADVANCED",
    jobPosition: "Business Development Analyst",
    situation: "Evaluating critical thinking and ability to extract insights from an initiative that did not go as planned.",
    questionText: "Describe a time when an academic or professional initiative failed. What did you learn?",
    modelAnswer:
      "During our entrepreneurial marketing campaign, our team launched a promotional pop-up that had low foot traffic and missed our sales projection by 40%. Rather than assigning blame, I led a post-mortem review where we analyzed customer surveys. We discovered that our location timing conflicted with peak student class hours. We pivoted to a pre-order mobile pickup model, recouping 85% of our inventory costs within two weeks. It taught me that early customer validation is far more critical than relying on unverified assumptions.",
    interviewTip:
      "Acknowledge the setback directly without excusing it, explain the objective root cause, and highlight the actionable pivot and lesson learned.",
    evaluationCriteria: [
      "Takes ownership without shifting blame to teammates",
      "Analyzes root causes analytically using data or feedback",
      "Demonstrates resilience and effective remediation",
    ],
    competency: "Resilience & Analytical Post-Mortem",
  },

  // ─── 2. Teamwork and Leadership (6 Questions) ───
  {
    id: "team-01",
    category: "TEAMWORK_LEADERSHIP",
    difficulty: "ENTRY",
    jobPosition: "Project Coordinator Assistant",
    situation: "Evaluating interpersonal conflict resolution within a diverse project team.",
    questionText: "Tell me about a time you had a disagreement with a team member. How did you resolve it?",
    modelAnswer:
      "During a semester-long feasibility study, a teammate and I strongly disagreed on whether to survey respondents online or conduct face-to-face interviews. Recognizing that arguing was stalling our project timeline, I suggested a brief one-on-one discussion over coffee. I listened to their concern regarding sample size, while I explained my point about demographic depth. We decided to create a hybrid methodology: 70% online surveys for broad reach, supplemented with 15 in-depth stakeholder interviews. Our professor praised the thoroughness of our research.",
    interviewTip:
      "Frame disagreement as a healthy exploration of ideas. Focus on empathy, active listening, and synthesizing a collaborative compromise.",
    evaluationCriteria: [
      "Prioritizes project goals over personal ego",
      "Demonstrates active listening and constructive compromise",
      "Maintains professional respect throughout conflict",
    ],
    competency: "Conflict Resolution & Active Listening",
  },
  {
    id: "team-02",
    category: "TEAMWORK_LEADERSHIP",
    difficulty: "INTERMEDIATE",
    jobPosition: "Team Lead Trainee",
    situation: "Assessing leadership capability in re-engaging an underperforming or disengaged team member.",
    questionText: "How do you handle a teammate who is consistently missing deadlines or underperforming?",
    modelAnswer:
      "Instead of calling them out publicly, I schedule a private, supportive check-in. In a past case study competition, a teammate began missing checkpoints. During our conversation, I learned they were overwhelmed by the statistical modeling segment because they lacked software experience. I offered to pair-work through the initial dataset and reallocated qualitative research tasks to their queue. With clearer expectations and support, they delivered high-quality work and our team finished in the top three.",
    interviewTip:
      "Show compassion first. Assume good intentions, uncover the root obstacle (skill gap, personal emergency, or unclear goals), and offer targeted support.",
    evaluationCriteria: [
      "Addresses issues privately and empathetically",
      "Identifies the root cause rather than making punitive assumptions",
      "Restructures workload or provides coaching to maintain accountability",
    ],
    competency: "Empathetic Leadership & Team Coaching",
  },
  {
    id: "team-03",
    category: "TEAMWORK_LEADERSHIP",
    difficulty: "ENTRY",
    jobPosition: "Junior Associate",
    situation: "Evaluating cross-cultural sensitivity and team adaptability.",
    questionText: "Describe an experience working with a diverse team. How did you ensure everyone's voice was heard?",
    modelAnswer:
      "In our international business seminar, our five-person group consisted of students from three different academic disciplines and two international exchange scholars. To ensure equitable participation, I proposed that we rotate meeting facilitation and establish an anonymous virtual idea board prior to brainstorming sessions. This gave introverted and non-native English speakers the time to articulate their concepts comfortably. The resulting proposal combined technical precision with creative marketing and won the best presentation award.",
    interviewTip:
      "Highlight intentional inclusive structures (e.g., written async inputs, rotating facilitation) rather than generic claims of being friendly.",
    evaluationCriteria: [
      "Demonstrates proactive inclusivity techniques",
      "Respects different working styles and cultural perspectives",
      "Creates psychological safety for all team members",
    ],
    competency: "Diversity, Equity & Collaborative Inclusivity",
  },
  {
    id: "team-04",
    category: "TEAMWORK_LEADERSHIP",
    difficulty: "ADVANCED",
    jobPosition: "Operations Lead",
    situation: "Assessing how the candidate steps up when leadership is absent or direction is ambiguous.",
    questionText: "Describe a situation where there was no designated leader and you stepped up to guide the group.",
    modelAnswer:
      "During an unscripted crisis simulation in my senior year, our team was handed a complex scenario involving a sudden product recall with a two-hour deadline. The group was initially paralyzed by overlapping suggestions. I stepped in, clarified our ultimate deliverable, broke the problem down into communications, legal, and operational workstreams, and asked each member to volunteer for their preferred stream. By acting as timekeeper and synthesizing inputs, we submitted a comprehensive response with fifteen minutes to spare.",
    interviewTip:
      "Show how you brought structure, calm, and clarity without being overbearing or dictatorial.",
    evaluationCriteria: [
      "Maintains composure in ambiguous environments",
      "Structures chaos into clear, actionable workstreams",
      "Facilitates consensus and empowers group ownership",
    ],
    competency: "Situational Leadership & Decisiveness",
  },
  {
    id: "team-05",
    category: "TEAMWORK_LEADERSHIP",
    difficulty: "ENTRY",
    jobPosition: "Business Support Specialist",
    situation: "Evaluating how the candidate receives constructive criticism from peers or mentors.",
    questionText: "How do you respond when a supervisor or teammate criticizes your work?",
    modelAnswer:
      "I view constructive feedback as the fastest route to professional mastery. Recently, during an internship presentation dry run, my mentor noted that my slides were too data-heavy and obscured the strategic takeaway. Instead of getting defensive, I thanked them for the observation, asked for a quick example of an effective slide ratio, and spent that afternoon redesigning the presentation to emphasize key executive metrics. The client specifically commended the presentation's clarity.",
    interviewTip:
      "Demonstrate emotional maturity, curiosity, and immediate application of feedback into tangible improvement.",
    evaluationCriteria: [
      "Separates personal identity from professional work",
      "Asks clarifying questions to understand feedback deeply",
      "Promptly implements suggestions with a positive attitude",
    ],
    competency: "Receptivity to Feedback & Growth Mindset",
  },
  {
    id: "team-06",
    category: "TEAMWORK_LEADERSHIP",
    difficulty: "INTERMEDIATE",
    jobPosition: "Student Affairs Assistant / Committee Lead",
    situation: "Assessing ability to motivate peers during high-stress, low-morale periods.",
    questionText: "How do you keep your teammates motivated when morale is low or project tasks become tedious?",
    modelAnswer:
      "When our committee was manually auditing over 1,200 member records before accreditation, the repetitive data entry caused significant fatigue and drooping spirits. I introduced daily micro-goals with small celebrations, created a transparent visual tracker celebrating milestones (such as 25%, 50%, and 75%), and reminded the team of how this audit directly secured scholarships for incoming students. Connecting the tedious work back to its meaningful impact helped us complete the audit two days early.",
    interviewTip:
      "Explain the psychological power of micro-milestones and connecting mundane daily tasks to the bigger meaningful mission.",
    evaluationCriteria: [
      "Understands intrinsic motivation and recognition",
      "Breaks large, exhausting tasks into achievable celebrations",
      "Connects technical work to human-centric impact",
    ],
    competency: "Team Motivation & Purpose-Driven Energy",
  },

  // ─── 3. Problem-Solving and Professionalism (6 Questions) ───
  {
    id: "prob-01",
    category: "PROBLEM_SOLVING",
    difficulty: "INTERMEDIATE",
    jobPosition: "Operations Analyst",
    situation: "Assessing root-cause analysis when faced with unexpected operational discrepancies.",
    questionText: "Walk me through a time you identified an operational error and resolved it before it escalated.",
    modelAnswer:
      "While preparing monthly reconciliation sheets during my accounting internship, I noticed an unexplained $3,200 variance in ledger disbursements. Instead of merely balancing the sheet with an adjusting entry, I traced the transaction logs back three weeks. I discovered that a recurring software subscription had billed twice under different billing codes due to a recent API update. I notified the finance officer, coordinated with the vendor support team to reverse the charge, and documented the issue in our internal vendor review log.",
    interviewTip:
      "Use the STAR method: Situation, Task, Action, and Result. Make sure your individual action clearly shows analytical rigor.",
    evaluationCriteria: [
      "Investigates root cause rather than patching surface symptoms",
      "Follows proper escalation and cross-departmental coordination",
      "Documents preventive measures for future recurrence",
    ],
    competency: "Root-Cause Analysis & Detail Orientation",
  },
  {
    id: "prob-02",
    category: "PROBLEM_SOLVING",
    difficulty: "ENTRY",
    jobPosition: "Administrative Trainee",
    situation: "Evaluating critical thinking when executing instructions with missing or ambiguous details.",
    questionText: "What do you do when you are assigned a task with very little guidance or incomplete information?",
    modelAnswer:
      "First, I gather whatever context is already available by reviewing past project files, department guidelines, or similar completed reports. Next, I outline what I know, identify the specific missing parameters, and draft a provisional plan of action. Finally, I schedule a brief 5-minute sync with my manager: 'Here is my understanding of the objective, here is my proposed roadmap, and here are the two specific questions I need your input on.' This demonstrates initiative while respecting their schedule.",
    interviewTip:
      "Never say you just guess or do nothing. Show proactive homework followed by concise, high-value questions.",
    evaluationCriteria: [
      "Conducts independent preliminary research first",
      "Prepares structured solutions rather than open-ended complaints",
      "Communicates concisely to clarify expectations",
    ],
    competency: "Resourcefulness & Autonomous Initiative",
  },
  {
    id: "prob-03",
    category: "PROBLEM_SOLVING",
    difficulty: "ADVANCED",
    jobPosition: "Compliance & Risk Junior Associate",
    situation: "Assessing ethical courage when observing improper or shortcut workplace practices.",
    questionText: "What would you do if you discovered a senior colleague taking shortcuts that violate protocol?",
    modelAnswer:
      "First, I would verify the facts to make sure I am not misinterpreting an approved exception. If a genuine violation of safety, compliance, or regulatory policy exists, I would approach the colleague respectfully in private: 'I noticed this step in our SOP was bypassed, and I want to ensure we don't encounter audit penalties—did the procedure change?' If they dismiss the concern or if the violation endangers the company or clients, I would escalate the matter through the proper institutional whistleblower or supervisor channels, prioritizing organizational integrity.",
    interviewTip:
      "Balance diplomacy with unwavering ethical boundaries. Verify facts first, address diplomatically where appropriate, and follow formal reporting channels.",
    evaluationCriteria: [
      "Verifies facts before jumping to conclusions",
      "Displays professional diplomacy without compromising ethics",
      "Understands escalation protocols and organizational duty of care",
    ],
    competency: "Workplace Ethics & Principled Integrity",
  },
  {
    id: "prob-04",
    category: "PROBLEM_SOLVING",
    difficulty: "ENTRY",
    jobPosition: "Junior Project Assistant",
    situation: "Evaluating composure and agility when project scopes suddenly change without warning.",
    questionText: "Tell me about a time when plans changed drastically at the last minute. How did you adapt?",
    modelAnswer:
      "Two days before an academic symposium, our keynote speaker experienced a medical emergency and cancelled. As program logistics chair, I immediately called a brief committee standup. We reviewed our contingency roster, reached out to an industry panelist who was already attending, and restructured the keynote into an interactive fireside panel with curated audience Q&A. The format change received higher engagement scores than traditional single-speaker lectures had in previous years.",
    interviewTip:
      "Highlight emotional poise under sudden disruption and emphasize rapid pivoting to workable contingencies.",
    evaluationCriteria: [
      "Stays calm and objective when surprises occur",
      "Activates contingency options rapidly",
      "Turns unexpected constraints into positive opportunities",
    ],
    competency: "Adaptability & Crisis Management",
  },
  {
    id: "prob-05",
    category: "PROBLEM_SOLVING",
    difficulty: "INTERMEDIATE",
    jobPosition: "Business Systems Coordinator",
    situation: "Assessing data-driven decision making and stakeholder alignment.",
    questionText: "How do you convince stakeholders to adopt a new process or tool they are hesitant to use?",
    modelAnswer:
      "I find that resistance to new tools usually stems from fear of disruption or lack of perceived value. When introducing a digital inventory log to a student kiosk that had used paper binders for years, I ran a small 1-week pilot alongside the old system. I demonstrated that the digital tool cut end-of-day tallying time from 45 minutes to 8 minutes and eliminated calculation errors. By showing concrete time savings and providing a 1-page quick-reference sheet, the team enthusiastically adopted the system.",
    interviewTip:
      "Advocate through low-risk pilots and clear demonstrations of 'what's in it for them' rather than executive mandates.",
    evaluationCriteria: [
      "Empathizes with user resistance and workflow friction",
      "Uses data-driven micro-pilots to prove value",
      "Provides supportive training materials to ease transitions",
    ],
    competency: "Change Management & Influence",
  },
  {
    id: "prob-06",
    category: "PROBLEM_SOLVING",
    difficulty: "ADVANCED",
    jobPosition: "Senior Project Specialist",
    situation: "Evaluating decision-making when forced to choose between speed and quality.",
    questionText: "Have you ever had to choose between delivering on time versus delivering perfection? How did you decide?",
    modelAnswer:
      "Yes. In business, 'done and reliable' is frequently superior to 'late and perfect.' While preparing a market competitor landscape for our client briefing, in-depth financial ratio analysis on secondary competitors would have delayed the briefing by three days. Recognizing that the client needed immediate strategic direction for an upcoming board meeting, I prioritized delivering thorough profiles on the top three primary competitors on schedule, while explicitly flagging secondary competitors as a Phase 2 addendum. The client secured board approval on time and appreciated the clear scope transparency.",
    interviewTip:
      "Explain the concept of Minimum Viable Product (MVP) and communicate transparently about scope tradeoffs.",
    evaluationCriteria: [
      "Distinguishes critical must-haves from nice-to-have polish",
      "Protects project commitments without sacrificing core accuracy",
      "Communicates transparent scope boundaries to stakeholders",
    ],
    competency: "Strategic Prioritization & Pragmatism",
  },

  // ─── 4. HR Assistant and Recruitment (6 Questions) ───
  {
    id: "hr-01",
    category: "HR_RECRUITMENT",
    difficulty: "ENTRY",
    jobPosition: "HR Assistant / Recruitment Coordinator",
    situation: "Assessing methodology and accuracy in screening candidate resumes against job requisitions.",
    questionText: "How do you approach screening a large volume of resumes for an open job requisition?",
    modelAnswer:
      "I begin by partnering with the hiring manager to distinguish non-negotiable threshold criteria (such as required certifications, specific software proficiencies, or degree requirements) from preferred qualifications. I build a structured screening matrix scoring candidates objectively against these criteria. For candidates who meet the baseline, I evaluate evidence of relevant achievements, continuity of career trajectory, and customized alignment with the role. I maintain an updated applicant tracking log to ensure every candidate receives timely communication.",
    interviewTip:
      "Emphasize objective criteria matrices to minimize unconscious bias and ensure an equitable candidate experience.",
    evaluationCriteria: [
      "Establishes clear objective criteria before reading resumes",
      "Focuses on demonstrated competencies rather than superficial markers",
      "Maintains systematic tracking and candidate communication",
    ],
    competency: "Candidate Sourcing & Screening Precision",
  },
  {
    id: "hr-02",
    category: "HR_RECRUITMENT",
    difficulty: "INTERMEDIATE",
    jobPosition: "HR Talent Coordinator",
    situation: "Assessing candidate communication and experience management when handling interview scheduling delays.",
    questionText: "An executive interviewer cancels an interview thirty minutes before the scheduled time. How do you handle the candidate?",
    modelAnswer:
      "I immediately contact the candidate by phone, followed by an immediate email confirmation, to apologize sincerely for the unexpected disruption. I explain that an urgent operational emergency arose, emphasizing that this is no reflection on their application. I offer three immediate reschedule options across the next 48 hours and check if they incurred travel or logistical inconveniences. Treating candidates with dignity during administrative delays preserves the organization's employer brand.",
    interviewTip:
      "Prioritize prompt, empathetic communication. Protect the employer reputation by treating the candidate's time as valuable.",
    evaluationCriteria: [
      "Responds rapidly with multi-channel communication",
      "Demonstrates empathy, professional accountability, and courtesy",
      "Proactively offers immediate, friction-free rescheduling options",
    ],
    competency: "Candidate Experience & Employer Branding",
  },
  {
    id: "hr-03",
    category: "HR_RECRUITMENT",
    difficulty: "INTERMEDIATE",
    jobPosition: "HR Generalist / Onboarding Specialist",
    situation: "Evaluating understanding of structured new-hire onboarding and employee retention.",
    questionText: "What makes a new hire onboarding process successful during their first 30 days?",
    modelAnswer:
      "Effective onboarding goes beyond administrative paperwork; it accelerates time-to-productivity and cultural belonging. A successful 30-day plan has three pillars: First, logistical readiness before Day 1 (workstation, credentials, safety gear). Second, structured orientation with an assigned peer buddy and clear 30-60-90 day milestone roadmaps. Third, consistent feedback loops—including Day 7, Day 14, and Day 30 check-ins to address friction, clarify role expectations, and reinforce team connection.",
    interviewTip:
      "Frame onboarding as an organizational retention strategy rather than a checklist of compliance forms.",
    evaluationCriteria: [
      "Addresses logistical, social, and role-performance dimensions",
      "Advocates structured check-ins and peer buddy mentorship",
      "Focuses on accelerating belonging and psychological safety",
    ],
    competency: "Employee Onboarding & Retention",
  },
  {
    id: "hr-04",
    category: "HR_RECRUITMENT",
    difficulty: "ADVANCED",
    jobPosition: "Recruitment Specialist",
    situation: "Evaluating behavioral interviewing techniques and how to probe beyond rehearsed answers.",
    questionText: "When an applicant provides generic or rehearsed responses during an interview, how do you probe deeper?",
    modelAnswer:
      "When a candidate offers textbook buzzwords, I politely ask for a specific, granular example using targeted follow-up questions: 'Could you walk me through the specific day that happened? What was your personal role versus what your team did? What was the hardest obstacle you personally encountered during that step, and what metric proved it was successful?' By asking them to zoom into concrete actions, I separate genuine hands-on experience from passive observation.",
    interviewTip:
      "Highlight the 'drill-down' technique: ask for specific dates, personal actions, metrics, and obstacles.",
    evaluationCriteria: [
      "Distinguishes team achievements from individual contributions",
      "Uses targeted follow-ups to verify authentic competence",
      "Maintains an encouraging, conversational interview climate",
    ],
    competency: "Behavioral Interview Probing",
  },
  {
    id: "hr-05",
    category: "HR_RECRUITMENT",
    difficulty: "ENTRY",
    jobPosition: "HR Records Assistant",
    situation: "Assessing confidentiality protocols and handling of sensitive personnel documentation.",
    questionText: "How do you ensure confidentiality and security when managing employee personnel files?",
    modelAnswer:
      "Employee files contain sensitive PII, compensation data, and medical records protected by law. I follow strict access-control protocols: physical files remain in double-locked fireproof cabinets with an access logbook, while digital documents are stored on encrypted, role-restricted drives without local USB downloads. I never discuss employee matters in common areas and verify authorization before sharing any employee record, even with department heads.",
    interviewTip:
      "Reference specific safeguards: physical locking, encrypted digital access controls, and need-to-know disclosure rules.",
    evaluationCriteria: [
      "Recognizes legal and ethical dimensions of personnel data",
      "Details both physical and digital security protocols",
      "Upholds need-to-know principles strictly across the organization",
    ],
    competency: "Data Privacy & HR Compliance",
  },
  {
    id: "hr-06",
    category: "HR_RECRUITMENT",
    difficulty: "ADVANCED",
    jobPosition: "Talent Acquisition Partner",
    situation: "Managing hiring manager expectations and counteracting unrealistic candidate requirements.",
    questionText: "How do you handle a hiring manager who insists on unrealistic candidate criteria for an entry-level wage?",
    modelAnswer:
      "I view recruitment as an advisory partnership. Rather than simply rejecting their request, I compile objective market intelligence: current labor market supply, competitor salary benchmarks, and applicant pool analytics. In a consultative meeting, I present the data: 'If we demand five years of experience at entry-level compensation, our time-to-fill will exceed 90 days with high offer-rejection rates. We can either adjust the compensation bracket or evaluate high-aptitude fresh graduates with demonstrated project portfolio skills.' This shifts the discussion from subjective opinion to strategic workforce planning.",
    interviewTip:
      "Use data to educate and advise hiring managers collaboratively rather than confronting them defensively.",
    evaluationCriteria: [
      "Presents empirical market data to guide expectations",
      "Offers constructive, actionable tradeoff options",
      "Acts as a strategic talent advisor to internal stakeholders",
    ],
    competency: "Consultative Talent Advisory",
  },

  // ─── 5. Fair Recruitment and Workplace Ethics (6 Questions) ───
  {
    id: "fair-01",
    category: "FAIR_ETHICS",
    difficulty: "INTERMEDIATE",
    jobPosition: "HR Compliance Officer",
    situation: "Identifying and eliminating illegal or discriminatory interview questions.",
    questionText: "An interviewer asks a candidate about their marital status, plans to have children, and religion. How do you intervene?",
    modelAnswer:
      "Questions regarding marital status, family planning, religion, age, or sexual orientation are improper, discriminatory, and expose the organization to legal liabilities. As the HR representative, I intervene gracefully in the moment: 'To ensure we stay focused on the core requirements of this role, let's pivot back to your project experience with system integrations.' Immediately after the interview, I conduct a private coaching session with the interviewer, explain the legal compliance violations, document the incident, and ensure all evaluators undergo structured fair-interview refresher training.",
    interviewTip:
      "Intervene diplomatically in real time to protect the candidate and company, then follow up with formal interviewer education.",
    evaluationCriteria: [
      "Recognizes legally prohibited interview inquiries",
      "Intervenes professionally without causing public humiliation",
      "Reinforces structural interviewer training and compliance documentation",
    ],
    competency: "Equal Employment Opportunity & Legal Compliance",
  },
  {
    id: "fair-02",
    category: "FAIR_ETHICS",
    difficulty: "ADVANCED",
    jobPosition: "HR Ethics Officer",
    situation: "Handling nepotism and internal executive pressure during hiring selections.",
    questionText: "A company vice president requests that you hire their nephew, despite other candidates scoring significantly higher in assessments. What do you do?",
    modelAnswer:
      "I adhere to fair competition and merit-based hiring standards. I would document all candidate assessment results objectively and schedule a meeting with the VP and the HR Director. I would present the comparative scoring matrix respectfully: 'We evaluated all candidates against the established role rubric. Candidate A scored significantly higher in technical problem-solving and client presentations.' If the VP insists, I refer to our company anti-nepotism and conflict-of-interest policy, escalating to the Chief People Officer to protect organizational fairness and morale.",
    interviewTip:
      "Anchor your position on documented rubrics, institutional policies, and executive escalation rather than personal arguments.",
    evaluationCriteria: [
      "Maintains unwavering commitment to merit-based hiring",
      "Relies on documented evidence and objective assessment matrices",
      "Adheres strictly to conflict-of-interest and anti-nepotism policies",
    ],
    competency: "Ethical Integrity & Conflict of Interest Mitigation",
  },
  {
    id: "fair-03",
    category: "FAIR_ETHICS",
    difficulty: "ENTRY",
    jobPosition: "Junior Recruiter",
    situation: "Recognizing and neutralizing unconscious bias (e.g. halo effect, affinity bias) in hiring.",
    questionText: "What is unconscious bias in recruitment, and how can an interviewer mitigate it?",
    modelAnswer:
      "Unconscious bias refers to automatic social stereotypes or preferences—such as affinity bias (favoring someone who attended the same school) or the halo effect (letting one charismatic answer overshadow poor technical skills). To mitigate bias, interviewers should use standardized interview scorecards, ask the identical sequence of competency-based questions to all candidates, evaluate responses against predetermined rubrics, and participate in post-interview panel calibration sessions.",
    interviewTip:
      "Name specific biases (affinity, halo effect, confirmation bias) and concrete systemic safeguards (rubrics, panels, blinding).",
    evaluationCriteria: [
      "Demonstrates clear understanding of cognitive biases in evaluation",
      "Articulates standardized interview methodologies",
      "Advocates objective, rubric-driven scoring",
    ],
    competency: "Bias Mitigation & Objective Evaluation",
  },
  {
    id: "fair-04",
    category: "FAIR_ETHICS",
    difficulty: "INTERMEDIATE",
    jobPosition: "HR Accessibility Coordinator",
    situation: "Ensuring reasonable accommodations and equitable access for candidates with disabilities.",
    questionText: "A candidate with a visual impairment requests accommodations for an upcoming employment test. How do you respond?",
    modelAnswer:
      "I respond promptly and welcomingly, assuring the candidate that our organization provides reasonable accommodations to support equitable participation. I coordinate with our technical and assessment teams to provide the test in accessible formats—such as screen-reader compatible digital files, enlarged text, or extended completion time—ensuring the accommodation does not alter the fundamental skills being measured. I keep the candidate updated and ensure evaluators are briefed only on relevant accommodation logistics.",
    interviewTip:
      "Affirm that reasonable accommodations are a legal obligation and moral standard that broadens talent access.",
    evaluationCriteria: [
      "Welcoming and prompt engagement with accommodation requests",
      "Coordinates technical and logistical adaptations seamlessly",
      "Maintains candidate privacy and dignity throughout the process",
    ],
    competency: "Workplace Inclusion & Reasonable Accommodation",
  },
  {
    id: "fair-05",
    category: "FAIR_ETHICS",
    difficulty: "ADVANCED",
    jobPosition: "Employee Relations Specialist",
    situation: "Protecting employee whistleblowers and maintaining psychological safety.",
    questionText: "An employee reports harassment confidentially, but fears retaliation if HR investigates. How do you guide them?",
    modelAnswer:
      "I first validate their courage in coming forward, reassure them that harassment is taken with utmost seriousness, and outline our organization's zero-tolerance retaliation policy. I explain the investigation process transparently: while we must investigate the allegations to ensure safety, details will be shared strictly on a need-to-know basis. I document the report thoroughly, implement immediate protective measures (such as adjusted reporting lines or shift schedules), and establish weekly check-ins to monitor their safety.",
    interviewTip:
      "Focus on empathy, transparent procedural explanations, proactive anti-retaliation measures, and clear documentation.",
    evaluationCriteria: [
      "Prioritizes employee safety and psychological reassurance",
      "Explains investigation boundaries with honest transparency",
      "Enforces anti-retaliation protocols actively and continuously",
    ],
    competency: "Employee Relations & Harassment Prevention",
  },
  {
    id: "fair-06",
    category: "FAIR_ETHICS",
    difficulty: "ENTRY",
    jobPosition: "Procurement / HR Assistant",
    situation: "Managing vendor gifts and potential conflicts of interest during supplier selection.",
    questionText: "A recruiting software vendor sends you an expensive luxury gift basket during an active bidding RFP. How do you respond?",
    modelAnswer:
      "Accepting valuable gifts from a bidding vendor violates procurement ethics and creates an impermissible conflict of interest. In accordance with standard company gift policies, I would politely decline and return the gift basket with a professional letter explaining that our vendor evaluation process requires absolute impartiality. I would promptly report the vendor's gift to my supervisor and compliance officer, ensuring full audit transparency in our vendor procurement file.",
    interviewTip:
      "Decline politely, return the gift, cite company ethics policy, and document the disclosure transparently.",
    evaluationCriteria: [
      "Understands anti-bribery and conflict-of-interest principles",
      "Handles vendor communication with professional courtesy",
      "Follows formal compliance disclosure and audit documentation",
    ],
    competency: "Anti-Corruption & Procurement Integrity",
  },

  // ─── 6. Business, Customer Service, and Fresh Graduates (6 Questions) ───
  {
    id: "biz-01",
    category: "BUSINESS_CUSTOMER",
    difficulty: "ENTRY",
    jobPosition: "Customer Service Representative",
    situation: "Handling an irate customer who experienced a product or service failure.",
    questionText: "How do you handle an angry or shouting customer who experienced a defective delivery?",
    modelAnswer:
      "I use the HEAT framework: Hear, Empathize, Apologize, and Take action. I remain calm, allow the customer to vent without interruption, and acknowledge their frustration: 'I completely understand how disappointing it is to receive a damaged product before an important deadline.' I apologize on behalf of the company, confirm their account details, and offer immediate solutions—such as an expedited same-day replacement and a delivery credit. I follow up until the new item is received, turning a negative incident into a demonstration of reliability.",
    interviewTip:
      "Never take customer anger personally. Mention a structured framework like HEAT or LAST to show professional emotional discipline.",
    evaluationCriteria: [
      "Demonstrates emotional poise and de-escalation skills",
      "Practices active listening without defensive interruptions",
      "Focuses on immediate, tangible solutions and follow-through",
    ],
    competency: "De-escalation & Service Recovery",
  },
  {
    id: "biz-02",
    category: "BUSINESS_CUSTOMER",
    difficulty: "ENTRY",
    jobPosition: "Junior Marketing & Sales Associate",
    situation: "Bridging collegiate student leadership experience to commercial business value.",
    questionText: "As a fresh graduate with no corporate experience, why should we hire you for this business role?",
    modelAnswer:
      "While I am a recent graduate, my university career was filled with real-world execution. As Vice President of Finance for our 400-member student council, I managed a $12,000 budget, negotiated 15 corporate sponsorship packages, and streamlined event ticketing using online payment integrations. These experiences honed my negotiation skills, financial discipline, and resilience under pressure. I bring fresh perspectives, fast learning agility, and an unflagging work ethic ready to produce immediate results.",
    interviewTip:
      "Translate campus projects, thesis work, and club leadership into commercial business metrics (budgets, negotiations, process improvements).",
    evaluationCriteria: [
      "Translates academic achievements into commercial value",
      "Highlights high learning velocity and self-motivation",
      "Presents confidence without arrogance",
    ],
    competency: "Value Articulation & Commercial Acumen",
  },
  {
    id: "biz-03",
    category: "BUSINESS_CUSTOMER",
    difficulty: "INTERMEDIATE",
    jobPosition: "Account Management Trainee",
    situation: "Balancing client satisfaction with strict internal business policies.",
    questionText: "How do you handle a client who demands a refund that explicitly violates company policy?",
    modelAnswer:
      "I listen empathetically to understand the client's underlying problem. Instead of abruptly saying 'No, that is against company policy,' I validate their position: 'I understand why this situation is frustrating, and I want to help resolve it.' While explaining the policy rationale calmly, I offer alternative solutions within my authority—such as service credits, an upgrade on their next renewal, or complimentary onboarding assistance. If the client remains dissatisfied, I consult my manager to determine if a one-time executive exception is justified.",
    interviewTip:
      "Avoid blunt rejections. Frame conversations around what you CAN do, while protecting company policy boundaries.",
    evaluationCriteria: [
      "Balances empathy with organizational policy protection",
      "Offers constructive, creative alternative remedies",
      "Knows when and how to seek authorized supervisory guidance",
    ],
    competency: "Negotiation & Boundary Management",
  },
  {
    id: "biz-04",
    category: "BUSINESS_CUSTOMER",
    difficulty: "INTERMEDIATE",
    jobPosition: "Business Analyst Trainee",
    situation: "Synthesizing complex data into actionable recommendations for non-technical stakeholders.",
    questionText: "How do you present complex financial or operational data to non-expert clients or managers?",
    modelAnswer:
      "I tailor my presentation to the audience's priorities by following the 'Bottom Line Up Front' (BLUF) approach. I lead with the strategic recommendation and its business impact—such as cost savings or revenue potential. I use visual infographics and clean trend charts rather than dense raw tables, and I translate jargon into operational terms (e.g., explaining customer churn as 'lost recurring accounts per month'). I prepare supplementary appendix slides for those who wish to inspect detailed calculations.",
    interviewTip:
      "Focus on the 'So What?'. Decision makers care about business implications, not just complex formulas.",
    evaluationCriteria: [
      "Simplifies technical jargon without losing essential accuracy",
      "Uses clear visual representations to highlight trends",
      "Focuses on practical strategic recommendations",
    ],
    competency: "Executive Communication & Data Storytelling",
  },
  {
    id: "biz-05",
    category: "BUSINESS_CUSTOMER",
    difficulty: "ENTRY",
    jobPosition: "Customer Success Associate",
    situation: "Managing client expectations when a requested feature or deadline cannot be met.",
    questionText: "What do you do when a customer requests a service deadline that your team cannot meet?",
    modelAnswer:
      "I believe in setting realistic expectations early rather than making promises we cannot keep. I thank the client for their request, explain the timeline constraints honestly, and provide a realistic delivery date with milestone transparency: 'To ensure this report includes full quality auditing, we cannot deliver it by tomorrow 9 AM; however, we can deliver the executive summary by 1 PM tomorrow and the full audit by Friday.' Clients value dependable honesty over false reassurance.",
    interviewTip:
      "Explain the danger of over-promising and under-delivering. Provide phased delivery options to help the client meet their core needs.",
    evaluationCriteria: [
      "Sets clear, honest boundaries without panicking",
      "Offers phased or partial delivery options to mitigate delays",
      "Maintains trust through transparent follow-up communication",
    ],
    competency: "Expectation Management & Trust Building",
  },
  {
    id: "biz-06",
    category: "BUSINESS_CUSTOMER",
    difficulty: "ADVANCED",
    jobPosition: "Junior Product Operations Associate",
    situation: "Identifying customer feedback patterns to drive systemic product improvements.",
    questionText: "Describe how you would collect and analyze customer complaints to improve a company's product or service.",
    modelAnswer:
      "I treat customer complaints as high-value operational diagnostic data. I would categorize inbound customer feedback tags (such as billing errors, UX confusion, or fulfillment delays) in a centralized customer database. Every two weeks, I would calculate Pareto distributions to identify the 20% of recurring issues driving 80% of customer dissatisfaction. I would then collaborate with product and operations teams to implement systemic fixes at the root cause, eliminating repetitive complaint volumes.",
    interviewTip:
      "Show how front-line customer feedback feeds into upstream systemic operational improvements.",
    evaluationCriteria: [
      "Applies data classification and Pareto principles to complaints",
      "Collaborates cross-functionally to fix systemic root causes",
      "Measures post-implementation improvements in customer retention",
    ],
    competency: "Voice of Customer & Continuous Service Design",
  },
];

export const PREDEFINED_SCENARIOS: RecruiterScenarioItem[] = [
  // ─── Scenario 1: HR Confidential Records Breach ───
  {
    id: "scen-01",
    title: "Protecting Confidential Employee Records",
    category: "HR_RECRUITMENT",
    roleOrPosition: "Junior HR Assistant",
    context:
      "You are interviewing candidates for a Junior HR Assistant position. Last month, a department manager improperly demanded to view a subordinate's private medical leave records and salary history. You need to ensure the candidate will uphold strict data privacy, comply with data privacy laws, and withstand pressure from senior staff.",
    questionOptions: [
      {
        id: "q-scen-01-a",
        text: "If a senior department head demands immediate access to an employee's medical file without HR authorization, how would you respond?",
        isBest: true,
        explanation:
          "This question presents the exact high-pressure scenario the role encounters, testing both ethical boundaries and assertiveness with senior authority.",
      },
      {
        id: "q-scen-01-b",
        text: "Do you know what data privacy laws apply in our country?",
        isBest: false,
        explanation:
          "Too closed and academic; a yes/no question does not reveal how the candidate behaves when confronted with real workplace pressure.",
      },
      {
        id: "q-scen-01-c",
        text: "Tell me about a time you worked with filing cabinets and spreadsheets.",
        isBest: false,
        explanation:
          "Focuses on trivial clerical skills rather than the critical ethical competency of protecting confidential data under pressure.",
      },
      {
        id: "q-scen-01-d",
        text: "Why should we trust you with our company files?",
        isBest: false,
        explanation:
          "Overly confrontational and prompts vague, rehearsed claims of honesty rather than situational problem-solving.",
      },
    ],
    applicantAnswers: {
      "q-scen-01-a": {
        answerText:
          "I understand that department heads hold leadership roles, but confidential medical records are strictly protected by law and HR policy. I would politely tell the manager: 'I cannot release employee medical records without formal authorization from HR leadership and the employee's written consent, but I can check with the HR Director right now to assist you.' I would never hand over the file, and I would notify my supervisor immediately.",
        classification: "STRONG",
        explanation:
          "The applicant balances professional diplomacy with firm procedural adherence, protecting sensitive data while offering an authorized escalation path.",
      },
      "q-scen-01-b": {
        answerText: "Yes, I studied the Data Privacy Act in college and got an A in my legal studies class.",
        classification: "WEAK_INCOMPLETE",
        explanation:
          "Mentions academic study but fails to explain how those principles apply to real personnel management.",
      },
      "q-scen-01-c": {
        answerText: "I usually color code files by department name and sort them alphabetically so everyone can find things easily.",
        classification: "IRRELEVANT_INAPPROPRIATE",
        explanation:
          "Focuses entirely on filing mechanics and completely misses the confidentiality requirement.",
      },
      "q-scen-01-d": {
        answerText: "I am a very honest person and my family raised me to never steal or lie.",
        classification: "WEAK_INCOMPLETE",
        explanation:
          "A subjective personal assertion with zero professional procedures or protocols explained.",
      },
    },
    followUpOptions: [
      {
        id: "fu-01-a",
        text: "What would you do if the manager threatened to complain to the CEO about your refusal?",
        isBest: true,
        explanation:
          "Tests if the candidate's ethical resolve remains steadfast even when threatened with executive escalation.",
      },
      {
        id: "fu-01-b",
        text: "What software do you use to type incident reports?",
        isBest: false,
        explanation:
          "Diverts focus from the ethical test to irrelevant clerical tooling.",
      },
    ],
    practicalAdvice:
      "When screening for HR positions, never settle for general claims of honesty. Test how the applicant navigates boundary defense against organizational hierarchy.",
    competency: "Data Confidentiality & Ethical Assertiveness",
  },

  // ─── Scenario 2: Candidate Evaluation & Bias Mitigation ───
  {
    id: "scen-02",
    title: "Evaluating Unconscious Bias in Candidate Shortlisting",
    category: "FAIR_ETHICS",
    roleOrPosition: "Recruitment Coordinator",
    context:
      "A hiring manager reviewing candidates for a junior analyst role admits they prefer a candidate because they went to the same university and played on the same basketball team, despite another candidate having stronger analytical test scores and relevant internship experience.",
    questionOptions: [
      {
        id: "q-scen-02-a",
        text: "How would you handle a situation where a hiring manager prefers an applicant due to personal affinity rather than merit and assessment scores?",
        isBest: true,
        explanation:
          "Directly tests the candidate's ability to act as an objective talent advisor and mitigate affinity bias in hiring decisions.",
      },
      {
        id: "q-scen-02-b",
        text: "Do you believe university pedigree matters more than skills?",
        isBest: false,
        explanation:
          "Leading question that prompts an obvious, politically correct answer without evaluating actual persuasive skills.",
      },
      {
        id: "q-scen-02-c",
        text: "What school did you graduate from?",
        isBest: false,
        explanation:
          "Irrelevant and perpetuates the exact affinity bias being examined.",
      },
      {
        id: "q-scen-02-d",
        text: "Have you ever disagreed with a boss?",
        isBest: false,
        explanation:
          "Too broad; fails to test the specific competency of fair recruitment and bias mitigation.",
      },
    ],
    applicantAnswers: {
      "q-scen-02-a": {
        answerText:
          "I would schedule a brief calibration meeting with the hiring manager. Rather than accusing them of bias, I would anchor our discussion on the agreed role scorecard: 'Candidate B scored 92% on our quantitative modeling test and completed a relevant internship, whereas Candidate A scored 71%. Let's review how these competencies align with our immediate project deliverables.' By focusing objectively on job requirements, I help the manager see the commercial risk of affinity bias.",
        classification: "STRONG",
        explanation:
          "Uses data-driven scorecards and objective criteria to gently redirect the hiring manager toward merit-based selection without hostility.",
      },
      "q-scen-02-b": {
        answerText: "No, skills definitely matter more than degrees.",
        classification: "WEAK_INCOMPLETE",
        explanation:
          "A one-line platitude with no strategy or communication skill demonstrated.",
      },
      "q-scen-02-c": {
        answerText: "I graduated from City College with honors.",
        classification: "IRRELEVANT_INAPPROPRIATE",
        explanation: "Does not answer the ethical question.",
      },
      "q-scen-02-d": {
        answerText: "I would just report the manager to the CEO immediately for discrimination.",
        classification: "WEAK_INCOMPLETE",
        explanation:
          "Premature escalation that damages internal working relationships before attempting standard scorecard calibration.",
      },
    },
    followUpOptions: [
      {
        id: "fu-02-a",
        text: "If the manager still insists on their friend, what formal next step would you take?",
        isBest: true,
        explanation:
          "Examines whether the candidate understands formal hiring escalation protocols and audit documentation.",
      },
      {
        id: "fu-02-b",
        text: "Do you like working with spreadsheets?",
        isBest: false,
        explanation: "Completely irrelevant to recruitment ethics.",
      },
    ],
    practicalAdvice:
      "A great recruiter protects meritocracy through objective scorecards and consultative dialogue, preventing costly bad hires driven by personal affinity.",
    competency: "Merit-Based Hiring & Affinity Bias Neutralization",
  },

  // ─── Scenario 3: Customer Service Escalation ───
  {
    id: "scen-03",
    title: "De-escalating Customer Outrage Over Service Downtime",
    category: "BUSINESS_CUSTOMER",
    roleOrPosition: "Customer Service Associate",
    context:
      "Your company provides cloud inventory software to small retailers. A server outage occurred during Friday afternoon peak business hours, causing retail clients to lose transactions. You need a customer service representative who can de-escalate furious store owners without making unauthorized financial promises.",
    questionOptions: [
      {
        id: "q-scen-03-a",
        text: "Tell me how you would handle a store owner who calls screaming that our outage cost them thousands of dollars in sales.",
        isBest: true,
        explanation:
          "Simulates the emotional intensity and high-stakes problem resolution required on day one in this role.",
      },
      {
        id: "q-scen-03-b",
        text: "What is our company's refund policy for server outages?",
        isBest: false,
        explanation:
          "Tests rote policy memory that should be taught during onboarding, rather than innate emotional composure.",
      },
      {
        id: "q-scen-03-c",
        text: "Are you comfortable talking on the telephone for 8 hours?",
        isBest: false,
        explanation:
          "A stamina check that provides zero insight into de-escalation capability.",
      },
      {
        id: "q-scen-03-d",
        text: "Do you ever lose your temper?",
        isBest: false,
        explanation:
          "Invites an unhelpful, self-serving 'No, never' answer.",
      },
    ],
    applicantAnswers: {
      "q-scen-03-a": {
        answerText:
          "I stay composed and let the store owner speak without interruption, taking notes on their specific lost hours and transaction issues. Once they pause, I speak in a calm, empathetic tone: 'I completely understand how critical Friday afternoon sales are for your business, and I sincerely apologize for this disruption. Our engineering team is currently deploying a patch, and I will personally monitor your store's connection and update you every 20 minutes until you are back online.' I focus on active reassurance, honest timelines, and reliable updates without making promises outside my authority.",
        classification: "STRONG",
        explanation:
          "Shows outstanding emotional intelligence, active listening, genuine empathy, and commitment to follow-through without overstepping policy.",
      },
      "q-scen-03-b": {
        answerText: "I would tell them our terms of service clearly state we are not liable for incidental downtime losses.",
        classification: "IRRELEVANT_INAPPROPRIATE",
        explanation:
          "Highly combative; quoting legal disclaimers at an enraged client destroys customer loyalty.",
      },
      "q-scen-03-c": {
        answerText: "Yes, I can talk on the phone all day.",
        classification: "WEAK_INCOMPLETE",
        explanation: "Fails to address the de-escalation scenario.",
      },
      "q-scen-03-d": {
        answerText: "I would immediately offer them a 50% lifetime discount so they don't cancel.",
        classification: "WEAK_INCOMPLETE",
        explanation:
          "Offers unauthorized, irresponsible commercial giveaways that damage business margins without solving the technical issue.",
      },
    },
    followUpOptions: [
      {
        id: "fu-03-a",
        text: "How would you document this interaction so our engineering and account management teams can follow up effectively?",
        isBest: true,
        explanation:
          "Tests closed-loop communication and customer relationship management (CRM) discipline.",
      },
      {
        id: "fu-03-b",
        text: "What is your typing speed?",
        isBest: false,
        explanation: "Low priority compared to incident documentation and cross-team communication.",
      },
    ],
    practicalAdvice:
      "In customer crises, empathy and predictable update rhythms de-escalate tension faster than technical explanations or defensive policy citations.",
    competency: "Customer Empathy & Composure Under Fire",
  },

  // ─── Scenario 4: Cross-Functional Team Deadlock ───
  {
    id: "scen-04",
    title: "Resolving Interdepartmental Friction Between Sales and Operations",
    category: "TEAMWORK_LEADERSHIP",
    roleOrPosition: "Junior Project Associate",
    context:
      "A junior project associate is needed to coordinate deliveries between the Sales team (who promised rapid custom order turnaround) and the Operations team (who say the timeline is impossible without overtime budget). The teams are blaming each other and project deadlines are slipping.",
    questionOptions: [
      {
        id: "q-scen-04-a",
        text: "When two departments you support have completely opposing priorities and are blaming each other, how do you facilitate a breakthrough?",
        isBest: true,
        explanation:
          "Directly evaluates stakeholder alignment, objective facilitation, and finding win-win operational compromises.",
      },
      {
        id: "q-scen-04-b",
        text: "Which department is usually more important: sales or operations?",
        isBest: false,
        explanation:
          "A false dichotomy question that encourages taking sides rather than building collaborative bridges.",
      },
      {
        id: "q-scen-04-c",
        text: "Do you like working in teams?",
        isBest: false,
        explanation: "Trite, superficial question with no diagnostic value.",
      },
      {
        id: "q-scen-04-d",
        text: "What spreadsheet software do you prefer for tracking tasks?",
        isBest: false,
        explanation: "Focuses on software tools rather than interpersonal and organizational facilitation.",
      },
    ],
    applicantAnswers: {
      "q-scen-04-a": {
        answerText:
          "I bring both team leads together for a focused 30-minute alignment standup. I open by reframing our shared objective: delighting the client without bankrupting our operational margins. I map out the current bottleneck transparently: Sales explains client commitments, Operations shares capacity constraints. Then I propose a phased delivery compromise: deliver the essential core order on the rapid timeline, followed by the custom add-ons three days later. Both teams look good to the client, and burnout is averted.",
        classification: "STRONG",
        explanation:
          "Reframes conflict into shared goals, surfaces real constraints without blame, and facilitates a pragmatic phased delivery solution.",
      },
      "q-scen-04-b": {
        answerText: "Sales is more important because without revenue, nobody gets paid.",
        classification: "IRRELEVANT_INAPPROPRIATE",
        explanation:
          "Shows severe department bias that would alienate operations and inflame workplace friction.",
      },
      "q-scen-04-c": {
        answerText: "Yes, I am a great team player.",
        classification: "WEAK_INCOMPLETE",
        explanation: "Empty assertion lacking any operational strategy.",
      },
      "q-scen-04-d": {
        answerText: "I would just let the managers fight it out and wait for them to give me an order.",
        classification: "WEAK_INCOMPLETE",
        explanation:
          "Passive and shows total absence of leadership, initiative, or problem-solving capability.",
      },
    },
    followUpOptions: [
      {
        id: "fu-04-a",
        text: "How would you prevent similar miscommunications between Sales and Operations on future projects?",
        isBest: true,
        explanation:
          "Tests whether the candidate thinks proactively about systemic process improvements (like service level agreements).",
      },
      {
        id: "fu-04-b",
        text: "How many hours of overtime are you willing to work?",
        isBest: false,
        explanation: "Shifts focus from process improvement to personal schedule availability.",
      },
    ],
    practicalAdvice:
      "Great business associates do not take sides in departmental disputes; they map constraints, align around customer value, and engineer workable compromises.",
    competency: "Cross-Functional Collaboration & Consensus Building",
  },

  // ─── Scenario 5: Academic Project vs. Real-World Readiness ───
  {
    id: "scen-05",
    title: "Evaluating Fresh Graduate Practical Readiness",
    category: "BUSINESS_CUSTOMER",
    roleOrPosition: "Fresh Graduate Management Trainee",
    context:
      "You are interviewing candidates for a competitive Management Trainee program in Business Administration. Many applicants have high GPAs but struggle when asked to apply classroom concepts to messy, ambiguous business problems.",
    questionOptions: [
      {
        id: "q-scen-05-a",
        text: "Can you describe a practical project or student leadership challenge where academic theory proved insufficient and you had to adapt pragmatically?",
        isBest: true,
        explanation:
          "Tests the crucial bridge from textbook memorization to pragmatic, resourceful real-world execution.",
      },
      {
        id: "q-scen-05-b",
        text: "What was your final GPA and did you make the Dean's List?",
        isBest: false,
        explanation:
          "Repeats data already visible on the transcript without assessing practical problem-solving capability.",
      },
      {
        id: "q-scen-05-c",
        text: "Can you recite the definition of SWOT analysis?",
        isBest: false,
        explanation:
          "Tests rote classroom recall instead of practical commercial application.",
      },
      {
        id: "q-scen-05-d",
        text: "Do you consider yourself smarter than other applicants?",
        isBest: false,
        explanation:
          "Arrogant and unhelpful question that encourages posturing rather than authentic evidence.",
      },
    ],
    applicantAnswers: {
      "q-scen-05-a": {
        answerText:
          "In our business plan competition, our financial model theoretically projected a 45% gross margin. However, when we piloted actual booth sales during campus week, unexpected supplier logistics fees and perishable food spoilage slashed our actual margins to 12%. Textbook formulas assumed perfect supply chains. I immediately renegotiated batch delivery terms with a local vendor within walking distance and introduced bundled pre-orders. We recovered our target margin to 34%. It taught me that real business demands relentless operational adjustments, not just static spreadsheet modeling.",
        classification: "STRONG",
        explanation:
          "Outstanding answer demonstrating humility, analytical troubleshooting, rapid commercial pivoting, and genuine operational learning.",
      },
      "q-scen-05-b": {
        answerText: "My GPA was 3.9 and I was on the Dean's List every semester.",
        classification: "ACCEPTABLE",
        explanation:
          "Impressive academic milestone, but fails to demonstrate practical adaptability or real-world problem solving.",
      },
      "q-scen-05-c": {
        answerText: "SWOT stands for Strengths, Weaknesses, Opportunities, and Threats.",
        classification: "WEAK_INCOMPLETE",
        explanation: "Merely recites a textbook acronym with zero real-world application.",
      },
      "q-scen-05-d": {
        answerText: "I am definitely one of the top minds in my graduating batch.",
        classification: "IRRELEVANT_INAPPROPRIATE",
        explanation: "Demonstrates poor humility, excessive ego, and lacks concrete evidence.",
      },
    },
    followUpOptions: [
      {
        id: "fu-05-a",
        text: "What key indicator do you monitor first when a business plan encounters unexpected reality?",
        isBest: true,
        explanation:
          "Probes the candidate's financial and operational instincts under changing conditions.",
      },
      {
        id: "fu-05-b",
        text: "Which professor was your favorite?",
        isBest: false,
        explanation: "Irrelevant personal gossip with no hiring diagnostic value.",
      },
    ],
    practicalAdvice:
      "Look for candidates who respect academic fundamentals but are energized by the messy realities of customer behavior and operational iteration.",
    competency: "Pragmatic Business Agility & Theory-to-Practice",
  },

  // ─── Scenario 6: Workplace Ethics & Whistleblower Safety ───
  {
    id: "scen-06",
    title: "Navigating Ethical Violations and Retaliation Risks",
    category: "FAIR_ETHICS",
    roleOrPosition: "Ethics and Compliance Assistant",
    context:
      "An entry-level employee in inventory notices that expensive computer equipment is frequently marked as 'damaged write-offs' by a senior logistics supervisor and subsequently removed from the warehouse in personal vehicles.",
    questionOptions: [
      {
        id: "q-scen-06-a",
        text: "If you discovered credible evidence that a senior supervisor was misappropriating company assets, walk me through your exact steps to handle it ethically and safely.",
        isBest: true,
        explanation:
          "Assesses understanding of objective evidence gathering, whistleblower channels, legal duty of care, and personal safety.",
      },
      {
        id: "q-scen-06-b",
        text: "Would you confront a thief in the parking lot?",
        isBest: false,
        explanation:
          "Sensationalized and encourages dangerous, non-compliant physical confrontations.",
      },
      {
        id: "q-scen-06-c",
        text: "Have you ever had anything stolen from you?",
        isBest: false,
        explanation: "Personal and completely misses the corporate compliance protocol.",
      },
      {
        id: "q-scen-06-d",
        text: "Are you loyal to your coworkers or to the company?",
        isBest: false,
        explanation:
          "Creates a misleading binary instead of evaluating structured ethical compliance frameworks.",
      },
    ],
    applicantAnswers: {
      "q-scen-06-a": {
        answerText:
          "I would not engage in personal confrontation or vigilante investigation, as that could jeopardize employee safety and compromise legal evidence. First, I would preserve objective documentation—such as inventory log numbers, discrepancy timestamps, and write-off report IDs. Second, I would report the matter through our organization's confidential whistleblower hotline or directly to the Internal Audit and Compliance Officer. I would maintain strict confidentiality to allow trained investigators to handle the matter objectively.",
        classification: "STRONG",
        explanation:
          "Exemplary ethical maturity. Follows institutional reporting chains, avoids dangerous confrontation, and preserves evidence integrity.",
      },
      "q-scen-06-b": {
        answerText: "I would take photos and post them on social media to expose the supervisor publicly.",
        classification: "IRRELEVANT_INAPPROPRIATE",
        explanation:
          "Severe breach of workplace confidentiality that exposes the company and candidate to massive defamation liabilities.",
      },
      "q-scen-06-c": {
        answerText: "It is none of my business as long as it doesn't affect my personal paycheck.",
        classification: "WEAK_INCOMPLETE",
        explanation:
          "Shows complete apathy toward corporate theft, fraud, and organizational integrity.",
      },
      "q-scen-06-d": {
        answerText: "I would tell the supervisor I know what they are doing and ask them to share.",
        classification: "IRRELEVANT_INAPPROPRIATE",
        explanation:
          "Suggests complicity in criminal extortion or theft; immediate disqualification.",
      },
    },
    followUpOptions: [
      {
        id: "fu-06-a",
        text: "How do you protect your own working relationships while an internal investigation is quietly underway?",
        isBest: true,
        explanation:
          "Tests professionalism, discretion, and emotional discipline in sensitive corporate environments.",
      },
      {
        id: "fu-06-b",
        text: "Do you have a driver's license?",
        isBest: false,
        explanation: "Irrelevant to compliance ethics.",
      },
    ],
    practicalAdvice:
      "Ethical employees protect the institution through established confidential reporting systems, factual documentation, and discretion.",
    competency: "Corporate Compliance & Whistleblower Integrity",
  },
];

export const PREDEFINED_QUIZ_QUESTIONS: QuizQuestionItem[] = [
  {
    id: "quiz-01",
    category: "GENERAL",
    difficulty: "ENTRY",
    pointValue: 10,
    questionText: "What does the 'STAR' method stand for when structuring answers to behavioral interview questions?",
    choices: [
      "Strategy, Tactics, Action, Review",
      "Situation, Task, Action, Result",
      "Summary, Theory, Application, Results",
      "Skills, Talent, Attitude, Resilience",
    ],
    correctAnswer: 1,
    explanation:
      "The STAR framework stands for Situation (context), Task (your specific challenge), Action (the exact steps you took), and Result (the measurable outcome).",
  },
  {
    id: "quiz-02",
    category: "GENERAL",
    difficulty: "ENTRY",
    pointValue: 10,
    questionText: "When an interviewer asks, 'Can you tell me about yourself?', which structure provides the most professional response?",
    choices: [
      "Share your full life story chronologically from childhood to university",
      "Recite your entire resume line-by-line",
      "Use the Present-Past-Future structure: current status, relevant past achievement, and why this role is your next step",
      "Ask the interviewer to guess your strengths based on your cover letter",
    ],
    correctAnswer: 2,
    explanation:
      "The Present-Past-Future framework keeps the answer concise, professionally relevant, and directly tied to the target position.",
  },
  {
    id: "quiz-03",
    category: "FAIR_ETHICS",
    difficulty: "INTERMEDIATE",
    pointValue: 10,
    questionText: "Which of the following questions is strictly inappropriate and legally prohibited during an employment interview?",
    choices: [
      "Are you legally authorized to work in this country?",
      "Do you plan on getting married or having children in the next two years?",
      "Can you meet the standard travel requirements specified in the job description?",
      "What professional software certifications do you currently hold?",
    ],
    correctAnswer: 1,
    explanation:
      "Inquiries regarding marital status, family planning, pregnancy, or sexual orientation violate equal opportunity employment and anti-discrimination laws.",
  },
  {
    id: "quiz-04",
    category: "HR_RECRUITMENT",
    difficulty: "INTERMEDIATE",
    pointValue: 10,
    questionText: "What is 'affinity bias' during candidate evaluations?",
    choices: [
      "A systematic preference for candidates who share similar backgrounds, schools, or hobbies with the interviewer",
      "Evaluating candidates solely based on their standardized test scores",
      "Giving equal scores to every candidate regardless of performance",
      "Assuming a candidate is dishonest because they appeared nervous",
    ],
    correctAnswer: 0,
    explanation:
      "Affinity bias (or similarity bias) occurs when interviewers unconsciously favor applicants with whom they share non-job-related personal commonalities.",
  },
  {
    id: "quiz-05",
    category: "TEAMWORK_LEADERSHIP",
    difficulty: "ENTRY",
    pointValue: 10,
    questionText: "When experiencing an active professional disagreement with a colleague over project strategy, what is the best first step?",
    choices: [
      "Send a company-wide email exposing their logical errors",
      "Schedule a private, constructive one-on-one discussion to listen to their perspective and align on shared project goals",
      "Ignore the project entirely until your colleague gives up",
      "Complain to external clients to pressure your colleague into agreeing",
    ],
    correctAnswer: 1,
    explanation:
      "Constructive one-on-one dialogue with active listening separates personal ego from project outcomes and produces collaborative compromise.",
  },
  {
    id: "quiz-06",
    category: "PROBLEM_SOLVING",
    difficulty: "INTERMEDIATE",
    pointValue: 10,
    questionText: "What is root-cause analysis, and why is it preferred over immediate surface patching?",
    choices: [
      "It focuses on assigning blame to the junior employee who made the mistake",
      "It permanently solves the fundamental source of a failure to prevent recurrence, rather than just treating immediate symptoms",
      "It delays problem resolution so that managers forget the issue existed",
      "It replaces all automated systems with manual paper forms",
    ],
    correctAnswer: 1,
    explanation:
      "Root-cause analysis (such as the 5 Whys framework) identifies why a defect occurred so that systemic safeguards prevent future repetition.",
  },
  {
    id: "quiz-07",
    category: "BUSINESS_CUSTOMER",
    difficulty: "ENTRY",
    pointValue: 10,
    questionText: "Under the HEAT framework for handling angry customers, what does the 'E' stand for?",
    choices: [
      "Escalate immediately to the CEO",
      "Empathize with their situation and acknowledge their frustration",
      "Explain why the company is not at fault",
      "Examine their purchase history to find policy violations",
    ],
    correctAnswer: 1,
    explanation:
      "HEAT stands for Hear, Empathize, Apologize, and Take action. Empathy de-escalates customer emotion before moving to practical resolution.",
  },
  {
    id: "quiz-08",
    category: "HR_RECRUITMENT",
    difficulty: "ADVANCED",
    pointValue: 10,
    questionText: "Why do structured interviews using standardized rubrics consistently outperform unstructured conversational interviews?",
    choices: [
      "They allow interviewers to be lazy and read a script",
      "They ensure every applicant is evaluated against identical job-relevant criteria, substantially reducing bias and improving prediction of job performance",
      "They eliminate the need for candidates to speak during the interview",
      "They guarantee that every candidate receives a job offer",
    ],
    correctAnswer: 1,
    explanation:
      "Decades of industrial-organizational research prove structured interviews with predefined rubrics are twice as predictive of job performance as conversational chats.",
  },
  {
    id: "quiz-09",
    category: "FAIR_ETHICS",
    difficulty: "INTERMEDIATE",
    pointValue: 10,
    questionText: "What constitutes an illegal conflict of interest when an employee participates in vendor procurement?",
    choices: [
      "Reviewing public pricing proposals from three competing vendors",
      "Accepting an expensive private gift or favoring a supplier owned by an immediate family member without disclosure",
      "Requiring vendors to provide customer service warranties in writing",
      "Conducting background checks on supplier financial stability",
    ],
    correctAnswer: 1,
    explanation:
      "Accepting personal financial perks or favoring undisclosed family businesses corrupts commercial impartiality and breaches anti-corruption policies.",
  },
  {
    id: "quiz-10",
    category: "GENERAL",
    difficulty: "ENTRY",
    pointValue: 10,
    questionText: "When asked by an interviewer, 'What is your greatest weakness?', which approach is most effective?",
    choices: [
      "Say: 'I am a perfectionist and I simply work too hard.'",
      "State: 'I don't really have any weaknesses that affect my work.'",
      "Discuss a genuine, non-fatal area of growth, explain the concrete actions you are taking to improve, and share recent progress",
      "Confess that you struggle with waking up on time every morning",
    ],
    correctAnswer: 2,
    explanation:
      "Employers look for self-awareness, honesty, and active self-improvement rather than humblebrags ('perfectionist') or unmanageable liabilities.",
  },
  {
    id: "quiz-11",
    category: "BUSINESS_CUSTOMER",
    difficulty: "INTERMEDIATE",
    pointValue: 10,
    questionText: "As a fresh graduate applying for a corporate role, how should you present your university club or student council leadership?",
    choices: [
      "Dismiss it as unimportant school activities that don't count",
      "Translate leadership responsibilities into commercial impact: budgets managed, sponsorships negotiated, events executed, and teams led",
      "Claim that running a campus club is identical to running a Fortune 500 company",
      "Only mention club parties and social outings",
    ],
    correctAnswer: 1,
    explanation:
      "Translating campus leadership into operational business metrics demonstrates commercial value, accountability, and practical leadership.",
  },
  {
    id: "quiz-12",
    category: "TEAMWORK_LEADERSHIP",
    difficulty: "ADVANCED",
    pointValue: 10,
    questionText: "What is 'psychological safety' in high-performing teams, as identified by Project Aristotle at Google?",
    choices: [
      "A rule that no team member is ever criticized or assigned deadlines",
      "A shared belief that team members will not be humiliated, rejected, or punished for speaking up, admitting mistakes, or offering new ideas",
      "Providing free snacks and comfortable ergonomic seating in the office",
      "Ensuring all team members have identical personality test scores",
    ],
    correctAnswer: 1,
    explanation:
      "Psychological safety allows teams to take interpersonal risks, rapidly surface errors, innovate without fear, and collaborate transparently.",
  },
  {
    id: "quiz-13",
    category: "HR_RECRUITMENT",
    difficulty: "ENTRY",
    pointValue: 10,
    questionText: "Under data privacy and HR compliance rules, how should physical employee personnel records be secured?",
    choices: [
      "Left on common desk surfaces so managers can review them whenever needed",
      "Stored in locked, fireproof cabinets with access restricted only to authorized HR personnel and documented via an access log",
      "Recycled in ordinary public trash bins once an employee resigns",
      "Carried home by interns to complete scanning on personal laptops",
    ],
    correctAnswer: 1,
    explanation:
      "Personnel files contain sensitive Personally Identifiable Information (PII) that must be safeguarded with physical and cryptographic access controls.",
  },
  {
    id: "quiz-14",
    category: "PROBLEM_SOLVING",
    difficulty: "ENTRY",
    pointValue: 10,
    questionText: "When given an ambiguous task by your manager with minimal instructions, what is the best immediate response?",
    choices: [
      "Do nothing and wait for your manager to notice and get angry",
      "Review existing templates, outline a proposed roadmap with specific clarifying questions, and schedule a brief 5-minute alignment sync",
      "Guess completely and deliver an unverified report without checking",
      "Complain to other coworkers about poor management leadership",
    ],
    correctAnswer: 1,
    explanation:
      "Proactive preliminary homework paired with targeted, concise clarifying questions demonstrates autonomous initiative while respecting executive time.",
  },
  {
    id: "quiz-15",
    category: "FAIR_ETHICS",
    difficulty: "ADVANCED",
    pointValue: 10,
    questionText: "What is an employer's legal obligation when a qualified candidate requests a reasonable accommodation for a disability?",
    choices: [
      "Immediately reject the applicant because accommodations cost money",
      "Engage in an interactive dialogue to provide necessary accommodations (such as screen readers or accessible venues) that do not cause undue hardship",
      "Require the candidate to pay a fee before being allowed to interview",
      "Ignore the request and conduct the standard test anyway",
    ],
    correctAnswer: 1,
    explanation:
      "Workplace accessibility laws mandate reasonable accommodation to ensure equitable opportunity for qualified candidates with disabilities.",
  },
  {
    id: "quiz-16",
    category: "BUSINESS_CUSTOMER",
    difficulty: "INTERMEDIATE",
    pointValue: 10,
    questionText: "What does 'BLUF' stand for in professional executive communication?",
    choices: [
      "Business Logistics Under Flow",
      "Bottom Line Up Front",
      "Better Learn Urgent Feedback",
      "Budget Limits Upon Forecasting",
    ],
    correctAnswer: 1,
    explanation:
      "BLUF (Bottom Line Up Front) leads with the core conclusion and recommendation first, respecting executive time before presenting supporting details.",
  },
  {
    id: "quiz-17",
    category: "GENERAL",
    difficulty: "ENTRY",
    pointValue: 10,
    questionText: "At the conclusion of an interview when the employer asks, 'Do you have any questions for us?', what is the best practice?",
    choices: [
      "Say: 'No, your website covered everything, I'm good.'",
      "Ask: 'How much vacation time do I get and how soon can I leave early on Fridays?'",
      "Ask thoughtful, research-based questions about team culture, upcoming departmental goals, or what success looks like in the first 90 days",
      "Ask the interviewer personal questions about their salary and political views",
    ],
    correctAnswer: 2,
    explanation:
      "Thoughtful questions demonstrate preparation, intellectual curiosity, and serious professional commitment to thriving in the role.",
  },
  {
    id: "quiz-18",
    category: "PROBLEM_SOLVING",
    difficulty: "ADVANCED",
    pointValue: 10,
    questionText: "When an emergency forces a tradeoff between delivering on schedule versus achieving 100% perfection, what is the best approach?",
    choices: [
      "Hide from the client until the product is 100% flawless, regardless of how late it is",
      "Deliver a core, reliable Minimum Viable Product (MVP) on schedule while transparently communicating the timeline for secondary polish",
      "Ship defective, untested work and pretend nothing is wrong",
      "Blame the supplier publicly and cancel the project",
    ],
    correctAnswer: 1,
    explanation:
      "Phased delivery protects business commitments and preserves customer trust through transparency, delivering core value on schedule.",
  },
];
