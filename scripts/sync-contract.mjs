import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Configurable so CI can point at a checked-out backend or a published URL.
const source = process.env.CONTRACT_SOURCE
  ?? resolve(process.cwd(), '../backend/openapi.json');

if (!existsSync(source)) {
  console.error(
    `Contract not found at ${source}\n` +
    `Run \`pnpm openapi\` in ../backend, or set CONTRACT_SOURCE.`,
  );
  process.exit(1);
}

copyFileSync(source, 'openapi.json');
execFileSync('npx', ['openapi-typescript', 'openapi.json', '-o', 'src/api/contract.gen.ts'], {
  stdio: 'inherit', shell: true,
});

const header = `/**
 * GENERATED FILE — DO NOT EDIT.
 * Produced by \`pnpm contract:sync\` from ../backend/openapi.json.
 * CI fails if regenerating this produces a diff (ADR-0011).
 */
`;
const out = 'src/api/contract.gen.ts';
writeFileSync(out, header + readFileSync(out, 'utf8'));
console.log('Contract synced.');
