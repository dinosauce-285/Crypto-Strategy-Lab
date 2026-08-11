#!/usr/bin/env node
'use strict';
// PreToolUse(Bash|Read|Edit|Glob|Grep): block reads into heavy/generated directories.
// Matches on full path COMPONENTS (split on / and \), never substring — so `.git` blocks
// but `.gitignore`, `.github/`, `.githooks/` do NOT. Kill switch: HOOK_SCOUT_BLOCK=0.
const { readInput, block, allow } = require('./_hooklib.cjs');

if (process.env.HOOK_SCOUT_BLOCK === '0') allow();

const BLOCKED = new Set([
  'node_modules', 'dist', 'build', '.next', '.nuxt', '__pycache__', 'generated',
  '.venv', 'venv', '.git', 'coverage', '.cache', '.turbo', '.parcel-cache',
]);

function pathFromInput(input) {
  const tool = input.tool_name || '';
  const ti = input.tool_input || {};
  if (tool === 'Read' || tool === 'Edit' || tool === 'Write') return ti.file_path || '';
  if (tool === 'Glob') return ti.pattern || '';
  if (tool === 'Grep') return ti.path || '';
  if (tool === 'Bash') return bashTarget(ti.command || '');
  return '';
}

// For Bash, only extract a path when a blocked name is used as a real path segment
// (followed by a separator). Allow package-manager/build commands and grep invert-match.
function bashTarget(cmd) {
  if (/^([A-Za-z_][A-Za-z0-9_]*=[^ ]* |timeout [0-9]+[smh]? |time |nice )*(npm|yarn|pnpm|npx|node|poetry|pip|uv|cargo|make|docker|go|turbo)\b/.test(cmd)) return '';
  if (/(--ignore|--exclude|--skip|-not -path|--glob !|--prune|--invert-match|--invert|\s-[a-zA-Z]*v)/.test(cmd)) return '';
  const m = cmd.match(/(?:^|[ "=(])((?:node_modules|dist|build|\.next|__pycache__|\.venv|\.git|coverage|\.turbo)[\\/][^ "]*)/);
  return m ? m[1] : '';
}

function hasBlockedComponent(p) {
  return p.split(/[\\/]+/).some((seg) => BLOCKED.has(seg));
}

function main() {
  const input = readInput();
  const p = pathFromInput(input);
  if (!p) allow();
  if (hasBlockedComponent(p)) {
    block(`BLOCKED: "${p}" points into a generated/dependency directory. Read source, package.json, or docs instead. (disable: HOOK_SCOUT_BLOCK=0)`);
  }
  allow();
}

main();
