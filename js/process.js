/* Bildverarbeitung: Filter + Anpassen + HSL + Kurven + Selektiv.
   Radien werden relativ zur Bildgröße berechnet, damit Vorschau und Export gleich aussehen. */
import { cv, ctx2d, copy, boxBlur, getData, putData, hexRgb, rgb2hsl, hsl2rgb, rng, valueNoise, clamp, resize } from './util.js';
import { FILTERS, PKEYS } from './data.js';

export function effectiveParams(st) {
  const f = st.filter && FILTERS[st.filter.id], a = st.filter ? st.filter.amount / 100 : 0, p = {};
  for (const k of PKEYS) p[k] = (f && f[k] ? f[k] * a : 0) + (st.adj[k] || 0);
  p.gs = f && f.gs || '#808080'; p.gh = f && f.gh || '#808080'; p.grade = f && f.grade ? f.grade * a : 0;
  p.mono = f && f.mono ? f.mono * a : 0; p.sepia = f && f.sepia ? f.sepia * a : 0;
  p.leak = (f && f.leak ? f.leak * a : 0);
  p.lightDir = st.adj.lightDir || 'l';
  return p;
}

/* Kurve: monotone kubische Interpolation → 256er-Tabelle */
export function curveLut(pts) {
  const lut = new Uint8ClampedArray(256);
  const P = [...pts].sort((a, b) => a[0] - b[0]);
  const n = P.length;
  if (n < 2) { for (let i = 0; i < 256; i++) lut[i] = i; return lut; }
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]), m = new Array(n), dk = [];
  for (let i = 0; i < n - 1; i++) dk.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m[0] = dk[0]; m[n - 1] = dk[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = dk[i - 1] * dk[i] <= 0 ? 0 : (dk[i - 1] + dk[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (dk[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / dk[i], b = m[i + 1] / dk[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * dk[i]; m[i + 1] = t * b * dk[i]; }
  }
  for (let v = 0; v < 256; v++) {
    const x = v / 255;
    let y;
    if (x <= xs[0]) y = ys[0];
    else if (x >= xs[n - 1]) y = ys[n - 1];
    else {
      let i = 0; while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      y = (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    }
    lut[v] = clamp(Math.round(y * 255), 0, 255);
  }
  return lut;
}
const isIdentity = pts => pts.length === 2 && pts[0][0] === 0 && pts[0][1] === 0 && pts[1][0] === 1 && pts[1][1] === 1;
export function curvesActive(c) { return c && ['rgb', 'r', 'g', 'b'].some(k => c[k] && !isIdentity(c[k])); }

/* HSL: 8 Farbbereiche wie in mobilen Editoren */
export const HSL_BANDS = [['red', 'Rot', 0, '#e5484d'], ['orange', 'Orange', 30, '#f08c2e'], ['yellow', 'Gelb', 58, '#f5d90a'], ['green', 'Grün', 120, '#46a758'],
  ['aqua', 'Cyan', 185, '#05a2c2'], ['blue', 'Blau', 225, '#3e63dd'], ['purple', 'Lila', 275, '#8e4ec6'], ['magenta', 'Magenta', 320, '#d6409f']];
export function hslActive(h) { return h && HSL_BANDS.some(([k]) => h[k] && (h[k].h || h[k].s || h[k].l)); }

function unsharp(d, w, h, r, amt) {
  if (!amt) return;
  const b = new Uint8ClampedArray(d);
  boxBlur(b, w, h, Math.max(1, r), 3);
  for (let i = 0; i < d.length; i += 4) {
    d[i] += amt * (d[i] - b[i]); d[i + 1] += amt * (d[i + 1] - b[i + 1]); d[i + 2] += amt * (d[i + 2] - b[i + 2]);
  }
}
function bloomMap(d, w, h, thr, gain, r) {
  const g = new Uint8ClampedArray(d.length);
  for (let i = 0; i < d.length; i += 4) {
    g[i] = (d[i] - thr) * gain; g[i + 1] = (d[i + 1] - thr) * gain; g[i + 2] = (d[i + 2] - thr) * gain; g[i + 3] = 255;
  }
  boxBlur(g, w, h, r, 3);
  return g;
}
/* Lichtstrahlen (Tyndall): helle Bereiche radial zur Lichtquelle verwischen, auf kleiner Kopie */
function raysMap(src, w, h, pt) {
  const s = Math.min(1, 360 / Math.max(w, h)), sw = Math.max(1, Math.round(w * s)), sh = Math.max(1, Math.round(h * s));
  const small = resize(src, sw, sh), sd = getData(small).data;
  const m = new Float32Array(sw * sh);
  for (let i = 0, j = 0; i < sd.length; i += 4, j++) { const l = (0.3 * sd[i] + 0.59 * sd[i + 1] + 0.11 * sd[i + 2]) / 255; m[j] = l > 0.62 ? (l - 0.62) / 0.38 : 0; }
  const out = new Float32Array(sw * sh), lx = pt.x * sw, ly = pt.y * sh, N = 40;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    let acc = 0, wsum = 0;
    for (let k = 0; k < N; k++) {
      const t = k / N, px = Math.round(x + (lx - x) * t * 0.9), py = Math.round(y + (ly - y) * t * 0.9);
      if (px < 0 || py < 0 || px >= sw || py >= sh) break;
      const wt = 1 - t * 0.6; acc += m[py * sw + px] * wt; wsum += wt;
    }
    out[y * sw + x] = wsum ? acc / wsum : 0;
  }
  const c = cv(sw, sh), id = ctx2d(c).createImageData(sw, sh);
  for (let j = 0, i = 0; j < out.length; j++, i += 4) { const v = clamp(out[j] * 3.2, 0, 1) * 255; id.data[i] = v; id.data[i + 1] = v * 0.94; id.data[i + 2] = v * 0.82; id.data[i + 3] = 255; }
  boxBlur(id.data, sw, sh, 2, 2);
  ctx2d(c).putImageData(id, 0, 0);
  return getData(resize(c, w, h)).data;
}

let canvasTexCache = null;
function canvasTexture(w, h) {
  const key = w + 'x' + h;
  if (canvasTexCache && canvasTexCache.key === key) return canvasTexCache.t;
  const t = new Float32Array(w * h), R = rng(77), sc = Math.max(1, Math.max(w, h) / 900);
  const n = valueNoise(w, h, Math.max(2, 3 * sc), 9);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wx = Math.sin(x / (1.6 * sc)) * Math.sin(y / (1.6 * sc) + (Math.floor(x / (3.2 * sc)) % 2) * 1.5);
    t[y * w + x] = wx * 0.6 + (n[y * w + x] - 0.5) * 0.8 + (R() - 0.5) * 0.3;
  }
  canvasTexCache = { key, t };
  return t;
}

/* Hauptfunktion: liefert eine neue Canvas mit allen globalen Anpassungen */
export function processImage(src, st) {
  const p = effectiveParams(st);
  const w = src.width, h = src.height, sc = Math.max(w, h) / 1000;
  const out = copy(src), im = getData(out), d = im.data;

  /* --- räumliche Operationen --- */
  if (p.blur > 0) boxBlur(d, w, h, Math.max(1, p.blur / 100 * 18 * sc), 3);
  if (p.structure > 0) unsharp(d, w, h, 12 * sc, p.structure / 100 * 0.8);
  else if (p.structure < 0) { const b = new Uint8ClampedArray(d); boxBlur(b, w, h, 6 * sc, 3); const a = -p.structure / 100 * 0.8; for (let i = 0; i < d.length; i++) d[i] += (b[i] - d[i]) * a; }
  if (p.texture) unsharp(d, w, h, 3.5 * sc, p.texture / 100 * 0.9);
  if (p.refine > 0) unsharp(d, w, h, 0.8 * sc, p.refine / 100 * 1.1);
  if (p.sharpness > 0) unsharp(d, w, h, 1.3 * sc, p.sharpness / 100 * 1.6);
  if (p.mood > 0) unsharp(d, w, h, 8 * sc, p.mood / 100 * 0.35);
  const glow = p.glow > 0 ? bloomMap(d, w, h, 140, 2.4, 16 * sc) : null;
  const shine = p.shine > 0 ? bloomMap(d, w, h, 185, 3.2, 5 * sc) : null;
  const amb = p.ambient > 0 ? (() => { const g = new Uint8ClampedArray(d); boxBlur(g, w, h, 40 * sc, 3); return g; })() : null;
  const rays = p.rays > 0 ? raysMap(src, w, h, st.adj.raysPt || { x: 0.2, y: 0 }) : null;
  const ctex = p.canvas > 0 ? canvasTexture(w, h) : null;
  let localLum = null;
  if (p.brilliance) {
    const L = new Uint8ClampedArray(d.length);
    for (let i = 0; i < d.length; i += 4) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; L[i] = L[i + 1] = L[i + 2] = l; }
    boxBlur(L, w, h, 25 * sc, 3); localLum = L;
  }

  /* --- Tabellen --- */
  const curves = st.curves;
  let cl = null;
  if (curvesActive(curves)) {
    const m = curveLut(curves.rgb), r = curveLut(curves.r), g = curveLut(curves.g), b = curveLut(curves.b);
    cl = [new Uint8ClampedArray(256), new Uint8ClampedArray(256), new Uint8ClampedArray(256)];
    for (let v = 0; v < 256; v++) { cl[0][v] = r[m[v]]; cl[1][v] = g[m[v]]; cl[2][v] = b[m[v]]; }
  }
  const hslOn = hslActive(st.hsl);
  const bands = hslOn ? HSL_BANDS.map(([k, , c]) => ({ c, h: (st.hsl[k] || {}).h || 0, s: (st.hsl[k] || {}).s || 0, l: (st.hsl[k] || {}).l || 0 })).filter(b => b.h || b.s || b.l) : null;

  const ev = Math.pow(2, p.exposure / 50), br = p.brightness * 0.8;
  const con = p.contrast >= 0 ? 1 + p.contrast / 100 * 1.2 : 1 + p.contrast / 100 * 0.8;
  const temp = p.temperature * 0.6, tint = p.tint * 0.6, sat = Math.max(0, 1 + p.saturation / 100), vib = p.vibrance / 100;
  const fade = Math.max(0, p.fade) * 0.6, sh = p.shadows * 0.9, hl = p.highlights * 0.9, grain = p.grain * 0.6, vig = p.vignette / 100;
  const mono = clamp(p.mono / 100, 0, 1), sep = clamp(p.sepia / 100, 0, 1);
  const gk = p.glow / 100 * 0.9, sk = p.shine / 100, ak = p.ambient / 100 * 0.55, rk = p.rays / 100 * 1.1, lk = p.leak / 100;
  const ga = p.grade / 100 * 0.9, gs = hexRgb(p.gs), gh = hexRgb(p.gh);
  const gso = gs.map(v => v - (gs[0] + gs[1] + gs[2]) / 3), gho = gh.map(v => v - (gh[0] + gh[1] + gh[2]) / 3);
  const fl = p.flash / 100, ld = p.light / 100, mood = p.mood / 100, fresh = p.fresh / 100, film = p.film / 100, bri = p.brilliance / 100, ctk = p.canvas / 100;
  let hm = null;
  if (p.hue) {
    const a = p.hue * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    hm = [.213 + c * .787 - s * .213, .715 - c * .715 - s * .715, .072 - c * .072 + s * .928, .213 - c * .213 + s * .143, .715 + c * .285 + s * .140, .072 - c * .072 - s * .283, .213 - c * .213 - s * .787, .715 - c * .715 + s * .715, .072 + c * .928 + s * .072];
  }
  const sel = (st.selective || []).filter(s => s.b || s.c || s.s || s.t);
  const R = rng(1234), cx = w / 2, cy = h / 2, diag = Math.hypot(w, h);
  const dir = p.lightDir;

  for (let y = 0; y < h; y++) {
    const dy = (y - cy) / cy, ny = y / h;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, nx = x / w;
      let r = d[i] * ev, g = d[i + 1] * ev, b = d[i + 2] * ev;
      r += temp + br; g += br - tint; b += br - temp;
      let l = (0.299 * r + 0.587 * g + 0.114 * b) / 255; l = l < 0 ? 0 : l > 1 ? 1 : l;
      let add = sh * (1 - l) * (1 - l) + hl * l * l;
      if (bri) { const ll = localLum[i] / 255; add += bri * (55 * (1 - ll) * (1 - l) - 35 * ll * l); }
      r += add; g += add; b += add;
      r = (r - 128) * con + 128; g = (g - 128) * con + 128; b = (b - 128) * con + 128;
      if (bri > 0) { const k = 1 + bri * 0.18; r = (r - 128) * k + 128; g = (g - 128) * k + 128; b = (b - 128) * k + 128; }
      if (mood) { const k = 1 + mood * 0.15; r = (r - 128) * k + 128 + mood * 4; g = (g - 128) * k + 128; b = (b - 128) * k + 128 - mood * 4; }
      if (cl) { r = cl[0][r < 0 ? 0 : r > 255 ? 255 : r | 0]; g = cl[1][g < 0 ? 0 : g > 255 ? 255 : g | 0]; b = cl[2][b < 0 ? 0 : b > 255 ? 255 : b | 0]; }
      let yv = 0.299 * r + 0.587 * g + 0.114 * b;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let cs = (mx - mn) / 255; cs = cs > 1 ? 1 : cs;
      const f = sat * (1 + (vib + mood * 0.25 + fresh * 0.2) * (1 - cs)) * (1 - film * 0.2);
      r = yv + (r - yv) * f; g = yv + (g - yv) * f; b = yv + (b - yv) * f;
      if (hm) { const nr = hm[0] * r + hm[1] * g + hm[2] * b, ng = hm[3] * r + hm[4] * g + hm[5] * b, nb = hm[6] * r + hm[7] * g + hm[8] * b; r = nr; g = ng; b = nb; }
      if (bands) {
        const [hh, ss, l2] = rgb2hsl(r < 0 ? 0 : r > 255 ? 255 : r, g < 0 ? 0 : g > 255 ? 255 : g, b < 0 ? 0 : b > 255 ? 255 : b);
        if (ss > 0.02) {
          let dh = 0, ds = 0, dl = 0;
          for (const bd of bands) {
            let dd = Math.abs(hh - bd.c); if (dd > 180) dd = 360 - dd;
            const wgt = dd < 45 ? 1 - dd / 45 : 0;
            if (wgt) { dh += bd.h * 0.3 * wgt; ds += bd.s / 100 * wgt; dl += bd.l / 100 * wgt; }
          }
          if (dh || ds || dl) {
            const k = Math.min(1, ss * 2.5);
            const o = hsl2rgb(hh + dh, clamp(ss * (1 + ds), 0, 1), clamp(l2 + dl * 0.35 * k, 0, 1));
            r = o[0]; g = o[1]; b = o[2];
          }
        }
      }
      if (mono) { yv = 0.299 * r + 0.587 * g + 0.114 * b; r += (yv - r) * mono; g += (yv - g) * mono; b += (yv - b) * mono; }
      if (sep) { const tr = .393 * r + .769 * g + .189 * b, tg = .349 * r + .686 * g + .168 * b, tb = .272 * r + .534 * g + .131 * b; r += (tr - r) * sep; g += (tg - g) * sep; b += (tb - b) * sep; }
      if (ga) {
        let l3 = (0.299 * r + 0.587 * g + 0.114 * b) / 255; l3 = l3 < 0 ? 0 : l3 > 1 ? 1 : l3;
        const a1 = ga * (1 - l3), a2 = ga * l3;
        r += gso[0] * a1 + gho[0] * a2; g += gso[1] * a1 + gho[1] * a2; b += gso[2] * a1 + gho[2] * a2;
      }
      if (fresh) { const l4 = (0.299 * r + 0.587 * g + 0.114 * b) / 255; r += fresh * (-6 + 10 * l4); g += fresh * 6; b += fresh * (14 - 6 * l4); r += fresh * 10; g += fresh * 10; b += fresh * 10; }
      if (film) { const l5 = (0.299 * r + 0.587 * g + 0.114 * b) / 255; r += film * (14 * l5 - 2); g += film * 4; b += film * (10 - 14 * l5); const fk = film * 36; const k = (255 - fk) / 255; r = fk + r * k; g = fk + g * k; b = fk * 0.9 + b * k; }
      if (glow) { const gr = glow[i] * gk, gg = glow[i + 1] * gk, gb = glow[i + 2] * gk; r = 255 - (255 - r) * (255 - gr) / 255; g = 255 - (255 - g) * (255 - gg) / 255; b = 255 - (255 - b) * (255 - gb) / 255; }
      if (shine) { const gr = shine[i] * sk, gg = shine[i + 1] * sk, gb = shine[i + 2] * sk; r = 255 - (255 - r) * (255 - gr) / 255; g = 255 - (255 - g) * (255 - gg) / 255; b = 255 - (255 - b) * (255 - gb) / 255; const l6 = (0.299 * r + 0.587 * g + 0.114 * b) / 255; if (l6 > 0.6) { const k = 1 + sk * 0.35 * (l6 - 0.6); r *= k; g *= k; b *= k; } }
      if (amb) { const ar = amb[i] * ak * 1.15 + 18 * ak, ag = amb[i + 1] * ak + 8 * ak, ab = amb[i + 2] * ak * 0.85; r = 255 - (255 - r) * (255 - ar) / 255; g = 255 - (255 - g) * (255 - ag) / 255; b = 255 - (255 - b) * (255 - ab) / 255; }
      if (rays) { r += rays[i] * rk; g += rays[i + 1] * rk; b += rays[i + 2] * rk; }
      if (lk) { const dd = Math.sqrt(x * x + y * y) / diag; let t = 1 - dd / 0.75; if (t > 0) { t = t * t * lk; r += 150 * t; g += 70 * t; b += 20 * t; } }
      if (fl) { const dc = Math.hypot(nx - 0.5, (ny - 0.45) * 1.2); const t = Math.max(0, 1 - dc / 0.7); const k = 1 + fl * (0.55 * t * t - 0.15 * (1 - t)); r = (r * k - 128) * (1 + fl * 0.18) + 128; g = (g * k - 128) * (1 + fl * 0.18) + 128; b = (b * k - 128) * (1 + fl * 0.18) + 128 + fl * 8 * t; }
      if (ld) {
        let t = dir === 'l' ? 1 - nx : dir === 'r' ? nx : dir === 't' ? 1 - ny : dir === 'b' ? ny : 1 - Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) / 0.7);
        t = t * t * (3 - 2 * t);
        const k = ld > 0 ? 1 + ld * (0.55 * t - 0.25 * (1 - t)) : 1 + ld * 0.5 * t;
        r *= k; g *= k; b *= k; if (ld > 0) { r += ld * 14 * t; g += ld * 6 * t; }
      }
      if (sel.length) {
        for (const s of sel) {
          const ddx = (nx - s.x) * w, ddy = (ny - s.y) * h, rad = s.r * Math.max(w, h);
          const dist = Math.sqrt(ddx * ddx + ddy * ddy) / rad;
          if (dist >= 1) continue;
          const wt = 1 - dist * dist * (3 - 2 * dist);
          if (s.b) { const a = s.b * 0.9 * wt; r += a; g += a; b += a; }
          if (s.c) { const k = 1 + s.c / 100 * wt; r = (r - 128) * k + 128; g = (g - 128) * k + 128; b = (b - 128) * k + 128; }
          if (s.s) { const yy = 0.299 * r + 0.587 * g + 0.114 * b, k = 1 + s.s / 100 * wt; r = yy + (r - yy) * k; g = yy + (g - yy) * k; b = yy + (b - yy) * k; }
          if (s.t) { const a = s.t * 0.6 * wt; r += a; b -= a; }
        }
      }
      if (fade) { const k = (255 - fade) / 255; r = fade + r * k; g = fade + g * k; b = fade + b * k; }
      if (ctk) { const tv = ctex[y * w + x] * 26 * ctk; r += tv; g += tv; b += tv; }
      if (vig) {
        const dx = (x - cx) / cx, dist = Math.sqrt(dx * dx + dy * dy) / 1.414; let t = (dist - 0.3) / 0.7; t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t);
        if (vig > 0) { const m = 1 - vig * 0.85 * t; r *= m; g *= m; b *= m; } else { const m = -vig * 0.8 * t; r += (255 - r) * m; g += (255 - g) * m; b += (255 - b) * m; }
      }
      if (grain) { const n = (R() - 0.5) * grain; r += n; g += n; b += n; }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  }
  putData(out, im);
  return out;
}

/* Automatische Korrektur über das Histogramm */
export function autoAdjust(src) {
  const s = Math.min(1, 300 / Math.max(src.width, src.height));
  const c = resize(src, src.width * s, src.height * s), d = getData(c).data, hst = new Array(256).fill(0);
  let n = 0, sum = 0, rs = 0, bs = 0, satSum = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) continue;
    const l = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    hst[l]++; sum += l; n++; rs += d[i]; bs += d[i + 2];
    satSum += (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])) / 255;
  }
  if (!n) return {};
  const pct = q => { let a = 0; for (let i = 0; i < 256; i++) { a += hst[i]; if (a >= n * q) return i; } return 255; };
  const lo = pct(0.02), hi = pct(0.98), mean = sum / n, cl = (v, a, b) => Math.round(clamp(v, a, b));
  const cast = (rs - bs) / n;
  return {
    exposure: cl((125 - mean) / 125 * 40, -30, 40),
    contrast: cl((215 - (hi - lo)) / 3, -10, 35),
    shadows: cl(lo > 30 ? 0 : (60 - mean) / 2 + 15, 0, 35),
    highlights: cl(hi > 245 ? -20 : 0, -30, 0),
    vibrance: cl((0.35 - satSum / n) * 80, 0, 30),
    temperature: cl(-cast / 3, -20, 20),
    sharpness: 15
  };
}
