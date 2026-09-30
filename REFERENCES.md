# References

Consolidated sources for Sharehorse and its research, hardening, detection, and migration material. Individual docs (`hardening.md`, `detection.md`, `MIGRATE.md`) also carry their own inline citations; this file is the single deduplicated list.

## Source of truth (build / CU mappings)

- SharePoint updates (build, CU/PU, KB, release dates for 2013/2016/2019/Subscription Edition) - Microsoft. <https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates>

## Version detection and the header myth

- SharePoint Mythbusting: the response header contains the current SharePoint version - Wictor Wilén. <https://www.wictorwilen.se/blog/sharepoint-mythbusting-the-response-header-contains-the-current-sharepoint-version/>
- "SharePoint does not have a build version, full stop" - Stefan Goßner (Microsoft). <https://blog.stefan-gossner.com/2016/08/23/sharepoint-does-not-have-a-build-version-full-stop/>
- Get to know the SharePoint REST service - Microsoft. <https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service>
- Complete basic operations using SharePoint REST endpoints (`/_api/contextinfo`) - Microsoft. <https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/complete-basic-operations-using-sharepoint-rest-endpoints>

## Community build-number references (version identification)

- SharePoint 2016 Builds List - Todd Klindt. <https://www.toddklindt.com/sharepoint-2016-builds-list/>
- SharePoint 2019 Builds List - Todd Klindt. <https://www.toddklindt.com/sharepoint-2019-builds-list/>
- SharePoint 2013 Build List - Todd Klindt. <https://www.toddklindt.com/sharepoint-2013-build-list/>

## Product facts the tool relies on

- Microsoft 365 national / sovereign cloud deployments (GCC High, DoD, 21Vianet) - Microsoft. <https://learn.microsoft.com/en-us/graph/deployments>
- SharePoint Server Subscription Edition 24H1 (introduces the CSP header), KB5002564 - Microsoft. <https://support.microsoft.com/help/5002564>
- Customized classic pages may be blocked by CSP restriction (KB5033720) - Microsoft. <https://support.microsoft.com/en-us/topic/customized-classic-pages-may-be-blocked-by-csp-restriction-kb5033720-5bfefe7a-2cca-4cd9-9c49-f86290586d20>
- New-SPSite (`-CompatibilityLevel`, site collection compatibility levels) - Microsoft. <https://learn.microsoft.com/en-us/powershell/module/sharepoint-server/new-spsite>
- Microsoft Lifecycle (SharePoint Server 2016/2019 end of support, July 14 2026) - Microsoft. <https://learn.microsoft.com/en-us/lifecycle/products/>

## Hardening (IIS / ASP.NET / SharePoint)

- Remove unwanted HTTP response headers - Microsoft. <https://learn.microsoft.com/en-us/archive/blogs/varunm/remove-unwanted-http-response-headers>
- Manage anonymous access for a web application - Microsoft. <https://learn.microsoft.com/en-us/sharepoint/administration/manage-anonymous-access-for-a-web-application>
- HttpRuntimeSection.EnableVersionHeader - Microsoft. <https://learn.microsoft.com/en-us/dotnet/api/system.web.configuration.httpruntimesection.enableversionheader>
- HTTP.sys registry settings (`DisableServerHeader`) - Microsoft. <https://learn.microsoft.com/en-us/troubleshoot/iis/httpsys-registry-windows>
- Request Filtering `<requestFiltering>` (`removeServerHeader`) - Microsoft IIS. <https://learn.microsoft.com/en-us/iis/configuration/system.webserver/security/requestfiltering>
- Remove a Custom HTTP Response Header (IIS) - Microsoft. <https://learn.microsoft.com/en-us/iis/configuration/system.webserver/httpprotocol/customheaders/>
- URL Rewrite - modifying HTTP response headers - Microsoft. <https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/modifying-http-response-headers>
- URL Rewrite - creating outbound rules - Microsoft. <https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/creating-outbound-rules-for-url-rewrite-module>
- How to disable WebDAV / Client Integration - Microsoft SharePoint. <https://learn.microsoft.com/en-us/sharepoint/troubleshoot/administration/how-to-disable-webdav-use>

## Detection engineering (logs, SIEM, hunting)

- W3C logging / IIS log fields - Microsoft. <https://learn.microsoft.com/windows/desktop/Http/w3c-logging>
- W3C Extended Log File Format field definitions - Microsoft. <https://learn.microsoft.com/previous-versions/windows/it-pro/windows-server-2003/cc786596(v=ws.10)>
- Azure Monitor Agent overview - Microsoft. <https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-overview>
- Azure Arc-enabled servers overview - Microsoft. <https://learn.microsoft.com/en-us/azure/azure-arc/servers/overview>
- SharePoint exploits and the hidden threat of IIS module persistence - Splunk. <https://www.splunk.com/en_us/blog/security/sharepoint-exploits-and-the-hidden-threat-of-iis-module-persistence.html>
- Adversary tradecraft: exploitation of the SharePoint RCE - Graylog. <https://graylog.org/post/adversary-tradecraft-exploitation-of-the-sharepoint-rce/>
- Detecting the ToolShell SharePoint exploit - Anomali. <https://www.anomali.com/blog/detecting-the-toolshell-sharepoint-exploit>
- Sigma rule: CVE-2025-53770 exploitation, Web/IIS - SigmaHQ. <https://detection.fyi/sigmahq/sigma/emerging-threats/2025/exploits/cve-2025-53770/web_win_iis_exploit_cve_2025_53770/>

## Threat intelligence - exploitation and CVEs

- Known Exploited Vulnerabilities Catalog (filter: SharePoint) - CISA. <https://www.cisa.gov/known-exploited-vulnerabilities-catalog>
- CVE-2025-53770 "ToolShell" added to KEV catalog - CISA. <https://www.cisa.gov/news-events/alerts/2025/07/20/cisa-adds-one-known-exploited-vulnerability-cve-2025-53770-toolshell-catalog>
- CVE-2025-53770 - NVD. <https://nvd.nist.gov/vuln/detail/CVE-2025-53770>
- MAR-251132.c1.v1: Exploitation of SharePoint Vulnerabilities (malware analysis report) - CISA. <https://www.cisa.gov/news-events/analysis-reports/ar25-218a>
- Microsoft releases guidance on exploitation of SharePoint vulnerabilities (alert) - CISA. <https://www.cisa.gov/news-events/alerts/2025/07/20/update-microsoft-releases-guidance-exploitation-sharepoint-vulnerabilities>
- Disrupting active exploitation of on-premises SharePoint vulnerabilities - Microsoft Security. <https://www.microsoft.com/en-us/security/blog/2025/07/22/disrupting-active-exploitation-of-on-premises-sharepoint-vulnerabilities/>
- Microsoft patches ToolShell zero-days exploited to hack SharePoint servers (timeline) - SecurityWeek. <https://www.securityweek.com/microsoft-patches-toolshell-zero-days-exploited-to-hack-sharepoint-servers/>
- Active exploitation of Microsoft SharePoint (CVE-2025-49704 / 49706 / 53770) threat brief - Unit 42, Palo Alto Networks. <https://unit42.paloaltonetworks.com/microsoft-sharepoint-cve-2025-49704-cve-2025-49706-cve-2025-53770/>
- SharePoint under siege: ToolShell (original discovery) - Eye Security. <https://research.eye.security/sharepoint-under-siege/>
- Microsoft SharePoint attacks ensnare 400 victims, including federal agencies - CyberScoop. <https://cyberscoop.com/microsoft-sharepoint-attacks-400-victims-us-agencies/>
- ToolShell attacks hit 400+ SharePoint servers, US government victims named - SecurityWeek. <https://www.securityweek.com/toolshell-attacks-hit-400-sharepoint-servers-us-government-victims-named/>
- High-severity SharePoint RCE bug patched by Microsoft (CVE-2026-45659) - Help Net Security. <https://www.helpnetsecurity.com/2026/05/26/sharepoint-vulnerability-cve-2026-45659/>
- CISA adds exploited SharePoint RCE zero-day (CVE-2026-58644) to KEV - The Hacker News. <https://thehackernews.com/2026/07/cisa-adds-exploited-sharepoint-rce-zero.html>
- Microsoft SharePoint flaw CVE-2026-65660 now exploited in attacks - SecurityWeek. <https://www.securityweek.com/microsoft-sharepoint-flaw-cve-2026-65660-now-exploited-in-attacks/>

## Migration

- Shared responsibility in the cloud - Microsoft. <https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility>
- Introducing the SharePoint Migration Tool - Microsoft. <https://learn.microsoft.com/en-us/sharepointmigration/introducing-the-sharepoint-migration-tool>

## Provenance

- **Official (Microsoft Learn / Microsoft Support, CISA, NVD):** primary vendor and government sources.
- **Community / engineer blogs:** Wictor Wilén, Stefan Goßner (Microsoft), Todd Klindt - build-number and version-reporting references.
- **Third-party research / threat intelligence:** Unit 42, Eye Security, Splunk, Graylog, Anomali, SigmaHQ, CyberScoop, SecurityWeek, The Hacker News, Help Net Security.
- 2026 CVE entries postdate the original compilation and rest on CISA and vendor reporting; the CISA KEV catalog is the authoritative live list.
