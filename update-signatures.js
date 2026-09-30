#!/usr/bin/env node
/**
 * update-signatures.js
 *
 * Fetches Microsoft's public "SharePoint updates" release-notes page and
 * regenerates the build-number -> version signature table inside sharehorse.js.
 *
 * The signature data is written between two sentinel comments:
 *
 *   // === SHAREPOINT-SIGNATURES:START (auto-generated, do not edit by hand) ===
 *   ... generated object ...
 *   // === SHAREPOINT-SIGNATURES:END ===
 *
 * Everything outside those markers is left untouched. If sharehorse.js does not
 * yet exist, a minimal file containing just the block is created.
 *
 * No third-party dependencies: uses Node's built-in fetch (Node >= 18).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_URL =
  'https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates?accept=text/markdown';

// sharehorse.js lives next to this script.
const TARGET_FILE = path.join(__dirname, 'sharehorse.js');

const START_MARKER =
  '// === SHAREPOINT-SIGNATURES:START (auto-generated, do not edit by hand) ===';
const END_MARKER = '// === SHAREPOINT-SIGNATURES:END ===';

// Section heading -> short product key used in the output.
const SECTIONS = [
  { heading: 'SharePoint Server Subscription Edition update history', product: 'Subscription Edition' },
  { heading: 'SharePoint 2019 update history', product: '2019' },
  { heading: 'SharePoint 2016 update history', product: '2016' },
  { heading: 'SharePoint 2013 update history', product: '2013' },
  { heading: 'SharePoint 2010 update history', product: '2010' },
];

async function fetchMarkdown(url) {
  const res = await fetch(url, {
    headers: {
      // A UA keeps some CDNs happy; the endpoint itself is public.
      'User-Agent': 'sharehorse-signature-updater (+github-actions)',
      Accept: 'text/markdown, text/plain, */*',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: HTTP ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/**
 * Split the page into { product: sectionText } using the "## <heading>" markers.
 */
function splitSections(md) {
  const out = {};
  for (let i = 0; i < SECTIONS.length; i++) {
    const { heading, product } = SECTIONS[i];
    const startIdx = md.indexOf(`## ${heading}`);
    if (startIdx === -1) continue;
    // End at the next "## " heading after this one.
    const rest = md.slice(startIdx + heading.length + 3);
    const nextIdx = rest.indexOf('\n## ');
    const body = nextIdx === -1 ? rest : rest.slice(0, nextIdx);
    out[product] = body;
  }
  return out;
}

const BUILD_RE = /\b(\d{2}\.\d+\.\d+\.\d+)\b/g; // e.g. 16.0.20326.20136 / 15.0.4481.1005
const KB_RE = /KB\s*([0-9]{6,7})/g; // "KB 5002908" (with or without a link)

/**
 * Parse one section's markdown table into signature rows.
 * Returns an array of { build, version, kbs:[...], date, product }.
 * The FIRST build number in the Version cell is treated as the canonical build.
 */
function parseSection(sectionText, product) {
  const rows = [];
  const lines = sectionText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    // Skip header and separator rows.
    if (/Package Name/i.test(trimmed)) continue;
    if (/^\|[\s:|-]+\|?$/.test(trimmed)) continue;

    const cells = trimmed.split('|').map((c) => c.trim());
    // cells[0] is empty (leading pipe). Expect: '', pkg, kb, version, date, ''
    if (cells.length < 5) continue;
    const kbCell = cells[2] || '';
    const versionCell = cells[3] || '';
    const dateCell = cells[4] || '';

    const builds = versionCell.match(BUILD_RE);
    if (!builds || builds.length === 0) continue;
    const build = builds[0];

    const kbs = [];
    let m;
    KB_RE.lastIndex = 0;
    while ((m = KB_RE.exec(kbCell)) !== null) kbs.push(m[1]);

    const date = dateCell.replace(/\s+/g, ' ').trim();
    if (!date) continue;

    rows.push({ build, version: build, kbs, date, product });
  }
  return rows;
}

function buildSignatureObject(md) {
  const sections = splitSections(md);
  const data = {};
  let total = 0;
  for (const { product } of SECTIONS) {
    if (!sections[product]) continue;
    const rows = parseSection(sections[product], product);
    for (const row of rows) {
      // Build numbers are unique across products in practice (major version
      // differs: 16.x vs 15.x vs 14.x). First occurrence wins.
      if (!data[row.build]) {
        data[row.build] = {
          product: row.product,
          date: row.date,
          kbs: row.kbs,
        };
        total++;
      }
    }
  }
  if (total === 0) {
    throw new Error('Parsed 0 signatures — page layout may have changed. Aborting.');
  }
  return { data, total };
}

function renderBlock(data, total) {
  const generatedAt = new Date().toISOString();
  const lines = [];
  lines.push(START_MARKER);
  lines.push(`// Source: https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates`);
  lines.push(`// Generated: ${generatedAt}`);
  lines.push(`// Entries: ${total}  (build number -> { product, release date, KB numbers })`);
  lines.push('const SHAREPOINT_SIGNATURES = {');

  // Sort builds descending so newest releases are near the top and diffs are readable.
  const builds = Object.keys(data).sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 4; i++) {
      if (pa[i] !== pb[i]) return pb[i] - pa[i];
    }
    return 0;
  });

  for (const build of builds) {
    const e = data[build];
    const kbs = e.kbs.map((k) => `"${k}"`).join(', ');
    lines.push(
      `  ${JSON.stringify(build)}: { product: ${JSON.stringify(e.product)}, ` +
        `date: ${JSON.stringify(e.date)}, kb: [${kbs}] },`
    );
  }

  lines.push('};');
  lines.push('');
  lines.push('if (typeof module !== "undefined" && module.exports) {');
  lines.push('  module.exports = SHAREPOINT_SIGNATURES;');
  lines.push('}');
  lines.push(END_MARKER);
  return lines.join('\n');
}

function writeIntoTarget(block) {
  let content;
  if (fs.existsSync(TARGET_FILE)) {
    content = fs.readFileSync(TARGET_FILE, 'utf8');
  } else {
    content = `// sharehorse.js\n// SharePoint version fingerprinting helper.\n\n${START_MARKER}\n${END_MARKER}\n`;
  }

  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = content.slice(0, startIdx);
    const after = content.slice(endIdx + END_MARKER.length);
    content = before + block + after;
  } else {
    // No markers present: append the block at the end.
    content = content.replace(/\s*$/, '\n') + '\n' + block + '\n';
  }

  fs.writeFileSync(TARGET_FILE, content, 'utf8');
}

async function main() {
  const md = await fetchMarkdown(SOURCE_URL);
  const { data, total } = buildSignatureObject(md);
  const block = renderBlock(data, total);
  writeIntoTarget(block);
  console.log(`Wrote ${total} SharePoint signatures into ${TARGET_FILE}`);
}

main().catch((err) => {
  console.error('update-signatures failed:', err.message);
  process.exit(1);
});
