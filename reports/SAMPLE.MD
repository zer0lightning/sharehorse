# Sample reports and screenshots

Example output from Sharehorse, so you can see what a run looks like before running it yourself. See [README.md](./README.md) for what each field means.

## Scenario

These samples come from one representative run against a fictional on-premises farm:

| Field | Value |
|---|---|
| Target | `https://sharepoint.local/sites/Finance/SitePages/Home.aspx` |
| Product | SharePoint Server Subscription Edition |
| Build | `16.0.19725.20434` (July 2026 CU, KB5002882) |
| Confidence | High (exact build-database match) |
| Notable findings | `16.0.0.XXXXX` header bug worked around; site collection stuck in UIVersion 15 compatibility mode on a major-16 farm |

The values (`sharepoint.local`, GUIDs, proxy name) are illustrative; the build-to-CU mapping is real and matches [Microsoft's release notes](https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates).

## Console output

What prints in the DevTools console after pasting `sharehorse.js`: banner, collapsible signal groups, the extended fingerprint (with the compatibility-mode warning), the header-quirk note, the build-database match, and the summary card.

![Sharehorse console output](./docs/sharehorse-console.png)

## `.txt` report

Saved automatically to your downloads folder, and also available via `copy(__spDetectorReport())`. Excerpt below; full file: [`docs/sample-report.txt`](./docs/sample-report.txt).

```text
-- Detection Evidence --
  - REST LibraryVersion (weight 5)
      URL: https://sharepoint.local/sites/Finance/_api/contextinfo
  - vti_buildversion (weight 5)
      URL: https://sharepoint.local/_vti_pvt/service.cnf
  - vti_extenderversion (weight 3)
      URL: https://sharepoint.local/_vti_pvt/service.cnf
  - MicrosoftSharePointTeamServices (deprioritized, known 16.0.0.XXXXX bug) (weight 1)
      URL: (HTTP response header)

-- Build Database Match --
  Exact match: 16.0.19725.20434 = July 2026 CU (2026-07-14, KB5002882)

-- Summary --
  Product                      : SharePoint Server Subscription Edition
  Build                        : 16.0.19725.20434
  CU / PU                      : July 2026 CU
  KB Number                    : KB5002882
  Released                     : 2026-07-14
  Environment                  : On-Premises / SharePoint Server
  Confidence                   : High
  Detection Method             : exact match in build database (July 2026 CU)
```

## `.json` report

Machine-readable sibling for inventory/audit pipelines, also available via `copy(__spDetectorReportJSON())`. It carries a dedicated `extendedFingerprint` object alongside the flat `rawSignals`. Top-level fields shown below; full file: [`docs/sample-report.json`](./docs/sample-report.json).

```json
{
  "generatedAt": "2026-09-30T21:40:12.885Z",
  "targetUrl": "https://sharepoint.local/sites/Finance/SitePages/Home.aspx",
  "hostname": "sharepoint.local",
  "environment": "On-Premises / SharePoint Server",
  "product": "SharePoint Server Subscription Edition",
  "detectedBuild": "16.0.19725.20434",
  "cu": "July 2026 CU",
  "cuExactMatch": true,
  "kb": "5002882",
  "releaseDate": "2026-07-14",
  "confidence": "High",
  "detectionMethod": "exact match in build database (July 2026 CU)",
  "headerBugDetected": true,
  "siteBaseUrl": "https://sharepoint.local/sites/Finance",
  "usedPageContextInfo": true,
  "extendedFingerprint": { "truncated": "see docs/sample-report.json" },
  "rawSignals": { "truncated": "see docs/sample-report.json" },
  "evidence": [ { "truncated": "see docs/sample-report.json" } ],
  "diagnostics": []
}
```

## Files in this folder

| File | What it is |
|---|---|
| `docs/sharehorse-console.png` | The console screenshot shown above |
| `docs/sample-report.txt` | Full `.txt` report for this run (exact tool output) |
| `docs/sample-report.json` | Full `.json` report for this run (exact tool output) |

Notes:

- In a clean run like this one, the Diagnostics group does not appear. It only renders when there is a timeout, auth redirect, or 401/403 to report.
- The excerpts above are lightly simplified for readability. The two files in `docs/` are the tool's exact output (including the em dashes it emits in headings and match lines).
