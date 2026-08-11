#!/usr/bin/env node
'use strict';
// PostToolUse(Write|Edit): format the edited file. BACKEND-ONLY — only apps/api has a
// real formatter (prettier + .prettierrc). FE/shop have no prettier config, so their files
// are skipped (the lint gate still covers them). Kill switch: HOOK_AUTO_FORMAT=0.
const path = require('path');
const { execFileSync } = require('child_process');
const { readInput, allow } = require('./_hooklib.cjs');
const { PROJECT_DIR, containedRealPath } = require('../scripts/_lib.cjs');

if (process.env.HOOK_AUTO_FORMAT === '0') allow();

function main() {
  const input = readInput();
  const fp = (input.tool_input && input.tool_input.file_path) || '';
  if (!fp) allow();

  // Injection-safety: resolve + confirm containment inside the repo (rejects symlink escapes).
  const real = containedRealPath(fp);
  if (!real) allow(); // outside repo — do not touch

  const rel = path.relative(PROJECT_DIR, real).replace(/\\/g, '/');
  const beDir = path.join(PROJECT_DIR, 'apps/api');
  // Only backend .ts/.tsx files, and only if they live under apps/api.
  if (!rel.startsWith('apps/api/') || !/\.(ts|tsx)$/.test(rel)) allow();

  try {
    // argv array, shell:false (default for execFileSync) — path is a single inert argument.
    execFileSync('pnpm', ['exec', 'prettier', '--write', real], { cwd: beDir, stdio: 'ignore', shell: false });
  } catch {
    // formatter failure must never block an edit — just skip.
  }
  allow();
}

main();
