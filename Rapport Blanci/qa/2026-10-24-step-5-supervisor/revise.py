from pathlib import Path
import re, json, hashlib, difflib

OUT=Path(__file__).resolve().parent
REPORT=OUT.parents[1]
ROOT=REPORT.parent
main=REPORT/'main.tex'
before=main.read_text(encoding='utf-8')
(OUT/'main-before.txt').write_text(before,encoding='utf-8')
text=before
changes=[]
def change(old,new,topic):
    global text
    assert text.count(old)==1,(topic,old[:90],text.count(old))
    changes.append({'topic':topic,'old':old,'new':new,'originalLine':before[:before.index(old)].count('\n')+1})
    text=text.replace(old,new)

# The user explicitly confirmed this interval during the audit.
change('Internship: February 2026 - June 2026','Internship: 26 January 2026 - 26 July 2026','Confirmed internship period')
change('spanning from February to June 2026','spanning from 26 January to 26 July 2026','Confirmed internship period')
change('after the February--June 2026 internship period','after the 26 January--26 July 2026 internship period','Later QA chronology')

start=text.index('An analysis of the existing fitness application ecosystem')
end=text.index('\\section{Adopted Development Methodology',start)
old=text[start:end]
new=r'''The existing-condition analysis considers a fragmented workflow in which training, nutrition, measurements, coaching communication and appointments are maintained in separate tools. It is a project problem scenario used to derive requirements, rather than a comparative market survey or an observation of every fitness application. The retained project material does not establish a representative user sample, measured administrative workload or adoption statistics. Consequently, the following analysis identifies integration needs without ranking competing products or claiming that they universally lack these capabilities.

For the client, a workout log, food diary and measurement history maintained separately make it necessary to consult several records when reviewing progress. The requirement is to associate those records with the same account while preserving their distinct meanings: prescribed repetitions differ from recorded completion, and estimated body dimensions differ from independently measured reference values.

For the coach, separate messages, calendars, payment records and program documents can make it difficult to connect an appointment with its client context. The proposed integration therefore concerns the continuity between discovery, booking, communication, programs and follow-up. No reduction in administrative time or improvement in coaching outcomes has been measured in this project.

For progress tracking, manually entered measurements and photographs provide different kinds of information. Their interpretation depends on capture conditions, measurement procedure and consistency over time. This motivates recording provenance and allowing correction of an estimated draft; it does not establish that computer vision is more accurate than a standardized manual measurement protocol.

For administration, the project requires identifiable access boundaries, catalog management, coach-profile review and inspection of operational records. Centralizing these functions can support oversight, but does not itself prove policy correctness, complete audit coverage or independent professional accreditation. For intelligent assistance, the identified need is to prepare contextual drafts and reminders; response quality, scheduled execution and human review must be evaluated separately.

\section{Limits and Inconveniences of the Existing Workflow}

The problem scenario leads to five design concerns. These are requirements to address and assess, rather than measured deficiencies shared by all existing products:

\begin{itemize}
    \item \textbf{Fragmented records:} Separate training, nutrition and coaching records make cross-domain review less direct and can require repeated entry of the same context.
    \item \textbf{Coordination overhead:} Independent program documents, appointments and messages require explicit reconciliation; the project does not quantify the time involved.
    \item \textbf{Uncertain progress interpretation:} Changes in capture or measurement conditions can affect comparability. Neither manual entry nor an AI estimate alone establishes body-composition accuracy.
    \item \textbf{Operational traceability:} Role-based interfaces and selected audit records must be assessed against the actions they actually protect and record.
    \item \textbf{Privacy and access boundaries:} Local captures, remotely stored records and external-service requests need distinct access and retention rules. Combining them in one application does not automatically resolve those risks.
\end{itemize}

\section{Proposed Solution}

GoFit proposes an integrated client, coach and administrator workflow organized into five architectural layers. This section states the intended response to the identified needs. The implementation evidence matrix in Table~\ref{tab:implementation-evidence} distinguishes present code paths, scoped verification and remaining work; the proposal is not a declaration that every target is complete.

\begin{enumerate}
    \item \textbf{Mobile Client Layer:} A shared Expo and React Native application provides client and coach interfaces for profile management, workout prescriptions and execution, progress, nutrition and coaching activities. It connects related records through account identity while leaving platform-specific support and complete workflow validation to separate checks.
    \item \textbf{AI and Automation Layer:} Local capture and computer-vision components prepare reviewable measurement estimates. Backend language-model requests prepare workout suggestions and coach-facing client-context briefings, while n8n exports define scheduled operational workflows. These paths do not establish measurement accuracy, post-consultation synthesis, mandatory review of every generated record or successful scheduled delivery.
    \item \textbf{Administration Layer:} A Next.js App Router portal supports protected management pages, coach-profile decisions, catalog maintenance and operational inspection. Administrative approval is a platform decision; audit coverage and authorization must be verified for each relevant action.
    \item \textbf{Backend Layer:} Authentication, relational records, access policies, storage, realtime subscriptions and server functions connect the interfaces. Their presence establishes architectural mechanisms rather than a complete security assessment or evidence that every integration is deployed.
    \item \textbf{External Integration Layer:} Stripe, LiveKit, Expo Push, Groq and food lookup services provide specialized payment, communication, notification, inference and nutrition capabilities. The October EUR payment follow-up is distinguished from internship-period delivery; recovery, media authorization and provider/device behavior retain their stated validation limits.
\end{enumerate}

'''
change(old,new,'Separate existing conditions, limitations and proposed solution')

change('The internship focuses on designing, architecting, and developing a complete end-to-end fitness platform from initial requirements specification through to full cloud deployment. The project was initiated based on a real market observation in the contemporary fitness and athletic training domain: most local fitness clubs, gyms, and independent personal coaches lack any digital tool to manage their daily activity, track client athletic performance, or deliver personalized programs online.',
'The internship concerns the analysis, design and implementation of a fitness and coaching platform, including deployment preparation and validation. Its problem statement considers fragmented training and coaching workflows. The retained material does not provide a survey supporting a claim that most local clubs or coaches lack digital tools; the existing-condition analysis below is therefore framed as the project scenario rather than a market-wide finding.','Project origin evidence boundary')

change('Sprint planning formalizes the partitioning of the Product Backlog into three sequential, time-boxed development sprints across the five-month graduation internship period (February to June 2026). This division adheres to a logical dependency model, ensuring that foundational infrastructure and core execution engines are thoroughly validated before dependent tracking and collaborative features are implemented:',
r'''The confirmed internship period is 26 January--26 July 2026. This report organizes its development account into three scope groups titled Sprint 1, Sprint 2 and Sprint 3, preceded by Sprint 0. These chapter labels identify the reported functional organization; the retained files do not establish a one-to-one mapping to three dated Scrum time boxes. The source plans use different numbering and must be distinguished from the report structure.

The planning pair \path{../docs/gantt/SCRUM_SPRINT_BREAKDOWN.md} and \path{../docs/gantt/GANTT_SCRUM.csv} defines 13 numbered iterations across the confirmed period. The alternative \path{../docs/gantt/SPRINT_BREAKDOWN.md} declares 22 iterations, whereas its companion \path{../docs/gantt/GANTT_SPRINTS.csv} lists 23 smaller entries across the same interval. The partial logbook follows the smaller-iteration numbering and retains identity placeholders; it does not independently resolve these alternatives. No confirmed execution log maps either scheme to the three development chapters. Exact chapter-level sprint dates are therefore left unverified rather than inferred from implementation files, migration identifiers or the later October audit.

The report's scope organization follows functional dependencies, without implying that every foundation was fully validated before later work began:''','Planning chronology and competing source plans')
change('Following implementation, a closing consolidation phase is dedicated to multi-tier deployment, end-to-end integration testing, performance optimization, and final report documentation.','Deployment preparation, integration checks and report consolidation are treated as closing activities. Their appearance in a plan does not establish completed release validation or publication. The later October checks are explicitly identified in the implementation and QA evidence.','Planned closing versus achieved release')
change('The development lifecycle was organized into three consecutive development sprints preceded by an initial preparation phase (Sprint 0). Each sprint executed the standard Scrum lifecycle: sprint planning, backlog refinement, daily tracking, implementation, validation testing, and sprint retrospective \\cite{scrumguide2020}.',
r'The report uses Sprint 0 and three development scope groups to explain the project. Scrum provides the reference for planning, refinement, implementation, review and retrospective activities \cite{scrumguide2020}; the retained planning alternatives do not independently establish that every event occurred at a documented cadence. The chronology and limits of the available sprint evidence are discussed in the sprint-planning section.','Methodology versus demonstrated events')
change('Sprint and Gantt documentation & Connects implementation work to Agile planning. & Sprint dates, objectives, deliverables, dependencies, release preparation.', 'Sprint and Gantt documentation & Records alternative planning schedules; not a completed execution log. & January--July dates, differing iteration schemes, objectives, dependencies and planned release activities.','Documentation table planning status')

# Chapter introductions and conclusions must describe their own evidence, not certify delivery.
change('Sprint 0 established the methodological and technical foundation of the GoFit project prior to feature implementation. It encompassed the formal identification of human actors, categorization of functional and non-functional requirements, specification of AI and privacy constraints, product backlog construction, sprint planning, and global use case modeling.',
'This chapter presents the preparatory requirements and planning framework designated Sprint 0: actors, functional and non-functional targets, AI and privacy boundaries, the product backlog and global use cases. It distinguishes the confirmed internship interval from competing iteration plans and from the later source and QA evidence.','Sprint 0 introduction')
change('Sprint 0 established the functional and technical base of the project. It clarified actors, requirements, backlog priorities, sprint grouping, and the global use case perimeter. The next chapter presents Sprint 1, focused on the mobile foundation and core workout features.',
'This chapter defined the actors, requirement targets, backlog priorities and principal user goals used to structure GoFit. The internship interval is confirmed, while exact mapping between the planning iterations and report scope groups remains unverified. The next chapter examines the mobile foundation and workout paths under the Sprint 1 heading.','Sprint 0 conclusion')
for n in (1,2,3):
    old=f'This chapter documents sprint {n} as an engineering increment rather than as a simple list of implemented screens. It presents the sprint objective, selected product backlog decomposed into engineering tasks, structural class model, refined use cases, sequence flow, architectural realisation, quality assurance validation matrix, and burn-down chart interpretation.'
    new=f'This chapter examines the scope designated Sprint {n} through planned tasks, cumulative domain views, selected use cases and interaction sequences, implementation descriptions and reconciled validation criteria. The models project the inspected implementation, while the retained October observations are later evidence. The closing management subsection states the limits of available progress-tracking data.'
    change(old,new,f'Sprint {n} chapter roadmap')
change('\nSprint 2 expanded GoFit with comprehensive progress tracking, on-device AI computer vision body measurements (MediaPipe BlazePose), daily nutrition logging with OpenFoodFacts barcode scanning, dietary preference filtering, and adaptive AI workout recommendations powered by Groq LLaMA-3.3.',
'\nThe Sprint 2 scope concerns progress history, nutrition and saved food records, measurement capture and review, recommendation requests and reminder configuration. It examines the corresponding source paths and distinguishes them from unverified barcode execution, fresh AI measurement accuracy, recommendation generation and scheduled delivery.','Sprint 2 introduction')
change('Sprint objective: Sprint 2 expanded GoFit with comprehensive progress tracking, on-device AI computer vision body measurements (MediaPipe BlazePose), daily nutrition logging with OpenFoodFacts barcode scanning, dietary preference filtering, and adaptive AI workout recommendations powered by Groq LLaMA-3.3.',
'The Sprint 2 objective is to connect workout history with progress, nutrition and assisted self-monitoring. The backlog records development and testing targets; its presence does not establish complete implementation or successful execution.','Sprint 2 objective')
change('Sprint 3 delivered the coach marketplace ecosystem, professional coach workspace, Stripe session pack monetization, LiveKit WebRTC video calls, AI coaching session notes (Groq LLaMA-3.3), and the comprehensive Next.js web administration portal.',
'The Sprint 3 scope concerns marketplace discovery, coach-client follow-up, purchases and appointments, communication components, coach-facing AI briefings and web administration. It separates these implementation paths from retained sandbox payment evidence and the outstanding booking, media, automation and administrative checks.','Sprint 3 introduction')
change('Sprint objective: Sprint 3 delivered the coach marketplace ecosystem, professional coach workspace, Stripe session pack monetization, LiveKit WebRTC video calls, AI coaching session notes (Groq LLaMA- 3.3), and the comprehensive Next.js web administration portal.',
'The Sprint 3 objective is to connect client, coach and administrator activities through shared records and controlled service boundaries. Its backlog remains a statement of planned work; the dated payment follow-up and scoped QA results are assessed separately.','Sprint 3 objective')
conclusions={
1:('Sprint 1 established the operational base of the mobile application. Authentication, onboarding, protected navigation, workout templates, active workout execution, persistence, and rest timer behavior became the foundation for later progress tracking. The next sprint builds on this foundation by transforming workout data into progress, measurement, notification, and nutrition-oriented features.',r'This chapter described authentication, client onboarding, workout prescriptions, embedded execution snapshots and rest-timer configuration. The sequences distinguish remote session creation, successful completion updates and conditional offline retry. Retained existing-account observations do not establish fresh onboarding, controlled background timer behavior or complete offline reconciliation. These limits remain visible in the sprint matrix and Table~\ref{tab:implementation-evidence}. The next chapter examines progress, measurements and nutrition.'),
2:('Sprint 2 transformed the mobile foundation into a progress-oriented experience. It connected exercise browsing, history, progress dashboards, body measurements, nutrition foundations, reminders, and AI-assisted measurement research. The sprint also clarified the limits of computer-vision estimation and the need for manual review. The next sprint extends GoFit from individual tracking to coach marketplace and administration workflows.',r'This chapter connected the workout foundation to progress records, nutrition data and assisted measurement drafts. The cumulative model retains the earlier workout concepts, while the measurement and nutrition sequences distinguish local processing, review and persistence. Display and permission observations remain narrower than fresh inference, numerical accuracy, positive barcode resolution or generated-workout validation. The next chapter examines coaching and administration without treating these pending checks as completed prerequisites.'),
3:('Sprint 3 completed the platform dimension of GoFit by adding coach marketplace, coach-client follow-up, administration, and LLM-assisted preparation workflows. This sprint connects users, coaches, administrators, backend services, and automations into a broader operational system. The following chapter therefore focuses on deployment, architecture, security, limitations, and closing considerations.',r'This chapter described marketplace, follow-up, communication and administrative paths within the cumulative domain model. The October native pack purchase and standalone API capture provide scoped sandbox evidence; they do not validate pack-credit redemption, production recovery or coach payouts. Two-party video, fresh scheduled briefing execution and complete coach-review side effects remain unverified. The next chapter consolidates architecture, deployment targets and the implementation evidence with these limitations intact.')}
for n,(old,new) in conclusions.items(): change(old,new,f'Sprint {n} conclusion')
change('This chapter presented the industrial and academic context of the GoFit project within Antigone Creative Agency, formulated the core problem statement, analyzed the limitations of fragmented fitness solutions, detailed the five architectural layers of the proposed platform, and justified the adoption of the Scrum Agile methodology \\cite{scrumguide2020} and UML 2.5 modeling language \\cite{omg2015uml}. The following chapter presents Sprint 0, establishing the foundation of actors, functional and non-functional requirements, product backlog decomposition, and global project organization.',
r'This chapter situated GoFit within its internship context, formulated the fragmented-workflow problem scenario and derived integration, traceability and privacy concerns. It presented the five-layer proposal separately from evidence of implementation and introduced Scrum and UML as methodological references \cite{scrumguide2020,omg2015uml}. The next chapter formalizes actors, requirement targets, backlog organization and the limits of the available planning chronology.','Project Study conclusion')

burn=r'''\section{Progress Tracking and Evidence Limits}

The retained backlog provides planned tasks and estimates, but no dated series of remaining work, scope changes or accepted completions is available for this report scope group. A burn-down chart and measured velocity cannot be reconstructed from the current source tree or later QA outcomes. No chart is therefore presented as evidence of sprint performance. The validation matrix reports the narrower implementation and execution evidence instead.'''
old='\\section{Sprint Burn Down Chart}\n\nThe burn-down chart is represented as a formal sprint-management artifact demonstrating team velocity, story point consumption, and burndown progress across the iteration.'
assert text.count(old)==3
text=text.replace(old,burn)
changes.append({'topic':'Three absent burn-down charts','occurrences':3,'old':old,'new':burn})

# Remove a redundant and technically obsolete table, retaining the detailed sequences.
start=text.rfind('\\begingroup',0,text.index('\\caption{Workout-session data flow}'))
end=text.index('\\endgroup',text.index('\\caption{Workout-session data flow}'))+len('\\endgroup')
change(text[start:end],r'The workout-session interactions and persistence boundaries are detailed in Figures~\ref{fig:seq_workout_ssd}, \ref{fig:seq_workout_detailed} and \ref{fig:seq_workout_offline}. Their associated use-case description distinguishes prescribed repetitions from entered weights and completion flags, and remote completion from a pending local retry.','Remove obsolete workout-flow table')
change('State management was organized with stores so that authentication state, profile state, workout state, timer preferences, and user settings could be reused across screens without duplicating logic. Service files were used to isolate communication with Supabase and local modules. This layered separation ensures strict modularity and maintainability across the mobile client codebase, decoupling UI presentation from state persistence and hardware drivers. Table \\ref{tab:pdf-41-19} summarizes the concrete software artifacts implemented during Sprint 1 mapped against their respective architectural tiers.',
r'Stores organize reusable authentication, profile, workout and timer state, while service modules separate selected data operations from screen code. Table~\ref{tab:pdf-41-19} maps these responsibilities to inspected file names; it is not a historical sprint-end inventory or proof of maintainability.','Replace obsolete component names and timing')
change('Architectural Tier & Technical Responsibility & Implemented Artifacts in Sprint 1', 'Architectural Tier & Technical Responsibility & Inspected artifacts for this scope','Component table evidence heading')
change('Presentation \\& Routing & Renders responsive interfaces and enforces role-aware navigation guards. & AuthNavigator, OnboardingNavigator, ClientTabNavigator, AuthScreen, OnboardingScreen, WorkoutSessionScreen.',
'Presentation \\& Routing & Organizes authentication, onboarding and workout interaction. & AuthNavigator.tsx, OnboardingNavigator.tsx and WorkoutSessionScreen.tsx.','Component table routing names')
change('Client State Management & Maintains reactive in-memory state and handles optimistic cache updates. & Zustand stores: authStore, workoutStore, timerStore, uiStore.',
'Client State Management & Organizes reusable application state. & authStore.ts, profileStore.ts, workoutsStore.ts, timerStore.ts and uiStore.ts.','Component table store names')
change('Domain Services & Encapsulates business rules, data transformations, and API communications. & authService.ts, workoutService.ts, offlineQueue.ts, userService.ts.',
'Domain Services & Implements authentication, workout data operations and completion retry. & services/auth.ts, services/workouts.ts and services/offlineQueue.ts.','Component table service names')
change('Hardware Integration & Bridges native device sensors, audio outputs, and tactile haptic feedback. & expo-haptics, expo-av, expo-video, Android background task triggers.',
'Hardware Integration & Connects selected timer, feedback and media paths to device APIs. & Expo haptic, audio and video integration code; background execution requires separate device evidence.','Component table hardware scope')
change('A workout session records what the user actually performed: start time, completion time, sets, reps, weights, notes, duration, and summary data.',
'A workout session stores timestamps, duration, notes and exercise snapshots with configured sets/repetitions, entered weights and completion flags. Those snapshots do not independently measure performed repetitions or RPE.','Adjacent workout terminology')

# Align front matter roadmaps with the actual revised chapters.
change('analyzes existing market solutions and their limitations','analyzes the fragmented-workflow scenario and its evidence limits','General Introduction chapter 1 roadmap')
change('and local offline data synchronization.','and conditional retry of existing-session completion updates.','General Introduction offline roadmap')
change('physical and logical deployment architectures, automated CI/CD pipelines, and final quality assurance testing.','physical and logical architecture views, deployment targets and evidence, and scoped quality assurance results.','General Introduction deployment roadmap')
change('followed by bibliographic references and technical appendices.','followed by bibliographic references.','Remove absent appendix promise')
change('Earlier sprint-level validation tables require separate reconciliation and must not be read as independently verified results on the strength of this follow-up.',
'The sprint-level matrices have been reconciled with this retained evidence; their original task identifiers do not turn later observations into verified sprint-period results.','Remove obsolete Step 4 pending statement')
change('Sprint dates, burn-down histories and unsupported chronology require the separate supervisor-checklist review; none is inferred from October source inspection.',
'The confirmed internship interval and the conflicting iteration plans are distinguished in the planning section. No dated burn-down history or exact chapter-to-iteration mapping is inferred from October source inspection.','Update completed supervisor review reference')

main.write_bytes(text.replace('\n','\r\n').encode('utf-8'))
for c in changes:
    if c.get('new'): c['revisedLine']=text[:text.index(c['new'])].count('\n')+1
(OUT/'corrections.json').write_text(json.dumps(changes,indent=2)+'\n',encoding='utf-8')
(OUT/'main-revision.diff').write_text(''.join(difflib.unified_diff(before.splitlines(True),text.splitlines(True),fromfile='step-4/main.tex',tofile='step-5/main.tex')),encoding='utf-8')
prior=REPORT/'qa/2026-10-24-step-4-sprint-artifacts'
v=json.loads((prior/'verification.json').read_text(encoding='utf-8'))
v.update(status='approved_by_user_compiler_dependency_blocked',step5Started=True,userApproval='proceed',approvalDate='2026-10-24')
(prior/'verification.json').write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
r=(prior/'README.md').read_text(encoding='utf-8').replace('**Content revised in the authoritative main.tex, awaiting user approval. Step 3 was approved by “proceed”; Step 5 has not started.**','**Approved by the user (“proceed”) before Step 5 began on 24 October 2026.**')
(prior/'README.md').write_text(r,encoding='utf-8')
manifest=json.loads((prior/'evidence-manifest.json').read_text(encoding='utf-8'))
for entry in manifest: entry['sha256']=hashlib.sha256((prior/entry['file']).read_bytes()).hexdigest()
(prior/'evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f'Applied {len(changes)} recorded corrections.')
