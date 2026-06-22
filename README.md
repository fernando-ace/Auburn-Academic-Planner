# Auburn Academic Planner

Auburn Academic Planner helps Auburn students prepare for advisor conversations with Degree Works-native PDF analysis and source-grounded chat.

The app is intentionally universal: it reads Degree Works Worksheet/Audit PDFs for Current Progress, Degree Works Plan PDFs for Planned Path, and compares a planned path against Current Progress Still needed evidence when both are available. It does not replace Degree Works or an academic advisor.

## Current MVP

- `/chat` - source-grounded Auburn academic Q&A using curated Auburn academic sources.
- `/plan-check` - Planning Hub with Current Progress, Planned Path, Planned Path comparison, advisor meeting summary, and details/evidence.
- Current Progress parses Worksheet/Audit PDFs for detected program, credits required/applied/needed, incomplete blocks, Still needed requirements, completed/preregistered/in-progress/AP-transfer/Fall Through evidence, and advisor-safe next steps.
- Planned Path parses Plan PDFs for planned courses, planned credits, detected terms, parser confidence, and advisor-safe notes.
- Planned Path comparison matches planned courses against Current Progress Still needed items and keeps broad requirement blocks as advisor-review items.
- PDF uploads are processed server-side for the request and are not permanently stored by the app.

## Demo Flow

1. Start the app with `npm run dev`.
2. Open `http://localhost:3000/plan-check`.
3. Upload a synthetic or redacted Degree Works Worksheet/Audit PDF under `Current Progress`.
4. Switch to `Planned Path` and upload a synthetic or redacted Degree Works Plan PDF.
5. Review the comparison, advisor meeting summary, and collapsed evidence details.
6. Open `http://localhost:3000/chat` for curated Auburn academic source questions.

Use only synthetic/redacted PDFs for demos. Do not commit real student records, names, IDs, GPAs, advisor emails, screenshots, or private academic records.

## Sources

Curated chat retrieval uses exactly the cached Auburn academic HTML files under:

- `sources/auburn/curated/*.html`
- `sources/auburn/curated/manifest.json`
- `sources/auburn/academic-source-seeds.json`

The curated manifest currently lists 7 source files. The curated RAG set intentionally uses broad Auburn academic/advising sources: undergraduate majors, courses of instruction, core curriculum, DegreeWorks, registrar credit tables, transfer credit policy, and Pathways transfer credit. Department-specific or major-specific pages should only be added through a balanced all-majors ingestion process.

Planning Hub remains Degree Works-native for all majors. Catalog pages can ground chat answers, but they do not become deterministic degree requirements unless explicitly modeled and advisor-safe.

Future work: build a controlled all-undergraduate-majors Bulletin ingestion pipeline from the Undergraduate Majors Index, so every major receives equal RAG page-depth.

Useful source commands:

```bash
npm run sources:fetch:dry-run
npm run sources:check-scope
npm run check:sources
npm run sources:upload -- --dry-run
```

`sources:fetch:dry-run` prints the eligible curated source inventory without fetching URLs. `check:sources` validates curated files, curated manifest metadata, and seed scope. `sources:upload -- --dry-run` prints the Gemini File Search upload inventory without making an API call.

## Gemini Chat

Gemini configuration is required only for `/chat` and optional source-upload/evaluation scripts:

```env
GEMINI_API_KEY=...
GEMINI_FILE_SEARCH_STORE_NAME=...
```

Planning Hub PDF analysis, upload validation, source integrity checks, tests, and builds do not call Gemini.

## Trust And Safety

- Results are preparation notes, not official degree audits.
- Advisor verification is required before registration, graduation, transfer-credit, substitution, exception, or completion decisions.
- Extracted PDF text can omit substitutions, exceptions, hidden Degree Works sections, transfer equivalencies, catalog changes, and advisor-approved alternatives.
- If parser evidence is weak, the app should mark confidence low, preserve uncertainty, and push the item to advisor review.
- Uploaded PDFs are transient request inputs; do not permanently store private PDFs.

## Verification

Run the full local validation stack before publishing changes:

```bash
npm test
npm run check:sources
npm run sources:check-scope
npm run sources:fetch:dry-run
npm run lint
npx tsc --noEmit
npm run build
npm run validate
```

For rendered Planning Hub changes, also run browser QA on desktop and mobile widths:

- `http://localhost:3000/plan-check`
- `http://localhost:3000/chat`

Confirm no console errors, no horizontal overflow, source-grounded chat still works, Planning Hub navigation works, Current Progress works with synthetic universal fixtures, Planned Path works with a generic planned-path fixture, and comparison works when both current and planned PDFs are provided.
