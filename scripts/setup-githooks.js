#!/usr/bin/env node
/**
 * Enable the repo's versioned git hooks by pointing core.hooksPath at
 * `.githooks`. Wired into each package's `prepare` script so a fresh clone gets
 * the pre-commit / pre-push gates automatically on the first `pnpm install`.
 *
 * Safe + idempotent: silently does nothing outside a git checkout, when the
 * .githooks dir is absent, or when core.hooksPath is already set. Never fails
 * an install (always exits 0).
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function git(args) {
  return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
}

try {
  const root = git('rev-parse --show-toplevel');
  if (!fs.existsSync(path.join(root, '.githooks'))) process.exit(0);

  let current = '';
  try {
    current = git('config --local --get core.hooksPath');
  } catch {
    /* not set yet */
  }
  if (current === '.githooks') process.exit(0);

  execSync('git config core.hooksPath .githooks');
  console.log('[setup-githooks] Enabled versioned git hooks (core.hooksPath=.githooks)');
} catch {
  // Not a git checkout / git unavailable — skip without failing the install.
}
