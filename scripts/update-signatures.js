#!/usr/bin/env node
/**
 * scripts/update-signatures.js
 *
 * Keeps the BUILD_DATABASE in ../sharehorse.js current with Microsoft's public
 * "SharePoint updates" release-notes page.
 *
 * This is a MERGE, not a regenerate: existing entries (with their hand-curated
 * labels and notes like "RTM", "introduces Version 23H1", "Post EOL ...") are
 * left byte-for-byte untouched. Only build numbers that Microsoft has published
 * but that are not yet in BUILD_DATABASE get appended, in the same
 *   { build: "...", label: "<Month> <Year> CU", date: "YYYY-MM[-DD]", kb: "..." }
 * shape, at the end of the matching product array (which keeps the arrays in
 * their existing chronological order).
 *
 * If nothing new is found the file is left unchanged (byte-identical), so the
 * workflow's "commit only if changed" step produces no commit.
 *
 * No third-party dependencies: uses Node's built-in fetch (Node >= 18).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_URL =
  'https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates?accept=text/markdown';

// sharehorse.js lives one level up from this scripts/ folder.
// Override with SHAREHORSE_FILE for local testing.
const TARGET_FILE =
  process.env.SHAREHORSE_FILE || path.join(__dirname, '..', 'sharehorse.js');

// Microsoft section heading  ->  BUILD_DATABASE product key.
// SharePoint 2010/2013 sections that no longer receive updates simply yield no
// new builds, so they need no special handling. 2013 is included so a late
// out-of-band fix would still be picked up; 2010 is intentionally omitted
// because it is not a key in BUILD_DATABASE.
const SECTION_TO_PRODUCT = [
  ['SharePoint Server Subscription Edition update history', 'SharePoint Server Subscription Edition'],
  ['SharePoint 2019 update history', 'SharePoint Server 2019'],
  ['SharePoint 2016 update history', 'SharePoint Server 2016'],
  ['SharePoint 2013 update history', 'SharePoint Server 2013'],
];

const MONTHS = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
};

const BUILD_RE = /\b(\d{2}\.\d+\.\d+\.\d+)\b/g; // 16.0.20326.20136 / 15.0.4481.1005
const KB_RE = /KB\s*([0-9]{6,7})/g;

async function fetchMarkdown(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'sharehorse-signature-updater (+github-actions)',
      Accept: 'text/markdown, text/plain, */*',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

/** Extract the markdown between "## <heading>" and the next "## " heading. */
function sectionBody(md, heading) {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return null;
  const rest = md.slice(start + heading.length + 3);
  const next = rest.indexOf('\n## ');
  return next === -1 ? rest : rest.slice(0, next);
}

/**
 * Turn a Microsoft "Release Date" cell into { label, date }.
 *   "September 8, 2026" -> { label: "September 2026 CU", date: "2026-09-08" }
 *   "August 2026"       -> { label: "August 2026 CU",    date: "2026-08" }
 * Returns null if the cell can't be understood (e.g. "Service Pack 1 ...").
 */
function parseDateCell(cell) {
  const m = cell.match(/([A-Za-z]+)\s+(?:(\d{1,2}),\s*)?(\d{4})/);
  if (!m) return null;
  const monthName = m[1].toLowerCase();
  const day = m[2];
  const year = m[3];
  const mm = MONTHS[monthName];
  if (!mm) return null;
  const label = `${m[1][0].toUpperCase()}${monthName.slice(1)} ${year} CU`;
  const date = day ? `${year}-${mm}-${String(day).padStart(2, '0')}` : `${year}-${mm}`;
  return { label, date };
}

/** Parse a product section's table into [{ build, kb, label, date }]. */
function parseSection(sectionText) {
  const out = [];
  for (const raw of sectionText.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    if (/Package Name/i.test(line)) continue;      // header row
    if (/^\|[\s:|-]+\|?$/.test(line)) continue;     // separator row

    const cells = line.split('|').map((c) => c.trim()); // ['', pkg, kb, version, date, '']
    if (cells.length < 5) continue;

    const builds = cells[3].match(BUILD_RE);
    if (!builds) continue;
    const parsed = parseDateCell(cells[4]);
    if (!parsed) continue;

    let kbMatch;
    KB_RE.lastIndex = 0;
    kbMatch = KB_RE.exec(cells[2]); // first (STS / language-independent) KB
    const kb = kbMatch ? kbMatch[1] : null;

    out.push({ build: builds[0], kb, label: parsed.label, date: parsed.date });
  }
  return out;
}

/**
 * Locate a product array in sharehorse.js and return
 * { existingBuilds:Set, insertAt:number, indent:string }.
 * insertAt is the character offset of the array's closing "]" line.
 */
function locateProductArray(src, productKey) {
  const keyIdx = src.indexOf(`"${productKey}": [`);
  if (keyIdx === -1) throw new Error(`Product key not found: "${productKey}"`);

  // Find the closing bracket: the first line that is just "]" or "]," at the
  // same 4-space indent as the entries' parent.
  const closeRe = /\n(\s{4})\],?/g;
  closeRe.lastIndex = keyIdx;
  const close = closeRe.exec(src);
  if (!close) throw new Error(`Closing bracket not found for "${productKey}"`);

  const arraySlice = src.slice(keyIdx, close.index);
  const existingBuilds = new Set();
  let m;
  const re = /build:\s*"([^"]+)"/g;
  while ((m = re.exec(arraySlice)) !== null) existingBuilds.add(m[1]);

  return { existingBuilds, insertAt: close.index + 1, indent: '      ' };
}

function renderEntry(e, indent) {
  const kb = e.kb === null ? 'null' : `"${e.kb}"`;
  return `${indent}{ build: "${e.build}", label: "${e.label}", date: "${e.date}", kb: ${kb} },`;
}

async function main() {
  const md = await fetchMarkdown(SOURCE_URL);
  let src = fs.readFileSync(TARGET_FILE, 'utf8');

  let added = 0;
  const summary = [];

  for (const [heading, productKey] of SECTION_TO_PRODUCT) {
    const body = sectionBody(md, heading);
    if (!body) {
      console.warn(`! Section not found on page: "${heading}" (skipped)`);
      continue;
    }
    const rows = parseSection(body);
    if (rows.length === 0) {
      console.warn(`! No rows parsed for "${heading}" — layout may have changed (skipped)`);
      continue;
    }

    const { existingBuilds, insertAt, indent } = locateProductArray(src, productKey);

    // New builds only. De-dupe within the page, then sort ascending so the
    // array stays chronological when several are appended at once.
    const seen = new Set();
    const fresh = [];
    for (const r of rows) {
      if (existingBuilds.has(r.build) || seen.has(r.build)) continue;
      seen.add(r.build);
      fresh.push(r);
    }
    if (fresh.length === 0) continue;

    fresh.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    // Insert as whole lines immediately before the array's closing "]" line,
    // so that line stays on its own.
    const block = fresh.map((e) => renderEntry(e, indent)).join('\n') + '\n';
    src = src.slice(0, insertAt) + block + src.slice(insertAt);
    added += fresh.length;
    summary.push(`  ${productKey}: +${fresh.length} (${fresh.map((f) => f.build).join(', ')})`);
  }

  if (added === 0) {
    console.log('No new SharePoint builds. BUILD_DATABASE is already current.');
    return;
  }

  // Sanity gate: refuse to write output that isn't parseable JavaScript.
  const check = require('child_process').spawnSync(
    process.execPath,
    ['--check', '-'],
    { input: src }
  );
  if (check.status !== 0) {
    throw new Error(
      'Refusing to write: result failed `node --check`.\n' +
        check.stderr.toString()
    );
  }

  fs.writeFileSync(TARGET_FILE, src, 'utf8');
  console.log(`Added ${added} new build(s) to BUILD_DATABASE:`);
  console.log(summary.join('\n'));
}

main().catch((err) => {
  console.error('update-signatures failed:', err.message);
  process.exit(1);
});
