// Fails when a raw colour is written outside the token file.
//
// The rule it enforces is in docs/UI_CONSTRAINT.md: colours come from tokens, so a
// theme change is one file and not a search-and-replace. Deliberately path-agnostic —
// it walks src/ and needs no list of folders to keep in sync.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(process.cwd(), 'src');
const TOKEN_FILES = new Set(['src/index.css', 'src/tokens.css', 'src/theme.css']);
const EXT = new Set(['.ts', '.tsx', '.css']);

// #abc, #aabbcc, rgb(...), rgba(...), hsl(...), hsla(...), oklch(...)
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|oklch)\s*\(/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return EXT.has(path.extname(full)) ? [full] : [];
  });
}

const violations = [];
for (const file of walk(SRC)) {
  const rel = path.relative(process.cwd(), file);
  if (TOKEN_FILES.has(rel)) continue;
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('ui-tokens-allow')) return;
    const hit = line.match(COLOUR);
    if (hit) violations.push(`${rel}:${i + 1}  ${hit[0]}  ${line.trim().slice(0, 70)}`);
  });
}

if (violations.length) {
  console.error(`\nRaw colours found outside the token file (${violations.length}):\n`);
  violations.forEach((v) => console.error('  ' + v));
  console.error(
    '\nUse a token from src/index.css. If none fits, add one there.' +
      '\nFor a colour that is content rather than design, end the line with // ui-tokens-allow\n',
  );
  process.exit(1);
}
console.log('ui tokens ok — no raw colours outside the token file');
