#!/usr/bin/env node
'use strict';
// Stop: optional completion chime. Cross-platform no-op unless a sound tool exists; on
// win32 jarvis' macOS afplay won't run, so this is intentionally a silent no-op there.
// Kill switch: HOOK_STOP_NOTIFY=0.
const { readInput, allow } = require('./_hooklib.cjs');

if (process.env.HOOK_STOP_NOTIFY === '0') allow();

function main() {
  readInput();
  // No portable, dependency-free sound on Windows/Git-bash; keep as a no-op hook so the
  // wiring exists and can be filled per-platform later.
  allow();
}

main();
