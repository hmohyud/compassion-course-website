#!/usr/bin/env node
/**
 * Recolor the website lessons so each week's color matches the WORKBOOK's
 * per-week color. Ports the exact generator from
 * .local-workbook/build-workbook.cjs (golden-angle hue, muted saturation,
 * auto-darkened for white-text contrast) and rewrites each themed lesson's
 * --wk-primary / --wk-primary-dark / --wk-hero-a / --wk-hero-b / --wk-tint.
 * --wk-accent (gold) is left as-is.
 *
 * Only lessons that use the --wk color system are touched (weeks 5-52 except
 * 10 & 22). The 6 carried-over lessons (1,2,3,4,10,22) use a different CSS and
 * are skipped. CSS-only change → lesson text is unchanged → audio hashes intact.
 *
 * Usage: node scripts/recolor-lessons-to-workbook.cjs [--dry-run]
 * Then upload with: node scripts/upload-customized-lessons.py ... (see README)
 */
const fs = require('fs');
const path = require('path');

// ── workbook color generator (keep identical to build-workbook.cjs) ──────────
const HUE_BASE = 36.5, GOLDEN_ANGLE = 137.508, WEEK_SAT = 0.30, CONTRAST_MIN = 4.8;
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return to(r) + to(g) + to(b);
}
function relLum(hex) {
  const ch = (i) => { const c = parseInt(hex.substr(i, 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
}
function whiteContrast(hex) { return 1.05 / (relLum(hex) + 0.05); }
function settleTone(hue, sat, lStart) {
  let l = lStart, hex = hslToHex(hue, sat, l);
  while (l > 0.13 && whiteContrast(hex) < CONTRAST_MIN) { l -= 0.02; hex = hslToHex(hue, sat, l); }
  return { hex, l };
}
function weekColor(n) {
  const hue = (HUE_BASE + n * GOLDEN_ANGLE) % 360;
  const p = settleTone(hue, WEEK_SAT, 0.46);
  return { primary: p.hex, dark: hslToHex(hue, WEEK_SAT, Math.max(0.12, p.l - 0.09)) };
}
const rgbOf = (hex) => [0, 2, 4].map((i) => parseInt(hex.substr(i, 2), 16)).join(',');

// ── rewrite lessons ──────────────────────────────────────────────────────────
const DRY = process.argv.includes('--dry-run');
const DIR = path.join(__dirname, '..', '.local-built-lessons');
let changed = 0, skipped = 0;
for (let n = 1; n <= 52; n++) {
  const f = path.join(DIR, `week-${n}.html`);
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  if (!/--wk-primary:\s*#[0-9a-fA-F]{6}/.test(s)) { skipped++; continue; } // protected / different CSS
  const { primary, dark } = weekColor(n);
  const orig = s;
  s = s.replace(/--wk-primary:\s*#[0-9a-fA-F]{6}/g, '--wk-primary: #' + primary);
  s = s.replace(/--wk-primary-dark:\s*#[0-9a-fA-F]{6}/g, '--wk-primary-dark: #' + dark);
  s = s.replace(/--wk-hero-a:\s*#[0-9a-fA-F]{6}/g, '--wk-hero-a: #' + dark);
  s = s.replace(/--wk-hero-b:\s*#[0-9a-fA-F]{6}/g, '--wk-hero-b: #' + primary);
  s = s.replace(/--wk-tint:\s*rgba\([^)]*\)/g, '--wk-tint: rgba(' + rgbOf(primary) + ',0.08)');
  if (s !== orig) {
    if (!DRY) fs.writeFileSync(f, s);
    console.log(`  W${String(n).padStart(2)}  primary #${primary}  dark #${dark}`);
    changed++;
  }
}
console.log(`\n${DRY ? '[dry-run] would recolor' : 'Recolored'} ${changed} lessons; skipped ${skipped} (no --wk system).`);
