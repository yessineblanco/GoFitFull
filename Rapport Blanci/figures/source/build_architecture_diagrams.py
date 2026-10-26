"""Technical architecture drawings. Explanations and qualifications remain in main.tex."""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Ellipse, Arc, Circle, Polygon, FancyArrowPatch, FancyBboxPatch

OUTPUT = Path(__file__).resolve().parents[1]
INK, BLUE, PALE, MUTED = '#2c3641', '#335f7e', '#f0f5f8', '#58636d'
plt.rcParams.update({'font.family':'DejaVu Sans', 'svg.fonttype':'none'})


def canvas(height):
    fig, ax = plt.subplots(figsize=(12,height))
    fig.subplots_adjust(left=0,right=1,bottom=0,top=1)
    fig.patch.set_facecolor('white')
    ax.set(xlim=(0,12),ylim=(0,height))
    ax.axis('off')
    return fig, ax


def text(ax,x,y,label,size=10,ha='center',color=INK,weight='normal'):
    ax.text(x,y,label,ha=ha,va='center',fontsize=size,color=color,
            fontweight=weight,linespacing=1.45,zorder=8)


def line(ax,points,color=INK,dashed=False):
    ax.plot(*zip(*points),color=color,lw=.85,linestyle=(0,(4,3)) if dashed else '-',zorder=4)


def arrow(ax,points,label=None,at=None,color=INK,dashed=False):
    if len(points)>2:
        line(ax,points[:-1],color,dashed)
    ax.add_patch(FancyArrowPatch(points[-2],points[-1],arrowstyle='->',
        mutation_scale=10,color=color,lw=.85,linestyle='--' if dashed else '-',zorder=4))
    if label:
        ax.text(*at,label,ha='center',va='center',fontsize=8.5,color=MUTED,
                    bbox=dict(facecolor='white',edgecolor='none',pad=2),zorder=9)


def block(ax,x,y,w,h,label,fill='white',color=INK,size=10):
    ax.add_patch(Rectangle((x,y),w,h,facecolor=fill,edgecolor=color,lw=.85,zorder=3))
    text(ax,x+w/2,y+h/2,label,size,color=color)


def boundary(ax,x,y,w,h,title):
    ax.add_patch(Rectangle((x,y),w,h,facecolor='none',edgecolor=BLUE,lw=.9,zorder=0))
    ax.text(x+.2,y+h,title,ha='left',va='center',fontsize=11,color=BLUE,
            bbox=dict(facecolor='white',edgecolor='none',pad=4),zorder=8)


def database(ax,x,y,w,h,label):
    cap=.22
    ax.add_patch(Rectangle((x,y+cap/2),w,h-cap,facecolor=PALE,edgecolor='none',zorder=3))
    ax.add_patch(Ellipse((x+w/2,y+cap/2),w,cap,facecolor=PALE,edgecolor=BLUE,lw=.85,zorder=3))
    line(ax,[(x,y+cap/2),(x,y+h-cap/2)],BLUE)
    line(ax,[(x+w,y+cap/2),(x+w,y+h-cap/2)],BLUE)
    ax.add_patch(Ellipse((x+w/2,y+h-cap/2),w,cap,facecolor=PALE,edgecolor=BLUE,lw=.85,zorder=5))
    text(ax,x+w/2,y+h/2-.03,label,9.3,color=BLUE)


def phone(ax,x,y,w,h):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0,rounding_size=.13',
                    facecolor='white',edgecolor=INK,lw=1,zorder=3))
    ax.add_patch(Rectangle((x+.12,y+.23),w-.24,h-.48,facecolor='white',edgecolor=INK,lw=.65,zorder=4))
    line(ax,[(x+w*.4,y+h-.12),(x+w*.6,y+h-.12)])
    ax.add_patch(Circle((x+w/2,y+.1),.035,facecolor='none',edgecolor=INK,lw=.65,zorder=4))
    text(ax,x+w/2,y+h/2,'GoFit mobile\nReact Native / Expo',9.5)


def monitor(ax,x,y,w,h):
    block(ax,x,y,w,h,'Admin browser')
    line(ax,[(x+w/2,y),(x+w/2,y-.22)])
    line(ax,[(x+w*.3,y-.22),(x+w*.7,y-.22)])


def component(ax,x,y,w,h,label):
    block(ax,x,y,w,h,label,size=9.5)
    for offset in [.19,.41]:
        ax.add_patch(Rectangle((x-.07,y+h-offset-.12),.2,.12,
                        facecolor='white',edgecolor=INK,lw=.7,zorder=6))


def node(ax,x,y,w,h,title):
    d=.15
    ax.add_patch(Polygon([(x,y+h),(x+d,y+h+d),(x+w+d,y+h+d),(x+w,y+h)],
                        facecolor=PALE,edgecolor=BLUE,lw=.85,zorder=2))
    ax.add_patch(Polygon([(x+w,y),(x+w+d,y+d),(x+w+d,y+h+d),(x+w,y+h)],
                        facecolor=PALE,edgecolor=BLUE,lw=.85,zorder=2))
    ax.add_patch(Rectangle((x,y),w,h,facecolor='white',edgecolor=BLUE,lw=.85,zorder=3))
    text(ax,x+w/2,y+h-.3,title,10.5,color=BLUE,weight='bold')


def artifact(ax,x,y,w,h,label):
    d=.14
    ax.add_patch(Polygon([(x,y),(x+w,y),(x+w,y+h-d),(x+w-d,y+h),(x,y+h)],
                        facecolor='white',edgecolor=INK,lw=.7,zorder=5))
    line(ax,[(x+w-d,y+h),(x+w-d,y+h-d),(x+w,y+h-d)])
    text(ax,x+w/2,y+h/2,label,9.1)


def save(fig,name):
    for suffix in ['png','svg']:
        fig.savefig(OUTPUT/f'{name}.{suffix}',dpi=300,facecolor='white')
    plt.close(fig)


# Physical topology: device, browser/server split, managed services, providers.
fig,ax=canvas(9.6)
phone(ax,.55,6.1,2.15,1.65)
monitor(ax,.55,3.25,2.15,1.05)
node(ax,.55,.8,2.15,1.15,'Next.js server')
text(ax,1.62,1.15,'16.1.3 · admin APIs',8.5)
boundary(ax,4.0,1.35,3.85,6.45,'Supabase managed project')
text(ax,5.92,7.36,'eu-central-1 · PostgreSQL 17',9,color=MUTED)
block(ax,4.4,5.6,3.05,1.1,'Auth · Data API\nRealtime',PALE,BLUE)
database(ax,4.4,3.7,1.4,1.0,'PostgreSQL')
database(ax,6.05,3.7,1.4,1.0,'Storage')
block(ax,4.4,1.9,3.05,1.05,'Edge Functions',PALE,BLUE)
arrow(ax,[(5.0,5.6),(5.0,4.7)])
arrow(ax,[(6.75,5.6),(6.75,4.7)])
block(ax,9.05,6.8,2.45,1.0,'n8n\nWorkflow runtime')
block(ax,9.05,4.8,2.45,.65,'Groq')
block(ax,9.05,3.55,2.45,.65,'Stripe')
block(ax,9.05,2.3,2.45,.65,'Open Food Facts')
block(ax,9.05,.8,2.45,.65,'Cloudflare R2')
block(ax,4.4,8.55,3.05,.65,'LiveKit')
arrow(ax,[(2.7,6.25),(4.4,6.25)],'Client APIs',(3.52,6.52))
arrow(ax,[(1.62,3.03),(1.62,1.95)],'HTTP',(1.62,2.5))
arrow(ax,[(2.7,1.3),(3.25,1.3),(3.25,5.9),(4.4,5.9)])
ax.text(3.23,4.05,'Backend APIs',rotation=90,ha='center',va='center',fontsize=8.5,color=MUTED,
        bbox=dict(facecolor='white',edgecolor='none',pad=2),zorder=9)
arrow(ax,[(1.62,7.75),(1.62,8.87),(4.4,8.87)],'Media / signalling',(2.92,9.16),BLUE)
arrow(ax,[(9.05,7.27),(8.37,7.27),(8.37,6.2),(7.45,6.2)],'REST',(8.55,7.55))
arrow(ax,[(10.28,6.8),(10.28,5.45)],'AI prep',(10.28,6.1))
line(ax,[(7.45,2.42),(8.42,2.42),(8.42,5.125)])
for y in [2.625,3.875,5.125]:
    arrow(ax,[(8.42,y),(9.05,y)])
text(ax,8.42,1.96,'API calls',8.5,color=MUTED)
arrow(ax,[(2.0,.8),(2.0,.35),(10.28,.35),(10.28,.8)],'Media uploads',(6.1,.35))
save(fig,'arch_physical')


# Logical component view: explicit execution boundaries and dependencies.
fig,ax=canvas(8.5)
boundary(ax,.35,2.55,3.45,5.3,'Mobile device')
boundary(ax,4.35,2.55,3.45,5.3,'Admin application')
boundary(ax,8.35,2.55,3.3,5.3,'Backend execution')
component(ax,.7,6.4,2.6,.85,'Screens / navigation')
component(ax,.7,4.9,2.6,.85,'Zustand stores')
component(ax,.7,3.1,2.6,1.1,'Services / SDKs\nNative CV · local storage')
arrow(ax,[(2.0,6.4),(2.0,5.75)])
arrow(ax,[(2.0,4.9),(2.0,4.2)])
arrow(ax,[(3.3,6.82),(3.55,6.82),(3.55,3.65),(3.3,3.65)],dashed=True)
ax.text(3.55,5.4,'Direct calls',rotation=90,ha='center',va='center',fontsize=8,color=MUTED,
        bbox=dict(facecolor='white',edgecolor='none',pad=1),zorder=9)
component(ax,4.7,6.4,2.75,.85,'Browser UI')
component(ax,4.7,3.7,2.75,1.65,'Next.js server\nRendering / API routes\nAccess checks / adapters')
arrow(ax,[(6.07,6.4),(6.07,5.35)],'Requests / rendering',(6.07,5.88))
component(ax,8.7,5.85,2.6,1.4,'Edge Functions\nAI · payments · barcode\nLiveKit token signing')
component(ax,8.7,3.15,2.6,1.25,'n8n workflow code\nREST + AI prep / Groq')
block(ax,.7,.45,10.6,1.05,'Supabase Auth · Data API · Realtime · Storage\nPostgreSQL and configured access policies',PALE,BLUE)
arrow(ax,[(2.0,3.1),(2.0,1.5)])
arrow(ax,[(6.07,3.7),(6.07,1.5)])
arrow(ax,[(9.1,5.85),(8.1,5.85),(8.1,1.95),(9.1,1.95),(9.1,1.5)])
arrow(ax,[(10.1,3.15),(10.1,1.5)])
save(fig,'arch_logical')


# Automation: two executable nodes per export; persisted outputs at right.
fig,ax=canvas(10.9)
text(ax,1.7,10.48,'Schedule',10.5,color=BLUE)
text(ax,5.8,10.48,'Code node',10.5,color=BLUE)
text(ax,10.3,10.48,'Persisted output',10.5,color=BLUE)
rows = [
    (8.1,'Every 60 min','AI Session Prep','Context / unexpired-note guard\nDirect Groq call; save briefing','ai_session_notes\nnotifications (coach)'),
    (6.5,'Every 15 min','Booking Reminders','Confirmed bookings within 60 min\nRecipient / booking duplicate guard','notifications\n(client and coach)'),
    (4.9,'Every 240 min','Check-in Reminders','Due schedules / response check\nSchedule-date duplicate guard','notifications\n(client)'),
    (3.3,'Every 1,440 min','Coach Daily Digest','Rule-based coaching signals\nCoach / UTC-date duplicate guard','notifications\n(coach)'),
    (1.7,'Every 1,440 min','Admin Ops Digest','Operational counts\nAdmin / date duplicate guard','admin_notifications'),
]
for y,interval,name,body,output in rows:
    cy=y+.575
    ax.add_patch(Circle((.95,cy),.24,facecolor='white',edgecolor=BLUE,lw=.85,zorder=3))
    line(ax,[(.95,cy+.14),(.95,cy),(1.07,cy-.06)],BLUE)
    text(ax,1.4,cy,interval,9,ha='left')
    block(ax,3.8,y,4.15,1.15,'')
    text(ax,5.875,y+.87,name,10.4,weight='bold')
    text(ax,5.875,y+.37,body,8.5,color=MUTED)
    database(ax,9.25,y,2.25,1.15,output)
    arrow(ax,[(3.03,cy),(3.8,cy)])
    arrow(ax,[(7.95,cy),(9.25,cy)],'REST',(8.6,cy+.25))
block(ax,9.25,9.55,2.25,.5,'Groq API',size=9.5)
arrow(ax,[(7.35,9.25),(7.35,9.8),(9.25,9.8)],'Direct call',(8.28,10.06))
ax.set_ylim(1.2,10.9)
fig.set_size_inches(12,9.7)
save(fig,'n8n_automation')


# Deployment: UML-style execution nodes containing application artifacts.
fig,ax=canvas(8.9)
node(ax,.6,6.3,3.0,1.8,'Mobile device target')
artifact(ax,.88,6.61,2.45,.79,'GoFitMobile\nEAS build profiles')
node(ax,4.6,6.3,2.7,1.8,'Admin browser target')
artifact(ax,4.88,6.61,2.15,.79,'Pages / client assets')
node(ax,8.4,6.3,3.0,1.8,'Admin server target')
artifact(ax,8.68,6.61,2.45,.79,'Next.js application\nRoutes / proxy')
node(ax,.6,2.2,6.7,2.65,'Confirmed Supabase project')
text(ax,3.95,4.05,'eu-central-1 · healthy at inspection',9,color=MUTED)
database(ax,1.0,2.65,2.0,1.05,'PostgreSQL 17\nDatabase schema')
artifact(ax,3.5,2.65,3.2,1.05,'Edge Function source\nDeployment not verified')
node(ax,8.4,2.2,3.0,2.65,'Automation runtime target')
artifact(ax,8.68,2.88,2.45,1.15,'Five n8n exports\nDocker setup documented\nRuntime not verified')
arrow(ax,[(2.1,6.3),(2.1,4.85)],'Backend APIs',(2.1,5.6))
arrow(ax,[(7.45,7.1),(8.4,7.1)],'HTTP',(7.93,7.4))
arrow(ax,[(9.9,6.3),(9.9,5.5),(7.78,5.5),(7.78,3.8),(7.45,3.8)],'Server APIs',(7.93,5.73))
arrow(ax,[(8.4,2.8),(7.45,2.8)],'REST',(7.93,3.08))
text(ax,.6,1.38,'External service configuration targets',9.5,ha='left',color=BLUE)
for x,label in [(.6,'Groq'),(2.8,'Stripe'),(5.0,'LiveKit'),(7.2,'Cloudflare R2'),(9.4,'Open Food Facts')]:
    block(ax,x,.5,2.0,.55,label,size=9)
save(fig,'deployment_diagram')
