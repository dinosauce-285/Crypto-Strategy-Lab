#!/usr/bin/env node
'use strict';
// PreToolUse(Write): nudge on generic/undescriptive new file names. Advisory — always
// allows. Kill switch: HOOK_DESCRIPTIVE_NAME=0.
const path = require('path');
const { readInput, inject, allow } = require('./_hooklib.cjs');

if (process.env.HOOK_DESCRIPTIVE_NAME === '0') allow();

const GENERIC = /^(index|utils?|helpers?|misc|temp|tmp|new|test|stuff|data|thing)\.[a-z]+$/i;

function main() {
  const input = readInput();
  const fp = (input.tool_input && input.tool_input.file_path) || '';
  if (!fp) allow();
  const base = path.basename(fp);
  if (GENERIC.test(base)) {
    inject(`Naming: "${base}" is generic. Prefer a name that states the file's responsibility (kebab-case for files, PascalCase for components).`);
  }
  allow();
}

main();
