// Tell Node which module system each output folder uses, so the same package can
// be required by NestJS (CommonJS) and imported by Vite (ESM).
const fs = require('node:fs');
fs.writeFileSync('dist/cjs/package.json', JSON.stringify({ type: 'commonjs' }, null, 2));
fs.writeFileSync('dist/esm/package.json', JSON.stringify({ type: 'module' }, null, 2));
