'use strict';
// Shared helpers for Node hooks. All hooks: read JSON on stdin, exit 0 (allow) / 2 (block).
// Injection-safety: never build shell strings; spawn with argv arrays + shell:false.
const fs = require('fs');

function readInput() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { /* no stdin */ }
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

// Emit additionalContext for context-injecting hooks (SessionStart / UserPromptSubmit / etc.)
function inject(context) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { additionalContext: context } }));
  process.exit(0);
}

// Block a tool call: reason on stderr, exit 2.
function block(reason) {
  process.stderr.write(reason.endsWith('\n') ? reason : reason + '\n');
  process.exit(2);
}

function allow() {
  process.exit(0);
}

module.exports = { readInput, inject, block, allow };
