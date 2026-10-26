from pathlib import Path
from PIL import Image
import json,hashlib,re,difflib

OUT=Path(__file__).resolve().parent
REPORT=OUT.parents[1]
main=REPORT/'main.tex'
before=main.read_text(encoding='utf-8')
(OUT/'main-before.txt').write_text(before,encoding='utf-8')
text=before
ASSETS=REPORT/'figures/screenshots'
ASSETS.mkdir(exist_ok=True)
records=[]
def shot(name,source,crop=None):
    p=REPORT/source
    with Image.open(p) as im:
        if crop:
            assert 0<=crop[0]<crop[2]<=im.width and 0<=crop[1]<crop[3]<=im.height
            im.crop(crop).save(ASSETS/(name+'.png'))
        else:
            (ASSETS/(name+'.png')).write_bytes(p.read_bytes())
    records.append({'asset':'figures/screenshots/'+name+'.png','source':source,'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'cropPixels':crop,'assetSha256':hashlib.sha256((ASSETS/(name+'.png')).read_bytes()).hexdigest()})
    return 'figures/screenshots/'+name+'.png'
C='qa/2026-10-22/screenshots/'
H='qa/2026-10-23-coach/screenshots/'
A='qa/2026-10-23-admin/'
P='qa/2026-10-22/fixes/COACHING-07/payment-fulfillment/screenshots/'
assets={
'intro':shot('client-onboarding-introduction',C+'CLIENT-001-onboarding-before-skip.png'),
'home':shot('client-home-after-relaunch',C+'CLIENT-054-restart-authenticated.png'),
'catalog':shot('client-workout-catalog',C+'CLIENT-089-library-native.png'),
'exercise':shot('client-exercise-detail',C+'CLIENT-012-exercise-detail.png'),
'builder':shot('client-workout-builder',C+'CLIENT-097-builder-form.png'),
'progress':shot('client-progress-chart',C+'CLIENT-172-progress-chart-area.png'),
'nutrition':shot('client-nutrition-dashboard',C+'CLIENT-024-nutrition-dashboard.png'),
'food':shot('client-food-serving',C+'CLIENT-031-food-added.png'),
# Only the observed guidance and permission result are shown; historical body values excluded.
'measure':shot('measurement-guidance-excerpt',C+'CLIENT-058-body-measurement-form.png',(0,70,1080,1110)),
'denial':shot('measurement-permission-result',C+'CLIENT-060-camera-denial-handled.png',(55,825,1025,1450)),
'market':shot('client-coach-discovery',C+'CLIENT-134-coach-marketplace.png'),
'calendar':shot('coach-calendar',H+'COACH-099-fixed-return-october.png'),
'availability':shot('coach-availability',H+'COACH-106-availability-preserved-after-fix.png'),
'duration':shot('coach-saved-duration',H+'COACH-117-duration-60-restored.png'),
'program':shot('coach-program-form',H+'COACH-069-program-builder-empty.png'),
'note':shot('coach-disposable-note',H+'COACH-035-note-persisted.png'),
'conversation':shot('coach-message-empty-state',H+'COACH-062-conversations.png'),
'checkout':shot('sandbox-eur-checkout',P+'PACK-005-ready-to-pay.png'),
'packsuccess':shot('sandbox-pack-success',P+'PACK-007-saved.png'),
# Crop out all client/coach identity columns and unrelated legacy purchases.
'transactions':shot('admin-sandbox-payment-records','qa/2026-10-24-session-payments/screenshots/session-payment-admin.png',(820,430,1660,610)),
'dashboard':shot('admin-dashboard',A+'fixes/DASH-03/screenshots/dashboard-profile-count.png'),
'exerciseadmin':shot('admin-exercise-catalog',A+'screenshots/ADMIN-010-exercises.png'),
'workoutadmin':shot('admin-disposable-workout-editor',A+'fixes/WORK-05/02-edited-and-reloaded.png'),
# Only the decision dialog is retained; no email-bearing coach table is included.
'approval':shot('admin-approval-dialog',A+'screenshots/ADMIN-029-coach-approval-confirmation.png',(465,414,975,595)),
# Action/resource/detail columns only; actor identity and network-address columns omitted.
'audit':shot('admin-exercise-audit-excerpt',A+'fixes/AUDIT-03/screenshots/activity-log-api-consistency.png',(665,285,1405,550)),
}
figures=[]
def panel(label,caption,items,width='.29',height=None):
    parts=['\\begin{figure}[H]','\\centering']
    for i,(key,title) in enumerate(items):
        opts='width=\\linewidth'
        if height:opts+=',height='+height+',keepaspectratio'
        parts+=['\\begin{minipage}[t]{'+width+'\\linewidth}','\\centering',r'\includegraphics['+opts+']{'+assets[key]+'}',r'\par\smallskip{\footnotesize '+chr(97+i)+') '+title+r'\par}','\\end{minipage}']
        if i<len(items)-1:parts+=['\\hspace{0.025\\linewidth}']
    parts+=['\\caption{'+caption+'}','\\label{'+label+'}','\\end{figure}']
    figures.append({'label':label,'caption':caption,'assets':[assets[k] for k,_ in items]})
    return '\n'.join(parts)+'\n\n'
def wide(label,caption,key):return panel(label,caption,[(key,'')],'.96') .replace(r'\par\smallskip{\footnotesize a) \par}','')
def stack(label,caption,items):
    result=panel(label,caption,items,'.96')
    return result.replace('\\hspace{0.025\\linewidth}','\\par\\medskip')
def insert_before(anchor,content):
    global text
    if anchor.startswith('\\section{Tests}'):
        position=text.index(anchor,text.index('\\chapter{Sprint 2}'))
        assert position<text.index('\\chapter{Sprint 3}')
        text=text[:position]+content+text[position:]
        return
    assert text.count(anchor)==1,anchor
    text=text.replace(anchor,content+anchor)

intro=r'''\subsection{Interface Captures and Evidence Scope}

The following interface captures come from the retained October 2026 development-build and local-administration QA. They illustrate visible states and selected follow-up corrections, rather than proving internship-period delivery or complete workflow validation. Cropped excerpts omit unrelated records or identity columns; the original captures and their links to the QA records are retained in the accompanying evidence package. The report distinguishes configured, empty, cancelled, failed and successful states in the relevant captions.

'''
insert_before('\\subsection{Mobile Foundation and Navigation}',intro)
insert_before('\\subsection{Workout Core and Rest Timer}',
r'Figure~\ref{fig:ui-client-entry} illustrates the onboarding introduction, existing-account Home and workout catalog as captured. Reaching Home does not establish completion or remote persistence of the full onboarding form.'+'\n\n'+panel('fig:ui-client-entry','Interface captures: onboarding introduction, existing-account Home and workout catalog (October development build).',[('intro','Onboarding introduction'),('home','Home after session relaunch'),('catalog','Native workout catalog')],'.29'))
insert_before('\\subsection{Offline Workout Resiliency and Fault-Tolerant Queue}',
r'Figure~\ref{fig:ui-workout-configuration} shows an exercise prescription and the workout-builder form. Set, repetition and rest fields describe the prescription; no active-session, timer-expiry or offline result is inferred from these images.'+'\n\n'+panel('fig:ui-workout-configuration','Interface captures: exercise detail and workout configuration; execution checks remain separate.',[('exercise','Exercise detail'),('builder','Workout-builder form')],'.31'))
insert_before('\\subsection{Data Interpretation and User Feedback}',
r'Figure~\ref{fig:ui-progress-nutrition} combines the visible progress-chart state with nutrition and serving-entry views. The shown zero values and meal-entry form are interface observations; a completed save and aggregate correctness require the associated QA/readback records.'+'\n\n'+panel('fig:ui-progress-nutrition','Interface captures: progress display, nutrition diary and food-serving selection (October QA).',[('progress','Progress chart state'),('nutrition','Nutrition diary'),('food','Selected food and serving')]))
insert_before('\\section{Tests}\n\nThis matrix reconciles the original test identifiers',
r'Figure~\ref{fig:ui-measurement-boundary} presents cropped measurement guidance and the observed camera-denial response. It supplies no fresh inference, review/save or numerical-accuracy result. A successful measurement draft and an independent accuracy comparison remain missing evidence.'+'\n\n'+panel('fig:ui-measurement-boundary','Interface excerpts: measurement guidance and handled camera denial; no successful scan is claimed.',[('measure','Capture guidance excerpt'),('denial','Permission-denial message')],'.42','8.5cm'))
insert_before('\\subsection{Stripe Payment Integration and Persistence Boundaries}',
r'Figures~\ref{fig:ui-coaching-availability} and~\ref{fig:ui-coach-workspace} show selected coaching interfaces. The duration image records the restored 60-minute preference; it does not complete the pending native standalone-payment test. The program form is unsubmitted, the private note is a disposable QA fixture, and the conversation list is empty.'+'\n\n'+
panel('fig:ui-coaching-availability','Interface captures: coach discovery, recurring availability and the restored session-duration preference.',[('market','Client marketplace'),('availability','Coach availability'),('duration','Saved duration restored to 60 min')])+
panel('fig:ui-coach-workspace','Interface captures: coach calendar, unsubmitted program form and disposable private note.',[('calendar','Calendar and empty upcoming list'),('program','Program-creation form'),('note','Disposable QA note')]))
insert_before('\\subsection{Coach Check-in and Nutrition Context}',
r'Figure~\ref{fig:ui-sandbox-pack} illustrates the retained EUR129 pack sandbox checkout and success dialog. Figure~\ref{fig:ui-admin-paid-records} shows the matching administrative payment-state fields alongside the separate EUR60 standalone-session record. The latter was verified through API/provider checks, not a completed native standalone checkout.'+'\n\n'+
panel('fig:ui-sandbox-pack','Sandbox interface captures: EUR129 test checkout and successful pack-purchase confirmation; no live charge is shown.',[('checkout','Stripe test-mode checkout'),('packsuccess','Pack-purchase success dialog')],'.31')+
wide('fig:ui-admin-paid-records','Administrative transaction excerpt: EUR60 standalone session and EUR129 pack marked sandbox-paid; identity columns omitted.','transactions'))
insert_before('\\subsection{Administration and Operational Control}',
r'Figure~\ref{fig:ui-conversation-empty} illustrates the coach conversation empty state. It is not evidence of a two-party message exchange or a connected video consultation; neither successful communication scenario is illustrated by the retained captures.'+'\n\n'+panel('fig:ui-conversation-empty','Interface capture: coach message-list empty state; successful messaging/video evidence remains pending.',[('conversation','Empty conversation list')],'.31'))
insert_before('\\subsection{Admin Analytics and Business Intelligence Features}',
r'Figures~\ref{fig:ui-admin-exercises} and~\ref{fig:ui-admin-workout} illustrate catalog management and a reloaded disposable workout fixture. Figure~\ref{fig:ui-admin-approval-audit} separates an approval confirmation dialog from exercise-deletion audit records. The coach-approval action was cancelled in the retained test; the audit excerpt concerns exercise deletion and does not establish approval auditing.'+'\n\n'+
wide('fig:ui-admin-exercises','Administrative interface: exercise catalog, search/filter controls and management actions in the local QA environment.','exerciseadmin')+
wide('fig:ui-admin-workout','Administrative interface: disposable workout fixture reopened after editing; this test record was subsequently removed.','workoutadmin')+
stack('fig:ui-admin-approval-audit','Administrative excerpts: coach-approval confirmation (cancelled) and exercise-deletion audit entries; unrelated identity/network columns omitted.',[('approval','Approval confirmation dialog'),('audit','Exercise-deletion audit excerpt')]))
insert_before('\\subsection{Advanced BI', '') if '\\subsection{Advanced BI' in text else None
# The dashboard belongs before the next functional feature, after the BI tables/explanation.
insert_before('\\subsection{In-App AI Workout Recommendation and Personalization}',
r'Figure~\ref{fig:ui-admin-dashboard} shows the corrected profile-count label and BI overview. The displayed totals belong to the test environment and include the stated historical/sandbox limitations; this image does not independently validate all BI calculations.'+'\n\n'+wide('fig:ui-admin-dashboard','Administrative dashboard capture: user-profile count and operational BI overview after the label correction.','dashboard'))
insert_before('\\subsection{Device Feedback and Validation Scope}',
r'No successful scheduled-run screenshot is added for automation: the retained artifact is the workflow design in Figure~\ref{fig:n8n_automation}, while execution and delivery evidence remain pending. Similarly, the architecture/deployment views describe their stated targets and metadata rather than serving as screenshots of a published release.'+'\n\n')

main.write_bytes(text.replace('\n','\r\n').encode('utf-8'))
(OUT/'assets.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
(OUT/'figures.json').write_text(json.dumps(figures,indent=2)+'\n',encoding='utf-8')
(OUT/'main-revision.diff').write_text(''.join(difflib.unified_diff(before.splitlines(True),text.splitlines(True),fromfile='before-screenshots/main.tex',tofile='with-screenshots/main.tex')),encoding='utf-8')
print(f'Inserted {len(figures)} figure groups using {len(records)} source captures.')
