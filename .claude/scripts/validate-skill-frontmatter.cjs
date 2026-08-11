#!/usr/bin/env node
'use strict';
// Validate every .claude/skills/*/SKILL.md frontmatter against the schema subset.
// Exit 1 on any violation. `--strict` is accepted (same behavior — fail on violation).
const fs = require('fs');
const path = require('path');
const { PROJECT_DIR, parseFrontmatter } = require('./_lib.cjs');

const SCHEMA = require(path.join(PROJECT_DIR, '.claude/schemas/skill-frontmatter.schema.json'));
const SKILLS_DIR = path.join(PROJECT_DIR, '.claude/skills');

function fail(msgs) {
  for (const m of msgs) console.error(`  ✗ ${m}`);
  console.error(`\nvalidate-skill-frontmatter: ${msgs.length} problem(s).`);
  process.exit(1);
}

function validate(fm, dirName, file) {
  const errs = [];
  const req = SCHEMA.required || [];
  for (const key of req) if (fm[key] === undefined) errs.push(`${file}: missing required "${key}"`);
  const p = SCHEMA.properties;
  if (fm.name !== undefined) {
    if (!new RegExp(p.name.pattern).test(fm.name)) errs.push(`${file}: name "${fm.name}" is not kebab-case`);
    if (fm.name !== dirName) errs.push(`${file}: name "${fm.name}" must match directory "${dirName}"`);
  }
  if (fm.description !== undefined) {
    const n = fm.description.length;
    if (n < p.description.minLength || n > p.description.maxLength) {
      errs.push(`${file}: description length ${n} outside ${p.description.minLength}-${p.description.maxLength}`);
    }
  }
  if (fm.when_to_use !== undefined) {
    const n = fm.when_to_use.length;
    if (n < p.when_to_use.minLength || n > p.when_to_use.maxLength) {
      errs.push(`${file}: when_to_use length ${n} outside ${p.when_to_use.minLength}-${p.when_to_use.maxLength}`);
    }
  }
  if (fm.category !== undefined && !p.category.enum.includes(fm.category)) {
    errs.push(`${file}: category "${fm.category}" not in [${p.category.enum.join(', ')}]`);
  }
  if (fm.keywords !== undefined) {
    if (!Array.isArray(fm.keywords)) errs.push(`${file}: keywords must be an inline array`);
    else if (fm.keywords.length > p.keywords.maxItems) errs.push(`${file}: keywords > ${p.keywords.maxItems}`);
  }
  if (fm['user-invocable'] !== undefined && !['true', 'false'].includes(String(fm['user-invocable']))) {
    errs.push(`${file}: user-invocable must be true/false`);
  }
  return errs;
}

function main() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('validate-skill-frontmatter: no skills dir — ok');
    return;
  }
  const problems = [];
  let count = 0;
  for (const dir of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const file = path.join(SKILLS_DIR, dir.name, 'SKILL.md');
    const rel = `.claude/skills/${dir.name}/SKILL.md`;
    if (!fs.existsSync(file)) { problems.push(`${rel}: missing SKILL.md`); continue; }
    let fm;
    try {
      fm = parseFrontmatter(fs.readFileSync(file, 'utf8'), rel);
    } catch (e) {
      problems.push(e.message);
      continue;
    }
    if (!fm) { problems.push(`${rel}: no frontmatter block`); continue; }
    problems.push(...validate(fm, dir.name, rel));
    count++;
  }
  if (problems.length) fail(problems);
  console.log(`validate-skill-frontmatter: ${count} skill(s) ok`);
}

main();
