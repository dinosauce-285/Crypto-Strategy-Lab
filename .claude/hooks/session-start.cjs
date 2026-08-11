'use strict';
// SessionStart: report what is still undecided, whether either .env has drifted from
// its example, and whether a secret has leaked into the browser-side env file.
// Off switch: export HOOK_SESSION_START=0
const { readInput, inject, allow } = require('./_hooklib.cjs');
const fs = require('fs');
const path = require('path');

if (process.env.HOOK_SESSION_START === '0') allow();
readInput();

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const lines = [];

// 1. Blocking decisions still open — these gate T01/T02/T03/T11/T17.
try {
  const page = fs.readFileSync(path.join(root, 'docs/decisions-to-lock.html'), 'utf8');
  const open = (page.match(/class="slot"/g) || []).length;
  const locked = (page.match(/- locked<\/span>/g) || []).length;
  if (open > 0) {
    lines.push(`Decisions: ${locked} locked, ${open} still open (docs/decisions-to-lock.html).`);
    lines.push('Do not invent an answer to an open one — ask, then record it in docs/decisions/.');
  }
} catch { /* page not present */ }

// 2. Env drift, per app. One .env per app: server secrets in api, public values in web.
const keysOf = (rel) => {
  try {
    return fs
      .readFileSync(path.join(root, rel), 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => l.split('=')[0].trim());
  } catch {
    return null;
  }
};

for (const app of ['apps/api', 'apps/web']) {
  const example = keysOf(`${app}/.env.example`);
  const actual = keysOf(`${app}/.env`);
  if (!example) continue;
  if (!actual) {
    lines.push(`${app}/.env is missing — copy it from ${app}/.env.example.`);
    continue;
  }
  const missing = example.filter((k) => !actual.includes(k));
  if (missing.length) lines.push(`${app}/.env is missing: ${missing.join(', ')}`);
}

// 3. The boundary that makes two env files safe: everything Vite loads is inlined into
// the bundle, so a non-VITE_ name in the web env is a secret one build away from shipping.
const webKeys = keysOf('apps/web/.env') || [];
const leaked = webKeys.filter((k) => !k.startsWith('VITE_'));
if (leaked.length) {
  lines.push(
    `SECURITY: apps/web/.env contains non-VITE_ names (${leaked.join(', ')}). ` +
      'Vite inlines what it loads into the browser bundle. Move these to apps/api/.env.',
  );
}

if (!lines.length) allow();
inject(lines.join('\n'));
