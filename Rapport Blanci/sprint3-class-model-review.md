# Sprint 3 cumulative class model: source and deployed-schema review

Review date: 21 October 2026. Status: approved model applied. Four Sprint 3 extension views and the matching report explanation are now in place. This review follows the approved Sprint 1 foundation and Sprint 2 extensions. No application code, schema, migration, or user data was changed.

## Evidence and scope

Read-only inspection of the connected GoFit project confirmed 16 relevant public tables, their columns, nullability, primary keys, foreign keys, and uniqueness constraints. Results are saved in `sprint3-deployed-schema.json`. The corresponding mobile services and admin handlers/utilities were inspected locally. Existence and source support do not establish successful payment/video tests, enforced access-policy correctness, or the exact historical Sprint 3 completion state.

The proposal retains the 14 distinct Sprint 1/2 concepts and all their relationships. It adds 16 principal concepts for marketplace, coaching follow-up, messaging, and administration/finance, giving 30 distinct concepts in the selected cumulative model. This is not an exhaustive schema: reviews, notification inbox records, and every auxiliary preference/view are not all included. No fictitious persisted client assignment, consultation-room, or administrator entity is introduced.

## New concepts and selected attributes

| Concept | Selected attributes | Code and live table |
|---|---|---|
| CoachProfile | id, bio, specialties, status, isVerified | `GoFitMobile/src/services/coachProfile.ts:5`; coach_profiles, with UNIQUE(user_id) and required account FK. Profile status is pending/approved/rejected; certification verification is separate. |
| CoachCertification | id, name, issuer, documentUrl, status | `coachProfile.ts:24`; coach_certifications. document_url and issuer are optional. |
| CoachAvailability | id, dayOfWeek, startTime, endTime | AvailabilitySlot in `GoFitMobile/src/services/bookings.ts:6`; coach_availability. Describes availability patterns, not proof of collision-free scheduling. |
| SessionPack | id, name, sessionCount, price, currency | `GoFitMobile/src/services/sessionPacks.ts:4`; session_packs. An offer, not a particular client's purchase. |
| PurchasedPack | id, sessionsRemaining, sessionsTotal, purchasedAt, status | `sessionPacks.ts:17`; purchased_packs. Required references to pack offer, client account, and coach profile. Optional stripe_payment_id is not itself payment verification. |
| Booking | id, scheduledAt, durationMinutes, status, videoRoomId | `GoFitMobile/src/services/bookings.ts:15`; bookings. pack_purchase_id and video_room_id are nullable; rescheduled_from is also an optional self-reference. |
| Conversation | id, lastMessageAt | `GoFitMobile/src/services/chat.ts:6`; conversations, unique coach/client pair. |
| Message | id, content, type, mediaUrl, readAt, createdAt | `chat.ts:50`; messages. Sender and conversation references are required; content/media/read timestamp can be null in the database. Do not add an unimplemented recipient_id field. |
| CustomProgram | id, title, type, programData, status, isTemplate | `GoFitMobile/src/services/programs.ts:30`; custom_programs. Required coach, optional client. Program days/exercises/meals are embedded JSON, not enforced links to Workout or MealLog. |
| CoachClientNote | id, note, createdAt | ClientNote in `GoFitMobile/src/services/clientManagement.ts:15`; coach_client_notes. Separate from generated AI notes. |
| CheckInSchedule | id, enabled, frequency, checkInDays, checkInTime | `GoFitMobile/src/services/checkIns.ts:6`; check_in_schedules, unique coach/client pair. |
| CheckInResponse | id, responseDate, mood, energy, soreness, sleepQuality | `checkIns.ts:19`; check_in_responses, unique client/coach/date. No photo field is present in this checked response model. |
| AISessionNote | id, summary, context, createdAt, expiresAt | `GoFitMobile/src/services/aiSessionNotes.ts:3`; ai_session_notes. Associated with coach/client, not with a required booking or call transcript. |
| Wallet | id, balance, currency | `GoFitMobile/src/services/wallet.ts:4`; wallets, unique coach_id. |
| Transaction | id, type, amount, description, createdAt | `wallet.ts:13`; transactions. Required wallet; optional booking. These are wallet ledger entries, not automatically Stripe card-charge records. |
| AdminAuditLog | id, action, resourceType, resourceId, createdAt | `admin-panel/lib/audit.ts:39`; admin_audit_logs. Actor column is admin_user_id referencing auth.users; resource_id is nullable and is not an enforced polymorphic FK. |

Aliases such as videoRoomId map to actual snake_case columns. Only selected attributes would appear in the figures; omission is not removal. Do not invent fixed EUR-only pricing, dedicated token fields on a persisted video entity, or mandatory assignment of every program.

## Relationship and multiplicity verification

The notation below describes each parent as seen from a child, then the parent's collection of children.

| Parent–child relationship | Parent per child | Children per parent | Reason |
|---|---|---|---|
| UserAccount–CoachProfile | 1 | 0..1 | Required user_id and UNIQUE(user_id). Connect to the authentication account, not a required UserProfile row. |
| CoachProfile–CoachCertification | 1 | 0..* | Required coach_id FK. |
| CoachProfile–CoachAvailability | 1 | 0..* | Required coach_id FK; no mandatory availability count. |
| CoachProfile–SessionPack | 1 | 0..* | Required coach_id FK. |
| SessionPack–PurchasedPack | 1 | 0..* | Required pack_id FK; one offer may be purchased repeatedly. |
| UserAccount–PurchasedPack, client role | 1 | 0..* | Required client_id FK. |
| CoachProfile–PurchasedPack | 1 | 0..* | Required coach_id FK. This stored reference does not by itself prove cross-FK coach/offer consistency. |
| UserAccount–Booking, client role | 1 | 0..* | Required client_id FK. |
| CoachProfile–Booking | 1 | 0..* | Required coach_id FK. |
| PurchasedPack–Booking | 0..1 | 0..* | Nullable pack_purchase_id, ON DELETE SET NULL. Direct paid bookings are representable. |
| CoachProfile–Conversation | 1 | 0..* | Required coach_id FK. |
| UserAccount–Conversation, client role | 1 | 0..* | Required client_id FK. UNIQUE(coach_id, client_id) restricts each pair to one conversation. |
| Conversation–Message | 1 | 0..* | Required conversation_id FK; deletion cascades. Composition is appropriate for conversation-contained messages. |
| UserAccount–Message, sender role | 1 | 0..* | Required sender_id FK. This is separate from participation in the conversation. |
| CoachProfile–CustomProgram | 1 | 0..* | Required coach_id FK. |
| UserAccount–CustomProgram, assigned-client role | 0..1 | 0..* | Nullable client_id. Template-creation code sets it to null. |
| CoachProfile–CoachClientNote | 1 | 0..* | Required coach_id FK. |
| UserAccount–CoachClientNote, subject-client role | 1 | 0..* | Required client_id FK. |
| CoachProfile–CheckInSchedule | 1 | 0..* | Required coach_id FK. |
| UserAccount–CheckInSchedule, client role | 1 | 0..* | Required client_id FK. Pair uniqueness prevents duplicate schedule records for the same pair. |
| CoachProfile–CheckInResponse | 1 | 0..* | Required coach_id FK. |
| UserAccount–CheckInResponse, client role | 1 | 0..* | Required client_id FK; pair/date uniqueness. |
| CoachProfile–AISessionNote | 1 | 0..* | Required coach_id FK. |
| UserAccount–AISessionNote, subject-client role | 1 | 0..* | Required client_id FK. |
| CoachProfile–Wallet | 1 | 0..1 | Required coach_id and UNIQUE(coach_id); existence is not required for every coach. |
| Wallet–Transaction | 1 | 0..* | Required wallet_id FK. |
| Booking–Transaction | 0..1 | 0..* | Nullable booking_id with ON DELETE SET NULL. Not every ledger entry must relate to a booking. |
| UserAccount–AdminAuditLog, actor role | 1 | 0..* | Required admin_user_id account FK. Admin authorization is an application/profile concern, not a separate account table. |

The optional Booking.rescheduledFrom self-reference may be omitted from a selected overview, but must not be mistaken for a unique one-to-one chain: the checked FK does not enforce only one successor per old booking.

There is no required CheckInSchedule–CheckInResponse relationship in the schema. Both identify a coach/client pair; responses do not contain schedule_id. Do not imply enforced pairing or lifecycle dependency with composition. There is likewise no direct AISessionNote–Booking FK, and no inspected relational Workout–CustomProgram or MealLog–CustomProgram link for the JSON program contents.

## Corrections to the old diagram and paragraph

1. Replace the direct SessionPack–Booking connection with SessionPack–PurchasedPack–Booking, including the separate coach/client ownership associations.
2. Remove ConsultationRoom/VideoSession as a purported persisted entity. No matching table was found. `GoFitMobile/src/services/videoCall.ts:23` sets an optional booking video_room_id; token generation occurs on demand and returns a token to the client. Preserve video functionality in the technical sequence rather than inventing storage for participant tokens.
3. Remove ClientCoachAssignment as a purported table. The live get_coach_clients function references bookings and purchased_packs, consistent with `clientManagement.ts:57` and the local RPC definitions. A separately labeled derived roster is possible, but a new stored assignment entity is not justified.
4. Replace the flattened ChatMessage structure with Conversation and Message, and preserve sender identity. Message content may also be media, and schema existence does not establish end-to-end encryption.
5. Replace AdminUser as a separate entity with the existing account/profile representation. `admin-panel/lib/supabase/admin.ts:40` checks user_profiles.is_admin. Do not present user_type='admin' as the implemented role model.
6. Restore the prior cumulative concepts and add programs, check-ins, notes, and ledger records in clearly scoped views.
7. Use approved/pending/rejected for coach-profile status. Individual certification status has separate verified semantics.
8. Treat AI notes as coach/client briefings generated from available context. `supabase/functions/ai-session-notes/index.ts` does not establish a recorded-call transcription/post-call-summary workflow.
9. Model audit records where implemented, without claiming that every admin action writes one. Coach approval's current PATCH handler does not call createAuditLog. Other admin routes do call the utility.
10. Do not depict webhook settlement, atomic purchase/booking updates, conflict-free bookings, or production-ready video access merely from class relationships. Those are separate behavioral/security checks.

## Proposed presentation

Preserve the two existing Sprint 2 views as the cumulative foundation. Present the Sprint 3 additions through four simple monochrome views, reusing the same UserAccount/CoachProfile/Booking anchors rather than introducing duplicate domain identities:

1. **Marketplace and bookings:** CoachProfile, CoachCertification, CoachAvailability, SessionPack, PurchasedPack, Booking, with account ownership and client-role associations.
2. **Communication and notes:** Conversation, Message, CoachClientNote, AISessionNote, anchored to account/coach identities.
3. **Programs and check-ins:** CustomProgram, CheckInSchedule, CheckInResponse, anchored to account/coach identities.
4. **Finance and administration:** Wallet, Transaction, AdminAuditLog, anchored to coach/account/booking identities. Add isAdmin to the expanded profile representation or explain its existing profile storage in the paragraph; do not invent a separate AdminUser entity.

Each view should show its selected fields and verified associations, with no notation legend, decorative panels, or narrative blocks inside the image. Repeated anchor boxes represent the same objects. The chapter must explicitly describe the views as parts of one selected cumulative model; it must not claim any one extension view is the complete 30-concept model.

## Proposed report explanation

> The Sprint 3 cumulative domain model retains the workout, profile, measurement, and nutrition foundation and extends it with coaching, communication, follow-up, and administrative concepts. CoachProfile is linked to an authentication account and has distinct certification, availability, and session-pack records. PurchasedPack represents a client's acquisition of an offer, while Booking records a scheduled session and may optionally reference that purchase. Conversation contains messages whose senders are authentication accounts. Coach-authored programs may be templates without an assigned client; check-in schedules, responses, manual client notes, and AI briefings retain their own coach/client associations. Video-room identity is optional booking data, while access tokens are generated at runtime. Wallet and Transaction represent the coach ledger, and AdminAuditLog records supported administrative actions by an account authorized through profile data. The model is shown through complementary views that reuse shared identities; it does not imply verified payment settlement, universal audit coverage, or successful end-to-end validation.

## Approval boundary

The user approved proceeding with the source-checked and deployed-schema-checked additions and four scoped views. The original six-task academic revision remains paused at Step 1 while the user-requested diagram correction is in progress.

## Applied changes and verification

- Replaced class_diagram_sprint3.png with the marketplace/booking view and added communication, follow-up, and finance PNG/SVG pairs. Reproducible source is figures/source/build_sprint3_class_diagrams.py; the render manifest records each concept and relationship.
- Updated only the Sprint 3 class-model explanation, caption, and added figure blocks in main.tex for this batch. The original fig:class_sprint3 label remains on the marketplace view. References to the retained Sprint 2 views make the cumulative scope explicit; those earlier images are unchanged by this batch.
- All 16 new concepts appear across the four views. The earlier 14 concepts remain in the referenced foundation/extension views, giving 30 distinct concepts overall.
- Compared all 28 selected Sprint 3 associations and their endpoint multiplicities with the saved live foreign-key, nullability, and uniqueness metadata: they match. The optional booking rescheduling self-reference is intentionally outside these selected views.
- Visually inspected each rendering, corrected clipped edge labels, reduced unused bottom space, and shortened client-role labels in the central routing gaps. The images use thin monochrome lines and contain no notation legend.
- All generated SVGs parse, all included images exist, and LaTeX labels are unique. Original-archive comparison confirms that only main.tex and the three previously authorized class-diagram PNGs differ among original project files; all unrelated diagrams remain unchanged.
- No LaTeX compilation or runtime feature testing was performed for this diagram-content correction.
