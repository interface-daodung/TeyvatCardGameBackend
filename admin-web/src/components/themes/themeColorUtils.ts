export function hexToHsl(hex: string): [number, number, number] {
  const h6 = hex.replace('#', '').slice(0, 6);
  const r = parseInt(h6.slice(0, 2), 16) / 255;
  const g = parseInt(h6.slice(2, 4), 16) / 255;
  const b = parseInt(h6.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
    if (h < 0) h += 360;
  }

  return [h, s * 100, l * 100];
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s));
  const lig = Math.max(0, Math.min(100, l));

  const sn = sat / 100;
  const ln = lig / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = ln - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateWarmColors(hexInput: string): [string, string] {
  const raw = hexInput.replace('#', '');
  const alpha = raw.length === 8 ? raw.slice(6) : 'ff';
  const [h, s, l] = hexToHsl(raw);

  const c2 = hslToHex(h - 24, s - 9, l + 1);
  const c3 = hslToHex(h - 33, s + 5, l - 15);

  return [`${c2}${alpha}`, `${c3}${alpha}`];
}
