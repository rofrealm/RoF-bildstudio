/* Hilfsfunktionen: Canvas, Unschärfe, Farben, Zufall. Alles läuft lokal im Browser. */

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const $ = id => document.getElementById(id);
export const uid = () => Math.random().toString(36).slice(2, 10);
export const deep = o => JSON.parse(JSON.stringify(o));

export function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}
export function ctx2d(c, read = true) {
  return c.getContext('2d', read ? { willReadFrequently: true } : undefined);
}
export function copy(src) {
  const c = cv(src.width, src.height);
  ctx2d(c).drawImage(src, 0, 0);
  return c;
}
/* Hochwertiges Verkleinern in Stufen (verhindert Treppchen bei großen Faktoren). */
export function scaled(src, max) {
  const s = Math.min(1, max / Math.max(src.width, src.height));
  return resize(src, src.width * s, src.height * s);
}
export function resize(src, w, h) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  let cur = src, cw = src.width, ch = src.height;
  while (cw / 2 > w && ch / 2 > h) {
    cw = Math.round(cw / 2); ch = Math.round(ch / 2);
    const t = cv(cw, ch), x = ctx2d(t);
    x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, cw, ch); cur = t;
  }
  const c = cv(w, h), x = ctx2d(c);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(cur, 0, 0, w, h);
  return c;
}
/* Größenbegrenzung: iPad-Safari erlaubt max. ~16,7 Mio. Pixel pro Canvas. */
export function fitLimit(w, h, maxSide, maxArea = 16e6) {
  let s = Math.min(1, maxSide / Math.max(w, h));
  if (w * h * s * s > maxArea) s = Math.sqrt(maxArea / (w * h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)), s };
}
export function getData(c) { return ctx2d(c, true).getImageData(0, 0, c.width, c.height); }
export function putData(c, d) { ctx2d(c, true).putImageData(d, 0, 0); }

/* Box-Blur (3 Durchgänge ≈ Gauß) auf RGB, optional Alpha. Laufzeit unabhängig vom Radius. */
function blurH(s, t, w, h, r, ch) {
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let c = 0; c < ch; c++) {
      let v = 0;
      for (let i = -r; i <= r; i++) v += s[row + clamp(i, 0, w - 1) * 4 + c];
      for (let x = 0; x < w; x++) {
        t[row + x * 4 + c] = v * k;
        v += s[row + Math.min(w - 1, x + r + 1) * 4 + c] - s[row + Math.max(0, x - r) * 4 + c];
      }
    }
  }
}
function blurV(s, t, w, h, r, ch) {
  const k = 1 / (2 * r + 1), st = w * 4;
  for (let x = 0; x < w; x++) {
    const col = x * 4;
    for (let c = 0; c < ch; c++) {
      let v = 0;
      for (let i = -r; i <= r; i++) v += s[clamp(i, 0, h - 1) * st + col + c];
      for (let y = 0; y < h; y++) {
        t[y * st + col + c] = v * k;
        v += s[Math.min(h - 1, y + r + 1) * st + col + c] - s[Math.max(0, y - r) * st + col + c];
      }
    }
  }
}
export function boxBlur(d, w, h, r, passes = 3, alpha = false) {
  r = Math.round(r);
  if (r < 1) return d;
  r = Math.min(r, Math.max(1, Math.floor(Math.min(w, h) / 2)));
  const tmp = new (d.constructor)(d.length);
  const ch = alpha ? 4 : 3;
  for (let k = 0; k < passes; k++) { blurH(d, tmp, w, h, r, ch); blurV(tmp, d, w, h, r, ch); }
  return d;
}
export function blurCanvas(src, r) {
  const c = copy(src);
  if (r < 0.5) return c;
  /* Schnell: auf verkleinerter Kopie weichzeichnen und hochskalieren. */
  const f = r > 12 ? Math.min(8, r / 6) : 1;
  const small = f > 1 ? resize(src, src.width / f, src.height / f) : c;
  const d = getData(small);
  boxBlur(d.data, small.width, small.height, r / f, 3, true);
  putData(small, d);
  if (f > 1) { const x = ctx2d(c); x.clearRect(0, 0, c.width, c.height); x.imageSmoothingQuality = 'high'; x.drawImage(small, 0, 0, c.width, c.height); return c; }
  return small;
}

/* Farben */
export const hexRgb = h => {
  h = (h || '#808080').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };
export function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hue2(p, q, t) {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
export function hsl2rgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [hue2(p, q, h + 1 / 3) * 255, hue2(p, q, h) * 255, hue2(p, q, h - 1 / 3) * 255];
}

/* Deterministischer Zufall: Körnung/Staub sehen in Vorschau und Export gleich aus. */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
/* Wertrauschen (glatt) für Texturen, Nebel, Papier */
export function valueNoise(w, h, cell, seed) {
  const R = rng(seed), gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = R();
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = y / cell, iy = Math.floor(fy), ty = smooth(fy - iy);
    for (let x = 0; x < w; x++) {
      const fx = x / cell, ix = Math.floor(fx), tx = smooth(fx - ix);
      const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
      out[y * w + x] = lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
    }
  }
  return out;
}

export function loadImageFromBlob(blob) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { res(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Bild konnte nicht gelesen werden')); };
    img.src = url;
  });
}
export function canvasToBlob(c, type = 'image/png', q) {
  return new Promise((res, rej) => {
    try { c.toBlob(b => (b ? res(b) : rej(new Error('Export fehlgeschlagen'))), type, q); }
    catch (e) { rej(e); }
  });
}
export function slug(s) {
  return (s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bild';
}
export function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
