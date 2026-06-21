# Auburn Academic Planner

Auburn Academic Planner is a first prototype of a source-grounded academic planning assistant for Auburn CSSE students. It focuses on Software Engineering, Computer Science, and the Artificial Intelligence Engineering certificate.

The app is intentionally limited: it does not implement login, payments, automatic registration, official degree audits, or multi-school support. It helps students prepare for advising conversations and does not replace Auburn academic advisors.

## Current MVP

The MVP supports three complementary paths:

- Gemini RAG chat for Auburn source-grounded advising questions.
- Deterministic requirement checkers for quota-free progress review.
- `/plan-check` is a planning hub organized around two first-class Degree Works workflows: `Current Progress` for Worksheet/Audit PDFs and `Planned Path` for Degree Works Plan PDFs. `Current Progress` is the recommended default for most students because every student has a Worksheet audit; `Planned Path` remains available for validating a proposed future multi-semester graduation plan.
- `/rule-audit` shows which checked-in program rules are source-backed, locally modeled, or intentionally left for advisor review, including requirement-block and supporting-model limitations.
- `npm run check:sources` validates checked-in source metadata and guards source-backed rules against local bulletin drift without fetching live Auburn pages.

## Demo flow

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000/chat`.
3. Ask: `What courses are required for the Artificial Intelligence Engineering certificate?`
4. Open `http://localhost:3000/plan-check`.
5. Confirm `Current Progress` is selected by default and explains that it is the recommended Worksheet/Audit PDF workflow for current standing and next-semester advisor discussion.
6. Switch to `Planned Path`, select a planning target, and upload `sources/auburn/degreeworks-plan-sample.pdf`.
7. Confirm the Gap Report and Next Actions card appears before the detailed results and shows:
   - overall status
   - selected target path (or Auto with its inferred path)
   - missing requirements focused on that target
   - next actions and advisor questions
   - Trust notes grouped as source-backed, local model, and advisor review required
8. Confirm the Next Semester Suggestions card appears after the Gap Report and shows:
   - target path and confidence
   - suggested courses with reasons, priorities, known credits, and compact availability notes
   - zero-credit requirements under Advisor milestones rather than the normal course load
   - courses not yet recommended because modeled prerequisites need review
   - advisor questions and advisor-safe notes
9. Confirm the shared parsed details show:
   - source file name: `degreeworks-plan-sample.pdf`
   - parsed course count: `45`
   - total planned credits: `122`
   - parsed courses in the collapsible summary
   - course status summary counts for completed, in progress, planned, transfer/AP, substituted/waived, missing, and unknown courses
   - parsed course statuses in the collapsible status summary
   - parser confidence
   - PDF parsing notes when parser warnings or signals are present
10. Confirm the Semester and prerequisite check appears with detected terms, confidence, advisor-review items, and sequence validity.
   - The prerequisite and availability sections are labeled as local conservative models that require Auburn bulletin/advisor verification.
11. Confirm the AI Engineering certificate result shows likely complete: `Yes`.
12. Confirm the Software Engineering degree progress result shows:
   - likely complete: `No`
   - missing exact courses: `ENGL 1100`, `ENGL 1120`, `ENGR 1100`, `ELEC 2200`
   - Requirement Blocks with core/elective statuses such as advisor review
   - advisor verification required
13. Confirm the Computer Science degree progress result shows:
   - likely complete: `No`
   - missing exact courses: `ENGL 1100`, `ENGL 1120`, `ENGR 1100`, `ELEC 2200`, `COMP 4200`
   - Requirement Blocks with core/elective statuses such as advisor review
   - advisor verification required
14. Confirm the Draft Semester Plan appears after Next Semester Suggestions and shows:
   - target path and confidence
   - semester cards with exact modeled courses, estimated credits, and offering-verification notes
   - any unplaced courses and their reasons
   - unresolved core/elective blocks as advisor-review items
   - wording that it is a draft planning aid, not an official academic plan
15. Confirm the Advisor Meeting Summary appears with the selected target, parser confidence and course-status counts, up to five missing items, top actions, the first draft semester or top suggestions, and no more than eight advisor questions. Detailed AI, Software Engineering, Computer Science, requirement-block, and parsed-status information remains on the page instead of being duplicated in the copyable summary.
16. Optional separate checks remain available:
   - Paste custom AI certificate courses, such as `COMP 5600, COMP 5630, COMP 5130, COMP 5610`.
   - Run the AI certificate sample or AI certificate PDF upload.
   - Run the Software Engineering manual, sample, or separate Degree Works PDF checker.
   - Run the Computer Science manual, sample, or separate Degree Works PDF checker.
   - Use `Generate draft plan` beside any manual course entry to call the standalone deterministic planner for that target path.
17. Open `http://localhost:3000/rule-audit` and confirm:
   - the compact Source integrity summary reports the local checked-in source status, warning count, and runtime check time;
   - AI Engineering certificate, Software Engineering, and Computer Science program cards render;
   - exact-course, source-backed, local-model, and advisor-review counts are visible;
   - advisor-review-only requirement blocks are clearly labeled and are not treated as fully verified;
   - prerequisite and course-planning metadata appear as conservative supporting models;
   - global limitations and recommended next improvements are visible.

## How to export Degree Works PDFs

For the default `Current Progress` workflow, use the Degree Works Worksheet/Audit PDF:

1. Open Auburn Degree Works.
2. Go to `Worksheets`.
3. Click the print icon on the Worksheet page.
4. Choose dimensions if prompted.
5. Click `Open PDF`.
6. In the PDF viewer, click the download icon or save the PDF.
7. Upload that saved PDF under `Current Progress`.

For the `Planned Path` workflow, use the printable Degree Works plan PDF from the Plans tab:

1. Open Auburn Degree Works.
2. Go to `Plans`.
3. Open the plan you want to check.
4. Click the print icon on the Plans page.
5. Degree Works opens a printable plan page.
6. Click the print icon again.
7. In the browser print dialog, choose `Save as PDF`.
8. Upload that saved PDF under `Planned Path`.

Upload the saved PDF, not a screenshot. The PDF is processed server-side for this check and is not permanently stored. Handle private student details carefully, and do not commit real student names, IDs, GPAs, audit dates, advisor emails, screenshots, or exact personal academic records to the repo.

## Trust and safety

- The assistant is designed around official Auburn sources.
- Sources are shown when RAG retrieves material.
- Certificate, Software Engineering degree progress, and Computer Science degree progress logic are checked by deterministic local rules.
- Deterministic rule results include inspectable provenance: catalog year, source ID/title, checked-in source file or Auburn bulletin URL when available, an evidence label, and a confidence classification.
- `source_backed` means the rule is transcribed from the checked-in Auburn bulletin source; `local_model` means conservative locally maintained prerequisite or availability logic; `advisor_review_required` means the app intentionally cannot resolve the requirement authoritatively.
- Provenance improves trust by making the origin and limits of each check visible without implying that local rules replace the official bulletin, Degree Works, or an advisor.
- The Rule Coverage and Trust Audit makes those boundaries comparable across all three supported programs. It counts exact course rules separately from requirement blocks, exposes prerequisite and planning metadata as supporting local models, and identifies concrete gaps before the planner can be considered closer to complete.
- Source integrity checks compare local provenance and manifest metadata, verify referenced files and public bulletin URLs, and conservatively flag exact-course drift. They do not query live Auburn pages or prove that checked-in material is currently official.
- The audit is a deterministic transparency tool, not an official Auburn audit. Its advisor-review-only blocks are never treated as fully verified.
- Software Engineering and Computer Science core/elective requirement blocks are deterministic, conservative checks. Exact blocks can be satisfied by matched courses, candidate-only elective blocks remain advisor review unless the local approved-course data is strong enough, and insufficient source data is labeled for advisor review instead of being overclaimed.
- Uploaded PDFs are processed transiently in memory for course extraction and are not permanently stored.
- All PDF upload routes reject files larger than 10 MiB, files without a PDF signature, unreadable or empty PDFs, and documents with more than 1,000,000 extracted characters. Validation errors are returned with user-friendly `400`, `413`, or `422` responses.
- Uploaded PDF checks are deterministic and do not call Gemini.
- The target selector changes only focused planning outputs. It does not skip or hide the detailed AI certificate, Software Engineering, or Computer Science checks.
- Current Progress uses Degree Works Worksheet/Audit PDFs and preserves status-aware current standing. Completed, preregistered, in-progress, AP/transfer satisfied, Fall Through/non-degree-applicable, still-needed, and unknown course evidence is kept separate. AP and transfer credits are also detected from Degree Works `Satisfied by:` lines when the worksheet provides readable evidence.
- Current Progress suggestions prioritize Degree Works `Still needed` lines and incomplete blocks, but completed courses are not suggested again. Preregistered and in-progress courses appear as verification items instead of new recommendations.
- Planned Path uses Degree Works Plan PDFs to validate a proposed future multi-semester graduation path. It focuses on timeline feasibility, semester load, prerequisites, unresolved blocks, parser evidence, and advisor-review items.
- Degree Works PDF results include parser confidence, parser warnings, and detected AP, transfer, substitution, exception, in-progress, or insufficient-text signals when the extracted text suggests extra advisor review is needed.
- Degree Works course status interpretation is deterministic and conservative. It can label courses as completed, in progress, planned, transfer/AP, substituted/waived, missing, or unknown when nearby extracted text provides enough evidence.
- Unknown or unclear course statuses require advisor verification. Status interpretation helps prepare questions; it does not replace Degree Works, the Registrar, or academic advisors.
- The Gap Report and Next Actions card is a planning summary, not an official degree audit. It is intended to help students prepare for advisor meetings before reading the detailed check cards.
- Next Semester Suggestions are deterministic planning suggestions to discuss with an academic advisor. They are not registration advice, an official schedule, or a full graduation plan.
- Course availability, prerequisites, AP/transfer credit, substitutions, semester load, and advisor approval may change Next Semester Suggestions.
- Course planning metadata reuses titles and credit hours from checked-in Auburn rules. Live offerings are not available locally, so unknown availability is labeled for advisor or department verification rather than presented as fact.
- Fall/Spring placement in checked-in bulletin plan grids is treated only as a curriculum hint. It does not prove that a course will be offered in a future target term and does not block draft placement.
- Draft Semester Plans are conservative, deterministic advising aids. They only place exact locally modeled requirements with known credit hours, never invent unresolved elective choices, and cap the draft at 15 credits per semester and six semesters by default.
- Zero-credit orientation, program assessment, and graduation requirements—including ENGR 1100, COMP 4810, and UNIV 4AA0—remain visible as advisor milestones/review items and are not counted as ordinary suggestions, semester courses, or credit load.
- Draft Semester Plans are not official academic plans. Course availability, prerequisites, substitutions, AP/transfer credit, catalog applicability, and semester load must be confirmed with an academic advisor.
- The combined Degree Works PDF flow includes deterministic semester extraction when term labels are present and a conservative local Software Engineering prerequisite sequence check.
- The prerequisite sequence model is preliminary and intentionally limited to a conservative subset of COMP prerequisite chains. It reports warnings and advisor-review items, not official registration decisions.
- The concise Advisor Meeting Summary is local, deterministic, and does not call Gemini. It intentionally caps missing items, next actions, planning suggestions, and advisor questions rather than dumping every detailed check field.
- Advisor verification is required for academic decisions.
- The Software Engineering checker, Computer Science checker, and prerequisite sequence checker are progress checks, not final academic judgments. Real Degree Works PDFs can include AP, transfer credit, substitutions, exceptions, hidden sections, in-progress coursework, electives, prerequisites, standing requirements, and semester ordering that still require advisor review.
- The Advisor Meeting Summary is a preparation summary, not an official degree audit.
- The app helps prepare for advising conversations; it does not replace academic advisors.

## What works now

- `/chat` supports Auburn source-grounded advising questions through Gemini File Search.
- Assistant answers show retrieved sources, confidence, and an advisor verification note.
- The AI Engineering certificate checker can evaluate local course lists without using Gemini quota.
- `/plan-check` is the Planning Hub. It defaults to `Current Progress`, the recommended path for most students, which analyzes a Worksheet/Audit PDF for current standing and next-semester advisor discussion without calling Gemini or permanently storing the PDF.
- `Current Progress` results lead with worksheet credits, degree status, status buckets, friendly AP/transfer credit labels, still-needed courses, current-state suggestions, verification items, parser diagnostics, and a copyable Advisor Meeting Summary.
- `Planned Path` keeps the existing combined Degree Works Plan PDF behavior for proposed future graduation plans: it analyzes one uploaded plan PDF once, focuses planning reports on the selected target, shows shared parser and course-status details, and still runs all three detailed checkers.
- Planned Path results lead with the Gap Report, next-semester suggestions, draft semester timeline, and copyable Advisor Meeting Summary; parser evidence, program audits, and manual checks remain available in secondary expandable sections.
- The Software Engineering degree checker can evaluate pasted plans, the sample Degree Works plan, a separate uploaded Degree Works PDF, or the combined upload result against deterministic local rules, including parsed course count, total planned credits, required credits, missing exact courses, structured requirement blocks, parser diagnostics, and advisor verification status.
- The Computer Science degree checker can evaluate pasted plans, the sample Degree Works plan, a separate uploaded Degree Works PDF, or the combined upload result against deterministic local rules, including parsed course count, total planned credits, required credits, missing exact courses, alternative course groups, structured requirement blocks, parser diagnostics, and advisor verification status.
- The standalone `POST /api/plan/draft-semester-plan` route generates the same deterministic draft shape for manually entered AI certificate, Software Engineering, or Computer Science course lists and optionally accepts `startingTermLabel` for term-aware review.
- The `/rule-audit` page and `GET /api/rules/coverage-audit` route expose a deterministic audit of exact rule coverage, requirement-block confidence, source integrity, supporting models, known limitations, and recommended improvements.
- The Advisor Meeting Summary turns the focused gap report and planning results into short copyable preparation notes while the page retains complete detailed results.
- Local validation currently passes `180/180` deterministic tests.
- Desktop and mobile chat layouts include program and source panels and distinguish source-grounded chat explanations from deterministic Planning Hub workflows.

## Degree Works compatibility fixtures

The deterministic regression suite includes synthetic extracted-text fixtures under `tests/fixtures/degreeworks/`. They contain no real student data and cover:

- clean planned-course text and term labels;
- Worksheet current-progress audits with credits required/applied/needed, complete and incomplete blocks, and Still needed lines;
- preregistered Worksheet courses that should be verified rather than suggested again;
- Worksheet AP/transfer `Satisfied by:` evidence and Fall Through/non-degree-applicable evidence;
- low-confidence Worksheet text;
- transfer, AP, IB, and AICE credit indicators;
- in-progress and registered coursework;
- substitutions, exceptions, petitions, and waived requirements;
- low-quality or incomplete extracted text;
- mixed Computer Science, Software Engineering, and AI certificate plans;
- course-code, planned-credit, current-credit, status, parser-confidence, requirement-block, gap-report, next-semester-suggestion, current-state suggestion, and draft-plan behavior.

Fixture tests call the same pure combined-analysis pipeline used after PDF text extraction by the upload route. This keeps multipart/PDF handling separate while regression-testing the complete deterministic planning result without storing or uploading PDFs.

The fixtures improve compatibility coverage but cannot model every Degree Works catalog, layout, OCR result, equivalency, hidden block, or institution-specific exception. Ambiguous statuses remain `unknown`, weak total-credit evidence remains `null`, and substitutions, waivers, transfer/AP credit, AP/transfer equivalencies from `Satisfied by:` lines, requirement applicability, and completion decisions require Degree Works and academic-advisor verification. The planner does not replace Degree Works or an academic advisor.

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment example:

   ```bash
   copy .env.example .env.local
   ```

3. Fill in `.env.local`:

   ```env
   GEMINI_API_KEY=
   GEMINI_MODEL=gemini-2.5-flash
   GEMINI_FILE_SEARCH_STORE_NAME=
   ```

4. Upload the Auburn sources if you have not already created a Gemini File Search store:

   ```bash
   npm run sources:upload
   ```

   Copy the printed `GEMINI_FILE_SEARCH_STORE_NAME=...` value into `.env.local`.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000/chat`.

## Create the Gemini File Search Store

1. Collect current official Auburn source material for the supported programs:
   - Auburn Bulletin pages for Software Engineering
   - Auburn Bulletin pages for Computer Science
   - Auburn Bulletin pages or PDFs for the Artificial Intelligence Engineering certificate
   - Any official Auburn CSSE advising PDFs you want the assistant to use

2. Save each source file under `sources/`. Nested folders are supported, such as:
   - `sources/auburn/software-engineering-bulletin.html`
   - `sources/auburn/computer-science-bulletin.html`
   - `sources/auburn/cs-flowchart-spring-2025.pdf`

3. Update `sources/manifest.json`. The current format is a top-level array, and each `fileName` must point to a file under `sources/`:

   ```json
   [
     {
       "id": "auburn-software-engineering-bulletin",
       "title": "Software Engineering B.S. Bulletin",
       "type": "bulletin",
       "program": "software_engineering",
       "catalogYear": "2025-2026",
       "fileName": "auburn/software-engineering-bulletin.html",
       "url": "https://bulletin.auburn.edu/",
       "lastChecked": "2026-06-13"
     }
   ]
   ```

4. Make sure `GEMINI_API_KEY` is available. The upload script reads it from the shell environment first, then from `.env.local` or `.env`.

   PowerShell example:

   ```powershell
   $env:GEMINI_API_KEY="..."
   ```

   `.env.local` example:

   ```env
   GEMINI_API_KEY=...
   ```

5. Upload the sources and create the Gemini File Search store:

   ```bash
   npm run sources:upload
   ```

   The script creates one store named `Auburn Academic Planner Sources`, uploads every manifest source, waits for each upload operation, and prints:

   ```bash
   GEMINI_FILE_SEARCH_STORE_NAME=fileSearchStores/...
   ```

6. Copy that store name into `.env.local`:

   ```env
   GEMINI_FILE_SEARCH_STORE_NAME=fileSearchStores/...
   ```

## Source Manifest

`sources/manifest.json` uses a top-level array. Each source entry should include:

```json
{
  "id": "auburn-computer-science-bulletin",
  "title": "Computer Science B.S. Bulletin",
  "type": "bulletin",
  "program": "computer_science",
  "catalogYear": "2025-2026",
  "fileName": "auburn/computer-science-bulletin.html",
  "url": "https://bulletin.auburn.edu/",
  "lastChecked": "2026-06-13"
}
```

Do not add unofficial or stale material unless you clearly label it. The assistant is designed to answer degree-requirement questions only from retrieved Auburn sources.

This project also keeps a separate scoped expansion seed list at `sources/auburn/academic-source-seeds.json`. The seed list is not a crawler queue and is not uploaded by `npm run sources:upload`; it records official Auburn academic sources that are eligible for future review. See `sources/README.md` for the source tiers:

- Tier 1 deterministic rule sources are official program or certificate pages that have been manually converted into local rule JSON.
- Tier 2 RAG academic advising sources include Auburn Bulletin academic pages, Courses of Instruction, Core Curriculum, Registrar, Degree Works, transfer credit, AP credit, and college academic requirement pages.
- Tier 3 excluded sources include athletics, news, marketing, archived pages, unrelated departments, person/student pages, and random non-requirement PDFs.

Validate the scoped seed list locally with:

```bash
npm run sources:check-scope
```

The scope check validates local seed metadata and classification rules only. It never fetches live Auburn URLs.

### Check local source integrity

Run the deterministic local source audit with:

```bash
npm run check:sources
```

The command parses `sources/manifest.json`, validates rule source IDs and catalog years, checks that every provenance file exists, requires Auburn bulletin URLs for public program sources, and compares exact required courses with the matching checked-in bulletin HTML. The AI certificate guard also checks for COMP 5600, COMP 5630, COMP 5130, and evidence of the 12-credit-hour requirement.

Missing or inconsistent metadata and missing source-backed course evidence fail the command. A valid `lastChecked` date older than 180 days produces a review warning without failing. These checks use only local checked-in files; they never fetch live Auburn pages. The guard helps expose possible rule drift, but the Auburn bulletin, Degree Works, and an academic advisor remain authoritative.

## Model Configuration

`GEMINI_MODEL` is optional. If it is missing, the app uses `gemini-2.5-flash` through `getGeminiModel()`.

You can change `GEMINI_MODEL` for cost, speed, or quality experiments. For production academic planning questions, evaluate answer quality and source-grounding behavior before changing the default.

Gemini configuration is required only for `/chat` and the optional source-upload/evaluation scripts. Deterministic `/plan-check`, `/rule-audit`, upload validation, source integrity, tests, and CI do not call Gemini and do not require Gemini environment variables.

## RAG Behavior

The `/api/chat` route uses Gemini `generateContent` with the File Search tool enabled against `GEMINI_FILE_SEARCH_STORE_NAME`.

Every assistant answer is normalized to include:

- `answer`
- `sources`
- `confidence`
- `advisorVerificationNote`

Displayed sources come from Gemini grounding metadata, not model-written citation text. If no real Auburn source is retrieved, the UI shows "No retrieved Auburn source found," and the answer is treated as low confidence.

## Production readiness and deployment

The repository includes `.github/workflows/ci.yml`. Pushes and pull requests use Node.js 22, install the checked-in `package-lock.json` with `npm ci`, and run the complete local validation gate without Gemini calls or live Auburn requests.

Run the same gate locally with:

```bash
npm run validate
```

The command runs deterministic tests, local source integrity, ESLint, TypeScript, and the production Next.js build. The production `/rule-audit` loader uses a fixed, build-traceable set of checked-in source and rule files; fixture-directory discovery remains isolated to the source-check script and tests. This prevents Turbopack from tracing the whole project while keeping the runtime audit deployable.

Deployment requirements:

- Use Node.js 22 and install dependencies from `package-lock.json`.
- Include the checked-in `sources/` and `rules/` files traced by the production build.
- Configure `GEMINI_API_KEY`, optional `GEMINI_MODEL`, and `GEMINI_FILE_SEARCH_STORE_NAME` only when deploying `/chat`.
- Do not configure persistent upload storage: PDF routes process request data in memory and discard it after the response.
- Keep request-body limits at or above 10 MiB at the hosting proxy if PDF uploads are enabled; the application applies its own 10 MiB limit.

## Verification

Run:

```bash
npm test
npm run check:sources
npm run lint
npx tsc --noEmit
npm run build
```

Current validation coverage:

- 180 deterministic tests through `npm test`, including source integrity, upload safety and route errors, rule coverage audit, synthetic planned-path Degree Works fixtures, and synthetic current-progress Worksheet fixtures
- `npm run check:sources`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Manual checks:

- `/chat` shows the empty state before any messages.
- The app shows loading and error states during chat requests.
- Assistant answers include sources used, confidence, and advisor verification note.
- Desktop shows the left program rail and right Sources panel.
- Mobile collapses both panels into drawers.
- The UI never claims to replace advisors and does not offer registration automation.
- `/rule-audit` shows the local source integrity status, warning count, and runtime check timestamp.
- `/plan-check` continues to render after the source audit integration.
