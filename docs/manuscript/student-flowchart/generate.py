"""Generate editable diagrams.net pages and matching SVG previews."""
from pathlib import Path
from html import escape
import xml.etree.ElementTree as ET

OUT = Path(__file__).resolve().parent
PAGES = []

def page(name, filename, width, height, subtitle):
    p = dict(name=name, filename=filename, width=width, height=height,
             subtitle=subtitle, nodes=[], edges=[])
    PAGES.append(p)
    return p

def node(p, ident, label, x, y, w, h, kind="process"):
    p["nodes"].append(dict(id=ident, label=label, x=x, y=y, w=w, h=h, kind=kind))

def edge(p, source, target, points, label="", label_at=None, dashed=False):
    p["edges"].append(dict(source=source, target=target, points=points,
                           label=label, label_at=label_at, dashed=dashed))

p = page("1 - Student overview", "student-overview", 1100, 1710,
         "Web Portal overview. Mobile access follows the evaluated client coverage.")
node(p,"start","START",390,80,220,50,"terminal")
node(p,"open","Open Student Web Portal",350,170,300,65)
node(p,"auth","Authenticate Student\nSee Account Access page",350,275,300,75,"subroutine")
node(p,"dashboard","Student Dashboard",350,395,300,65)
node(p,"select","Select One Authorized Module",350,500,300,65)
edge(p,"start","open",[(500,130),(500,170)])
edge(p,"open","auth",[(500,235),(500,275)])
edge(p,"auth","dashboard",[(500,350),(500,395)])
edge(p,"dashboard","select",[(500,460),(500,500)])
modules = [
 ("courses","My Courses / Coursework","Approved courses, materials,\nannouncements, activities,\nand permitted submissions"),
 ("join","Join Course","Submit enrollment request\nSee Enrollment page"),
 ("grades","Personal Grades","View own grades and\ndescriptive progress summaries"),
 ("workspace","Personal Workspace","Owned notes and tasks;\nauthorized events and deadlines;\nprivate note-event snapshots"),
 ("study","Flashcards / Study Tools","Create and review cards;\nuse enabled focus timers\nand study-session tracking"),
 ("rewards","Gamification","EXP, levels, achievements,\nbadges, streaks, and rankings"),
 ("exchange","Knowledge Exchange","Questions, answers, resources,\nfaculty-verified answers,\nand forum reputation"),
 ("coding","Programming Coursework","Authorized CodeLab activities\nor Git repository submissions\nthrough separate workflows"),
]
for i,(ident,title,operation) in enumerate(modules):
    y=625+i*95
    node(p,ident,title,280,y,260,70)
    node(p,ident+"_action",operation,585,y,345,70)
    edge(p,"select",ident,[(350,532.5),(180,532.5),(180,y+35),(280,y+35)])
    edge(p,ident,ident+"_action",[(540,y+35),(585,y+35)])
    edge(p,ident+"_action","more",[(930,y+35),(1010,y+35),(1010,1440),(875,1440)])
node(p,"more","Another Action?",645,1390,230,100,"decision")
node(p,"logout","Log Out / End Session",620,1530,280,60)
node(p,"end","END",655,1630,210,50,"terminal")
edge(p,"more","dashboard",[(645,1440),(65,1440),(65,427.5),(350,427.5)],"Yes",(605,1422))
edge(p,"more","logout",[(760,1490),(760,1530)],"No",(787,1510))
edge(p,"logout","end",[(760,1590),(760,1630)])

p = page("2 - Account access", "student-account-access", 1320, 1230,
         "Login, registration, validation, and student session creation.")
node(p,"start","START",280,80,160,50,"terminal")
node(p,"portal","Open Web Portal",220,170,280,60)
node(p,"institute","Select Institute Portal",220,270,280,60,"input")
node(p,"account","Already Have\nan Account?",220,370,280,130,"decision")
node(p,"credentials","Enter Email\nand Password",220,550,280,80,"input")
node(p,"valid","Credentials, Active Account,\nStudent Role, and Institute\nAccess Valid?",190,690,340,160,"decision")
node(p,"error","Show Access Error",220,900,280,65)
node(p,"session","Create Student\nSession",550,900,230,65)
node(p,"dashboard","Open Student\nDashboard",550,1010,230,65)
node(p,"end","ACCESS COMPLETE",550,1130,230,50,"terminal")
node(p,"registration","Complete Student\nRegistration Form",860,500,280,90,"input")
node(p,"regvalid","Registration Details\nValid and Email Available?",845,650,310,150,"decision")
node(p,"regerror","Show Registration\nValidation Error",1155,865,145,100)
node(p,"create","Create Student Account\nand Show Confirmation",860,1030,280,85)
edge(p,"start","portal",[(360,130),(360,170)])
edge(p,"portal","institute",[(360,230),(360,270)])
edge(p,"institute","account",[(360,330),(360,370)])
edge(p,"account","credentials",[(360,500),(360,550)],"Yes",(388,526))
edge(p,"account","registration",[(500,435),(1000,435),(1000,500)],"No",(560,418))
edge(p,"credentials","valid",[(360,630),(360,690)])
edge(p,"valid","error",[(360,850),(360,900)],"No",(386,877))
edge(p,"error","credentials",[(220,932.5),(70,932.5),(70,590),(220,590)],"Retry",(118,574))
edge(p,"valid","session",[(530,770),(665,770),(665,900)],"Yes",(580,752))
edge(p,"session","dashboard",[(665,965),(665,1010)])
edge(p,"dashboard","end",[(665,1075),(665,1130)])
edge(p,"registration","regvalid",[(1000,590),(1000,650)])
edge(p,"regvalid","regerror",[(1155,725),(1227.5,725),(1227.5,865)],"No",(1192,707))
edge(p,"regerror","registration",[(1227.5,965),(1285,965),(1285,545),(1140,545)],"Retry",(1201,527))
edge(p,"regvalid","create",[(1000,800),(1000,1030)],"Yes",(1027,914))
edge(p,"create","credentials",[(860,1072.5),(810,1072.5),(810,590),(500,590)],"Return to Login",(678,573))

p = page("3 - Course enrollment", "student-course-enrollment", 1120, 1600,
         "A valid join code creates a pending request, not immediate course access.")
node(p,"start","Student Selects Join Course",390,80,300,60,"terminal")
node(p,"code","Enter Course Join Code",390,185,300,65,"input")
node(p,"valid","Code Valid and Course\nin Authorized Institute?",370,300,340,145,"decision")
node(p,"invalid","Show Invalid Code /\nInstitute Error",50,300,250,90)
node(p,"existing","Existing Approved or\nPending Enrollment?",370,500,340,145,"decision")
node(p,"status","Show Existing Status;\nDo Not Create Duplicate",790,510,280,90)
node(p,"request","Save Pending\nEnrollment Request",390,705,300,75)
node(p,"pending","Show Pending Status;\nCourse Access Not Granted",390,830,300,75)
node(p,"review","Assigned Instructor\nReviews Request",390,990,300,75)
node(p,"decision","Recorded Request Status?",370,1120,340,130,"decision")
node(p,"approved","APPROVED\nCourse Access Granted",50,1310,280,80)
node(p,"rejected","REJECTED\nCourse Access Not Granted",780,1310,280,80)
node(p,"waiting","PENDING\nAwait Instructor Decision",390,1310,300,80)
node(p,"return","Return to Student Dashboard",390,1490,300,65,"terminal")
edge(p,"start","code",[(540,140),(540,185)])
edge(p,"code","valid",[(540,250),(540,300)])
edge(p,"valid","invalid",[(370,372.5),(300,372.5)],"No",(333,354))
edge(p,"invalid","code",[(175,300),(175,217.5),(390,217.5)],"Retry",(266,201))
edge(p,"valid","existing",[(540,445),(540,500)],"Yes",(568,473))
edge(p,"existing","status",[(710,572.5),(790,572.5)],"Yes",(750,555))
edge(p,"status","return",[(930,600),(1090,600),(1090,1522.5),(690,1522.5)])
edge(p,"existing","request",[(540,645),(540,705)],"No",(567,676))
edge(p,"request","pending",[(540,780),(540,830)])
edge(p,"pending","return",[(690,867.5),(735,867.5),(735,1470),(540,1470),(540,1490)],"Continue Using LMS",(878,914))
edge(p,"pending","review",[(540,905),(540,990)],"Later",(573,950),True)
edge(p,"review","decision",[(540,1065),(540,1120)])
edge(p,"decision","approved",[(370,1185),(190,1185),(190,1310)],"Approved",(244,1167))
edge(p,"decision","rejected",[(710,1185),(920,1185),(920,1310)],"Rejected",(811,1167))
edge(p,"decision","waiting",[(540,1250),(540,1310)],"Pending",(591,1282))
edge(p,"approved","return",[(190,1390),(190,1522.5),(390,1522.5)])
edge(p,"rejected","return",[(920,1390),(920,1450),(590,1450),(590,1490)])
edge(p,"waiting","return",[(540,1390),(540,1490)])

def svg_node(n):
    x,y,w,h=n['x'],n['y'],n['w'],n['h']; k=n['kind']
    common='fill="white" stroke="#263238" stroke-width="1.8"'
    if k=='terminal': shape=f'<ellipse cx="{x+w/2}" cy="{y+h/2}" rx="{w/2}" ry="{h/2}" {common}/>'
    elif k=='decision': shape=f'<polygon points="{x+w/2},{y} {x+w},{y+h/2} {x+w/2},{y+h} {x},{y+h/2}" {common}/>'
    elif k=='input': shape=f'<polygon points="{x+18},{y} {x+w},{y} {x+w-18},{y+h} {x},{y+h}" {common}/>'
    else:
        shape=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" {common}/>'
        if k=='subroutine':
            shape+=f'<path d="M {x+12} {y} V {y+h} M {x+w-12} {y} V {y+h}" stroke="#263238" fill="none" stroke-width="1.8"/>'
    lines=n['label'].split('\n'); font=17 if len(lines)>2 or w<180 else 18
    first=y+h/2-(len(lines)-1)*12+6
    txt=''.join(f'<text x="{x+w/2}" y="{first+i*24}" text-anchor="middle" font-size="{font}">{escape(s)}</text>' for i,s in enumerate(lines))
    return shape+txt

root=ET.Element('mxfile',host='app.diagrams.net',type='device',version='24.7.17')
styles=dict(process='rounded=0;whiteSpace=wrap;html=1;',terminal='ellipse;whiteSpace=wrap;html=1;',
            decision='rhombus;whiteSpace=wrap;html=1;',input='shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;',
            subroutine='shape=process;whiteSpace=wrap;html=1;')
for p in PAGES:
    diagram=ET.SubElement(root,'diagram',id=p['filename'],name=p['name'])
    model=ET.SubElement(diagram,'mxGraphModel',dx='1100',dy='1700',grid='1',gridSize='10',guides='1',tooltips='1',connect='1',arrows='1',fold='1',page='1',pageScale='1',pageWidth=str(p['width']),pageHeight=str(p['height']),math='0',shadow='0')
    mr=ET.SubElement(model,'root');ET.SubElement(mr,'mxCell',id='0');ET.SubElement(mr,'mxCell',id='1',parent='0')
    for ident,txt,y,font in [('title','STUDENT VIEW - '+p['name'].split(' - ',1)[1].upper(),14,25),('subtitle',p['subtitle'],47,16)]:
        cell=ET.SubElement(mr,'mxCell',id=ident,value=txt,style=f'text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize={font};fontFamily=Arial;fontColor=#263238;',vertex='1',parent='1')
        ET.SubElement(cell,'mxGeometry',x='10',y=str(y),width=str(p['width']-20),height='25',attrib={'as':'geometry'})
    for n in p['nodes']:
        cell=ET.SubElement(mr,'mxCell',id=n['id'],value=escape(n['label']).replace('\n','<br>'),style=styles[n['kind']]+'fillColor=#ffffff;strokeColor=#263238;strokeWidth=1.8;fontSize=18;fontFamily=Arial;fontColor=#172027;align=center;verticalAlign=middle;',vertex='1',parent='1')
        ET.SubElement(cell,'mxGeometry',x=str(n['x']),y=str(n['y']),width=str(n['w']),height=str(n['h']),attrib={'as':'geometry'})
    node_map={n['id']:n for n in p['nodes']}
    for i,e in enumerate(p['edges']):
        style='edgeStyle=none;rounded=0;html=1;endArrow=block;endFill=1;strokeColor=#52616b;strokeWidth=1.5;fontSize=16;fontFamily=Arial;labelBackgroundColor=#ffffff;'
        for prefix,ident,point in [('exit',e['source'],e['points'][0]),('entry',e['target'],e['points'][-1])]:
            n=node_map[ident]
            style+=f'{prefix}X={(point[0]-n["x"])/n["w"]};{prefix}Y={(point[1]-n["y"])/n["h"]};{prefix}Dx=0;{prefix}Dy=0;'
        if e['dashed']:style+='dashed=1;'
        cell=ET.SubElement(mr,'mxCell',id='edge'+str(i),value=e['label'],style=style,edge='1',parent='1',source=e['source'],target=e['target'])
        geo=ET.SubElement(cell,'mxGeometry',relative='1',attrib={'as':'geometry'})
        arr=ET.SubElement(geo,'Array',attrib={'as':'points'})
        for x,y in e['points'][1:-1]: ET.SubElement(arr,'mxPoint',x=str(x),y=str(y))
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{p["width"]}" height="{p["height"]}" viewBox="0 0 {p["width"]} {p["height"]}">',
         '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#52616b"/></marker></defs>',
         '<rect width="100%" height="100%" fill="white"/>',
         '<g font-family="Arial, Helvetica, sans-serif" fill="#172027">',
         f'<text x="{p["width"]/2}" y="33" text-anchor="middle" font-size="25" font-weight="bold">STUDENT VIEW - {escape(p["name"].split(" - ",1)[1].upper())}</text>',
         f'<text x="{p["width"]/2}" y="59" text-anchor="middle" font-size="16" fill="#52616b">{escape(p["subtitle"])}</text>']
    for e in p['edges']:
        pts=' '.join(f'{x},{y}' for x,y in e['points'])
        dash=' stroke-dasharray="7 5"' if e['dashed'] else ''
        svg.append(f'<polyline points="{pts}" fill="none" stroke="#52616b" stroke-width="1.5" marker-end="url(#arrow)"{dash}/>')
    for n in p['nodes']:svg.append(svg_node(n))
    for e in p['edges']:
        if e['label'] and e['label_at']:
            x,y=e['label_at'];w=len(e['label'])*8+12
            svg.append(f'<rect x="{x-w/2}" y="{y-16}" width="{w}" height="21" fill="white"/><text x="{x}" y="{y}" text-anchor="middle" font-size="16">{escape(e["label"])}</text>')
    svg.append('</g></svg>')
    (OUT/(p['filename']+'.svg')).write_text('\n'.join(svg),encoding='utf-8')
ET.indent(root)
ET.ElementTree(root).write(OUT/'student-view.drawio',encoding='utf-8',xml_declaration=True)
print('Created one editable diagrams.net file with three pages and three SVG previews.')
