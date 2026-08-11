#!/usr/bin/env node
'use strict';
// SubagentStart: inject the minimal shared context every subagent needs — status protocol,
// citation/confidence rule, reports-to-disk, quality command.
// Kill switch: HOOK_SUBAGENT_INIT=0.
const { readInput, inject, allow } = require('./_hooklib.cjs');

if (process.env.HOOK_SUBAGENT_INIT === '0') allow();

function main() {
  readInput();
  inject([
    'Subagent contract:',
    '- End with exactly one status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT.',
    '- Every finding/decision needs a file:line citation and a confidence 0-100; anything < 85 is an Open Question, not a silent choice.',
    '- Long output → write a report file under the configured task-plan directory + a one-line summary.',
    '- Before editing, read the nearest app CLAUDE.md and binding constraint. Quality gate: `pnpm quality`.',
  ].join('\n'));
}

main();
