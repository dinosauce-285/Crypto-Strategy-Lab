'use strict';
// Records live in docs/decisions/ and nowhere else. This allocates the next number,
// writes the file from the template and adds its line to the index.
//   node scripts/decision.cjs "The browser gets one push channel"  [index summary]
//   node scripts/decision.cjs --check
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'docs', 'decisions');
const INDEX = path.join(DIR, 'README.md');
const RECORD = /^(\d{4})-([a-z0-9-]+)\.md$/;
const INDEX_LINE = /^- \[(\d{4})\]\(([^)]+)\)/;
const SECTIONS = ['## Why this', '## What else we looked at', '## Trade-offs'];

const records = () =>
  fs
    .readdirSync(DIR)
    .map((name) => ({ name, match: RECORD.exec(name) }))
    .filter(({ match }) => match && match[1] !== '0000')
    .map(({ name, match }) => ({ name, number: match[1] }))
    .sort((a, b) => a.number.localeCompare(b.number));

const slugify = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

const die = (lines) => {
  for (const line of lines) console.error(line);
  process.exit(1);
};

const check = () => {
  const problems = [];
  const seen = new Map();

  for (const { name, number } of records()) {
    if (seen.has(number)) {
      problems.push(`  ${number} is used twice: ${seen.get(number)} and ${name}`);
    }
    seen.set(number, name);

    const body = fs.readFileSync(path.join(DIR, name), 'utf8');
    if (!body.startsWith('# ')) {
      problems.push(`  ${name} does not open with a title written as a choice`);
    }
    for (const section of SECTIONS) {
      const at = body.indexOf(`\n${section}`);
      if (at === -1) {
        problems.push(`  ${name} is missing "${section}"`);
        continue;
      }
      const rest = body.slice(at + section.length + 1);
      const end = rest.indexOf('\n## ');
      if (!(end === -1 ? rest : rest.slice(0, end)).trim()) {
        problems.push(`  ${name} leaves "${section}" empty`);
      }
    }
  }

  const listed = fs
    .readFileSync(INDEX, 'utf8')
    .split('\n')
    .map((line) => INDEX_LINE.exec(line))
    .filter(Boolean)
    .map((match) => match[2]);

  for (const { name } of records()) {
    if (!listed.includes(name)) problems.push(`  ${name} is not listed in README.md`);
  }
  for (const name of listed) {
    if (!fs.existsSync(path.join(DIR, name))) {
      problems.push(`  README.md lists ${name}, which does not exist`);
    }
  }

  if (problems.length) {
    die([
      '[decision] The records and their index have drifted:',
      '',
      ...problems,
      '',
      '  Every record answers why, what else, and what it costs, and every record',
      '  is listed in docs/decisions/README.md. Both, or neither is findable.',
      '',
    ]);
  }
  console.log(`[decision] ${records().length} records, index in sync`);
};

const create = (title, summary) => {
  const existing = records();
  const number = String(Number(existing[existing.length - 1]?.number ?? 0) + 1).padStart(4, '0');
  const name = `${number}-${slugify(title)}.md`;
  const file = path.join(DIR, name);
  if (fs.existsSync(file)) die([`[decision] ${name} already exists`]);

  fs.writeFileSync(
    file,
    [
      `# ${title}`,
      '',
      '## Why this',
      '',
      '',
      '## What else we looked at',
      '',
      '',
      '## Trade-offs',
      '',
      '',
    ].join('\n'),
  );

  const lines = fs.readFileSync(INDEX, 'utf8').split('\n');
  const last = lines.map((line) => INDEX_LINE.test(line)).lastIndexOf(true);
  if (last === -1) die(['[decision] README.md has no record list to add to']);
  lines.splice(last + 1, 0, `- [${number}](${name}) — ${summary}`);
  fs.writeFileSync(INDEX, lines.join('\n'));

  console.log(`[decision] docs/decisions/${name}`);
  console.log('[decision] listed in README.md — fill in all three sections before pushing');
};

const [first, second] = process.argv.slice(2);
if (first === '--check') {
  check();
} else if (!first) {
  die([
    'Usage: pnpm decision "<the decision, written as a choice>" ["index summary"]',
    '       pnpm decision --check',
  ]);
} else {
  create(first, second || first.charAt(0).toLowerCase() + first.slice(1));
}
