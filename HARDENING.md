# Hardening

Two facts set the ceiling on what hardening achieves:

- **The build cannot be hidden from an authenticated user.** `POST /_api/contextinfo` returns `LibraryVersion` by design and is core to SharePoint; it cannot be blocked without breaking the product.
- **There is no official Microsoft method to remove the `MicrosoftSharePointTeamServices` header.** IIS/proxy rules blank the value, they do not remove the header. [1]

Hardening reduces unauthenticated exposure and removes generic banners. Patching is the actual control.

## 1. Require authentication

If a content web application allows anonymous access, Sharehorse's endpoints are reachable without a session. Removing anonymous access makes unauthenticated requests to `/_api/*` and `/_vti_pvt/service.cnf` fail. Anonymous access is a per-web-application setting in Central Administration. [2]

## 2. Remove generic banner headers (officially documented)

ASP.NET / IIS headers, not SharePoint-specific. Sharehorse reads `X-Powered-By`, `X-AspNet-Version`, and `Server`.

| Header | Method | Reference |
|---|---|---|
| `X-Powered-By` | IIS > HTTP Response Headers > Remove (`customHeaders` `<remove>`); removes it fully | [3] |
| `X-AspNet-Version` | `<httpRuntime enableVersionHeader="false" />` in `<system.web>` | [4] |
| `Server` | Registry DWORD `DisableServerHeader = 1` at `HKLM\SYSTEM\CurrentControlSet\Services\HTTP\Parameters`; IIS 10+ `<requestFiltering removeServerHeader="true" />` | [5], [6] |

```xml
<system.webServer>
  <httpProtocol>
    <customHeaders>
      <remove name="X-Powered-By" />
    </customHeaders>
  </httpProtocol>
</system.webServer>
```

```xml
<system.web>
  <httpRuntime enableVersionHeader="false" />
</system.web>
```

Apply at the IIS site / front-end level, not in SharePoint's managed `web.config` (the farm can overwrite it).

## 3. The `MicrosoftSharePointTeamServices` header

No Microsoft-documented removal. Two options, both caveated:

- **Blank it with an IIS URL Rewrite outbound rule.** Per Microsoft, an outbound rule "will not remove the header all together but it will remove the value of it" - the header stays, empty. Server variable: `RESPONSE_MicrosoftSharePointTeamServices`. [1], [7]

  ```xml
  <system.webServer>
    <rewrite>
      <outboundRules>
        <rule name="Blank-TeamServices">
          <match serverVariable="RESPONSE_MicrosoftSharePointTeamServices" pattern=".+" />
          <action type="Rewrite" value="" />
        </rule>
      </outboundRules>
    </rewrite>
  </system.webServer>
  ```

- **Disable Client Integration on the web application.** Reported to remove the header by Wictor Wilén; not confirmed by Microsoft. [8] Microsoft calls disabling client integration "an extreme measure" that "blocks all Office client interaction with SharePoint." [9]

This header is already unreliable (metabase-cached; malformed on 2019+/SE - see the header-bug section). [8]

## 4. Not mitigable

- **REST metadata** - `/_api/contextinfo`, `/_api/web`, `/_api/site`, `/_api/web/regionalsettings`. Core endpoints; authentication is the only lever, and any authenticated read returns them.
- **Cloud instance** - inferred from the hostname; no request made.
- **Content-Security-Policy presence** - do not disable CSP to hide the 24H1+ hint; the leak is negligible against the protection lost.
- **UIVersion compatibility drift** - remediate with `Set-SPSite -CompatibilityLevel`, do not hide.

## Bottom line

Require authentication to stop anonymous recon; remove the documented ASP.NET/IIS banners. The build is returned by the REST API by design and cannot be hidden from an authenticated user. Patching is the only control that changes the outcome.

## Disclaimer

The hardening, mitigation, and detection guidance here is provided for informational purposes to help defenders protect systems they own or are authorized to administer.

- **Test before production.** Changes to IIS, Http.sys, ASP.NET, reverse-proxy, or SharePoint configuration can break functionality - Office client integration, search crawl, WebDAV, authentication, and third-party tools. Validate every change in a non-production environment first and have a rollback plan.
- **Verify against current vendor documentation.** Endpoints, headers, agents, and settings change between product versions and over time. Confirm each step against the referenced Microsoft (or vendor) documentation for your exact version before applying it.
- **Detection is not prevention.** The example queries are starting points to tune to your own traffic; they will produce false positives and false negatives until validated against real logs in your environment.
- **No warranty, no liability.** This material is provided "as is," without warranty of any kind. The authors and contributors accept no liability for any damage, outage, or other consequence arising from its use or misuse.
- **Not affiliated with Microsoft.** "SharePoint," "IIS," "Azure," and related names are trademarks of Microsoft Corporation. This is an independent project and is not endorsed by or affiliated with Microsoft.

## References

1. Remove unwanted HTTP response headers - Microsoft (archive). <https://learn.microsoft.com/en-us/archive/blogs/varunm/remove-unwanted-http-response-headers>
2. Manage anonymous access for a web application - Microsoft SharePoint Server. <https://learn.microsoft.com/en-us/sharepoint/administration/manage-anonymous-access-for-a-web-application>
3. Remove a Custom HTTP Response Header (IIS) - Microsoft. <https://learn.microsoft.com/en-us/iis/configuration/system.webserver/httpprotocol/customheaders/>
4. HttpRuntimeSection.EnableVersionHeader Property - Microsoft .NET API. <https://learn.microsoft.com/en-us/dotnet/api/system.web.configuration.httpruntimesection.enableversionheader>
5. HTTP.sys registry settings for Windows (`DisableServerHeader`) - Microsoft. <https://learn.microsoft.com/en-us/troubleshoot/iis/httpsys-registry-windows>
6. Request Filtering `<requestFiltering>` (`removeServerHeader`, IIS 10+) - Microsoft IIS. <https://learn.microsoft.com/en-us/iis/configuration/system.webserver/security/requestfiltering>
7. Modifying HTTP response headers / Creating outbound rules - URL Rewrite Module, Microsoft IIS. <https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/modifying-http-response-headers> ; <https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/creating-outbound-rules-for-url-rewrite-module>
8. SharePoint Mythbusting: the response header contains the current SharePoint version - Wictor Wilén. <https://www.wictorwilen.se/blog/sharepoint-mythbusting-the-response-header-contains-the-current-sharepoint-version/>
9. How to disable WebDAV / Client Integration - Microsoft SharePoint. <https://learn.microsoft.com/en-us/sharepoint/troubleshoot/administration/how-to-disable-webdav-use>
