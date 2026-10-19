from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math, textwrap, heapq, xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parent
ASSETS=ROOT/'figures';ASSETS.mkdir(exist_ok=True)
PAGES=[]
SCALE=2
def font(size,bold=False):return ImageFont.truetype(r'C:\Windows\Fonts\timesbd.ttf' if bold else r'C:\Windows\Fonts\times.ttf',round(size*SCALE))
def diagram(name,w=1100,h=1200):
    p={'name':name,'w':w,'h':h,'nodes':[],'edges':[]};PAGES.append(p);return p
def box(p,id,label,x,y,w,h,kind='process',dashed=False):p['nodes'].append(dict(id=id,label=label,x=x,y=y,w=w,h=h,kind=kind,dashed=dashed))
def arrow(p,s,t,points,label='',dashed=False):p['edges'].append(dict(s=s,t=t,points=points,label=label,dashed=dashed))
def flow(name,role,entry,modules):
    p=diagram(name,1100,1120+max(0,len(modules)-5)*100)
    box(p,'start','START',410,30,280,60,'terminal')
    box(p,'entry',entry,360,125,380,75)
    box(p,'auth','Credentials, active status,\nrole and scope valid?',380,235,340,130,'decision')
    box(p,'error','Show access error\nand allow retry',35,250,260,100)
    box(p,'dash',role+' Dashboard',365,400,370,65)
    box(p,'select','Select an authorized function',355,500,390,65)
    for s,t,pts in [('start','entry',[(550,90),(550,125)]),('entry','auth',[(550,200),(550,235)]),('auth','dash',[(550,365),(550,400)]),('dash','select',[(550,465),(550,500)])]:arrow(p,s,t,pts,'Yes' if s=='auth' else '')
    arrow(p,'auth','error',[(380,300),(295,300)],'No');arrow(p,'error','entry',[(165,250),(165,163),(360,163)],'Retry')
    for i,(label,action) in enumerate(modules):
        y=615+i*100
        box(p,'m'+str(i),label,270,y,280,80)
        box(p,'a'+str(i),action,610,y,365,80)
        arrow(p,'select','m'+str(i),[(355,532),(190,532),(190,y+40),(270,y+40)])
        arrow(p,'m'+str(i),'a'+str(i),[(550,y+40),(610,y+40)])
    more_y=615+len(modules)*100+20
    box(p,'more','Another action?',650,more_y,230,100,'decision')
    for i in range(len(modules)):
        y=655+i*100;arrow(p,'a'+str(i),'more',[(975,y),(1030,y),(1030,more_y+50),(880,more_y+50)])
    arrow(p,'more','dash',[(650,more_y+50),(60,more_y+50),(60,432),(365,432)],'Yes')
    box(p,'logout','Log out and end session',610,more_y+140,310,65)
    arrow(p,'more','logout',[(765,more_y+100),(765,more_y+140)],'No')
    p['h']=more_y+235
    return p

flow('student','Student','Open Student Web Portal\nSign in or register',[
 ('Courses and enrollment','Approved coursework; request access\nusing a valid join code'),
 ('Personal grades','Own grades and descriptive\nprogress information'),
 ('Personal workspace','Owned notes/tasks; authorized events\nand deadlines; private snapshots'),
 ('Study and progression','Flashcards, focus tools,\nEXP, achievements and rankings'),
 ('Collaboration and coding','Knowledge Exchange; authorized\nCodeLab and separate Git workflows')])
flow('instructor','Instructor','Open Web Portal\nEnter email and password',[
 ('Assigned courses','Materials, activities, announcements\nand approved course participation'),
 ('Grades and analytics','Dynamic Gradebook and\nrule-based attention indicators'),
 ('Enrollment requests','Approve or reject eligible\nrequests for assigned courses'),
 ('Schedules and calendar','Future timetable revisions\nand occurrence exceptions'),
 ('Faculty and coordination','ICS directory; Program Head\nevent publication where designated'),
 ('Coding and collaboration','CodeLab/Git review, moderation,\nrewards and owned study records')])
flow('administrator','Administrator','Launch native Administrator Console\nEnter email and password',[
 ('Accounts and roles','Status and permitted assignments;\nSuper User provisioning/revocation'),
 ('Academic configuration','Institute settings, faculty designations\nand authorized course operations'),
 ('Schedules and events','Authorized timetable, exceptions\nand shared-event management'),
 ('Activity and audit records','Review, filter and export\nsupported records'),
 ('Reports and continuity','Supported reporting, security,\nbackup and restoration workflows')])
flow('super-user','Super User','Open Web Portal\nAuthenticate and select institute',[
 ('Academic operations hub','Authorized institute summaries\nand faculty filters'),
 ('Faculty and leadership','ICS directory; narrowly permitted\nmembership/leadership assignments'),
 ('Timetable inspection','Selected-institute calendar\nand authorized faculty filters'),
 ('Course supervision','Safe course summaries; no identities,\ngrades, submissions or answers'),
 ('Shared and personal events','Authorized faculty announcements;\nowned notes/events and snapshots')])

p=diagram('enrollment',1100,1160)
box(p,'code','Enter course join code',380,30,340,70,'input')
box(p,'valid','Code, institute and\nrequest eligibility valid?',370,150,360,135,'decision')
box(p,'error','Show error or existing status\nDo not create a duplicate',35,165,270,105)
box(p,'pending','Save pending request\nShow pending status',380,345,340,85)
box(p,'review','Assigned instructor reviews request\nStudent may continue other tasks',355,520,390,100)
box(p,'decision','Recorded decision?',385,680,330,125,'decision')
box(p,'approved','APPROVED\nGrant course access',35,880,290,95)
box(p,'wait','PENDING\nNo course access yet',405,880,290,95)
box(p,'reject','REJECTED\nDo not grant access',775,880,290,95)
box(p,'return','Return to Student Dashboard',365,1050,370,70,'terminal')
arrow(p,'code','valid',[(550,100),(550,150)])
arrow(p,'valid','error',[(370,217),(305,217)],'No')
arrow(p,'error','code',[(170,165),(170,65),(380,65)],'Retry')
arrow(p,'valid','pending',[(550,285),(550,345)],'Yes')
arrow(p,'pending','review',[(550,430),(550,520)],'Later',True)
arrow(p,'pending','return',[(720,387),(1090,387),(1090,1085),(735,1085)],'Continue using LMS')
arrow(p,'review','decision',[(550,620),(550,680)])
for id,x,label in [('approved',180,'Approved'),('wait',550,'Pending'),('reject',920,'Rejected')]:
    pts=[(385,742),(180,742),(180,880)] if id=='approved' else ([(715,742),(920,742),(920,880)] if id=='reject' else [(550,805),(550,880)])
    arrow(p,'decision',id,pts,label)
    arrow(p,id,'return',[(x,975),(x,1020),(550,1020),(550,1050)])

p=diagram('conceptual',1100,1190)
box(p,'input','INPUT\n\nRelated literature\nAcademic workflows and concerns\nUser and role requirements\nDevices, clients and connectivity\nBackend, database and storage\nExecution and repository services',30,70,315,900)
box(p,'process','PROCESS\n\nAdapted Agile development\nPlanning / Design / Development\nTesting / Deployment / Review\n\nAcademic and study modules\nRole and platform boundaries\nCoordination and administration\n\nSelected quality evaluation\nFunctional Suitability\nInteraction Capability\nSecurity / Performance Efficiency\nReliability / Compatibility',395,70,315,900)
box(p,'output','OUTPUT\n\nDeveloped and evaluated\nCdM LMS release for ICS\n\nPrincipal Web Portal\nSelected mobile functions\nAdministrator Console\n\nDocumented supported behavior\nand evaluation findings',760,70,310,900)
box(p,'feedback','FEEDBACK\nDefects, task observations and evaluation findings refine requirements',250,1060,600,95)
arrow(p,'input','process',[(345,520),(395,520)])
arrow(p,'process','output',[(710,520),(760,520)])
arrow(p,'output','feedback',[(915,970),(915,1107),(850,1107)])
arrow(p,'feedback','input',[(250,1107),(185,1107),(185,970)])

p=diagram('agile',1100,650)
positions=[(40,50),(400,50),(760,50),(760,400),(400,400),(40,400)]
labels=['1 Planning\nRequirements and acceptance criteria','2 Design\nArchitecture, workflows and interfaces','3 Development\nImplement and connect increments','4 Testing\nVerify behavior and correct defects','5 Deployment\nPrepare controlled evaluation release','6 Review\nAssess results and update priorities']
for i,(x,y) in enumerate(positions):box(p,str(i),labels[i],x,y,300,165)
routes=[[(340,132),(400,132)],[(700,132),(760,132)],[(910,215),(910,400)],[(760,482),(700,482)],[(400,482),(340,482)],[(190,400),(190,215)]]
for i,pts in enumerate(routes):arrow(p,str(i),str((i+1)%6),pts)

p=diagram('dfd-context',1100,1040)
for id,label,x,y in [('student','Student',40,90),('instructor','Instructor',750,90),('super','Super User',40,680),('admin','Administrator\nNative Console',750,680)]:box(p,id,label,x,y,310,110)
box(p,'system','0\nCdM LMS\nAuthorized backend workflows',380,330,340,230,'terminal')
box(p,'providers','Repository and execution services\nAuthorized requests and results',320,865,460,105)
arrow(p,'student','system',[(195,200),(195,375),(380,375)],'Coursework / own records')
arrow(p,'system','student',[(380,430),(125,430),(125,200)],'Permitted results')
arrow(p,'instructor','system',[(905,200),(905,375),(720,375)],'Teaching requests')
arrow(p,'system','instructor',[(720,430),(980,430),(980,200)],'Course records')
arrow(p,'super','system',[(195,680),(195,510),(380,510)],'Coordination requests')
arrow(p,'system','super',[(380,555),(125,555),(125,680)],'Safe summaries')
arrow(p,'admin','system',[(905,680),(905,510),(720,510)],'Administrative requests')
arrow(p,'system','admin',[(720,555),(980,555),(980,680)],'Authorized results')
arrow(p,'system','providers',[(490,560),(490,865)],'Requests')
arrow(p,'providers','system',[(620,865),(620,560)],'Results')

p=diagram('dfd-level-one',1100,1400)
box(p,'actors','Role-appropriate client requests',100,20,950,80)
processes=[('auth','1 Authentication\nand authorization','users','D1 Users and Sessions'),('academic','2 Academic coursework\nand grade processing','courses','D2 Academic Records'),('study','3 Study, progression\nand collaboration','personal','D3 Study and Forum Records'),('coord','4 Academic coordination\nand calendar reads','schedule','D4 Coordination Records\nExisting + proposed schedule sources'),('admin','5 Administration\nand audit operations','audit','D5 Account and Audit Records')]
for i,(id,label,store,sl) in enumerate(processes):
 y=175+i*205
 box(p,id,label,100,y,385,135,'terminal')
 box(p,store,sl,690,y,360,135,'store',id=='coord')
 arrow(p,'actors',id,[(100,60),(45,60),(45,y+67),(100,y+67)])
 arrow(p,id,store,[(485,y+40),(690,y+40)],'Changes')
 arrow(p,store,id,[(690,y+98),(485,y+98)],'Records')
box(p,'note','Each process enforces its applicable authorization policy. D1–D5 are logical record groups.\nProjected classes and deadlines are outputs generated from their authorized source records.',100,1260,950,115)

def erd(name,entities,relations,h=1350):
 p=diagram(name,1100,h)
 for id,label,x,y in entities:box(p,id,label,x,y,300,160,'entity')
 by={n['id']:n for n in p['nodes']}
 for s,t,label in relations:
  a,b=by[s],by[t]
  if a['y']==b['y']:
   pts=[(a['x']+300,a['y']+80),(b['x'],b['y']+80)] if a['x']<b['x'] else [(a['x'],a['y']+80),(b['x']+300,b['y']+80)]
  else:
   ax=a['x']+150;bx=b['x']+150;ay=a['y']+160;byy=b['y'];mid=(ay+byy)/2
   pts=[(ax,ay),(ax,mid),(bx,mid),(bx,byy)]
  arrow(p,s,t,pts,label)
 return p

erd('erd-academic',[
 ('i','Institute\nPK id; unique code',400,20),
 ('u','User\nPK id; FK instituteId\nrole, isActive, email',45,280),
 ('c','Course\nPK id; FK instituteId\nFK instructorId (optional)',755,280),
 ('e','Enrollment\nPK id; FK courseId, studentId\nUnique course/student; status',400,530),
 ('s','SyllabusItem\nPK id; FK courseId\ntype, dueDate, maxPoints',755,780),
 ('session','Session\nPK id; FK userId\ntokenHash, expiresAt',45,530),
 ('policy','GradingPolicy\nPK id; unique FK courseId',400,780),
 ('submission','StudentSubmission\nPK id; FK syllabusItemId\nFK studentId; grade/status',45,1040),
 ('weights','CategoryWeight\nPK id; FK gradingPolicyId\ncategory, weightPercentage',400,1040)
],[('i','u','1 : many'),('i','c','1 : many'),('u','c','Instructor 1 : many'),('u','session','1 : many'),('u','e','Student 1 : many'),('c','e','1 : many'),('c','s','1 : many'),('c','policy','1 : 0..1'),('s','submission','1 : many'),('policy','weights','1 : many')])
erd('erd-study',[
 ('u','User\nPK id',400,20),
 ('note','Note\nPK id; FK creatorId, instituteId\ncontent, pinned, archived',45,280),
 ('task','TaskItem\nPK id; FK creatorId, instituteId\nOptional FK courseId',400,280),
 ('event','CalendarEvent\nPK id; FK creatorId, instituteId\nOptional FK courseId; eventDate',755,280),
 ('deck','FlashcardDeck\nPK id; FK creatorId\nOptional FK courseId',45,610),
 ('game','GamificationProfile\nPK id; unique FK userId\nEXP and progression records',400,610),
 ('study','StudySessionLog\nPK id; FK userId\nOptional course/item references',755,610),
 ('card','Flashcard\nPK id; FK deckId',45,960),
 ('exp','ExpTransaction\nPK id; FK userId',400,960),
 ('progress','FlashcardProgress\nPK id; FK userId, cardId',755,960)
],[('u','note','1 : many'),('u','task','1 : many'),('u','event','1 : many'),('u','deck','1 : many'),('u','game','1 : 0..1'),('u','study','1 : many'),('deck','card','1 : many'),('card','progress','1 : many'),('u','exp','1 : many')])
erd('erd-programming-forum',[
 ('u','User\nPK id; instituteId',400,20),
 ('post','KxPost\nPK id; FK authorId, instituteId\nOptional course/item references',45,280),
 ('activity','ActivityTemplate\nPK id; FK creatorId\nOptional FK courseId',400,280),
 ('repo','GithubRepoLink\nPK id; FK userId\nRepository link records',755,280),
 ('answer','KxAnswer\nPK id; FK postId, authorId\nOptional FK verifiedById',45,610),
 ('asub','ActivitySubmission\nPK id; FK templateId, studentId\nProgramming result records',400,610),
 ('gsub','GithubSubmission\nPK id; FK userId, syllabusItemId\nFK repoLinkId',755,610),
 ('comment','KxComment\nPK id; FK authorId\nPost/answer relationships',45,960),
 ('form','Form / FormAttempt\nCourse/item/creator relationships\nAttempt: FK studentId, formId',400,960),
 ('audit','AuditLog\nPK id; FK adminId, targetId\naction, metadata, createdAt',755,960)
],[('u','post','1 : many'),('u','activity','1 : many'),('u','repo','1 : many'),('post','answer','1 : many'),('activity','asub','1 : many'),('repo','gsub','1 : many'),('answer','comment','Linked comments')])

p=diagram('erd-proposed-coordination',1100,1130)
for id,label,x,y in [
 ('i','Institute\nProposed nullable deanId',400,20),
 ('u','User\nProposed facultyPrograms[]\nand nullable headProgram',45,270),
 ('c','Course\nProposed academicProgram\nand scheduleRevision',755,270),
 ('schedule','CourseSchedule (NEW)\ncourseId, instructorId, weekdays[]\nminutes, date bounds, room, zone',755,565),
 ('event','CalendarEvent (EXTEND)\nTime kind, intervals, audience\nsourceNoteId and version',400,565),
 ('note','Note (EXTEND)\nsourceEventId\nUnique creator/source pair',45,565),
 ('exception','CourseScheduleException (NEW)\nscheduleId, originalDate, kind\nreplacement start/end and room',755,865)]:box(p,id,label,x,y,300,165,'entity',True)
arrow(p,'i','u',[(550,185),(550,225),(195,225),(195,270)],'Institute membership')
arrow(p,'i','c',[(550,185),(550,225),(905,225),(905,270)],'1 : many')
arrow(p,'c','schedule',[(905,435),(905,565)],'1 : many revisions',True)
arrow(p,'schedule','exception',[(905,730),(905,865)],'1 : many exceptions',True)
arrow(p,'note','event',[(345,615),(400,615)],'One scheduled event per note',True)
arrow(p,'event','note',[(400,680),(345,680)],'One saved note per viewer/event',True)
box(p,'legend','Dashed boxes and lines describe the agreed target model.\nThey are not evidence that migration or implementation is complete.',45,890,650,140)

def route_erd(p):
 if not p['name'].startswith('erd-') or p['name']=='erd-proposed-coordination':return
 by={n['id']:n for n in p['nodes']};step=10
 for edge in p['edges']:
  a,b=by[edge['s']],by[edge['t']]
  if b['y']>a['y']:
   pa=(a['x']+a['w']/2,a['y']+a['h']);pb=(b['x']+b['w']/2,b['y']);sa=(pa[0],pa[1]+20);sb=(pb[0],pb[1]-20)
  elif b['x']>a['x']:
   pa=(a['x']+a['w'],a['y']+a['h']/2);pb=(b['x'],b['y']+b['h']/2);sa=(pa[0]+20,pa[1]);sb=(pb[0]-20,pb[1])
  else:
   pa=(a['x'],a['y']+a['h']/2);pb=(b['x']+b['w'],b['y']+b['h']/2);sa=(pa[0]-20,pa[1]);sb=(pb[0]+20,pb[1])
  start=(round(sa[0]/step),round(sa[1]/step));end=(round(sb[0]/step),round(sb[1]/step))
  def blocked(q):
   x,y=q[0]*step,q[1]*step
   return x<10 or y<5 or x>p['w']-10 or y>p['h']-10 or any(n['x']-10<x<n['x']+n['w']+10 and n['y']-10<y<n['y']+n['h']+10 for n in p['nodes'])
  heap=[(0,0,start)];came={};cost={start:0}
  while heap:
   _,g,q=heapq.heappop(heap)
   if q==end:break
   for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
    z=(q[0]+dx,q[1]+dy)
    if z not in (start,end) and blocked(z):continue
    ng=g+1
    if ng<cost.get(z,10**9):
     cost[z]=ng;came[z]=q;heapq.heappush(heap,(ng+abs(z[0]-end[0])+abs(z[1]-end[1]),ng,z))
  if end not in came:continue
  path=[end]
  while path[-1]!=start:path.append(came[path[-1]])
  raw=[pa]+[(x*step,y*step) for x,y in reversed(path)]+[pb]
  compact=[raw[0]]
  for i in range(1,len(raw)-1):
   prev=compact[-1];cur=raw[i];nxt=raw[i+1]
   if (prev[0]==cur[0]==nxt[0]) or (prev[1]==cur[1]==nxt[1]):continue
   compact.append(cur)
  compact.append(raw[-1]);edge['points']=compact
  edge['label']=edge['label'].replace('1 : many','1:M').replace('1 : 0..1','1:0..1').replace('Instructor 1:M','Instructor').replace('Student 1:M','Student')

def render(p):
 im=Image.new('RGB',(p['w']*SCALE,p['h']*SCALE),'white');d=ImageDraw.Draw(im)
 def points(ps):return [(round(x*SCALE),round(y*SCALE)) for x,y in ps]
 for e in p['edges']:
  ps=points(e['points'])
  if e['dashed']:
   for a,b in zip(ps,ps[1:]):
    length=math.dist(a,b)
    for dist in range(0,int(length),18):
     r=dist/max(length,1);r2=min((dist+10)/max(length,1),1)
     d.line([(a[0]+(b[0]-a[0])*r,a[1]+(b[1]-a[1])*r),(a[0]+(b[0]-a[0])*r2,a[1]+(b[1]-a[1])*r2)],fill='#444444',width=3)
  else:d.line(ps,fill='#444444',width=3)
  a,b=ps[-2:];ang=math.atan2(b[1]-a[1],b[0]-a[0]);tip=20
  d.polygon([b,(b[0]-tip*math.cos(ang-.45),b[1]-tip*math.sin(ang-.45)),(b[0]-tip*math.cos(ang+.45),b[1]-tip*math.sin(ang+.45))],fill='#444444')
 for n in p['nodes']:
  x,y,w,h=[round(n[k]*SCALE) for k in ['x','y','w','h']]
  if n['kind']=='terminal':d.ellipse((x,y,x+w,y+h),outline='black',width=3)
  elif n['kind']=='decision':d.polygon([(x+w/2,y),(x+w,y+h/2),(x+w/2,y+h),(x,y+h/2)],outline='black',fill='white',width=3)
  elif n['kind']=='input':d.polygon([(x+30,y),(x+w,y),(x+w-30,y+h),(x,y+h)],outline='black',fill='white',width=3)
  else:
   d.rectangle((x,y,x+w,y+h),fill='white',outline='black',width=3)
   if n['kind']=='store':d.line([(x,y+15),(x+w,y+15)],fill='black',width=2)
   if n['kind']=='entity':d.line([(x,y+80),(x+w,y+80)],fill='black',width=2)
   if n.get('dashed'):
    for xx in range(x,x+w,24):d.line([(xx,y),(min(xx+12,x+w),y)],fill='black',width=4)
  raw=n['label'].split('\n');size=25 if n['kind']=='entity' else (27 if p['name'] in ['conceptual','agile'] else 25)
  while True:
   f=font(size);lines=[]
   for line in raw:
    if not line:lines.append('');continue
    maxw=w-42;current=''
    for word in line.split():
     candidate=(current+' '+word).strip()
     if d.textlength(candidate,font=f)>maxw and current:lines.append(current);current=word
     else:current=candidate
    lines.append(current)
   lineh=size*SCALE+6
   if lineh*len(lines)<=h-26 or size<=18:break
   size-=1
  first=y+(h-lineh*len(lines))/2-5
  if n['kind']=='entity':
   # Entity headings occupy their own band; attributes begin below its rule.
   first=y+5;lineh=max(45,size*SCALE+4)
  for i,line in enumerate(lines):
   ff=font(size,True) if n['kind']=='entity' and i==0 else f
   yy=first+i*lineh
   if n['kind']=='entity' and i>0:yy=y+92+(i-1)*lineh
   tw=d.textlength(line,font=ff);d.text((x+(w-tw)/2,yy),line,font=ff,fill='black')
 for e in p['edges']:
  if not e['label']:continue
  segments=list(zip(e['points'],e['points'][1:]));a,b=max(segments,key=lambda s:math.dist(s[0],s[1])) if p['name'].startswith('erd-') else segments[0]
  f=font(18 if p['name'].startswith('erd-') else 21);tw=d.textlength(e['label'],font=f)
  candidates=[]
  for frac in [.5,.3,.7,.15,.85]:
   xx=(a[0]+(b[0]-a[0])*frac)*SCALE;yy=(a[1]+(b[1]-a[1])*frac)*SCALE
   for side in [1,-1]:
    if a[0]==b[0]:candidates.append((xx+side*(tw/2+15),yy-20))
    else:candidates.append((xx,yy-50 if side==1 else yy+8))
  def safe(pos):
   xx,yy=pos;rect=(xx-tw/2-5,yy-4,xx+tw/2+5,yy+45)
   if rect[0]<5 or rect[2]>p['w']*SCALE-5 or rect[1]<5 or rect[3]>p['h']*SCALE-5:return False
   return not any(rect[0]<(n['x']+n['w'])*SCALE+3 and rect[2]>n['x']*SCALE-3 and rect[1]<(n['y']+n['h'])*SCALE+3 and rect[3]>n['y']*SCALE-3 for n in p['nodes'])
  pos=next((z for z in candidates if safe(z)),None)
  if pos:
   x,y=pos;d.rectangle((x-tw/2-5,y-4,x+tw/2+5,y+45),fill='white');d.text((x-tw/2,y),e['label'],font=f,fill='black')
 im.save(ASSETS/(p['name']+'.png'),dpi=(300,300))

root=ET.Element('mxfile',host='app.diagrams.net',type='device')
for p in PAGES:
 route_erd(p);render(p)
 dia=ET.SubElement(root,'diagram',name=p['name'],id=p['name']);m=ET.SubElement(dia,'mxGraphModel',page='1',pageWidth=str(p['w']),pageHeight=str(p['h']))
 r=ET.SubElement(m,'root');ET.SubElement(r,'mxCell',id='0');ET.SubElement(r,'mxCell',id='1',parent='0')
 for n in p['nodes']:
  shape={'terminal':'ellipse;','decision':'rhombus;','input':'shape=parallelogram;','entity':'rounded=0;'}.get(n['kind'],'rounded=0;')
  c=ET.SubElement(r,'mxCell',id=n['id'],value=n['label'].replace('\n','<br>'),vertex='1',parent='1',style=shape+'html=1;whiteSpace=wrap;fillColor=#ffffff;strokeColor=#000000;fontFamily=Times New Roman;fontSize=25;'+('dashed=1;' if n.get('dashed') else ''))
  ET.SubElement(c,'mxGeometry',x=str(n['x']),y=str(n['y']),width=str(n['w']),height=str(n['h']),attrib={'as':'geometry'})
 for i,e in enumerate(p['edges']):
  c=ET.SubElement(r,'mxCell',id='edge'+str(i),value=e['label'],edge='1',parent='1',source=e['s'],target=e['t'],style='edgeStyle=none;html=1;endArrow=block;endFill=1;fontFamily=Times New Roman;fontSize=21;labelBackgroundColor=#ffffff;'+('dashed=1;' if e['dashed'] else ''))
  g=ET.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'});a=ET.SubElement(g,'Array',attrib={'as':'points'})
  for x,y in e['points'][1:-1]:ET.SubElement(a,'mxPoint',x=str(x),y=str(y))
ET.indent(root);ET.ElementTree(root).write(ROOT/'revised-manuscript-diagrams.drawio',encoding='utf-8',xml_declaration=True)
print('Generated',len(PAGES),'manuscript figures and editable diagram pages.')
