#!/usr/bin/env node
'use strict';
// PreCompact: inject a compact summary (branch, git status, recent commits) so context
// survives conversation compaction. Kill switch: HOOK_PRE_COMPACT=0.
const { execFileSync } = require('child_process');
const { readInput, inject, allow } = require('./_hooklib.cjs');
const { PROJECT_DIR } = require('../scripts/_lib.cjs');

if (process.env.HOOK_PRE_COMPACT === '0') allow();

function git(args) {
  try { return execFileSync('git', args, { cwd: PROJECT_DIR, encoding: 'utf8', shell: false }).trim(); } catch { return ''; }
}

function main() {
  readInput();
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const status = git(['status', '--short']);
  const recent = git(['log', '--oneline', '-5']);
  inject([
    'Context checkpoint (pre-compaction):',
    `Branch: ${branch}`,
    'Working tree:',
    status || '(clean)',
    'Recent commits:',
    recent,
  ].join('\n'));
}

main();
