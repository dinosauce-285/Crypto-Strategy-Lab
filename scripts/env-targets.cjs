'use strict';
// Fixed secret manifest. No caller-provided paths are accepted, so neither script can be
// pointed at an arbitrary file.
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IDENTITY = path.join(ROOT, '.env.key');

const TARGETS = Object.freeze([
  Object.freeze({
    name: 'api',
    plain: path.join(ROOT, 'apps', 'api', '.env'),
    encrypted: path.join(ROOT, 'envs', 'api.env.age'),
  }),
  // apps/web/.env holds VITE_* values only, which ship to the browser anyway — there is
  // nothing secret in it, so it is not encrypted. Copy it from its .env.example.
]);

module.exports = { ROOT, IDENTITY, TARGETS };
