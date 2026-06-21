# Auburn Academic Source Scope

This project does not crawl all of `auburn.edu`. Auburn Academic Planner uses a scoped source policy so chat answers stay grounded in official academic planning material.

## Curated RAG Sources

The only Auburn academic source files used for Gemini File Search upload are the curated HTML files under `sources/auburn/curated/` and their manifest.

The curated source set may include:

- Auburn Bulletin undergraduate major and college index pages
- Auburn Bulletin Courses of Instruction pages
- University Core Curriculum pages
- Registrar Degree Works, transfer credit, and AP credit pages
- Reviewed Auburn academic planning pages listed in `sources/auburn/academic-source-seeds.json`

These files support source-grounded chat. Planning Hub remains Degree Works-native and does not add requirements from catalog pages.

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
- `sources/auburn/curated/manifest.json` lists the 10 cached curated HTML files.
- `npm run sources:check-scope` validates the seed list and source classification without fetching live URLs.
- `npm run sources:fetch:dry-run` shows which seed URLs would be fetched.
- `npm run sources:fetch` fetches only those exact curated URLs and writes local cached HTML files.
- `npm run sources:upload -- --dry-run` prints the curated Gemini File Search upload inventory without making an API call.

The seed list is not a crawler queue. The fetch script does not recursively follow links or crawl all of `auburn.edu`.
