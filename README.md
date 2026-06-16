# Auburn Academic Planner

Auburn Academic Planner is a first prototype of a source-grounded academic planning assistant for Auburn CSSE students. It focuses on Software Engineering, Computer Science, and the Artificial Intelligence Engineering certificate.

The app is intentionally limited: it does not implement login, payments, automatic registration, official degree audits, or multi-school support. It helps students prepare for advising conversations and does not replace Auburn academic advisors.

## Current MVP

The MVP supports two complementary paths:

- Gemini RAG chat for Auburn source-grounded advising questions.
- Deterministic requirement checkers for quota-free progress review.
- `/plan-check` supports a combined Degree Works PDF upload that runs the AI Engineering certificate check, Software Engineering degree progress check, Computer Science degree progress check, and deterministic semester/prerequisite sequence check from one upload, plus manual/sample/PDF checks for each deterministic requirement checker and a copyable Advisor Meeting Summary.

## Demo flow

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000/chat`.
3. Ask: `What courses are required for the Artificial Intelligence Engineering certificate?`
4. Open `http://localhost:3000/plan-check`.
5. In `Analyze Degree Works PDF`, upload `sources/auburn/degreeworks-plan-sample.pdf`.
6. Confirm the shared parsed details show:
   - source file name: `degreeworks-plan-sample.pdf`
   - parsed course count: `45`
   - total planned credits: `122`
   - parsed courses in the collapsible summary
   - parser confidence
   - PDF parsing notes when parser warnings or signals are present
7. Confirm the Semester and prerequisite check appears with detected terms, confidence, advisor-review items, and sequence validity.
8. Confirm the AI Engineering certificate result shows likely complete: `Yes`.
9. Confirm the Software Engineering degree progress result shows:
   - likely complete: `No`
   - missing exact courses: `ENGL 1100`, `ENGL 1120`, `ENGR 1100`, `ELEC 2200`
   - advisor verification required
10. Confirm the Computer Science degree progress result shows:
   - likely complete: `No`
   - missing exact courses: `ENGL 1100`, `ENGL 1120`, `ENGR 1100`, `ELEC 2200`, `COMP 4200`
   - advisor verification required
11. Confirm the Advisor Meeting Summary appears, includes AI Engineering certificate, Software Engineering degree progress, Computer Science degree progress, and prerequisite/advisor questions, and can be copied for an advising meeting.
12. Optional separate checks remain available:
   - Paste custom AI certificate courses, such as `COMP 5600, COMP 5630, COMP 5130, COMP 5610`.
   - Run the AI certificate sample or AI certificate PDF upload.
   - Run the Software Engineering manual, sample, or separate Degree Works PDF checker.
   - Run the Computer Science manual, sample, or separate Degree Works PDF checker.

## Trust and safety

- The assistant is designed around official Auburn sources.
- Sources are shown when RAG retrieves material.
- Certificate, Software Engineering degree progress, and Computer Science degree progress logic are checked by deterministic local rules.
- Uploaded PDFs are processed server-side for course extraction.
- Uploaded PDFs are not permanently stored.
- Uploaded PDF checks are deterministic and do not call Gemini.
- Degree Works PDF results include parser confidence, parser warnings, and detected AP, transfer, substitution, exception, in-progress, or insufficient-text signals when the extracted text suggests extra advisor review is needed.
- The combined Degree Works PDF flow includes deterministic semester extraction when term labels are present and a conservative local Software Engineering prerequisite sequence check.
- The prerequisite sequence model is preliminary and intentionally limited to a conservative subset of COMP prerequisite chains. It reports warnings and advisor-review items, not official registration decisions.
- The Advisor Meeting Summary is local, deterministic, and does not call Gemini.
- Advisor verification is required for academic decisions.
- The Software Engineering checker, Computer Science checker, and prerequisite sequence checker are progress checks, not final academic judgments. Real Degree Works PDFs can include AP, transfer credit, substitutions, exceptions, hidden sections, in-progress coursework, electives, prerequisites, standing requirements, and semester ordering that still require advisor review.
- The Advisor Meeting Summary is a preparation summary, not an official degree audit.
- The app helps prepare for advising conversations; it does not replace academic advisors.

## What works now

- `/chat` supports Auburn source-grounded advising questions through Gemini File Search.
- Assistant answers show retrieved sources, confidence, and an advisor verification note.
- The AI Engineering certificate checker can evaluate local course lists without using Gemini quota.
- The combined Degree Works PDF upload is the main demo flow: it can analyze one uploaded PDF once, show shared parsed details, parser confidence, parser warnings, detected PDF signals, detected semester terms, conservative prerequisite sequence warnings, and run the AI Engineering certificate checker, Software Engineering degree checker, and Computer Science degree checker without calling Gemini.
- The Software Engineering degree checker can evaluate pasted plans, the sample Degree Works plan, a separate uploaded Degree Works PDF, or the combined upload result against deterministic local rules, including parsed course count, total planned credits, required credits, missing exact courses, parser diagnostics, and advisor verification status.
- The Computer Science degree checker can evaluate pasted plans, the sample Degree Works plan, a separate uploaded Degree Works PDF, or the combined upload result against deterministic local rules, including parsed course count, total planned credits, required credits, missing exact courses, alternative course groups, parser diagnostics, and advisor verification status.
- The Advisor Meeting Summary turns the latest check results into copyable preparation notes with missing requirements, parser warnings, prerequisite warnings, advisor-verified items, and questions to ask.
- Local validation currently passes `56/56` deterministic tests.
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

- 56 deterministic tests through `npm test`
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
