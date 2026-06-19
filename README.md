# Auburn Academic Planner

Auburn Academic Planner is a first prototype of a source-grounded academic planning assistant for Auburn CSSE students. It focuses on Software Engineering, Computer Science, and the Artificial Intelligence Engineering certificate.

The app is intentionally limited: it does not implement login, payments, automatic registration, official degree audits, or multi-school support. It helps students prepare for advising conversations and does not replace Auburn academic advisors.

## Current MVP

The MVP supports two complementary paths:

- Gemini RAG chat for Auburn source-grounded advising questions.
- Deterministic requirement checkers for quota-free progress review.
- `/plan-check` supports a combined Degree Works PDF upload with an Auto, Software Engineering, Computer Science, or AI Engineering certificate planning target. The selected target focuses the Gap Report, Next Semester Suggestions, Draft Semester Plan, and concise copyable Advisor Meeting Summary while all three detailed deterministic checks still run and remain visible.

## Demo flow

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000/chat`.
3. Ask: `What courses are required for the Artificial Intelligence Engineering certificate?`
4. Open `http://localhost:3000/plan-check`.
5. In `Analyze Degree Works PDF`, select a planning target and upload `sources/auburn/degreeworks-plan-sample.pdf`.
6. Confirm the Gap Report and Next Actions card appears before the detailed results and shows:
   - overall status
   - selected target path (or Auto with its inferred path)
   - missing requirements focused on that target
   - next actions and advisor questions
7. Confirm the Next Semester Suggestions card appears after the Gap Report and shows:
   - target path and confidence
   - suggested courses with reasons, priorities, known credits, and compact availability notes
   - courses not yet recommended because modeled prerequisites need review
   - advisor questions and advisor-safe notes
8. Confirm the shared parsed details show:
   - source file name: `degreeworks-plan-sample.pdf`
   - parsed course count: `45`
   - total planned credits: `122`
   - parsed courses in the collapsible summary
   - course status summary counts for completed, in progress, planned, transfer/AP, substituted/waived, missing, and unknown courses
   - parsed course statuses in the collapsible status summary
   - parser confidence
   - PDF parsing notes when parser warnings or signals are present
9. Confirm the Semester and prerequisite check appears with detected terms, confidence, advisor-review items, and sequence validity.
10. Confirm the AI Engineering certificate result shows likely complete: `Yes`.
11. Confirm the Software Engineering degree progress result shows:
   - likely complete: `No`
   - missing exact courses: `ENGL 1100`, `ENGL 1120`, `ENGR 1100`, `ELEC 2200`
   - Requirement Blocks with core/elective statuses such as advisor review
   - advisor verification required
12. Confirm the Computer Science degree progress result shows:
   - likely complete: `No`
   - missing exact courses: `ENGL 1100`, `ENGL 1120`, `ENGR 1100`, `ELEC 2200`, `COMP 4200`
   - Requirement Blocks with core/elective statuses such as advisor review
   - advisor verification required
13. Confirm the Draft Semester Plan appears after Next Semester Suggestions and shows:
   - target path and confidence
   - semester cards with exact modeled courses, estimated credits, and offering-verification notes
   - any unplaced courses and their reasons
   - unresolved core/elective blocks as advisor-review items
   - wording that it is a draft planning aid, not an official academic plan
14. Confirm the Advisor Meeting Summary appears with the selected target, parser confidence and course-status counts, up to five missing items, top actions, the first draft semester or top suggestions, and no more than eight advisor questions. Detailed AI, Software Engineering, Computer Science, requirement-block, and parsed-status information remains on the page instead of being duplicated in the copyable summary.
15. Optional separate checks remain available:
   - Paste custom AI certificate courses, such as `COMP 5600, COMP 5630, COMP 5130, COMP 5610`.
   - Run the AI certificate sample or AI certificate PDF upload.
   - Run the Software Engineering manual, sample, or separate Degree Works PDF checker.
   - Run the Computer Science manual, sample, or separate Degree Works PDF checker.
   - Use `Generate draft plan` beside any manual course entry to call the standalone deterministic planner for that target path.

## Trust and safety

- The assistant is designed around official Auburn sources.
- Sources are shown when RAG retrieves material.
- Certificate, Software Engineering degree progress, and Computer Science degree progress logic are checked by deterministic local rules.
- Software Engineering and Computer Science core/elective requirement blocks are deterministic, conservative checks. Exact blocks can be satisfied by matched courses, candidate-only elective blocks remain advisor review unless the local approved-course data is strong enough, and insufficient source data is labeled for advisor review instead of being overclaimed.
- Uploaded PDFs are processed server-side for course extraction.
- Uploaded PDFs are not permanently stored.
- Uploaded PDF checks are deterministic and do not call Gemini.
- The target selector changes only focused planning outputs. It does not skip or hide the detailed AI certificate, Software Engineering, or Computer Science checks.
- Degree Works PDF results include parser confidence, parser warnings, and detected AP, transfer, substitution, exception, in-progress, or insufficient-text signals when the extracted text suggests extra advisor review is needed.
- Degree Works course status interpretation is deterministic and conservative. It can label courses as completed, in progress, planned, transfer/AP, substituted/waived, missing, or unknown when nearby extracted text provides enough evidence.
- Unknown or unclear course statuses require advisor verification. Status interpretation helps prepare questions; it does not replace Degree Works, the Registrar, or academic advisors.
- The Gap Report and Next Actions card is a planning summary, not an official degree audit. It is intended to help students prepare for advisor meetings before reading the detailed check cards.
- Next Semester Suggestions are deterministic planning suggestions to discuss with an academic advisor. They are not registration advice, an official schedule, or a full graduation plan.
- Course availability, prerequisites, AP/transfer credit, substitutions, semester load, and advisor approval may change Next Semester Suggestions.
- Course planning metadata reuses titles and credit hours from checked-in Auburn rules. Live offerings are not available locally, so unknown availability is labeled for advisor or department verification rather than presented as fact.
- Fall/Spring placement in checked-in bulletin plan grids is treated only as a curriculum hint. It does not prove that a course will be offered in a future target term and does not block draft placement.
- Draft Semester Plans are conservative, deterministic advising aids. They only place exact locally modeled requirements with known credit hours, never invent unresolved elective choices, and cap the draft at 15 credits per semester and six semesters by default.
- Zero-credit program assessment and graduation requirements are advisor-review milestones and are not counted as ordinary semester courses or credit load.
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
- The combined Degree Works PDF upload is the main demo flow: it analyzes one uploaded PDF once, focuses planning reports on the selected target, shows shared parser and course-status details, and still runs all three detailed checkers without calling Gemini or permanently storing the PDF.
- The Software Engineering degree checker can evaluate pasted plans, the sample Degree Works plan, a separate uploaded Degree Works PDF, or the combined upload result against deterministic local rules, including parsed course count, total planned credits, required credits, missing exact courses, structured requirement blocks, parser diagnostics, and advisor verification status.
- The Computer Science degree checker can evaluate pasted plans, the sample Degree Works plan, a separate uploaded Degree Works PDF, or the combined upload result against deterministic local rules, including parsed course count, total planned credits, required credits, missing exact courses, alternative course groups, structured requirement blocks, parser diagnostics, and advisor verification status.
- The standalone `POST /api/plan/draft-semester-plan` route generates the same deterministic draft shape for manually entered AI certificate, Software Engineering, or Computer Science course lists and optionally accepts `startingTermLabel` for term-aware review.
- The Advisor Meeting Summary turns the focused gap report and planning results into short copyable preparation notes while the page retains complete detailed results.
- Local validation currently passes `109/109` deterministic tests.
- Desktop and mobile chat layouts include program and source panels.

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

## Model Configuration

`GEMINI_MODEL` is optional. If it is missing, the app uses `gemini-2.5-flash` through `getGeminiModel()`.

You can change `GEMINI_MODEL` for cost, speed, or quality experiments. For production academic planning questions, evaluate answer quality and source-grounding behavior before changing the default.

## RAG Behavior

The `/api/chat` route uses Gemini `generateContent` with the File Search tool enabled against `GEMINI_FILE_SEARCH_STORE_NAME`.

Every assistant answer is normalized to include:

- `answer`
- `sources`
- `confidence`
- `advisorVerificationNote`

Displayed sources come from Gemini grounding metadata, not model-written citation text. If no real Auburn source is retrieved, the UI shows "No retrieved Auburn source found," and the answer is treated as low confidence.

## Verification

Run:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Current validation coverage:

- 109 deterministic tests through `npm test`
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
