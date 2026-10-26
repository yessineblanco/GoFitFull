# Step 2 — Implementation evidence matrix

**Status: approved by the user on 24 October 2026 through “proceed” at the Step 2 checkpoint. Step 3 has started.**

The report's new subsection starts at `main.tex:2239`; its table caption is at line 2253. The approved QA subsection now starts at line 2270. The [report diff](main-revision.diff) and [pre-Step-2 snapshot](main-before.txt) show the insertion. No earlier requirement definition, chapter, sprint date, diagram, validation verdict or conclusion was rewritten in this step.

## Deliverables

- **Report summary:** eight rows map FR-01–FR-08 to source scope, implementation extent, retained verification and limitations. It is placed before the final QA section so implementation evidence and execution outcomes can be read together.
- **[Detailed matrix](matrix.md):** 18 sub-capability records cover all eight domains. Two additional records clearly identify adaptive recommendations and operational workflows as supplementary report capabilities, without inventing numbered requirements.
- **[Machine-readable index](matrix.json):** exact source file/line anchors, file hashes and short excerpts, plus retained ledger case IDs/statuses/observations and follow-up artifact paths.
- **[Verification](verification.json):** source/case/reference checks and change boundaries. [build_matrix.py](build_matrix.py) rebuilds the index from current working files and retained ledgers; rebuilding later changes its inspection snapshot.

## Principal distinctions made

| Requirement | Issue hidden by a single completion label | Matrix treatment |
| --- | --- | --- |
| FR-01 | Existing-account persistence does not prove registration/recovery or the full proposed questionnaire. | Separates authentication paths and scoped relaunch evidence from missing questionnaire scope, unrun fresh-account flows and recent editor native retests. |
| FR-02 | Saved array order is not proof of a dedicated reorder control or target-load authoring. | Records inspected catalog/builder paths and disposable CRUD; bounds the reorder/load finding to the inspected builder. |
| FR-03 | Session code does not implement every required input or prove offline behavior. | States the configured-repetition/weight/completion model, missing independent performed-repetition/RPE input and completion-update-only queue. |
| FR-04 | Existing charts/history or a confidence value cannot establish new inference or accuracy. | Separates observed progress/photo views from fresh capture, review/save, accuracy and platform limitations. |
| FR-05 | Search/add/remove success does not validate barcode/provider behavior or complete exclusions. | Records actual meal/search observations and source-level barcode/exclusion paths, keeping remaining execution checks explicit. |
| FR-06 | One payment result could obscure separate pack, booking and communication paths. | Distinguishes native pack success, standalone session API/admin checks, the separate pack-credit branch and unverified messaging/media/encryption guarantees. |
| FR-07 | A program service or briefing can be misread as a complete assignment or consultation-summary workflow. | Identifies workout/meal data/services and limited UI evidence; distinguishes pre-session client-context briefing from post-session consultation synthesis. |
| FR-08 | Selected CRUD/access/label checks could be generalized to all privileged mutations and BI figures. | Limits evidence to tested operations; retains unrun destructive writes, approval/document checks, BI arithmetic and larger-listing limitations. |

Implementation status describes what source was identified or where the target differs. Verification is a separate field describing actual retained observations. No complete FR domain is certified as fully implemented and validated by the matrix. Two narrowly verified payment capabilities do not become universal payment or production-readiness claims.

## Verification performed

The index references **46 distinct source files** and **104 distinct role-ledger cases**. Source existence, anchors and hashes were checked. All copied case statuses/observations match their current ledgers, and every underlying evidence path attached to those cases resolves. The count of references is not a count of new tests or unique functional requirements.

The report has exactly eight matrix rows and five columns, a unique table label and resolvable detailed-index paths. Comparison against the approved snapshot confirms that the text preceding the new section and the entire approved QA/conclusion text are unchanged, apart from adding a QA subsection label. Original CRLF line endings are preserved. No application test, native interaction, database mutation, deployment or LaTeX compilation was performed in this editorial/source-mapping step.

The machine-readable record freezes source hashes so later code edits cannot be silently treated as the same inspected version. Earlier baseline case text and later follow-ups can coexist: a follow-up supersedes only the scenario it actually retested. The matrix does not promote other blocked cases.

## Next approval boundary

Step 2 was approved before Step 3 began. Step 3 will validate the report's AI/security claims in detail, including accuracy, offline behavior, encryption, payments, video and cross-platform scope. It has not been carried out merely because this matrix records limitations in those areas. Sprint-artifact reconciliation, the supervisor checklist and Chapter 6 tightening remain subsequent steps.
