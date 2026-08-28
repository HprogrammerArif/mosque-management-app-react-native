import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Every shipped locale must carry exactly the same key set as en.json — a missing key
// silently falls back to English text inside a Bangla screen, and CI is the only place
// that reliably catches that before it reaches a device (NFR-I18N-1/2).
const i18nDir = resolve(process.cwd(), 'src/i18n');
const en = JSON.parse(readFileSync(resolve(i18nDir, 'en.json'), 'utf8'));

function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => (
    typeof value === 'object' && value !== null
      ? keys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  ));
}

const enKeys = new Set(keys(en));
const locales = readdirSync(i18nDir).filter((f) => f.endsWith('.json') && f !== 'en.json');

let failed = false;
for (const file of locales) {
  const locale = JSON.parse(readFileSync(resolve(i18nDir, file), 'utf8'));
  const localeKeys = new Set(keys(locale));
  const missing = [...enKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !enKeys.has(k));

  if (missing.length > 0 || extra.length > 0) {
    failed = true;
    console.error(`${file}:`);
    for (const k of missing) console.error(`  missing: ${k}`);
    for (const k of extra) console.error(`  extra:   ${k}`);
  }
}

if (failed) {
  process.exit(1);
}
console.log(`i18n keys OK across en.json + ${locales.join(', ')}.`);
