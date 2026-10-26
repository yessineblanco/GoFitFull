# Architecture diagram correction

Approved scope applied on 21 October 2026: the physical, logical, n8n, and deployment figures; their captions and explanatory paragraphs; matching architecture/deployment descriptions and inconsistent version/hosting rows in the nearby environment tables. The quality-assurance matrix, conclusions, hardware specifications, and application code were not revised in this batch.

## Evidence ledger

| Concern | Evidence | Result |
| --- | --- | --- |
| Framework versions | `GoFitMobile/package.json`; `admin-panel/package.json` | Expo 54, React Native 0.81.5, Next.js 16.1.3. These are source declarations, not proof of deployed build versions. |
| Managed project | `architecture-project-check.json`, fresh read-only project inspection | GoFit ACTIVE_HEALTHY, eu-central-1, PostgreSQL engine 17, build 17.6.1.054. No inferred replication, TLS version, or provider-private gateway topology. |
| Admin browser/server split | `admin-panel/app/coaches/page.tsx`; `admin-panel/app/api/coaches/route.ts`; `admin-panel/lib/supabase/admin.ts`; `admin-panel/proxy.ts` | Browser presentation separated from Next.js server rendering, routes, access checks, and privileged credentials. |
| Media paths | `admin-panel/app/api/upload/route.ts`; `admin-panel/lib/r2.ts`; `GoFitMobile/src/services/progressPhotos.ts` | Admin uploads to R2; application uses stored media URLs. Separate progress-photo feature uses Supabase Storage. Measurement-save path is not presented as photo upload. |
| Native and local persistence | `GoFitMobile/src/services/bodyMeasurementService.ts`; native MediaPipe module; `src/config/supabase.ts`; `src/store/timerStore.ts`; `src/services/offlineQueue.ts`; `App.tsx:187–199` | Device CV and AsyncStorage/SecureStore are explicit. Scoped completion-update queue replaces universal offline-first claims. No application-owned SQLite layer inferred from dependencies. |
| Realtime | `GoFitMobile/src/services/chat.ts:255–270`; `src/store/sessionsStore.ts:250–268`; nutrition refresh implementation | Selected chat/session subscriptions, not universal instant booking or nutrition updates. No general CQRS claim from ordinary stores/services. |
| External function calls | `supabase/functions/ai-workout-recommendation/index.ts`; `ai-session-notes/index.ts`; `stripe-payment/index.ts`; `food-barcode-lookup/index.ts` | Groq, Stripe and Open Food Facts adapters remain backend-side call paths. No provider latency or successful production fulfilment inferred. |
| Video-token boundary | `supabase/functions/generate-video-token/index.ts`; `GoFitMobile/src/services/videoCall.ts` | Token signed locally with backend credentials; mobile separately connects to LiveKit. No remote LiveKit token-minting arrow or media-security guarantee. |
| Automation exports | `docs/automation/n8n/workflows/*.json`; `docs/automation/n8n/README.md` | Five independent Schedule Trigger → Code paths, intervals 60/15/240/1440/1440 minutes. Direct n8n REST access and direct Groq call in AI Session Prep. No fixed 08:00, weekly branch, Resend, or direct push output. |
| Build/deployment evidence | `GoFitMobile/eas.json`; admin package scripts; previous healthy migration/schema inventory | Build profiles and source targets distinguished from verified distribution, hosting or function deployment. No unverified Vercel release pipeline or running Docker container asserted. |
| Browser libraries | Admin source search and package manifest | Client components/forms/search/table state shown. Declared React Table/React Hook Form/Zod dependencies alone are not treated as proof of an implemented shared cache or specific component usage. |

## Distinct figure purposes

- `figures/arch_physical.png`: execution environments and principal source-defined communication paths. Backend capabilities are aggregated into one managed-service boundary. Mobile SDK internals, direct media reads, and n8n's Groq connection are summarized in node text/prose and more detailed views. Presence in the architecture does not establish deployed operation.
- `figures/arch_logical.png`: responsibilities within mobile, browser/server administration, Edge Functions and n8n, with selected managed-service dependencies. The direct UI-to-adapter route avoids implying every request passes through a store. Native modules remain device-side; privileged callers remain server-side. Not an exhaustive module inventory.
- `figures/n8n_automation.png`: all five exported workflows and their output tables. Workflow duplicate guards are shown without an exactly-once/concurrency guarantee. Provider call appears only for AI Session Prep. Exports omit activation state and do not prove execution.
- `figures/deployment_diagram.png`: artifacts/runtime targets and a confirmed managed backend. External provider configuration targets are listed with callers; this does not assert operational integrations or deployed servers. EAS profiles are not evidence of publication or device parity.

Matching SVGs and `figures/source/build_architecture_diagrams.py` are included. The approved muted palette and plain geometry are retained, with no notation legend or decorative infrastructure internals.

## Verification and limits

All four figures were rendered and visually inspected. Internal logical-view arrows were corrected to render above container backgrounds. PNG integrity, SVG parsing, image-reference existence, and unique report labels were checked. A static comparison confirmed all five displayed n8n intervals exactly match exported Schedule Trigger parameters and each export has two executable nodes excluding sticky notes.

No service was deployed, workflow activated, build distributed, application code edited, database mutated, or report compiled. No external integration performance test was performed. The existing final validation claims and conclusions remain pending the original report-revision checklist. Global/sprint use-case diagrams also remain a separate correction batch.


## Approved visual redesign

On 21 October 2026 the user requested a more visually developed treatment specifically for these four architecture figures. The renderer now uses original vector line icons, softly tinted execution boundaries, provider tiles, clearer typography, and restrained blue/teal/violet/orange accents. Icons are generic illustrations rather than vendor logos. No photos or decorative backgrounds were introduced. All four PNG/SVG pairs retain their existing filenames and report references; main.tex was unchanged in this visual-only follow-up. Verified content, workflow intervals, and deployment qualifications were preserved. All four outputs were visually inspected, SVG/PNG integrity and report references checked, and five workflow intervals compared with the exports again.


## Technical drawing revision (supersedes the visual redesign above)

The user rejected the rounded-card visual treatment and approved a technical drawing direction. The four figures now use device/monitor shapes, database cylinders, component symbols, execution-node/artifact shapes, short labels, thin connectors, white backgrounds, and restrained blue. Decorative icons, banners, shadows, badges, and colored card panels were removed. Detailed explanations and deployment qualifications remain in the existing report paragraphs; main.tex was unchanged in this visual-only pass. All four outputs were visually inspected; SVG/PNG integrity, report references, labels, and all five workflow intervals were verified. No new implementation, deployment, or test results are asserted.
