#!/usr/bin/env node
'use strict';
// UserPromptSubmit: light context detection. If the prompt names a task id or asks for
// implementation, nudge toward the branch/plan discipline. Advisory only, never blocks.
// Off switch: export HOOK_USER_PROMPT=0
const { readInput, inject, allow } = require('./_hooklib.cjs');

if (process.env.HOOK_USER_PROMPT === '0') allow();

const TASK_RE = /\b(T(?:0[1-9]|1[0-9]|2[0-9]))\b/;
const IMPL_RE = /\b(implement|add|build|create|refactor|fix|migrate|wire)\b/i;

const input = readInput();
const prompt = input.prompt || '';
const notes = [];

const task = prompt.match(TASK_RE);
if (task) {
  notes.push(
    `Task ${task[1]} — read its row in docs/project-breakdown.html first: it states what ` +
      `"done" means, which part of the brief demands it, and what is left to decide. ` +
      `Branch: ${task[1]}-<short-name>.`,
  );
}
if (IMPL_RE.test(prompt)) {
  notes.push(
    'Implementation request: if it touches more than one module or shapes a contract, plan ' +
      'first (planner agent). If it settles a decision, the record in docs/decisions/ ships ' +
      'with the change.',
  );
}

if (!notes.length) allow();
inject(notes.join('\n'));
