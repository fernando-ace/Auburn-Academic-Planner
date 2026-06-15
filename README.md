# Auburn Academic Planner

Auburn Academic Planner is a first prototype of a source-grounded academic planning assistant for Auburn CSSE students. It focuses on Software Engineering, Computer Science, and the Artificial Intelligence Engineering certificate.

The app is intentionally limited: it does not implement login, payments, automatic registration, official degree audits, or multi-school support. It helps students prepare for advising conversations and does not replace Auburn academic advisors.

## Current MVP

The MVP supports two complementary paths:

- Gemini RAG chat for Auburn source-grounded advising questions.
- Deterministic AI certificate plan checker for quota-free requirement checks.

## Demo flow

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000/chat`.
3. Ask: `What courses are required for the Artificial Intelligence Engineering certificate?`
4. Use Plan Check with the sample plan.
5. Paste custom courses: `COMP 5600, COMP 5630, COMP 5130, COMP 5610`.

## Trust and safety

- The assistant is designed around official Auburn sources.
- Sources are shown when RAG retrieves material.
- Certificate requirement logic is checked by a deterministic local checker.
- Advisor verification is required for academic decisions.
- The app helps prepare for advising conversations; it does not replace academic advisors.

## What works now

- `/chat` supports Auburn source-grounded advising questions through Gemini File Search.
- Assistant answers show retrieved sources, confidence, and an advisor verification note.
- The AI Engineering certificate checker can evaluate local course lists without using Gemini quota.
- Desktop and mobile chat layouts include program and source panels.

## Next planned work

- Degree Works PDF parsing.
- More deterministic rule checkers.
- Semester-by-semester plan validation.
- Student upload flow.

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
npm run lint
npx tsc --noEmit
npm run build
```

Manual checks:

- `/chat` shows the empty state before any messages.
- The app shows loading and error states during chat requests.
- Assistant answers include sources used, confidence, and advisor verification note.
- Desktop shows the left program rail and right Sources panel.
- Mobile collapses both panels into drawers.
- The UI never claims to replace advisors and does not offer registration automation.
