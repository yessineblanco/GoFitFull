"""Apply the reviewed claim corrections to the existing authoritative source."""
from pathlib import Path
import json

OUT = Path(__file__).resolve().parent
REPORT = OUT.parents[1]
path = REPORT / 'main.tex'
before = (OUT/'main-before.txt').read_text(encoding='utf-8')
text = path.read_text(encoding='utf-8')
changes = []

def line(prefix, replacement, topic):
    global text
    found = [s for s in text.splitlines() if s.startswith(prefix)]
    assert len(found) == 1, (prefix, len(found))
    old = found[0]
    changes.append({'topic': topic, 'originalLine': before[:before.index(old)].count('\n')+1, 'before': old, 'after': replacement})
    text = text.replace(old, replacement, 1)

line('    \\item \\textbf{External Integration Layer:}',
     r'    \item \textbf{External Integration Layer:} Includes Expo Push, LiveKit video-token and consultation components, Stripe payment APIs, and Groq inference endpoints. Their integration paths do not establish successful delivery, consultation authorization, payment recovery, or measured response-time guarantees.', 'Integration scope')
line('    \\item \\textbf{NFR-01:',
     r'    \item \textbf{NFR-01: Security and Access Governance:} Protected operations should authenticate callers and enforce record-level authorization. Exposed application tables should use appropriate RLS policies, and privileged credentials should remain in trusted server-side, administration or automation contexts. Enabled RLS and JWT validation are controls to verify, not proof that every policy or handler is correct.', 'Security targets')
line('    \\item \\textbf{NFR-02:',
     r'    \item \textbf{NFR-02: Performance and Real-Time Responsiveness:} The intended targets are smooth mobile rendering, interaction latency below 100 milliseconds and administrative page loading below 1.5 seconds under a defined workload. The earlier 60 FPS objective is a design target. No retained profiling or load-test run establishes these values, background-timer reliability or large-dataset responsiveness.', 'Unmeasured performance')
line('    \\item \\textbf{NFR-03:',
     r'    \item \textbf{NFR-03: Maintainability, Modularity, and Code Quality:} Presentation, state, domain services and migrations should remain separated, with shared TypeScript interfaces supporting consistency. Full type safety is an objective rather than an achieved guarantee: the latest mobile project-wide check retains the 12 diagnostics reported in the QA section.', 'Type-safety boundary')
line('    \\item \\textbf{NFR-04:',
     r'    \item \textbf{NFR-04: Usability, Ergonomics, and Accessibility:} Interfaces should provide readable contrast, text scaling, English/French localization, feedback and clear empty states. The retained settings contrast checks cover selected styles and modeled surfaces; native visual acceptance and whole-application accessibility are not established.', 'Accessibility target')
line('    \\item \\textbf{NFR-05:',
     r'    \item \textbf{NFR-05: Scalability and Extensibility:} Modular services, appropriate relational constraints and indexing should support future growth and integrations. Horizontal scalability, deployment capacity and interoperability require explicit workload and integration tests; schema structure alone does not demonstrate them.', 'Scalability target')
line('    \\item \\textbf{Human-in-the-Loop Review:}',
     r'    \item \textbf{Human-in-the-Loop Review:} Measurement drafts are presented for correction before the user saves them, and recommended workouts have a user-save interaction. Coach briefings differ: the backend can cache generated text when requested, before a separate review action. Advisory presentation therefore does not mean that every generated output requires human confirmation before any database write.', 'AI persistence')
line('    \\item \\textbf{Context-Scoped Prompts:}',
     r'    \item \textbf{Context-Scoped Prompts:} Backend templates constrain the requested output and recommendation code checks exercise identifiers. The briefing request includes selected profile data, workout history and private coach notes sent to Groq; anonymization is not established. Instructions and output checks mitigate some risks but do not prove prevention of prompt injection, hallucinations or unsafe advice.', 'AI data boundary')
line('    \\item \\textbf{Privileged Credential Isolation:}',
     r'    \item \textbf{Privileged Credential Isolation:} Privileged database and provider secrets should remain in trusted backend, administration and n8n environments. The inspected payment/video code reads provider secrets server-side; public client configuration is a separate category. This source review is not a complete audit of compiled binaries, logs, deployment settings or repository history.', 'Credential scope')
line('    \\item \\textbf{On-Device Computer Vision Processing:}',
     r'    \item \textbf{On-Device Computer Vision Processing:} The inspected pose/segmentation flow reads local captures and stores reviewed numerical results rather than uploading captures for that inference path. Progress-photo uploads and external language-model requests are separate flows. Local inference does not establish complete privacy, storage-security or cross-platform guarantees.', 'Local inference privacy')
line('The project evolved from a keypoint-only prototype',
     'The project evolved from a keypoint-only prototype toward pose and segmentation integration. MoveNet Lightning is used through the TensorFlow Lite bridge as an initial/fallback path. MediaPipe supplies a richer landmark representation and an Android native integration; improved accuracy or speed relative to the fallback is not established by a controlled comparative benchmark.', 'Model comparison')
line('MediaPipe Image Segmenter (selfie segmenter.tflite)',
     r'MediaPipe Image Segmenter (selfie segmenter.tflite) \_ & Person-mask extraction for segmentation-assisted measurement. & Image input; confidence/category masks for the selected model. & Integrated in the Android native module after the earlier multiclass experiment. Comparative mask quality and effects on measurement error require controlled evaluation. \\ \hline', 'Segmentation quality')
line('The estimator currently combines geometric measurements',
     "The estimator combines geometric features with statistical depth assumptions. Declared height provides a scale, and front/side information contributes to draft circumference estimates. Segmentation contributes only when its quality gates accept the result; otherwise the code uses fallback assumptions. These checks are intended to reduce implausible outputs, but they do not establish numerical error bounds or prevent every incorrect estimate.", 'Estimator accuracy')
line('Device tests confirmed that MediaPipe can run',
     r'A project troubleshooting entry dated 20 April 2026 reports Android development-client debug trials with 33 landmarks, approximate pose scores of 0.99 for a front image and 0.98 for a side image, and approximately 38/65 ms for that particular mirror-image pair. These are historical developer-recorded observations in \path{../docs/troubleshooting/BODY_MEASUREMENT_MEDIAPIPE_POSE_LANDMARKER_SPIKE.md}, not an independently reproduced October test or a population-level benchmark. Pose confidence and individual inference times do not establish circumference accuracy or end-to-end user latency.', 'Historical AI observations')
line('The main limitation is not pose detection;',
     'Reliable circumference estimation remains unverified. Troubleshooting notes describe unstable masks and changing formulas, but no retained paired reference dataset establishes accuracy, repeatability or error distribution for the current version. The October QA inspected history and permission handling without completing a new front/side scan or edited-result save. User correction can improve a saved value, but it must not be counted as accuracy of the original AI estimate.', 'Accuracy evidence')
line('Fitness-progress target &',
     r'Fitness-progress target & Proposed engineering acceptance targets, not measured accuracy. & Earlier illustrative errors of 8 cm for chest, 6 cm for waist/hip and 5 cm for shoulder require justification and a reference dataset before use as accepted performance criteria. \\ \hline', 'Accuracy targets')

platform = r'The current iOS MediaPipe bridge explicitly throws not-implemented errors for pose and segmentation. The pose service selects MoveNet outside Android, but that fallback and shared TypeScript do not establish a working iOS measurement workflow or feature parity. Historical Android debug observations must therefore remain distinct from current Android inference validation, iOS support and release-build testing.'
marker = '\\subsection{Validation Results and Limitations}'
assert text.count(marker) == 1
text = text.replace(marker, platform+'\n\n'+marker, 1)
changes.append({'topic': 'Platform support', 'originalLine': before[:before.index(marker)].count('\n')+1, 'before': '(new platform-boundary paragraph)', 'after': platform})

line('Postconditions & Following a PaymentSheet result',
     r'Postconditions & Historical checkout baseline: a successful native-sheet result was followed by a separate client-side application write. Current verified server fulfillment differs; see Section~\ref{sec:current-payment-boundaries}. The baseline table does not establish atomic settlement or refund behavior. \\ \hline', 'Historical payment model')
baseline = r'The following use-case and sequence descriptions retain the earlier checkout baseline examined during the October audit. They are historical source descriptions, not the current corrected payment flow. Section~\ref{sec:current-payment-boundaries} distinguishes the later EUR sandbox implementation and retained execution evidence. Synchronizing these figures with the later implementation remains part of the separate sprint-artifact cross-check.'
needle = r'\caption{Textual description of use case: Purchase a session pack or pay for a direct booking}'
at = text.index(needle)
begin = text.rfind('\\begingroup', 0, at)
text = text[:begin] + baseline+'\n\n'+text[begin:]
changes.append({'topic': 'Historical payment diagrams', 'originalLine': before[:before.index(needle)].count('\n')+1, 'before': '(new historical-baseline notice)', 'after': baseline})
line('\\subsection{Stripe Payment Integration and Persistence Boundaries}',
     '\\subsection{Stripe Payment Integration and Persistence Boundaries}\n\\label{sec:current-payment-boundaries}', 'Current payment reference')
line('The implementation in \\seqsplit{supabase/functions/stripe-payment/index.ts}',
     r'The corrected October implementation in \path{../supabase/functions/stripe-payment/index.ts} authenticates the caller in the handler and determines pack pricing from the active stored pack. Standalone session pricing uses the stored coach rate and duration in EUR, with server-side availability/reservation checks. Deployed function version 5 retains platform JWT verification disabled but requires a valid user through \texttt{getUser} and action-specific ownership checks in its handler. This differs from the earlier caller-priced USD baseline in the sequence figures.', 'Server-priced payments')
line('On the mobile device, \\seqsplit{@stripe/stripe-react-native}',
     r'The native sheet is only one stage. Pack fulfillment retrieves provider payment state and verifies owner, amount, currency and metadata before writing credits and the paid snapshot. Standalone sessions use reservation, card authorization, server capture and linked booking completion, with replay and overlap protection. One EUR129/12-credit pack was verified on Android; a separate EUR60/60-minute session was verified through provider/API/admin observations, with the native standalone flow still pending. The separate purchased-pack redemption branch must not be inferred to be an atomic part of this standalone flow.', 'Payment verification')
payment_limit = r'These are synchronous sandbox scenarios, not a verified webhook/reconciliation system or a production payment certification. Same-reference retry is supported, but resumed-checkout recovery UI, scheduled reconciliation, refunds, payouts, 3DS/declines and iOS/release behavior remain incomplete or unverified. If capture or record completion is interrupted, recovery may require retry or operator review; an automatic refund must not be assumed. The retained payment evidence is identified in the final QA section.'
payment_heading = '\\subsection{Proactive Coach Intelligence \\& Clinic-Grade Follow-up}'
assert payment_heading in text
text = text.replace(payment_heading, payment_limit+'\n\n'+r'\subsection{Coach Check-in and Nutrition Context}', 1)
changes.append({'topic': 'Payment recovery and clinical wording', 'originalLine': before[:before.index(payment_heading)].count('\n')+1, 'before': payment_heading, 'after': payment_limit+'\n\n'+r'\subsection{Coach Check-in and Nutrition Context}'})
line('A successful coaching platform must empower coaches',
     'The coach workspace provides client context for fitness follow-up. Its check-in and nutrition views are support tools rather than clinically validated monitoring or medical decision systems.', 'Clinical claims')
line('On the \\seqsplit{CoachDashboardScreen.tsx,}',
     r'The dashboard requests low check-in responses and provides client-navigation shortcuts; the source and empty-state query retest do not establish immediate alert delivery. Client Detail displays declared nutrition preferences, allergies and dislikes. Program-building checks can flag name matches against recorded preferences, but neither these checks nor the displayed profile establish complete allergen detection or clinical safety.', 'Alert and nutrition claims')

security = r'A read-only check on 24 October 2026 found RLS enabled on all 40 public application tables. This is an observed setting, not proof that every policy, privileged function or API path enforces the intended ownership rules. The security advisor also reported publicly executable and authenticated-role-executable \texttt{SECURITY DEFINER} functions and disabled leaked-password protection; these require review of intended access and configuration rather than being treated as proof of an exploit or a clean security audit.'
line('The Supabase backend centralizes authentication,',
     'The Supabase backend centralizes authentication, PostgreSQL data, storage, realtime communication and Edge Functions. Each client/coach data path should enforce its intended record access, while privileged administration and automation use trusted server-side contexts. Service-role keys must not be bundled into the mobile client.\n\n'+security, 'RLS and security evidence')

communication = r'''\subsection{Messaging, Video and Storage Security Boundaries}

The inspected chat service inserts the supplied message text directly into the message record and uses realtime subscriptions for updates. It also copies a message preview into notification payloads. No client-side encryption/decryption or participant key-management step was identified in this send path. Protected transport, managed storage and RLS are distinct controls; they do not establish end-to-end encrypted messaging. FR-06's encrypted-messaging wording remains a target requiring a defined threat model and implementation evidence.

The deployed video-token function (version 8) has gateway JWT verification enabled, but its handler accepts room and participant values from the request without binding them to an authenticated booking participant or checking booking status/time. The mobile service also enables a testing bypass of its join-window check. A signed room token and a client-side button therefore do not establish per-booking authorization. These are source/configuration findings; no unauthorized room join was attempted. Two-party media, permission, reconnect and release behavior remain unverified.

Session persistence uses the native SecureStore adapter, while its web fallback uses AsyncStorage; the workout-completion queue separately uses AsyncStorage. These mechanisms must not be grouped into a claim that all local data is encrypted or has equivalent security on every platform. Release-build storage behavior and the complete token lifecycle require their own checks.

The source references, deployed video-source comparison, read-only RLS result and advisor notices are retained in \path{qa/2026-10-24-step-3-claims/README.md}. This claims review does not change backend policies, the token handler or mobile code, and it does not certify the remaining security boundaries.
'''
anchor = '\\subsection{Development Tools, Codex, and Connected Workflow}'
if anchor not in text:
    # Insert immediately before the next section after the backend-security component table.
    pos = text.index(security)
    end = text.index('\\endgroup', pos) + len('\\endgroup')
    text = text[:end]+'\n\n'+communication+text[end:]
else:
    text = text.replace(anchor, communication+'\n'+anchor, 1)
changes.append({'topic': 'Communication and local storage', 'originalLine': before[:before.index('\\subsection{Supabase Backend, Data Security, and Realtime Services}')].count('\n')+1, 'before': '(new security-boundary subsection)', 'after': communication})

# Only claim-related verdicts are downgraded here; full sprint-artifact reconciliation is Step 4.
scenario_evidence = {
    'S1-T05': ('Not verified', 'Pending', 'Final QA-03; no retained offline reconciliation'),
    'S2-T03': ('Not verified', 'Pending', 'Final QA-04; historical debug notes do not validate this workflow'),
    'S2-T06': ('Not verified', 'Pending', 'Final QA-05; generation entry blocked on tested account'),
    'S3-T02': ('Partial', 'Later sandbox result', 'Final QA-06; October native pack evidence, not sprint-period proof'),
    'S3-T03': ('Not verified', 'Pending', 'Pack-credit booking not established by standalone API tests'),
    'S3-T04': ('Not verified', 'Pending', 'Two-party media and booking authorization remain unverified'),
    'S3-T06': ('Not verified', 'Pending', 'No retained fresh scheduled execution or delivery receipt'),
}
for identifier, values in scenario_evidence.items():
    old = next(s for s in text.splitlines() if s.startswith(identifier+' &'))
    cells = old.split(' & ')
    assert len(cells) == 9, (identifier, len(cells))
    cells[6], cells[7], cells[8] = values[0], values[1], values[2]+r' \\ \hline'
    new = ' & '.join(cells)
    changes.append({'topic': 'Unsupported scenario verdict: '+identifier, 'originalLine': before[:before.index(old)].count('\n')+1, 'before': old, 'after': new})
    text = text.replace(old, new, 1)

for change in changes:
    assert change['after'] in text, change['topic']
    change['revisedLine'] = text[:text.index(change['after'])].count('\n')+1
path.write_bytes(text.replace('\r\n','\n').replace('\n','\r\n').encode('utf-8'))
(OUT/'claim-corrections.json').write_text(json.dumps(changes, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
print(f'Applied {len(changes)} scoped claim corrections to the existing main.tex.')
