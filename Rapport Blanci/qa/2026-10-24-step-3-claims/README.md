# Step 3 — AI and security claim review

**Status: approved by the user ("proceed") before Step 4 began on 24 October 2026. The editor compilation check remains blocked by missing Biber.**

The existing source was edited in place and its editor was kept open. This review inspected implementation files, retained QA records and project research notes, plus read-only Supabase metadata/advisories. No application code, database policy, deployed handler, provider secret or real account data was changed. No payment, message, room join, push event or new measurement was submitted.

## Findings and corrections

| Topic | Evidence and finding | Correction in the report |
| --- | --- | --- |
| Body-measurement accuracy | Capture/review/estimation source exists. April 20 troubleshooting notes report Android debug trials; October QA did not complete a fresh scan, edited save or paired tape comparison. | Attributes historical scores/timings to developer notes; separates landmark confidence, measurement accuracy and end-to-end latency. Quality gates are mitigation, not error guarantees. Earlier error targets are proposed criteria requiring justification, not achieved results. |
| Platform support | The Swift MediaPipe pose and segmentation methods throw not-implemented errors. Non-Android pose selection uses MoveNet; the fallback does not validate the complete segmentation/review workflow. | Shared TypeScript and Android debug observations no longer imply iOS feature parity or release readiness. |
| Offline behavior | The completion queue stores an existing session ID and replays a failed completion update; session creation is remote. | Retains the restricted completion-retry description and removes the unsupported sprint-level offline pass. No unrestricted offline creation, per-set durable journal or loss-free reconciliation is inferred. |
| Messaging and local storage | Chat inserts the supplied content directly and copies previews to notifications. The inspected send path has no participant key-management/encrypt/decrypt step. Native session storage uses SecureStore; the web fallback and workout queue use AsyncStorage. | Distinguishes RLS/transport/native storage from end-to-end messaging encryption and whole-app local encryption. The FR-06 encryption statement remains a target, not a verified property. |
| Payments | The deployed payment function is version 5. Current source verifies the user in the handler, reads server-side pricing and verifies fulfillment/capture; native EUR129 pack and API/admin EUR60 session evidence are retained. | Replaces obsolete current-flow statements with the October EUR implementation. Marks earlier USD/client-insert use-case/sequence descriptions as historical pending Step 4 synchronization. Explains synchronous confirmation, replay and recovery limits; no verified webhook, refund or universal production claim. |
| Video authorization | Live version 8 matches local source, with gateway JWT verification enabled. Its handler signs room/participant request fields without booking-participant/status/time checks. The mobile join-window testing bypass is enabled. | Adds the concrete authorization boundary. A valid/signed token is not proof of per-booking access; no unauthorized join was attempted. Two-party media remains unverified. |
| AI privacy and review | Briefing prompts include profile/history/private notes sent to Groq, and generated text can be cached server-side before a separate human review. | Removes guarantees that all prompts are anonymized, all hallucinations/injection are prevented, or every AI database write follows human confirmation. Local image inference is distinguished from progress uploads and external LLM requests. |
| Security/performance targets | RLS is enabled on 40 public tables, but policy correctness and handler authorization require more than that flag. No profiling/load-test record proves the listed numeric performance goals. | Rewrites NFRs as targets; removes full type-safety/scalability/accessibility guarantees and identifies remaining checks. Selected settings contrast tests do not certify the whole app. |

The exact **36 changes**, with original/revised locations and text, are in [claim-corrections.json](claim-corrections.json). The [complete diff](main-revision.diff) also includes the final chapter-summary wording updates. The [pre-edit source](main-before.txt) preserves the approved Step 2 state. [source-index.json](source-index.json) records 21 source anchors, hashes and excerpts supporting the review.

Seven claim-related sprint verdicts were corrected: S1-T05, S2-T03, S2-T06 and S3-T02/03/04/06. Other sprint/backlog/diagram consistency checks remain Step 4; this targeted correction does not claim that their remaining validation placeholders or all artifacts are reconciled. The final QA section and General Conclusion approved at Step 1 were preserved.

## Read-only backend evidence

- [Database readback](database-readonly.json): 40 public application tables, none with RLS disabled; the message content column is text. The column type alone is not encryption evidence; the direct send/preview source establishes the specific inspected boundary.
- [Edge metadata](edge-metadata.json): video version 8 with gateway verification enabled; payments version 5 with gateway verification disabled and handler-level `getUser` checks in the inspected implementation.
- [Deployed video source](video-deployed-source.json): normalized source equals the local handler. No token was requested to test unauthorized access.
- [Advisor notices](security-advisories.json): two publicly callable SECURITY DEFINER functions, ten callable by the authenticated role, and disabled leaked-password protection. Counts can overlap; these are review signals, not counts of demonstrated exploits. Public marketplace RPCs may be intentional, so grants and function bodies require case-specific review.

Remediation references returned by the advisor: [public function grants](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated function grants](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The distinction between gateway verification and handler authorization is documented in [Supabase authorization headers](https://supabase.com/docs/guides/functions/auth-headers).

This is a report-claim review, not a penetration test, complete policy audit, binary/secret-history inspection or deployment hardening. The concrete video-handler and timing-bypass issues remain unresolved in code and must not be described as corrected by an editorial change.

## Compiler check and scope verification

The requested built-in `compile_latex_document` tool was run twice against the saved existing source/project. Both attempts reached the end of the report (115 pages) and then failed while invoking **Biber: `program not found`**. The returned log contains no `!` source-error lines; it still contains layout/reference/bibliography warnings. This does not confirm successful compilation. The required bibliography processor is missing from the tool environment; source changes cannot repair that dependency without changing the bibliography workflow. The bibliography configuration and sources were preserved.

[First diagnostic](compiler-attempt-1.json) and [final diagnostic](compiler-final.json) are retained. No separate PDF, replacement document or new editor tab was created. Content/source/evidence checks pass as recorded in [verification.json](verification.json); native integration and the older project-wide mobile TypeScript failures remain unchanged.

Step 3 is ready for content review with the compiler dependency explicitly unresolved. Wait for user approval before Step 4, which will reconcile backlog/use-case/diagram/implementation/validation artifacts, including the historical payment figures.
