#!/usr/bin/env node
'use strict';
// SubagentStop: warn (never block) if the subagent transcript contains literal tool-call
// markup — the fabrication failure mode where a model prints <function_calls> / <invoke>
// as text instead of actually calling a tool. Kill switch: HOOK_SUBAGENT_VERIFY=0.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readInput, inject, allow } = require('./_hooklib.cjs');

if (process.env.HOOK_SUBAGENT_VERIFY === '0') allow();

function trustedTranscriptPath(candidate) {
  const root = process.env.CLAUDE_TRANSCRIPTS_DIR || path.join(os.homedir(), '.claude', 'projects');
  try {
    const realRoot = fs.realpathSync(root);
    const realCandidate = fs.realpathSync(candidate);
    const rel = path.relative(realRoot, realCandidate);
    if (rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
    return realCandidate;
  } catch {
    return null;
  }
}

function main() {
  const input = readInput();
  const rawPath = input.transcript_path || (input.transcript && input.transcript.path) || '';
  const tpath = trustedTranscriptPath(rawPath);
  if (!tpath) allow();
  let text = '';
  try { text = fs.readFileSync(tpath, 'utf8'); } catch { allow(); }
  if (/<function_calls>|<invoke\s+name=|<invoke/.test(text)) {
    inject('[subagent-verify] WARNING: the subagent transcript contains literal tool-call markup — it may have FABRICATED tool calls instead of running them. Re-verify its results before trusting them.');
  }
  allow();
}

main();
