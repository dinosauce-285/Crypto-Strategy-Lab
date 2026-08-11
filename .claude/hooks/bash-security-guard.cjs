#!/usr/bin/env node
'use strict';
// PreToolUse(Bash): the non-bypassable shell security boundary.
// This guard protects secrets and the commit-helper workflow. It intentionally has no
// environment-variable kill switch. Exit 0 = allow, exit 2 = block.
const fs = require('fs');

function block() {
  process.stderr.write('[bash-security-guard] Blocked: command violates the repository secret or commit policy. Use dedicated file tools for safe files, and use scripts/commit.js for commits.\n');
  process.exit(2);
}

function allow() {
  process.exit(0);
}

function readPayload() {
  let raw;
  try { raw = fs.readFileSync(0, 'utf8'); } catch { block(); }
  if (!raw.trim()) allow();
  try { return JSON.parse(raw); } catch { block(); }
}

// Match path-like secret components while allowing the exact `.env.example` template.
const SECRET_RE = /(?:^|[\\/\s"'=:(])(?:\.env(?!\.example(?:$|[\\/\s"'=;|&()]))(?:$|[.\\/\s"'=;|&()])|\.mcp\.json(?:$|[\\/\s"'=;|&()])|(?:credentials|service-account)[^\\/\s"'=;|&()]*\.json(?:$|[\\/\s"'=;|&()])|[^\\/\s"'=;|&()]+\.(?:pem|key|p12|pfx|crt|jks)(?:$|[\\/\s"'=;|&()])|secrets(?:$|[\\/\\s"'=;|&()]))/i;
const COMMIT_RE = /(?:^|[\s;&|])git\s+commit(?:\s|$)/i;
const COMMIT_HELPER_RE = /^(?:node\s+(?:\.\/)?scripts\/commit\.js|npm\s+run\s+commit|pnpm\s+commit)(?:\s|$)/i;
const AMBIGUOUS_SHELL_RE = /(?:&&|\|\||[;|<>`]|\$\(|\r|\n)/;

function main() {
  const payload = readPayload();
  if (payload.tool_name !== 'Bash') allow();
  const command = payload.tool_input && payload.tool_input.command;
  if (typeof command !== 'string' || !command.trim()) block();

  // Direct commits and shell chains cannot bypass scripts/commit.js.
  if (COMMIT_RE.test(command) && !COMMIT_HELPER_RE.test(command.trim())) block();

  // Never allow shell syntax whose interpretation cannot be safely bounded here.
  if (AMBIGUOUS_SHELL_RE.test(command)) block();

  // Secret path protection is independent of the direct file-tool deny list.
  if (SECRET_RE.test(command)) block();

  allow();
}

main();
