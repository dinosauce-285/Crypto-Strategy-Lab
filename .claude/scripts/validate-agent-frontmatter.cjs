#!/usr/bin/env node
'use strict';
// Validate every .claude/agents/*.md frontmatter against the agent contract.
// Required: name, description, model, tools. MCP tools additionally require ToolSearch.
const fs = require('fs');
const path = require('path');
const { PROJECT_DIR, parseFrontmatter } = require('./_lib.cjs');

const AGENTS_DIR = path.join(PROJECT_DIR, '.claude/agents');
const SCHEMA = require(path.join(PROJECT_DIR, '.claude/schemas/agent-frontmatter.schema.json'));
const BUILTIN_TOOLS = new Set([
  'Bash', 'Edit', 'Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch', 'Write', 'ToolSearch',
]);

function validateAgentFrontmatter(fm, fileName) {
  const errors = [];
  const stem = fileName.replace(/\.md$/, '');
  for (const field of SCHEMA.required) {
    if (fm[field] === undefined || fm[field] === '') errors.push(`missing "${field}"`);
  }
  if (fm.name !== undefined) {
    if (!new RegExp(SCHEMA.properties.name.pattern).test(String(fm.name))) errors.push('name is not kebab-case');
    if (fm.name !== stem) errors.push(`name "${fm.name}" must match filename "${stem}"`);
  }
  if (fm.description !== undefined) {
    const n = String(fm.description).length;
    if (n < SCHEMA.properties.description.minLength || n > SCHEMA.properties.description.maxLength) {
      errors.push(`description length ${n} outside ${SCHEMA.properties.description.minLength}-${SCHEMA.properties.description.maxLength}`);
    }
  }
  if (fm.model !== undefined && !SCHEMA.properties.model.enum.includes(fm.model)) {
    errors.push(`model "${fm.model}" is not one of ${SCHEMA.properties.model.enum.join(', ')}`);
  }
  if (fm.tools !== undefined) {
    if (!Array.isArray(fm.tools) || fm.tools.length < 1) {
      errors.push('tools must be a non-empty inline array');
    } else {
      for (const tool of fm.tools) {
        if (typeof tool !== 'string' || (!BUILTIN_TOOLS.has(tool) && !tool.startsWith('mcp__'))) {
          errors.push(`unknown tool "${tool}"`);
        }
      }
      if (fm.tools.some((tool) => tool.startsWith('mcp__')) && !fm.tools.includes('ToolSearch')) {
        errors.push('lists an mcp__* tool but not "ToolSearch"');
      }
    }
  }
  return errors;
}

function main() {
  if (!fs.existsSync(AGENTS_DIR)) {
    console.log('validate-agent-frontmatter: no agents dir — ok');
    return;
  }
  const problems = [];
  let count = 0;
  for (const entry of fs.readdirSync(AGENTS_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const rel = `.claude/agents/${entry.name}`;
    let fm;
    try {
      fm = parseFrontmatter(fs.readFileSync(path.join(AGENTS_DIR, entry.name), 'utf8'), rel);
    } catch (e) {
      problems.push(e.message);
      continue;
    }
    if (!fm) {
      problems.push(`${rel}: no frontmatter block`);
      continue;
    }
    for (const error of validateAgentFrontmatter(fm, entry.name)) problems.push(`${rel}: ${error}`);
    count++;
  }
  if (problems.length) {
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    console.error(`\nvalidate-agent-frontmatter: ${problems.length} problem(s).`);
    process.exit(1);
  }
  console.log(`validate-agent-frontmatter: ${count} agent(s) ok`);
}

if (require.main === module) main();

module.exports = { validateAgentFrontmatter, BUILTIN_TOOLS };
