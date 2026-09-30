## Detection (Sharepoint On-premises - SE, 20XX)

Sharehorse runs in the browser console on the logged-in user's session: real cookies, normal User-Agent, correct Referer. Detect on the request pattern and rare endpoints, not on a scanner signature. The queries below are starting points to adapt; only the IIS W3C log fields are cited. [1]

### Telemetry sources, best to weakest

- **IIS W3C logs on the web front ends** - primary source, local to the farm. Enable: `c-ip`, `cs-username`, `cs-uri-stem`, `cs-uri-query`, `sc-status`, `cs(User-Agent)`, `time-taken`. [1] Any SIEM that ingests them (Splunk, Elastic, QRadar, Graylog) can run the correlation; nothing here requires Azure.
- **Reverse proxy / load balancer logs** (F5, Citrix ADC, nginx, Barracuda) - same URI visibility where TLS terminates, and can block.
- **SharePoint ULS logs** - REST reads leave no fingerprinting trail; not a primary source.
- **Network firewall (L3/L4)** - blind under TLS (IP/port only). URI detection needs TLS termination or an NGFW/IPS with TLS inspection.

### High-Signal Indicators

1. **`GET .../_vti_pvt/service.cnf`** - strongest single indicator; normal page loads do not fetch it (legacy FrontPage metadata). [2]
2. **Clustered burst** - one `c-ip` + `cs-username` hitting `service.cnf`, `/_api/contextinfo`, and two or more of `/_api/web`, `/_api/site`, `/_api/web/regionalsettings` against one site within ~15-30 seconds.
3. **Batch mode** - the same burst repeated across several `/sites/<name>/` paths from one client.

`cs-uri-stem` includes the managed path (e.g. `/sites/Finance/_api/web`), so match endpoints by suffix, not exact equality.

### Correlation logic

```
source:   IIS W3C logs (web front ends)
group by: c-ip, cs-username, time-bucket (~30s)
normalize endpoint by suffix of cs-uri-stem:
  .../_vti_pvt/service.cnf        -> service.cnf
  .../_api/contextinfo            -> contextinfo
  .../_api/web/regionalsettings   -> regionalsettings
  .../_api/site                   -> site
  .../_api/web                    -> web
trigger: group contains service.cnf AND >= 2 distinct _api endpoints
severity: High if cs-username = "-" (anonymous), else Medium
```

### Example: Microsoft Sentinel (KQL)

Sentinel only. On-prem IIS logs reach `W3CIISLog` by Azure Arc-enabling each web front end, then AMA with a Data Collection Rule collecting IIS logs (the legacy Log Analytics agent retired August 2024). This ships logs to Azure; purely on-prem, use the Splunk example instead. Adjust names to your connector.

```kusto
let window = 30s;
W3CIISLog
| where TimeGenerated > ago(24h)
| extend stem = tolower(csUriStem)
| extend ep = case(
    stem endswith "/_vti_pvt/service.cnf",      "service.cnf",
    stem endswith "/_api/web/regionalsettings", "regionalsettings",
    stem endswith "/_api/contextinfo",          "contextinfo",
    stem endswith "/_api/site",                 "site",
    stem endswith "/_api/web",                  "web",
    "other")
| where ep != "other"
| summarize endpoints = make_set(ep), reqs = count()
    by cIP, csUserName, bin(TimeGenerated, window)
| where set_has_element(endpoints, "service.cnf")
    and array_length(set_difference(endpoints, dynamic(["service.cnf"]))) >= 2
| extend severity = iff(csUserName == "-", "High", "Medium")
| project TimeGenerated, cIP, csUserName, severity, endpoints, reqs
```

### Example: Splunk (SPL)

Field names assume an IIS TA (e.g. `sourcetype=ms:iis:auto`); adjust to yours.

```spl
index=iis (cs_uri_stem="*/_vti_pvt/service.cnf" OR cs_uri_stem="*/_api/contextinfo"
       OR cs_uri_stem="*/_api/site" OR cs_uri_stem="*/_api/web"
       OR cs_uri_stem="*/_api/web/regionalsettings")
| eval ep=case(like(cs_uri_stem,"%/_vti_pvt/service.cnf"),"service.cnf",
               like(cs_uri_stem,"%/_api/web/regionalsettings"),"regionalsettings",
               like(cs_uri_stem,"%/_api/contextinfo"),"contextinfo",
               like(cs_uri_stem,"%/_api/site"),"site",
               like(cs_uri_stem,"%/_api/web"),"web")
| bin _time span=30s
| stats dc(ep) as ep_count values(ep) as eps by _time, c_ip, cs_username
| where isnotnull(mvfind(eps,"service.cnf")) AND ep_count>=3
| eval severity=if(cs_username="-","High","Medium")
```

`ep_count>=3` = `service.cnf` plus at least two `_api` endpoints in the same bucket.

### Blocking at the edge

- **Reverse proxy / WAF** - deny `.../_vti_pvt/service.cnf` (confirm nothing depends on FrontPage Server Extensions first; do not blanket-block `/_vti_bin/`, which hosts `client.svc`).
- **IDS/IPS (Suricata/Snort)** - URI rule on `service.cnf` works only where it sees plaintext (internal segment or TLS inspection).

### Tuning - exclusions

- **Search crawl account** - hits `_api` and legacy endpoints by design; exclude by `cs-username`.
- **Load-balancer / uptime probes, SCOM, third-party monitoring** - exclude by source IP.
- **SharePoint Designer** and legacy clients - touch `vti` endpoints; exclude known admin hosts. [2]

### Not detectable

- **Report generation** - `.txt` / `.json` / `.csv` are written client-side via `Blob`.
- **Cloud-instance inference** - hostname only; no request made.
- **A single request** - indistinguishable from normal use; detection depends on the clustered burst.

## Disclaimer

The hardening, mitigation, and detection guidance here is provided for informational purposes to help defenders protect systems they own or are authorized to administer.

- **Test before production.** Changes to IIS, Http.sys, ASP.NET, reverse-proxy, or SharePoint configuration can break functionality - Office client integration, search crawl, WebDAV, authentication, and third-party tools. Validate every change in a non-production environment first and have a rollback plan.
- **Verify against current vendor documentation.** Endpoints, headers, agents, and settings change between product versions and over time. Confirm each step against the referenced Microsoft (or vendor) documentation for your exact version before applying it.
- **Detection is not prevention.** The example queries are starting points to tune to your own traffic; they will produce false positives and false negatives until validated against real logs in your environment.
- **No warranty, no liability.** This material is provided "as is," without warranty of any kind. The authors and contributors accept no liability for any damage, outage, or other consequence arising from its use or misuse.
- **Not affiliated with Microsoft.** "SharePoint," "IIS," "Azure," and related names are trademarks of Microsoft Corporation. This is an independent project and is not endorsed by or affiliated with Microsoft.
- 
### References

1. W3C Logging / IIS log fields - Microsoft. <https://learn.microsoft.com/windows/desktop/Http/w3c-logging> ; field definitions: <https://learn.microsoft.com/previous-versions/windows/it-pro/windows-server-2003/cc786596(v=ws.10)>
2. SharePoint Mythbusting: the response header contains the current SharePoint version - Wictor Wilén. <https://www.wictorwilen.se/blog/sharepoint-mythbusting-the-response-header-contains-the-current-sharepoint-version/>
