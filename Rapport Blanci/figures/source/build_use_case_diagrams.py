"""Render selected user goals; associations do not assert runtime validation."""
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Ellipse, Circle

OUTPUT=Path(__file__).resolve().parents[1]
INK, BLUE, PALE='#303841','#335f7e','#f0f5f8'
plt.rcParams.update({'font.family':'DejaVu Sans','svg.fonttype':'none'})
manifest={}


def canvas(height):
    fig,ax=plt.subplots(figsize=(8,height*2/3))
    fig.subplots_adjust(left=0,right=1,bottom=0,top=1)
    fig.patch.set_facecolor('white')
    ax.set(xlim=(0,12),ylim=(0,height)); ax.axis('off')
    return fig,ax


def boundary(ax,x,y,w,h,title):
    ax.add_patch(Rectangle((x,y),w,h,facecolor='none',edgecolor=BLUE,lw=.8,zorder=0))
    ax.text(x+.18,y+h,title,ha='left',va='center',fontsize=11,color=BLUE,
            bbox=dict(facecolor='white',edgecolor='none',pad=3),zorder=5)


def actor(ax,x,y,name):
    ax.add_patch(Circle((x,y+.46),.13,facecolor='white',edgecolor=INK,lw=.85,zorder=4))
    for points in [[(x,y+.33),(x,y-.15)],[(x-.26,y+.12),(x+.26,y+.12)],
                   [(x-.23,y-.5),(x,y-.15),(x+.23,y-.5)]]:
        ax.plot(*zip(*points),color=INK,lw=.85,zorder=4)
    ax.text(x,y-.73,name,ha='center',va='center',fontsize=10.5,color=INK,zorder=5)
    return {'x':x,'y':y,'name':name}


def goal(ax,key,x,y,label,w=3.1,h=.72):
    ax.add_patch(Ellipse((x,y),w,h,facecolor=PALE,edgecolor=BLUE,lw=.8,zorder=3))
    ax.text(x,y,label,ha='center',va='center',fontsize=10.4,color=INK,linespacing=1.25,zorder=5)
    return {'key':key,'label':label.replace('\n',' '),'x':x,'y':y,'w':w,'h':h}


def path(ax,points):
    ax.plot(*zip(*points),color=INK,lw=.7,zorder=1)


def associate(ax,a,g,side):
    if side=='left':
        points=[(a['x']+.26,a['y']+.12),(g['x']-g['w']/2,g['y'])]
    else:
        points=[(a['x']-.26,a['y']+.12),(g['x']+g['w']/2,g['y'])]
    path(ax,points)
    return [a['name'],g['key']]


def save(fig,name,actors,goals,links):
    ids={g['key'] for g in goals}
    assert len(ids)==len(goals)
    assert all(a in actors and g in ids for a,g in links)
    assert all(any(g['key']==target for _,target in links) for g in goals)
    manifest[name]={'actors':actors,'goals':goals,'associations':links}
    for ext in ['png','svg']:
        fig.savefig(OUTPUT/f'{name}.{ext}',dpi=300,facecolor='white')
    plt.close(fig)


# Global overview: deliberately broader goal groups than the sprint views.
fig,ax=canvas(10)
boundary(ax,2.2,.6,7.6,8.7,'GoFit — principal user goals')
c=actor(ax,.9,5.9,'Client'); k=actor(ax,11.1,5.9,'Coach'); a=actor(ax,11.1,1.6,'Administrator')
auth=goal(ax,'sign_in',6,8.6,'Sign in',w=3.0)
goals=[auth]; links=[]
for key,y,label in [('profile',7.1,'Manage fitness profile'),('workouts',5.7,'Plan and execute\nworkouts'),
                    ('tracking',4.3,'Track progress\nand nutrition'),('coaching_client',2.9,'Use coaching services')]:
    g=goal(ax,key,4.2,y,label); goals.append(g); links.append(associate(ax,c,g,'left'))
for key,y,label in [('coach_profile',7.1,'Manage coaching profile'),('clients_programs',5.7,'Manage clients\nand programs'),
                    ('coaching_coach',4.3,'Deliver coaching services')]:
    g=goal(ax,key,7.8,y,label); goals.append(g); links.append(associate(ax,k,g,'right'))
for key,y,label in [('accounts_approvals',2.9,'Manage accounts\nand coach approvals'),
                    ('catalogs_reports',1.5,'Maintain catalogs\nand review reports')]:
    g=goal(ax,key,7.8,y,label); goals.append(g); links.append(associate(ax,a,g,'right'))
path(ax,[(.9,6.49),(.9,8.6),(4.5,8.6)])
path(ax,[(11.1,6.49),(11.1,8.6),(7.5,8.6)])
path(ax,[(11.36,1.72),(11.75,1.72),(11.75,9.65),(6,9.65),(6,8.96)])
links.extend([['Client','sign_in'],['Coach','sign_in'],['Administrator','sign_in']])
save(fig,'global_use_case',['Client','Coach','Administrator'],goals,links)


# One actor and one column keep the detailed mobile goals legible.
mobile_views=[
    ('use_case_sprint1',9.8,'GoFit — selected Sprint 1 goals',[
        ('register_sign_in','Register / sign in'),('onboarding','Complete client onboarding'),
        ('profile','Manage fitness profile'),('browse_workouts','Browse workouts'),
        ('create_workout','Create custom workouts'),('execute_workout','Execute workout sessions'),
        ('timer_preferences','Configure the rest timer')]),
    ('use_case_sprint2',10.5,'GoFit — selected Sprint 2 goals',[
        ('exercise_library','Browse exercise library'),('progress','Review fitness progress'),
        ('measurements','Obtain and review\nmeasurement drafts'),('nutrition','Log meals and set targets'),
        ('barcode','Find food by barcode'),('dietary_preferences','Manage dietary preferences'),
        ('recommendations','Request workout recommendations'),('reminders','Configure reminders')])]
for name,height,title,items in mobile_views:
    fig,ax=canvas(height); boundary(ax,2.2,.6,9.0,height-1.2,title)
    a=actor(ax,.9,height/2,'Client'); goals=[]; links=[]
    top=height-1.5; bottom=1.5
    for i,(key,label) in enumerate(items):
        y=top-i*(top-bottom)/(len(items)-1)
        g=goal(ax,key,6.7,y,label,w=4.7,h=.76)
        goals.append(g); links.append(associate(ax,a,g,'left'))
    save(fig,name,['Client'],goals,links)


# Sprint 3 uses two complementary views of the same platform boundary.
fig,ax=canvas(12.5)
boundary(ax,2.2,4.1,7.6,7.8,'GoFit — client and coach activities')
c=actor(ax,.9,8.7,'Client'); k=actor(ax,11.1,8.7,'Coach')
goals=[]; links=[]
for key,y,label in [('messaging',11.1,'Exchange messages'),('video',9.85,'Participate in video calls')]:
    g=goal(ax,key,6,y,label,w=3.2,h=.72); goals.append(g)
    links.extend([associate(ax,c,g,'left'),associate(ax,k,g,'right')])
client_items=[('discover','Discover coaches'),('purchase','Purchase session packs'),('book','Book coaching sessions'),
              ('assigned_programs','View assigned programs'),('submit_checkins','Submit check-ins')]
for i,(key,label) in enumerate(client_items):
    g=goal(ax,key,4.2,8.3-i*.93,label,w=3.2,h=.64)
    goals.append(g); links.append(associate(ax,c,g,'left'))
coach_items=[('coach_profile','Complete coach profile'),('availability','Manage availability'),
             ('packs','Manage session packs'),('clients_programs','Manage clients / programs'),
             ('review_checkins','Review client check-ins'),('ai_briefing','Request / read AI briefing')]
for i,(key,label) in enumerate(coach_items):
    g=goal(ax,key,7.8,8.3-i*.75,label,w=3.2,h=.61)
    goals.append(g); links.append(associate(ax,k,g,'right'))
boundary(ax,2.2,.2,7.6,3.4,'GoFit — administration')
a=actor(ax,.9,1.9,'Administrator')
for key,y,label in [('accounts',3.1,'Manage user accounts'),('approve_coaches',2.3,'Approve coach profiles'),
                    ('catalogs',1.5,'Maintain exercise / workout catalogs'),('reports',.7,'Review platform reports')]:
    g=goal(ax,key,6,y,label,w=5.0,h=.6)
    goals.append(g); links.append(associate(ax,a,g,'left'))
assert ['Client','ai_briefing'] not in links
assert ['Coach','ai_briefing'] in links
assert all([role,key] in links for role in ['Client','Coach'] for key in ['messaging','video'])
save(fig,'use_case_sprint3',['Client','Coach','Administrator'],goals,links)

(OUTPUT/'source/use-case-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
