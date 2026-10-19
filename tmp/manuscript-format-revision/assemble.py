from pathlib import Path
import re

ROOT=Path(__file__).resolve().parent
old=(ROOT.parent/'docx-revision'/'build.py').read_text(encoding='utf-8')
old=old.replace("FINAL=OUT/'CdM_LMS_Manuscript_Revised_Comparison.docx'","FINAL=OUT/'CdM_LMS_Chapters_1_to_3_Format_Revised.docx'")
old=old.replace("d.add_comment(runs=[r],text='Confirm the formally approved title. The earlier project instruction specified the multi-platform title used consistently in this revision.',author='Manuscript Review',initials='MR')",'')
old=old.replace("text=text.replace('BSCPE'","text=text.replace('technical checks by qualified IT experts','technical checks conducted by the researchers').replace('BSCPE'")
old=old.replace("text=text.replace('BSCPE'","text=text.replace('BSCPE'")
old=old.replace("heading('CHAPTER 1 INTRODUCTION'","heading('CHAPTER 1: INTRODUCTION'")
old=old.replace("heading('CHAPTER 2 REVIEW OF RELATED LITERATURE'","heading('CHAPTER 2: REVIEW OF RELATED LITERATURE'")
old=old.replace("heading('1.3 OBJECTIVES OF THE STUDY')","heading('1.3 STATEMENT OF THE OBJECTIVES')")
old=old.replace("background=section('1.1 BACKGROUND','1.2 STATEMENT')", "background=C['background']")
old=re.sub(r"background\[0\]=.*?\nbackground\[1\]=.*?\n",'',old)
old=old.replace("for title,text in C['features']:heading(title,2);para(text)","for category,groups in C['features_by_category']:\n    heading(category,2)\n    for title,text in groups:\n        heading(title,3);para(text)")
old=old.replace("heading('1.8 GENERAL FEATURES OF THE SYSTEM')","heading('1.8 GENERAL FEATURES OF THE SYSTEM / STUDY')")
old=old.replace(".replace('Pan et al. (2023)','Pan et al. (2022)')", ".replace('Pan et al. (2022)','Pan et al. (2023)')")
old=old.replace("    return text\ndef para", "    text=text.replace('Peralta (2024), Guico (2026) further','Peralta (2024) and Guico (2026) further')\n    return text\ndef para")
# Reuse the original PDF's branded blackletter header rather than substituting fonts.
a=old.index('# Repair the source header');b=old.index("heading('CHAPTER 1",a)
old=old[:a]+'''# Preserve the exact branded header appearance shown in LMS FINAL.pdf.
sec=d.sections[0];sec.top_margin=Inches(1.70);sec.header_distance=Inches(20/72)
header=sec.header
for el in list(header._element):header._element.remove(el)
hp=header.add_paragraph();hp.alignment=WD_ALIGN_PARAGRAPH.CENTER
hp.paragraph_format.space_before=Pt(0);hp.paragraph_format.space_after=Pt(0);hp.paragraph_format.line_spacing=1
hp.add_run().add_picture(str(ROOT/'source-header.png'),width=Inches(6.6875),height=Inches(1.365))

'''+old[b:]
# Match source captions below the figure and keep them with the illustration.
a=old.index('def figure(');b=old.index('table_num=0',a)
old=old[:a]+'''def figure(name,title,width=6.4,height=7.6,page=False):
    global fig_num
    fig_num+=1
    p=d.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    pf=p.paragraph_format;pf.space_before=Pt(0);pf.space_after=Pt(8);pf.line_spacing=1;pf.keep_with_next=True;pf.page_break_before=page
    path=ROOT/'figures'/f'{name}.png';im=Image.open(path);ratio=im.height/im.width
    w=min(width,height/ratio)
    pic=p.add_run().add_picture(str(path),width=Inches(w));pic._inline.docPr.set('descr',title)
    cap=para(f'Figure {fig_num}',False,False,before=0,after=5,spacing=1)
    cap.alignment=WD_ALIGN_PARAGRAPH.CENTER;cap.paragraph_format.keep_with_next=True
    text=para(title,False,False,before=0,after=12,spacing=1.3)
    text.alignment=WD_ALIGN_PARAGRAPH.CENTER;text.paragraph_format.keep_together=True
    for q in [cap,text]:
        for r in q.runs:r.italic=True;r.font.size=Pt(11)
    return cap
'''+old[b:]
# Preserve native paragraph formatting, but put supporting methods inside the mandated 3.5 section.
hardware=old[old.index("heading('3.10 Hardware"):old.index("heading('3.12 Role")]
hardware=hardware.replace("heading('3.10 Hardware and Deployment Requirements')","heading('3.6 HARDWARE REQUIREMENTS')").replace("heading('3.11 Software and Client Requirements')","heading('3.7 SOFTWARE REQUIREMENTS')")
chapter3='''heading('CHAPTER 3: METHODOLOGY',0,True)
heading('3.1 RESEARCH DESIGN');paragraphs(C['design'])
heading('3.2 SYSTEM AND PROJECT OVERVIEW');paragraphs(C['overview'])
heading('3.3 RESPONDENTS');ps=paragraphs(C['respondents'])
comment(ps[-1],'The group reports a historical prior-semester ICS student population of 1,602: 932 IT students and 670 CpE students. Update these figures from an authorized current enrollment record and state its semester and date. These historical population figures are not the target sample or completed respondent count. Instructor population, full-time/part-time breakdown, and Student/Instructor target samples are not yet confirmed; supply them after adviser approval.')
heading('3.4 SAMPLING TECHNIQUE');paragraphs(C['sampling'])
heading('3.5 INSTRUMENTS AND METHODS FOR DATA COLLECTION')
heading('3.5.1 Questionnaires and Instrument Review',2);paragraphs(C['instruments'])
table('Role appropriate respondent tasks',['Respondent','Platform','Representative tasks'],[
 ['ICS Students','Web and selected mobile functions','Approved coursework, own grades, notes/tasks, study tools and Knowledge Exchange'],
 ['ICS Instructors','Web and selected mobile functions','Assigned materials, submissions, grading, enrollment decisions and schedules'],
 ['Instructors designated as Program Heads','Web; permitted designation functions','Authorized faculty or program event publication; part of the Instructor group']
],[1.55,1.70,3.43])
heading('3.5.2 Local Requirements Gathering',2);ps=paragraphs(C['requirements'])
comment(ps[0],'Confirm the consultation and recruitment arrangements with the adviser before proceeding. These paragraphs describe planned methods, not completed interviews or approved institutional access.')
heading('3.5.3 Technical Testing and Observation',2);ps=paragraphs(C['testing'])
comment(ps[1],'Approve dataset size, active sessions, request rate, simultaneous CodeLab executions, repetitions, timing thresholds and measurement tools before testing. The researchers perform these checks; test accounts do not create additional respondent groups.')
table('Evidence for selected quality characteristics',['Characteristic','Researcher checks','Respondent evidence'],[
 ['Functional Suitability','Expected/actual computations, submissions, schedules and conversions','Ratings of directly used functions'],
 ['Interaction Capability','Task completion, navigation and feedback observations','Student/Instructor task ratings'],
 ['Security','Prohibited requests and private-record isolation','Observable permissions and own-record access'],
 ['Performance Efficiency','Recorded workloads, timings and resource observations','Perceived responsiveness on performed tasks'],
 ['Reliability','Interrupt/retry, duplicate or stale saves, persistence','Encountered failures during the session'],
 ['Compatibility','Permitted shared records and native-console co-existence','Client tasks within the respondent’s access']
],[1.5,2.65,2.53])
heading('3.5.4 Data Analysis and Statistical Treatment',2)
ps=[]
for i,text in enumerate(C['analysis']):
    if i!=1:
        ps.append(para(text));continue
    intro=text.split('Equivalently,')[0].strip()
    ps.append(para(intro))
    # Native editable Word fraction and frequency subscripts.
    eqp=d.add_paragraph();eqp.alignment=WD_ALIGN_PARAGRAPH.CENTER
    eqp.paragraph_format.space_before=Pt(6);eqp.paragraph_format.space_after=Pt(6)
    om=OxmlElement('m:oMathPara');o=OxmlElement('m:oMath');om.append(o)
    def mr(container,text):
        r=OxmlElement('m:r');t=OxmlElement('m:t');t.text=text;r.append(t);container.append(r)
    def frequency(container,num):
        sub=OxmlElement('m:sSub');base=OxmlElement('m:e');mr(base,'f');lower=OxmlElement('m:sub');mr(lower,str(num));sub.extend([base,lower]);container.append(sub)
    mr(o,'WM = ');frac=OxmlElement('m:f');num=OxmlElement('m:num');den=OxmlElement('m:den')
    for j,n in enumerate([4,3,2,1]):
        if j:mr(num,' + ');mr(den,' + ')
        if n>1:mr(num,str(n))
        frequency(num,n);frequency(den,n)
    frac.extend([num,den]);o.append(frac);eqp._p.append(om)
    para('Here, WM is the frequency-weighted item mean and the subscripted frequencies count valid responses at scores 4, 3, 2 and 1. Frequency weighting represents response counts rather than different importance weights for users or quality characteristics. Response distributions and valid counts will accompany means; median summaries may also be reported.')
comment(ps[1],'Confirm the scoring and aggregation procedure with the adviser/statistician. Report valid counts and response distributions. Do not invent interpretation bands or treat N/A as a numeric rating.')
heading('3.5.5 Participant Protection and Information Handling',2);ps=paragraphs(C['ethics'])
comment(ps[-1],'Finalize institutional permission, retention period, storage location, access list and withdrawal/deletion procedures. These planned measures do not assert that approval has already been granted.')
heading('3.5.6 Evaluation Release Record',2)
para('Before recruitment, the researchers will record the application revision, client builds, schema and migration state, enabled modules and languages, repository provider, file limits, device/browser matrix, network conditions, role accounts, datasets, and known limitations. Existing modules, planned extensions, tested functions, and functions enabled for respondent tasks will be identified separately. Administrator and Super User functions will be verified by the researchers with controlled accounts; ordinary respondents will not rate functions outside their authority. Secrets and identifiable academic records will be excluded from manuscript examples.')
'''+hardware+'''
heading('3.8 FLOWCHART',page=True)
para('The diagrams separate access and registration, role navigation, and course enrollment details. Oval terminators identify the start or end; rectangles identify processes; parallelograms identify input/output; diamonds identify decisions; and rectangles with double side lines identify detailed subprocesses. Circles continue a flow on the same page, while pentagonal connectors continue it on another diagram. Matching letters identify the destination. Each protected operation remains subject to backend authorization.')
figure('symbol-key','Symbols used in the system flowcharts',height=3.5)
para('Off-page connectors R and L link registration with the access chart; S, I, A and U link to Student, Instructor, Administrator and Super User overviews. E and E2 lead to the enrollment request and Instructor review details. Same-page pairs L1, R1 and E1 allow correction and retry; S1, I1, A1 and U1 return to the corresponding dashboard. A dashed line marks the later review of a recorded pending request, which does not block the Student from using other modules.')
heading('3.8.1 Account Access and Registration',2,page=True)
figure('access','Account access and role routing',height=6.55)
para('Users open the appropriate client and authenticate using email, password and institute selection. The backend validates credentials, account status, role and permitted institute before establishing a session. Invalid access produces feedback and a retry through L1. The target release routes successful access to the appropriate role overview. New public Student or Instructor accounts use R; privileged accounts are created through authorized administrative operations. The Super User routing branch represents the agreed expansion and must be verified in the evaluation release.')
figure('registration','Public Student and Instructor registration detail',height=7.1,page=True)
para('The registration process validates required fields, institute, permitted public role and duplicate email. Invalid input returns through R1 for correction. Valid registration hashes the password, creates the account, and displays confirmation. L returns to the access chart. Any email verification or account-approval steps must agree with the evaluated registration workflow.')
heading('3.8.2 Student View',2,page=True);figure('student','Student overview with links to detailed enrollment',height=7.15)
para('S opens the Student Dashboard after successful access or a completed enrollment action. Students select approved coursework and assigned deadlines, request enrollment, view their own grades, and use permitted study, calendar, coding and collaboration tools. Personal Tasks remain separate from the academic To-Do list. Each ordinary module returns through S1; Join Courses continues through E. Students do not gain faculty-directory or supervisory privileges. Log out ends the session.')
figure('enrollment','Student course enrollment request detail',height=7.2,page=True)
para('E receives the Join Courses action. The backend checks the code, institute and existing enrollment status. Invalid or duplicate requests produce feedback and retry through E1. An eligible request is saved as PENDING, then shown to the Student. S returns to the Student overview without granting course access. E2 identifies the Instructor’s later review of the saved request.')
figure('enrollment-review','Instructor enrollment decision detail',height=7.1,page=True)
para('The assigned Instructor opens the request queue and the backend checks authority and the current request state. Approval saves APPROVED and grants enrolled-course access; rejection saves REJECTED and does not grant access. Updated status becomes available through the Student’s permitted course view. I returns to the Instructor overview. A valid course code alone does not enroll the Student immediately.')
heading('3.8.3 Instructor View',2,page=True);figure('instructor','Instructor overview with enrollment review continuation',height=7.15)
para('I opens the Instructor Dashboard. Instructors manage assigned courses and resources, configure grades, inspect descriptive analytics, review enrollment requests through E2, and assess CodeLab results or Git-linked work through their separate workflows. Calendar and faculty-directory actions follow their permissions; Program Head publishing requires that designation. Moderation, verification and owned study functions remain bounded by their rules. I1 returns to the dashboard, while Log out ends the session.')
heading('3.8.4 Administrator View',2,page=True);figure('administrator','Native Administrator Console overview',height=7.15)
para('A opens the native Administrator Console after validated Administrator access. Supported actions include accounts and roles, academic configuration, schedule/event administration, audit review, reports and continuity functions. Only authorized Administrators provision or revoke Super User accounts. Historical audit records are reviewed rather than freely rewritten. A1 returns to the dashboard. The researchers will verify these restricted functions with controlled accounts; no separate Administrator respondent group is introduced.')
heading('3.8.5 Super User View',2,page=True);figure('super-user','Restricted Super User academic operations overview',height=7.15)
para('U opens the web-based academic operations hub for an authorized institute. The Super User uses permitted faculty and leadership information, reads timetables, publishes permitted shared events, inspects safe course summaries, and manages owned private records. Supervision excludes student identities, individual grades, submissions, attempts and answers. The role does not permit grading, assessment participation, schedule editing or generic administration. U1 returns to the hub; Log out ends the session. This expansion will undergo researcher-conducted technical checks.')
heading('3.9 ENTITY RELATIONSHIP DIAGRAM',page=True)
para('The ERDs show selected current Prisma relationships and separate proposed coordination additions. User stores account roles. Repeated entities denote the same table. PK, FK and UK identify primary, foreign and unique keys. Crow’s-foot notation uses a circle for zero, a bar for one and a fork for many; optional child collections may contain zero records.')
for name,title,text in [
 ('erd-academic','Account, institute and course enrollment relationships','Institute links User and Course records. Course.instructorId is optional and references a User acting as Instructor. Enrollment links a Student User to a Course and stores pending, approved or rejected status under a unique course/student pair. Session records belong to User. Role and resource authorization are enforced separately from these foreign-key links.'),
 ('erd-grading','Coursework, submission and grading relationships','Course links SyllabusItem records and an optional GradingPolicy. CategoryWeight records define the policy’s component weights. StudentSubmission connects an item to a Student User, with a unique item/student pair and recorded grade or status. Computed grade summaries use the applicable grading rules; they are not modelled as a single undifferentiated Grade table.'),
 ('erd-support','Selected personal ownership and learning activity relationships','User owns Note and CalendarEvent records, creates FlashcardDeck records, and creates ActivityTemplate records through createdBy. CalendarEvent may optionally reference Course, while ActivityTemplate requires a courseId. These selected relationships omit supporting task, card, progress, study-session and gamification tables for readability; their fields and constraints remain part of the release schema.'),
 ('erd-coursework-forum','Separate programming, repository and forum record relationships','ActivityTemplate links ActivitySubmission records containing scores and execution-related outcomes. GithubRepoLink links GithubSubmission records, which also reference the submitting User and SyllabusItem. KxPost links KxAnswer records with an author and optional verifying faculty User. These groups preserve the distinction between code execution, Git coursework and moderated discussion.'),
 ('erd-proposed-coordination','Proposed coordination schema and private snapshot relationships','Dashed outlines distinguish the target additions from current schema records. CourseSchedule and CourseScheduleException will preserve effective-dated revisions and occurrence exceptions. Course and User will receive program and coordination fields. CalendarEvent will receive time, audience, source-note and version fields; Note will receive an event-source link with a unique creator/event combination. Institute.deanId and other membership/attribution links will be checked against the final migration. Snapshot conversions are one-time copies, not ongoing synchronization.')
]:
    figure(name,title,height=5.75 if name=='erd-academic' else 7.05,page=name!='erd-academic');para(text)
comment(d.paragraphs[-1],'Verify the selected ERDs and proposed fields against the final approved migration and evaluation schema. Current code does not establish completion of the coordination extension. This is a scoped relational view, not an exhaustive table dictionary.')
heading('3.10 DATA FLOW DIAGRAM',page=True)
figure('dfd-context','Context diagram of the LMS and external actors',height=6.3)
para('The context diagram presents CdM LMS as one process exchanging data with Students, Instructors, Super Users, Administrators, the repository provider and the code-execution service. Rectangles represent external entities; the rounded process represents the system; and labelled arrows identify the direction of requests or returned information. Own records, safe summaries and administrative results remain limited by their respective permissions. Repository data and execution results are distinct exchanges. The role actors describe system users, not additional research respondent categories.')
heading('3.10.1 Level 1 Functional Data Flow',2,page=True)
figure('dfd-level-one','Level 1 functional data flow and logical record stores',height=7.15)
para('Level 1 separates four processes. Repeated actors denote the same users; D1–D4 are logical record stores. Each process checks applicable permissions. D4 includes proposed coordination records. Recurring classes and deadlines are generated calendar outputs, with Student timetable projection excluded. The final flows will match the evaluation release.')
'''
a=old.index("heading('CHAPTER 3 METHODOLOGY'");b=old.index("heading('REFERENCES'",a)
old=old[:a]+chapter3+'\n'+old[b:]
# Include italicized standalone works and proceedings in the APA-style bibliography.
old=old.replace("if spans:\n        for r in list(p.runs)","""if not spans:
        for title in ['An empirical study evaluating the effects of gamification in an e-learning environment','Systems and software engineering—Systems and software Quality Requirements and Evaluation (SQuaRE)—Product quality model','Descriptive research: Definition, types, methods and examples','8 Google Classroom tips every teacher should know','Moodle LMS 4.5: Unlock the power of AI for your courses','Proceedings of the 30th International Conference on Computers in Education','Proceedings of the 2024 ACM Virtual Global Computing Education Conference','Proceedings of the 46th International Conference on Software Engineering: Software Engineering Education and Training']:
            if title in text:spans.append((text.index(title),text.index(title)+len(title)))
    if spans:
        for r in list(p.runs)""")
# Save a sibling reviewable output and its editable diagrams source.
old=old.replace("print(json.dumps(manifest,ensure_ascii=False))","import shutil\nshutil.copy2(ROOT/'CdM_LMS_Editable_Diagrams.drawio',OUT/'CdM_LMS_Editable_Diagrams.drawio')\nprint(json.dumps(manifest,ensure_ascii=False))")
(ROOT/'build.py').write_text(old,encoding='utf-8')
print('Source-based authoring script assembled')
