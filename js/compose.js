/* Zusammensetzen: Hintergrund/Leinwand, Rahmen, Ebenen (Text, Sticker, Formen, Bilder, Zeichnung) */
import { cv, ctx2d, blurCanvas, rgba, hexRgb, clamp, rng } from './util.js';
import { BG_RATIOS, FONTS, STICKERS } from './data.js';

/* ---------- Layout ---------- */
export function layout(iw, ih, st) {
  const bg = st.bg, ratio = (BG_RATIOS.find(r => r[0] === bg.ratio) || [])[2] || null, pad = clamp(bg.pad / 100, 0, 0.45);
  let W = iw, H = ih;
  if (ratio) { if (iw / ih > ratio) { W = iw; H = iw / ratio; } else { H = ih; W = ih * ratio; } }
  if (!ratio && pad) { W = iw * (1 + 2 * pad); H = ih + iw * 2 * pad; }
  const aw = W - (ratio ? 2 * pad * Math.min(W, H) : 2 * pad * iw), ah = H - (ratio ? 2 * pad * Math.min(W, H) : 2 * pad * iw);
  const s = Math.min(aw / iw, ah / ih);
  const img = { w: iw * s, h: ih * s }; img.x = (W - img.w) / 2 + (bg.ox || 0) * W; img.y = (H - img.h) / 2 + (bg.oy || 0) * H;
  const f = st.frame, b = f && f.id !== 'none' ? Math.min(W, H) * f.size / 100 : 0;
  let L = b, R = b, T = b, B = b;
  if (f && f.id === 'polaroid') B = b * 4.2;
  if (f && f.id === 'film') { T = B = Math.max(b * 2.4, Math.min(W, H) * 0.06); L = R = b * 0.5; }
  if (f && f.id === 'gallery') { L = R = T = B = b * 1.6; }
  return { W: W + L + R, H: H + T + B, inner: { x: L, y: T, w: W, h: H }, img: { x: img.x + L, y: img.y + T, w: img.w, h: img.h }, b };
}

function rr(x, X, Y, W, H, r) {
  r = Math.max(0, Math.min(r, W / 2, H / 2));
  x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath();
}
export { rr as roundRectPath };

/* ---------- Komposition ---------- */
export function composite(img, st, k, assets, opts = {}) {
  /* img: bearbeitetes Bild in Skalierung k zur Basis; Ergebnis in derselben Skalierung */
  const L = layout(img.width / k, img.height / k, st);
  const W = Math.max(1, Math.round(L.W * k)), H = Math.max(1, Math.round(L.H * k));
  const out = cv(W, H), x = ctx2d(out);
  const inner = { x: L.inner.x * k, y: L.inner.y * k, w: L.inner.w * k, h: L.inner.h * k };
  const ir = { x: L.img.x * k, y: L.img.y * k, w: L.img.w * k, h: L.img.h * k };
  const f = st.frame || { id: 'none' }, b = L.b * k;
  if (f.id !== 'none') drawFrameBack(x, f, W, H, inner, b);
  const bg = st.bg, hasCanvas = bg.fill && bg.fill !== 'none';
  x.save(); x.beginPath(); x.rect(inner.x, inner.y, inner.w, inner.h); x.clip();
  if (hasCanvas) {
    if (bg.fill === 'blur' || bg.fill === 'mirror') {
      const s = Math.max(inner.w / img.width, inner.h / img.height) * 1.04;
      const tw = img.width * s, th = img.height * s;
      if (bg.fill === 'blur') {
        const small = blurCanvas(downTo(img, 300), 10);
        x.drawImage(small, inner.x + (inner.w - tw) / 2, inner.y + (inner.h - th) / 2, tw, th);
        x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(inner.x, inner.y, inner.w, inner.h);
      } else {
        for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) {
          x.save(); x.translate(ir.x + xx * ir.w + (xx % 2 ? ir.w : 0), ir.y + yy * ir.h + (yy % 2 ? ir.h : 0)); x.scale(xx % 2 ? -1 : 1, yy % 2 ? -1 : 1);
          x.drawImage(img, 0, 0, ir.w, ir.h); x.restore();
        }
      }
    } else if (bg.fill === 'gradient') {
      const g = x.createLinearGradient(inner.x, inner.y, inner.x + inner.w * 0.3, inner.y + inner.h);
      g.addColorStop(0, bg.g1 || '#f7c6d0'); g.addColorStop(1, bg.g2 || '#e2a6bf'); x.fillStyle = g; x.fillRect(inner.x, inner.y, inner.w, inner.h);
    } else if (bg.fill === 'color') { x.fillStyle = bg.color || '#ffffff'; x.fillRect(inner.x, inner.y, inner.w, inner.h); }
  }
  const rad = (bg.round || 0) / 100 * Math.min(ir.w, ir.h) / 2 + (f.id === 'rounded' ? b * 1.5 : 0);
  const shadow = (bg.shadow || 0) + (f.id === 'shadow' ? 60 : 0);
  /* Bild (optional abgerundet) auf eigene Ebene, Schatten folgt der Transparenz */
  let layer = img, lx = ir.x, ly = ir.y, lw = ir.w, lh = ir.h;
  if (rad > 0) {
    const t = cv(Math.max(1, Math.round(ir.w)), Math.max(1, Math.round(ir.h))), tx = ctx2d(t);
    tx.imageSmoothingQuality = 'high'; rr(tx, 0, 0, t.width, t.height, rad); tx.clip(); tx.drawImage(img, 0, 0, t.width, t.height);
    layer = t;
  }
  x.save();
  if (shadow) { x.shadowColor = `rgba(0,0,0,${0.15 + shadow / 100 * 0.35})`; x.shadowBlur = Math.min(W, H) * 0.04 * shadow / 100 + 2; x.shadowOffsetY = Math.min(W, H) * 0.015 * shadow / 100; }
  x.imageSmoothingQuality = 'high'; x.drawImage(layer, lx, ly, lw, lh); x.restore();
  x.restore();
  if (f.id !== 'none') drawFrameFront(x, f, W, H, inner, b);
  /* Ebenen */
  if (!opts.noObjects) for (const o of st.objects) if (!o.hidden) drawObject(x, o, W, H, assets, opts);
  return { canvas: out, L, k };
}
function downTo(src, max) { const s = Math.min(1, max / Math.max(src.width, src.height)); const c = cv(src.width * s, src.height * s); ctx2d(c).drawImage(src, 0, 0, c.width, c.height); return c; }

function drawFrameBack(x, f, W, H, inner, b) {
  const col = f.color || '#ffffff';
  if (f.id === 'stamp') {
    x.fillStyle = col; x.fillRect(0, 0, W, H);
    x.save(); x.globalCompositeOperation = 'destination-out';
    const r = Math.max(2, b * 0.28), step = r * 3;
    for (let px = step / 2; px < W; px += step) { x.beginPath(); x.arc(px, 0, r, 0, 7); x.arc(px, H, r, 0, 7); x.fill(); }
    for (let py = step / 2; py < H; py += step) { x.beginPath(); x.arc(0, py, r, 0, 7); x.arc(W, py, r, 0, 7); x.fill(); }
    x.restore(); return;
  }
  if (f.id === 'vintage') {
    x.fillStyle = col; const R = rng(4), j = b * 0.25;
    x.beginPath(); x.moveTo(j * R(), j * R());
    for (let px = 0; px <= W; px += b * 0.5) x.lineTo(px, j * R());
    for (let py = 0; py <= H; py += b * 0.5) x.lineTo(W - j * R(), py);
    for (let px = W; px >= 0; px -= b * 0.5) x.lineTo(px, H - j * R());
    for (let py = H; py >= 0; py -= b * 0.5) x.lineTo(j * R(), py);
    x.closePath(); x.fill(); return;
  }
  x.fillStyle = col; x.fillRect(0, 0, W, H);
}
function drawFrameFront(x, f, W, H, inner, b) {
  const col = f.color || '#ffffff', [r, g, bl] = hexRgb(col), dark = 0.3 * r + 0.59 * g + 0.11 * bl < 128, line = dark ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.75)';
  if (f.id === 'film') {
    const hh = inner.y, hw = hh * 0.32, hgt = hh * 0.42, step = hw * 2.1;
    x.fillStyle = dark ? '#f2ede4' : '#222';
    for (let px = step * 0.3; px < W; px += step) { rr(x, px, (hh - hgt) / 2, hw, hgt, hw * 0.2); x.fill(); rr(x, px, H - hh + (hh - hgt) / 2, hw, hgt, hw * 0.2); x.fill(); }
    x.font = `600 ${Math.round(hh * 0.18)}px Menlo, monospace`; x.fillStyle = '#f5a524'; x.textBaseline = 'middle';
    x.fillText('ROF 400   ▸ 12', W * 0.05, H - hh * 0.12); x.fillText('▸ 12A', W * 0.6, hh * 0.12 + Math.round(hh * 0.05));
  } else if (f.id === 'gallery') {
    x.strokeStyle = line; x.lineWidth = Math.max(1, b * 0.06);
    x.strokeRect(inner.x - b * 0.4, inner.y - b * 0.4, inner.w + b * 0.8, inner.h + b * 0.8);
    x.lineWidth = Math.max(1, b * 0.14); x.strokeStyle = dark ? '#eee' : '#111'; x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, W - x.lineWidth, H - x.lineWidth);
  } else if (f.id === 'double') {
    x.strokeStyle = line; x.lineWidth = Math.max(1, b * 0.08); x.strokeRect(b * 0.45, b * 0.45, W - b * 0.9, H - b * 0.9);
  } else if (f.id === 'vintage') {
    const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(120,90,50,.18)'); gr.addColorStop(1, 'rgba(120,90,50,.05)');
    x.strokeStyle = gr; x.lineWidth = b * 0.25; x.strokeRect(inner.x, inner.y, inner.w, inner.h);
  }
}

/* ---------- Ebenen ---------- */
const imgCache = new Map();
let onAssetLoad = () => {};
export function setAssetLoadHandler(fn) { onAssetLoad = fn; }
export function stickerSvg(o) {
  for (const cat of Object.keys(STICKERS)) {
    if (cat === 'emoji') continue;
    const s = STICKERS[cat].find(v => v[0] === o.sticker);
    if (s) return s[2].replaceAll('{c}', o.color || '#ffffff');
  }
  return null;
}
export function stickerImage(o) {
  const svg = stickerSvg(o);
  if (!svg) return null;
  let e = imgCache.get(svg);
  if (!e) {
    const img = new Image();
    e = { img, ok: false, p: null };
    e.p = new Promise(res => { img.onload = () => { e.ok = true; res(); onAssetLoad(); }; img.onerror = () => res(); });
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    imgCache.set(svg, e);
  }
  return e;
}
export async function ensureAssets(st) {
  const ps = [];
  for (const o of st.objects) if (o.type === 'sticker' && !o.emoji) { const e = stickerImage(o); if (e && !e.ok) ps.push(e.p); }
  await Promise.all(ps);
}
export const fontFamily = name => (FONTS.find(f => f[0] === name) || FONTS[0])[1];
function textFont(o, px) { return `${o.italic ? 'italic ' : ''}${o.bold ? '700' : '400'} ${px}px ${fontFamily(o.font)}`; }
function textLines(o) { const t = (o.caps ? (o.text || '').toUpperCase() : (o.text || '')); return t.split('\n'); }
const mctx = ctx2d(cv(4, 4));
function measureLine(x, line, px, sp) { return x.measureText(line).width + Math.max(0, [...line].length - 1) * sp * px; }

export function objectSize(o, W, H, assets) {
  if (o.type === 'text') {
    const px = o.size * W; mctx.font = textFont(o, px);
    const lines = textLines(o), sp = (o.spacing || 0) / 100, lh = px * (o.lineHeight || 1.2);
    const w = Math.max(px * 0.5, ...lines.map(l => measureLine(mctx, l, px, sp)));
    const pad = o.bg ? px * 0.45 : px * 0.1;
    return { w: w + pad * 2, h: lh * lines.length + pad * 2 - (lh - px) * 0.5, px, lh, pad, lines, sp };
  }
  if (o.type === 'sticker') {
    const w = o.w * W;
    if (o.emoji) return { w, h: w };
    const e = stickerImage(o), ar = e && e.ok && e.img.naturalWidth ? e.img.naturalHeight / e.img.naturalWidth : 1;
    return { w, h: w * ar };
  }
  if (o.type === 'shape') return { w: o.w * W, h: o.h * W };
  if (o.type === 'image') { const a = assets && assets.get(o.asset); const ar = a ? a.height / a.width : 1; return { w: o.w * W, h: o.w * W * ar }; }
  return { w: W, h: H };
}

export function drawObject(x, o, W, H, assets, opts = {}) {
  if (o.type === 'drawing') { drawDrawing(x, o, W, H); return; }
  const sz = objectSize(o, W, H, assets);
  x.save();
  x.translate(o.x * W, o.y * H); x.rotate(o.rot || 0); if (o.flip) x.scale(-1, 1);
  x.globalAlpha = (o.opacity ?? 100) / 100;
  if (o.blend && o.blend !== 'normal') x.globalCompositeOperation = o.blend;
  if (o.type === 'text') drawText(x, o, sz);
  else if (o.type === 'sticker') {
    if (o.emoji) { x.font = `${sz.w * 0.86}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.emoji, 0, sz.w * 0.04); }
    else { const e = stickerImage(o); if (e && e.ok) { if (o.shadow) { x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = sz.w * 0.06; x.shadowOffsetY = sz.w * 0.02; } x.drawImage(e.img, -sz.w / 2, -sz.h / 2, sz.w, sz.h); } }
  } else if (o.type === 'shape') drawShape(x, o, sz, W);
  else if (o.type === 'image') {
    const a = assets && assets.get(o.asset);
    if (a) {
      if (o.feather) {
        const t = cv(Math.max(1, sz.w), Math.max(1, sz.h)), tx = ctx2d(t); tx.drawImage(a, 0, 0, t.width, t.height);
        tx.globalCompositeOperation = 'destination-in';
        const r = Math.max(t.width, t.height) / 2, g = tx.createRadialGradient(t.width / 2, t.height / 2, r * (1 - o.feather / 100) * 0.9, t.width / 2, t.height / 2, r * 1.02);
        g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); tx.fillStyle = g; tx.fillRect(0, 0, t.width, t.height);
        x.drawImage(t, -sz.w / 2, -sz.h / 2, sz.w, sz.h);
      } else x.drawImage(a, -sz.w / 2, -sz.h / 2, sz.w, sz.h);
    }
  }
  x.restore();
}

function drawText(x, o, sz) {
  const { px, lh, pad, lines, sp } = sz;
  x.font = textFont(o, px); x.textBaseline = 'middle';
  const totalH = lh * lines.length, align = o.align || 'center';
  if (o.bg) {
    x.save(); x.globalAlpha *= o.bg / 100; x.fillStyle = o.bgColor || '#000';
    rr(x, -sz.w / 2, -sz.h / 2, sz.w, sz.h, (o.bgRadius ?? 30) / 100 * Math.min(sz.w, sz.h) / 2); x.fill(); x.restore();
  }
  const curve = (o.curve || 0) / 100;
  lines.forEach((line, li) => {
    const lw = measureLine(x, line, px, sp), y = -totalH / 2 + lh * (li + 0.5);
    let sx = align === 'left' ? -sz.w / 2 + pad : align === 'right' ? sz.w / 2 - pad - lw : -lw / 2;
    const chars = [...line];
    const drawPass = (fn) => {
      if (curve && Math.abs(curve) > 0.01) {
        const R = (px * 6) / Math.abs(curve), dirn = curve > 0 ? 1 : -1;
        let acc = 0;
        for (const ch of chars) {
          const cw = x.measureText(ch).width, mid = sx + acc + cw / 2, ang = mid / R;
          x.save(); x.translate(Math.sin(ang) * R, y + dirn * (R - Math.cos(ang) * R)); x.rotate(ang * dirn);
          fn(ch, -cw / 2, 0); x.restore(); acc += cw + sp * px;
        }
      } else if (sp) { let acc = 0; for (const ch of chars) { fn(ch, sx + acc, y); acc += x.measureText(ch).width + sp * px; } }
      else fn(line, sx, y);
    };
    x.textAlign = 'left';
    if (o.shadow) { x.shadowColor = rgba(o.shadowColor || '#000000', 0.25 + o.shadow / 100 * 0.5); x.shadowBlur = px * 0.12 * o.shadow / 50; x.shadowOffsetY = px * 0.05 * o.shadow / 100; }
    if (o.glow) { x.shadowColor = rgba(o.color || '#ffffff', 0.9); x.shadowBlur = px * 0.5 * o.glow / 100; x.shadowOffsetY = 0; }
    if (o.stroke) {
      x.lineJoin = 'round'; x.strokeStyle = o.strokeColor || '#000'; x.lineWidth = px * o.stroke / 100;
      drawPass((t, X, Y) => x.strokeText(t, X, Y));
      x.shadowColor = 'transparent';
    }
    x.fillStyle = o.color || '#fff';
    drawPass((t, X, Y) => x.fillText(t, X, Y));
    if (o.glow) { x.shadowBlur = px * 0.15 * o.glow / 100; drawPass((t, X, Y) => x.fillText(t, X, Y)); }
    x.shadowColor = 'transparent';
  });
}

export function shapePath(x, kind, w, h) {
  const hw = w / 2, hh = h / 2;
  x.beginPath();
  switch (kind) {
    case 'rect': x.rect(-hw, -hh, w, h); break;
    case 'roundrect': rr(x, -hw, -hh, w, h, Math.min(w, h) * 0.2); break;
    case 'circle': case 'ring': x.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2); break;
    case 'triangle': x.moveTo(0, -hh); x.lineTo(hw, hh); x.lineTo(-hw, hh); x.closePath(); break;
    case 'star': for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.45 : 1; x.lineTo(Math.cos(a) * hw * r, Math.sin(a) * hh * r); } x.closePath(); break;
    case 'sparkle': x.moveTo(0, -hh); x.quadraticCurveTo(hw * 0.12, -hh * 0.12, hw, 0); x.quadraticCurveTo(hw * 0.12, hh * 0.12, 0, hh); x.quadraticCurveTo(-hw * 0.12, hh * 0.12, -hw, 0); x.quadraticCurveTo(-hw * 0.12, -hh * 0.12, 0, -hh); break;
    case 'heart': x.moveTo(0, hh); x.bezierCurveTo(-hw * 1.4, -hh * 0.1, -hw * 0.6, -hh * 1.3, 0, -hh * 0.45); x.bezierCurveTo(hw * 0.6, -hh * 1.3, hw * 1.4, -hh * 0.1, 0, hh); break;
    case 'line': x.moveTo(-hw, 0); x.lineTo(hw, 0); break;
    case 'arrow': x.moveTo(-hw, 0); x.lineTo(hw, 0); x.moveTo(hw - Math.min(w * 0.25, h * 2), -Math.min(h, w * 0.18)); x.lineTo(hw, 0); x.lineTo(hw - Math.min(w * 0.25, h * 2), Math.min(h, w * 0.18)); break;
    case 'bubble': rr(x, -hw, -hh, w, h * 0.78, Math.min(w, h) * 0.2); x.moveTo(-hw * 0.4, hh * 0.56); x.lineTo(-hw * 0.55, hh); x.lineTo(-hw * 0.05, hh * 0.56); break;
    case 'badge': for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16, r = i % 2 ? 0.88 : 1; x.lineTo(Math.cos(a) * hw * r, Math.sin(a) * hh * r); } x.closePath(); break;
  }
}
function drawShape(x, o, sz, W) {
  const open = o.shape === 'line' || o.shape === 'arrow' || o.shape === 'ring';
  shapePath(x, o.shape, sz.w, sz.h);
  if (o.fillOn && !open) { x.fillStyle = o.color || '#ffffff'; x.fill(); }
  const sw = (o.strokeW ?? 0) / 100 * W * 0.05;
  if (open || sw > 0 || !o.fillOn) {
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = open || !o.fillOn ? (o.color || '#fff') : (o.strokeColor || '#000');
    x.lineWidth = open || !o.fillOn ? Math.max(1, (o.strokeW || 20) / 100 * W * 0.05) : sw;
    x.stroke();
  }
}

/* Zeichnung: Striche in normierten Koordinaten */
export function drawDrawing(x, o, W, H) {
  const layer = cv(W, H), l = ctx2d(layer);
  for (const s of o.strokes) drawStroke(l, s, W, H);
  x.save(); x.globalAlpha = (o.opacity ?? 100) / 100; x.drawImage(layer, 0, 0); x.restore();
}
export function drawStroke(l, s, W, H) {
  const pts = s.pts; if (!pts.length) return;
  const size = s.size * W;
  l.save(); l.lineCap = 'round'; l.lineJoin = 'round';
  if (s.tool === 'eraser') { l.globalCompositeOperation = 'destination-out'; l.strokeStyle = '#000'; l.lineWidth = size; strokePath(l, pts, W, H); l.restore(); return; }
  l.globalAlpha = (s.opacity ?? 100) / 100;
  if (s.tool === 'pattern') {
    l.fillStyle = s.color; l.textAlign = 'center'; l.textBaseline = 'middle';
    l.font = `${size * 2.2}px "Apple Symbols","Segoe UI Symbol","Apple Color Emoji",sans-serif`;
    let acc = 0, last = null; const gap = size * 2.6;
    for (const p of pts) {
      const X = p[0] * W, Y = p[1] * H;
      if (!last) { l.fillText(s.stamp, X, Y); last = [X, Y]; continue; }
      acc += Math.hypot(X - last[0], Y - last[1]); last = [X, Y];
      if (acc >= gap) { acc = 0; l.fillText(s.stamp, X, Y); }
    }
    l.restore(); return;
  }
  if (s.tool === 'text') {
    l.fillStyle = s.color; l.textBaseline = 'middle'; l.font = `600 ${size * 2.4}px ${fontFamily('Avenir')}`;
    const chars = [...(s.text || 'ROF ')]; let ci = 0, acc = 0, last = null;
    for (let i = 0; i < pts.length; i++) {
      const X = pts[i][0] * W, Y = pts[i][1] * H;
      if (!last) { last = [X, Y]; continue; }
      const d = Math.hypot(X - last[0], Y - last[1]); acc += d;
      const ch = chars[ci % chars.length], cw = l.measureText(ch).width;
      if (acc >= cw) { l.save(); l.translate(X, Y); l.rotate(Math.atan2(Y - last[1], X - last[0])); l.fillText(ch, -cw / 2, 0); l.restore(); acc = 0; ci++; }
      last = [X, Y];
    }
    l.restore(); return;
  }
  l.strokeStyle = s.color; l.lineWidth = size;
  if (s.tool === 'marker') { l.globalAlpha *= 0.55; l.lineCap = 'square'; }
  if (s.tool === 'dash') l.setLineDash([size * 1.6, size * 1.4]);
  if (s.tool === 'neon') {
    l.shadowColor = s.color; l.shadowBlur = size * 2.2; strokePath(l, pts, W, H);
    l.shadowBlur = size; l.strokeStyle = '#ffffff'; l.lineWidth = size * 0.4; strokePath(l, pts, W, H);
  } else strokePath(l, pts, W, H);
  l.restore();
}
function strokePath(l, pts, W, H) {
  l.beginPath();
  if (pts.length === 1) { l.moveTo(pts[0][0] * W, pts[0][1] * H); l.lineTo(pts[0][0] * W + 0.01, pts[0][1] * H); l.stroke(); return; }
  l.moveTo(pts[0][0] * W, pts[0][1] * H);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2 * W, my = (pts[i][1] + pts[i + 1][1]) / 2 * H;
    l.quadraticCurveTo(pts[i][0] * W, pts[i][1] * H, mx, my);
  }
  const e = pts[pts.length - 1]; l.lineTo(e[0] * W, e[1] * H); l.stroke();
}
