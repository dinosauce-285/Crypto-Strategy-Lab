#!/usr/bin/env node
'use strict';
// Decrypt the age-encrypted env files back into place. Refuses to overwrite an existing
// plaintext file unless --force, so local edits are never silently lost.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { IDENTITY, TARGETS } = require('./env-targets.cjs');

const force = process.argv.includes('--force');

function fail(message) {
  console.error(`[env-decrypt] ${message}`);
  process.exit(1);
}

try {
  execFileSync('age', ['--version'], { stdio: 'ignore', shell: false });
} catch {
  fail('age is required — install it and put it on PATH. See README.');
}

if (!fs.existsSync(IDENTITY)) {
  fail('Missing .env.key. Ask a teammate for it over a private channel; it is never in git.');
}

let count = 0;
for (const target of TARGETS) {
  if (!fs.existsSync(target.encrypted)) continue;
  if (fs.existsSync(target.plain) && !force) {
    console.log(`[env-decrypt] ${target.name}: plaintext already exists, skipping (use --force to overwrite)`);
    continue;
  }
  fs.mkdirSync(path.dirname(target.plain), { recursive: true });
  try {
    execFileSync('age', ['--decrypt', '--identity', IDENTITY, '--output', target.plain, target.encrypted], {
      stdio: ['ignore', 'ignore', 'inherit'],
      shell: false,
    });
  } catch {
    fail(`Decryption failed for "${target.name}" — wrong key, or the file is corrupt.`);
  }
  fs.chmodSync(target.plain, 0o600);
  console.log(`[env-decrypt] ${target.name} -> ${path.relative(process.cwd(), target.plain)}`);
  count++;
}

if (count === 0) fail('No encrypted env file found under envs/.');
