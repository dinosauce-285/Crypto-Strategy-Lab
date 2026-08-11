#!/usr/bin/env node
'use strict';
// Regenerate the skill + agent picker tables in .claude/skill-index.md from frontmatter,
// between the <!-- skills:start --> / <!-- skills:end --> markers.
// `--check` exits 1 if the file would change (CI dirty-check) instead of writing.
const fs = require('fs');
const path = require('path');
const { PROJECT_DIR, parseFrontmatter } = require('./_lib.cjs');

const INDEX = path.join(PROJECT_DIR, '.claude/skill-index.md');
const SKILLS_DIR = path.join(PROJECT_DIR, '.claude/skills');
const AGENTS_DIR = path.join(PROJECT_DIR, '.claude/agents');
const START = '<!-- skills:start -->';
const END = '<!-- skills:end -->';

function collectSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const rows = [];
  for (const dir of fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!dir.isDirectory()) continue;
    const file = path.join(SKILLS_DIR, dir.name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const fm = parseFrontmatter(fs.readFileSync(file, 'utf8'), `skills/${dir.name}`) || {};
    rows.push({ name: fm.name || dir.name, when: fm.when_to_use || fm.description || '' });
  }
  return rows;
}

function collectAgents() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  const rows = [];
  for (const entry of fs.readdirSync(AGENTS_DIR, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const fm = parseFrontmatter(fs.readFileSync(path.join(AGENTS_DIR, entry.name), 'utf8'), entry.name) || {};
    rows.push({ name: fm.name || entry.name.replace(/\.md$/, ''), desc: fm.description || '' });
  }
  return rows;
}

function esc(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function buildBlock() {
  const skills = collectSkills();
  const agents = collectAgents();
  const lines = [START, ''];
  lines.push('### Skills — load the matching skill BEFORE implementing', '');
  lines.push('| Skill | When to load |', '| ----- | ------------ |');
  for (const s of skills) lines.push(`| ${esc(s.name)} | ${esc(s.when)} |`);
  if (!skills.length) lines.push('| _(none yet)_ | — |');
  lines.push('', '### Agents', '');
  lines.push('| Agent | Use for |', '| ----- | ------- |');
  for (const a of agents) lines.push(`| ${esc(a.name)} | ${esc(a.desc)} |`);
  if (!agents.length) lines.push('| _(none yet)_ | — |');
  lines.push('', END);
  return lines.join('\n');
}

function currentFile() {
  if (fs.existsSync(INDEX)) return fs.readFileSync(INDEX, 'utf8');
  return `# Skill & Agent Index\n\nAuto-generated picker tables. Do not edit between the markers — run\n\`node .claude/scripts/regen-skill-index.cjs\` instead.\n\n${START}\n${END}\n`;
}

function render() {
  const file = currentFile();
  const block = buildBlock();
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (re.test(file)) return file.replace(re, block);
  return file.trimEnd() + '\n\n' + block + '\n';
}

function main() {
  const check = process.argv.includes('--check');
  const next = render();
  const prev = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : null;
  if (check) {
    if (next !== prev) {
      console.error('regen-skill-index: .claude/skill-index.md is stale — run `node .claude/scripts/regen-skill-index.cjs`');
      process.exit(1);
    }
    console.log('regen-skill-index: skill-index.md up to date');
    return;
  }
  fs.writeFileSync(INDEX, next);
  console.log('regen-skill-index: wrote .claude/skill-index.md');
}

main();
