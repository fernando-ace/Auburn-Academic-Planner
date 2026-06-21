# Auburn Academic Planner

Auburn Academic Planner helps Auburn students interpret Degree Works audits, compare planned paths, ask source-grounded academic questions, and prepare for advisor meetings.

The app works from Degree Works-native evidence for any Auburn program when the uploaded PDF contains readable text. Local catalog enrichments are currently available for Software Engineering, Computer Science, and the Artificial Intelligence Engineering certificate.

It does not replace Degree Works, the Auburn Bulletin, or academic advisors. It is an advising-preparation tool, not an official Auburn audit, registration system, or final academic judgment.

## Live demo

https://auburn-academic-planner.vercel.app

Main routes:

- `/plan-check` - Degree Works-native planning hub for Current Progress and Planned Path workflows.
- `/chat` - source-grounded Auburn academic questions.
- `/rule-audit` - local rule coverage, provenance, and trust-boundary audit.

## What it does

- `Current Progress` analyzes readable Auburn Degree Works Worksheet/Audit PDFs for current standing and advisor discussion.
- `Planned Path` validates readable Degree Works Plan PDFs for proposed future course plans.
- Planned Path comparison checks a proposed plan against Current Progress still-needed evidence when both PDFs are available.
- Source-grounded chat answers Auburn academic questions using retrieved academic materials.
- Rule Coverage and Trust Audit shows which local rules are source-backed, locally modeled, or intentionally left for advisor review.
- Advisor Meeting Summary turns planning results into short copyable notes for advisor conversations.
- Upload safety keeps PDF processing transient, validates inputs, and does not permanently store uploaded PDFs.

## Demo flow

For a short local demo:

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000/plan-check`.
3. Use `Current Progress` with a safe Worksheet/Audit PDF. Show the detected program, credits, incomplete blocks, still-needed items, AP/transfer labels, next-step suggestions, and Advisor Meeting Summary.
4. Switch to `Planned Path` and upload `sources/auburn/degreeworks-plan-sample.pdf`.
5. Show the planned-path comparison, gap report, draft semester plan, and detailed checks.
6. Open `http://localhost:3000/rule-audit` to show local rule provenance, source-backed checks, local models, advisor-review boundaries, and known limitations.
7. Optional: open `http://localhost:3000/chat` and ask about transfer credit or Artificial Intelligence Engineering certificate requirements.

Secondary deterministic APIs and legacy manual/sample checks remain available for developer verification, but they are not the main Planning Hub workflow.

## How to export Degree Works PDFs

For `Current Progress`, use the Degree Works Worksheet/Audit PDF:

1. Open Auburn Degree Works.
2. Go to `Worksheets`.
3. Click the print icon on the Worksheet page.
4. Choose dimensions if prompted.
5. Click `Open PDF`.
6. In the PDF viewer, click the download icon or save the PDF.
7. Upload that saved PDF under `Current Progress`.

For `Planned Path`, use the printable Degree Works plan PDF from the Plans tab:

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

- Advisor-safe scope: Auburn Academic Planner helps students prepare for advising conversations. It does not replace Degree Works, the Auburn Bulletin, the Registrar, or academic advisors, and it does not provide registration automation or official degree audits.
- Degree Works-native analysis: `Current Progress` works from readable Worksheet/Audit PDFs for any Auburn program, while `Planned Path` works from readable Degree Works Plan PDFs. Planned Path comparison uses Current Progress still-needed evidence when both workflows have been uploaded.
- Local catalog enrichments: Software Engineering, Computer Science, and Artificial Intelligence Engineering certificate checks add deterministic local catalog context when applicable. These enrichments are optional and are labeled separately from Degree Works-native evidence.
- Upload privacy and safety: PDF upload routes process files transiently in memory and do not permanently store uploaded PDFs. They reject oversized files, non-PDF signatures, unreadable or empty PDFs, and documents with excessive extracted text. Uploaded PDF checks are deterministic and do not call Gemini.
- Parser limitations: Degree Works PDFs can include AP credit, transfer credit, substitutions, exceptions, hidden sections, in-progress coursework, electives, prerequisites, standing requirements, and semester ordering that still require advisor review. Unknown or unclear statuses remain `unknown` or advisor-review items instead of being overclaimed.
- Rule provenance and source integrity: Deterministic rule results expose source IDs, catalog years, evidence labels, and confidence classifications. `source_backed` means checked-in Auburn source evidence supports the rule, `local_model` means conservative locally maintained logic, and `advisor_review_required` means the app intentionally cannot resolve the requirement authoritatively. `npm run check:sources` uses local checked-in files only; it does not fetch live Auburn pages or prove that local material is currently official.
- Planning outputs: Gap reports, next-step suggestions, draft semester plans, prerequisite sequence checks, and Advisor Meeting Summaries are conservative advising aids. Course availability, prerequisites, substitutions, AP/transfer credit, catalog applicability, semester load, and advisor approval must be confirmed with Auburn advising.

## What works now

- `/chat` supports Auburn source-grounded advising questions through Gemini File Search.
- Assistant answers show retrieved sources, confidence, and an advisor verification note.
- `/plan-check` is the Planning Hub. It defaults to `Current Progress`, the recommended path for most students, and analyzes any readable Auburn Degree Works Worksheet/Audit PDF for current standing and advisor discussion without calling Gemini or permanently storing the PDF.
- `Current Progress` results lead with detected program, available enrichments, worksheet credits, degree status, status buckets, friendly AP/transfer credit labels, structured still-needed items, current-state suggestions, verification items, parser diagnostics, and a copyable Advisor Meeting Summary.
- `Planned Path` analyzes one uploaded Degree Works Plan PDF, focuses planning reports on the selected target, shows shared parser and course-status details, and can compare the plan against Current Progress still-needed requirements.
- Planned Path results lead with the Gap Report, next-semester suggestions, draft semester timeline, and copyable Advisor Meeting Summary; parser evidence and optional local enrichment details remain available in secondary sections.
- Local deterministic enrichments currently exist for Software Engineering, Computer Science, and the Artificial Intelligence Engineering certificate, including exact-course checks, requirement-block review, draft planning support, and advisor-verification labels where local evidence is incomplete.
- Secondary standalone APIs and older manual/sample checkers remain available for developer verification, but they are not the main Planning Hub experience.
- The `/rule-audit` page and `GET /api/rules/coverage-audit` route expose a deterministic audit of exact rule coverage, requirement-block confidence, source integrity, supporting models, known limitations, and recommended improvements.
- The Advisor Meeting Summary turns the focused gap report and planning results into short copyable preparation notes while the page retains complete detailed results.
- Local validation currently passes `216/216` deterministic tests.
- Desktop and mobile chat layouts include program and source panels and distinguish source-grounded chat explanations from deterministic Planning Hub workflows.

## Degree Works compatibility fixtures

The deterministic regression suite includes synthetic extracted-text fixtures under `tests/fixtures/degreeworks/`. They contain no real student data and cover:

- clean planned-course text and term labels;
- Worksheet current-progress audits with credits required/applied/needed, complete and incomplete blocks, and Still needed lines;
- non-CSSE engineering, business, and liberal arts/sciences Worksheet examples for Degree Works-native parsing without local catalog rules;
- structured option-list, credit-hour elective, block-reference, and milestone Still needed requirements;
- planned-path comparison against Current Progress still-needed requirements;
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

6. Open `http://localhost:3000/plan-check` for planning workflows or `http://localhost:3000/chat` for source-grounded chat.

## Create the Gemini File Search Store

1. Collect current official Auburn source material for the supported programs:
   - Auburn Bulletin pages for Software Engineering
   - Auburn Bulletin pages for Computer Science
   - Auburn Bulletin pages or PDFs for the Artificial Intelligence Engineering certificate
   - Any official Auburn academic or advising PDFs you want the assistant to use

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

5. Preview the exact upload inventory without calling Gemini:

   ```bash
   npm run sources:upload -- --dry-run
   ```

6. Upload the sources and create the Gemini File Search store:

   ```bash
   npm run sources:upload
   ```

   The script creates one store named `Auburn Academic Planner Sources`, uploads every manifest source, waits for each upload operation, and prints:

   ```bash
   GEMINI_FILE_SEARCH_STORE_NAME=fileSearchStores/...
   ```

7. Copy that store name into `.env.local`:

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

This project also keeps a separate scoped expansion seed list at `sources/auburn/academic-source-seeds.json`. The seed list is not a crawler queue; it records official Auburn academic sources that are eligible for review before any fetch or upload. See `sources/README.md` for the source tiers:

- Tier 1 deterministic rule sources are official program or certificate pages that have been manually converted into local rule JSON.
- Tier 2 RAG academic advising sources include Auburn Bulletin academic pages, Courses of Instruction, Core Curriculum, Registrar, Degree Works, transfer credit, AP credit, and college academic requirement pages.
- Tier 3 excluded sources include athletics, news, marketing, archived pages, unrelated departments, person/student pages, and random non-requirement PDFs.

Curated RAG-only source ingestion is explicit and non-recursive:

```bash
npm run sources:fetch:dry-run
npm run sources:fetch
```

The dry run prints the exact eligible RAG-only seed URLs that would be fetched. The live fetch saves only those exact pages under `sources/auburn/curated/` and writes `sources/auburn/curated/manifest.json`; it does not crawl links or all of `auburn.edu`. When the curated manifest exists, `npm run sources:upload` includes those cached RAG-only pages in the Gemini File Search upload alongside `sources/manifest.json`.

Curated source ingestion expands `/chat` retrieval coverage. It does not expand deterministic `/plan-check`, `/rule-audit`, Software Engineering, Computer Science, or AI certificate checks. A RAG-only page becomes deterministic only after a developer manually creates local rule JSON, provenance, source integrity coverage, and tests.

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

The command parses `sources/manifest.json`, validates rule source IDs and catalog years, checks that every provenance file exists, requires Auburn bulletin URLs for public program sources, and compares exact required courses with the matching checked-in bulletin HTML. The AI certificate guard also checks for COMP 5600, COMP 5630, COMP 5130, and evidence of the 12-credit-hour requirement. If `sources/auburn/curated/manifest.json` exists, the command also verifies that curated RAG cache files exist, are non-empty, still match the seed metadata, and are not being treated as deterministic rule sources.

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
npm run sources:check-scope
npm run lint
npm run typecheck
npm run build
npm run validate
```

Current validation coverage:

- 216 deterministic tests through `npm test`, including curated academic source ingestion, source integrity, upload safety and route errors, rule coverage audit, synthetic planned-path Degree Works fixtures, and synthetic current-progress Worksheet fixtures
- `npm run check:sources`
- `npm run lint`
- `npm run typecheck`
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
