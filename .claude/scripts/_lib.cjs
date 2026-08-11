'use strict';
// Shared helpers for the .claude Node tooling. Stdlib only — no jq, no python, no deps.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || repoRoot();

function repoRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch {
    return process.cwd();
  }
}

// Run a git command, return stdout (trimmed). Args are an array — never a shell string.
function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', cwd: PROJECT_DIR, ...opts });
}

// Parse a leading YAML frontmatter block. ONE format only (see skill-frontmatter contract):
//   key: value            single-line scalar (optionally quoted)
//   key: [a, b, c]         inline array
// No block scalars (| >), no multi-line values. Throws on unsupported constructs so a bad
// file fails loudly rather than passing silently.
function parseFrontmatter(text, file) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (line === '' || /^\s*#/.test(line)) continue;
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) throw new Error(`${file}: unparseable frontmatter line: ${JSON.stringify(raw)}`);
    const key = kv[1];
    let val = kv[2];
    if (val === '|' || val === '>' || val === '|-' || val === '>-') {
      throw new Error(`${file}: block scalars (| >) are not allowed in frontmatter (key "${key}")`);
    }
    if (val.startsWith('[')) {
      if (!val.endsWith(']')) throw new Error(`${file}: multi-line arrays not allowed (key "${key}")`);
      const inner = val.slice(1, -1).trim();
      out[key] = inner === '' ? [] : inner.split(',').map((s) => unquote(s.trim()));
    } else {
      out[key] = unquote(val);
    }
  }
  return out;
}

function unquote(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// Read all of stdin as a string (hooks receive JSON here).
function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// Resolve `candidate` and confirm it stays inside PROJECT_DIR after resolving symlinks.
// For a not-yet-existing path, realpath the nearest existing ancestor then re-append the
// rest. Returns the real absolute path, or null if it escapes the repo.
function containedRealPath(candidate) {
  const abs = path.resolve(PROJECT_DIR, candidate);
  let existing = abs;
  const tail = [];
  while (!fs.existsSync(existing)) {
    tail.unshift(path.basename(existing));
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  let realExisting;
  try {
    realExisting = fs.realpathSync(existing);
  } catch {
    return null;
  }
  const real = tail.length ? path.join(realExisting, ...tail) : realExisting;
  let realRoot;
  try {
    realRoot = fs.realpathSync(PROJECT_DIR);
  } catch {
    realRoot = PROJECT_DIR;
  }
  const rel = path.relative(realRoot, real);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return real;
}

// List tracked+staged files, honoring --no-renames so a rename becomes delete+add.
function stagedFiles() {
  const out = git(['diff', '--cached', '--no-renames', '--name-only', '-z']);
  return out.split('\0').filter(Boolean);
}

function gitDir() {
  return path.resolve(PROJECT_DIR, git(['rev-parse', '--git-dir']).trim());
}

module.exports = {
  PROJECT_DIR,
  git,
  parseFrontmatter,
  unquote,
  readStdin,
  containedRealPath,
  stagedFiles,
  gitDir,
};
