#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const SOURCE_URL =
  'https://learn.microsoft.com/en-us/officeupdates/sharepoint-updates?accept=text/markdown';
const TARGET_FILE =
  process.env.SHAREHORSE_FILE || path.join(__dirname, '..', 'sharehorse.js');

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

const BUILD_RE = /\b(\d{2}\.\d+\.\d+\.\d+)\b/g;
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

function sectionBody(md, heading) {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return null;
  const rest = md.slice(start + heading.length + 3);
  const next = rest.indexOf('\n## ');
  return next === -1 ? rest : rest.slice(0, next);
}

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

function parseSection(sectionText) {
  const out = [];
  for (const raw of sectionText.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    if (/Package Name/i.test(line)) continue;
    if (/^\|[\s:|-]+\|?$/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 5) continue;
    const builds = cells[3].match(BUILD_RE);
    if (!builds) continue;
    const parsed = parseDateCell(cells[4]);
    if (!parsed) continue;
    KB_RE.lastIndex = 0;
    const kbMatch = KB_RE.exec(cells[2]);
    const kb = kbMatch ? kbMatch[1] : null;
    out.push({ build: builds[0], kb, label: parsed.label, date: parsed.date });
  }
  return out;
}

function locateProductArray(src, productKey) {
  const keyIdx = src.indexOf(`"${productKey}": [`);
  if (keyIdx === -1) throw new Error(`Product key not found: "${productKey}"`);
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
    if (!body) { console.warn(`! Section not found: "${heading}" (skipped)`); continue; }
    const rows = parseSection(body);
    if (rows.length === 0) { console.warn(`! No rows parsed for "${heading}" (skipped)`); continue; }

    const { existingBuilds, insertAt, indent } = locateProductArray(src, productKey);
    const seen = new Set();
    const fresh = [];
    for (const r of rows) {
      if (existingBuilds.has(r.build) || seen.has(r.build)) continue;
      seen.add(r.build);
      fresh.push(r);
    }
    if (fresh.length === 0) continue;
    fresh.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const block = fresh.map((e) => renderEntry(e, indent)).join('\n') + '\n';
    src = src.slice(0, insertAt) + block + src.slice(insertAt);
    added += fresh.length;
    summary.push(`  ${productKey}: +${fresh.length} (${fresh.map((f) => f.build).join(', ')})`);
  }

  if (added === 0) {
    console.log('No new SharePoint builds. BUILD_DATABASE is already current.');
    return;
  }

  const check = require('child_process').spawnSync(process.execPath, ['--check', '-'], { input: src });
  if (check.status !== 0) {
    throw new Error('Refusing to write: result failed `node --check`.\n' + check.stderr.toString());
  }
  fs.writeFileSync(TARGET_FILE, src, 'utf8');
  console.log(`Added ${added} new build(s) to BUILD_DATABASE:`);
  console.log(summary.join('\n'));
}

main().catch((err) => {
  console.error('update-signatures failed:', err.message);
  process.exit(1);
});
