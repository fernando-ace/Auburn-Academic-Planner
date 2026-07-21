# Auburn Academic Planner

Auburn Academic Planner helps Auburn students prepare for advisor conversations with Degree Works-native PDF analysis and source-grounded chat.

The app is an independent student-built pilot and is not currently an official or Auburn-endorsed service. It is intentionally universal: it reads Degree Works Worksheet/Audit PDFs for Current Progress, Degree Works Plan PDFs for Planned Path, and compares a planned path against Current Progress Still needed evidence when both are available. It does not replace Degree Works or an academic advisor.

## Current MVP

- `/chat` - source-grounded Auburn academic Q&A using curated Auburn academic sources plus balanced RAG-only Auburn Bulletin undergraduate major pages.
- `/plan-check` - Planning Hub with Current Progress, an automatically generated draft path, optional own-plan comparison, Advisor Summary, and details/evidence.
- Current Progress parses Worksheet/Audit PDFs for detected program, credits required/applied/needed, incomplete blocks, Still needed requirements, completed/preregistered/in-progress/AP-transfer/Fall Through evidence, and advisor-safe next steps. It also generates a first draft path within the student's selected term and credit limits.
- Compare Own Plan optionally parses a Degree Works Plan PDF or pasted planned courses for planned credits, detected terms, parser confidence, and advisor-safe notes.
- Own-plan comparison is strongest when Current Progress is available: it answers whether a future Degree Works Plan appears to cover what the Current Progress audit says is still needed.
- Own-plan comparison matches planned courses against Current Progress Still needed items and keeps electives, option lists, block references, AP/transfer, Fall Through, substitutions, and unclear requirements as advisor-review items.
- PDF uploads are processed server-side for the request and are not permanently stored by the app. Each PDF is limited to 3 MiB; the multipart request is capped at 4,000,000 bytes so a serialized Current Progress comparison stays below Vercel's 4.5 MB function request limit.

## Demo Flow

1. Start the app with `npm run dev`.
2. Open `http://localhost:3000/plan-check`.
3. Upload a synthetic or redacted Degree Works Worksheet/Audit PDF under `Current Progress`.
4. Review the generated draft path, advisor meeting summary, and collapsed evidence details.
5. Optionally choose `Compare Own Plan` and upload a synthetic/redacted Degree Works Plan PDF or paste planned courses.
6. Review whether that own plan appears to cover the Current Progress evidence and note every advisor-review item.
7. Open `http://localhost:3000/chat` for Auburn-wide academic source questions.

Use only synthetic/redacted PDFs for demos. Do not commit real student records, names, IDs, GPAs, advisor emails, screenshots, or private academic records.

## Sources

Chat retrieval uses cached Auburn academic HTML files under:

- `sources/auburn/curated/*.html`
- `sources/auburn/curated/manifest.json`
- `sources/auburn/academic-source-seeds.json`
- `sources/auburn/generated-major-source-seeds.json`
- `sources/auburn/majors/*.html`
- `sources/auburn/majors/manifest.json`

The curated manifest currently lists 7 broad source files. The generated major manifest lists official Auburn Bulletin undergraduate major pages discovered only from the checked-in Undergraduate Majors index. The all-major pages are balanced RAG-only chat sources; they are not deterministic degree requirements.

Planning Hub remains Degree Works-native for all majors. Catalog pages can ground chat answers, but they do not become deterministic degree requirements or alter Planning Hub requirement logic.

Useful source commands:

```bash
npm run sources:fetch:dry-run
npm run sources:discover-majors:dry-run
npm run sources:discover-majors
npm run sources:fetch:majors:dry-run
npm run sources:fetch:majors
npm run sources:check-scope
npm run check:sources
npm run sources:check-live
npm run sources:upload -- --dry-run
```

`sources:fetch:dry-run` prints the eligible curated source inventory without fetching URLs. `sources:discover-majors:dry-run` reads only the checked-in Undergraduate Majors index and shows discovered Bulletin major counts without writing files. `sources:fetch:majors:dry-run` shows the bounded all-major fetch plan without fetching URLs. `check:sources` validates curated files, major files when present, manifests, and seed scope. `sources:check-live` is a read-only network check that compares every checked-in source with its current Auburn page; run it weekly and immediately before a source refresh or production release. It is intentionally separate from normal validation so transient Auburn availability does not break local QA. `sources:upload -- --dry-run` prints curated, all-major, and total Gemini File Search upload counts without making an API call.

## Runtime Configuration

Gemini configuration is required only for `/chat` and optional source-upload/evaluation scripts:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FILE_SEARCH_STORE_NAME=...
```

Chat allows at most two Gemini generation attempts total. The second attempt is used either for one transient timeout/upstream retry or for one compact rewrite when a response exceeds its completion budget, never both. The Chat route has a 120-second maximum duration so those bounded attempts can finish within Vercel's current function-duration limits; final failures still return a controlled, non-cacheable response without exposing prompts or provider details.

Planning Hub PDF analysis, upload validation, source integrity checks, tests, and builds do not call Gemini.

Production request protection for `/chat` and Planning Hub API routes uses Upstash Redis when either complete server-side credential pair is present. The direct pair is preferred:

```env
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

The current Vercel Marketplace integration instead injects this compatible alternative pair:

```env
UPSTASH_REDIS_REST_KV_REST_API_URL=...
UPSTASH_REDIS_REST_KV_REST_API_TOKEN=...
```

When both pairs are complete, the direct pair wins; values are never mixed between pairs. `KV_URL`, `REDIS_URL`, and read-only tokens are intentionally ignored because distributed rate limiting requires a write-capable REST credential pair. Configure the release probe separately:

```env
RELEASE_HEALTH_TOKEN=...
```

If Upstash is not configured, unavailable, or slower than the bounded request-protection timeout, the app falls back to a bounded in-memory per-runtime rate limiter so local demos keep working. `/api/health` exposes only a cheap aggregate public status. `/api/health?check=deep` returns release identity and service details, and verifies live Upstash connectivity with a bounded timeout, only when it receives the 32-or-more-character `RELEASE_HEALTH_TOKEN` as a bearer token. Generate a dedicated secret with the PowerShell command below or `openssl rand -hex 32`, store it in a password manager, and configure it as a sensitive Vercel **Production-only** variable. Do not reuse it for Preview or Development and never expose it through a `NEXT_PUBLIC_` variable.

```powershell
$tokenBytes = New-Object byte[] 32
$tokenGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $tokenGenerator.GetBytes($tokenBytes)
  -join ($tokenBytes | ForEach-Object { $_.ToString("x2") })
} finally {
  $tokenGenerator.Dispose()
  [Array]::Clear($tokenBytes, 0, $tokenBytes.Length)
}
```

Configure Upstash and require the authenticated deep check to pass before production rollout so limits hold across server instances and restarts.

```env
SITE_URL=https://your-production-origin.example
```

`SITE_URL` sets canonical, sitemap, robots, and social-sharing URLs. It must be the final HTTPS production origin. The current public Vercel origin is used as a safe fallback until a custom Auburn-reviewed domain exists.

Before deploying on Vercel, select Node.js `22.x` and enable [Automatically expose System Environment Variables](https://vercel.com/docs/environment-variables/system-environment-variables) so the runtime receives `VERCEL_GIT_COMMIT_SHA`. The strict smoke gate fails closed when either setting is wrong or missing. The package engine also pins Node `22.x`, matching [Vercel's supported runtime selector](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

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
npm run sources:upload -- --dry-run
npm run lint
npx tsc --noEmit
npm run build
npm run validate
npm run test:e2e:production
npm run qa
```

`npm run validate` includes a moderate-or-higher dependency advisory gate. `npm run qa` then runs the browser suite against `next start` in Chromium, Firefox, and WebKit.

For rendered Planning Hub changes, confirm behavior on desktop, 390 px mobile, and 320 px narrow-mobile widths:

- `http://localhost:3000/plan-check`
- `http://localhost:3000/chat`

Confirm no console errors, no horizontal overflow, source-grounded chat still works, Planning Hub navigation works, Current Progress works with synthetic universal fixtures, Planned Path works with a generic planned-path fixture, and comparison works when both current and planned PDFs are provided.

After deployment, run the strict remote smoke gate against the exact production origin:

PowerShell:

```powershell
$env:DEPLOYED_APP_URL = "https://your-production-origin.example"
$env:EXPECTED_COMMIT_SHA = git rev-parse HEAD
$secureReleaseHealthToken = Read-Host "Production release-probe token" -AsSecureString
$env:RELEASE_HEALTH_TOKEN = [System.Net.NetworkCredential]::new("", $secureReleaseHealthToken).Password
$smokeExitCode = 1
try {
  npm.cmd run smoke:production
  $smokeExitCode = $LASTEXITCODE
} finally {
  Remove-Item Env:DEPLOYED_APP_URL,Env:EXPECTED_COMMIT_SHA,Env:RELEASE_HEALTH_TOKEN -ErrorAction SilentlyContinue
  $secureReleaseHealthToken = $null
}
if ($smokeExitCode -ne 0) {
  throw "Production smoke failed with exit code $smokeExitCode."
}
```

Bash:

```bash
(
  export DEPLOYED_APP_URL=https://your-production-origin.example
  export EXPECTED_COMMIT_SHA="$(git rev-parse HEAD)"
  cleanup_release_smoke() {
    unset DEPLOYED_APP_URL EXPECTED_COMMIT_SHA RELEASE_HEALTH_TOKEN
  }
  trap cleanup_release_smoke EXIT INT TERM
  read -rsp "Production release-probe token: " RELEASE_HEALTH_TOKEN
  printf '\n'
  export RELEASE_HEALTH_TOKEN
  npm run smoke:production
)
```

The smoke gate requires the permanent Planning Hub redirect; route-specific titles; exact canonical, sitemap, robots, and social origins; install assets; production security headers; the expected Git commit; the supported Node 22 runtime; a `ready` deep health response with live Upstash connectivity; a synthetic Current Progress PDF upload and generated-path regeneration; manual planning; Chat validation; a benign source-grounded DegreeWorks answer with its Auburn source and advisor boundary; and non-cacheable student API responses. It intentionally fails on a stale commit, misconfigured canonical origin, unsupported runtime, missing flagship planning flow, missing Chat grounding, or unavailable distributed request protection.

Each successful smoke run uploads one generated synthetic PDF, consumes request-protection counters, and makes one live Gemini request. It never sends a real student record. Avoid rapid retries; if a release runner reaches the ten-minute planning or Chat limit, wait for that window to reset before treating the rate-limit response as a deployment failure.

Before sponsored campus use, enable GitHub private vulnerability reporting, verify security-alert notifications, publish a private incident contact, and complete Auburn FERPA/vendor review. Public GitHub issues are restricted to non-sensitive product feedback; see [SECURITY.md](SECURITY.md).
