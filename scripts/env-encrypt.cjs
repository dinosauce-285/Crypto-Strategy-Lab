#!/usr/bin/env node
'use strict';
// Encrypt the secret env files with age. Never prints plaintext or a secret value.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { IDENTITY, TARGETS } = require('./env-targets.cjs');

const force = process.argv.includes('--force');

function fail(message) {
  console.error(`[env-encrypt] ${message}`);
  process.exit(1);
}

function requireAge() {
  try {
    execFileSync('age', ['--version'], { stdio: 'ignore', shell: false });
  } catch {
    fail('age is required — install it and put it on PATH. See README.');
  }
}

requireAge();
if (!fs.existsSync(IDENTITY)) {
  fail('Missing .env.key. Create it with `age-keygen -o .env.key`, and never commit it.');
}

let recipient;
try {
  recipient = execFileSync('age-keygen', ['-y', IDENTITY], { encoding: 'utf8', shell: false }).trim();
} catch {
  fail('Could not derive the age recipient from .env.key.');
}

let count = 0;
for (const target of TARGETS) {
  if (!fs.existsSync(target.plain)) continue;
  if (fs.existsSync(target.encrypted) && !force) {
    fail(`${path.relative(process.cwd(), target.encrypted)} already exists — review it, then rerun with --force.`);
  }
  fs.mkdirSync(path.dirname(target.encrypted), { recursive: true });
  try {
    execFileSync('age', ['--encrypt', '--recipient', recipient, '--output', target.encrypted, target.plain], {
      stdio: ['ignore', 'ignore', 'inherit'],
      shell: false,
    });
  } catch {
    fail(`Encryption failed for "${target.name}".`);
  }
  console.log(`[env-encrypt] ${target.name} -> ${path.relative(process.cwd(), target.encrypted)}`);
  count++;
}

if (count === 0) fail('No plaintext env file exists; nothing was encrypted.');
