/* Effekte. Jeder Effekt: (Quelle, Stärke 0..1, Punkt {x,y}) → neue Canvas. */
import { cv, ctx2d, copy, blurCanvas, getData, putData, rng, valueNoise, clamp, resize, hexRgb } from './util.js';

export const EFFECT_POINT_DEFAULT = { flare: { x: 0.22, y: 0.2 }, sunbeam: { x: 0.15, y: 0.02 }, zoomblur: { x: 0.5, y: 0.5 }, tiltshift: { x: 0.5, y: 0.55 }, bokeh: { x: 0.5, y: 0.5 }, kaleido: { x: 0.5, y: 0.5 } };

const SC = c => Math.max(c.width, c.height) / 1000;
function layer(src, alpha, op, draw) {
  const c = copy(src), x = ctx2d(c);
  x.globalAlpha = clamp(alpha, 0, 1); x.globalCompositeOperation = op;
  draw(x, c.width, c.height);
  return c;
}
function maskedOver(base, top, maskDraw) {
  /* top wird nur dort gezeigt, wo maskDraw deckend malt */
  const t = copy(top), x = ctx2d(t);
  x.globalCompositeOperation = 'destination-in';
  maskDraw(x, t.width, t.height);
  const out = copy(base); ctx2d(out).drawImage(t, 0, 0);
  return out;
}
function brightPoints(src, count, thr, seed) {
  const s = Math.min(1, 220 / Math.max(src.width, src.height));
  const sm = resize(src, src.width * s, src.height * s), d = getData(sm).data, w = sm.width, h = sm.height;
  const pts = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = (y * w + x) * 4, l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    if (l < thr) continue;
    let mx = true;
    for (let dy = -1; dy <= 1 && mx; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const j = ((y + dy) * w + x + dx) * 4;
      if (0.3 * d[j] + 0.59 * d[j + 1] + 0.11 * d[j + 2] > l) { mx = false; break; }
    }
    if (mx) pts.push({ x: x / w, y: y / h, l });
  }
  pts.sort((a, b) => b.l - a.l);
  /* gleichmäßig verteilen: zu nahe Punkte überspringen */
  const out = [], R = rng(seed), minD = 0.035;
  for (const p of pts) {
    if (out.length >= count) break;
    if (out.some(q => Math.hypot(q.x - p.x, q.y - p.y) < minD)) continue;
    out.push({ ...p, r: R() });
  }
  return out;
}
function glint(x, cx, cy, size, rays, color, alpha, rot = 0) {
  x.save(); x.translate(cx, cy); x.rotate(rot); x.globalAlpha = alpha;
  const g = x.createRadialGradient(0, 0, 0, 0, 0, size * 0.35);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, color.replace('A', '0.7')); g.addColorStop(1, color.replace('A', '0'));
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, size * 0.35, 0, Math.PI * 2); x.fill();
  for (let k = 0; k < rays; k++) {
    x.rotate(Math.PI * 2 / rays);
    const lg = x.createLinearGradient(0, 0, size, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0.95)'); lg.addColorStop(0.4, color.replace('A', '0.5')); lg.addColorStop(1, color.replace('A', '0'));
    x.fillStyle = lg; x.beginPath(); x.moveTo(0, -size * 0.045); x.lineTo(size, 0); x.lineTo(0, size * 0.045); x.closePath(); x.fill();
  }
  x.restore();
}
function dateStamp() {
  const d = new Date(), m = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'][d.getMonth()];
  return `${m}. ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}`;
}

const FX = {
  zoomblur(src, a, pt) {
    const w = src.width, h = src.height, c = copy(src), x = ctx2d(c), N = 14, px = pt.x * w, py = pt.y * h;
    for (let k = 1; k <= N; k++) {
      const s = 1 + a * 0.18 * k / N;
      x.globalAlpha = 1 / (k + 1);
      x.setTransform(s, 0, 0, s, px - px * s, py - py * s);
      x.drawImage(src, 0, 0);
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    return maskedOver(c, src, (m, W, H) => {
      const r = Math.max(W, H) * (0.45 - a * 0.25);
      const g = m.createRadialGradient(px, py, r * 0.25, px, py, r);
      g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); m.fillStyle = g; m.fillRect(0, 0, W, H);
    });
  },
  motion(src, a) {
    const c = copy(src), x = ctx2d(c), L = src.width * 0.05 * a, N = 16;
    for (let k = 1; k <= N; k++) { x.globalAlpha = 1 / (k + 1); x.drawImage(src, (k / N - 0.5) * L * 2, 0); }
    return c;
  },
  tiltshift(src, a, pt) {
    const b = blurCanvas(src, 14 * SC(src) * a + 1);
    return maskedOver(b, src, (m, W, H) => {
      const g = m.createLinearGradient(0, 0, 0, H), c = pt.y, bw = 0.12;
      g.addColorStop(clamp(c - bw * 2.2, 0, 1), 'rgba(0,0,0,0)'); g.addColorStop(clamp(c - bw * 0.6, 0, 1), '#000');
      g.addColorStop(clamp(c + bw * 0.6, 0, 1), '#000'); g.addColorStop(clamp(c + bw * 2.2, 0, 1), 'rgba(0,0,0,0)');
      m.fillStyle = g; m.fillRect(0, 0, W, H);
    });
  },
  bokeh(src, a, pt) {
    const b = blurCanvas(src, 18 * SC(src) * a + 1);
    return maskedOver(b, src, (m, W, H) => {
      const r = Math.max(W, H) * 0.42;
      m.save(); m.translate(pt.x * W, pt.y * H); m.scale(1, H / W > 1 ? 1.2 : 0.85);
      const g = m.createRadialGradient(0, 0, r * 0.35, 0, 0, r);
      g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); m.fillStyle = g; m.fillRect(-W * 2, -H * 2, W * 4, H * 4); m.restore();
    });
  },
  orton(src, a) {
    const b = blurCanvas(src, 12 * SC(src));
    const c = copy(src), x = ctx2d(c);
    x.globalCompositeOperation = 'screen'; x.globalAlpha = 0.55 * a; x.drawImage(b, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.3 * a; x.drawImage(b, 0, 0);
    return c;
  },
  haze(src, a) {
    return layer(src, 1, 'source-over', (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, `rgba(232,236,242,${0.55 * a})`); g.addColorStop(0.6, `rgba(232,236,242,${0.25 * a})`); g.addColorStop(1, `rgba(232,236,242,${0.08 * a})`);
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
  },
  halation(src, a) {
    const w = src.width, h = src.height, m = copy(src), d = getData(m), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2], t = clamp((l - 170) / 85, 0, 1); p[i] = 255 * t; p[i + 1] = 70 * t; p[i + 2] = 30 * t; }
    putData(m, d);
    const b = blurCanvas(m, 10 * SC(src));
    const c = copy(src), x = ctx2d(c); x.globalCompositeOperation = 'screen'; x.globalAlpha = clamp(a * 1.2, 0, 1); x.drawImage(b, 0, 0); x.drawImage(b, 0, 0);
    return c;
  },
  dusk(src, a) {
    return layer(src, a, 'soft-light', (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5a3aa0'); g.addColorStop(0.55, '#ff7a59'); g.addColorStop(1, '#2a1a40');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
  },
  bloom(src, a) {
    const b = blurCanvas(src, 20 * SC(src));
    const c = copy(src), x = ctx2d(c); x.globalCompositeOperation = 'screen'; x.globalAlpha = 0.7 * a; x.drawImage(b, 0, 0);
    return c;
  },
  dust(src, a) {
    const c = copy(src), x = ctx2d(c), w = c.width, h = c.height, R = rng(42), sc = SC(c), n = Math.round(260 * a);
    for (let i = 0; i < n; i++) {
      const light = R() > 0.35; x.fillStyle = light ? `rgba(255,250,240,${0.35 + R() * 0.5})` : `rgba(20,15,10,${0.3 + R() * 0.4})`;
      const r = (0.4 + R() * R() * 2.6) * sc; x.beginPath(); x.ellipse(R() * w, R() * h, r, r * (0.5 + R()), R() * 3, 0, Math.PI * 2); x.fill();
    }
    for (let i = 0; i < Math.round(14 * a); i++) {
      x.strokeStyle = `rgba(255,250,240,${0.2 + R() * 0.35})`; x.lineWidth = (0.4 + R()) * sc;
      const sx = R() * w, sy = R() * h, len = (40 + R() * 260) * sc;
      x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(sx + (R() - 0.5) * 30 * sc, sy + len / 2, sx + (R() - 0.5) * 20 * sc, sy + len); x.stroke();
    }
    return c;
  },
  burn(src, a) {
    return layer(src, a, 'screen', (x, w, h) => {
      const blobs = [[0.95, 0.15, '#ff3b1f'], [1.02, 0.55, '#ff9a2e'], [0.9, 0.95, '#ffd27a'], [0.05, 0.9, '#ff5a2a']];
      for (const [bx, by, col] of blobs) {
        const r = Math.max(w, h) * 0.45, g = x.createRadialGradient(bx * w, by * h, 0, bx * w, by * h, r);
        const [cr, cg, cb] = hexRgb(col); g.addColorStop(0, `rgba(${cr},${cg},${cb},0.95)`); g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        x.fillStyle = g; x.fillRect(0, 0, w, h);
      }
    });
  },
  oldphoto(src, a) {
    let c = layer(src, 0.45 * a, 'multiply', (x, w, h) => { x.fillStyle = '#d6b07a'; x.fillRect(0, 0, w, h); });
    c = layer(c, a, 'multiply', (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(90,60,30,0.85)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
    c = layer(c, 1, 'source-over', (x, w, h) => {
      const R = rng(9), sc = SC(c);
      x.strokeStyle = `rgba(255,248,230,${0.35 * a})`; x.lineWidth = 1.2 * sc;
      x.beginPath(); x.moveTo(R() * w, 0); x.lineTo(R() * w, h); x.stroke();
      x.beginPath(); x.moveTo(0, R() * h); x.bezierCurveTo(w * 0.3, R() * h, w * 0.6, R() * h, w, R() * h); x.stroke();
    });
    return FX.dust(c, a * 0.6);
  },
  leakl(src, a) { return leak(src, a, false); },
  leakr(src, a) { return leak(src, a, true); },
  flare(src, a, pt) {
    return layer(src, a, 'screen', (x, w, h) => {
      const m = Math.max(w, h), px = pt.x * w, py = pt.y * h, cx = w / 2, cy = h / 2;
      let g = x.createRadialGradient(px, py, 0, px, py, m * 0.35);
      g.addColorStop(0, 'rgba(255,250,235,1)'); g.addColorStop(0.08, 'rgba(255,220,170,0.85)'); g.addColorStop(0.4, 'rgba(255,150,80,0.25)'); g.addColorStop(1, 'rgba(255,120,60,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      g = x.createRadialGradient(px, py, m * 0.16, px, py, m * 0.2);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(160,200,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      const ghosts = [[0.4, 0.04, '120,200,255'], [0.7, 0.025, '255,160,220'], [1.15, 0.06, '160,255,180'], [1.4, 0.03, '255,210,140'], [1.75, 0.09, '140,170,255']];
      for (const [t, r, col] of ghosts) {
        const gx = px + (cx - px) * t * 1.2, gy = py + (cy - py) * t * 1.2, rr = m * r;
        g = x.createRadialGradient(gx, gy, 0, gx, gy, rr); g.addColorStop(0, `rgba(${col},0.35)`); g.addColorStop(0.8, `rgba(${col},0.18)`); g.addColorStop(1, `rgba(${col},0)`);
        x.fillStyle = g; x.beginPath(); x.arc(gx, gy, rr, 0, Math.PI * 2); x.fill();
      }
      x.globalAlpha = 0.5 * a; x.fillStyle = 'rgba(255,240,220,0.8)';
      x.fillRect(0, py - m * 0.002, w, m * 0.004);
    });
  },
  prism(src, a) {
    const w = src.width, h = src.height, off = Math.max(w, h) * 0.012 * a;
    const c = copy(src), x = ctx2d(c);
    const tint = (col, dx, dy) => { const t = copy(src), tx = ctx2d(t); tx.globalCompositeOperation = 'multiply'; tx.fillStyle = col; tx.fillRect(0, 0, w, h); x.globalCompositeOperation = 'screen'; x.globalAlpha = 0.45 * a; x.drawImage(t, dx, dy); };
    tint('#ff4060', off, -off * 0.4); tint('#4080ff', -off, off * 0.4);
    x.globalAlpha = 0.45 * a; x.globalCompositeOperation = 'screen';
    const g = x.createLinearGradient(w * 0.1, 0, w * 0.75, h);
    ['rgba(255,0,0,0)', 'rgba(255,80,80,.6)', 'rgba(255,200,60,.6)', 'rgba(80,255,120,.55)', 'rgba(60,160,255,.6)', 'rgba(180,80,255,.55)', 'rgba(180,80,255,0)'].forEach((s, i, arr) => g.addColorStop(0.3 + i / (arr.length - 1) * 0.3, s));
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    return c;
  },
  sunbeam(src, a, pt) {
    const w = src.width, h = src.height, m = Math.max(w, h), L = cv(w, h), x = ctx2d(L), R = rng(5), px = pt.x * w, py = pt.y * h;
    const toC = Math.atan2(h / 2 - py, w / 2 - px);
    for (let i = 0; i < 9; i++) {
      const ang = toC + (R() - 0.5) * 1.3, spread = 0.03 + R() * 0.05, len = m * (0.9 + R() * 0.6);
      const g = x.createLinearGradient(px, py, px + Math.cos(ang) * len, py + Math.sin(ang) * len);
      g.addColorStop(0, 'rgba(255,240,200,0.75)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(px, py);
      x.lineTo(px + Math.cos(ang - spread) * len, py + Math.sin(ang - spread) * len);
      x.lineTo(px + Math.cos(ang + spread) * len, py + Math.sin(ang + spread) * len); x.closePath(); x.fill();
    }
    const g = x.createRadialGradient(px, py, 0, px, py, m * 0.25); g.addColorStop(0, 'rgba(255,245,220,0.9)'); g.addColorStop(1, 'rgba(255,245,220,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const b = blurCanvas(L, 6 * SC(src));
    const c = copy(src), cx = ctx2d(c); cx.globalCompositeOperation = 'screen'; cx.globalAlpha = a; cx.drawImage(b, 0, 0);
    return c;
  },
  noise(src, a) {
    const c = copy(src), d = getData(c), p = d.data, R = rng(3), k = 90 * a;
    for (let i = 0; i < p.length; i += 4) { const n = (R() - 0.5) * k; p[i] += n + (R() - 0.5) * k * 0.6; p[i + 1] += n + (R() - 0.5) * k * 0.6; p[i + 2] += n + (R() - 0.5) * k * 0.6; }
    putData(c, d); return c;
  },
  duotone(src, a, pt, opt) {
    const c = copy(src), d = getData(c), p = d.data, A = hexRgb(opt?.c1 || '#2a1050'), B = hexRgb(opt?.c2 || '#ffb3c6');
    for (let i = 0; i < p.length; i += 4) {
      const l = (0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]) / 255;
      p[i] += (A[0] + (B[0] - A[0]) * l - p[i]) * a; p[i + 1] += (A[1] + (B[1] - A[1]) * l - p[i + 1]) * a; p[i + 2] += (A[2] + (B[2] - A[2]) * l - p[i + 2]) * a;
    }
    putData(c, d); return c;
  },
  posterize(src, a) {
    const c = copy(src), d = getData(c), p = d.data, lv = Math.max(2, Math.round(12 - 9 * a)), st = 255 / (lv - 1);
    for (let i = 0; i < p.length; i += 4) for (let k = 0; k < 3; k++) p[i + k] = Math.round(p[i + k] / st) * st;
    putData(c, d); return c;
  },
  sketch(src, a) {
    const w = src.width, h = src.height, g = copy(src), gd = getData(g), gp = gd.data;
    for (let i = 0; i < gp.length; i += 4) { const l = 0.3 * gp[i] + 0.59 * gp[i + 1] + 0.11 * gp[i + 2]; gp[i] = gp[i + 1] = gp[i + 2] = l; }
    putData(g, gd);
    const inv = copy(g), id = getData(inv), ip = id.data;
    for (let i = 0; i < ip.length; i += 4) { ip[i] = 255 - ip[i]; ip[i + 1] = 255 - ip[i + 1]; ip[i + 2] = 255 - ip[i + 2]; }
    putData(inv, id);
    const bl = getData(blurCanvas(inv, 4 * SC(src))).data;
    const out = copy(src), od = getData(out), op = od.data;
    for (let i = 0; i < op.length; i += 4) {
      const base = gp[i], v = bl[i] >= 255 ? 255 : Math.min(255, base * 255 / (255 - bl[i]));
      op[i] += (v - op[i]) * a; op[i + 1] += (v - op[i + 1]) * a; op[i + 2] += (v * 0.97 - op[i + 2]) * a;
    }
    putData(out, od); return out;
  },
  kira(src, a) {
    const c = FX.bloom(src, a * 0.35), x = ctx2d(c), w = c.width, h = c.height, m = Math.max(w, h);
    const pts = brightPoints(src, Math.round(10 + 50 * a), 175, 11), cols = ['rgba(255,190,240,A)', 'rgba(190,220,255,A)', 'rgba(255,240,190,A)', 'rgba(200,255,230,A)'];
    x.globalCompositeOperation = 'screen';
    pts.forEach((p, i) => glint(x, p.x * w, p.y * h, m * (0.018 + p.r * 0.04) * (0.6 + a * 0.6), 4, cols[i % 4], 0.9, p.r * 0.6));
    return c;
  },
  starfilter(src, a) {
    const c = copy(src), x = ctx2d(c), w = c.width, h = c.height, m = Math.max(w, h);
    const pts = brightPoints(src, Math.round(4 + 14 * a), 200, 21);
    x.globalCompositeOperation = 'screen';
    pts.forEach(p => glint(x, p.x * w, p.y * h, m * (0.05 + p.r * 0.07) * (0.5 + a * 0.7), 6, 'rgba(255,248,235,A)', 0.85, Math.PI / 12));
    return c;
  },
  diamond(src, a) {
    const c = copy(src), x = ctx2d(c), w = c.width, h = c.height, m = Math.max(w, h), R = rng(31);
    x.globalCompositeOperation = 'screen';
    const n = Math.round(30 + 160 * a);
    for (let i = 0; i < n; i++) {
      const px = R() * w, py = R() * h, s = m * (0.003 + R() * R() * 0.02);
      if (R() > 0.6) glint(x, px, py, s * 2.5, 4, 'rgba(255,245,255,A)', 0.8 * a + 0.2, R());
      else { const g = x.createRadialGradient(px, py, 0, px, py, s); g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, s, 0, 7); x.fill(); }
    }
    return c;
  },
  bubble(src, a) {
    const c = copy(src), x = ctx2d(c), w = c.width, h = c.height, m = Math.max(w, h), R = rng(17), n = Math.round(4 + 18 * a);
    for (let i = 0; i < n; i++) {
      const px = R() * w, py = R() * h, r = m * (0.02 + R() * 0.07);
      const g = x.createRadialGradient(px, py, r * 0.75, px, py, r);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, `rgba(180,220,255,${0.25 * a + 0.1})`); g.addColorStop(0.85, `rgba(255,170,230,${0.35 * a + 0.1})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
      x.fillStyle = `rgba(255,255,255,${0.5 * a + 0.2})`; x.beginPath(); x.ellipse(px - r * 0.4, py - r * 0.45, r * 0.18, r * 0.09, -0.7, 0, 7); x.fill();
    }
    return c;
  },
  dv(src, a) {
    const w = src.width, h = src.height, lo = resize(src, Math.min(w, 720), Math.min(w, 720) * h / w);
    let c = cv(w, h), x = ctx2d(c); x.imageSmoothingQuality = 'low'; x.drawImage(lo, 0, 0, w, h);
    x.globalAlpha = 1 - a; x.drawImage(src, 0, 0); x.globalAlpha = 1;
    const d = getData(c), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      let r = p[i], g = p[i + 1], b = p[i + 2]; const l = 0.3 * r + 0.59 * g + 0.11 * b, k = 1 + 0.35 * a;
      r = l + (r - l) * k + 8 * a; g = l + (g - l) * k + 3 * a; b = l + (b - l) * k - 4 * a;
      const lift = 18 * a; p[i] = lift + r * (255 - lift) / 255; p[i + 1] = lift + g * (255 - lift) / 255; p[i + 2] = lift + b * (255 - lift) / 255;
    }
    putData(c, d);
    x = ctx2d(c); const sc = SC(c);
    x.globalAlpha = 0.08 * a; x.fillStyle = '#000';
    for (let y = 0; y < h; y += Math.max(2, Math.round(3 * sc))) x.fillRect(0, y, w, Math.max(1, sc));
    x.globalAlpha = Math.min(1, 0.4 + a);
    const fs = Math.round(Math.min(w, h) * 0.055);
    x.font = `700 ${fs}px Menlo, "SF Mono", Consolas, monospace`; x.textAlign = 'right'; x.textBaseline = 'alphabetic';
    x.shadowColor = 'rgba(255,90,0,.8)'; x.shadowBlur = fs * 0.35; x.fillStyle = '#ffa53a';
    x.fillText(dateStamp(), w - fs * 0.9, h - fs * 0.9);
    return c;
  },
  vhs(src, a) {
    const w = src.width, h = src.height, sc = SC(src), c = FX.rgbsplit(blurCanvas(src, 1.5 * sc * a), a * 0.8), x = ctx2d(c), R = rng(8);
    const band = (y0, hh, dx) => { const t = cv(w, hh); ctx2d(t).drawImage(c, 0, -y0); x.drawImage(t, dx, y0); };
    for (let i = 0; i < Math.round(6 * a); i++) band(Math.round(R() * h), Math.round((2 + R() * 10) * sc), (R() - 0.5) * 18 * sc * a);
    x.globalAlpha = 0.25 * a; x.fillStyle = '#fff'; const ty = h * 0.88; x.fillRect(0, ty, w, 4 * sc);
    const nd = getData(c), p = nd.data; for (let i = 0; i < p.length; i += 4) { const n = (R() - 0.5) * 40 * a; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
    putData(c, nd);
    x.globalAlpha = 0.9; const fs = Math.round(Math.min(w, h) * 0.05);
    x.font = `700 ${fs}px Menlo, "SF Mono", Consolas, monospace`; x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = fs * 0.2;
    x.fillText('PLAY ▶', fs * 0.8, fs * 1.6);
    return c;
  },
  scan(src, a) {
    const c = copy(src), x = ctx2d(c), w = c.width, h = c.height, sc = SC(c), step = Math.max(2, Math.round(4 * sc));
    x.fillStyle = `rgba(0,0,0,${0.35 * a})`; for (let y = 0; y < h; y += step) x.fillRect(0, y, w, step / 2);
    const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.6 * a})`); x.fillStyle = g; x.fillRect(0, 0, w, h);
    return c;
  },
  rgbsplit(src, a) {
    const w = src.width, h = src.height, s = getData(src).data, c = cv(w, h), d = ctx2d(c).createImageData(w, h), p = d.data;
    const o = Math.round(Math.max(w, h) * 0.008 * a) || 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, ir = (y * w + clamp(x + o, 0, w - 1)) * 4, ib = (y * w + clamp(x - o, 0, w - 1)) * 4;
      p[i] = s[ir]; p[i + 1] = s[i + 1]; p[i + 2] = s[ib + 2]; p[i + 3] = s[i + 3];
    }
    ctx2d(c).putImageData(d, 0, 0); return c;
  },
  chroma(src, a) {
    const w = src.width, h = src.height, s = getData(src).data, c = cv(w, h), d = ctx2d(c).createImageData(w, h), p = d.data, cx = w / 2, cy = h / 2;
    const kr = 1 + 0.012 * a, kb = 1 - 0.012 * a;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const rx = clamp(Math.round(cx + (x - cx) / kr), 0, w - 1), ry = clamp(Math.round(cy + (y - cy) / kr), 0, h - 1);
      const bx = clamp(Math.round(cx + (x - cx) / kb), 0, w - 1), by = clamp(Math.round(cy + (y - cy) / kb), 0, h - 1);
      p[i] = s[(ry * w + rx) * 4]; p[i + 1] = s[i + 1]; p[i + 2] = s[(by * w + bx) * 4 + 2]; p[i + 3] = s[i + 3];
    }
    ctx2d(c).putImageData(d, 0, 0); return c;
  },
  glitch(src, a) {
    const w = src.width, h = src.height, c = FX.rgbsplit(src, a * 0.6), x = ctx2d(c), R = rng(66), n = Math.round(4 + 16 * a);
    for (let i = 0; i < n; i++) {
      const y0 = Math.round(R() * h), hh = Math.max(2, Math.round(R() * h * 0.06)), dx = Math.round((R() - 0.5) * w * 0.12 * a);
      const t = cv(w, hh); ctx2d(t).drawImage(src, 0, -y0); x.drawImage(t, dx, y0);
      if (R() > 0.6) { x.globalAlpha = 0.25 * a; x.fillStyle = R() > 0.5 ? '#00ffd0' : '#ff2a7a'; x.fillRect(0, y0, w, hh); x.globalAlpha = 1; }
    }
    return c;
  },
  paper(src, a) {
    const w = src.width, h = src.height, c = copy(src), d = getData(c), p = d.data;
    const n1 = valueNoise(w, h, Math.max(3, Math.max(w, h) / 160), 4), n2 = valueNoise(w, h, Math.max(1.5, Math.max(w, h) / 600), 6), R = rng(2);
    for (let i = 0, j = 0; i < p.length; i += 4, j++) {
      const t = (n1[j] - 0.5) * 30 + (n2[j] - 0.5) * 26 + (R() - 0.5) * 10, k = a;
      p[i] += (t + 6) * k; p[i + 1] += (t + 2) * k; p[i + 2] += (t - 6) * k;
    }
    putData(c, d);
    return layer(c, 0.3 * a, 'multiply', (x, W, H) => { x.fillStyle = '#efe3cc'; x.fillRect(0, 0, W, H); });
  },
  fluted(src, a) {
    const w = src.width, h = src.height, s = getData(src).data, c = cv(w, h), d = ctx2d(c).createImageData(w, h), p = d.data;
    const sw = Math.max(6, Math.round(Math.max(w, h) / 34)), k = 0.85 * a;
    for (let x = 0; x < w; x++) {
      const u = (x % sw) / sw, sx = clamp(Math.round(x + (0.5 - u) * sw * 1.6 * k), 0, w - 1), shade = 1 + 0.16 * a * Math.cos(u * Math.PI * 2) + 0.12 * a * (u < 0.1 ? 1 - u / 0.1 : 0);
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4, j = (y * w + sx) * 4;
        p[i] = s[j] * shade; p[i + 1] = s[j + 1] * shade; p[i + 2] = s[j + 2] * shade; p[i + 3] = s[j + 3];
      }
    }
    ctx2d(c).putImageData(d, 0, 0);
    const b = blurCanvas(c, 2 * SC(c) * a);
    return b;
  },
  frosted(src, a) {
    const w = src.width, h = src.height, b = blurCanvas(src, 8 * SC(src) * a + 1), s = getData(b).data, c = cv(w, h), d = ctx2d(c).createImageData(w, h), p = d.data, R = rng(12), r = Math.max(1, Math.round(4 * SC(src) * a));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, j = (clamp(y + Math.round((R() - 0.5) * 2 * r), 0, h - 1) * w + clamp(x + Math.round((R() - 0.5) * 2 * r), 0, w - 1)) * 4;
      p[i] = s[j] + 14 * a; p[i + 1] = s[j + 1] + 14 * a; p[i + 2] = s[j + 2] + 16 * a; p[i + 3] = s[j + 3];
    }
    ctx2d(c).putImageData(d, 0, 0); return c;
  },
  mirror(src, a) {
    const c = copy(src), x = ctx2d(c), w = c.width, h = c.height;
    x.save(); x.globalAlpha = clamp(a * 1.4, 0, 1); x.beginPath(); x.rect(w / 2, 0, w / 2, h); x.clip(); x.translate(w, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); x.restore();
    return c;
  },
  kaleido(src, a, pt) {
    const w = src.width, h = src.height, px = pt.x * w, py = pt.y * h, q = cv(w, h), qx = ctx2d(q);
    const tw = Math.max(1, Math.round(Math.min(px, w - px, w / 2))), th = Math.max(1, Math.round(Math.min(py, h - py, h / 2)));
    const tile = cv(tw, th); ctx2d(tile).drawImage(src, px - tw, py - th, tw, th, 0, 0, tw, th);
    for (let yy = 0; yy * th < h + th; yy++) for (let xx = 0; xx * tw < w + tw; xx++) {
      qx.save(); qx.translate(xx * tw + (xx % 2 ? tw : 0), yy * th + (yy % 2 ? th : 0)); qx.scale(xx % 2 ? -1 : 1, yy % 2 ? -1 : 1); qx.drawImage(tile, 0, 0); qx.restore();
    }
    const c = copy(src), x = ctx2d(c); x.globalAlpha = clamp(a * 1.3, 0, 1);
    x.drawImage(q, (px - tw) - Math.floor((px - tw) / (2 * tw)) * 2 * tw - 2 * tw, (py - th) - Math.floor((py - th) / (2 * th)) * 2 * th - 2 * th);
    return c;
  },
  pixel(src, a) {
    const w = src.width, h = src.height, bs = Math.max(2, Math.round(Math.max(w, h) * (0.004 + 0.04 * a)));
    const sm = resize(src, Math.ceil(w / bs), Math.ceil(h / bs)), c = cv(w, h), x = ctx2d(c);
    x.imageSmoothingEnabled = false; x.drawImage(sm, 0, 0, sm.width * bs, sm.height * bs);
    return c;
  },
  halftone(src, a) {
    const w = src.width, h = src.height, st = Math.max(4, Math.round(Math.max(w, h) / 120)), sm = resize(src, Math.ceil(w / st), Math.ceil(h / st)), d = getData(sm).data;
    const t = cv(w, h), x = ctx2d(t); x.fillStyle = '#f6f1e7'; x.fillRect(0, 0, w, h);
    for (let yy = 0; yy < sm.height; yy++) for (let xx = 0; xx < sm.width; xx++) {
      const i = (yy * sm.width + xx) * 4, l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255, r = st * 0.62 * Math.sqrt(1 - l);
      if (r < 0.3) continue;
      x.fillStyle = `rgb(${d[i] * 0.6},${d[i + 1] * 0.6},${d[i + 2] * 0.6})`; x.beginPath(); x.arc(xx * st + st / 2, yy * st + st / 2, r, 0, 7); x.fill();
    }
    const c = copy(src), cx = ctx2d(c); cx.globalAlpha = clamp(a * 1.2, 0, 1); cx.drawImage(t, 0, 0);
    return c;
  },
  ghost(src, a) {
    const c = copy(src), x = ctx2d(c), w = c.width, h = c.height, s = 1.06;
    x.globalAlpha = 0.45 * a; x.globalCompositeOperation = 'screen';
    x.drawImage(src, -w * (s - 1) / 2 + w * 0.03, -h * (s - 1) / 2, w * s, h * s);
    return c;
  }
};
function leak(src, a, right) {
  return layer(src, a, 'screen', (x, w, h) => {
    const bx = right ? w : 0;
    const spots = [[bx, h * 0.25, '#ff6a2a', 0.6], [bx, h * 0.7, '#ff2f6d', 0.5], [right ? w * 0.85 : w * 0.15, h * 0.5, '#ffc04a', 0.35]];
    for (const [px, py, col, rr] of spots) {
      const r = Math.max(w, h) * rr, g = x.createRadialGradient(px, py, 0, px, py, r), [cr, cg, cb] = hexRgb(col);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},0.95)`); g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`); x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
  });
}

export function applyEffect(src, eff) {
  if (!eff || !eff.id || !FX[eff.id] || !eff.amount) return src;
  const pt = eff.pt || EFFECT_POINT_DEFAULT[eff.id] || { x: 0.5, y: 0.5 };
  const out = FX[eff.id](src, clamp(eff.amount / 100, 0, 1), pt, eff);
  /* Transparenz des Originals (z. B. nach Freistellen) erhalten */
  if (hasAlpha(src)) { const x = ctx2d(out); x.save(); x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0, out.width, out.height); x.restore(); }
  return out;
}
const alphaCache = new WeakMap();
function hasAlpha(c) {
  if (alphaCache.has(c)) return alphaCache.get(c);
  const s = Math.min(1, 200 / Math.max(c.width, c.height)), t = resize(c, c.width * s, c.height * s), d = getData(t).data;
  let a = false; for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { a = true; break; }
  alphaCache.set(c, a); return a;
}
export const EFFECT_IDS = Object.keys(FX);
