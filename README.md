# Sharepony - SharePoint Fingerprint Tool

A single-file, browser-console tool that passively fingerprints a SharePoint site — on-premises or online — and identifies the exact product edition, build number, and Cumulative/Public Update (CU/PU) currently installed.

Paste it into Chrome DevTools on any SharePoint page. No installation, no dependencies, no server-side access required.

![SharePoint Detection Summary](./screenshot.png)

---

## Table of Contents

- [What it does](#what-it-does)
- [Usage](#usage)
- [Console helpers](#console-helpers)
- [Batch mode](#batch-mode)
- [How detection works](#how-detection-works)
- [Site-relative REST API resolution](#site-relative-rest-api-resolution)
- [The `MicrosoftSharePointTeamServices` header bug](#the-microsoftsharepointteamservices-header-bug)
- [The SharePoint 2019 / Subscription Edition RTM collision](#the-sharepoint-2019--subscription-edition-rtm-collision)
- [Diagnostics: timeouts, auth redirects, and access errors](#diagnostics-timeouts-auth-redirects-and-access-errors)
- [Build database](#build-database)
- [Confidence scoring](#confidence-scoring)
- [Output](#output)
- [Scope & limitations](#scope--limitations)
- [Privacy & safety](#privacy--safety)
- [Maintaining the build database](#maintaining-the-build-database)
- [License](#license)

---

## What it does

SharePoint doesn't expose its version number in a single, reliable place. Depending on how the farm is configured, the real build number may only be visible through one of several different signals — and one of the most commonly used signals (an HTTP response header) has had a known, unfixed formatting bug since SharePoint 2019. This script:

1. Collects every version-related signal it can reach without authentication beyond the current session, with an 8-second timeout per request so a hung farm can't stall the whole run.
2. Cross-validates those signals against each other, specifically working around the known header bug.
3. Resolves REST API calls against the actual site collection you're on, not the domain root (see [Site-relative REST API resolution](#site-relative-rest-api-resolution)).
4. Matches the resolved build number against a database of **285 official Microsoft build entries** covering SharePoint 2013, 2016, 2019, and Subscription Edition.
5. Reports the product, exact CU/PU name, KB number, release date, and an explicit confidence level — including flagging a real, documented ambiguity between SharePoint 2019 and Subscription Edition at their shared RTM build.
6. Flags non-fatal issues (timeouts, auth redirects, 401/403s) as explicit **Diagnostics** rather than failing silently.
7. Saves a `.txt` and a `.json` report automatically, and can optionally scan multiple site collections in one run (**batch mode**), producing a combined CSV.

It performs **no** vulnerability scanning, exploitation, or write operations. See [Privacy & safety](#privacy--safety).

## Usage

1. Navigate to the target SharePoint site in Chrome (or any Chromium-based browser).
2. Open DevTools (`F12`) → **Console** tab.
3. Paste the full contents of `Sharepony.js` and press Enter.
4. Read the summary card, expand the collapsed groups (`Raw Signals`, `Detection Evidence`, `Diagnostics`, `Header Quirk`) for detail, and check your downloads folder for the saved `.txt` and `.json` reports.

If an automatic download is blocked by a browser extension or CSP policy, use the [console helpers](#console-helpers) below to get the same data via clipboard instead.

## Console helpers

After the script runs once, these are available in the console for the rest of the session:

| Function | Returns |
|---|---|
| `__spDetectorReport()` | Full plain-text report (same as the downloaded `.txt`) |
| `__spDetectorReportJSON()` | Full structured report as a JSON string (same as the downloaded `.json`) |
| `__spDetectorSummary()` | Just the compact summary card as text — handy for pasting into Slack or a ticket |
| `__spDetectorLastResult` | The raw detection result object (not a function — access directly) |
| `__spDetectorBatch(urls)` | Runs [batch mode](#batch-mode) against an array of URLs |

Example — copy just the summary to your clipboard:

```js
copy(__spDetectorSummary())
```

## Batch mode

Scan multiple site collections on the **same origin** in one go:

```js
await __spDetectorBatch([
  "https://tenant.sharepoint.com/sites/TeamA",
  "https://tenant.sharepoint.com/sites/TeamB",
])
```

This prints a compact comparison table (Hostname, Path, Product, Build, CU/PU, Confidence) and automatically downloads a combined `sharepoint-detection-batch_*.csv`. Results are also available afterward via `__spDetectorBatchResults`.

**Same-origin only, by design.** Any URL whose origin (scheme + host + port) doesn't match the current page's origin is skipped with a warning — cross-origin requests would be blocked by the browser's CORS policy anyway, and wouldn't carry the right session cookies even if they weren't. This is meant for auditing multiple site collections within one farm/tenant, not multiple unrelated SharePoint deployments.

**Pass site collection root URLs, not arbitrary page URLs.** For the current page, the script uses SharePoint's own `_spPageContextInfo.webAbsoluteUrl` global to reliably find the site root no matter how deep a page you're on. For other batch targets, there's no equivalent authoritative signal available client-side — the script falls back to a heuristic that trusts a bare URL like `.../sites/TeamB` as the site root, and only trims the last path segment when it clearly looks like a page or file (has an extension) or a known system folder (`_layouts`, `SitePages`, etc.). Site collection root URLs resolve correctly every time; deep page URLs may resolve to a subfolder rather than the true root.

## How detection works

The script gathers signals from four independent sources, in priority order:

| # | Source | Endpoint | Reliability |
|---|--------|----------|-------------|
| 1 | `vti_buildversion` | `GET /_vti_pvt/service.cnf` | High — correctly formatted, on-prem only |
| 2 | REST API `LibraryVersion` | `POST /_api/contextinfo` (site-relative) | High — correctly formatted, works on-prem and online |
| 3 | `vti_extenderversion` | `GET /_vti_pvt/service.cnf` | High — same format, used as one more fallback rung |
| 4 | `MicrosoftSharePointTeamServices` | HTTP response header (any request) | **Unreliable on 2019+/SE** — see below |

Sources 1–3 are always preferred for classification and lookup. The HTTP header is only used as a last resort, and only after being checked for the known formatting bug described next.

Each successfully-read signal is logged as an entry in **Detection Evidence**, including the full resolved URL that was queried, so you can independently verify every claim the script makes.

## Site-relative REST API resolution

A naive `fetch("/_api/contextinfo")` resolves against the domain root because of the leading slash — on a site under a managed path (e.g. `https://tenant.sharepoint.com/sites/TeamA/...`), that silently queries the **root** site collection's REST API instead of the site actually being inspected. Root and sub-sites can genuinely be provisioned at different times/patch levels, especially in SharePoint Online multi-geo tenants or hybrid on-prem farms with per-site upgrade lag — so this isn't just a style nit, it can produce a confidently wrong answer.

The script resolves this two ways:

- **On the current page:** uses SharePoint's own `_spPageContextInfo.webAbsoluteUrl` global (present on virtually every classic and modern SharePoint page) to find the true site root, regardless of how deep in the site the current page is.
- **In batch mode, for other targets:** falls back to a path heuristic (see [Batch mode](#batch-mode)) since that global only describes the currently-loaded page.

The **Raw Signals Collected** group shows exactly which base URL was used (`Site Base URL`) and whether it came from the reliable page-context global or the fallback heuristic (`Resolved via _spPageContextInfo`).

## The `MicrosoftSharePointTeamServices` header bug

On SharePoint Server 2019 and Subscription Edition, the `MicrosoftSharePointTeamServices` response header does not report the real build number. It reports a malformed `16.0.0.XXXXX` string, where:

- The real "build" segment (3rd octet) is zeroed out.
- The actual build number is shoved into the 4th octet instead.
- The true revision number is lost entirely.

This is a long-standing, Microsoft-acknowledged issue in the SharePoint product group (first reported publicly around SharePoint 2019's release) that has never been fixed. Concretely: a farm running build `16.0.19725.20434` will report `MicrosoftSharePointTeamServices: 16.0.0.19725` in its HTTP header — which, parsed naively, looks like a build number of `0`, landing squarely in the SharePoint **2016** heuristic bucket. Trusting this header at face value causes a serious misclassification.

The script:

1. Detects the `16.0.0.XXXXX` pattern (`isLikelyBuggyTeamServicesFormat`).
2. Deprioritizes the header in favor of `vti_buildversion` / REST `LibraryVersion` / `vti_extenderversion` for all classification and lookups.
3. Cross-validates the header's trailing segment against the reliable sources, and surfaces a **Header Quirk Detected** note confirming the match (or flagging a genuine discrepancy, if the two disagree).

## The SharePoint 2019 / Subscription Edition RTM collision

SharePoint Server 2019 RTM and SharePoint Server Subscription Edition RTM ship the **exact same build number**: `16.0.10337.12109`. This is a real, documented fact about Microsoft's release engineering, not a detection bug — the two products genuinely started from an identical build string before diverging via their respective update tracks.

Because of this, a build-number match alone cannot distinguish the two products at that specific build. Rather than guessing, the script detects when a build matches multiple products' entries in the database simultaneously and reports it as an explicit **ambiguous** result, listing all matching candidates and suggesting how to disambiguate manually (Central Administration's version display, farm install history, or license/purchase records).

## Diagnostics: timeouts, auth redirects, and access errors

Every request is wrapped with:

- An **8-second timeout** (`AbortController`), so a hung or very slow endpoint can't stall the whole script.
- **Redirect detection.** If a request gets redirected somewhere that looks like a login page (matches `login`/`signin`/`adfs`/`oauth2`/`authorize`/`sts.`, or lands on a different host entirely), that's flagged rather than silently treated as "endpoint not found" — a redirect to a sign-in page usually means the current session doesn't have access, which is a very different situation from the endpoint simply not existing.
- **401/403 detection.** Explicitly called out as access-denied rather than a generic failure.

Anything caught this way shows up in a collapsible **🩺 Diagnostics** console group (only shown when there's something to report) and in both the `.txt` and `.json` reports.

## Build database

The script embeds the **full official update history** for four SharePoint product lines, transcribed directly from Microsoft's release-notes page:

| Product | Entries | Range |
|---|---|---|
| SharePoint Server 2013 | 17 | RTM (2012-10-16) → final CU (April 2023, end of support) |
| SharePoint Server 2016 | 118 | RTM (2016-05-04) → final CU (June 2026, end of support 2026-07-14) |
| SharePoint Server 2019 | 92 | RTM (2018-10-22) → final CU (June 2026, end of support 2026-07-14) |
| SharePoint Server Subscription Edition | 58 | RTM (2021-11-02) → latest known CU (July 2026) |
| **Total** | **285** | |

Every entry includes the build number, a human-readable label (including SE's feature-update milestones — `23H1`, `24H1`, `24H2`, `25H1`, `25H2`, etc.), the release date, and the associated Microsoft KB number where applicable.

**Source of truth:** [learn.microsoft.com/officeupdates/sharepoint-updates](https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates)

2013's list is intentionally curated to RTM plus its later CUs rather than every monthly update, since the product has been out of support since April 2023. 2016, 2019, and Subscription Edition include **every** monthly entry from Microsoft's table.

If a detected build isn't in the table (e.g. a CU released after this script was last updated), the script falls back to reporting the **closest known build** by numeric distance, rather than failing silently.

## Confidence scoring

| Level | Meaning |
|---|---|
| **High** | SharePoint Online (hostname-based), or an on-prem build with an exact, unambiguous database match. |
| **Medium-High** | Product identified with high confidence, but the specific CU/PU build isn't in the database (closest-match fallback used). |
| **Medium** | Product identified via the numeric build-range heuristic (no exact database match), corroborated by 2+ independent signals. |
| **Low (ambiguous build)** | The 2019/SE shared-RTM collision, or another multi-product exact match. |
| **Low** | No reliable version signal could be retrieved at all. |

## Output

Every single-page run produces:

- **Console banner** with hostname and timestamp.
- **Raw Signals Collected** — every header/endpoint value read, plus the resolved REST API base URL, in a collapsible group.
- **Detection Evidence** — which signals fired, their weight, and their full resolved URL.
- **Diagnostics** — timeouts, auth redirects, 401/403s (only shown if something notable occurred).
- **Header Quirk Detected** — only shown when the `16.0.0.XXXXX` bug is triggered.
- **Build Database Match** — exact match, closest-match fallback, or ambiguity report.
- **Summary card** — Product, Build, CU/PU, KB Number, Released, Environment, Confidence, rendered as an aligned ASCII box (explicitly *not* Unicode box-drawing characters or variable font sizes, both of which break column alignment across different console fonts/themes).
- **Downloadable `.txt` report** — everything above, saved automatically via `Blob` + a synthetic anchor click.
- **Downloadable `.json` report** — structured, machine-readable sibling to the `.txt` report, intended for feeding into an inventory/audit pipeline rather than human reading.

Batch mode additionally produces a compact comparison table in the console and a combined `.csv` download. See [Batch mode](#batch-mode) and [Console helpers](#console-helpers).

## Scope & limitations

- **Read-only.** Only issues `GET`/`HEAD`/`POST` requests to standard, unauthenticated-by-default SharePoint metadata endpoints. No write operations, no exploitation, no CVE correlation, no vulnerability scanning.
- **No new authentication.** Runs in the current browser session's existing auth context; it does not attempt to log in or elevate privileges.
- **Same-origin only.** Subject to normal browser CORS/session restrictions, and batch mode explicitly enforces this — it can only see what the logged-in user's session can see, on the origin you're already on.
- **8-second request timeout.** A farm that's extremely slow (but not actually down) may show a spurious timeout diagnostic; re-run if you suspect this.
- **Build database currency.** Reflects Microsoft's release history as of this script's last update (see the file header for the exact date). SharePoint 2016/2019 update monthly-ish; Subscription Edition ships a CU roughly every month. Very recent CUs may not yet be catalogued — the closest-match fallback exists specifically for this gap.
- **Pre-2013 products** (2010, 2007) are out of scope.
- **Batch mode site resolution.** Reliable for site collection root URLs; a deep page URL passed to batch mode may resolve to a subfolder rather than the true site root (see [Batch mode](#batch-mode)).
- Some fields (older monthly CUs) only have `YYYY-MM` precision rather than an exact day, because that's the precision Microsoft's own table provides for those entries.
- SharePoint **Foundation** vs. **Server** SKUs (2010/2013 era) aren't distinguished — they share identical build numbering, and there's no reliable browser-only signal to tell them apart without guessing.

## Privacy & safety

This tool is designed to be safe to run against a production farm:

- No credentials, tokens, or session data are transmitted anywhere except back to the SharePoint site itself (standard same-origin requests).
- No data leaves the browser except the locally-saved `.txt`/`.json`/`.csv` reports, which are written directly to your own downloads folder via a client-side `Blob` — nothing is sent to any third-party server.
- No CVE lookups, exploit code, or attack-path logic of any kind.

## Maintaining the build database

To keep `BUILD_DATABASE` current:

1. Check [learn.microsoft.com/officeupdates/sharepoint-updates](https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates) for new entries (Microsoft typically publishes each month's CU/PU on the second Tuesday).
2. Add new entries to the relevant product's array, in ascending build order, following the existing `{ build, label, date, kb }` shape.
3. Update the "BUILD_DATABASE last verified" note in the file's header comment.

Recommended cadence: monthly, or whenever you notice a "no exact match" result on a farm you know is fully patched.

## License

Add your preferred license here (e.g. MIT) before publishing to GitHub.
