/**
 * Sharehorse - SharePoint Fingerprint Tool
 * https://github.com/zer0lightning/sharehorse
 *
 * Passive, read-only fingerprinting of a SharePoint site: product edition,
 * build number, and CU/PU, plus an extended fingerprint. Usage, build-database
 * notes, hardening, detection, and references are in the repo.
 */

(async function () {

  const STYLE = {
    banner:   "color:#7dd3fc;font-weight:bold;font-size:14px;letter-spacing:0.5px;",
    subtitle: "color:#64748b;font-size:11px;font-style:italic;",
    section:  "color:#7dd3fc;font-weight:bold;font-size:12px;",
    ok:       "color:#4ade80;font-weight:bold;",
    warn:     "color:#facc15;font-weight:bold;",
    err:      "color:#f87171;font-weight:bold;",
    dim:      "color:#64748b;",
    label:    "color:#38bdf8;font-weight:bold;",
    value:    "color:#e2e8f0;font-weight:normal;",
    mono:     "font-family:Menlo,Consolas,monospace;color:#e2e8f0;",
    monoDim:  "font-family:Menlo,Consolas,monospace;color:#64748b;",
    monoAcc:  "font-family:Menlo,Consolas,monospace;color:#7dd3fc;font-weight:bold;",
    high:     "color:#4ade80;font-weight:bold;font-size:13px;",
    medium:   "color:#facc15;font-weight:bold;font-size:13px;",
    low:      "color:#f87171;font-weight:bold;font-size:13px;",
    pillBase: "padding:2px 10px;border-radius:10px;font-weight:bold;font-size:11px;",
  };

  function pill(text, bg, fg = "#0b1220") {
    console.log(`%c ${text} `, `${STYLE.pillBase}background:${bg};color:${fg};`);
  }

  const PILL_COLOR = { high: "#4ade80", medium: "#facc15", low: "#f87171" };

  const BUILD_DATABASE = {

    "SharePoint Server 2013": [
      { build: "15.0.4420.1017", label: "RTM", date: "2012-10-16", kb: null },
      { build: "15.0.5407.1000", label: "December 2021 CU", date: "2021-12", kb: "5002070" },
      { build: "15.0.5415.1000", label: "January 2022 CU", date: "2022-01", kb: "5002126" },
      { build: "15.0.5423.1000", label: "February 2022 CU", date: "2022-02", kb: "5002154" },
      { build: "15.0.5431.1000", label: "March 2022 CU", date: "2022-03", kb: "5002172" },
      { build: "15.0.5441.1000", label: "April 2022 CU", date: "2022-04", kb: "5002188" },
      { build: "15.0.5449.1000", label: "May 2022 CU", date: "2022-05", kb: "5002202" },
      { build: "15.0.5459.1001", label: "June 2022 CU", date: "2022-06", kb: "5002218" },
      { build: "15.0.5475.1000", label: "August 2022 CU", date: "2022-08", kb: "5002240" },
      { build: "15.0.5485.1000", label: "September 2022 CU", date: "2022-09", kb: "5002264" },
      { build: "15.0.5493.1000", label: "October 2022 CU", date: "2022-10", kb: "5002283" },
      { build: "15.0.5501.1000", label: "November 2022 CU", date: "2022-11", kb: "5002302" },
      { build: "15.0.5511.1000", label: "December 2022 CU", date: "2022-12", kb: "5002317" },
      { build: "15.0.5519.1000", label: "January 2023 CU", date: "2023-01", kb: "5002335" },
      { build: "15.0.5529.1000", label: "February 2023 CU", date: "2023-02", kb: "5002346" },
      { build: "15.0.5537.1000", label: "March 2023 CU", date: "2023-03", kb: "5002366" },
      { build: "15.0.5545.1000", label: "April 2023 CU (final / end of support)", date: "2023-04", kb: "5002379" },
      { build: "15.0.4481.1005", label: "March 2013 CU", date: "2013-03", kb: "2768000" },
      { build: "15.0.4505.1002", label: "April 2013 CU", date: "2013-04", kb: "2751999" },
      { build: "15.0.4517.1003", label: "June 2013 CU", date: "2013-06", kb: "2817346" },
      { build: "15.0.4535.1000", label: "August 2013 CU", date: "2013-08", kb: "2817517" },
      { build: "15.0.4551.1001", label: "October 2013 CU", date: "2013-10", kb: "2825674" },
      { build: "15.0.4551.1508", label: "December 2013 CU", date: "2013-12", kb: "2849961" },
      { build: "15.0.4571.1502", label: "April 2014 CU", date: "2014-04", kb: "2880551" },
      { build: "15.0.4605.1004", label: "May 2014 CU", date: "2014-05", kb: "2863892" },
      { build: "15.0.4623.1001", label: "June 2014 CU", date: "2014-06", kb: "2881063" },
      { build: "15.0.4631.1001", label: "July 2014 CU", date: "2014-07", kb: "2882999" },
      { build: "15.0.4649.1001", label: "September 2014 CU", date: "2014-09", kb: "2883087" },
      { build: "15.0.4667.1000", label: "November 2014 CU", date: "2014-11", kb: "2899468" },
      { build: "15.0.4675.1000", label: "December 2014 CU", date: "2014-12", kb: "2910945" },
      { build: "15.0.4693.1001", label: "February 2015 CU", date: "2015-02", kb: "2920801" },
      { build: "15.0.4701.1001", label: "March 2015 CU", date: "2015-03", kb: "2956159" },
      { build: "15.0.4711.1000", label: "April 2015 CU", date: "2015-04", kb: "2965261" },
      { build: "15.0.4719.1002", label: "May 2015 CU", date: "2015-05", kb: "3039747" },
      { build: "15.0.4727.1001", label: "June 2015 CU", date: "2015-06", kb: "3054864" },
      { build: "15.0.4737.1000", label: "July 2015 CU", date: "2015-07", kb: "3054931" },
      { build: "15.0.4745.1000", label: "August 2015 CU", date: "2015-08", kb: "3055004" },
      { build: "15.0.4753.1003", label: "September 2015 CU", date: "2015-09", kb: "2975894" },
      { build: "15.0.4763.1000", label: "October 2015 CU", date: "2015-10", kb: "3085488" },
      { build: "15.0.4771.1000", label: "November 2015 CU", date: "2015-11", kb: "3101368" },
      { build: "15.0.4779.1000", label: "December 2015 CU", date: "2015-12", kb: "3114339" },
      { build: "15.0.4787.1000", label: "January 2016 CU", date: "2016-01", kb: "3114492" },
      { build: "15.0.4797.1001", label: "February 2016 CU", date: "2016-02", kb: "3114722" },
      { build: "15.0.4805.1000", label: "March 2016 CU", date: "2016-03", kb: "3114822" },
      { build: "15.0.4815.1000", label: "April 2016 CU", date: "2016-04", kb: "3114935" },
      { build: "15.0.4823.1003", label: "May 2016 CU", date: "2016-05", kb: "3115023" },
      { build: "15.0.4833.1000", label: "June 2016 CU", date: "2016-06", kb: "3115171" },
      { build: "15.0.4841.1000", label: "July 2016 CU", date: "2016-07", kb: "3115290" },
      { build: "15.0.4849.1000", label: "August 2016 CU", date: "2016-08", kb: "3115447" },
      { build: "15.0.4859.1000", label: "September 2016 CU", date: "2016-09", kb: "3118271" },
      { build: "15.0.4867.1002", label: "October 2016 CU", date: "2016-10", kb: "3118361" },
      { build: "15.0.4875.1000", label: "November 2016 CU", date: "2016-11", kb: "3127930" },
      { build: "15.0.4885.1000", label: "December 2016 CU", date: "2016-12", kb: "3128001" },
      { build: "15.0.4893.1001", label: "January 2017 CU", date: "2017-01", kb: "3141479" },
      { build: "15.0.4911.1001", label: "March 2017 CU", date: "2017-03", kb: "3172456" },
      { build: "15.0.4919.1003", label: "April 2017 CU", date: "2017-04", kb: "3178727" },
      { build: "15.0.4927.1001", label: "May 2017 CU", date: "2017-05", kb: "3191911" },
      { build: "15.0.4937.1000", label: "June 2017 CU", date: "2017-06", kb: "3203428" },
      { build: "15.0.4945.1000", label: "July 2017 CU", date: "2017-07", kb: "3213563" },
      { build: "15.0.4953.1000", label: "August 2017 CU", date: "2017-08", kb: "4011073" },
      { build: "15.0.4963.1001", label: "September 2017 CU", date: "2017-09", kb: "4011132" },
      { build: "15.0.4971.1001", label: "October 2017 CU", date: "2017-10", kb: "4011173" },
      { build: "15.0.4981.1002", label: "November 2017 CU", date: "2017-11", kb: "4011248" },
      { build: "15.0.4989.1001", label: "December 2017 CU", date: "2017-12", kb: "4011588" },
      { build: "15.0.4997.1000", label: "January 2018 CU", date: "2018-01", kb: "4011649" },
      { build: "15.0.5007.1000", label: "February 2018 CU", date: "2018-02", kb: "4011693" },
      { build: "15.0.5015.1002", label: "March 2018 CU", date: "2018-03", kb: "4018299" },
      { build: "15.0.5023.1000", label: "April 2018 CU", date: "2018-04", kb: "4018345" },
      { build: "15.0.5031.1000", label: "May 2018 CU", date: "2018-05", kb: "4018394" },
      { build: "15.0.5041.1000", label: "June 2018 CU", date: "2018-06", kb: "4022184" },
      { build: "15.0.5049.1001", label: "July 2018 CU", date: "2018-07", kb: "4022239" },
      { build: "15.0.5059.1000", label: "August 2018 CU", date: "2018-08", kb: "4032244" },
      { build: "15.0.5067.1000", label: "September 2018 CU", date: "2018-09", kb: "4092474" },
      { build: "15.0.5075.1000", label: "October 2018 CU", date: "2018-10", kb: "4461455" },
      { build: "15.0.5085.1000", label: "November 2018 CU", date: "2018-11", kb: "4461508" },
      { build: "15.0.5093.1000", label: "December 2018 CU", date: "2018-12", kb: "4461552" },
      { build: "15.0.5101.1000", label: "January 2019 CU", date: "2019-01", kb: "4461603" },
      { build: "15.0.5111.1001", label: "February 2019 CU", date: "2019-02", kb: "4462150" },
      { build: "15.0.5119.1001", label: "March 2019 CU", date: "2019-03", kb: "4462217" },
      { build: "15.0.5127.1000", label: "April 2019 CU", date: "2019-04", kb: "4464512" },
      { build: "15.0.5137.1000", label: "May 2019 CU", date: "2019-05", kb: "4464560" },
      { build: "15.0.5145.1000", label: "June 2019 CU", date: "2019-06", kb: "4464598" },
      { build: "15.0.5153.1000", label: "July 2019 CU", date: "2019-07", kb: "4475523" },
      { build: "15.0.5163.1000", label: "August 2019 CU", date: "2019-08", kb: "4475559" },
      { build: "15.0.5172.1000", label: "September 2019 CU", date: "2019-09", kb: "4475610" },
      { build: "15.0.5179.1000", label: "October 2019 CU", date: "2019-10", kb: "4484118" },
      { build: "15.0.5189.1000", label: "November 2019 CU", date: "2019-11", kb: "4484153" },
      { build: "15.0.5197.1000", label: "December 2019 CU", date: "2019-12", kb: "4484185" },
      { build: "15.0.5207.1000", label: "January 2020 CU", date: "2020-01", kb: "4484228" },
      { build: "15.0.5215.1000", label: "February 2020 CU", date: "2020-02", kb: "4484261" },
      { build: "15.0.5223.1000", label: "March 2020 CU", date: "2020-03", kb: "4484278" },
      { build: "15.0.5233.1000", label: "April 2020 CU", date: "2020-04", kb: "4484309" },
      { build: "15.0.5241.1000", label: "May 2020 CU", date: "2020-05", kb: "4484358" },
      { build: "15.0.5249.1001", label: "June 2020 CU", date: "2020-06", kb: "4484406" },
      { build: "15.0.5259.1001", label: "July 2020 CU", date: "2020-07", kb: "4484444" },
      { build: "15.0.5267.1000", label: "August 2020 CU", date: "2020-08", kb: "4484482" },
      { build: "15.0.5275.1001", label: "September 2020 CU", date: "2020-09", kb: "4484519" },
      { build: "15.0.5285.1000", label: "October 2020 CU", date: "2020-10", kb: "4486690" },
      { build: "15.0.5293.1000", label: "November 2020 CU", date: "2020-11", kb: "4486728" },
      { build: "15.0.5301.1000", label: "December 2020 CU", date: "2020-12", kb: "4486761" },
      { build: "15.0.5311.1000", label: "January 2021 CU", date: "2021-01", kb: "4493172" },
      { build: "15.0.5319.1000", label: "February 2021 CU", date: "2021-02", kb: "4493205" },
      { build: "15.0.5327.1001", label: "March 2021 CU", date: "2021-03", kb: "4493235" },
      { build: "15.0.5337.1000", label: "April 2021 CU", date: "2021-04", kb: "4504730" },
      { build: "15.0.5345.1000", label: "May 2021 CU", date: "2021-05", kb: "5001929" },
      { build: "15.0.5353.1000", label: "June 2021 CU", date: "2021-06", kb: "5001957" },
      { build: "15.0.5363.1000", label: "July 2021 CU", date: "2021-07", kb: "5001987" },
      { build: "15.0.5371.1000", label: "August 2021 CU", date: "2021-08", kb: "5002010" },
      { build: "15.0.5381.1000", label: "September 2021 CU", date: "2021-09", kb: "5002021" },
      { build: "15.0.5389.1000", label: "October 2021 CU", date: "2021-10", kb: "5002037" },
      { build: "15.0.4505.100215", label: "April 2013 CU", date: "2013-04", kb: "2751999" },
      { build: "15.0.4517.100315", label: "June 2013 CU", date: "2013-06", kb: "2817346" },
      { build: "15.0.4551.100115", label: "October 2013 CU", date: "2013-10", kb: "2825674" },
      { build: "15.0.4551.150815", label: "December 2013 CU", date: "2013-12", kb: "2849961" },
      { build: "15.0.4971.100115", label: "October 2017 CU", date: "2017-10", kb: "4011173" },
      { build: "15.0.5101.100015", label: "January 2019 CU", date: "2019-01", kb: "4461603" },
    ],

    "SharePoint Server 2016": [
      { build: "16.0.4366.1000", label: "April 2016 CU", date: "2016-04", kb: "2920721" },
      { build: "16.0.4378.1000", label: "May 2016 CU", date: "2016-05", kb: "2920690" },
      { build: "16.0.4393.1000", label: "June 2016 CU", date: "2016-06", kb: "3115184" },
      { build: "16.0.4405.1001", label: "July 2016 CU", date: "2016-07", kb: "3115304" },
      { build: "16.0.4417.1002", label: "August 2016 CU", date: "2016-08", kb: "3115441" },
      { build: "16.0.4432.1003", label: "September 2016 CU", date: "2016-09", kb: "3118295" },
      { build: "16.0.4444.1004", label: "October 2016 CU", date: "2016-10", kb: "3118376" },
      { build: "16.0.4456.1002", label: "November 2016 CU", date: "2016-11", kb: "3127942" },
      { build: "16.0.4471.1000", label: "December 2016 CU", date: "2016-12", kb: "3128017" },
      { build: "16.0.4483.1001", label: "January 2017 CU", date: "2017-01", kb: "3141487" },
      { build: "16.0.4498.1002", label: "February 2017 CU", date: "2017-02", kb: "3141517" },
      { build: "16.0.4510.1001", label: "March 2017 CU", date: "2017-03", kb: "3178675" },
      { build: "16.0.4522.1000", label: "April 2017 CU", date: "2017-04", kb: "3178721" },
      { build: "16.0.4534.1000", label: "May 2017 CU", date: "2017-05", kb: "3191884" },
      { build: "16.0.4549.1001", label: "June 2017 CU", date: "2017-06", kb: "3203433" },
      { build: "16.0.4561.1000", label: "July 2017 CU", date: "2017-07", kb: "3213543" },
      { build: "16.0.4573.1002", label: "August 2017 CU", date: "2017-08", kb: "4011053" },
      { build: "16.0.4588.1001", label: "September 2017 CU", date: "2017-09", kb: "4011112" },
      { build: "16.0.4600.1002", label: "October 2017 CU", date: "2017-10", kb: "4011161" },
      { build: "16.0.4615.1000", label: "November 2017 CU", date: "2017-11", kb: "4011243" },
      { build: "16.0.4627.1000", label: "December 2017 CU", date: "2017-12", kb: "4011578" },
      { build: "16.0.4639.1002", label: "January 2018 CU", date: "2018-01", kb: "4011645" },
      { build: "16.0.4654.1000", label: "February 2018 CU", date: "2018-02", kb: "4011680" },
      { build: "16.0.4666.1002", label: "March 2018 CU", date: "2018-03", kb: "4011687" },
      { build: "16.0.4678.1001", label: "April 2018 CU", date: "2018-04", kb: "4018340" },
      { build: "16.0.4690.1000", label: "May 2018 CU", date: "2018-05", kb: "4018386" },
      { build: "16.0.4705.1000", label: "June 2018 CU", date: "2018-06", kb: "4022178" },
      { build: "16.0.4717.1000", label: "July 2018 CU", date: "2018-07", kb: "4022228" },
      { build: "16.0.4732.1001", label: "August 2018 CU", date: "2018-08", kb: "4022231" },
      { build: "16.0.4744.1000", label: "September 2018 CU", date: "2018-09", kb: "4092459" },
      { build: "16.0.4756.1000", label: "October 2018 CU", date: "2018-10", kb: "4092463" },
      { build: "16.0.4771.1000", label: "November 2018 CU", date: "2018-11", kb: "4461501" },
      { build: "16.0.4783.1000", label: "December 2018 CU", date: "2018-12", kb: "4461541" },
      { build: "16.0.4795.1001", label: "January 2019 CU", date: "2019-01", kb: "4461598" },
      { build: "16.0.4810.1000", label: "February 2019 CU", date: "2019-02", kb: "4462155" },
      { build: "16.0.4822.1001", label: "March 2019 CU", date: "2019-03", kb: "4462211" },
      { build: "16.0.4834.1000", label: "April 2019 CU", date: "2019-04", kb: "4461507" },
      { build: "16.0.4849.1000", label: "May 2019 CU", date: "2019-05", kb: "4464549" },
      { build: "16.0.4861.1000", label: "June 2019 CU", date: "2019-06", kb: "4464594" },
      { build: "16.0.4873.1000", label: "July 2019 CU", date: "2019-07", kb: "4475520" },
      { build: "16.0.4888.1000", label: "August 2019 CU", date: "2019-08", kb: "4464553" },
      { build: "16.0.4900.1000", label: "September 2019 CU", date: "2019-09", kb: "4475594" },
      { build: "16.0.4912.1000", label: "October 2019 CU", date: "2019-10", kb: "4484115" },
      { build: "16.0.4927.1000", label: "November 2019 CU", date: "2019-11", kb: "4484147" },
      { build: "16.0.4939.1000", label: "December 2019 CU", date: "2019-12", kb: "4484181" },
      { build: "16.0.4954.1000", label: "January 2020 CU", date: "2020-01", kb: "4484220" },
      { build: "16.0.4966.1000", label: "February 2020 CU", date: "2020-02", kb: "4484257" },
      { build: "16.0.4978.1000", label: "March 2020 CU", date: "2020-03", kb: "4484275" },
      { build: "16.0.4993.1000", label: "April 2020 CU", date: "2020-04", kb: "4484301" },
      { build: "16.0.5005.1000", label: "May 2020 CU", date: "2020-05", kb: "4484336" },
      { build: "16.0.5017.1001", label: "June 2020 CU", date: "2020-06", kb: "4484344" },
      { build: "16.0.5032.1002", label: "July 2020 CU", date: "2020-07", kb: "4484440" },
      { build: "16.0.5044.1000", label: "August 2020 CU", date: "2020-08", kb: "4484476" },
      { build: "16.0.5056.1000", label: "September 2020 CU", date: "2020-09", kb: "4484512" },
      { build: "16.0.5071.1000", label: "October 2020 CU", date: "2020-10", kb: "4486681" },
      { build: "16.0.5083.1000", label: "November 2020 CU", date: "2020-11", kb: "4486717" },
      { build: "16.0.5095.1000", label: "December 2020 CU", date: "2020-12", kb: "4486721" },
      { build: "16.0.5110.1000", label: "January 2021 CU", date: "2021-01", kb: "4493167" },
      { build: "16.0.5122.1000", label: "February 2021 CU", date: "2021-02", kb: "4493195" },
      { build: "16.0.5134.1001", label: "March 2021 CU", date: "2021-03", kb: "4493199" },
      { build: "16.0.5149.1000", label: "April 2021 CU", date: "2021-04", kb: "4504723" },
      { build: "16.0.5161.1000", label: "May 2021 CU", date: "2021-05", kb: "5001917" },
      { build: "16.0.5173.1000", label: "June 2021 CU", date: "2021-06", kb: "5001922" },
      { build: "16.0.5188.1000", label: "July 2021 CU", date: "2021-07", kb: "5001981" },
      { build: "16.0.5200.1000", label: "August 2021 CU", date: "2021-08", kb: "5002002" },
      { build: "16.0.5215.1000", label: "September 2021 CU", date: "2021-09", kb: "5002020" },
      { build: "16.0.5227.1000", label: "October 2021 CU", date: "2021-10", kb: "5002006" },
      { build: "16.0.5254.1000", label: "December 2021 CU", date: "2021-12", kb: "5002059" },
      { build: "16.0.5266.1000", label: "January 2022 CU", date: "2022-01", kb: "5002118" },
      { build: "16.0.5278.1000", label: "February 2022 CU", date: "2022-02", kb: "5002136" },
      { build: "16.0.5290.1000", label: "March 2022 CU", date: "2022-03", kb: "5002176" },
      { build: "16.0.5305.1000", label: "April 2022 CU", date: "2022-04", kb: "5002183" },
      { build: "16.0.5317.1000", label: "May 2022 CU", date: "2022-05", kb: "5002195" },
      { build: "16.0.5332.1001", label: "June 2022 CU", date: "2022-06", kb: "5002222" },
      { build: "16.0.5344.1000", label: "July 2022 CU", date: "2022-07", kb: "5002231" },
      { build: "16.0.5356.1000", label: "August 2022 CU", date: "2022-08", kb: "5002249" },
      { build: "16.0.5361.1000", label: "September 2022 CU", date: "2022-09", kb: "5002142" },
      { build: "16.0.5365.1000", label: "October 2022 CU", date: "2022-10", kb: "5002287" },
      { build: "16.0.5369.1000", label: "November 2022 CU", date: "2022-11", kb: "5002289" },
      { build: "16.0.5374.1000", label: "December 2022 CU", date: "2022-12", kb: "5002321" },
      { build: "16.0.5378.1000", label: "January 2023 CU", date: "2023-01", kb: "5002338" },
      { build: "16.0.5383.1000", label: "February 2023 CU", date: "2023-02", kb: "5002325" },
      { build: "16.0.5387.1000", label: "March 2023 CU", date: "2023-03", kb: "5002368" },
      { build: "16.0.5391.1000", label: "April 2023 CU", date: "2023-04", kb: "5002370" },
      { build: "16.0.5395.1000", label: "May 2023 CU", date: "2023-05", kb: "5002397" },
      { build: "16.0.5400.1001", label: "June 2023 CU", date: "2023-06", kb: "5002404" },
      { build: "16.0.5404.1000", label: "July 2023 CU", date: "2023-07", kb: "5002425" },
      { build: "16.0.5408.1000", label: "August 2023 CU", date: "2023-08", kb: "5002398" },
      { build: "16.0.5413.1000", label: "September 2023 CU", date: "2023-09", kb: "5002501" },
      { build: "16.0.5422.1000", label: "November 2023 CU", date: "2023-11", kb: "5002517" },
      { build: "16.0.5430.1000", label: "January 2024 CU", date: "2024-01", kb: "5002541" },
      { build: "16.0.5439.1000", label: "March 2024 CU", date: "2024-03", kb: "5002559" },
      { build: "16.0.5443.1000", label: "April 2024 CU", date: "2024-04", kb: "5002583" },
      { build: "16.0.5448.1000", label: "May 2024 CU", date: "2024-05", kb: "5002598" },
      { build: "16.0.5452.1000", label: "June 2024 CU", date: "2024-06", kb: "5002604" },
      { build: "16.0.5456.1000", label: "July 2024 CU", date: "2024-07", kb: "5002618" },
      { build: "16.0.5465.1001", label: "September 2024 CU", date: "2024-09", kb: "5002624" },
      { build: "16.0.5469.1000", label: "October 2024 CU", date: "2024-10", kb: "5002645" },
      { build: "16.0.5474.1001", label: "November 2024 CU", date: "2024-11", kb: "5002654" },
      { build: "16.0.5478.1000", label: "December 2024 CU", date: "2024-12", kb: "5002544" },
      { build: "16.0.5483.1001", label: "January 2025 CU", date: "2025-01", kb: "5002671" },
      { build: "16.0.5487.1000", label: "February 2025 CU", date: "2025-02", kb: "5002685" },
      { build: "16.0.5495.1002", label: "April 2025 CU", date: "2025-04", kb: "5002682" },
      { build: "16.0.5500.1001", label: "May 2025 CU", date: "2025-05", kb: "5002712" },
      { build: "16.0.5504.1001", label: "June 2025 CU", date: "2025-06", kb: "5002731" },
      { build: "16.0.5508.1000", label: "July 2025 CU", date: "2025-07-08", kb: "5002743" },
      { build: "16.0.5513.1001", label: "July 2025 CU", date: "2025-07-21", kb: "5002759" },
      { build: "16.0.5513.1002", label: "August 2025 CU", date: "2025-08-12", kb: "5002772" },
      { build: "16.0.5517.1000", label: "September 2025 CU", date: "2025-09-09", kb: "5002777" },
      { build: "16.0.5522.1000", label: "October 2025 CU", date: "2025-10-14", kb: "5002787" },
      { build: "16.0.5526.1001", label: "November 2025 CU", date: "2025-11-11", kb: "5002805" },
      { build: "16.0.5530.1000", label: "December 2025 CU", date: "2025-12-09", kb: "5002804" },
      { build: "16.0.5535.1001", label: "January 2026 CU", date: "2026-01-13", kb: "5002827" },
      { build: "16.0.5539.1002", label: "February 2026 CU", date: "2026-02-10", kb: "5002840" },
      { build: "16.0.5543.1000", label: "March 2026 CU", date: "2026-03-10", kb: "5002851" },
      { build: "16.0.5548.1003", label: "April 2026 CU", date: "2026-04-14", kb: "5002862" },
      { build: "16.0.5552.1002", label: "May 2026 CU", date: "2026-05-12", kb: "5002869" },
      { build: "16.0.5556.1005", label: "June 2026 CU (final / end of support 2026-07-14)", date: "2026-06-09", kb: "5002881" },
      { build: "16.0.5565.1001", label: "August 2026 CU (Post EOL 2026-07-14)", date: "2026-08-11", kb: "5002905" },
      { build: "16.0.4732.1000", label: "August 2018 CU", date: "2018-08", kb: "4032256" },
      { build: "16.0.5056.1001", label: "September 2020 CU", date: "2020-09", kb: "4484506" },
      { build: "16.0.5361.1002", label: "September 2022 CU", date: "2022-09", kb: "5002269" },
      { build: "16.0.5413.1001", label: "September 2023 CU", date: "2023-09", kb: "5002494" },
      { build: "16.0.5426.1001", label: "December 2023 CU", date: "2023-12", kb: "5002535" },
      { build: "16.0.5561.1001", label: "July 2026 CU", date: "2026-07-14", kb: "5002891" },
    ],

    "SharePoint Server 2019": [
      { build: "16.0.10337.12109", label: "RTM (build shared with SE RTM — see ambiguity note)", date: "2018-10-22", kb: null },
      { build: "16.0.10338.12107", label: "November 2018 CU", date: "2018-11", kb: "4461513" },
      { build: "16.0.10339.12102", label: "December 2018 CU", date: "2018-12", kb: "4461548" },
      { build: "16.0.10340.20015", label: "January 2019 CU", date: "2019-01", kb: "4461514" },
      { build: "16.0.10341.20000", label: "February 2019 CU", date: "2019-02", kb: "4462170" },
      { build: "16.0.10342.12113", label: "March 2019 CU", date: "2019-03", kb: "4462199" },
      { build: "16.0.10343.20000", label: "April 2019 CU", date: "2019-04", kb: "4462221" },
      { build: "16.0.10345.12101", label: "May 2019 CU", date: "2019-05", kb: "4464556" },
      { build: "16.0.10346.20001", label: "June 2019 CU", date: "2019-06", kb: "4475512" },
      { build: "16.0.10348.12104", label: "July 2019 CU", date: "2019-07", kb: "4475529" },
      { build: "16.0.10349.20000", label: "August 2019 CU", date: "2019-08", kb: "4475555" },
      { build: "16.0.10350.20000", label: "September 2019 CU", date: "2019-09", kb: "4464557" },
      { build: "16.0.10351.20000", label: "October 2019 CU", date: "2019-10", kb: "4484109" },
      { build: "16.0.10352.20000", label: "November 2019 CU", date: "2019-11", kb: "4484149" },
      { build: "16.0.10353.20001", label: "December 2019 CU", date: "2019-12", kb: "4484176" },
      { build: "16.0.10354.20001", label: "January 2020 CU", date: "2020-01", kb: "4484224" },
      { build: "16.0.10355.20000", label: "February 2020 CU", date: "2020-02", kb: "4484225" },
      { build: "16.0.10357.20002", label: "March 2020 CU", date: "2020-03", kb: "4484271" },
      { build: "16.0.10358.20000", label: "April 2020 CU", date: "2020-04", kb: "4484291" },
      { build: "16.0.10359.20000", label: "May 2020 CU", date: "2020-05", kb: "4484331" },
      { build: "16.0.10361.12114", label: "June 2020 CU", date: "2020-06", kb: "4484404" },
      { build: "16.0.10363.12107", label: "July 2020 CU", date: "2020-07", kb: "4484452" },
      { build: "16.0.10364.20001", label: "August 2020 CU", date: "2020-08", kb: "4484471" },
      { build: "16.0.10366.12106", label: "September 2020 CU", date: "2020-09", kb: "4484504" },
      { build: "16.0.10367.20000", label: "October 2020 CU", date: "2020-10", kb: "4486675" },
      { build: "16.0.10368.20022", label: "November 2020 CU", date: "2020-11", kb: "4486715" },
      { build: "16.0.10369.20000", label: "December 2020 CU", date: "2020-12", kb: "4486752" },
      { build: "16.0.10370.20001", label: "January 2021 CU", date: "2021-01", kb: "4493161" },
      { build: "16.0.10371.20043", label: "February 2021 CU", date: "2021-02", kb: "4493193" },
      { build: "16.0.10372.20060", label: "March 2021 CU", date: "2021-03", kb: "4493231" },
      { build: "16.0.10373.20000", label: "April 2021 CU", date: "2021-04", kb: "4504715" },
      { build: "16.0.10374.20000", label: "May 2021 CU", date: "2021-05", kb: "5001915" },
      { build: "16.0.10375.20000", label: "June 2021 CU", date: "2021-06", kb: "5001945" },
      { build: "16.0.10376.20001", label: "July 2021 CU", date: "2021-07", kb: "5001974" },
      { build: "16.0.10377.20001", label: "August 2021 CU", date: "2021-08", kb: "5002001" },
      { build: "16.0.10378.20002", label: "September 2021 CU", date: "2021-09", kb: "5002019" },
      { build: "16.0.10379.20000", label: "October 2021 CU", date: "2021-10", kb: "5002034" },
      { build: "16.0.10381.20001", label: "December 2021 CU", date: "2021-12", kb: "5002061" },
      { build: "16.0.10382.20004", label: "January 2022 CU", date: "2022-01", kb: "5002108" },
      { build: "16.0.10383.20001", label: "February 2022 CU", date: "2022-02", kb: "5002134" },
      { build: "16.0.10384.20000", label: "March 2022 CU", date: "2022-03", kb: "5002163" },
      { build: "16.0.10385.20001", label: "April 2022 CU", date: "2022-04", kb: "5002164" },
      { build: "16.0.10386.20015", label: "May 2022 CU", date: "2022-05", kb: "5002206" },
      { build: "16.0.10387.20008", label: "June 2022 CU", date: "2022-06", kb: "5002211" },
      { build: "16.0.10388.20004", label: "July 2022 CU", date: "2022-07", kb: "5002230" },
      { build: "16.0.10389.20000", label: "August 2022 CU", date: "2022-08", kb: "5002245" },
      { build: "16.0.10390.20000", label: "September 2022 CU", date: "2022-09", kb: "5002257" },
      { build: "16.0.10391.20000", label: "October 2022 CU", date: "2022-10", kb: "5002277" },
      { build: "16.0.10392.20000", label: "November 2022 CU", date: "2022-11", kb: "5002295" },
      { build: "16.0.10394.20016", label: "December 2022 CU", date: "2022-12", kb: "5002310" },
      { build: "16.0.10394.20021", label: "January 2023 CU", date: "2023-01", kb: "5002329" },
      { build: "16.0.10395.20001", label: "February 2023 CU", date: "2023-02", kb: "5002330" },
      { build: "16.0.10396.20000", label: "March 2023 CU", date: "2023-03", kb: "5002357" },
      { build: "16.0.10397.20002", label: "April 2023 CU", date: "2023-04", kb: "5002373" },
      { build: "16.0.10398.20000", label: "May 2023 CU", date: "2023-05", kb: "5002374" },
      { build: "16.0.10399.20005", label: "June 2023 CU", date: "2023-06", kb: "5002403" },
      { build: "16.0.10400.20008", label: "July 2023 CU", date: "2023-07", kb: "5002423" },
      { build: "16.0.10401.20025", label: "August 2023 CU", date: "2023-08", kb: "5002422" },
      { build: "16.0.10402.20016", label: "September 2023 CU", date: "2023-09", kb: "5002471" },
      { build: "16.0.10403.20000", label: "October 2023 CU", date: "2023-10", kb: "5002504" },
      { build: "16.0.10404.20003", label: "November 2023 CU", date: "2023-11", kb: "5002505" },
      { build: "16.0.10405.20000", label: "December 2023 CU", date: "2023-12", kb: "5002532" },
      { build: "16.0.10406.20000", label: "January 2024 CU", date: "2024-01", kb: "5002539" },
      { build: "16.0.10407.20000", label: "February 2024 CU", date: "2024-02", kb: "5002558" },
      { build: "16.0.10408.20027", label: "March 2024 CU", date: "2024-03", kb: "5002562" },
      { build: "16.0.10409.20027", label: "April 2024 CU", date: "2024-04", kb: "5002538" },
      { build: "16.0.10410.20003", label: "May 2024 CU", date: "2024-05", kb: "5002596" },
      { build: "16.0.10411.20004", label: "June 2024 CU", date: "2024-06", kb: "5002602" },
      { build: "16.0.10412.20001", label: "July 2024 CU", date: "2024-07", kb: "5002615" },
      { build: "16.0.10413.20000", label: "August 2024 CU", date: "2024-08", kb: "5002597" },
      { build: "16.0.10414.20002", label: "September 2024 CU", date: "2024-09", kb: "5002639" },
      { build: "16.0.10415.20001", label: "October 2024 CU", date: "2024-10", kb: "5002647" },
      { build: "16.0.10416.20000", label: "November 2024 CU", date: "2024-11", kb: "5002650" },
      { build: "16.0.10416.20026", label: "December 2024 CU", date: "2024-12", kb: "5002664" },
      { build: "16.0.10416.20041", label: "January 2025 CU", date: "2025-01", kb: "5002667" },
      { build: "16.0.10416.20050", label: "February 2025 CU", date: "2025-02", kb: "5002678" },
      { build: "16.0.10417.20003", label: "April 2025 CU", date: "2025-04", kb: "5002680" },
      { build: "16.0.10417.20010", label: "May 2025 CU", date: "2025-05", kb: "5002706" },
      { build: "16.0.10417.20018", label: "June 2025 CU", date: "2025-06", kb: "5002727" },
      { build: "16.0.10417.20027", label: "July 2025 CU", date: "2025-07-08", kb: "5002739" },
      { build: "16.0.10417.20037", label: "July 2025 CU", date: "2025-07-21", kb: "5002753" },
      { build: "16.0.10417.20041", label: "August 2025 CU", date: "2025-08-12", kb: "5002770" },
      { build: "16.0.10417.20047", label: "September 2025 CU", date: "2025-09-09", kb: "5002774" },
      { build: "16.0.10417.20059", label: "October 2025 CU", date: "2025-10-14", kb: "5002798" },
      { build: "16.0.10417.20068", label: "November 2025 CU", date: "2025-11-11", kb: "5002803" },
      { build: "16.0.10417.20075", label: "December 2025 CU", date: "2025-12-09", kb: "5002802" },
      { build: "16.0.10417.20083", label: "January 2026 CU", date: "2026-01-13", kb: "5002823" },
      { build: "16.0.10417.20097", label: "February 2026 CU", date: "2026-02-10", kb: "5002836" },
      { build: "16.0.10417.20102", label: "March 2026 CU", date: "2026-03-10", kb: "5002847" },
      { build: "16.0.10417.20114", label: "April 2026 CU", date: "2026-04-14", kb: "5002856" },
      { build: "16.0.10417.20128", label: "May 2026 CU", date: "2026-05-12", kb: "5002872" },
      { build: "16.0.10417.20153", label: "June 2026 CU (final / end of support 2026-07-14)", date: "2026-06-09", kb: "5002876" },
      { build: "16.0.10417.20198", label: "August 2026 CU (Post EOL 2026-07-14)", date: "2026-08-11", kb: "5002894" },
      { build: "16.0.10340.12101", label: "January 2019 CU", date: "2019-01", kb: "4461634" },
      { build: "16.0.10386.20011", label: "May 2022 CU", date: "2022-05", kb: "5002207" },
      { build: "16.0.10417.20175", label: "July 2026 CU", date: "2026-07-14", kb: "5002883" },
      { build: "16.0.10340.1210116", label: "January 2019 CU", date: "2019-01", kb: "4461634" },
      { build: "16.0.10386.2001116", label: "May 2022 CU", date: "2022-05", kb: "5002207" },
    ],

    "SharePoint Server Subscription Edition": [
      { build: "16.0.10337.12109", label: "RTM (build shared with 2019 RTM — see ambiguity note)", date: "2021-11-02", kb: null },
      { build: "16.0.14326.20620", label: "December 2021 CU", date: "2021-12", kb: "5002045" },
      { build: "16.0.14326.20714", label: "January 2022 CU", date: "2022-01", kb: "5002111" },
      { build: "16.0.14326.20742", label: "February 2022 CU", date: "2022-02", kb: "5002145" },
      { build: "16.0.14326.20796", label: "March 2022 CU", date: "2022-03", kb: "5002165" },
      { build: "16.0.14931.20196", label: "April 2022 CU", date: "2022-04", kb: "5002191" },
      { build: "16.0.14931.20286", label: "May 2022 CU", date: "2022-05", kb: "5002194" },
      { build: "16.0.14931.20418", label: "June 2022 CU", date: "2022-06", kb: "5002224" },
      { build: "16.0.14931.20502", label: "July 2022 CU", date: "2022-07", kb: "5002234" },
      { build: "16.0.14931.20612", label: "August 2022 CU", date: "2022-08", kb: "5002247" },
      { build: "16.0.15601.20052", label: "September 2022 CU (introduces Version 22H2)", date: "2022-09", kb: "5002271" },
      { build: "16.0.15601.20158", label: "October 2022 CU", date: "2022-10", kb: "5002290" },
      { build: "16.0.15601.20238", label: "November 2022 CU", date: "2022-11", kb: "5002296" },
      { build: "16.0.15601.20316", label: "December 2022 CU", date: "2022-12", kb: "5002327" },
      { build: "16.0.15601.20418", label: "January 2023 CU", date: "2023-01", kb: "5002331" },
      { build: "16.0.15601.20478", label: "February 2023 CU", date: "2023-02", kb: "5002353" },
      { build: "16.0.16130.20206", label: "March 2023 CU (introduces Version 23H1)", date: "2023-03", kb: "5002355" },
      { build: "16.0.16130.20314", label: "April 2023 CU", date: "2023-04", kb: "5002375" },
      { build: "16.0.16130.20420", label: "May 2023 CU", date: "2023-05", kb: "5002390" },
      { build: "16.0.16130.20548", label: "June 2023 CU", date: "2023-06", kb: "5002416" },
      { build: "16.0.16130.20642", label: "July 2023 CU", date: "2023-07", kb: "5002424" },
      { build: "16.0.16130.20684", label: "August 2023 CU", date: "2023-08", kb: "5002437" },
      { build: "16.0.16731.20180", label: "September 2023 CU (introduces Version 23H2)", date: "2023-09", kb: "5002474" },
      { build: "16.0.16731.20252", label: "October 2023 CU", date: "2023-10", kb: "5002506" },
      { build: "16.0.16731.20350", label: "November 2023 CU", date: "2023-11", kb: "5002527" },
      { build: "16.0.16731.20402", label: "December 2023 CU", date: "2023-12", kb: "5002533" },
      { build: "16.0.16731.20462", label: "January 2024 CU", date: "2024-01", kb: "5002540" },
      { build: "16.0.16731.20526", label: "February 2024 CU", date: "2024-02", kb: "5002560" },
      { build: "16.0.17328.20136", label: "March 2024 CU (introduces Version 24H1)", date: "2024-03", kb: "5002564" },
      { build: "16.0.17328.20246", label: "April 2024 CU", date: "2024-04", kb: "5002581" },
      { build: "16.0.17328.20292", label: "May 2024 CU", date: "2024-05", kb: "5002599" },
      { build: "16.0.17328.20362", label: "June 2024 CU", date: "2024-06", kb: "5002603" },
      { build: "16.0.17328.20424", label: "July 2024 CU", date: "2024-07", kb: "5002606" },
      { build: "16.0.17328.20510", label: "August 2024 CU", date: "2024-08", kb: "5002629" },
      { build: "16.0.17928.20086", label: "September 2024 CU (introduces Version 24H2)", date: "2024-09", kb: "5002640" },
      { build: "16.0.17928.20162", label: "October 2024 CU", date: "2024-10", kb: "5002649" },
      { build: "16.0.17928.20238", label: "November 2024 CU", date: "2024-11", kb: "5002651" },
      { build: "16.0.17928.20290", label: "December 2024 CU", date: "2024-12", kb: "5002658" },
      { build: "16.0.17928.20356", label: "January 2025 CU", date: "2025-01", kb: "5002676" },
      { build: "16.0.17928.20396", label: "February 2025 CU", date: "2025-02", kb: "5002681" },
      { build: "16.0.18526.20080", label: "March 2025 CU (introduces Version 25H1)", date: "2025-03", kb: "5002698" },
      { build: "16.0.18526.20172", label: "April 2025 CU", date: "2025-04", kb: "5002705" },
      { build: "16.0.18526.20286", label: "May 2025 CU", date: "2025-05", kb: "5002709" },
      { build: "16.0.18526.20396", label: "June 2025 CU", date: "2025-06", kb: "5002736" },
      { build: "16.0.18526.20424", label: "July 2025 CU", date: "2025-07-08", kb: "5002751" },
      { build: "16.0.18526.20508", label: "July 2025 CU", date: "2025-07-21", kb: "5002768" },
      { build: "16.0.18526.20518", label: "August 2025 CU", date: "2025-08-12", kb: "5002773" },
      { build: "16.0.19127.20100", label: "September 2025 CU (introduces Version 25H2)", date: "2025-09-09", kb: "5002784" },
      { build: "16.0.19127.20262", label: "October 2025 CU", date: "2025-10-14", kb: "5002786" },
      { build: "16.0.19127.20338", label: "November 2025 CU", date: "2025-11-11", kb: "5002800" },
      { build: "16.0.19127.20378", label: "December 2025 CU", date: "2025-12-09", kb: "5002815" },
      { build: "16.0.19127.20442", label: "January 2026 CU", date: "2026-01-13", kb: "5002822" },
      { build: "16.0.19127.20518", label: "February 2026 CU", date: "2026-02-10", kb: "5002833" },
      { build: "16.0.19725.20076", label: "March 2026 CU", date: "2026-03-10", kb: "5002843" },
      { build: "16.0.19725.20210", label: "April 2026 CU", date: "2026-04-14", kb: "5002853" },
      { build: "16.0.19725.20280", label: "May 2026 CU", date: "2026-05-12", kb: "5002863" },
      { build: "16.0.19725.20384", label: "June 2026 CU", date: "2026-06-09", kb: "5002873" },
      { build: "16.0.19725.20434", label: "July 2026 CU", date: "2026-07-14", kb: "5002882" },
      { build: "16.0.19725.20522", label: "August 2026 CU", date: "2026-08-11", kb: "5002893"},
      { build: "16.0.20326.20136", label: "September 2026 CU", date: "2026-09-08", kb: "5002908" },
    ],
  };

  const SHAREHORSE_VERSION = "1.0.0";
  const BUILD_DATABASE_LAST_UPDATED = "2026-10-01";

  const FETCH_TIMEOUT_MS = 8000;

  function isLikelyBuggyTeamServicesFormat(v) {
    if (!v) return false;
    const p = v.split(".").map(Number);
    return p.length === 4 && !p.some(isNaN) && p[0] === 16 && p[1] === 0 && p[2] === 0 && p[3] > 0;
  }

  function findAllExactMatches(versionStr, productList, BUILD_DATABASE) {
    const matches = [];
    for (const product of productList) {
      const table = BUILD_DATABASE[product] || [];
      const entry = table.find(e => e.build === versionStr);
      if (entry) matches.push({ product, entry });
    }
    return matches;
  }

  function buildDistance(a, b) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    if (pa.length < 4 || pb.length < 4 || pa.some(isNaN) || pb.some(isNaN)) return null;
    if (pa[0] !== pb[0]) return null;
    const buildDiff = Math.abs(pa[2] - pb[2]) * 100000;
    const revDiff = Math.abs(pa[3] - pb[3]);
    return buildDiff + revDiff;
  }

  function lookupCU(product, versionStr, BUILD_DATABASE) {
    if (!product || !BUILD_DATABASE[product] || !versionStr) {
      return { label: "Unknown", date: "Unknown", kb: null, exact: false, closest: null };
    }

    const table = BUILD_DATABASE[product];
    const exact = table.find(e => e.build === versionStr);
    if (exact) {
      return { label: exact.label, date: exact.date, kb: exact.kb, exact: true, closest: null };
    }

    let closest = null;
    let minDist = Infinity;
    for (const entry of table) {
      const d = buildDistance(versionStr, entry.build);
      if (d !== null && d < minDist) {
        minDist = d;
        closest = entry;
      }
    }

    return { label: "Unknown (not in local database)", date: "Unknown", kb: null, exact: false, closest };
  }

  function classifyBuild(versionStr, isOnline, BUILD_DATABASE) {
    if (isOnline) {
      return { product: "SharePoint Online", confidence: "High", method: "hostname (*.sharepoint.com)", ambiguous: null };
    }

    if (!versionStr) {
      return { product: "Unknown", confidence: "Low", method: "no version signal retrieved", ambiguous: null };
    }

    const parts = versionStr.split(".").map(Number);
    if (parts.length < 4 || parts.some(isNaN)) {
      return { product: "Unknown", confidence: "Low", method: "unparseable version string", ambiguous: null };
    }

    const buggy = isLikelyBuggyTeamServicesFormat(versionStr);
    const major = parts[0];
    const build = buggy ? parts[3] : parts[2];

    if (major === 15) {
      return { product: "SharePoint Server 2013", confidence: "High", method: "major version = 15", ambiguous: null };
    }

    if (major !== 16) {
      return { product: "Unknown", confidence: "Low", method: `unrecognized major version (${major})`, ambiguous: null };
    }

    const exactMatches = findAllExactMatches(versionStr, ["SharePoint Server 2016", "SharePoint Server 2019", "SharePoint Server Subscription Edition"], BUILD_DATABASE);

    if (exactMatches.length > 1) {

      return {
        product: exactMatches.map(m => m.product).join(" or "),
        confidence: "Low (ambiguous)",
        method: `build ${versionStr} matches multiple products' known builds exactly: ${exactMatches.map(m => `${m.product} (${m.entry.label})`).join(", ")}. Build number alone cannot disambiguate here — check installation/purchase history, Central Administration version display, or farm documentation.`,
        ambiguous: exactMatches,
      };
    }

    if (exactMatches.length === 1) {
      return {
        product: exactMatches[0].product,
        confidence: "High",
        method: `exact match in build database (${exactMatches[0].entry.label})`,
        ambiguous: null,
      };
    }

    if (build < 6000) {
      return { product: "SharePoint Server 2016", confidence: "Medium", method: "build number heuristic (<6000)", ambiguous: null };
    }
    if (build >= 10337 && build <= 10420) {
      return {
        product: "SharePoint Server 2019",
        confidence: "Medium",
        method: "build number heuristic (10337–10420) — this range overlaps SE's RTM value; verify via service.cnf history, Central Administration, or farm documentation if certainty is required",
        ambiguous: null,
      };
    }
    if (build > 10420) {
      return {
        product: "SharePoint Server Subscription Edition",
        confidence: "Medium",
        method: "build number heuristic (>10420) — SE's build segment grows well beyond 2019's observed range over time",
        ambiguous: null,
      };
    }
    return { product: "Unknown", confidence: "Low", method: `build segment (${build}) outside all known heuristic ranges`, ambiguous: null };
  }

  async function fetchWithTimeout(url, opts, diagnostics) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal, redirect: "follow" });
      if (res.redirected) {
        const redirectedHost = (() => { try { return new URL(res.url).hostname; } catch { return null; } })();
        const requestedHost = (() => { try { return new URL(url).hostname; } catch { return null; } })();
        const looksLikeAuth = /login|signin|adfs|oauth2|authorize|sts\./i.test(res.url) || (redirectedHost && redirectedHost !== requestedHost);
        if (looksLikeAuth) {
          diagnostics.push({ url, issue: `Redirected to what looks like an authentication page (${res.url}) — this endpoint may require sign-in the current session doesn't have.` });
        }
      }
      if (res.status === 401 || res.status === 403) {
        diagnostics.push({ url, issue: `HTTP ${res.status} — access denied. The current session may lack permission to read this endpoint.` });
      }
      return res;
    } catch (e) {
      if (e.name === "AbortError") {
        diagnostics.push({ url, issue: `Timed out after ${FETCH_TIMEOUT_MS}ms (no response).` });
      } else {
        diagnostics.push({ url, issue: `Request failed: ${e.message}` });
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function getSiteBaseUrl(targetUrl, isCurrentPage) {
    if (isCurrentPage && typeof _spPageContextInfo !== "undefined" && _spPageContextInfo && _spPageContextInfo.webAbsoluteUrl) {
      return { siteBaseUrl: _spPageContextInfo.webAbsoluteUrl.replace(/\/$/, ""), usedPageContextInfo: true };
    }
    const u = new URL(targetUrl);
    const path = u.pathname.replace(/\/$/, "");
    const lastSegment = path.split("/").pop() || "";
    const looksLikePageOrSystemFolder =
      /\.[a-z0-9]{2,5}$/i.test(lastSegment) ||
      /^(_layouts|_api|_vti_bin|_vti_pvt|SitePages|Lists|forms)$/i.test(lastSegment);
    const resolvedPath = looksLikePageOrSystemFolder ? path.replace(/\/[^/]*$/, "") : path;
    return { siteBaseUrl: `${u.origin}${resolvedPath}`, usedPageContextInfo: false };
  }

  function detectCloudEnvironment(hostname) {
    const h = hostname.toLowerCase();
    if (h.endsWith("-my.sharepoint.us")) return "US Government (GCC High) — OneDrive/personal site";
    if (h.endsWith(".sharepoint.us")) return "US Government (GCC High)";
    if (h.endsWith("-my.sharepoint-mil.us")) return "US Government (DoD) — OneDrive/personal site";
    if (h.endsWith(".sharepoint-mil.us")) return "US Government (DoD)";
    if (h.endsWith(".sharepoint.cn")) return "Operated by 21Vianet (China)";
    if (h.endsWith(".sharepoint.de")) return "Germany cloud (legacy — Microsoft retired this cloud in 2021; only pre-existing tenants remain)";
    if (h.endsWith("-my.sharepoint.com")) return "Commercial or GCC (indistinguishable by hostname) — OneDrive/personal site";
    if (h.endsWith(".sharepoint.com")) return "Commercial or GCC (indistinguishable by hostname — GCC uses the same domain suffix)";
    return null;
  }

  function getNegotiatedProtocol(url) {
    try {
      if (typeof performance === "undefined" || !performance.getEntriesByType) return null;
      const entries = performance.getEntriesByType("resource").filter(e => e.name === url);
      const entry = entries[entries.length - 1];
      return (entry && entry.nextHopProtocol) ? entry.nextHopProtocol : null;
    } catch {
      return null;
    }
  }

  async function runDetection(targetUrl) {
    const target = new URL(targetUrl);
    const isCurrentPage = targetUrl === location.href || target.href === new URL(location.href).href;

    const results = {
      Hostname: target.hostname,
      Environment: null,
      MicrosoftSharePointTeamServices: null,
      XAspNetVersion: null,
      XPoweredBy: null,
      Server: null,
      SPRequestGuid: null,
      XSharePointHealthScore: null,
      vti_extenderversion: null,
      vti_buildversion: null,
      REST_LibraryVersion: null,
      REST_FormDigestTimeoutSeconds: null,

      ContentSecurityPolicy: null,
      ProxyHeaders: {},
      REST_SupportedSchemaVersions: null,
      REST_SiteFullUrl: null,
      REST_WebFullUrl: null,
      Web_Title: null,
      Web_WebTemplate: null,
      Web_Configuration: null,
      Web_UIVersion: null,
      Web_UIVersionConfigurationEnabled: null,
      Web_Language: null,
      Web_LanguageName: null,
      InstalledLanguages: null,

      CloudEnvironment: null,
      NegotiatedProtocol: null,
      Site_Id: null,
      Site_HubSiteId: null,
      Site_GroupId: null,
      Site_ReadOnly: null,
      RegionalSettings_LocaleId: null,
      RegionalSettings_TimeZone: null,
    };

    const evidence = [];
    const diagnostics = [];

    const headUrl = target.href;
    {
      const head = await fetchWithTimeout(headUrl, { method: "HEAD", credentials: "same-origin" }, diagnostics);
      if (head) {
        if (!head.ok) {
          diagnostics.push({ url: headUrl, issue: `HEAD request returned HTTP ${head.status}.` });
        }
        results.MicrosoftSharePointTeamServices = head.headers.get("MicrosoftSharePointTeamServices");
        results.XAspNetVersion = head.headers.get("X-AspNet-Version");
        results.XPoweredBy = head.headers.get("X-Powered-By");
        results.SPRequestGuid = head.headers.get("SPRequestGuid");
        results.Server = head.headers.get("Server");
        results.XSharePointHealthScore = head.headers.get("X-SharePointHealthScore");

        results.ContentSecurityPolicy = head.headers.get("Content-Security-Policy");

        const proxyHeaderNames = [
          "Via", "X-Forwarded-For", "X-Forwarded-Host", "X-Forwarded-Proto",
          "CF-RAY", "CF-Cache-Status", "X-Azure-Ref", "X-Azure-FDID", "X-Cache",
          "X-Akamai-Transformed", "X-Served-By", "X-Cache-Hits", "X-Fastly-Request-ID", "Age",
        ];
        for (const name of proxyHeaderNames) {
          const val = head.headers.get(name);
          if (val) results.ProxyHeaders[name] = val;
        }

        results.CloudEnvironment = detectCloudEnvironment(target.hostname);

        results.NegotiatedProtocol = getNegotiatedProtocol(headUrl);

        if (results.MicrosoftSharePointTeamServices) {
          evidence.push({ source: "HTTP Header (MicrosoftSharePointTeamServices)", weight: 3, url: headUrl });
        }
        if (results.ContentSecurityPolicy) {
          evidence.push({ source: "HTTP Header (Content-Security-Policy — soft signal, SE 24H1+)", weight: 1, url: headUrl });
        }
      }
    }

    const serviceCnfUrl = new URL("/_vti_pvt/service.cnf", target.href).href;
    {
      const res = await fetchWithTimeout(serviceCnfUrl, { credentials: "same-origin" }, diagnostics);
      if (res && res.ok) {
        const txt = await res.text();
        const extender = txt.match(/vti_extenderversion:SR\|([\d.]+)/i);
        const build = txt.match(/vti_buildversion:SR\|([\d.]+)/i);

        if (extender) {
          results.vti_extenderversion = extender[1];
          evidence.push({ source: "service.cnf (vti_extenderversion)", weight: 3, url: serviceCnfUrl });
        }
        if (build) {
          results.vti_buildversion = build[1];
          evidence.push({ source: "service.cnf (vti_buildversion)", weight: 3, url: serviceCnfUrl });
        }
      }
    }

    const { siteBaseUrl, usedPageContextInfo } = getSiteBaseUrl(target.href, isCurrentPage);
    const contextInfoUrl = `${siteBaseUrl}/_api/contextinfo`;
    {
      const api = await fetchWithTimeout(contextInfoUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Accept": "application/json;odata=verbose" },
      }, diagnostics);

      if (api && api.ok) {
        const json = await api.json();
        const info = json?.d?.GetContextWebInformation;
        if (info) {
          results.REST_LibraryVersion = info.LibraryVersion || null;
          results.REST_FormDigestTimeoutSeconds = info.FormDigestTimeoutSeconds ?? null;
          if (results.REST_LibraryVersion) {
            evidence.push({ source: "REST API (_api/contextinfo LibraryVersion)", weight: 2, url: contextInfoUrl });
          }

          const schemaVersions = info.SupportedSchemaVersions?.results || info.SupportedSchemaVersions || null;
          results.REST_SupportedSchemaVersions = Array.isArray(schemaVersions) ? schemaVersions.join(", ") : null;
          results.REST_SiteFullUrl = info.SiteFullUrl || null;
          results.REST_WebFullUrl = info.WebFullUrl || null;

          if (results.REST_WebFullUrl) {
            const normalize = (u) => u.replace(/\/$/, "").toLowerCase();
            if (normalize(results.REST_WebFullUrl) !== normalize(siteBaseUrl)) {
              diagnostics.push({
                url: contextInfoUrl,
                issue: `Server reports its own WebFullUrl as "${results.REST_WebFullUrl}", which differs from the site base URL this script resolved ("${siteBaseUrl}"). The server's value is authoritative — if you're seeing unexpected results, the guessed base may be off (see Site-relative REST API resolution in the README).`,
              });
            }
          }
        }
      }
    }

    const webInfoUrl = `${siteBaseUrl}/_api/web?$select=Title,WebTemplate,Configuration,UIVersion,UIVersionConfigurationEnabled,Language,LanguageName`;
    {
      const res = await fetchWithTimeout(webInfoUrl, {
        credentials: "same-origin",
        headers: { "Accept": "application/json;odata=verbose" },
      }, diagnostics);

      if (res && res.ok) {
        const json = await res.json();
        const web = json?.d;
        if (web) {
          results.Web_Title = web.Title ?? null;
          results.Web_WebTemplate = web.WebTemplate ?? null;
          results.Web_Configuration = web.Configuration ?? null;
          results.Web_UIVersion = web.UIVersion ?? null;
          results.Web_UIVersionConfigurationEnabled = web.UIVersionConfigurationEnabled ?? null;
          results.Web_Language = web.Language ?? null;
          results.Web_LanguageName = web.LanguageName ?? null;
          if (results.Web_WebTemplate) {
            evidence.push({ source: "REST API (_api/web WebTemplate/UIVersion)", weight: 1, url: webInfoUrl });
          }
        }
      }
    }

    const regionalSettingsUrl = `${siteBaseUrl}/_api/web/regionalsettings?$select=LocaleId,TimeZone/Description&$expand=InstalledLanguages,TimeZone`;
    {
      const res = await fetchWithTimeout(regionalSettingsUrl, {
        credentials: "same-origin",
        headers: { "Accept": "application/json;odata=verbose" },
      }, diagnostics);

      if (res && res.ok) {
        const json = await res.json();
        const rs = json?.d;
        if (rs) {
          results.RegionalSettings_LocaleId = rs.LocaleId ?? null;
          results.RegionalSettings_TimeZone = rs.TimeZone?.Description ?? null;
          const langs = rs.InstalledLanguages?.results || [];
          if (langs.length) {
            results.InstalledLanguages = langs.map(l => ({
              displayName: l.DisplayName ?? null,
              lcid: l.Lcid ?? null,
              languageTag: l.LanguageTag ?? null,
            }));
          }
        }
      }
    }

    const siteInfoUrl = `${siteBaseUrl}/_api/site?$select=Id,HubSiteId,GroupId,ReadOnly`;
    {
      const res = await fetchWithTimeout(siteInfoUrl, {
        credentials: "same-origin",
        headers: { "Accept": "application/json;odata=verbose" },
      }, diagnostics);

      if (res && res.ok) {
        const json = await res.json();
        const site = json?.d;
        if (site) {
          const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
          results.Site_Id = site.Id ?? null;
          results.Site_HubSiteId = (site.HubSiteId && site.HubSiteId !== EMPTY_GUID) ? site.HubSiteId : null;
          results.Site_GroupId = (site.GroupId && site.GroupId !== EMPTY_GUID) ? site.GroupId : null;
          results.Site_ReadOnly = site.ReadOnly ?? null;
        }
      }
    }

    const isOnline = target.hostname.endsWith("sharepoint.com");
    results.Environment = isOnline ? "SharePoint Online" : "SharePoint Server (self-hosted) — refining…";

    const headerLooksBuggy = isLikelyBuggyTeamServicesFormat(results.MicrosoftSharePointTeamServices);

    const detectedBuild =
      results.vti_buildversion ||
      results.REST_LibraryVersion ||
      results.vti_extenderversion ||
      (headerLooksBuggy ? null : results.MicrosoftSharePointTeamServices) ||
      results.MicrosoftSharePointTeamServices ||
      null;

    let headerCrossCheckNote = null;
    if (headerLooksBuggy && (results.vti_buildversion || results.REST_LibraryVersion || results.vti_extenderversion)) {
      const reliableSource = results.vti_buildversion || results.REST_LibraryVersion || results.vti_extenderversion;
      const reliableParts = reliableSource.split(".").map(Number);
      const headerParts = results.MicrosoftSharePointTeamServices.split(".").map(Number);
      if (reliableParts.length === 4 && headerParts[3] === reliableParts[2]) {
        headerCrossCheckNote = `Header shows the known "X.0.0.${headerParts[3]}" bug format; its trailing segment (${headerParts[3]}) correctly matches the build segment of ${reliableSource} — confirms this is the documented header quirk, not a real 2016-era build.`;
      } else {
        headerCrossCheckNote = `Header value (${results.MicrosoftSharePointTeamServices}) does not cleanly cross-validate against ${reliableSource}. Investigate further before trusting either value.`;
      }
    }

    const classification = classifyBuild(detectedBuild, isOnline, BUILD_DATABASE);
    const primaryProduct = classification.ambiguous ? classification.ambiguous[0].product : classification.product;

    if (!isOnline) {
      if (primaryProduct === "SharePoint Server Subscription Edition") {
        results.Environment = "Self-Hosted — Subscription Edition (Modern Lifecycle, no fixed EOL)";
      } else if (primaryProduct === "SharePoint Server 2013" || primaryProduct === "SharePoint Server 2016" || primaryProduct === "SharePoint Server 2019") {
        results.Environment = `Self-Hosted — ${primaryProduct.replace("SharePoint Server ", "")} (Fixed Lifecycle, hard EOL date)`;
      } else if (classification.ambiguous) {
        results.Environment = "Self-Hosted — product ambiguous (see Build Database Match); could be Fixed Lifecycle (2019) or Modern Lifecycle (Subscription Edition)";
      } else {
        results.Environment = "Self-Hosted — product undetermined";
      }
    }

    const cuInfo = primaryProduct && BUILD_DATABASE[primaryProduct]
      ? lookupCU(primaryProduct, detectedBuild, BUILD_DATABASE)
      : { label: "N/A", date: "N/A", kb: null, exact: false, closest: null };

    let compatibilityModeNote = null;
    if (results.Web_UIVersion != null && detectedBuild) {
      const farmMajor = parseInt(detectedBuild.split(".")[0], 10);
      const siteUIVersion = Number(results.Web_UIVersion);
      if (!isNaN(farmMajor) && !isNaN(siteUIVersion) && siteUIVersion < farmMajor) {
        compatibilityModeNote = `This site collection is running in UIVersion ${siteUIVersion} compatibility mode (behaves like SharePoint ${siteUIVersion === 15 ? "2013" : siteUIVersion}), even though the farm itself is on build major ${farmMajor} (SharePoint ${farmMajor === 16 ? "2016/2019/Subscription Edition" : farmMajor}). The farm's patch level and this site's rendering/behavior level are two different things — run Set-SPSite -CompatibilityLevel to upgrade this specific site collection if desired.`;
      }
    }

    const buildBearingEvidenceCount = evidence.filter(e => e.weight >= 2).length;
    function computeConfidence() {
      if (isOnline) return "High";
      if (classification.ambiguous) return "Low (ambiguous build)";
      if (classification.confidence === "High" && cuInfo.exact) return "High";
      if (classification.confidence === "High") return "Medium-High";
      if (classification.confidence === "Medium" && buildBearingEvidenceCount >= 2) return "Medium";
      if (buildBearingEvidenceCount === 0) return "Low";
      return "Medium";
    }
    const overallConfidence = computeConfidence();

    const kbDisplay = cuInfo.kb
      ? `KB${cuInfo.kb}`
      : (cuInfo.closest && cuInfo.closest.kb ? `Unknown (closest: KB${cuInfo.closest.kb})` : "Unknown");

    return {
      targetUrl: target.href,
      hostname: target.hostname,
      generatedAt: new Date().toLocaleString(),
      results,
      evidence,
      diagnostics,
      isOnline,
      headerLooksBuggy,
      headerCrossCheckNote,
      detectedBuild,
      classification,
      primaryProduct,
      cuInfo,
      kbDisplay,
      confidence: overallConfidence,
      siteBaseUrl,
      usedPageContextInfo,
      compatibilityModeNote,
    };
  }

  function renderConsoleReport(d) {
    const {
      results, evidence, diagnostics, isOnline, headerLooksBuggy, headerCrossCheckNote,
      detectedBuild, classification, primaryProduct, cuInfo, kbDisplay, confidence: overallConfidence,
      siteBaseUrl, usedPageContextInfo, hostname, generatedAt, compatibilityModeNote,
    } = d;

    console.clear();
    const BANNER_FONT = "font-family:'Courier New',Consolas,Menlo,monospace;white-space:pre;font-size:13px;";
    const bw = 60;
    console.log(
      "%c+" + "-".repeat(bw + 2) + "+\n" +
      "%c| " + "Sharehorse — SharePoint Fingerprint Tool (Advanced)".padEnd(bw + 1) + "|\n" +
      "%c+" + "-".repeat(bw + 2) + "+",
      STYLE.banner + BANNER_FONT, STYLE.banner + BANNER_FONT, STYLE.banner + BANNER_FONT
    );
    console.log(`%cScanned ${hostname}  |  ${generatedAt}`, STYLE.subtitle);

    console.groupCollapsed("%c🔎 Raw Signals Collected", STYLE.section);
    console.table({
      "Hostname": results.Hostname,
      "Environment": results.Environment,
      "MicrosoftSharePointTeamServices": results.MicrosoftSharePointTeamServices || "(not present)",
      "X-AspNet-Version": results.XAspNetVersion || "(not present)",
      "X-Powered-By": results.XPoweredBy || "(not present)",
      "Server": results.Server || "(not present)",
      "SPRequestGuid": results.SPRequestGuid || "(not present)",
      "X-SharePointHealthScore": results.XSharePointHealthScore || "(not present)",
      "vti_extenderversion": results.vti_extenderversion || "(not present / blocked)",
      "vti_buildversion": results.vti_buildversion || "(not present / blocked)",
      "REST LibraryVersion": results.REST_LibraryVersion || "(not present / blocked)",
      "REST FormDigestTimeoutSeconds": results.REST_FormDigestTimeoutSeconds ?? "(not present / blocked)",
      "Site Base URL (used for REST API)": siteBaseUrl,
      "Resolved via _spPageContextInfo": usedPageContextInfo ? "Yes (reliable)" : "No (path-based fallback)",
    });
    console.groupEnd();

    console.groupCollapsed("%c🧪 Detection Evidence", STYLE.section);
    if (evidence.length) {
      console.table(evidence.map(e => ({ Source: e.source, Weight: e.weight, URL: e.url || "(n/a)" })));
    } else {
      console.log("%c⚠ No strong version signals were retrievable (headers stripped / endpoints blocked).", STYLE.warn);
    }
    console.groupEnd();

    if (diagnostics.length) {
      console.groupCollapsed("%c🩺 Diagnostics", STYLE.section);
      diagnostics.forEach(diag => console.log(`%c⚠ ${diag.url}\n  ${diag.issue}`, STYLE.warn));
      console.groupEnd();
    }

    console.groupCollapsed("%c🧬 Extended Fingerprint", STYLE.section);

    console.log("%cCloud Instance:", STYLE.label, results.CloudEnvironment || "(on-premises / not a *.sharepoint.* hostname)");
    console.log("%cNegotiated HTTP Protocol:", STYLE.label, results.NegotiatedProtocol || "(unavailable in this browser/context)");

    console.log("%cSite / Web:", STYLE.label);
    console.table({
      "Title": results.Web_Title || "(not present / blocked)",
      "WebTemplate": results.Web_WebTemplate || "(not present / blocked)",
      "Configuration": results.Web_Configuration ?? "(not present / blocked)",
      "UIVersion (site compatibility level)": results.Web_UIVersion ?? "(not present / blocked)",
      "UIVersionConfigurationEnabled": results.Web_UIVersionConfigurationEnabled ?? "(not present / blocked)",
      "Language (LCID)": results.Web_Language ?? "(not present / blocked)",
      "LanguageName": results.Web_LanguageName || "(not present / blocked)",
    });

    if (compatibilityModeNote) {
      console.log(`%c⚠ Compatibility mode detected: ${compatibilityModeNote}`, STYLE.warn);
    }

    console.log("%cSite Collection (/_api/site):", STYLE.label);
    console.table({
      "Site Id": results.Site_Id || "(not present / blocked)",
      "Hub Site": results.Site_HubSiteId || "(not hub-associated)",
      "Microsoft 365 Group-connected": results.Site_GroupId ? `Yes (${results.Site_GroupId})` : "No / not present",
      "Read-Only": results.Site_ReadOnly ?? "(not present / blocked)",
    });

    console.log("%cRegional Settings:", STYLE.label);
    console.table({
      "LocaleId": results.RegionalSettings_LocaleId ?? "(not present / blocked)",
      "TimeZone": results.RegionalSettings_TimeZone || "(not present / blocked)",
    });

    if (results.InstalledLanguages && results.InstalledLanguages.length) {
      console.log("%cInstalled MUI Language Packs:", STYLE.label);
      console.table(results.InstalledLanguages.map(l => ({ Language: l.displayName, LCID: l.lcid, Tag: l.languageTag })));
    } else {
      console.log("%cInstalled language packs: (not present / blocked)", STYLE.dim);
    }

    console.log("%cREST contextinfo extras:", STYLE.label);
    console.table({
      "SupportedSchemaVersions": results.REST_SupportedSchemaVersions || "(not present / blocked)",
      "SiteFullUrl": results.REST_SiteFullUrl || "(not present / blocked)",
      "WebFullUrl": results.REST_WebFullUrl || "(not present / blocked)",
    });

    console.log("%cContent-Security-Policy header:", STYLE.label, results.ContentSecurityPolicy || "(not present)");
    if (results.ContentSecurityPolicy) {
      console.log("%cSoft signal only: SharePoint Server Subscription Edition Version 24H1 (build 16.0.17328.20136, March 2024) introduced CSP header support. Presence suggests 24H1+; absence proves nothing (CSP may simply be disabled).", STYLE.dim);
    }

    const proxyKeys = Object.keys(results.ProxyHeaders || {});
    if (proxyKeys.length) {
      console.log("%cReverse-proxy / WAF / CDN headers detected:", STYLE.label);
      console.table(results.ProxyHeaders);
    } else {
      console.log("%cNo reverse-proxy / WAF / CDN headers detected (Via, X-Forwarded-*, CF-RAY, X-Azure-Ref, X-Akamai-*, X-Served-By, etc.).", STYLE.dim);
    }

    console.groupEnd();

    if (headerLooksBuggy) {
      console.groupCollapsed("%c⚠️  Header Quirk Detected", STYLE.section);
      console.log(
        `%cMicrosoftSharePointTeamServices reported %c"${results.MicrosoftSharePointTeamServices}"%c — matches Microsoft's known "16.0.0.XXXXX" header bug on SharePoint 2019+/Subscription Edition, where the real build segment is lost and shoved into the last octet.`,
        STYLE.value, STYLE.monoAcc, STYLE.value
      );
      if (headerCrossCheckNote) {
        console.log(`%c${headerCrossCheckNote}`, STYLE.dim);
      }
      console.log("%cResolved using vti_buildversion / REST LibraryVersion instead (correctly formatted).", STYLE.dim);
      console.groupEnd();
    }

    console.group("%c📚 Build Database Match", STYLE.section);
    if (classification.ambiguous) {
      console.log(`%c⚠ Ambiguous — build %c${detectedBuild}%c matches multiple products exactly:`, STYLE.warn, STYLE.monoAcc, STYLE.warn);
      console.table(classification.ambiguous.map(m => ({ Product: m.product, "Matched Entry": m.entry.label, Date: m.entry.date })));
      console.log("%cKnown collision: 2019 and Subscription Edition share their RTM build. Confirm via Central Administration's version display, farm install history, or license/purchase records.", STYLE.dim);
    } else if (primaryProduct && BUILD_DATABASE[primaryProduct]) {
      if (cuInfo.exact) {
        console.log(`%c✔ Exact match — %c${detectedBuild}%c = ${cuInfo.label} (${cuInfo.date}${cuInfo.kb ? ", KB" + cuInfo.kb : ""})`, STYLE.ok, STYLE.monoAcc, STYLE.ok);
      } else if (detectedBuild) {
        console.log(`%cNo exact match for %c${detectedBuild}%c in local database.`, STYLE.warn, STYLE.monoAcc, STYLE.warn);
        if (cuInfo.closest) {
          console.log(`%cClosest known build: %c${cuInfo.closest.build}%c — ${cuInfo.closest.label} (${cuInfo.closest.date}${cuInfo.closest.kb ? ", KB" + cuInfo.closest.kb : ""})`, STYLE.dim, STYLE.monoDim, STYLE.dim);
        }
        console.log("%cCross-reference against Microsoft's official update history:", STYLE.dim);
        console.log("%c  https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates", STYLE.dim);
      } else {
        console.log("%cNo build number could be retrieved to compare against the database.", STYLE.warn);
      }
    } else {
      console.log("%cN/A (SharePoint Online, or product could not be classified).", STYLE.dim);
    }
    console.groupEnd();

    const confKey =
      overallConfidence === "High" ? "high" :
      overallConfidence.startsWith("Medium") ? "medium" : "low";

    const CARD_CONF_COLOR = {
      high:   "color:#4ade80;font-weight:bold;",
      medium: "color:#facc15;font-weight:bold;",
      low:    "color:#f87171;font-weight:bold;",
    };
    const confColor = CARD_CONF_COLOR[confKey];
    const pillColor = PILL_COLOR[confKey];

    const CARD_FONT = "font-family:'Courier New',Consolas,Menlo,monospace;white-space:pre;font-size:12px;";
    const W = 62;
    const hr = () => "+" + "-".repeat(W + 2) + "+";
    const row = (label, value) => {
      const text = ` ${String(label).padEnd(13)}${String(value ?? "Unknown")}`;
      const trimmed = text.length > W ? text.slice(0, W - 1) + "…" : text;
      return "|" + trimmed.padEnd(W + 2) + "|";
    };

    console.log("%c\n" + hr(), STYLE.banner + CARD_FONT);
    console.log("%c| " + "SHAREPOINT DETECTION SUMMARY".padEnd(W + 1) + "|", STYLE.banner + CARD_FONT);
    console.log("%c" + hr(), STYLE.banner + CARD_FONT);
    console.log("%c" + row("Product", classification.product), STYLE.value + CARD_FONT);
    console.log("%c" + row("Build", detectedBuild), STYLE.value + CARD_FONT);
    console.log("%c" + row("CU / PU", cuInfo.label), STYLE.value + CARD_FONT);
    console.log("%c" + row("KB Number", kbDisplay), STYLE.value + CARD_FONT);
    console.log("%c" + row("Released", cuInfo.date), STYLE.value + CARD_FONT);
    console.log("%c" + row("Environment", results.Environment), STYLE.value + CARD_FONT);
    console.log("%c" + row("Confidence", overallConfidence), confColor + CARD_FONT);
    console.log("%c" + hr() + "\n", STYLE.banner + CARD_FONT);

    pill(overallConfidence.toUpperCase(), pillColor);

    console.log(`%cDetection method: ${classification.method}`, STYLE.dim);

    if (!isOnline && !detectedBuild) {
      console.log("%c⚠ No version headers/endpoints were retrievable. This may indicate header stripping by a reverse proxy/WAF, custom IIS configuration, or restricted permissions on service.cnf/_api. Try running this from an authenticated session with Site Owner permissions for best results.", STYLE.warn);
    }

    if (!isOnline && detectedBuild && (primaryProduct === "SharePoint Server 2016" || primaryProduct === "SharePoint Server 2019")) {
      const EOL_DATE = new Date("2026-07-14T00:00:00Z");
      const daysSinceEOL = Math.round((Date.now() - EOL_DATE.getTime()) / 86400000);
      const eolPhrase = daysSinceEOL >= 0
        ? `reached end of support on 2026-07-14 (${daysSinceEOL} day${daysSinceEOL === 1 ? "" : "s"} ago)`
        : `will reach end of support on 2026-07-14 (in ${-daysSinceEOL} day${daysSinceEOL === -1 ? "" : "s"})`;
      console.log(`%c⚠ SharePoint Server 2016 and 2019 ${eolPhrase}. ${daysSinceEOL >= 0 ? "This farm is no longer receiving security updates from Microsoft." : "Plan your upgrade before then."}`, STYLE.warn);
    }

    if (compatibilityModeNote) {
      console.log(`%c⚠ ${compatibilityModeNote}`, STYLE.warn);
    }
  }

  function buildReportText(d) {
    const {
      results, evidence, diagnostics, headerLooksBuggy, headerCrossCheckNote, detectedBuild,
      classification, primaryProduct, cuInfo, kbDisplay, confidence: overallConfidence,
      siteBaseUrl, usedPageContextInfo, targetUrl, generatedAt, compatibilityModeNote,
    } = d;

    const L = [];
    const push = (s = "") => L.push(s);
    const kv = (label, value) => push(`  ${String(label).padEnd(28)} : ${value ?? "Unknown"}`);

    push("=".repeat(70));
    push("Sharehorse — SharePoint Fingerprint Tool (Advanced) — Report");
    push(`Generated: ${generatedAt}`);
    push(`Target:    ${targetUrl}`);
    push("=".repeat(70));
    push("");

    push("-- Raw Signals Collected --");
    kv("Hostname", results.Hostname);
    kv("Environment", results.Environment);
    kv("MicrosoftSharePointTeamServices", results.MicrosoftSharePointTeamServices || "(not present)");
    kv("X-AspNet-Version", results.XAspNetVersion || "(not present)");
    kv("X-Powered-By", results.XPoweredBy || "(not present)");
    kv("Server", results.Server || "(not present)");
    kv("SPRequestGuid", results.SPRequestGuid || "(not present)");
    kv("X-SharePointHealthScore", results.XSharePointHealthScore || "(not present)");
    kv("vti_extenderversion", results.vti_extenderversion || "(not present / blocked)");
    kv("vti_buildversion", results.vti_buildversion || "(not present / blocked)");
    kv("REST LibraryVersion", results.REST_LibraryVersion || "(not present / blocked)");
    kv("REST FormDigestTimeoutSeconds", results.REST_FormDigestTimeoutSeconds ?? "(not present / blocked)");
    kv("Site Base URL (used for REST API)", siteBaseUrl);
    kv("Resolved via _spPageContextInfo", usedPageContextInfo ? "Yes (reliable)" : "No (path-based fallback)");
    push("");

    push("-- Extended Fingerprint (Sharehorse) --");
    kv("Cloud Instance", results.CloudEnvironment || "(on-premises / not a *.sharepoint.* hostname)");
    kv("Negotiated HTTP Protocol", results.NegotiatedProtocol || "(unavailable in this browser/context)");
    kv("Web Title", results.Web_Title || "(not present / blocked)");
    kv("WebTemplate", results.Web_WebTemplate || "(not present / blocked)");
    kv("Configuration", results.Web_Configuration ?? "(not present / blocked)");
    kv("UIVersion (site compatibility level)", results.Web_UIVersion ?? "(not present / blocked)");
    kv("UIVersionConfigurationEnabled", results.Web_UIVersionConfigurationEnabled ?? "(not present / blocked)");
    kv("Language (LCID)", results.Web_Language ?? "(not present / blocked)");
    kv("LanguageName", results.Web_LanguageName || "(not present / blocked)");
    kv("Site Id", results.Site_Id || "(not present / blocked)");
    kv("Hub Site Id", results.Site_HubSiteId || "(not hub-associated)");
    kv("Microsoft 365 Group Id", results.Site_GroupId || "(not group-connected / not present)");
    kv("Site Read-Only", results.Site_ReadOnly ?? "(not present / blocked)");
    kv("Regional LocaleId", results.RegionalSettings_LocaleId ?? "(not present / blocked)");
    kv("Regional TimeZone", results.RegionalSettings_TimeZone || "(not present / blocked)");
    kv("Installed Language Packs", results.InstalledLanguages && results.InstalledLanguages.length
      ? results.InstalledLanguages.map(l => `${l.displayName} (${l.lcid})`).join(", ")
      : "(not present / blocked)");
    kv("SupportedSchemaVersions", results.REST_SupportedSchemaVersions || "(not present / blocked)");
    kv("SiteFullUrl", results.REST_SiteFullUrl || "(not present / blocked)");
    kv("WebFullUrl", results.REST_WebFullUrl || "(not present / blocked)");
    kv("Content-Security-Policy", results.ContentSecurityPolicy || "(not present)");
    const proxyKeys = Object.keys(results.ProxyHeaders || {});
    kv("Reverse-proxy / WAF / CDN headers", proxyKeys.length
      ? proxyKeys.map(k => `${k}=${results.ProxyHeaders[k]}`).join("; ")
      : "(none detected)");
    if (compatibilityModeNote) {
      push(`  ⚠ Compatibility mode: ${compatibilityModeNote}`);
    }
    push("");

    push("-- Detection Evidence --");
    if (evidence.length) {
      evidence.forEach(e => push(`  - ${e.source} (weight ${e.weight})\n      URL: ${e.url || "(n/a)"}`));
    } else {
      push("  No strong version signals were retrievable.");
    }
    push("");

    if (diagnostics.length) {
      push("-- Diagnostics --");
      diagnostics.forEach(diag => push(`  - ${diag.url}\n      ${diag.issue}`));
      push("");
    }

    if (headerLooksBuggy) {
      push("-- Header Quirk Detected --");
      push(`  MicrosoftSharePointTeamServices reported "${results.MicrosoftSharePointTeamServices}" — matches`);
      push(`  Microsoft's known "16.0.0.XXXXX" header bug on SharePoint 2019+/Subscription Edition.`);
      if (headerCrossCheckNote) push(`  ${headerCrossCheckNote}`);
      push(`  Resolved using vti_buildversion / REST LibraryVersion instead.`);
      push("");
    }

    push("-- Build Database Match --");
    if (classification.ambiguous) {
      push(`  AMBIGUOUS: build ${detectedBuild} matches multiple products exactly:`);
      classification.ambiguous.forEach(m => push(`    - ${m.product}: ${m.entry.label} (${m.entry.date})`));
      push(`  Known collision: 2019 and Subscription Edition share their RTM build.`);
    } else if (primaryProduct && BUILD_DATABASE[primaryProduct]) {
      if (cuInfo.exact) {
        push(`  Exact match — ${detectedBuild} = ${cuInfo.label} (${cuInfo.date}${cuInfo.kb ? ", KB" + cuInfo.kb : ""})`);
      } else if (detectedBuild) {
        push(`  No exact match for ${detectedBuild} in local database.`);
        if (cuInfo.closest) {
          push(`  Closest known build: ${cuInfo.closest.build} — ${cuInfo.closest.label} (${cuInfo.closest.date}${cuInfo.closest.kb ? ", KB" + cuInfo.closest.kb : ""})`);
        }
      } else {
        push("  No build number could be retrieved to compare against the database.");
      }
    } else {
      push("  N/A (SharePoint Online, or product could not be classified).");
    }
    push("");

    push("-- Summary --");
    kv("Product", classification.product);
    kv("Build", detectedBuild);
    kv("CU / PU", cuInfo.label);
    kv("KB Number", kbDisplay);
    kv("Released", cuInfo.date);
    kv("Environment", results.Environment);
    kv("Confidence", overallConfidence);
    kv("Detection Method", classification.method);
    push("");
    push("=".repeat(70));
    push("Source of truth for build/CU mappings: https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates");
    push("=".repeat(70));

    return L.join("\n");
  }

  function buildReportJSON(d) {

    return JSON.stringify({
      generatedAt: d.generatedAt,
      targetUrl: d.targetUrl,
      hostname: d.hostname,
      environment: d.results.Environment,
      isOnline: d.isOnline,
      product: d.classification.product,
      productAmbiguous: !!d.classification.ambiguous,
      ambiguousCandidates: d.classification.ambiguous
        ? d.classification.ambiguous.map(m => ({ product: m.product, label: m.entry.label, date: m.entry.date }))
        : null,
      detectedBuild: d.detectedBuild,
      cu: d.cuInfo.label,
      cuExactMatch: d.cuInfo.exact,
      closestKnownBuild: d.cuInfo.closest ? d.cuInfo.closest.build : null,
      kb: d.cuInfo.kb || (d.cuInfo.closest ? d.cuInfo.closest.kb : null),
      releaseDate: d.cuInfo.date,
      confidence: d.confidence,
      detectionMethod: d.classification.method,
      headerBugDetected: d.headerLooksBuggy,
      headerCrossCheckNote: d.headerCrossCheckNote,
      siteBaseUrl: d.siteBaseUrl,
      usedPageContextInfo: d.usedPageContextInfo,
      compatibilityModeNote: d.compatibilityModeNote,
      extendedFingerprint: {
        cloudEnvironment: d.results.CloudEnvironment,
        negotiatedProtocol: d.results.NegotiatedProtocol,
        webTitle: d.results.Web_Title,
        webTemplate: d.results.Web_WebTemplate,
        webConfiguration: d.results.Web_Configuration,
        siteUIVersion: d.results.Web_UIVersion,
        uiVersionConfigurationEnabled: d.results.Web_UIVersionConfigurationEnabled,
        webLanguageLcid: d.results.Web_Language,
        webLanguageName: d.results.Web_LanguageName,
        siteId: d.results.Site_Id,
        hubSiteId: d.results.Site_HubSiteId,
        groupId: d.results.Site_GroupId,
        siteReadOnly: d.results.Site_ReadOnly,
        regionalLocaleId: d.results.RegionalSettings_LocaleId,
        regionalTimeZone: d.results.RegionalSettings_TimeZone,
        installedLanguages: d.results.InstalledLanguages,
        supportedSchemaVersions: d.results.REST_SupportedSchemaVersions,
        siteFullUrl: d.results.REST_SiteFullUrl,
        webFullUrl: d.results.REST_WebFullUrl,
        contentSecurityPolicy: d.results.ContentSecurityPolicy,
        proxyHeaders: d.results.ProxyHeaders,
      },
      rawSignals: d.results,
      evidence: d.evidence,
      diagnostics: d.diagnostics,
      sourceOfTruth: "https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates",
    }, null, 2);
  }

  function buildSummaryOnlyText(d) {
    const L = [];
    L.push(`SharePoint Detection — ${d.hostname}`);
    L.push(`Product:      ${d.classification.product}`);
    L.push(`Build:        ${d.detectedBuild || "Unknown"}`);
    L.push(`CU / PU:      ${d.cuInfo.label}`);
    L.push(`KB Number:    ${d.kbDisplay}`);
    L.push(`Released:     ${d.cuInfo.date}`);
    L.push(`Environment:  ${d.results.Environment}`);
    L.push(`Confidence:   ${d.confidence}`);
    return L.join("\n");
  }

  function safeFilenamePart(s) {
    return String(s).replace(/[^a-z0-9.-]/gi, "_");
  }

  function triggerDownload(text, filename, mime) {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadTextReport(d) {
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `sharepoint-detection_${safeFilenamePart(d.hostname)}_${stamp}.txt`;
      triggerDownload(buildReportText(d), filename, "text/plain");
      console.log(`%c⬇ Report downloaded: ${filename}`, STYLE.ok);
      return filename;
    } catch (e) {
      console.warn("Could not auto-download text report:", e.message);
      console.log("%cYou can still get the report text by running: copy(__spDetectorReport())", STYLE.dim);
      return null;
    }
  }

  function downloadJsonReport(d) {
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `sharepoint-detection_${safeFilenamePart(d.hostname)}_${stamp}.json`;
      triggerDownload(buildReportJSON(d), filename, "application/json");
      console.log(`%c⬇ JSON report downloaded: ${filename}`, STYLE.ok);
      return filename;
    } catch (e) {
      console.warn("Could not auto-download JSON report:", e.message);
      console.log("%cYou can still get the JSON by running: copy(__spDetectorReportJSON())", STYLE.dim);
      return null;
    }
  }

  function buildCsvReport(detections) {
    const headers = ["Hostname", "TargetUrl", "Product", "Build", "CU", "KB", "ReleaseDate", "Environment", "Confidence", "CloudEnvironment", "WebTemplate", "SiteUIVersion", "CompatibilityModeFlag", "HubSiteId", "GroupConnected", "DiagnosticsCount"];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = detections.map(d => [
      d.hostname, d.targetUrl, d.classification.product, d.detectedBuild || "",
      d.cuInfo.label, d.cuInfo.kb || (d.cuInfo.closest ? d.cuInfo.closest.kb : ""),
      d.cuInfo.date, d.results.Environment, d.confidence,
      d.results.CloudEnvironment || "",
      d.results.Web_WebTemplate || "", d.results.Web_UIVersion ?? "", d.compatibilityModeNote ? "YES" : "",
      d.results.Site_HubSiteId || "", d.results.Site_GroupId ? "YES" : "",
      d.diagnostics.length,
    ].map(escape).join(","));
    return [headers.join(","), ...rows].join("\n");
  }

  function downloadCsvReport(detections) {
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `sharepoint-detection-batch_${stamp}.csv`;
      triggerDownload(buildCsvReport(detections), filename, "text/csv");
      console.log(`%c⬇ Batch CSV downloaded: ${filename}`, STYLE.ok);
      return filename;
    } catch (e) {
      console.warn("Could not auto-download batch CSV:", e.message);
      return null;
    }
  }

  async function runSingle() {
    const d = await runDetection(location.href);
    renderConsoleReport(d);
    downloadTextReport(d);

    await new Promise(r => setTimeout(r, 400));
    downloadJsonReport(d);

    window.__spDetectorLastResult = d;
    window.__spDetectorReport = () => buildReportText(d);
    window.__spDetectorReportJSON = () => buildReportJSON(d);
    window.__spDetectorSummary = () => buildSummaryOnlyText(d);

    console.log("%c\nTip: copy(__spDetectorSummary()) to copy just the summary card, or __spDetectorBatch([...urls]) to scan other site collections on this same origin.", STYLE.dim);

    return d;
  }

  async function runBatch(urls, opts = {}) {
    if (!Array.isArray(urls) || urls.length === 0) {
      console.warn("__spDetectorBatch expects a non-empty array of URLs.");
      return [];
    }

    const currentOrigin = location.origin;
    const validUrls = [];
    for (const raw of urls) {
      try {
        const u = new URL(raw, location.href);
        if (u.origin !== currentOrigin) {
          console.warn(`Skipping ${raw} — different origin (${u.origin}) than the current page (${currentOrigin}). Batch mode is same-origin only (CORS + session cookies wouldn't work across origins anyway).`);
          continue;
        }
        validUrls.push(u.href);
      } catch (e) {
        console.warn(`Skipping invalid URL: ${raw}`);
      }
    }

    if (validUrls.length === 0) {
      console.warn("No valid same-origin URLs to scan.");
      return [];
    }

    console.log(`%c🔁 Running batch detection across ${validUrls.length} site(s)...`, STYLE.section);
    const out = [];
    for (const u of validUrls) {
      console.log(`%c  → ${u}`, STYLE.dim);
      const d = await runDetection(u);
      out.push(d);

      await new Promise(r => setTimeout(r, opts.delayMs ?? 300));
    }

    console.log("%c\n📋 Batch Results", STYLE.section);
    console.table(out.map(d => ({
      Hostname: d.hostname,
      Path: (() => { try { return new URL(d.targetUrl).pathname; } catch { return d.targetUrl; } })(),
      Product: d.classification.product,
      Build: d.detectedBuild || "Unknown",
      "CU/PU": d.cuInfo.label,
      Confidence: d.confidence,
      WebTemplate: d.results.Web_WebTemplate || "",
      UIVersion: d.results.Web_UIVersion ?? "",
    })));

    downloadCsvReport(out);
    window.__spDetectorBatchResults = out;
    return out;
  }

  window.__spDetectorBatch = runBatch;

  await runSingle();

})();
