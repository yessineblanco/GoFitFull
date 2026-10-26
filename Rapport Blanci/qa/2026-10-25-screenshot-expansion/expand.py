from pathlib import Path
from PIL import Image,ImageDraw
import hashlib,json,re,difflib

OUT=Path(__file__).resolve().parent
REPORT=OUT.parents[1]
main=REPORT/'main.tex'
before=main.read_text(encoding='utf-8')
(OUT/'main-before.txt').write_text(before,encoding='utf-8')
text=before
assets=[];figures=[]
def asset(name,source,crop=None,masks=None):
    original=REPORT/source
    im=Image.open(original).convert('RGB')
    if masks:
        draw=ImageDraw.Draw(im)
        for box in masks:draw.rectangle(box,fill='#cbd2d5')
    if crop:im=im.crop(crop)
    target=REPORT/'figures/screenshots'/f'{name}.png';im.save(target)
    assets.append({'source':source,'asset':str(target.relative_to(REPORT)).replace('\\','/'),'sourceSha256':hashlib.sha256(original.read_bytes()).hexdigest(),'assetSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'cropPixels':crop,'privacyMaskPixels':masks})
    return str(target.relative_to(REPORT)).replace('\\','/')
C='qa/2026-10-22/screenshots/';H='qa/2026-10-23-coach/screenshots/';A='qa/2026-10-23-admin/'
shots={
'profile':asset('client-profile-overview',C+'CLIENT-008-profile.png'),
'units':asset('client-unit-preferences',C+'CLIENT-110-unit-preferences.png'),
'language':asset('client-language-options',C+'CLIENT-120-language-options.png'),
'reminders':asset('client-reminder-preferences',C+'CLIENT-071-notification-preferences.png'),
'goals':asset('client-nutrition-goals',C+'CLIENT-150-nutrition-goals-readonly.png'),
'loggedfood':asset('client-disposable-food-log',C+'CLIENT-164-test-meal-saved.png'),
'savedmeal':asset('client-saved-meal',C+'CLIENT-165-saved-meal-visible.png'),
'exercisechoice':asset('client-exercise-selection',C+'CLIENT-095-biceps-selection.png'),
'customcard':asset('client-created-workout',C+'CLIENT-100-created-workout-card.png'),
'assigned':asset('client-assigned-program-detail',C+'CLIENT-011-assigned-program-detail.png'),
'coachdash':asset('coach-dashboard-clean',H+'COACH-119-checkins-fix-ready.png'),
'clientprogress':asset('coach-client-progress',H+'COACH-124-current-streak-corrected.png',masks=[(350,130,735,210)]),
'coachpacks':asset('coach-pack-management',H+'COACH-064-session-packs.png'),
'programdraft':asset('coach-configured-program-draft',H+'COACH-072-program-unsaved-exercise.png'),
'checkins':asset('coach-checkin-schedule',H+'COACH-051-client-checkins.png',masks=[(350,130,735,215)]),
'users':asset('admin-user-management-masked',A+'screenshots/ADMIN-022-users-ready.png',masks=[(320,294,842,999)]),
'coaches':asset('admin-coach-management-masked',A+'screenshots/ADMIN-028-coaches-ready.png',masks=[(285,388,555,565)]),
'savedview':asset('admin-saved-view-dialog',A+'screenshots/ADMIN-093-saved-view-created.png',crop=(430,340,1010,790)),
'settings':asset('admin-database-summary',A+'fixes/DASH-03/screenshots/settings-profile-count.png',crop=(280,520,1570,1070)),
}
def panel(label,caption,items,width='.29'):
    rows=['\\begin{figure}[H]','\\centering']
    for i,(key,title) in enumerate(items):
        rows+=['\\begin{minipage}[t]{'+width+'\\linewidth}','\\centering','\\includegraphics[width=\\linewidth]{'+shots[key]+'}',r'\par\smallskip{\footnotesize '+chr(97+i)+') '+title+r'\par}','\\end{minipage}']
        if i<len(items)-1:rows+=['\\hspace{0.025\\linewidth}']
    rows+=['\\caption{'+caption+'}','\\label{'+label+'}','\\end{figure}']
    figures.append({'label':label,'caption':caption,'assets':[shots[k] for k,_ in items]})
    return '\n'.join(rows)+'\n\n'
def wide(label,caption,key):return panel(label,caption,[(key,'')],'.98').replace(r'\par\smallskip{\footnotesize a) \par}','')
def insert(anchor,content):
    global text
    assert text.count(anchor)==1,anchor
    text=text.replace(anchor,content+anchor)

# Make the coverage and the web interface easy to locate from the main narrative.
insert('\\subsection{Mobile Foundation and Navigation}',
r'''The screenshot walkthrough covers client settings (Figure~\ref{fig:ui-client-settings}), workout creation (Figure~\ref{fig:ui-workout-selection-save}), nutrition (Figure~\ref{fig:ui-nutrition-extended}), coach follow-up (Figure~\ref{fig:ui-coach-followup-extended}) and the administration panel. The dedicated \textit{Administration Panel: Interface Walkthrough} begins on page~\pageref{sec:admin-panel-screens}; its user/coach management, catalog, dashboard and operational captures are separate from the mobile application. The List of Figures provides the individual image-group page numbers.

''')
insert('\\subsection{Workout Core and Rest Timer}',
r'Figures~\ref{fig:ui-client-settings} and~\ref{fig:ui-client-reminder-settings} illustrate additional client controls. Their captured preferences do not independently establish every save, translation or notification-delivery outcome.'+'\n\n'+
panel('fig:ui-client-settings','Client interface walkthrough: profile overview, unit preferences and language selection.',[('profile','Profile and feature entry points'),('units','Weight and height units'),('language','Language selection')])+
panel('fig:ui-client-reminder-settings','Client interface walkthrough: reminder preferences as captured; scheduled delivery is assessed separately.',[('reminders','Notification and reminder preferences')],'.31'))
insert('\\subsection{Offline Workout Resiliency and Fault-Tolerant Queue}',
r'Figure~\ref{fig:ui-workout-selection-save} adds the exercise selector and the created disposable workout card. The fixture was later deleted during QA; its presence demonstrates the recorded creation path, not a complete active-session or offline test.'+'\n\n'+
panel('fig:ui-workout-selection-save','Client workout walkthrough: exercise selection and the created disposable workout in the custom catalog.',[('exercisechoice','Exercise selector'),('customcard','Created QA workout card')],'.31'))
insert('\\subsection{Data Interpretation and User Feedback}',
r'Figure~\ref{fig:ui-nutrition-extended} shows the goal form and the disposable food/saved-meal records from the retained QA. The goal values are displayed preferences rather than individualized dietary advice; saved-meal visibility does not establish every reuse/edit path.'+'\n\n'+
panel('fig:ui-nutrition-extended','Client nutrition walkthrough: goal settings, disposable food log and visible saved-meal entry.',[('goals','Displayed daily targets'),('loggedfood','Disposable banana log'),('savedmeal','Saved-meal entry')]))
insert('\\subsection{Stripe Payment Integration and Persistence Boundaries}',
r'Figures~\ref{fig:ui-coach-followup-extended} and~\ref{fig:ui-coach-program-pack} expand the coaching views. Client identifiers are masked where present. The program remains an unsubmitted draft, the check-in schedule is displayed without a new submission, and the sample pack is an offer rather than proof of a payout.'+'\n\n'+
panel('fig:ui-coach-followup-extended','Coach interface walkthrough: dashboard, client progress and displayed check-in scheduling; client identifiers masked.',[('coachdash','Dashboard after the query correction'),('clientprogress','Client progress view'),('checkins','Check-in schedule and empty responses')])+
panel('fig:ui-coach-program-pack','Coach/client program walkthrough: configured draft, session-pack offer and an existing assigned-program detail.',[('programdraft','Unsubmitted program draft'),('coachpacks','Coach session-pack management'),('assigned','Existing assigned-program detail')]))

# Relocate the already-included dashboard beside the other admin images.
label=text.index('\\label{fig:ui-admin-dashboard}')
start=text.rfind('\\begin{figure}[H]',0,label)
end=text.index('\\end{figure}',label)+len('\\end{figure}')
dashboard=text[start:end]+'\n\n'
text=text[:start]+text[end:]
intro=r'''\subsubsection{Administration Panel: Interface Walkthrough}
\label{sec:admin-panel-screens}

The following browser captures belong to the Next.js administration panel, not the mobile application. The walkthrough begins with the dashboard and continues through user management, coach management, catalog editing and operational records. Captures are from the local October QA environment; identifiers are masked in the user and coach lists. User-account and profile counts describe different populations and must not be conflated.

'''
newadmin=dashboard+wide('fig:ui-admin-users','Administration panel: user-account management, role filters and record actions; names and emails masked for the report.','users')+wide('fig:ui-admin-coaches','Administration panel: coach-profile review, status filters and decision controls; personal identifiers masked.','coaches')
insert('Figures~\\ref{fig:ui-admin-exercises} and~\\ref{fig:ui-admin-workout}',intro+newadmin)
insert('\\subsection{Admin Analytics and Business Intelligence Features}',
r'Figures~\ref{fig:ui-admin-saved-view} and~\ref{fig:ui-admin-settings-summary} complete the web walkthrough with a disposable saved-view configuration and the corrected profile-count summary. The verified sandbox transaction excerpt remains in Figure~\ref{fig:ui-admin-paid-records}; it is a browser view, not another mobile screen.'+'\n\n'+
wide('fig:ui-admin-saved-view','Administration panel: disposable saved BI view shown in its dialog; the QA view was subsequently removed.','savedview')+
wide('fig:ui-admin-settings-summary','Administration panel: settings-page database summary, including the corrected user-profile label; captured totals belong to the QA environment.','settings'))
main.write_bytes(text.replace('\n','\r\n').encode('utf-8'))
(OUT/'assets.json').write_text(json.dumps(assets,indent=2)+'\n',encoding='utf-8')
(OUT/'figures.json').write_text(json.dumps(figures,indent=2)+'\n',encoding='utf-8')
(OUT/'main-revision.diff').write_text(''.join(difflib.unified_diff(before.splitlines(True),text.splitlines(True),fromfile='before-expansion/main.tex',tofile='expanded/main.tex')),encoding='utf-8')
print(f'Added {len(assets)} screenshots in {len(figures)} figure groups; admin dashboard relocated into the web walkthrough.')
