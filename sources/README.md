# Auburn Academic Source Scope

This project does not crawl all of `auburn.edu`. Auburn Academic Planner uses a scoped source policy so academic answers stay grounded in official planning material instead of random Auburn pages.

## Tier 1: Deterministic Rule Sources

Tier 1 sources are official program or certificate requirement pages that have been manually converted into local rule JSON under `rules/auburn/`.

- AI Engineering certificate
- Software Engineering
- Computer Science

These sources may support deterministic Planning Hub checks because the local rule model has been transcribed and tested. Adding a new Auburn page to the seed list does not make it deterministic.

## Tier 2: RAG Academic Advising Sources

Tier 2 sources are official Auburn academic/advising sources that may be used for source-grounded chat answers when they are deliberately added to the upload manifest.

- Auburn Bulletin undergraduate major, minor, and certificate pages
- Auburn Bulletin Courses of Instruction pages
- University Core Curriculum pages
- Registrar, advising, Degree Works, transfer credit, and AP credit pages
- College-specific academic requirement pages

These sources are RAG-only unless a developer manually creates and validates local rule JSON for them.

## Tier 3: Excluded Sources

These sources are out of scope for academic planning and should not be ingested:

- Athletics
- News
- Marketing pages
- Old or archived pages
- Unrelated department pages
- Student, staff, faculty, or person profile pages
- Random PDFs that are not related to academic requirements

## Local Source Files

- `sources/manifest.json` is the current Gemini File Search upload manifest.
- `sources/auburn/academic-source-seeds.json` is a curated local seed list for future Auburn-wide academic expansion.
- `npm run sources:check-scope` validates the seed list and source classification without fetching live URLs.

The seed list is not a crawler queue. It is a scoped registry of official academic sources that can be reviewed before anything is downloaded, stored, or uploaded.
