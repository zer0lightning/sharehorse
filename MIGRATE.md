# Why migrate: on-premises SharePoint risk and what moving to the cloud changes

On-premises SharePoint puts an internet-facing, customer-patched application server on your perimeter, and that model has been repeatedly exploited. Moving to SharePoint Online shifts most of that risk to Microsoft, but not all of it, and not all content and customizations move cleanly.

## The continued risk of on-premises SharePoint

On-prem SharePoint (2016, 2019, Subscription Edition) is a recurring target for critical remote code execution. Exposure usually comes down to a single missing Cumulative Update, which is why exact build/patch identification matters.

Confirmed-exploited vulnerabilities (not exhaustive; the live authoritative list is CISA's Known Exploited Vulnerabilities catalog, filtered to SharePoint [1]):

| CVE | Type | Patch available | Exploitation started (if known) | Notes |
|---|---|---|---|---|
| CVE-2019-0604 | Unauth RCE | Feb 2019 | ~Apr-May 2019 (after patch) | Nation-state, mass-exploited. CISA KEV. [1] |
| CVE-2023-29357 (+ CVE-2023-24955) | Priv-esc (+ RCE) | May-Jun 2023 | by 2024 | Pwn2Own chain; 29357 in CISA KEV. [1] |
| CVE-2024-38094 | RCE | Jul 9 2024 | by Oct 2024 (after patch) | CISA KEV added 2024-10-22. [1] |
| CVE-2025-49704 (+ CVE-2025-49706) | RCE (+ auth bypass) | Jul 8 2025 | ~Jul 18 2025 | "ToolShell" chain. [1][9] |
| CVE-2025-53770 (+ CVE-2025-53771) | Unauth RCE | ~Jul 20-21 2025 (out-of-band) | ~Jul 18 2025 (zero-day, before patch) | Bypass of the July patches; mass-exploited. [5][9] |
| CVE-2026-45659 | Deserialization RCE | May 2026 | by Jul 2026 (after patch) | CISA KEV 2026-07-01; Storm-2603 / Warlock ransomware; auth (Site Member). [6] |
| CVE-2026-58644 | RCE (zero-day per report) | 2026 | 2026 (before patch, per report) | Added to CISA KEV, Jul 2026. [7] |
| CVE-2026-65660 | Code-injection RCE | 2026 (Aug/Sep) | 2026 | Reclassified from spoofing; CISA KEV, Sep 2026. [8] |

Dates are approximate; CISA KEV records the authoritative "date added." 2026 entries and their exploitation timing rest on vendor/CISA reporting (post the original compilation). The pattern holds across the list: except for the ToolShell zero-days, the patch shipped before exploitation, so unpatched, internet-exposed farms were the casualties.

### Metrics from the 2025 "ToolShell" wave

- **Scope:** 400+ organizations compromised, including US federal agencies, within the first days. [2][3]
- **Exposure:** thousands of internet-facing on-prem servers at risk; unauthenticated, with attackers stealing machine keys to forge access and persist through patching. [4]
- **Attribution:** Microsoft attributed activity to China-based actors (Linen Typhoon, Violet Typhoon, Storm-2603) and shipped emergency patches. [5]
- **Cloud impact:** the campaign affected **on-premises SharePoint only**; SharePoint Online was not vulnerable. [5]

## Why SharePoint is a prime initial-access target

When an on-premises farm is exploited, the attacker lands in the middle of the enterprise, not on a low-value edge box:

- **Internet-facing and central.** On-prem farms are frequently internet-exposed, and one server is reachable by the whole organization - a single unauthenticated RCE is broad reach, not one workstation.
- **High-privilege execution.** Server-side code runs in the IIS worker process under farm/service accounts that are often over-privileged and domain-joined, so code execution starts well above a normal user.
- **Deep Active Directory integration.** SharePoint is tied to AD/Entra ID; its service accounts and trusts are a ready path toward domain resources and lateral movement.
- **Sensitive data on the box.** The farm is a central document store - intranet content, credentials in documents, PII - valuable before any lateral movement.
- **Trusted internal position.** It is trusted by the SQL back-end, Office clients, and other systems, making it an effective pivot.

ToolShell shows why this combination is dangerous:

- **Unauthenticated RCE** gave initial access with no credentials. [4]
- **Machine-key theft for durable persistence.** Attackers exfiltrated the server's ASP.NET machine keys, so access can be re-forged - patching alone does not evict the intruder. The farm must be patched **and** its machine keys rotated, then hunted. [4][5]
- **Escalation to impact.** Activity progressed from web shells to credential theft and, in cases, ransomware (Storm-2603 / Warlock), against 400+ organizations including US federal agencies. [3][5]

Because a compromised farm yields high-privilege code execution, domain reach, and persistence that survives patching, SharePoint is a beachhead for the whole environment, not a single-host incident. Patch, rotate machine keys, and assume-compromise hunt.

## How moving to SharePoint Online changes the risk

Under the shared-responsibility model, the provider takes over the layers that cause the incidents above. [10]

**Transfers to Microsoft (SharePoint Online / Microsoft 365):**

- Application and server patching - no unpatched, internet-facing farm to own. The "one CU behind" incident class largely disappears.
- Infrastructure, OS, and network hardening of the service.
- Continuous, centralized updates rather than per-farm CU cycles.

**Stays yours (does not transfer):**

- Identity and access - Entra ID configuration, MFA, conditional access, over-permissioned accounts.
- Data governance - oversharing, external sharing, sensitivity labeling, retention.
- Third-party apps and add-ins, and the permissions you grant them.
- Insider misuse and tenant misconfiguration.

The cloud removes the perimeter-RCE and patch-lag risk class; it does not remove identity, data-governance, or configuration risk.

## Migration reality: what transfers, what needs rework, what does not

Moving content is not moving customizations. The SharePoint Migration Tool (SPMT) moves content well; server-side code does not move at all. [11]

**Transfers (SPMT):**

- Document libraries, lists, files; most list items and metadata.
- Modern site pages; version history (configurable).
- Basic permissions (reviewed and re-mapped to Entra ID identities).

**Needs rework:**

- Workflows - SharePoint 2010 workflows are retired in SharePoint Online and 2013 workflows are deprecated; rebuild in Power Automate.
- InfoPath forms - deprecated; rebuild in Power Apps / Microsoft Forms.
- Classic branding (master pages, page layouts, custom CSS) - re-implement with modern theming / SPFx extensions.
- Managed metadata, content types, term sets - migrate with planning.
- Business Connectivity Services / external data - re-architect.

**Does not transfer (rebuild required):**

- Full-trust farm solutions (WSP server-side code) - rebuild as SharePoint Framework (SPFx) or Microsoft 365 apps.
- Sandbox solutions, server-side event receivers, custom timer jobs - replace with remote event receivers, webhooks, or Azure Functions.
- Farm/web.config and IIS customizations - no farm to configure.
- Third-party farm solutions - require vendor SaaS equivalents.

## Bottom line

On-prem SharePoint keeps a patch-critical, internet-exposed RCE target on your perimeter, and the 2025-2026 exploitation record shows the cost of being one update behind. SharePoint Online moves patching and infrastructure risk to Microsoft (and was untouched by ToolShell), but identity, data-governance, and configuration risk remain yours. Content migrates with tooling; server-side customizations must be rebuilt.

## References

1. Known Exploited Vulnerabilities Catalog (filter: SharePoint) - CISA. <https://www.cisa.gov/known-exploited-vulnerabilities-catalog>
2. Microsoft SharePoint attacks ensnare 400 victims, including federal agencies - CyberScoop. <https://cyberscoop.com/microsoft-sharepoint-attacks-400-victims-us-agencies/>
3. ToolShell attacks hit 400+ SharePoint servers, US government victims named - SecurityWeek. <https://www.securityweek.com/toolshell-attacks-hit-400-sharepoint-servers-us-government-victims-named/>
4. MAR-251132.c1.v1: Exploitation of SharePoint Vulnerabilities - CISA. <https://www.cisa.gov/news-events/analysis-reports/ar25-218a>
5. Disrupting active exploitation of on-premises SharePoint vulnerabilities - Microsoft Security. <https://www.microsoft.com/en-us/security/blog/2025/07/22/disrupting-active-exploitation-of-on-premises-sharepoint-vulnerabilities/>
6. High-severity SharePoint RCE bug patched by Microsoft (CVE-2026-45659) - Help Net Security. <https://www.helpnetsecurity.com/2026/05/26/sharepoint-vulnerability-cve-2026-45659/>
7. CISA adds exploited SharePoint RCE zero-day (CVE-2026-58644) to KEV - The Hacker News. <https://thehackernews.com/2026/07/cisa-adds-exploited-sharepoint-rce-zero.html>
8. Microsoft SharePoint flaw CVE-2026-65660 now exploited in attacks - SecurityWeek. <https://www.securityweek.com/microsoft-sharepoint-flaw-cve-2026-65660-now-exploited-in-attacks/>
9. Microsoft patches ToolShell zero-days exploited to hack SharePoint servers - SecurityWeek. <https://www.securityweek.com/microsoft-patches-toolshell-zero-days-exploited-to-hack-sharepoint-servers/>
10. Shared responsibility in the cloud - Microsoft. <https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility>
11. Introducing the SharePoint Migration Tool - Microsoft. <https://learn.microsoft.com/en-us/sharepointmigration/introducing-the-sharepoint-migration-tool>
