export const POLICY_UPDATED = "24 October 2026";

export type PolicySection = {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
};

export type PolicyDocument = {
  title: string;
  introduction: string;
  sections: PolicySection[];
};

export const terms: PolicyDocument = {
  title: "Terms and Conditions",
  introduction: "These terms explain your responsibilities when using the Colegio de Montalban Learning Management System (CdM LMS) through its web, mobile, or desktop interfaces.",
  sections: [
    {
      id: "scope-and-agreement", title: "Scope and agreement",
      paragraphs: ["CdM LMS supports teaching, learning, assessment, and academic administration for the Institute of Computing Studies (ICS), Institute of Teacher Education (ITE), and Institute of Business and Entrepreneurship (IBE). Features depend on your role, institute, program, and course access.", "By checking the required box when signing in, you agree to these terms and acknowledge the Privacy Policy. This does not waive your privacy rights or authorize unrelated uses of your information. If you cannot agree, contact the Office of the Registrar or your institute before signing in to discuss access to your coursework."],
    },
    {
      id: "accounts-and-access", title: "Accounts and authorized access",
      paragraphs: ["Students may register with their school-issued student ID, full name, email, password, and institute, or use Google sign-in and complete these account details. Student access begins after joining an active class in the registered institute. School-issued invitations remain available; staff accounts are provisioned by authorized personnel. Provide accurate information and report incorrect account details to the Registrar.", "Use only your own account. Keep passwords, class codes, activation links, verification codes, and session credentials private; sign out on shared devices and report suspected unauthorized access promptly. Access is limited to the classes, records, and administrative functions assigned to you. An account does not authorize access to another person's records or another institute's restricted resources."],
    },
    {
      id: "acceptable-use", title: "Acceptable use and academic integrity",
      paragraphs: ["Follow school policies, course instructions, applicable Philippine law, and respectful standards of conduct."],
      items: ["Submit your own work and acknowledge permitted sources, collaboration, and AI assistance according to your instructor's rules.", "Do not impersonate others, share assessment answers without permission, falsify attendance or submissions, manipulate grades, or evade assessment controls.", "Do not harass others, publish another person's private information, or upload unlawful, infringing, malicious, or abusive content.", "Do not probe restricted systems, disrupt the service, misuse code execution, distribute credentials, or bypass access controls. Report suspected security issues privately through campus support."],
    },
    {
      id: "coursework-and-assessment", title: "Coursework, assessments, and review",
      paragraphs: ["Observe course deadlines, permitted file formats, attempt limits, and assessment instructions. Check that uploads and submissions have completed, keep copies of your work, and report technical problems promptly with the course, activity, and time involved.", "Some assessments record activity such as tab switches, paste events, fullscreen exits, timing, or code similarity for instructor review. Automated scores, integrity flags, AI feedback, badges, experience points, and leaderboards do not replace the school's academic judgment. Raise grading or integrity concerns with your instructor and follow the school's review process. Gamification rewards affect academic grades only where an instructor has expressly configured and communicated a grading rule."],
    },
    {
      id: "content-and-permissions", title: "Learning materials and your content",
      paragraphs: ["School and third-party learning materials remain subject to their owners' rights. Use them for authorized educational purposes; do not redistribute restricted materials, assessments, recordings, or classmates' work without permission.", "You retain the rights you hold in your submissions and posts. Providing content to CdM LMS permits the school and its service providers to store, display to authorized participants, process, and review it as needed for teaching, assessment, academic administration, security, and applicable recordkeeping obligations. This permission does not transfer ownership or authorize unrelated commercial use. Share only content you are entitled to provide."],
    },
    {
      id: "integrations-and-ai", title: "Code execution, AI, and connected services",
      paragraphs: ["Where enabled, CodeLab sends submitted code and test input to a managed execution provider. AI learning tools may send your prompts, selected code, error output, or learning material to a configured AI provider. Connected GitHub features may process repository links, commits, submissions, review comments, and similarity results.", "Do not include passwords, API keys, confidential records, or unnecessary personal information in code, prompts, or repositories. Follow provider terms and your course's AI rules. Review generated guidance for accuracy and ask your instructor when uncertain. External links and services have their own privacy notices and availability limits."],
    },
    {
      id: "availability-and-support", title: "Availability and technical support",
      paragraphs: ["Maintenance, network issues, and provider interruptions can affect access. CdM LMS does not promise uninterrupted availability or that automated feedback is error-free. Contact your instructor promptly about an interrupted assessment or deadline, and use the account recovery and campus support channels for access problems. These terms do not exclude rights or remedies that applicable law does not allow to be excluded."],
    },
    {
      id: "restrictions-and-school-rules", title: "Access restrictions and school rules",
      paragraphs: ["Authorized personnel may restrict access when enrollment or employment changes, an account is compromised, or misuse is investigated, subject to applicable school procedures and law. Contact the Registrar or your institute to request clarification or review. Loss of access does not automatically erase academic records.", "These terms supplement the student handbook, faculty policies, course rules, and applicable law. Questions about conflicting instructions, disciplinary action, or academic decisions must be referred to the responsible school office."],
    },
    {
      id: "changes-and-contact", title: "Changes, governing law, and questions",
      paragraphs: ["These terms are governed by applicable Philippine law. Updates will be published here with a revised date, and material changes should be communicated through school announcements or the sign-in experience. Review the linked terms when signing in.", "For account and policy questions, contact or visit the Office of the Registrar at Colegio de Montalban, Kasiglahan Village, San Jose, Rodriguez (Montalban), Rizal, Philippines 1860. The Contact & Support page explains how to route academic, technical, and privacy concerns."],
    },
  ],
};

export const privacy: PolicyDocument = {
  title: "Privacy Policy",
  introduction: "This notice describes the information handled by CdM LMS, why it is used, who may receive it, and how you can ask questions or exercise your privacy rights.",
  sections: [
    {
      id: "responsibility-and-scope", title: "Responsibility and scope",
      paragraphs: ["Colegio de Montalban is responsible for personal information processed for its educational and administrative purposes through CdM LMS. This notice covers the LMS web, mobile, and desktop interfaces and the integrations enabled for your courses. External websites and independently operated services have their own notices.", "Privacy concerns may be submitted through the Office of the Registrar for referral to the school's designated Data Protection Officer or responsible privacy office. See Contact & Support for the campus address and request guidance."],
    },
    {
      id: "information-we-handle", title: "Information the LMS handles",
      paragraphs: ["The information involved depends on the features you use and the records supplied by authorized school personnel. It may come from you, enrollment or staff rosters, your instructors, school administrators, and your use of the service.", "If you choose Google sign-in, Google provides your verified email address, name, and stable Google account identifier so we can create or connect your student account. We request only identity, email, and profile access; we do not request access to Gmail or Drive. Google has its own privacy policy."],
      items: ["Identity and account information: name, email address, student or employee identifier, institute, role, program, section, year level, account status, password hash, activation and recovery records, and optional profile details such as photo, biography, department, and phone number.", "Academic records: course enrollment, materials, assignments, uploaded files, answers, grades, feedback, private course comments, group membership, assessment attempts, timestamps, and activity or laboratory results.", "Learning and participation records: flashcards and review progress, study sessions, notes, tasks, calendar entries, annotations, experience points, badges, streaks, leaderboard entries, and Knowledge Exchange questions, answers, votes, and moderation records.", "Assessment integrity information: recorded tab switches, copy/paste activity and related details, fullscreen exits, right-click or blocked shortcut events, timing, submitted code, and similarity results where the relevant assessment feature is enabled.", "Security and delivery information: IP address, browser or device information, session timestamps, audit and rate-limit records, email delivery records, and notification device tokens where push notifications are enabled.", "Integration information: selected repository and commit details, submitted code and test inputs, AI prompts, selected learning content and error output, and connected-service credentials where that feature requires them."],
    },
    {
      id: "purposes-and-legal-basis", title: "Purposes and legal basis",
      paragraphs: ["The LMS uses information to verify accounts, deliver teaching materials, manage classes and assessments, provide feedback and progress views, communicate academic updates, support learning tools, respond to requests, protect accounts, investigate misuse, and maintain required academic records.", "Processing must have an applicable basis under the Philippine Data Privacy Act of 2012 and other relevant laws. Depending on the purpose and data, this may involve educational or contractual obligations, legal duties, permitted institutional functions, or specific consent. Education records are sensitive personal information and require the applicable safeguards and lawful conditions for that category; a general claim of legitimate interest does not by itself authorize their processing.", "The login checkbox acknowledges this notice and agrees to the terms. It is not blanket consent for marketing, public disclosure, research outside the educational purpose, or every optional integration. Where a separate consent or permission is needed, it must be obtained for that specific purpose. Declining information essential to a course or account may limit the relevant function; ask the school about available arrangements."],
    },
    {
      id: "visibility-and-recipients", title: "Visibility and recipients",
      paragraphs: ["Instructors and authorized school personnel access records according to their assigned roles, institute, program, course, and administrative responsibilities. Classmates may see information deliberately shared through course participation, group work, leaderboards, or Knowledge Exchange, including your displayed identity and participation. Do not place confidential information in shared posts.", "Configured hosting, database, file-storage, file-inspection, email, and push-notification services process the information needed to operate their functions. Managed code-execution providers receive submitted code, language settings, test inputs, and execution outputs. AI providers may receive prompts and supplied learning context. GitHub receives or supplies repository-related information when connected. These services may process data outside the Philippines; the school remains responsible for applicable safeguards and appropriate provider arrangements.", "Disclosures to authorities or other recipients must be supported by applicable law, a valid request, or another appropriate legal basis. This notice does not authorize selling student records or using them for unrelated advertising. Request details of the providers and transfers applicable to your deployment through the privacy contact route."],
    },
    {
      id: "cookies-and-device-storage", title: "Cookies and device storage",
      paragraphs: ["The web app uses the lumina_session cookie to maintain your authenticated session. It is inaccessible to page scripts and uses secure transport in production. Sessions currently have a maximum lifetime of seven days and expire after thirty minutes of inactivity; signing out ends the current session.", "The app also uses browser or device storage for preferences, local learning state, and supported offline features. The mobile app stores sign-in credentials in device secure storage and may store cached learning data locally. Shared devices can retain local data after a session ends: sign out and clear site or app data when appropriate. Blocking required cookies prevents web sign-in; clearing device data can remove local preferences or unsynced work. Notification permission can be managed through your device settings."],
    },
    {
      id: "automated-tools", title: "Assessment monitoring and automated tools",
      paragraphs: ["Where enabled, assessment activity, automated grading, code similarity, and learning progress are made available for academic review. AI-assisted guidance can be inaccurate. A flag or similarity score should be considered with context and does not by itself establish misconduct. Contact your instructor to request an explanation or review of a grade or integrity concern through school procedures."],
    },
    {
      id: "security-and-retention", title: "Security and retention",
      paragraphs: ["The LMS uses measures such as password hashing, session controls, permission checks, and restricted access to protect information. No system can guarantee absolute security. Report suspected account compromise or accidental disclosure promptly; never send your password, verification codes, or activation link with a support request.", "Academic, account, security, and support records should be kept only for their educational, administrative, legal, or security purpose and the applicable school retention requirements. Different records may have different retention periods, including copies in backups and provider systems. Session expiry or account deactivation does not automatically delete academic records. Ask the Registrar or privacy office for the retention schedule and deletion options that apply to your records; this notice does not promise an unverified automatic deletion period."],
    },
    {
      id: "your-rights", title: "Your privacy rights and requests",
      paragraphs: ["Subject to applicable law and its limitations, you may request information about processing, access to your own records, correction of inaccurate data, objection to processing, and blocking or erasure where warranted. Rights to portability and indemnification may also apply. Where processing depends on consent, you may ask to withdraw it; withdrawal does not undo lawful past processing or override lawful recordkeeping duties.", "Submit your request through the Registrar for the designated privacy officer, specifying the record or processing concerned and how the school can reach you. The school may verify your identity and explain any applicable restriction, retention obligation, or effect on access to services. Do not send unnecessary identity documents or other people's data. You may also raise a concern with the National Privacy Commission through its official complaint channels."],
    },
    {
      id: "minors-and-changes", title: "Learners under 18 and notice updates",
      paragraphs: ["Learners under 18 and their parents or legal guardians may contact the Registrar for age-appropriate explanations, assistance, or any authorization required by school policy and applicable law. The login checkbox does not replace a required guardian authorization.", "Updates will appear on this page with a revised date. Material changes to how information is used should be communicated through an appropriate school channel, with additional notice or consent where required. The public Terms, Privacy, and Support pages can be read without signing in."],
    },
  ],
};
