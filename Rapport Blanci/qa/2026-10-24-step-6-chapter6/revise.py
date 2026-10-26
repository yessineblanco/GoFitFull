from pathlib import Path
import json,hashlib,difflib,re

OUT=Path(__file__).resolve().parent
REPORT=OUT.parents[1]
main=REPORT/'main.tex'
before=main.read_text(encoding='utf-8')
(OUT/'main-before.txt').write_text(before,encoding='utf-8')
text=before
changes=[]
def replace(old,new,topic):
    global text
    start=text.index('\\chapter{Deployment and closing phase}')
    tail=text[start:]
    assert tail.count(old)==1,(topic,tail.count(old))
    old_start=before.index(old,before.index('\\chapter{Deployment and closing phase}'))
    changes.append({'topic':topic,'old':old,'new':new,'originalLine':before[:old_start].count('\n')+1})
    text=text[:start]+tail.replace(old,new)
def section(start,end,new,topic):
    a=text.index(start,text.index('\\chapter{Deployment and closing phase}'))
    b=text.index(end,a)
    replace(text[a:b],new+'\n\n',topic)

replace('The implementation, local simulation, containerized orchestration, and deployment of the multi-tier GoFit platform required a high-performance engineering environment spanning developer workstations, mobile testing hardware, virtualized emulators, and cloud hosting infrastructure. The following subsections detail the material specifications and software toolchain utilized throughout the development lifecycle.',
'This section identifies the local development environment, the retained test-device context and the principal runtime dependencies. It distinguishes observed execution from configuration and deployment targets.','Working-environment scope')
replace('The development, local simulation, containerized orchestration, and compilation of the GoFit mobile and web ecosystems were conducted on a dedicated high-performance workstation supplemented by mobile testing devices and cloud services.',
'The October audit used a local Windows workspace and separate Android QA development packages. The available records do not independently establish exact internship workstation specifications or a completed emulator test campaign.','Hardware evidence boundary')
replace('\\caption{Hardware and material environment specifications}', '\\caption{Development and test environments supported by retained evidence}','Material table scope')
replace('Hardware/Device & Technical Specifications & Operational Role in GoFit Project', 'Environment & Retained observation & Interpretation and limits','Material table columns')
replace('Development Workstation & 13th Gen Intel(R) Core(TM) i7- 13650HX (14 cores/20 threads: 6 P-cores up to 4.90 GHz, 8 E-cores up to 3.60 GHz), 24 GB DDR5 4800 MHz Dual-Channel RAM, 512 GB PCIe 4.0 NVMe SSD, Windows 11 Pro 64-bit (Build 26H2) & Full-stack development, Expo Metro bundler, Next.js Node.js server, Docker n8n container runtime, and local compilation.',
'Local development workspace & Windows filesystem; retained Metro and local Next.js QA records & Supports the recorded development checks. Processor, memory, disk specification and Windows release were not independently verified.','Unsupported workstation specifications')
replace('Android Emulator & Google Pixel 7 Virtual Device running Android 14.0 (API Level 34, Google APIs ARM64/x86 64 translation, 4 \\_ GB virtual RAM) & Simulating cross-resolution responsiveness, deep linking, background timers, audio ducking, and permission dialogs. \\\\ \\hline\n','', 'Remove unsupported emulator campaign')
replace('Physical Android Device & Physical Android Smartphone running Android 14, USB debugging, ARM64-v8a architecture, physical camera sensor & Hardware-accelerated MediaPipe BlazePose and Selfie Segmentation camera testing, \\seqsplit{realaccelerometer/gyroscope,} and haptics.',
'Physical Android QA device & Samsung SM-S928B; Android 17/API 37; development packages & Context for the retained October observations. Wireless debugging and development builds do not certify release startup, fresh measurement inference or locked-device timer behavior.','Correct device context')

replace('TypeScript & TypeScript 5.3+ (Strict Mode enabled) & Static type safety across mobile applications, web admin panel, and Deno Edge Functions.',
'TypeScript & Mobile manifest: \\texttt{\\string~5.9.2}; admin manifest: \\texttt{\\string^5}; strict enabled in both client configurations & Static checking is configured. The retained mobile check has 12 diagnostics; the administrative check passed. These settings do not prove runtime correctness or a Deno check.','Declared TypeScript versions versus check results')
replace('Stripe integration & Native PaymentSheet SDK and PaymentIntent Edge Function & Checkout followed by separate client-triggered application writes; verified fulfilment and payout settlement are not established by this path.',
'Stripe integration & Native SDK 0.50.3 in the mobile manifest; PaymentIntent Edge Function & Server-priced EUR checkout and verified fulfilment. Android pack and standalone API/admin sandbox evidence have distinct scopes; recovery, refunds and payouts remain unverified.','Replace stale payment baseline')
replace('Git \\& GitHub & Git 2.45+, GitHub Enterprise Repository & Distributed version control, branch-based feature tracking, and collaborative code reviews. \\\\ \\hline\n','', 'Remove unsupported Git version and hosting tier')
replace('Visual Studio Code/Antigravity & VS Code/Google Antigravity Advanced Agentic IDE & Agentic pair programming, schema design, linting, debugging, and report generation. \\\\ \\hline\n','', 'Remove unsupported IDE inventory')
replace('The software toolchain combines cross-platform mobile runtimes, reactive web frameworks, serverless edge computing, on-device machine learning, workflow automation engines, and version control infrastructure.',
r'Table~\ref{tab:pdf-88-43} records selected manifest declarations and inspected integration roles. A package declaration identifies a dependency target, rather than a successful build or executed feature. Native integration and validation limits are described with the corresponding architecture and QA evidence.','Single toolchain reference')

# Preserve detailed architecture figures; remove a second equivalent mobile-layer table.
section('\\subsection{GoFit Mobile Application Architecture}', '\\subsection{GoFit Administration Panel Architecture}',
r'''The mobile responsibilities summarized above are selected boundaries rather than mandatory call chains: screen code can access configured clients directly, stores coordinate some shared state, and native inference remains device-specific. The detailed workout, authentication, measurement and nutrition sequences provide the operation-level persistence boundaries.''','Consolidate duplicate mobile architecture inventory')
replace('The admin panel should be validated with at least two account types: an administrator account that can access management screens and a normal account that must be blocked or redirected. This distinction is important because the panel can manage sensitive platform data such as coach validation status, user records, exercise content, transactions, and notifications.',
r'The retained administrative QA includes selected administrator, unauthenticated and non-admin access checks. These scoped results are summarized in Section~\ref{sec:qa-evidence}; they do not certify every route, policy or destructive operation.','Align access-check description with retained QA')
section('The BI architecture follows a protected data-to-dashboard pipeline.', '\\subsection{Supabase Backend, Data Security, and Realtime Services}',
r'''The BI service modules read daily metric views, including \texttt{bi\_finance\_daily}, \texttt{bi\_user\_lifecycle\_daily}, \texttt{bi\_coach\_ops\_daily} and \texttt{bi\_client\_health\_daily}, then prepare dashboard data. Routes under \texttt{/api/bi} support exports, saved views, snapshots and digest-related operations. These are source-defined responsibilities; selected CSV, saved-view and population-label checks do not validate every aggregate or scheduled route.

The finance scope is primarily gross pack sales. Available history constrains lifecycle/cohort interpretation, and risk queues are operational indicators. The sandbox exclusion verified for the Transactions live total does not certify every BI finance aggregate; card payments, wallet ledger entries and coach payouts must remain distinct.''','Tighten BI description and metric limits')

# Consolidate three long methodology/tool inventories, preserving disclosure.
section('\\subsection{AI-Assisted Development Methodology}', '\\subsection{n8n Automation Layer}',
r'''\subsection{Development Assistance and Review Procedure}

AI assistants, including Codex, supported repository inspection, implementation proposals, debugging, diagram drafts and report revision. Connected tools provided file, browser and selected backend context. These tools supplied material for review rather than proof that a feature was implemented, deployed or tested.

The review procedure compared generated claims with source files, examined changes and retained the relevant execution artifacts when checks were performed. Missing execution evidence remains explicit in the QA matrix. Generated documentation and mock-based tests cannot establish native behavior, provider outcomes or historical sprint completion.

The present report is maintained in LaTeX. Earlier document-generation scripts are part of the drafting history; their existence does not verify the current report's content or the application. Responsibility for accepting the implementation and academic claims remains with the author.''','Consolidate Codex, MCP and complete-toolchain repetition')

replace('GoFit includes an automation layer implemented with n8n workflow exports located in \\seqsplit{docs/automation/n8n/workflows.} These workflows are part of the product because they perform scheduled operational work that would otherwise require manual monitoring by coaches or administrators. The n8n layer is separate from the mobile application and the admin panel: it runs in a trusted automation environment, calls Supabase through REST endpoints, and creates persistent rows in the database.',
r'Five n8n exports in \path{../docs/automation/n8n/workflows} define scheduled briefing, reminder and digest operations using backend REST calls. They require a separate privileged runtime. The exports establish intended queries and writes, without establishing active hosting or successful scheduled execution.','Automation source versus execution')
replace('The v1 automation design uses self-hosted n8n Community Edition as the practical free option. Runtime secrets are injected through environment variables. SUPABASE\\_URL identifies the backend project, \\seqsplit{SUPABASE\\_SERVICE\\_ROLE\\_KEY} allows controlled server-side access, and GROQ\\_API\\_KEY is required only by the AI Session Prep workflow. These secrets must never be committed to the repository, placed in mobile code, or exposed in client-side admin bundles.',
r'The accompanying Docker quick-start documents a self-hosted runtime and environment-variable configuration. The service-role credential belongs in that server boundary; the Groq credential is needed by AI Session Prep. Configuration instructions do not establish that secrets were securely provisioned or that a container is running.','Remove unverified runtime configuration claims')
replace('\\caption{n8n workflows implemented in GoFit}','\\caption{Configured n8n workflow logic in the supplied exports}','Automation table caption scope')
replace('Workflow & Trigger & Data read & Actions performed & Guard/control','Workflow & Configured trigger & Data read & Defined actions & Source guard/control','Automation table columns scope')
section('\\begingroup\n\\footnotesize\n\\setlength{\\tabcolsep}{3pt}\n\\renewcommand{\\arraystretch}{1.20}\n\\setlength{\\LTpre}{5pt}\n\\setlength{\\LTpost}{10pt}\n\\begin{longtable}{|L{3.67cm}|L{5.29cm}|L{5.73cm}|}\n\\caption{n8n security, limits, and evidence requirements}', '\\begin{figure}[H]\n\\centering\n\\includegraphics[width=0.92\\linewidth]{figures/n8n_automation.png}',
r'''The exported workflows create in-app notification records rather than direct push deliveries. UTC comparisons and existing-row checks implement the documented scheduling and duplicate guards, without establishing concurrency-safe exactly-once execution. Runtime authorization, client visibility of coach briefings and secret handling require their own deployment checks. No fresh scheduled run, replay-under-concurrency result or provider delivery receipt is retained.''','Replace repetitive n8n checklist table with specific limits')

# Repair identifiers in the retained technical automation table, not its layout.
for old,new in [
('an ai session notes \\_ \\_ row',r'an \texttt{ai\_session\_notes} row'),
('data.kind = ai session ready. \\_ \\_',r'\texttt{data.kind = ai\_session\_ready}.'),
('samecoach/client','same coach/client'),
('data.kind = booking starting so \\_ \\_ on.',r'\texttt{data.kind = booking\_starting\_soon}.'),
('Enabled check in schedules, \\_ \\_ current UTCdate/time, and check in responses \\_ \\_ for the day.',r'Enabled \texttt{check\_in\_schedules}, current UTC date/time and \texttt{check\_in\_responses} for the day.'),
('data.kind = check in due. \\_ \\_',r'\texttt{data.kind = check\_in\_due}.'),
('an admin notifications \\_ row',r'an \texttt{admin\_notifications} row'),
('automation failures \\_ count remains 0 in \\_ v1',r'\texttt{automation\_failures\_count} remains 0 in v1')]:
    replace(old,new,'Retained automation identifier: '+old[:35])

section('\\subsection{Libraries, Dependencies, and Device Feedback}', '\\section{Deployment}',
r'''\subsection{Device Feedback and Validation Scope}

The session screen contains haptic calls for set completion and selected actions; timer configuration also exposes feedback preferences. Such calls establish an intended device interaction, not observed vibration timing or locked-device delivery. The controlled timer scenario remains unverified in Section~\ref{sec:qa-evidence}. Package families and platform boundaries are summarized once in Table~\ref{tab:pdf-88-43}; a dependency inventory does not demonstrate complete feature coverage.''','Consolidate mobile-library and haptic-coverage tables')
replace('Earlier read-only inspection found 60 registered migration entries and 40 public tables in the healthy project;',
r'The 21 October metadata snapshot in \path{deployment-verification.md} recorded 60 migration entries and 40 public tables; later payment migrations have their separate dated evidence. This earlier count is not a current complete migration inventory, and','Date historical migration count')
replace('The matrix records evidence boundaries. AI/security claims are qualified in the technical discussions and the retained claims review; reconciliation of sprint artifacts remains a separate review task.',
'The matrix records evidence boundaries. AI/security claims are qualified in the retained claims review, and the sprint-artifact cross-reference identifies the subsequent reconciliation.','Remove stale future-review statement')

for c in changes:
    if c['new']: c['revisedLine']=text[:text.index(c['new'])].count('\n')+1
main.write_bytes(text.replace('\n','\r\n').encode('utf-8'))
(OUT/'corrections.json').write_text(json.dumps(changes,indent=2)+'\n',encoding='utf-8')
(OUT/'main-revision.diff').write_text(''.join(difflib.unified_diff(before.splitlines(True),text.splitlines(True),fromfile='step-5/main.tex',tofile='step-6/main.tex')),encoding='utf-8')
prior=REPORT/'qa/2026-10-24-step-5-supervisor'
v=json.loads((prior/'verification.json').read_text(encoding='utf-8'))
v.update(status='approved_by_user_with_chronology_limits',step6Started=True,userApproval='proceed',approvalDate='2026-10-24')
(prior/'verification.json').write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
r=(prior/'README.md').read_text(encoding='utf-8').replace('**Revised in the authoritative main.tex; awaiting user approval before Step 6.**','**Approved by the user (“proceed”) before Step 6 began on 24 October 2026.**')
(prior/'README.md').write_text(r,encoding='utf-8')
manifest=json.loads((prior/'evidence-manifest.json').read_text(encoding='utf-8'))
for entry in manifest: entry['sha256']=hashlib.sha256((prior/entry['file']).read_bytes()).hexdigest()
(prior/'evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f'Applied {len(changes)} Chapter 6 corrections.')
