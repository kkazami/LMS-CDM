from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math, html, json, xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'figures';OUT.mkdir(exist_ok=True)
PAGES=[];SCALE=2
def page(name,w=1200,h=1350):
    p={'name':name,'w':w,'h':h,'nodes':[],'edges':[]};PAGES.append(p);return p
def node(p,id,text,x,y,w,h,kind='process',dashed=False,size=27):
    n=dict(id=id,text=text,x=x,y=y,w=w,h=h,kind=kind,dashed=dashed,size=size);p['nodes'].append(n);return n
def edge(p,a,b,pts,label='',labelpos=None,kind='arrow',ends=None,dashed=False):
    p['edges'].append(dict(a=a,b=b,pts=pts,label=label,labelpos=labelpos,kind=kind,ends=ends,dashed=dashed))
def direct(p,a,b,label='',labelpos=None):
    A=next(n for n in p['nodes'] if n['id']==a);B=next(n for n in p['nodes'] if n['id']==b)
    edge(p,a,b,[(A['x']+A['w']/2,A['y']+A['h']),(B['x']+B['w']/2,B['y'])],label,labelpos)

p=page('symbol-key',1200,660)
symbols=[('terminal','Start or end'),('process','Action or processing'),('input','Input or output'),('decision','Decision with labelled branches'),('predefined','Detailed subprocess'),('on','On-page continuation'),('off','Off-page continuation')]
for i,(kind,label) in enumerate(symbols):
    col=i%2;row=i//2;x=30+col*600;y=20+row*160
    node(p,str(i),'A' if kind in ('on','off') else '',x,y,130 if kind in ('on','off') else 220,100,kind)
    node(p,'label'+str(i),label,x+240,y,325,100,'plain',size=26)

p=page('access',1200,1430)
node(p,'start','START',445,20,310,65,'terminal')
node(p,'open','Open the role-appropriate client\nWeb Portal or native Admin Console',345,120,510,85)
node(p,'new','New public account?',405,245,390,135,'decision')
node(p,'reg','R',990,260,110,85,'off');node(p,'reglabel','Registration\n(next chart)',900,355,290,65,'plain',size=25)
node(p,'L','L',10,435,100,85,'off');node(p,'Llabel','From registration',10,545,280,35,'plain',size=22)
node(p,'input','Select institute; enter\nemail and password',360,425,480,85,'input')
node(p,'check','Validate credentials, active status,\nrole and permitted institute',345,565,510,90)
node(p,'ok','Access permitted?',405,705,390,140,'decision')
node(p,'error','Display reason for denied access',20,720,310,90,'input')
node(p,'retry','L1',125,590,65,65,'on');node(p,'L1','L1',180,435,65,65,'on')
# The off-page return L enters the credential step; same-page retry uses L1.
node(p,'session','Establish session',380,895,440,75)
node(p,'role','Route by authorized role',380,1015,440,75,'predefined')
for i,(id,text) in enumerate([('S','Student overview'),('I','Instructor overview'),('A','Administrator overview'),('U','Super User overview')]):
    x=15+i*295;node(p,id,id,x+70,1190,110,85,'off');node(p,id+'label',text,x,1290,270,60,'plain',size=24)
direct(p,'start','open');direct(p,'open','new');edge(p,'new','reg',[(795,312),(990,312)],'Yes',(875,280));direct(p,'new','input','No',(640,395))
edge(p,'L','input',[(60,520),(300,520),(300,490),(360,490)]);edge(p,'L1','input',[(245,467),(360,467)])
direct(p,'input','check');direct(p,'check','ok');edge(p,'ok','error',[(405,775),(330,775)],'No',(365,744));edge(p,'error','retry',[(175,720),(175,655)])
direct(p,'ok','session','Yes',(646,865));direct(p,'session','role')
for i,id in enumerate(['S','I','A','U']):
    x=140+i*295;edge(p,'role',id,[(600,1090),(600,1130),(x,1130),(x,1190)])

p=page('registration',1200,1270)
node(p,'R','R',535,20,130,90,'off')
node(p,'details','Enter permitted registration details\nStudent or Instructor public account',350,170,500,100,'input')
node(p,'validate','Validate required fields, institute,\npermitted role and duplicate email',350,330,500,100)
node(p,'valid','Registration valid?',405,490,390,160,'decision')
node(p,'err','Show validation or duplicate error',20,515,310,100,'input')
node(p,'r1a','R1',135,350,70,70,'on');node(p,'r1b','R1',135,185,70,70,'on')
node(p,'save','Hash password; create account',350,720,500,90)
node(p,'confirm','Display registration confirmation',350,880,500,90,'input')
node(p,'L','L',535,1060,130,90,'off')
node(p,'note','L returns to the credential step in the access chart.\nAdministrative and Super User accounts are not publicly registered.',100,1180,1000,70,'plain',size=24)
direct(p,'R','details');edge(p,'r1b','details',[(205,220),(350,220)]);direct(p,'details','validate');direct(p,'validate','valid')
edge(p,'valid','err',[(405,570),(330,570)],'No',(365,538));edge(p,'err','r1a',[(170,515),(170,420)])
direct(p,'valid','save','Yes',(650,680));direct(p,'save','confirm');direct(p,'confirm','L')

def overview(name,role,code,modules,subtitle=''):
    h=760+len(modules)*120
    p=page(name,1200,h)
    node(p,'entry',code,535,20,130,85,'off')
    node(p,'entrytext','From access or a detailed flow'+subtitle,730,25,430,70,'plain',size=24)
    node(p,'return1',code+'1',70,150,75,75,'on')
    node(p,'dashboard',role+' Dashboard',370,155,460,85)
    node(p,'choose','Select one permitted function',370,290,460,85,'input')
    direct(p,'entry','dashboard');edge(p,'return1','dashboard',[(145,188),(370,188)]);direct(p,'dashboard','choose')
    node(p,'buslabel','Selected function',20,335,260,60,'plain',size=23)
    for i,(title,action,special) in enumerate(modules):
        y=440+i*120
        node(p,'m'+str(i),title,250,y,310,88)
        node(p,'f'+str(i),action,655,y,390,88,'predefined' if special else 'process',size=26)
        edge(p,'choose','m'+str(i),[(370,332),(180,332),(180,y+44),(250,y+44)])
        edge(p,'m'+str(i),'f'+str(i),[(560,y+44),(655,y+44)])
        if title in ['Join Courses','Requests Queue']:
            target='E' if title=='Join Courses' else 'E2'
            node(p,'detail'+target,target,1065,y+2,105,85,'off')
            edge(p,'f'+str(i),'detail'+target,[(1045,y+44),(1065,y+44)])
        else:edge(p,'f'+str(i),'return2',[(1045,y+44),(1185,y+44),(1185,h-263),(1125,h-263)])
    node(p,'return2',code+'1',1050,h-300,75,75,'on')
    node(p,'returntext','Return to dashboard',750,h-293,280,60,'plain',size=25)
    y=600+len(modules)*120
    node(p,'logout','Log out',250,y,310,75)
    node(p,'end','END',655,y,390,75,'terminal')
    edge(p,'choose','logout',[(370,332),(180,332),(180,y+37),(250,y+37)])
    edge(p,'logout','end',[(560,y+37),(655,y+37)])
    return p

overview('student','Student','S',[
 ('My Courses and To-Do','Approved coursework, resources,\nsubmissions and deadlines',False),
 ('Join Courses','Request course enrollment\nDetail starts at E',True),
 ('Personal Grades','Own grades and descriptive\nprogress information',False),
 ('Notes, Tasks and Calendar','Owned records; permitted events\nand private snapshots',False),
 ('Study and Progression','Flashcards, focus records, EXP,\nachievements and leaderboards',False),
 ('Coding and Knowledge Exchange','Authorized CodeLab, Git coursework,\nquestions, answers and resources',False)
])

p=page('enrollment',1200,1290)
node(p,'E','E',535,20,130,85,'off');node(p,'enter','Enter course join code',365,165,470,80,'input')
node(p,'lookup','Check course, institute and\nexisting enrollment status',355,295,490,90)
node(p,'eligible','Eligible new request?',405,445,390,160,'decision')
node(p,'error','Show invalid code or existing status\nDo not create a duplicate',20,455,310,110,'input')
node(p,'e1a','E1',135,315,70,70,'on');node(p,'e1b','E1',135,175,70,70,'on')
node(p,'pending','Save enrollment request\nwith PENDING status',355,680,490,90)
node(p,'show','Display pending status\nNo course access until approval',355,840,490,90,'input')
node(p,'S','S',535,1050,130,85,'off');node(p,'E2','E2',985,675,130,85,'off')
node(p,'later','Later Instructor review\n(next chart)',905,775,280,80,'plain',size=23)
node(p,'note','S returns to the Student overview. The Student can use other modules while waiting.',90,1180,1020,65,'plain',size=25)
direct(p,'E','enter');edge(p,'e1b','enter',[(205,210),(365,210)]);direct(p,'enter','lookup');direct(p,'lookup','eligible')
edge(p,'eligible','error',[(405,525),(330,525)],'No',(368,493));edge(p,'error','e1a',[(170,455),(170,385)])
direct(p,'eligible','pending','Yes',(650,625));direct(p,'pending','show');direct(p,'show','S')
edge(p,'pending','E2',[(845,725),(985,725)],'Review',(910,690),dashed=True)

p=page('enrollment-review',1200,1250)
node(p,'E2','E2',535,20,130,85,'off');node(p,'queue','Authorized Instructor opens\nassigned course requests',340,165,520,90)
node(p,'check','Validate session, course assignment\nand current pending status',340,310,520,90)
node(p,'approve','Approve request?',410,460,380,160,'decision')
node(p,'approved','Save APPROVED status\nGrant enrolled-course access',50,730,440,100)
node(p,'rejected','Save REJECTED status\nDo not grant course access',710,730,440,100)
node(p,'status','Updated status becomes available\nto the Student’s permitted course view',330,950,540,100,'input')
node(p,'I','I',535,1120,130,85,'off')
direct(p,'E2','queue');direct(p,'queue','check');direct(p,'check','approve')
edge(p,'approve','approved',[(410,540),(270,540),(270,730)],'Yes',(310,507))
edge(p,'approve','rejected',[(790,540),(930,540),(930,730)],'No',(855,507))
edge(p,'approved','status',[(270,830),(270,900),(600,900),(600,950)])
edge(p,'rejected','status',[(930,830),(930,900),(600,900),(600,950)])
direct(p,'status','I')

overview('instructor','Instructor','I',[
 ('Assigned Courses','Create or manage permitted classes,\nmaterials, activities and announcements',False),
 ('Gradebook and Analytics','Configured grades, exports and\nrule-based attention summaries',False),
 ('Requests Queue','Review pending enrollments\nDetail starts at E2',True),
 ('CodeLab and Git Review','Programming problems, test results\nand repository coursework review',False),
 ('Calendar and Faculty Directory','Authorized schedules and events;\nProgram Head publishing if designated',False),
 ('Knowledge Exchange and Study','Moderation, verified answers,\nsupported rewards and owned records',False)
])
overview('administrator','Administrator','A',[
 ('Accounts and Roles','Permitted status and assignments;\nSuper User provision or revocation',False),
 ('Academic Configuration','Institute settings, faculty designations\nand authorized course administration',False),
 ('Calendar and Schedules','Permitted schedule revisions,\nexceptions and shared events',False),
 ('Audit and Activity Records','Review, filter and export\nsupported records',False),
 ('Reports and Continuity','Supported reports, security controls,\nbackup and recovery operations',False)
],'; native Console')
overview('super-user','Super User','U',[
 ('Academic Operations Hub','Authorized institute summaries\nand faculty information',False),
 ('Faculty and Designations','Narrowly permitted leadership\nand program membership operations',False),
 ('Timetable and Shared Events','Read authorized schedules;\npermitted faculty announcements',False),
 ('Course Supervision','Safe course and material summaries;\nno individual assessment records',False),
 ('Private Organization','Own notes, events and permitted\nprivate snapshot conversions',False)
])

def ent(p,id,title,fields,x,y,w=395,h=175,dashed=False):
    return node(p,id,title+'\n'+'\n'.join(fields),x,y,w,h,'entity',dashed,size=26)
def rel(p,a,b,pts,label,ends=('one','optional-many'),pos=None,dashed=False):
    edge(p,a,b,pts,label,pos,'relation',ends,dashed)

p=page('erd-academic',1200,1180)
ent(p,'inst','Institute',['PK id','UK code; name'],400,20)
ent(p,'user','User',['PK id; FK instituteId','email; role; isActive'],35,360)
ent(p,'course','Course',['PK id; FK instituteId','FK instructorId (nullable)','title; section; isArchived'],770,360)
ent(p,'session','Session',['PK id; FK userId','UK tokenHash; expiresAt'],35,910)
ent(p,'enroll','Enrollment',['PK id; FK courseId, studentId','UK courseId + studentId','status'],770,910)
rel(p,'inst','user',[(400,108),(232,108),(232,360)],'belongs to',pos=(220,250))
rel(p,'inst','course',[(795,108),(967,108),(967,360)],'contains',pos=(982,245))
rel(p,'user','course',[(430,445),(770,445)],'assigned Instructor',('optional-one','optional-many'),(600,412))
rel(p,'user','session',[(232,535),(232,910)],'has sessions',pos=(245,685))
rel(p,'course','enroll',[(967,535),(967,910)],'has enrollments',pos=(980,685))
rel(p,'user','enroll',[(330,535),(330,755),(875,755),(875,910)],'Student enrollment',pos=(600,724))

p=page('erd-grading',1200,1410)
ent(p,'course','Course',['PK id'],405,20,h=130)
ent(p,'policy','GradingPolicy',['PK id; UK/FK courseId'],30,350,h=150)
ent(p,'item','SyllabusItem',['PK id; FK courseId','type; dueDate; maxPoints'],775,350)
ent(p,'weight','CategoryWeight',['PK id; FK gradingPolicyId','category; weightPercentage','UK gradingPolicyId + category'],30,740)
ent(p,'user','User',['PK id'],30,1130,h=130)
ent(p,'sub','StudentSubmission',['PK id; FK syllabusItemId, studentId','grade; status; submittedAt','UK syllabusItemId + studentId'],775,1130,h=190)
rel(p,'course','policy',[(405,85),(227,85),(227,350)],'grading policy',('one','optional-one'),(230,250))
rel(p,'course','item',[(800,85),(972,85),(972,350)],'course items',pos=(975,250))
rel(p,'policy','weight',[(227,500),(227,740)],'assessment weights',pos=(260,625))
rel(p,'item','sub',[(972,525),(972,1130)],'submitted work',pos=(985,760))
rel(p,'user','sub',[(425,1195),(775,1195)],'Student submissions',pos=(605,1160))

p=page('erd-support',1200,1280)
ent(p,'user','User',['PK id'],405,500,h=130)
for id,title,fields,x,y in [
 ('note','Note',['PK id; FK creatorId, instituteId','title; content; archived'],20,20),
 ('deck','FlashcardDeck',['PK id; FK creatorId','title; optional courseId'],20,870),
 ('event','CalendarEvent',['PK id; FK creatorId, instituteId','eventDate; optional courseId'],785,20),
 ('activity','ActivityTemplate',['PK id; FK createdBy, courseId','activityType'],785,870)]:ent(p,id,title,fields,x,y)
rel(p,'user','note',[(405,550),(218,550),(218,195)],'owns notes',pos=(230,340))
rel(p,'user','event',[(800,550),(982,550),(982,195)],'creates events',pos=(965,340))
rel(p,'user','deck',[(405,590),(218,590),(218,870)],'creates decks',pos=(205,750))
rel(p,'user','activity',[(800,590),(982,590),(982,870)],'creates activities',pos=(980,750))
node(p,'note-key','Selected ownership relationships. Additional card, task, study-session and progression\nrecords remain in the release schema. Nullable course links do not imply enrollment.',45,1140,1110,100,'plain',size=25)

p=page('erd-coursework-forum',1200,1120)
for i,(a,ta,fa,b,tb,fb) in enumerate([
 ('activity','ActivityTemplate',['PK id; FK createdBy'],'asub','ActivitySubmission',['PK id; FK templateId, studentId','score; maxScore; passed']),
 ('repo','GithubRepoLink',['PK id; FK userId'],'gsub','GithubSubmission',['PK id; FK repoLinkId, userId','FK syllabusItemId; commitSha']),
 ('post','KxPost',['PK id; FK authorId, instituteId'],'answer','KxAnswer',['PK id; FK postId, authorId','optional FK verifiedById'])]):
    x=20+i*400;ent(p,a,ta,fa,x,30,w=365,h=190);ent(p,b,tb,fb,x,720,w=365,h=230)
    rel(p,a,b,[(x+182,220),(x+182,720)],'has records',pos=(x+180,455))
node(p,'note','FK fields also reference the corresponding User or SyllabusItem.\nCodeLab execution, Git coursework and Knowledge Exchange retain separate records.',60,1010,1080,85,'plain',size=25)

p=page('erd-proposed-coordination',1200,1300)
ent(p,'user','User extended',['PK id; facultyPrograms[]','nullable headProgram'],25,30,dashed=True)
ent(p,'course','Course extended',['PK id; academicProgram','scheduleRevision'],775,30,dashed=True)
ent(p,'note','Note extended',['PK id; FK creatorId','nullable sourceEventId','UK creatorId + sourceEventId'],25,495,h=195,dashed=True)
ent(p,'schedule','CourseSchedule new',['PK id; FK courseId, instructorId','weekdays; time; date bounds','room; timezone; revision'],775,495,h=220,dashed=True)
ent(p,'event','CalendarEvent extended',['PK id; FK creatorId','audience; time kind; start/end','nullable UK sourceNoteId; version'],25,950,h=210,dashed=True)
ent(p,'exception','CourseScheduleException new',['PK id; FK scheduleId','originalDate; kind; replacement','UK scheduleId + originalDate'],775,950,h=210,dashed=True)
rel(p,'user','note',[(222,205),(222,495)],'owns notes',pos=(235,355),dashed=True)
rel(p,'course','schedule',[(972,205),(972,495)],'schedule revisions',pos=(972,355),dashed=True)
rel(p,'schedule','exception',[(972,715),(972,950)],'occurrence exceptions',pos=(970,823),dashed=True)
rel(p,'note','event',[(222,690),(222,950)],'scheduled snapshot',('optional-one','optional-one'),(255,815),True)
node(p,'notes','Dashed entities show the agreed target, not completed migrations.\nEvent-to-note snapshots allow one owned note per creator and source event.\nInstitute.deanId, audience rules and other FK links are described in the text.',440,780,315,410,'plain',size=25)

# Context DFD uses short noun labels in clear gaps between entities and the system.
p=page('dfd-context',1200,970)
node(p,'system','0\nCdM LMS',450,80,300,770,'dfd-process',size=34)
for j,(left,right,lt,rt,lin,lout,rin,rout) in enumerate([
 ('student','instructor','Student','Instructor','Coursework data','Own records','Teaching data','Course records'),
 ('super','admin','Super User','Administrator','Oversight request','Safe summaries','Admin request','Admin results'),
 ('repository','execution','Repository provider','Execution service','Repository data','Repo request','Run results','Code / tests')]):
    y=100+j*300
    node(p,left,lt,20,y,270,150,'external',size=28);node(p,right,rt,890,y,270,150,'external',size=28)
    edge(p,left,'system',[(290,y+45),(450,y+45)],lin,(370,y+20))
    edge(p,'system',left,[(450,y+115),(290,y+115)],lout,(370,y+90))
    edge(p,right,'system',[(890,y+45),(750,y+45)],rin,(820,y+20))
    edge(p,'system',right,[(750,y+115),(890,y+115)],rout,(820,y+90))

p=page('dfd-level-one',1200,1530)
rows=[
 (30,'p1','1.0 Access and\nadministration','D1','Accounts, sessions\nand audit records',['Student','Instructor','Super User','Administrator'],'Credentials or admin requests','Session, status or admin results'),
 (380,'p2','2.0 Coursework, grades\nand programming','D2','Course, enrollment\nand assessment records',['Student','Instructor'],'Coursework or grading data','Course records and results'),
 (780,'p3','3.0 Study, progression\nand collaboration','D3','Personal study,\nprogression and forum records',['Student','Instructor','Super User'],'Personal or forum changes','Permitted saved records'),
 (1150,'p4','4.0 Academic coordination\nand calendar','D4','Events, faculty and\nproposed schedule records',['Student','Instructor','Super User','Administrator'],'Permitted coordination request','Permitted calendar or safe summary')]
for y,id,text,store,stext,actors,request,result in rows:
    node(p,id,text,460,y+95,345,130,'dfd-process',size=27)
    node(p,store,store+'\n'+stext,935,y+95,245,130,'store',size=25)
    for j,actor in enumerate(actors):
        nid=id+'actor'+str(j);node(p,nid,actor,20,y+j*70,235,56,'external',size=25)
        edge(p,nid,id,[(255,y+j*70+17),(310,y+j*70+17),(310,y+125),(460,y+125)],'Requests' if j==0 else '',(400,y+98))
        edge(p,id,nid,[(460,y+190),(365,y+190),(365,y+j*70+42),(255,y+j*70+42)],'Results' if j==0 else '',(413,y+220))
    node(p,id+'req',request,20,y+278 if id!='p2' else y+195,390,30,'plain',size=22)
    node(p,id+'res',result,20,y+(312 if id=='p1' else 326) if id!='p2' else y+245,390,30,'plain',size=22)
    edge(p,id,store,[(805,y+125),(935,y+125)],'Changes',(870,y+95))
    edge(p,store,id,[(935,y+190),(805,y+190)],'Records',(870,y+220))
# Explicit external services preserve the context boundary for programming.
node(p,'repo','Repository provider',435,704,290,56,'external',size=24)
node(p,'exec','Execution service',850,704,290,56,'external',size=24)
edge(p,'p2','repo',[(530,605),(530,704)],'Repo request',(477,650))
edge(p,'repo','p2',[(680,704),(680,605)],'Repo data',(637,625))
edge(p,'p2','exec',[(745,605),(745,675),(995,675),(995,704)],'Code / tests',(895,690))
edge(p,'exec','p2',[(1090,704),(1090,650),(785,650),(785,605)],'Run results',(1040,625))

def f(size,bold=False):return ImageFont.truetype(r'C:\Windows\Fonts\timesbd.ttf' if bold else r'C:\Windows\Fonts\times.ttf',round(size*SCALE))
def render(p):
    im=Image.new('RGB',(p['w']*SCALE,p['h']*SCALE),'white');d=ImageDraw.Draw(im)
    def xy(pts):return [(round(x*SCALE),round(y*SCALE)) for x,y in pts]
    def line(pts,dashed=False):
        if not dashed:d.line(xy(pts),fill='black',width=4);return
        for a,b in zip(xy(pts),xy(pts)[1:]):
            length=math.dist(a,b)
            for n in range(0,int(length),22):
                r=n/max(length,1);r2=min((n+13)/max(length,1),1)
                d.line([(a[0]+(b[0]-a[0])*r,a[1]+(b[1]-a[1])*r),(a[0]+(b[0]-a[0])*r2,a[1]+(b[1]-a[1])*r2)],fill='black',width=4)
    def marker(endpoint,toward,kind):
        x,y=endpoint;dx=toward[0]-x;dy=toward[1]-y;l=math.hypot(dx,dy);ux,uy=dx/l,dy/l;vx,vy=-uy,ux
        def pt(a,b):return ((x+ux*a+vx*b)*SCALE,(y+uy*a+vy*b)*SCALE)
        if 'many' in kind:
            for offset in [-13,0,13]:d.line([pt(0,offset),pt(23,0)],fill='black',width=3)
            bar=30
        else:bar=16
        d.line([pt(bar,-12),pt(bar,12)],fill='black',width=3)
        if kind.startswith('optional'):d.ellipse((pt(bar+20,0)[0]-9*SCALE,pt(bar+20,0)[1]-9*SCALE,pt(bar+20,0)[0]+9*SCALE,pt(bar+20,0)[1]+9*SCALE),fill='white',outline='black',width=3)
        elif 'one' in kind or 'many' in kind:d.line([pt(bar+12,-12),pt(bar+12,12)],fill='black',width=3)
    for e in p['edges']:
        line(e['pts'],e['dashed'])
        if e['kind']=='relation':
            marker(e['pts'][0],e['pts'][1],e['ends'][0]);marker(e['pts'][-1],e['pts'][-2],e['ends'][1])
        else:
            a,b=xy(e['pts'][-2:]);ang=math.atan2(b[1]-a[1],b[0]-a[0]);tip=20
            d.polygon([b,(b[0]-tip*math.cos(ang-.4),b[1]-tip*math.sin(ang-.4)),(b[0]-tip*math.cos(ang+.4),b[1]-tip*math.sin(ang+.4))],fill='black')
    for n in p['nodes']:
        x,y,w,h=[round(n[k]*SCALE) for k in ['x','y','w','h']];kind=n['kind'];polygon=None
        if kind=='terminal' or kind=='on':d.ellipse((x,y,x+w,y+h),fill='white',outline='black',width=4)
        elif kind=='decision':polygon=[(x+w/2,y),(x+w,y+h/2),(x+w/2,y+h),(x,y+h/2)]
        elif kind=='input':polygon=[(x+30*SCALE,y),(x+w,y),(x+w-30*SCALE,y+h),(x,y+h)]
        elif kind=='off':polygon=[(x,y),(x+w,y),(x+w,y+h*.65),(x+w/2,y+h),(x,y+h*.65)]
        elif kind=='dfd-process':d.rounded_rectangle((x,y,x+w,y+h),radius=22*SCALE,fill='white',outline='black',width=4)
        elif kind=='store':
            d.rectangle((x,y,x+w,y+h),fill='white');d.line([(x,y),(x+w,y)],fill='black',width=4);d.line([(x,y+h),(x+w,y+h)],fill='black',width=4);d.line([(x,y),(x,y+h)],fill='black',width=4)
        elif kind!='plain':
            d.rectangle((x,y,x+w,y+h),fill='white',outline='black',width=4)
            if kind=='predefined':
                d.line([(x+16*SCALE,y),(x+16*SCALE,y+h)],fill='black',width=4);d.line([(x+w-16*SCALE,y),(x+w-16*SCALE,y+h)],fill='black',width=4)
            if kind=='entity':d.line([(x,y+50*SCALE),(x+w,y+50*SCALE)],fill='black',width=3)
        if polygon:d.polygon(polygon,fill='white',outline='black',width=4)
        if n['dashed']:
            for a,b in [((x,y),(x+w,y)),((x+w,y),(x+w,y+h)),((x+w,y+h),(x,y+h)),((x,y+h),(x,y))]:
                d.line([a,b],fill='white',width=5);line([(a[0]/SCALE,a[1]/SCALE),(b[0]/SCALE,b[1]/SCALE)],True)
        raw=n['text'].split('\n');size=n['size'];maxw=w-40*SCALE
        if kind=='decision':maxw=w*.57
        while True:
            ft=f(size);lines=[]
            for text in raw:
                if not text:lines.append('');continue
                buf=''
                for word in text.split():
                    candidate=(buf+' '+word).strip()
                    if d.textlength(candidate,font=ft)>maxw and buf:lines.append(buf);buf=word
                    else:buf=candidate
                lines.append(buf)
            lh=(size+5)*SCALE
            if len(lines)*lh<h-16*SCALE or size<=21:break
            size-=1
        if kind=='entity':
            title=raw[0];ftb=f(size,True);tw=d.textlength(title,font=ftb);d.text((x+(w-tw)/2,y+7*SCALE),title,font=ftb,fill='black')
            for j,text in enumerate(raw[1:]):d.text((x+14*SCALE,y+(63+j*(size+7))*SCALE),text,font=f(size),fill='black')
        else:
            sy=y+(h-len(lines)*lh)/2-4*SCALE
            if kind=='off':sy-=9*SCALE
            for j,text in enumerate(lines):
                tw=d.textlength(text,font=ft);d.text((x+(w-tw)/2,sy+j*lh),text,font=ft,fill='black')
    for e in p['edges']:
        if not e['label']:continue
        pos=e['labelpos']
        if pos is None:
            a,b=e['pts'][:2];pos=((a[0]+b[0])/2+28,(a[1]+b[1])/2-22)
        text=e['label'];ft=f(21 if p['name']=='dfd-context' else 23);parts=text.split('\n')
        maxwidth=(145 if p['name']=='dfd-context' else 280)*SCALE;wrapped=[]
        for part in parts:
            buf=''
            for word in part.split():
                candidate=(buf+' '+word).strip()
                if d.textlength(candidate,font=ft)>maxwidth and buf:wrapped.append(buf);buf=word
                else:buf=candidate
            wrapped.append(buf)
        width=max(d.textlength(t,font=ft) for t in wrapped);height=len(wrapped)*27*SCALE
        x,y=pos[0]*SCALE,pos[1]*SCALE;d.rectangle((x-width/2-5,y-height/2-3,x+width/2+5,y+height/2+3),fill='white')
        for j,t in enumerate(wrapped):d.text((x-d.textlength(t,font=ft)/2,y-height/2+j*27*SCALE),t,font=ft,fill='black')
    im.save(OUT/(p['name']+'.png'),dpi=(300,300))

root=ET.Element('mxfile',host='app.diagrams.net',type='device')
for p in PAGES:
    # Check all explicit paths are orthogonal and use existing nodes.
    ids={n['id'] for n in p['nodes']}
    for e in p['edges']:
        assert e['a'] in ids and e['b'] in ids
        assert all(a[0]==b[0] or a[1]==b[1] for a,b in zip(e['pts'],e['pts'][1:])),(p['name'],e)
    render(p)
    dia=ET.SubElement(root,'diagram',name=p['name'],id=p['name']);m=ET.SubElement(dia,'mxGraphModel',page='1',pageWidth=str(p['w']),pageHeight=str(p['h']))
    r=ET.SubElement(m,'root');ET.SubElement(r,'mxCell',id='0');ET.SubElement(r,'mxCell',id='1',parent='0')
    for n in p['nodes']:
        style={'terminal':'ellipse;','on':'ellipse;','off':'shape=offPageConnector;size=0.35;','decision':'rhombus;','input':'shape=parallelogram;','predefined':'shape=process;','plain':'strokeColor=none;fillColor=none;','dfd-process':'rounded=1;arcSize=15;','store':'shape=mxgraph.dfd.dataStoreID;'}.get(n['kind'],'rounded=0;')
        val=html.escape(n['text']).replace('\n','<br>')
        if n['kind']=='entity':val='<b>'+html.escape(n['text'].split('\n')[0])+'</b><hr>'+'<br>'.join(html.escape(t) for t in n['text'].split('\n')[1:])
        c=ET.SubElement(r,'mxCell',id=n['id'],value=val,vertex='1',parent='1',style='html=1;whiteSpace=wrap;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontFamily=Times New Roman;fontSize='+str(n['size'])+';'+style+('dashed=1;' if n['dashed'] else ''))
        ET.SubElement(c,'mxGeometry',x=str(n['x']),y=str(n['y']),width=str(n['w']),height=str(n['h']),attrib={'as':'geometry'})
    for i,e in enumerate(p['edges']):
        starts={'one':'ERone','many':'ERmany','optional-one':'ERzeroToOne','optional-many':'ERzeroToMany'}
        arr='endArrow=block;endFill=1;'
        if e['kind']=='relation':arr='startArrow='+starts[e['ends'][0]]+';endArrow='+starts[e['ends'][1]]+';startFill=0;endFill=0;'
        a=next(n for n in p['nodes'] if n['id']==e['a']);b=next(n for n in p['nodes'] if n['id']==e['b'])
        sx,sy=e['pts'][0];tx,ty=e['pts'][-1]
        ports=f'exitX={(sx-a["x"])/a["w"]};exitY={(sy-a["y"])/a["h"]};entryX={(tx-b["x"])/b["w"]};entryY={(ty-b["y"])/b["h"]};exitPerimeter=0;entryPerimeter=0;'
        c=ET.SubElement(r,'mxCell',id='edge'+str(i),value='' if e['labelpos'] else e['label'],edge='1',parent='1',source=e['a'],target=e['b'],style='edgeStyle=none;html=1;strokeWidth=2;fontFamily=Times New Roman;fontSize=23;labelBackgroundColor=#ffffff;'+ports+arr+('dashed=1;' if e['dashed'] else ''))
        # Fixed endpoints preserve the exact verified routing when first opened.
        g=ET.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
        for endpoint,role in [(e['pts'][0],'sourcePoint'),(e['pts'][-1],'targetPoint')]:ET.SubElement(g,'mxPoint',x=str(endpoint[0]),y=str(endpoint[1]),attrib={'as':role})
        a=ET.SubElement(g,'Array',attrib={'as':'points'})
        for x,y in e['pts'][1:-1]:ET.SubElement(a,'mxPoint',x=str(x),y=str(y))
        if e['labelpos'] and e['label']:
            lx,ly=e['labelpos'];lw=145 if p['name']=='dfd-context' else 280
            label=ET.SubElement(r,'mxCell',id='edgelabel'+str(i),value=e['label'],vertex='1',parent='1',style='text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=#ffffff;fontFamily=Times New Roman;fontSize=23;align=center;verticalAlign=middle;')
            ET.SubElement(label,'mxGeometry',x=str(lx-lw/2),y=str(ly-27),width=str(lw),height='54',attrib={'as':'geometry'})
# Include the two framework sources corresponding to the retained framework figures.
old=ET.parse(ROOT.parent/'docx-revision'/'revised-manuscript-diagrams.drawio').getroot()
for d in list(old):
    if d.get('name') in ['conceptual','agile']:root.append(d)
ET.indent(root);ET.ElementTree(root).write(ROOT/'CdM_LMS_Editable_Diagrams.drawio',encoding='utf-8',xml_declaration=True)
(ROOT/'diagram-spec.json').write_text(json.dumps(PAGES,indent=2),encoding='utf-8')
print('Rendered',len(PAGES),'editable diagram pages')
