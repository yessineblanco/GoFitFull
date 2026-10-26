from pathlib import Path
import json, re, hashlib, difflib

ROOT = Path(__file__).resolve().parents[3]
REPORT = ROOT / 'Rapport Blanci'
OUT = Path(__file__).resolve().parent
main = REPORT / 'main.tex'
before = main.read_text(encoding='utf-8')
(OUT / 'main-before.txt').write_text(before, encoding='utf-8')
text = before
changes = []
def replace(old, new):
    global text
    assert text.count(old) == 1, old[:100]
    changes.append({'old': old, 'new': new, 'originalLine': before[:before.index(old)].count('\n')+1})
    text = text.replace(old,new)

# Preserve original targets and estimates; state implementation deviations explicitly.
for sprint in (1,2,3):
    anchor = f'\\caption{{Sprint {sprint} backlog decomposition}}'
    start = text.index(anchor)
    end = text.index('\\subsection{Sprint Class Diagram}', start)
    extra = {
      1: r'''The backlog is retained as a planning artifact, including its original task identifiers and estimates. The cumulative model and sequences describe the inspected implementation rather than a dated sprint-end snapshot. US-3.2 maps to the Workout--WorkoutExercise--Exercise prescription model; a complete reorder or cloning workflow is not established by the retained QA. US-3.3 maps to WorkoutSession and embedded SessionExerciseSnapshot values, not a persisted WorkoutSet entity. US-3.4 maps to the conditional offline completion sequence, not unrestricted offline creation. Table~\ref{tab:sprint-traceability} connects these deviations and the remaining sprint stories to the evidence matrix.''',
      2: r'''This backlog records planned scope rather than completed tests. US-4.1 maps to BodyMeasurement and the capture/review/save sequences; the inspected Android path is not evidence of numerical accuracy or equivalent iOS support. US-4.2's NutritionLog and UserDietaryPreferences are planning terms: the implemented model uses MealLog, FoodItem, NutritionGoals and profile collections. Name-based exclusions are distinct from ingredient-safety verification. US-4.3 maps to independent ProgressPhoto records and session-derived statistics; named chart libraries, progression curves and a comparison slider require their own implementation and execution evidence. US-4.4 maps to notification preferences and recommendation services, not a guaranteed notification schedule, streamed response or validated timeout fallback. See Table~\ref{tab:sprint-traceability}.''',
      3: r'''The original task wording remains a target, not a completion claim. US-5.1 maps to offers, purchases and bookings; the updated sequences below describe the October EUR follow-up rather than proving those corrections existed during the internship. US-5.2 maps to programs, schedules, responses and private notes; no separate ClientCoachAssignment entity is needed by this selected model, and a populated photo-review workflow remains unverified. US-5.3 maps to Conversation, Message and AISessionNote; briefing generation is distinct from post-consultation synthesis. US-5.4 maps to profile-based administrator authorization and selected audit records. The presence of those records does not imply that coach approval emits an audit or notification event. See Table~\ref{tab:sprint-traceability}.'''
    }[sprint]
    point = text[end:end+len('\\subsection{Sprint Class Diagram}')]
    # The same heading occurs three times, so insert by position instead.
    text = text[:end] + extra + '\n\n' + text[end:]

replace('The following use-case and sequence descriptions retain the earlier checkout baseline examined during the October audit. They are historical source descriptions, not the current corrected payment flow. Section~\\ref{sec:current-payment-boundaries} distinguishes the later EUR sandbox implementation and retained execution evidence. Synchronizing these figures with the later implementation remains part of the separate sprint-artifact cross-check.',
 r'The following use case and sequences describe the corrected implementation inspected on 24 October 2026. They replace the earlier client-priced USD checkout baseline and must not be read as evidence of internship-period delivery. Pack purchase and standalone session payment share native PaymentSheet presentation but have different reservation and fulfilment paths. Section~\ref{sec:current-payment-boundaries} distinguishes the retained Android pack evidence from standalone API/provider checks and outstanding native verification.')

start = text.index('\\caption{Textual description of use case: Purchase a session pack')
end = text.index('\\end{longtable}',start)
block=text[start:end]
rows = {
'Preconditions': r'The client is authenticated, a coach and pack or session time have been selected, and Stripe client/server configuration is available. A standalone session requires an approved coach, a positive hourly rate, the saved duration and a valid Europe/Berlin availability slot.',
'Postconditions': r'On verified pack fulfilment, one purchased-pack record retains the payment reference, paid EUR amount, mode and credits. On verified standalone fulfilment, the reserved booking is confirmed and marked paid after capture. Provider success and database confirmation are separate boundaries; recovery may still require retrying the same reference.',
'Nominal scenario': r'1. The client opens the coach profile. 2. The client selects a pack or a standalone session time. 3. The screen requests create\_pack or create\_session. 4. The server authenticates the caller and resolves the EUR price; the session branch first reserves the slot. 5. The screen presents PaymentSheet. 6. After a result without an error, it requests server fulfilment using the PaymentIntent reference. 7. The server verifies ownership and provider state, persists the purchase or captures and confirms the reserved session. 8. The screen displays success only after fulfilment returns successfully.',
'Alternative scenario': r'2.1. Pack checkout uses the active offer price and does not reserve a time. 2.2. Standalone pricing uses hourly rate multiplied by the saved duration divided by 60; the submitted expected amount is checked against the server quote. The card is authorized before capture. 6.1. A fulfilment replay returns the existing result without granting duplicate credits or recapturing a paid session. Pack-credit redemption remains a separate service branch, not the standalone checkout shown here.',
'Exception scenario': r'E.1. Missing configuration, changed terms, unavailable time or reservation conflict prevents checkout. E.2. A cancelled or failed native sheet does not initiate fulfilment; the session screen attempts checkout cancellation. E.3. Expired or cancelled session reservations cannot proceed to capture. E.4. Provider success followed by a persistence failure requires retry with the same reference; no webhook, automatic refund or app-restart recovery is established. E.5. A capture in progress cannot be cancelled by the checkout-cancellation operation.'}
for name,value in rows.items():
    block,n=re.subn(r'^'+name+r' & .*$',lambda _: name+' & '+value+r' \\ \hline',block,flags=re.M)
    assert n==1
text=text[:start]+block+text[end:]
start=text.index('Figure~\\ref{fig:seq_booking_ssd} separates')
end=text.index('\\subsubsection{Use case: Approve a coach profile',start)
text=text[:start]+r'''Figure~\ref{fig:seq_booking_ssd} makes the client journey explicit: Coach Profile leads either to a pack purchase or to Book Session, availability selection and standalone checkout. A pack purchase does not itself book a time. The standalone screen loads saved duration, price and busy slots, then rechecks terms before requesting a reservation. The date helper interprets availability in Europe/Berlin and chooses the next occurrence of the selected weekday, including the following week when that weekday is today. Sunday is accepted through an explicit null check. Client-side filtering assists selection; the server remains responsible for reservation and conflict checks.

Figure~\ref{fig:seq_booking_detailed} separates checkout initialization from fulfilment. The Edge Function validates the supplied session token using the authentication service. Pack initialization resolves an active offer and EUR price; standalone initialization calls \texttt{reserve\_paid\_session}, which validates the coach, saved duration, expected price and availability before inserting a pending reservation. Its checkout expiry is at most 15 minutes and no later than the session start. The session PaymentIntent uses manual capture. The native SDK presents PaymentSheet; a return without error triggers a server request rather than a direct client database insert. The selected successful sequences omit SDK-internal network exchanges and most error branches, which remain in the use-case table. Apple Pay and Google Pay are not configured by these calls.

\begin{figure}[H]
\centering
\includegraphics[width=0.95\linewidth]{figures/seq_booking_pack_recording.png}
\caption{Technical sequence diagram: Server verification and idempotent pack fulfilment}
\label{fig:seq_booking_pack_recording}
\end{figure}

Figure~\ref{fig:seq_booking_pack_recording} starts after PaymentSheet returns without an error. The pack service invokes \texttt{fulfill\_pack} with the PaymentIntent reference. The server retrieves the provider record, verifies the authenticated owner, checkout metadata, EUR currency, successful state and received amount, then inserts the purchase with the paid snapshot and credit count. A unique payment reference prevents duplicate credit creation; a matching replay returns the existing purchase. An October Android sandbox purchase and replay support this narrow path, without certifying declines, refunds, payouts or restart recovery.

\begin{figure}[H]
\centering
\includegraphics[width=0.95\linewidth]{figures/seq_booking_direct.png}
\caption{Technical sequence diagram: Reserved standalone session, capture and confirmation}
\label{fig:seq_booking_direct}
\end{figure}

Figure~\ref{fig:seq_booking_direct} follows standalone fulfilment after card authorization. The server verifies the owner and provider metadata, then calls \texttt{prepare\_paid\_session\_capture} to validate the reservation and protect it during capture. It captures an authorized intent using an idempotency key, checks the received amount, and calls \texttt{complete\_paid\_session} to mark the booking confirmed and paid. Already-paid replay returns the existing booking. The mobile screen refreshes client bookings before showing success. This corrected branch does not call the older client-side booking insertion and notification orchestration. Notification delivery is therefore not a postcondition established by this sequence. October API/provider and administrator readback evidence supports payment persistence; native standalone checkout remains pending.

The separate \texttt{createBooking} service still supports a purchased-pack reference and calls \texttt{deduct\_session} after insertion. Those requests are not one atomic booking-and-credit operation, and the standalone screen does not use that branch. Wallet transactions remain a different ledger from card purchase and booking payment snapshots. The selected cumulative class diagrams omit most financial attributes for readability: provider references, paid amount/currency/mode and booking payment state are attributes of the existing purchase and booking records, not a new persisted PaymentIntent entity. The diagrams do not establish coach payout settlement or automatic refund processing.

''' + text[end:]
replace('\\caption{Technical sequence diagram: Shared PaymentIntent and native PaymentSheet checkout}',r'\caption{Technical sequence diagram: Server-priced EUR initialization and native checkout}')

# Reconcile every original test ID; preserve the test plan/result distinction.
data = [
('S1-T01','Authentication','Existing-account sign-in','Existing test account','Sign in; reopen app','Protected client route','Observed scoped access','Partial','M01; C AUTH-01--04; fresh registration and refresh not verified'),
('S1-T02','Onboarding','Fresh six-screen profile save','New client fixture','Complete full form; read back','Answers persisted remotely','Fresh flow not run','Pending','M02; saved-profile views do not validate new onboarding'),
('S1-T03','Workout session','Weights and completion save','Existing remote session','Record weights; finish; read back','Existing session updated','Full completion not retained','Pending','M05; no RPE or separate WorkoutSet table'),
('S1-T04','Rest timer','Countdown and background alerts','Active workout','Complete set; lock; observe','Countdown and configured feedback','Informal user confirmation only','Pending','M05; QA-02 lacks retained timing/background evidence'),
('S1-T05','Offline queue','Existing-session completion replay','Remote session; disconnected','Finish; reconnect; compare row','Queued UPDATE replayed once','Not exercised with readback','Pending','M06; final QA-03'),
('S1-T06','Exercise media','Play exercise demonstration','Network and media URL','Open detail; start playback','Playable demonstration','Detail/media observations partial','Partial','M03; C EXERCISE-01--04; smoothness/decoding not measured'),
('S2-T01','Catalog','Search and equipment filters','Populated catalog','Search; select filters','Matching exercises','Browsing passed; filters partial','Partial','M03; C LIBRARY-01--02, EXERCISE-01--04'),
('S2-T02','Progress','Charts and aggregates','Saved session history','Open charts; compare totals','Metrics match source records','Controls viewed; arithmetic incomplete','Partial','M07; C PROGRESS-01--03'),
('S2-T03','Measurements','Fresh capture, review and save','Camera; height; reference values','Capture pair; edit; save','Reviewed draft persisted','Fresh workflow not retained','Pending','M08; final QA-04; debug notes are narrower'),
('S2-T04','Exclusions','Name exclusion search','Controlled preference fixture','Search known included/excluded names','Expected name matches omitted','Controlled fixture not run','Pending','M09; no allergen-safety result'),
('S2-T05','Barcode','Lookup and meal logging','Camera; known product','Scan; resolve; log serving','Product and meal persisted','Permission denial only observed','Pending','M09; C NUTRITION-07; positive lookup unverified'),
('S2-T06','AI workout','Generate, review and save','Reachable recommendation entry','Request; inspect; accept; reopen','Valid saved recommendation','Entry blocked on tested account','Pending','M19; C AI-01--03; final QA-05'),
('S3-T01','Coach onboarding','Fresh coach submission','Dedicated new coach','Complete profile; upload; submit','Pending review profile','Existing approved role inspected','Pending','M10, M17; fresh upload/submission not run'),
('S3-T02','Pack payment','EUR sandbox purchase','Configured sandbox; active offer','Pay; fulfil; replay; inspect admin','One purchase and correct credits','Android EUR129 / 12 credits','Scoped pass','M11; P; October follow-up, not sprint-period proof'),
('S3-T03','Pack booking','Reserve using existing credits','Pack and available coach slot','Book; compare credit/calendar','One booking and one deduction','Credit-redemption path unverified','Pending','M12; standalone S API checks do not prove this branch'),
('S3-T04','Video','Two-party consultation','Authorized booking; two devices','Join; exchange media; reconnect','Authorized bidirectional media','No retained two-party call','Pending','M13; authorization/time-window gaps in Step 3'),
('S3-T05','Coach review','Approve pending profile','Admin; controlled pending coach','Inspect existing links; confirm','Approved profile; wallet trigger','Confirmation/cancel only tested','Partial','M18; A COACH-02--04; no signed-URL or notification proof'),
('S3-T06','Automation','Scheduled AI briefing','Running scheduler; test booking','Trigger; inspect output/delivery','New briefing with execution trail','No retained fresh run','Pending','M16, M20; exports and old inbox are insufficient'),
]
for row in data:
    pattern=r'^'+row[0]+r' & .*?$'
    new=' & '.join(row)+r' \\ \hline'
    text,n=re.subn(pattern,lambda _:new,text,flags=re.M)
    assert n==1,row[0]
text=text.replace('The following validation matrix avoids declaring success without verification evidence. It defines verifiable preconditions, concrete execution steps, and observable system outcomes.',r'This matrix reconciles the original test identifiers with the retained 22--24 October evidence; it is not a recovered sprint-period execution log. Expected outcomes remain test criteria. Partial denotes narrower observations, Pending denotes an unverified full scenario, and Scoped pass applies only to the named sandbox case. M references identify Table~\ref{tab:implementation-evidence} and its detailed index; C, A, P and S identify the evidence package in Section~\ref{sec:qa-evidence}. No missing attachment is replaced by an assumed success.')

trace = [
('US-3.1','PB-01; FR-01','M01--02','Account/profile; auth and onboarding sequences; S1-T01--02'),
('US-3.2','PB-02--03; FR-02','M03--04','Workout prescriptions; builder completion not fully exercised'),
('US-3.3','PB-02; FR-03','M05','Embedded snapshots; online session sequence; S1-T03--04'),
('US-3.4','PB-02--03; FR-03','M06','Existing-session offline UPDATE; S1-T05'),
('US-4.1','PB-04; FR-04','M08','Measurement record; capture/review/save; S2-T03'),
('US-4.2','PB-04; FR-05','M09','MealLog/FoodItem; lookup and logging; S2-T04--05'),
('US-4.3','PB-04; FR-04','M07','ProgressPhoto and derived statistics; S2-T02'),
('US-4.4','PB-04; supplementary','M19--20','Reminder configuration and recommendation source; S2-T06, S3-T06'),
('US-5.1','PB-05; FR-06','M10--12','Marketplace/purchase/booking; updated payment sequences; S3-T01--03'),
('US-5.2','PB-05; FR-07','M14--15','Programs/check-ins/private notes; scoped coach ledger only'),
('US-5.3','PB-05; FR-06--07','M13, M16','Messages and AI briefing; no post-call synthesis; S3-T04, S3-T06'),
('US-5.4','PB-06; FR-08','M17--18','Admin authorization/audit model; approval sequence; S3-T05'),
]
section=r'''\subsection{Cross-sprint artifact traceability}

Table~\ref{tab:sprint-traceability} preserves the existing product and sprint identifiers while connecting them to the inspected domain views, selected sequences and retained evidence. The models are cumulative implementation projections: Sprint 2 retains the Sprint 1 foundation, and Sprint 3 retains both earlier views. They do not reconstruct the database or application at a historical sprint-end date. Use-case associations identify participating roles, not navigation order or passed tests. Exercise browsing occurs in both the Sprint 1 catalog foundation and Sprint 2 progress context; its placement in S2-T01 does not imply a second independent implementation.

\begingroup
\footnotesize
\setlength{\tabcolsep}{3pt}
\renewcommand{\arraystretch}{1.2}
\begin{longtable}{|L{1.35cm}|L{3.0cm}|L{1.75cm}|L{8.0cm}|}
\caption{Product, sprint and implementation evidence cross-reference}\label{tab:sprint-traceability} \\
\hline
\rowcolor{entetetab}
Story & Product / requirement & Evidence index & Model, interaction and validation boundary \\ \hline
'''
section += '\n'.join(' & '.join(row)+r' \\ \hline' for row in trace)
section += r'''
\end{longtable}
\endgroup

This cross-reference is selective, as are the detailed use cases. A story without its own interaction figure still requires evidence for its implemented path; a domain-class association does not replace that evidence. Planned webhook fulfilment, post-consultation synthesis, encrypted messaging, unrestricted offline execution and signed-document review are not established by the current artifacts. Sprint dates, burn-down histories and unsupported chronology require the separate supervisor-checklist review; none is inferred from October source inspection.

'''
marker='\\chapter{Deployment'
# Insert before Chapter 6, whatever its title.
chapters=list(re.finditer(r'\\chapter\{',text))
chapter6=next(m.start() for m in chapters if m.start()>text.index('\\label{tab:pdf-85-41}'))
text=text[:chapter6]+section+text[chapter6:]
main.write_bytes(text.replace('\n','\r\n').encode('utf-8'))
(OUT/'validation-rows.json').write_text(json.dumps([dict(zip(['id','feature','scenario','precondition','steps','expected','actual','status','evidence'],r)) for r in data],indent=2)+'\n',encoding='utf-8')
(OUT/'story-traceability.json').write_text(json.dumps(trace,indent=2)+'\n',encoding='utf-8')
(OUT/'main-revision.diff').write_text(''.join(difflib.unified_diff(before.splitlines(True),text.splitlines(True),fromfile='step-3/main.tex',tofile='step-4/main.tex')),encoding='utf-8')
# Record approval without altering original frozen source snapshots.
prior=REPORT/'qa/2026-10-24-step-3-claims'
v=json.loads((prior/'verification.json').read_text(encoding='utf-8'))
v.update(status='approved_by_user_compiler_dependency_blocked',step4Started=True,userApproval='proceed',approvalDate='2026-10-24')
(prior/'verification.json').write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
r=(prior/'README.md').read_text(encoding='utf-8')
r=r.replace('**Status: content revised in the existing `Rapport Blanci/main.tex`, awaiting user review. Step 2 was approved; Step 4 has not started. The editor compilation check is blocked by missing Biber.**','**Status: approved by the user ("proceed") before Step 4 began on 24 October 2026. The editor compilation check remains blocked by missing Biber.**')
(prior/'README.md').write_text(r,encoding='utf-8')
manifest=json.loads((prior/'evidence-manifest.json').read_text(encoding='utf-8'))
for entry in manifest:
    entry['sha256']=hashlib.sha256((prior/entry['file']).read_bytes()).hexdigest()
(prior/'evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Revised 18 test rows and 12-story traceability; preserved planning backlogs.')
