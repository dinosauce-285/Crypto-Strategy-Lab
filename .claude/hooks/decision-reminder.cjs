'use strict';
// PostToolUse: when a contract-shaping file is edited, remind that the change needs
// a decision record. A nudge, not a gate — it never blocks.
// Off switch: export HOOK_DECISION_REMINDER=0
const { readInput, allow } = require('./_hooklib.cjs');

if (process.env.HOOK_DECISION_REMINDER === '0') allow();

const input = readInput();
const file = input?.tool_input?.file_path || '';

// Files that define a contract between modules rather than behaviour inside one.
const CONTRACT = /(packages\/contracts\/|prisma\/schema\.prisma|prisma\.config\.ts|\.module\.ts$|\/events?\.ts$|docker-compose|\.env\.example)/;

if (file && CONTRACT.test(file)) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      additionalContext:
        `${file} shapes a contract between modules. If this change settles a decision ` +
        '(a shared type, the schema, how modules talk, a new dependency), write the record in ' +
        'docs/decisions/ as part of this change — why, what else was considered, what it costs. ' +
        'See AGENTS.md.',
    },
  }));
}
allow();
