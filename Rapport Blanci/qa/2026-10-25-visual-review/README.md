# Rendered report visual review

25 October 2026. The user requested a visual check and explicitly approved a PDF export solely for review. The authoritative source remains `Rapport Blanci/main.tex`; the existing editor remained open. `render/main.pdf` is a review build of that source using the application's packaged compiler, not a replacement report.

## Inspection

Rendered every page into numbered overview sheets and inspected the full document at overview scale. Enlarged the problem tables, table index, administrative dashboard and measurement excerpts; inspected selected original class/architecture/deployment images at higher resolution. This is a layout and readability review, not a fresh implementation, diagram-semantics or application-QA certification.

## Corrections

- Narrow table cells previously allowed long words and slash-separated phrases to cross borders. Enabled hyphenation within ragged-right paragraph cells, allowed first-word hyphenation and added slash break opportunities in the three sprint matrices, final QA matrix and implementation evidence matrix. One long evidence identifier uses `seqsplit`. Original paragraph hyphenation penalties remain unchanged.
- Added separate first-page and continuation column headers to 31 long tables with explicit header rows. Continuations repeat their column headings without repeating captions or adding duplicate List of Tables entries.
- Reduced only the List of Tables font/line spacing to fit its 39 entries on one page.
- Added a one-line local page-height allowance to the Chapter 5 conclusion to avoid its final word occupying a separate page.
- Restored three accented lines from the pre-review source after catching an encoding regression in an intermediate render. Final source checks compare those original Unicode lines directly.

## Preserved scope

All 44 screenshot references remain. Figure assets were not regenerated, edited or replaced during this review. The academic matrix rows and QA verdicts retain their wording after normalizing purely typographic commands. No application/backend changes or new tests were performed. Some figure-only pages and short chapter endings retain white space; figures were not reduced merely to fill it.

## Evidence

`main-before.txt` and `main-revision.diff` record the source transition. `source-check.json` records content/Unicode preservation and the final source hash. `page-index.json` records final rendered text/page locations; `pages/` contains overview sheets and enlarged inspection pages. Earlier `detail-*` images show the original overflow. The latest overview sheets and final pages supersede intermediate images. `render/compiler-result.json` and `render/build-output.txt` record the review build; `compiler-final.json` records the built-in editor's final compilation result. `verification.json` records final page count and remaining presentation limits.
