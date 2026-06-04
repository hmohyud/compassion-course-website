// Per-week color — ported EXACTLY from the workbook builder
// (.local-workbook/build-workbook.cjs `weekColor`) and the lessons' `--wk`
// palette, so anything in the app (e.g. the lesson loading animation) can tint
// itself to match the week the visitor is opening.
//
// Hue steps by the golden angle (~137.5°) per week so consecutive weeks land
// far apart on the wheel while all 52 stay well spread; saturation is muted and
// lightness is auto-darkened until white text clears ~4.8:1 contrast.

const HUE_BASE = 36.5;
const GOLDEN_ANGLE = 137.508;
const WEEK_SAT = 0.3;
const CONTRAST_MIN = 4.8;

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return to(r) + to(g) + to(b);
}

function relLum(hex: string): number {
  const ch = (i: number) => {
    const c = parseInt(hex.substr(i, 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
}

function whiteContrast(hex: string): number {
  return 1.05 / (relLum(hex) + 0.05);
}

function settleTone(hue: number, sat: number, lStart: number): { hex: string; l: number } {
  let l = lStart;
  let hex = hslToHex(hue, sat, l);
  while (l > 0.13 && whiteContrast(hex) < CONTRAST_MIN) {
    l -= 0.02;
    hex = hslToHex(hue, sat, l);
  }
  return { hex, l };
}

export interface WeekColor {
  /** Medium tone shared by the workbook banner/title and the lesson --wk-primary. */
  primary: string;
  /** Deeper shade of the same hue for gradients / hover ends. */
  dark: string;
}

/** Distinct, soothing color for week `n` (1..52). Returns `#RRGGBB` strings. */
export function weekColor(n: number): WeekColor {
  const hue = (HUE_BASE + n * GOLDEN_ANGLE) % 360;
  const p = settleTone(hue, WEEK_SAT, 0.46);
  const dark = hslToHex(hue, WEEK_SAT, Math.max(0.12, p.l - 0.09));
  return { primary: `#${p.hex}`, dark: `#${dark}` };
}
