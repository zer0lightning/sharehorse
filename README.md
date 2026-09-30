# Sharehorse - SharePoint Fingerprint Tool

A single-file, browser-console tool that passively fingerprints a SharePoint site - on-premises or online. It identifies the product edition, build number, and Cumulative/Public Update (CU/PU) from a database of 285 official Microsoft builds, and gathers a wider fingerprint on top of that: site collection compatibility mode, sovereign cloud instance, topology, regional settings, and infrastructure headers.

Paste it into Chrome DevTools on any SharePoint page. No installation, no dependencies, no server-side access required.

![SharePoint Detection Summary](./screenshot-sh.png)

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
- [The five extended fingerprint signals](#the-five-extended-fingerprint-signals)
  - [1. Site collection compatibility mode](#1-site-collection-compatibility-mode)
  - [2. Sovereign / national cloud instance](#2-sovereign--national-cloud-instance)
  - [3. Site collection topology](#3-site-collection-topology)
  - [4. Regional settings & installed languages](#4-regional-settings--installed-languages)
  - [5. Infrastructure signals](#5-infrastructure-signals)
- [Extended contextinfo fields](#extended-contextinfo-fields)
- [What's intentionally not implemented](#whats-intentionally-not-implemented)
- [Build database](#build-database)
- [Automated signature updates](#automated-signature-updates)
- [Confidence scoring](#confidence-scoring)
- [Output](#output)
- [Network cost of the extended signals](#network-cost-of-the-extended-signals)
- [Scope & limitations](#scope--limitations)
- [Privacy & safety](#privacy--safety)
- [Maintaining the build database](#maintaining-the-build-database)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## What it does

SharePoint doesn't expose its version number in a single reliable place. Depending on farm configuration, the real build number may only be visible through one of several signals - and one commonly used signal (an HTTP response header) has a known, unfixed formatting bug since SharePoint 2019. This script:

1. Collects every version-related signal it can reach in the current session, with an 8-second timeout per request.
2. Cross-validates those signals against each other, working around the known header bug.
3. Resolves REST API calls against the actual site collection you're on, not the domain root (see [Site-relative REST API resolution](#site-relative-rest-api-resolution)).
4. Matches the resolved build number against a database of **285 official Microsoft build entries** covering SharePoint 2013, 2016, 2019, and Subscription Edition.
5. Reports the product, exact CU/PU name, KB number, release date, and an explicit confidence level - including the documented ambiguity between SharePoint 2019 and Subscription Edition at their shared RTM build.
6. Flags non-fatal issues (timeouts, auth redirects, 401/403s) as explicit **Diagnostics** rather than failing silently.
7. Saves a `.txt` and a `.json` report automatically, and can scan multiple site collections in one run (**batch mode**), producing a combined CSV.

Beyond the farm build, it also reports facts about the specific site/tenant that a build number alone can't show:

- A site collection can be stuck in an **older compatibility mode** than the farm it runs on.
- Whether a tenant is on **GCC High vs. commercial** cloud - relevant to compliance, detected from the hostname at no network cost.
- **Hub-site and Microsoft 365 Group association** - topology facts for an inventory.

It performs no vulnerability scanning, exploitation, or write operations. See [Privacy & safety](#privacy--safety).

## Usage

1. Navigate to the target SharePoint site in Chrome (or any Chromium-based browser).
2. Open DevTools (`F12`) → **Console** tab.
3. Paste the full contents of `sharehorse.js` and press Enter.
4. Read the summary card, expand the collapsed groups - including the **🧬 Extended Fingerprint** group - and check your downloads folder for the saved `.txt` and `.json` reports.

If an automatic download is blocked by a browser extension or CSP policy, use the [console helpers](#console-helpers) below to get the same data via clipboard instead.

## Console helpers

After the script runs once, these are available in the console for the rest of the session:

| Function | Returns |
|---|---|
| `__spDetectorReport()` | Full plain-text report (same as the downloaded `.txt`) |
| `__spDetectorReportJSON()` | Full structured report as a JSON string - includes a dedicated `extendedFingerprint` object |
| `__spDetectorSummary()` | Just the compact summary card as text |
| `__spDetectorLastResult` | The raw detection result object, including all extended fields (not a function - access directly) |
| `__spDetectorBatch(urls)` | Runs [batch mode](#batch-mode) against an array of URLs |

Example - copy just the summary to your clipboard:

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

This prints a compact comparison table (Hostname, Path, Product, Build, CU/PU, Confidence) and downloads a combined `sharepoint-detection-batch_*.csv`. The CSV includes five extended columns - `CloudEnvironment`, `SiteUIVersion`, `CompatibilityModeFlag`, `HubSiteId`, `GroupConnected` - which surfaces, in one pass, which site collections are still in an older compat mode. Results are also available afterward via `__spDetectorBatchResults`.

**Same-origin only.** Any URL whose origin (scheme + host + port) doesn't match the current page's origin is skipped with a warning - cross-origin requests would be blocked by CORS and wouldn't carry the right session cookies. This is for auditing multiple site collections within one farm/tenant, not multiple unrelated deployments.

**Pass site collection root URLs, not arbitrary page URLs.** For the current page, the script uses SharePoint's `_spPageContextInfo.webAbsoluteUrl` global to find the site root regardless of page depth. For other batch targets there's no equivalent authoritative client-side signal - the script trusts a bare URL like `.../sites/TeamB` as the site root, and only trims the last path segment when it clearly looks like a page or file (has an extension) or a known system folder (`_layouts`, `SitePages`, etc.). Site collection root URLs resolve correctly every time; deep page URLs may resolve to a subfolder rather than the true root.

## How detection works

The script gathers signals from four independent sources, in priority order:

| # | Source | Endpoint | Reliability |
|---|--------|----------|-------------|
| 1 | `vti_buildversion` | `GET /_vti_pvt/service.cnf` | High - correctly formatted, on-prem only |
| 2 | REST API `LibraryVersion` | `POST /_api/contextinfo` (site-relative) | High - correctly formatted, works on-prem and online |
| 3 | `vti_extenderversion` | `GET /_vti_pvt/service.cnf` | High - same format, used as one more fallback rung |
| 4 | `MicrosoftSharePointTeamServices` | HTTP response header (any request) | **Unreliable on 2019+/SE** - see below |

Sources 1–3 are always preferred for classification and lookup. The HTTP header is only used as a last resort, and only after being checked for the known formatting bug described next.

Each successfully-read signal is logged as an entry in **Detection Evidence**, including the full resolved URL that was queried, so you can independently verify every claim the script makes.

## Site-relative REST API resolution

A naive `fetch("/_api/contextinfo")` resolves against the domain root because of the leading slash - on a site under a managed path (e.g. `https://tenant.sharepoint.com/sites/TeamA/...`), that silently queries the **root** site collection's REST API instead of the site being inspected. Root and sub-sites can be provisioned at different times/patch levels, especially in SharePoint Online multi-geo tenants or hybrid on-prem farms with per-site upgrade lag, so this can produce a confidently wrong answer.

The script resolves this two ways:

- **On the current page:** uses SharePoint's `_spPageContextInfo.webAbsoluteUrl` global (present on virtually every classic and modern SharePoint page) to find the true site root, regardless of page depth.
- **In batch mode, for other targets:** falls back to a path heuristic (see [Batch mode](#batch-mode)), since that global only describes the currently-loaded page.

The **Raw Signals Collected** group shows which base URL was used (`Site Base URL`) and whether it came from the page-context global or the fallback heuristic (`Resolved via _spPageContextInfo`).

## The `MicrosoftSharePointTeamServices` header bug

On SharePoint Server 2019 and Subscription Edition, the `MicrosoftSharePointTeamServices` response header does not report the real build number. It reports a malformed `16.0.0.XXXXX` string, where:

- The real "build" segment (3rd octet) is zeroed out.
- The actual build number is shoved into the 4th octet instead.
- The true revision number is lost entirely.

This is a long-standing, Microsoft-acknowledged issue (first reported publicly around SharePoint 2019's release) that has never been fixed. A farm running build `16.0.19725.20434` reports `MicrosoftSharePointTeamServices: 16.0.0.19725` - which, parsed naively, looks like a build number of `0`, landing in the SharePoint **2016** heuristic bucket. Trusting this header at face value causes a serious misclassification.

The script:

1. Detects the `16.0.0.XXXXX` pattern (`isLikelyBuggyTeamServicesFormat`).
2. Deprioritizes the header in favor of `vti_buildversion` / REST `LibraryVersion` / `vti_extenderversion` for all classification and lookups.
3. Cross-validates the header's trailing segment against the reliable sources, and surfaces a **Header Quirk Detected** note confirming the match (or flagging a discrepancy if the two disagree).

## The SharePoint 2019 / Subscription Edition RTM collision

SharePoint Server 2019 RTM and SharePoint Server Subscription Edition RTM ship the **exact same build number**: `16.0.10337.12109`. This is a documented fact about Microsoft's release engineering, not a detection bug - the two products started from an identical build string before diverging via their respective update tracks.

Because of this, a build-number match alone cannot distinguish the two products at that build. Rather than guessing, the script detects when a build matches multiple products' entries simultaneously and reports it as an explicit **ambiguous** result, listing all matching candidates and suggesting how to disambiguate manually (Central Administration's version display, farm install history, or license/purchase records).

## Diagnostics: timeouts, auth redirects, and access errors

Every request is wrapped with:

- An **8-second timeout** (`AbortController`), so a hung or slow endpoint can't stall the script.
- **Redirect detection.** If a request is redirected somewhere that looks like a login page (matches `login`/`signin`/`adfs`/`oauth2`/`authorize`/`sts.`, or lands on a different host), that's flagged rather than treated as "endpoint not found" - a redirect to sign-in usually means the current session lacks access, which is different from the endpoint not existing.
- **401/403 detection.** Explicitly called out as access-denied rather than a generic failure.

Anything caught this way shows up in a collapsible **🩺 Diagnostics** console group (only shown when there's something to report) and in both the `.txt` and `.json` reports.

## The five extended fingerprint signals

### 1. Site collection compatibility mode

A SharePoint site collection can run in an **older UI/behavior compatibility level** than the farm's actual binaries - most commonly a site left in SharePoint 2013 mode (`UIVersion 15`) after an upgrade to a newer farm (2016/2019/Subscription Edition, major version 16). Administrators don't always run `Set-SPSite -CompatibilityLevel` on every site collection after a farm upgrade, so this drift is common and is invisible to any tool that only checks the farm's patch level.

Sharehorse fetches `/_api/web?$select=Title,WebTemplate,Configuration,UIVersion,UIVersionConfigurationEnabled,Language,LanguageName` and compares the returned `UIVersion` against the major version of the detected farm build. A mismatch produces an explicit warning:

> ⚠ This site collection is running in UIVersion 15 compatibility mode (behaves like SharePoint 2013), even though the farm itself is on build major 16 (SharePoint 2016/2019/Subscription Edition). The farm's patch level and this site's rendering/behavior level are two different things - run Set-SPSite -CompatibilityLevel to upgrade this specific site collection if desired.

When the two match (e.g. `UIVersion 16` against a major-16 farm), no warning is produced.

### 2. Sovereign / national cloud instance

Hostname string-matching - **zero extra network requests**. Detects:

| Hostname pattern | Cloud |
|---|---|
| `*.sharepoint.us` | US Government (GCC High) |
| `*-my.sharepoint.us` | US Government (GCC High) - personal/OneDrive site |
| `*.sharepoint-mil.us` | US Government (DoD) |
| `*.sharepoint.cn` | Operated by 21Vianet (China) |
| `*.sharepoint.de` | Germany cloud (legacy - Microsoft retired this cloud in 2021) |
| `*.sharepoint.com` | Commercial **or** GCC |
| `*-my.sharepoint.com` | Commercial or GCC - personal/OneDrive site |

Caveat, stated in the tool's own output: GCC (the "moderate" US Government Community Cloud) uses the same `*.sharepoint.com` domain as commercial tenants and cannot be distinguished by hostname alone - only GCC High and DoD have their own domain suffixes.

### 3. Site collection topology

One GET, to `/_api/site?$select=Id,HubSiteId,GroupId,ReadOnly`:

- **Site Id** - a stable GUID, useful as a correlator across re-runs or if the site is renamed/moved.
- **Hub site association** - whether this site is connected to a SharePoint hub. (Empty-GUID responses are treated as "not hub-associated," not displayed as an all-zeros string.)
- **Microsoft 365 Group connection** - whether this is a Group-connected team site.
- **Read-only flag** - whether the site collection is locked for read-only access (common during tenant migrations).

### 4. Regional settings & installed languages

One combined request to `/_api/web/regionalsettings?$select=LocaleId,TimeZone/Description&$expand=InstalledLanguages,TimeZone` - pulls the site's locale ID, time zone description, and every installed MUI language pack in one trip. Operational rather than version-specific, and graceful-degrading: many locked-down farms will 403 this without affecting the rest of the run.

### 5. Infrastructure signals

Three sub-parts, all read from responses the script is already making (no new requests except where noted):

- **Content-Security-Policy header presence** - SharePoint Server Subscription Edition **Version 24H1** (build `16.0.17328.20136`, March 2024) introduced the ability for SharePoint to emit its own CSP header. Its *presence* is a soft corroborating signal that the farm is on 24H1+; its *absence* proves nothing (many farms leave it disabled). Reported as weight-1 evidence and excluded from the confidence-scoring "corroborated by 2+ signals" threshold, so it can't inflate confidence in the build number.
- **Negotiated HTTP protocol** (`h2` / `http/1.1` / `h3`) - read via the browser's Resource Timing API off a request already made. Says nothing about the SharePoint build, but is a fact about the CDN/proxy/load-balancer layer in front of the farm. Returns nothing if the API is unavailable.
- **Reverse-proxy / WAF / CDN headers** - `Via`, `X-Forwarded-For/Host/Proto`, `CF-RAY`/`CF-Cache-Status` (Cloudflare), `X-Azure-Ref`/`X-Azure-FDID` (Azure Front Door/App Gateway), `X-Akamai-Transformed` (Akamai), `X-Served-By`/`X-Cache-Hits`/`X-Fastly-Request-ID` (Fastly), and `Age`. Explains infrastructure that may be stripping/rewriting other headers - relevant to the "no version signal retrieved" fallback message.

## Extended contextinfo fields

Beyond the build number, the script extracts `SupportedSchemaVersions`, `SiteFullUrl`, and `WebFullUrl` from the `POST /_api/contextinfo` response it already fetches. It cross-checks the server's own `WebFullUrl` against the site base URL it resolved, and raises a diagnostic if the two disagree - a direct signal that the site-root resolution landed on the wrong site collection.

## What's intentionally not implemented

**Office Online Server / WOPI discovery.** Probing WOPI discovery would reveal whether a separately-configured Office Online Server is present and roughly what generation it is - a distinct fact from the SharePoint farm's own version. It's not in this build because the discovery endpoint and response shape need more verification before shipping a confident implementation. Flagged in the script's header comment.

**Deliberately excluded, not deferred:**

- **Feature/solution enumeration** (`_api/web/Features`) - read-only, but probes installed *capabilities* rather than reading a version string; closer to attack-surface reconnaissance than fingerprinting.
- **Search queries** (`_api/search/query`) - requires executing a search against actual content, beyond metadata-reading.
- **SOAP endpoints** (`/_vti_bin/*.asmx`) - legacy, mostly dead weight on modern farms.
- **Subsite enumeration** (`_api/web/webs`) - site-structure reconnaissance, not fingerprinting.
- **Permission probing** - checking what the current session can do is access-mapping, not version detection.

## Build database

The script embeds the official SharePoint update history for four product lines, transcribed from Microsoft's release-notes page:

| Product | Entries | Range |
|---|---|---|
| SharePoint Server 2013 | 17 | RTM (2012-10-16) → final CU (April 2023, end of support) |
| SharePoint Server 2016 | 118 | RTM (2016-05-04) → final CU (June 2026, end of support 2026-07-14) |
| SharePoint Server 2019 | 92 | RTM (2018-10-22) → final CU (June 2026, end of support 2026-07-14) |
| SharePoint Server Subscription Edition | 58 | RTM (2021-11-02) → latest known CU (July 2026) |
| **Total** | **285** | |

Every entry includes the build number, a human-readable label (including SE's feature-update milestones - `23H1`, `24H1`, `24H2`, `25H1`, `25H2`, etc.), the release date, and the associated Microsoft KB number where applicable. The data lives in the `BUILD_DATABASE` object inside `sharehorse.js`, keyed by product name, each an array of `{ build, label, date, kb }` entries in ascending build order.

**Source of truth:** [learn.microsoft.com/officeupdates/sharepoint-updates](https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates)

2013's list is curated to RTM plus its later CUs rather than every monthly update, since the product has been out of support since April 2023. 2016, 2019, and Subscription Edition include **every** monthly entry from Microsoft's table.

If a detected build isn't in the table (e.g. a CU released after the last update), the script falls back to reporting the **closest known build** by numeric distance rather than failing silently.

## Automated signature updates

`BUILD_DATABASE` is kept current automatically by a scheduled GitHub Action, so new CUs appear in the database without manual transcription.

**Updater - `scripts/update-signatures.js`** (Node, no third-party dependencies; uses the built-in `fetch`, Node ≥ 18):

- Fetches the Microsoft release-notes page in Markdown form (`…/sharepoint-updates?accept=text/markdown`).
- Parses the four living-product tables (Subscription Edition, 2019, 2016, 2013) into `{ build, kb, date }` rows, taking the first build in the Version cell and the first (STS / language-independent) KB in the KB cell.
- **Merges, never regenerates.** Only build numbers not already in `BUILD_DATABASE` are appended, to the end of the matching product array, in the existing `{ build, label, date, kb }` shape. Existing hand-curated entries - RTM notes, feature-update milestones, end-of-support labels - are left byte-for-byte untouched.
- New entries get a derived label of `"<Month> <Year> CU"` and a date of `YYYY-MM-DD` (or `YYYY-MM` when Microsoft's table gives only a month).
- **Self-protecting:** it runs `node --check` on the result and refuses to write if the file wouldn't parse, and it aborts if a product section yields zero rows (a signal the page layout changed) rather than blanking the table. If nothing new is found, the file is left byte-identical, so no commit is produced.

**Workflow - `.github/workflows/update-sharepoint-sigs.yml`:**

- Runs daily at **06:12 UTC** (`cron: "12 6 * * *"`, minute jittered off `:00` to avoid the top-of-hour runner queue), plus a manual **Run workflow** button (`workflow_dispatch`).
- Checks out the repo, sets up Node, runs `node scripts/update-signatures.js`, then commits and pushes **only if `sharehorse.js` actually changed** - so quiet days produce no empty commits.
- Declares `permissions: contents: write`; the repository's **Settings → Actions → General → Workflow permissions** must also be set to **Read and write permissions** for the push to succeed. Commits land on the default branch (`main`).

The updater and the workflow only touch `BUILD_DATABASE`; all other code in `sharehorse.js` is untouched. The [manual process](#maintaining-the-build-database) below remains valid as a fallback or for curating labels the updater can't infer (e.g. feature-update milestones or end-of-support annotations).

## Confidence scoring

Confidence is about the **build number**, not the extended fingerprint. Soft/informational signals (CSP presence, WebTemplate) are weighted at 1 and excluded from the "corroborated by 2+ signals" threshold, so they add context without inflating certainty about the version.

| Level | Meaning |
|---|---|
| **High** | SharePoint Online (hostname-based), or an on-prem build with an exact, unambiguous database match. |
| **Medium-High** | Product identified with high confidence, but the specific CU/PU build isn't in the database (closest-match fallback used). |
| **Medium** | Product identified via the numeric build-range heuristic (no exact database match), corroborated by 2+ *build-bearing* signals. |
| **Low (ambiguous build)** | The 2019/SE shared-RTM collision, or another multi-product exact match. |
| **Low** | No reliable version signal could be retrieved at all. |

## Output

Every single-page run produces:

- **Console banner** with hostname and timestamp.
- **Raw Signals Collected** - every header/endpoint value read, plus the resolved REST API base URL, in a collapsible group.
- **Detection Evidence** - which signals fired, their weight, and their full resolved URL.
- **Diagnostics** - timeouts, auth redirects, 401/403s (only shown if something notable occurred).
- **Header Quirk Detected** - only shown when the `16.0.0.XXXXX` bug is triggered.
- **🧬 Extended Fingerprint** - Cloud Instance, Negotiated Protocol, Site/Web details (with the compatibility-mode warning inline if triggered), Site Collection topology, Regional Settings, installed language packs, REST contextinfo extras, CSP header, and proxy/WAF/CDN headers.
- **Build Database Match** - exact match, closest-match fallback, or ambiguity report.
- **Summary card** - Product, Build, CU/PU, KB Number, Released, Environment, Confidence, rendered as an aligned ASCII box (deliberately not Unicode box-drawing characters or variable font sizes, both of which break column alignment across console fonts/themes).
- **Downloadable `.txt` report** - everything above, saved via `Blob` + a synthetic anchor click.
- **Downloadable `.json` report** - structured, machine-readable, with a dedicated `extendedFingerprint` object alongside the existing `rawSignals`, intended for an inventory/audit pipeline.

Batch mode additionally produces a compact comparison table in the console and a combined `.csv` download with five extended columns. See [Batch mode](#batch-mode) and [Console helpers](#console-helpers).

## Network cost of the extended signals

Over core build detection, the extended fingerprint adds **three GET requests** per target URL:

1. `_api/web?$select=...` (WebTemplate, UIVersion, Configuration, Language)
2. `_api/web/regionalsettings?$select=...&$expand=InstalledLanguages,TimeZone`
3. `_api/site?$select=Id,HubSiteId,GroupId,ReadOnly`

All three are read-only, unauthenticated-by-default (same permission level as the core detection endpoints), and independently graceful-degrading - if one is blocked or 403s, the rest of the run is unaffected. The CSP-header, proxy-header, cloud-instance, and negotiated-protocol signals add **zero** extra requests, since they're read off responses already being fetched.

## Scope & limitations

- **Read-only.** Only issues `GET`/`HEAD`/`POST` requests to standard SharePoint metadata endpoints. No write operations, exploitation, CVE correlation, or vulnerability scanning.
- **No new authentication.** Runs in the current browser session's existing auth context; it does not attempt to log in or elevate privileges.
- **Same-origin only.** Subject to browser CORS/session restrictions; it can only see what the logged-in user's session can see, on the origin you're already on.
- **8-second request timeout.** A farm that's extremely slow (but not down) may show a spurious timeout diagnostic; re-run if you suspect this.
- **Build database currency.** Reflects Microsoft's release history as of the last update (automated daily, or see the file header for the last manual verification date). Very recent CUs not yet catalogued fall back to closest-match.
- **Pre-2013 products** (2010, 2007) are out of scope.
- **Batch mode site resolution.** Reliable for site collection root URLs; a deep page URL passed to batch mode may resolve to a subfolder rather than the true site root (see [Batch mode](#batch-mode)).
- Some fields (older monthly CUs) only have `YYYY-MM` precision rather than an exact day, because that's the precision Microsoft's table provides for those entries.
- SharePoint **Foundation** vs. **Server** SKUs (2010/2013 era) aren't distinguished - they share identical build numbering, and there's no reliable browser-only signal to tell them apart.
- **Compatibility-mode detection requires both signals.** If `/_api/web` is blocked (403) or the farm build couldn't be determined, no compatibility-mode comparison is possible - skipped rather than guessed.
- **Cloud instance detection is hostname-only** and cannot distinguish GCC (moderate) from commercial - see [signal #2](#2-sovereign--national-cloud-instance).
- **Negotiated protocol detection depends on browser support** for the Resource Timing API and may be restricted for cross-origin requests in some browsers (notably Safari); returns nothing rather than a guess when unavailable.
- **WOPI/Office Online Server detection is not implemented** - see [What's intentionally not implemented](#whats-intentionally-not-implemented).

## Privacy & safety

This tool is designed to be safe to run against a production farm:

- No credentials, tokens, or session data are transmitted anywhere except back to the SharePoint site itself (standard same-origin requests).
- No data leaves the browser except the locally-saved `.txt`/`.json`/`.csv` reports, written to your own downloads folder via a client-side `Blob` - nothing is sent to any third-party server.
- No CVE lookups, exploit code, or attack-path logic of any kind.
- The three additional endpoints used for the extended fingerprint are all standard, unauthenticated-by-default SharePoint REST resources - nothing requires elevated permissions beyond what a normal site visitor already has.

## Maintaining the build database

`BUILD_DATABASE` is updated automatically (see [Automated signature updates](#automated-signature-updates)). To update it by hand - as a fallback, or to add a curated label the updater can't infer:

1. Check [learn.microsoft.com/officeupdates/sharepoint-updates](https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates) for new entries (Microsoft typically publishes each month's CU/PU on the second Tuesday).
2. Add new entries to the relevant product's array, in ascending build order, following the existing `{ build, label, date, kb }` shape.
3. Update the "BUILD_DATABASE last verified" note in the file's header comment.

## Disclaimer

This tool is intended for legitimate IT asset inventory, patch-compliance auditing, and authorized security assessments. Use it only against SharePoint sites you own or are explicitly authorized to inspect.

- **Authorization is your responsibility.** Running fingerprinting or reconnaissance against systems you do not own or have written permission to test may violate computer-misuse laws, acceptable-use policies, or contractual terms in your jurisdiction. You are solely responsible for ensuring you have permission before running it.
- **No warranty.** The tool is provided "as is," without warranty of any kind. Detection results, build-database matches, and confidence levels can be wrong or out of date, and should be verified against an authoritative source (e.g. Central Administration, farm install history) before you act on them.
- **No liability.** The authors and contributors accept no liability for any damage, disruption, or legal consequence arising from use or misuse of this tool.
- **Not affiliated with Microsoft.** "SharePoint" and related names are trademarks of Microsoft Corporation. This is an independent tool and is not endorsed by or affiliated with Microsoft.

## License

Add your preferred license here (e.g. MIT) before publishing to GitHub.
