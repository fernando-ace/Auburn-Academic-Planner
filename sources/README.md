# Auburn Academic Source Scope

This project does not crawl all of `auburn.edu`. Auburn Academic Planner uses a scoped source policy so chat answers stay grounded in official academic planning material.

## Curated And All-Major RAG Sources

The Auburn academic source files used for Gemini File Search upload are the curated HTML files under `sources/auburn/curated/` plus generated official Auburn Bulletin undergraduate major pages under `sources/auburn/majors/`.

The curated source set intentionally includes only broad Auburn academic/advising sources:

- Auburn Bulletin Undergraduate Majors Index
- Auburn Bulletin Courses of Instruction pages
- University Core Curriculum pages
- Registrar Degree Works, transfer credit, and AP credit pages
- Reviewed Auburn academic planning pages listed in `sources/auburn/academic-source-seeds.json`

Major-specific pages are added only through the balanced all-majors ingestion process. These files support source-grounded chat. Planning Hub remains Degree Works-native for all majors and does not add requirements from catalog pages.

All generated major pages are `rag_only`. They must not become deterministic rule sources or Planning Hub requirement logic.

## Excluded Sources

These sources are out of scope for academic planning and should not be ingested:

- Athletics
- News
- Marketing pages
- Old or archived pages
- Unrelated department pages
- Student, staff, faculty, or person profile pages
- Random PDFs that are not related to academic requirements

## Local Source Files

- `sources/auburn/academic-source-seeds.json` is the reviewed seed registry.
- `sources/auburn/curated/manifest.json` lists the 7 cached curated HTML files.
- `sources/auburn/generated-major-source-seeds.json` is generated from the checked-in Undergraduate Majors index.
- `sources/auburn/majors/manifest.json` lists fetched official Auburn Bulletin undergraduate major pages.
- `npm run sources:check-scope` validates the seed list and source classification without fetching live URLs.
- `npm run sources:fetch:dry-run` shows which seed URLs would be fetched.
- `npm run sources:fetch` fetches only those exact curated URLs and writes local cached HTML files.
- `npm run sources:discover-majors:dry-run` shows the generated major source plan without writing files.
- `npm run sources:discover-majors` writes `sources/auburn/generated-major-source-seeds.json`.
- `npm run sources:fetch:majors:dry-run` shows which generated major URLs would be fetched.
- `npm run sources:fetch:majors` fetches only those generated major URLs and writes cached HTML files.
- `npm run sources:upload -- --dry-run` prints the curated, all-major, and total Gemini File Search upload inventory without making an API call.

The seed list and generated major manifest are not crawler queues. The fetch scripts do not recursively follow links or crawl all of `auburn.edu`.
