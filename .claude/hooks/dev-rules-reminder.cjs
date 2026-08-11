#!/usr/bin/env node
'use strict';
// UserPromptSubmit: rate-limited reminder of the core discipline (every ~10 prompts).
// Uses a counter file under .claude/journals/. Kill switch: HOOK_DEV_RULES=0.
const fs = require('fs');
const path = require('path');
const { readInput, inject, allow } = require('./_hooklib.cjs');
const { PROJECT_DIR } = require('../scripts/_lib.cjs');

if (process.env.HOOK_DEV_RULES === '0') allow();

const EVERY = 10;

function main() {
  readInput();
  const dir = path.join(PROJECT_DIR, '.claude/journals');
  const counter = path.join(dir, 'prompt-count');
  let n = 0;
  try { n = parseInt(fs.readFileSync(counter, 'utf8'), 10) || 0; } catch { n = 0; }
  n += 1;
  try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(counter, String(n)); } catch { /* ignore */ }
  if (n % EVERY !== 1) allow(); // fire on the 1st, 11th, 21st ...
  inject('Reminder — YAGNI/KISS/DRY, surgical changes, file:line + confidence on findings, `pnpm quality` before commit. See .claude/rules/development-rules.md.');
}

main();
