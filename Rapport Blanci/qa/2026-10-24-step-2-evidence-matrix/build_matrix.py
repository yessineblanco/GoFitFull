"""Rebuild the dated evidence index from current source and retained QA records."""
from pathlib import Path
import hashlib
import json

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
REPORT = ROOT / 'Rapport Blanci'
S = 'GoFitMobile/src/'
F = 'supabase/functions/'
A = 'admin-panel/'
LEDGERS = {'C': 'qa/2026-10-22/results.json', 'H': 'qa/2026-10-23-coach/results.json', 'A': 'qa/2026-10-23-admin/results.json'}
records = []

def add(mid, requirement, capability, state, source_scope, verified, limits, refs, cases, artifacts=()):
    sources = []
    for rel, anchor in refs:
        raw = (ROOT / rel).read_bytes()
        lines = raw.decode('utf-8-sig').splitlines()
        hits = [i for i, line in enumerate(lines) if anchor in line]
        assert hits, (mid, rel, anchor)
        i = hits[0]
        sources.append({'path': rel, 'line': i + 1, 'anchor': anchor, 'sha256': hashlib.sha256(raw).hexdigest(), 'excerpt': '\n'.join(lines[max(0, i-2):i+5])})
    evidence = []
    for role, identifiers in cases.items():
        ledger = json.loads((REPORT / LEDGERS[role]).read_text(encoding='utf-8'))
        for identifier in identifiers.split(','):
            case = next(c for c in ledger['cases'] if c['id'] == identifier)
            evidence.append({'ledger': LEDGERS[role], 'case': identifier, 'recordedStatus': case['status'], 'observation': case['actual']})
    for rel in artifacts:
        assert (REPORT / rel).is_file(), rel
    records.append({'id': mid, 'requirement': requirement, 'capability': capability, 'implementationStatus': state, 'sourceScope': source_scope, 'retainedVerification': verified, 'limitations': limits, 'sources': sources, 'qaCases': evidence, 'artifacts': list(artifacts), 'supplementary': requirement == 'Supplementary'})

add('M01', 'FR-01', 'Authentication and existing-account routing', 'Implemented paths',
    'Sign-in, registration, password-recovery services and existing-account routing are present.',
    'Android client/coach session relaunch and supplied coach/admin access observations are retained.',
    'Fresh registration/recovery, verification emails, token-storage guarantees and refresh behavior were not established by relaunch.',
    [(S+'services/auth.ts', 'async signIn('), (S+'services/auth.ts', 'async forgotPassword('), (S+'store/coachStore.ts', 'hasCompletedCoachOnboarding:')],
    {'C': 'AUTH-01,AUTH-02,AUTH-03,AUTH-04', 'H': 'AUTH-02,AUTH-03,AUTH-04,AUTH-05', 'A': 'AUTH-01'},
    ['qa/2026-10-23-coach/fixes/AUTH-03/README.md'])
add('M02', 'FR-01', 'Onboarding and profile preferences', 'Partial target',
    'Six-screen onboarding captures measurements, personal details, goal and nutrition fields; profile editors and a nutrition-only patch route exist.',
    'Existing profile/settings views and mocked nutrition-editor/modeled contrast corrections have evidence.',
    'The inspected onboarding lacks the full equipment/fitness-level questionnaire in FR-01. Fresh onboarding and recent editor/contrast native retests remain pending.',
    [(S+'navigation/OnboardingNavigator.tsx', 'name="OnboardingNutrition"'), (S+'screens/onboarding/OnboardingScreenNutrition.tsx', 'saveOnboardingData'), (S+'screens/nutrition/NutritionProfileScreen.tsx', 'const save = async')],
    {'C': 'SETTINGS-01,SETTINGS-02,SETTINGS-03,SETTINGS-04,SETTINGS-08'},
    ['qa/2026-10-22/fixes/SETTINGS-03/README.md', 'qa/2026-10-22/fixes/SETTINGS-08/README.md'])
add('M03', 'FR-02', 'Exercise catalog, search and filters', 'Implemented paths',
    'Exercise retrieval/search, muscle/equipment selection and exercise detail paths exist.',
    'Native catalog, category and detail observations passed; search/filter/media observations are partial.',
    'All filter combinations, catalog completeness and playback/provider failures were not verified.',
    [(S+'services/workouts.ts', 'async getExercises('), (S+'services/workouts.ts', 'async searchExercises('), (S+'screens/library/ExerciseSelectionScreen.tsx', 'muscle')],
    {'C': 'LIBRARY-01,LIBRARY-02,EXERCISE-01,EXERCISE-02,EXERCISE-03,EXERCISE-04'})
add('M04', 'FR-02', 'Custom workout prescriptions', 'Partial target',
    'Create/update/delete persist configured sets, reps, rest and array order; builder adds/removes entries. Summaries now count loaded entries without invented duration.',
    'A disposable one-exercise client workout was created, edited and removed. Summary regressions use mocked data.',
    'Dedicated reorder interaction and target-load prescription were not located in this builder; this does not exclude other paths. Validation and native summary retests remain incomplete.',
    [(S+'services/workouts.ts', 'async createCustomWorkout('), (S+'screens/library/WorkoutBuilderScreen.tsx', 'const removeExercise'), (S+'screens/library/WorkoutDetailScreen.tsx', 'summaryLoaded')],
    {'C': 'LIBRARY-03,LIBRARY-05,LIBRARY-06,LIBRARY-07,LIBRARY-08'}, ['qa/2026-10-22/fixes/LIBRARY-03/README.md'])
add('M05', 'FR-03', 'Active workout and rest timer', 'Partial target',
    'Session snapshots retain configured reps, per-set weights/completion flags; timer/audio/haptic control code exists.',
    'Controlled execution cases remain blocked. Earlier user operation reports are distinct from a retained locked-device trace.',
    'No independent performed-repetition or RPE input in the inspected path. Timing/completion/persistence require controlled execution; existing TypeScript errors include this screen.',
    [(S+'screens/library/WorkoutSessionScreen.tsx', 'const updateWeight'), (S+'screens/library/WorkoutSessionScreen.tsx', '// Start rest timer'), (S+'services/workouts.ts', 'async createWorkoutSession(')],
    {'C': 'SESSION-01,SESSION-02,SESSION-03,SESSION-04,SESSION-05,SESSION-06'})
add('M06', 'FR-03', 'Offline completion recovery', 'Partial target',
    'AsyncStorage stores completion payloads for existing session IDs; connectivity handling retries session updates.',
    'Source inspected; no retained offline/reconnect reconciliation run.',
    'Completion-update retry does not establish unrestricted offline creation, per-set journaling or loss/duplicate/conflict guarantees.',
    [(S+'services/offlineQueue.ts', 'async enqueue('), (S+'services/offlineQueue.ts', 'async syncAll('), (S+'screens/library/WorkoutSessionScreen.tsx', 'offlineQueueService.enqueue')], {'C': 'SESSION-07'})
add('M07', 'FR-04', 'Progress history and photo gallery', 'Implemented paths',
    'Statistics/consistency, saved biometrics, weight editing and photo listing/upload/delete paths exist.',
    'Existing chart controls, records, gallery/detail and saved-measurement views were inspected.',
    'Fresh photo upload/removal, new biometric persistence and every aggregate calculation remain unverified or partial.',
    [(S+'screens/progress/WorkoutStatisticsScreen.tsx', 'WorkoutStatisticsScreen'), (S+'services/progressPhotos.ts', 'export async function addProgressPhoto'), (S+'screens/profile/EditWeightHeightScreen.tsx', 'EditWeightHeightScreen')],
    {'C': 'PROGRESS-01,PROGRESS-02,PROGRESS-03,PHOTOS-01,PHOTOS-02,PHOTOS-03,MEASUREMENT-01'})
add('M08', 'FR-04', 'AI-assisted body-measurement drafts', 'Integration foundation',
    'Capture/review, pose/segmentation, height-based estimation, quality/debug fields exist in source.',
    'Saved history and camera-denial handling observed; fresh inference/edit-save/reference comparisons blocked.',
    'No supported numerical accuracy outcome. Native MediaPipe is platform-limited; iOS and fresh end-to-end inference need separate verification.',
    [(S+'screens/profile/BodyMeasurementScreen.tsx', 'analyzeBodySegmentation'), (S+'services/bodyMeasurementService.ts', 'async function runPrimaryPose(')],
    {'C': 'MEASUREMENT-01,MEASUREMENT-02,MEASUREMENT-03,MEASUREMENT-04,MEASUREMENT-05'})
add('M09', 'FR-05', 'Nutrition, saved meals, barcode and exclusions', 'Implemented paths',
    'Food search/log totals/goals, saved-meal operations, barcode lookup and preference/allergy name exclusions exist.',
    'Banana search and disposable food add/remove passed; meal templates, goal views and scanner denial have narrower evidence.',
    'Actual barcode recognition/provider lookup, reuse/edit and controlled exclusion fixtures remain incomplete. Name matching is not comprehensive allergen-safety evidence.',
    [(S+'services/nutrition.ts', 'async searchFoods('), (S+'services/nutrition.ts', 'async lookupFoodByBarcode('), (S+'screens/nutrition/AddFoodScreen.tsx', 'const exclusions =')],
    {'C': 'NUTRITION-01,NUTRITION-02,NUTRITION-03,NUTRITION-04,NUTRITION-05,NUTRITION-06,NUTRITION-07'})
add('M10', 'FR-06', 'Coach discovery and reviews', 'Implemented paths',
    'Marketplace/details and rating/review retrieval paths exist.',
    'Marketplace and coach details opened; availability observations are partial.',
    'Approval labels do not independently establish professional accreditation or authentic reviews. Review submission/all filters not executed.',
    [(S+'services/marketplace.ts', 'async getCoachReviews('), (S+'screens/marketplace/CoachDetailScreen.tsx', 'reviews.map(')],
    {'C': 'COACHING-01,COACHING-02,COACHING-03'})
add('M11', 'FR-06', 'Sandbox pack purchase and credits', 'Scoped implementation verified',
    'Native checkout uses server-priced EUR pack intent and verified fulfillment with paid snapshot/reference/credits.',
    'One Android EUR129/12-credit sandbox purchase, saved row, admin display and actual replay verified.',
    'Not a complete payment certification: recovery/webhooks, declines/3DS, refunds, payouts and release/iOS remain unverified. Older blocked payment rows do not override the narrower dated follow-up.',
    [(S+'screens/marketplace/CoachDetailScreen.tsx', 'const handlePurchasePack'), (S+'services/sessionPacks.ts', 'async purchasePack('), (F+'stripe-payment/index.ts', 'body.action === "fulfill_pack"')],
    {'C': 'COACHING-07', 'A': 'TX-01'}, ['qa/2026-10-22/fixes/COACHING-07/payment-fulfillment/README.md'])
add('M12', 'FR-06', 'Availability and standalone paid booking', 'Scoped implementation verified',
    'Saved duration/Berlin availability feed server quote/reservation, manual capture, overlap and payment-field protection.',
    'EUR60/60-minute session capture/readback/admin/replay verified by API; eight live API cases and 13 rollback database checks retained.',
    'Native checkout and two-client native conflicts pending. Pack-credit createBooking/deduct_session is a separate branch whose atomicity is not established by this test. Recovery/production checks incomplete.',
    [(S+'services/bookings.ts', 'async getSessionTerms('), (S+'services/bookings.ts', 'async createBooking('), (F+'stripe-payment/index.ts', 'body.action === "create_session"'), ('database/migrations/20261024122314_verified_session_payments.sql', 'reserve_paid_session')],
    {'H': 'PROFILE-03,CAL-03', 'C': 'COACHING-06,COACHING-09'}, ['qa/2026-10-24-session-payments/README.md', 'qa/2026-10-23-coach/fixes/PROFILE-03/README.md'])
add('M13', 'FR-06', 'Messaging and consultation media', 'Integration foundation',
    'Chat persistence/realtime and video/token-service paths exist; video is a related consultation extension.',
    'Conversation lists/entry states inspected; two-party message/call execution blocked.',
    'Exchange/attachments, call sound/video/reconnect, room authorization and encryption guarantees need separate evidence. No successful consultation or end-to-end encryption is certified.',
    [(S+'services/chat.ts', 'async sendMessage('), (S+'services/chat.ts', 'subscribeToMessages('), (S+'services/videoCall.ts', 'async generateToken('), (F+'generate-video-token/index.ts', 'serve(')],
    {'C': 'COACHING-10,COACHING-11,COACHING-12,COACHING-13', 'H': 'CHAT-04,CAL-06,CAL-07'})
add('M14', 'FR-07', 'Coach roster, progress, notes and check-ins', 'Implemented paths',
    'Client-management/progress/private-note and check-in schedule/response services exist.',
    'Roster/detail/private-note CRUD and scoped progress/query corrections have retained observations.',
    'Populated check-ins, schedule submission and full photo access need controlled fixtures; empty-state passes are not full coaching-workflow validation.',
    [(S+'services/clientManagement.ts', 'async getCoachClients('), (S+'services/checkIns.ts', 'async getClientCheckInState('), (S+'screens/coach-app/ClientNotesScreen.tsx', 'ClientNotesScreen')],
    {'H': 'CLIENT-01,CLIENT-03,CLIENT-04,CLIENT-06,CLIENT-07,CLIENT-08'}, ['qa/2026-10-23-coach/fixes/DASH-04/README.md', 'qa/2026-10-23-coach/fixes/CLIENT-04/README.md'])
add('M15', 'FR-07', 'Workout/meal programs and assignment', 'Implemented paths',
    'Program model supports workout/meal/both per-day data; create/update/template services and builder/list screens exist.',
    'Lists, new-program validation and client assigned-program view have scoped records.',
    'Controlled populated creation/edit/assignment not completed. Template/cleanup UI reachability must be established; a service method does not prove a full editor or delivered notification.',
    [(S+'services/programs.ts', 'export interface ProgramDay'), (S+'services/programs.ts', 'async create('), (S+'services/programs.ts', 'async duplicateAsTemplate('), (S+'screens/coach-app/ProgramBuilderScreen.tsx', 'ProgramBuilderScreen')],
    {'H': 'PROGRAM-01,PROGRAM-02,PROGRAM-03,PROGRAM-04,PROGRAM-05', 'C': 'COACHING-05'})
add('M16', 'FR-07', 'Coach-facing AI context briefing', 'Partial target',
    'Client-specific cached briefing service and pre-session prompt use profile, workout history and notes.',
    'Source and historical briefing-related inbox observations; no fresh generation/quality result retained.',
    'This differs from required post-session consultation synthesis; it does not establish processing of a completed consultation or advice quality.',
    [(S+'services/aiSessionNotes.ts', 'async generateBriefing('), (F+'ai-session-notes/index.ts', 'Create a concise pre-session briefing')], {'H': 'DASH-02'})
add('M17', 'FR-08', 'Admin access and catalog operations', 'Implemented paths',
    'Profile-role proxy, user/coach pages, server-side catalog CRUD and approved atomic workout-save RPC paths exist.',
    'Role checks/disposable CRUD and deletion-audit/audit-API retests are retained.',
    'Selected checks do not certify every policy/endpoint. User deletion/role changes, bulk/media and all failure paths remain incomplete.',
    [(A+'proxy.ts', 'export async function proxy('), (A+'app/api/workouts/route.ts', 'export async function POST('), (A+'app/api/exercises/[id]/route.ts', 'export async function DELETE('), (A+'app/api/audit-logs/route.ts', 'export async function GET(')],
    {'A': 'AUTH-01,AUTH-02,AUTH-03,AUTH-04,EX-04,EX-05,EX-06,WORK-03,WORK-05,USER-05,AUDIT-02,AUDIT-03'}, ['qa/2026-10-23-admin/fixes/WORK-05/README.md', 'qa/2026-10-23-admin/fixes/AUDIT-02/README.md', 'qa/2026-10-23-admin/fixes/AUDIT-03/README.md'])
add('M18', 'FR-08', 'Review, financial inspection and analytics', 'Implemented paths',
    'Coach status route, transaction/audit views, profile-count dashboard, CSV and saved-view paths exist.',
    'Review confirmation/cancel, payment mode/reference, account/profile label reconciliation, CSV and saved-view operations have scoped checks.',
    'Actual approval/rejection, document verification, all BI arithmetic, refunds/payouts and large Auth listing remain unverified. Transactions sandbox exclusion does not certify other aggregates.',
    [(A+'app/api/coaches/route.ts', 'export async function PATCH('), (A+'app/api/transactions/route.ts', 'export async function GET('), (A+'lib/analytics.ts', 'export async function getEngagementMetrics(')],
    {'A': 'COACH-02,COACH-03,COACH-04,TX-01,DASH-03,DASH-04,DASH-05,DASH-06'}, ['qa/2026-10-23-admin/fixes/DASH-03/README.md', 'qa/2026-10-24-session-payments/README.md'])
add('M19', 'Supplementary', 'Adaptive workout recommendation', 'Integration foundation',
    'Empty-history recommendation entry and Edge generation function exist.',
    'Regular account history blocked generation/review/save; no timing result retained.',
    'Additional report capability, not a new numbered FR. Reachable generation/output/save/reopen need controlled execution; no 720-ms result is supported.',
    [(S+'screens/home/HomeScreen.tsx', '!loading && sessions.length === 0'), (F+'ai-workout-recommendation/index.ts', 'serve(')], {'C': 'AI-01,AI-02,AI-03'})
add('M20', 'Supplementary', 'Operational workflows and notification delivery', 'Artifacts present',
    'Five n8n exports, start instructions and notification-service code are present.',
    'Historical inbox display observed; no retained fresh scheduled run/provider receipt/duplicate-delivery result.',
    'Cross-cutting support, not a new numbered FR. Exports do not prove active hosting, secrets, cron operation or production delivery.',
    [('docs/automation/n8n/README.md', 'portable n8n workflow exports'), ('docs/automation/n8n/workflows/coach-daily-digest-v1.json', 'scheduleTrigger'), (S+'services/pushNotification.ts', 'async send(')],
    {'C': 'HOME-04,AUTOMATION-01', 'H': 'DASH-02', 'A': 'DASH-07,DASH-08'})

assert len(records) == 20
payload = {'date': '2026-10-24', 'step': 2, 'status': 'draft_awaiting_user_review', 'recordCount': 20, 'supplementaryRecords': 2,
    'numberedRequirementCoverage': sorted({r['requirement'] for r in records if not r['supplementary']}),
    'method': 'Actual source inspection plus retained QA artifacts; no new application/backend execution',
    'implementationStatusDefinitions': {
        'Implemented paths': 'Relevant source paths identified; full requirement satisfaction not inferred.',
        'Partial target': 'An inspected path differs from or omits a stated target capability.',
        'Integration foundation': 'Integration source exists; complete execution remains unverified.',
        'Scoped implementation verified': 'A narrowly named scenario has retained execution evidence; stated limits still apply.',
        'Artifacts present': 'Versioned exports/instructions do not establish a running deployment.'}, 'records': records}
(OUT/'matrix.json').write_text(json.dumps(payload, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
print(f'Indexed {len(records)} capability records across eight numbered FR domains and two supplementary capabilities.')

lines = ['# Step 2 — Detailed implementation evidence matrix', '',
    '**Status: draft awaiting user review.** The eight numbered FR domains are covered by 18 capability records, plus two supplementary records. M01–M20 are audit labels, not new requirements or sprint tasks.', '',
    'Evidence is dated 22–24 October 2026 and does not establish internship-period completion. Source presence is not deployment or execution proof. The matrix uses retained QA artifacts; no new application/backend test was executed.', '',
    'Implementation extent and verification are separate. Dated follow-ups supersede only their specified earlier findings; baseline blocked cases remain unrun unless explicitly retested. [matrix.json](matrix.json) records source hashes/excerpts and the cited case observations/statuses.', '',
    'C = client ledger; H = coach ledger; A = admin ledger.', '']
for status, definition in payload['implementationStatusDefinitions'].items():
    lines.append(f'- **{status}:** {definition}')
lines += ['', '| ID | Requirement | Capability and source scope | Implementation extent | Retained verification | Limitations |',
    '| --- | --- | --- | --- | --- | --- |']
roles = {path: role for role, path in LEDGERS.items()}
for row in records:
    cases = '; '.join(roles[e['ledger']] + ': ' + e['case'] for e in row['qaCases'])
    cells = [row['id'], row['requirement'], row['capability'] + '. ' + row['sourceScope'], row['implementationStatus'], row['retainedVerification'] + ' Cases: ' + cases + '.', row['limitations']]
    lines.append('| ' + ' | '.join(cell.replace('|', '\\|').replace('\n', ' ') for cell in cells) + ' |')
lines += ['', '## Source and retained-artifact index', '',
    'Source links refer to actual workspace files at the recorded lines. Hashes/excerpts in the JSON index freeze this inspection state; line numbers can move after later edits. These are implementation pointers, not additional execution evidence.', '']
for row in records:
    lines += [f"**{row['id']} — {row['capability']}**", '']
    for source in row['sources']:
        target = '/' + (ROOT/source['path']).as_posix() + ':' + str(source['line'])
        lines.append(f"- [{source['path']}:{source['line']}](<{target}>) — `{source['anchor']}`")
    for artifact in row['artifacts']:
        target = '/' + (REPORT/artifact).as_posix()
        lines.append(f'- [Retained follow-up: {artifact}](<{target}>)')
    lines.append('')
lines += ['## Boundaries', '',
    '- The main report contains the eight-domain summary. This file supplies sub-capability, source and case detail.',
    '- No complete FR domain is certified by this matrix. Narrow successes remain distinct from missing inputs, unrun integrations and source-only corrections.',
    '- Encryption, measurement accuracy, offline behavior, payments, video and platform support require the separate Step 3 claims audit; the matrix records their evidence boundaries without declaring that audit complete.',
    '- Earlier sprint tables, dates and diagrams are unchanged and require the planned later cross-check.',
    '- Existing QA screenshots remain local evidence; no synthetic screenshot, credential or new deployment is introduced.', '']
(OUT/'matrix.md').write_text('\n'.join(lines), encoding='utf-8')
print('Wrote detailed Markdown matrix and source/artifact index.')
