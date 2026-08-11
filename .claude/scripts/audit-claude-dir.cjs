#!/usr/bin/env node
'use strict';
// Find "orphan" files under .claude/ that nothing else references. Content files are
// self-contained; runtime files must be referenced by settings, another runtime file, a
// git hook, CI, package.json, or a skill. Exit 1 if an orphan is found.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { PROJECT_DIR } = require('./_lib.cjs');

const CLAUDE = path.join(PROJECT_DIR, '.claude');
// Files that stand on their own — never orphans by reference.
const EXEMPT = [
  /(^|\/)settings\.json$/,
  /(^|\/)SKILL\.md$/,
  /(^|\/)agents\/[^/]+\.md$/,
  /(^|\/)rules\/[^/]+\.md$/,
  /(^|\/)schemas\/[^/]+\.json$/,
  /(^|\/)plans\//,
  /(^|\/)tests\/[^/]+\.test\.cjs$/,
  /\.gitkeep$/,
];

const EXTERNAL_REFERENCE_FILES = [
  'package.json',
  'AGENTS.md',
  'CLAUDE.md',
  '.githooks/pre-commit',
  '.githooks/pre-push',
];

// This audit is about COMMITTED .claude content. Local-only files (settings.local.json,
// a skill's hook cache) are ignored by git and must not fail the push for the developer
// who happens to have them on disk.
function isGitIgnored(absolutePath) {
  try {
    execFileSync('git', ['check-ignore', '-q', absolutePath], {
      cwd: PROJECT_DIR,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false; // exit 1 = not ignored; any git failure falls back to auditing the file
  }
}

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'worktrees' || e.name === 'journals') continue;
      walk(full, acc);
    } else {
      acc.push(full);
    }
  }
}

function main() {
  if (!fs.existsSync(CLAUDE)) { console.log('audit-claude-dir: no .claude dir — ok'); return; }
  const files = [];
  walk(CLAUDE, files);
  const references = files
    .filter((f) => /\.(md|json|cjs|mjs|js|ya?ml)$/.test(f))
    .concat(EXTERNAL_REFERENCE_FILES.map((f) => path.join(PROJECT_DIR, f)).filter(fs.existsSync));
  const orphans = [];
  for (const f of files) {
    const rel = path.relative(PROJECT_DIR, f).replace(/\\/g, '/');
    if (EXEMPT.some((re) => re.test(rel))) continue;
    if (isGitIgnored(f)) continue;
    const base = path.basename(f);
    const referenced = references.some((source) =>
      source !== f && fs.readFileSync(source, 'utf8').includes(base),
    );
    if (!referenced) orphans.push(rel);
  }
  if (orphans.length) {
    for (const o of orphans) console.error(`  ✗ orphan (unreferenced): ${o}`);
    console.error(`\naudit-claude-dir: ${orphans.length} orphan(s).`);
    process.exit(1);
  }
  console.log(`audit-claude-dir: ${files.length} file(s), no orphans`);
}

main();
