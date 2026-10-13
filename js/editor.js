/* Editor-Kern: Zustand, Verlauf, Vorschau, Bühne (Zoom/Pan), Ebenen-Bearbeitung, Untermodi */
import { $, cv, ctx2d, scaled, resize, deep, uid, clamp, fitLimit, copy, canvasToBlob, loadImageFromBlob } from './util.js';
import { processImage } from './process.js';
import { applyEffect } from './effects.js';
import { composite, objectSize, layout, ensureAssets, setAssetLoadHandler } from './compose.js';
import { enhance } from './brush.js';

export const freshCurves = () => ({ rgb: [[0, 0], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] });
export const freshState = () => ({
  filter: null, adj: {}, hsl: {}, curves: freshCurves(), selective: [], effect: null,
  bg: { ratio: 'none', fill: 'none', color: '#ffffff', g1: '#f7c6d0', g2: '#e2a6bf', pad: 0, round: 0, shadow: 0 },
  frame: { id: 'none', size: 5, color: '#ffffff' }, objects: [], quality: 'orig'
});

export const E = {
  st: freshState(), bases: new Map(), baseId: null, origPrev: null, assets: new Map(),
  hist: { list: [], i: -1 }, view: { z: 1, tx: 0, ty: 0 }, vr: null,
  tab: 'filter', mode: null, sel: null, interacting: false, comparing: false,
  prevMax: 1600, fastMax: 760, workMax: 3000,
  projectId: null, name: 'bild', onCommit: () => {}, onTabChange: () => {}, panelSync: () => {},
  cache: { key: null, img: null, fkey: null, fimg: null }, lastComp: null
};

/* ---------- Basis-Bild (destruktive Schritte) ---------- */
export function addBase(full) {
  const id = uid(), prev = scaled(full, E.prevMax), fast = scaled(prev, E.fastMax);
  E.bases.set(id, { full, prev, fast, blob: null, blobP: null });
  return id;
}
export const curBase = () => E.bases.get(E.baseId);
/* Speicher sparen (iPad): nicht aktive Vollbilder werden als PNG komprimiert und erst bei Bedarf wieder entpackt */
export function baseBlob(id) {
  const b = E.bases.get(id); if (!b) return Promise.resolve(null);
  if (b.blob) return Promise.resolve(b.blob);
  if (!b.blobP) b.blobP = canvasToBlob(b.full, 'image/png').then(bl => { b.blob = bl; return bl; });
  return b.blobP;
}
function park(id) {
  const b = E.bases.get(id); if (!b || !b.full || id === E.baseId) return;
  baseBlob(id).then(() => { if (id !== E.baseId && b.full && E.bases.has(id)) { b.full.width = b.full.height = 0; b.full = null; } }).catch(() => {});
}
async function unpark(id) {
  const b = E.bases.get(id); if (!b || b.full) return;
  const img = await loadImageFromBlob(b.blob), c = cv(img.naturalWidth, img.naturalHeight);
  ctx2d(c).drawImage(img, 0, 0); b.full = c;
}
export function setNewBase(full, label) {
  const old = E.baseId;
  E.baseId = addBase(full);
  E.cache.key = E.cache.fkey = null;
  commit(label);
  if (old) park(old);
}
export function loadImage(img, name, st) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const f = fitLimit(w, h, E.workMax);
  const full = resize(img, f.w, f.h);
  E.bases.clear(); E.assets.clear();
  E.baseId = addBase(full);
  E.origPrev = curBase().prev;
  E.st = st ? deep(st) : freshState();
  E.name = name || 'bild'; E.sel = null; E.mode = null;
  E.hist = { list: [], i: -1 }; E.cache.key = E.cache.fkey = null;
  E.view = { z: 1, tx: 0, ty: 0 };
  commit('Geöffnet', true);
}

/* ---------- Verlauf ---------- */
export function commit(label, silent) {
  const snap = { st: deep(E.st), baseId: E.baseId, label };
  const cur = E.hist.list[E.hist.i];
  if (cur && cur.baseId === snap.baseId && JSON.stringify(cur.st) === JSON.stringify(snap.st)) return;
  E.hist.list = E.hist.list.slice(0, E.hist.i + 1);
  E.hist.list.push(snap);
  /* höchstens 60 Schritte und 6 verschiedene Basisbilder im Speicher (iPad-RAM) */
  while (E.hist.list.length > 60) E.hist.list.shift();
  const ids = () => new Set(E.hist.list.map(h => h.baseId));
  while (ids().size > 8) E.hist.list.shift();
  E.hist.i = E.hist.list.length - 1;
  pruneBases();
  updUndo();
  if (!silent) E.onCommit(label);
  else E.onCommit(null);
}
function pruneBases() {
  const keep = new Set(E.hist.list.map(h => h.baseId)); keep.add(E.baseId);
  for (const id of [...E.bases.keys()]) if (!keep.has(id)) { const b = E.bases.get(id); if (b.full && id !== E.baseId) { b.full.width = b.full.height = 0; } E.bases.delete(id); }
}
async function restore(snap) {
  if (E.baseId !== snap.baseId) {
    const nb = E.bases.get(snap.baseId);
    if (nb && !nb.full) await busy('Wird geladen …', () => unpark(snap.baseId));
    const old = E.baseId; E.baseId = snap.baseId; E.cache.key = E.cache.fkey = null; park(old);
  }
  E.st = deep(snap.st);
  if (E.sel && !E.st.objects.find(o => o.id === E.sel)) E.sel = null;
  E.panelSync(); request();
}
let restoring = false;
export async function undo() {
  if (E.mode || restoring || E.hist.i <= 0) return;
  restoring = true;
  try { const l = E.hist.list[E.hist.i].label; await restore(E.hist.list[E.hist.i - 1]); E.hist.i--; toast(l ? `Rückgängig: ${l}` : 'Rückgängig'); } finally { restoring = false; updUndo(); E.onCommit(null); }
}
export async function redo() {
  if (E.mode || restoring || E.hist.i >= E.hist.list.length - 1) return;
  restoring = true;
  try { await restore(E.hist.list[E.hist.i + 1]); E.hist.i++; const l = E.hist.list[E.hist.i].label; toast(l ? `Wiederholt: ${l}` : 'Wiederholt'); } finally { restoring = false; updUndo(); E.onCommit(null); }
}
export function updUndo() {
  $('undo').disabled = !!E.mode || E.hist.i <= 0;
  $('redo').disabled = !!E.mode || E.hist.i >= E.hist.list.length - 1;
}

/* ---------- Vorschau ---------- */
const view = () => $('view');
let pending = false;
export function request() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; try { draw(); } catch (e) { console.error(e); } }); }
setAssetLoadHandler(() => request());

export function pixelKey(st) { return JSON.stringify([st.filter, st.adj, st.hsl, st.curves, st.selective, st.effect]); }
export function processedPreview(fast) {
  const b = curBase(), src = fast ? b.fast : b.prev, key = pixelKey(E.st) + '|' + E.baseId + '|' + src.width;
  if (fast) { if (E.cache.fkey !== key) { E.cache.fimg = applyEffect(processImage(src, E.st), E.st.effect); E.cache.fkey = key; } return E.cache.fimg; }
  if (E.cache.key !== key) { E.cache.img = applyEffect(processImage(src, E.st), E.st.effect); E.cache.key = key; }
  return E.cache.img;
}
function draw() {
  if (!E.baseId) return;
  const v = view();
  let out;
  if (E.comparing) out = E.origPrev;
  else if (E.mode && E.mode.render) out = E.mode.render();
  else {
    const b = curBase(), img = processedPreview(E.interacting), k = img.width / b.full.width;
    const hideSel = E.mode && E.mode.hideObjects;
    const comp = composite(img, hideSel ? { ...E.st, objects: [] } : E.st, k, E.assets);
    E.lastComp = comp; out = comp.canvas;
  }
  if (v.width !== out.width || v.height !== out.height) { v.width = out.width; v.height = out.height; }
  const x = ctx2d(v, false); x.clearRect(0, 0, v.width, v.height); x.drawImage(out, 0, 0);
  const transparent = E.mode && E.mode.checker || (E.st.bg.fill === 'none' && (E.st.bg.ratio !== 'none' || E.st.bg.pad > 0)) || E.st.frame.id === 'stamp';
  $('stage').classList.toggle('checker', !!transparent || !!(E.mode && E.mode.id === 'cutout'));
  placeView(); drawUI();
}

/* ---------- Bühne: Einpassen, Zoom, Pan ---------- */
export function placeView() {
  const st = $('stage'), v = view(), sw = st.clientWidth, sh = st.clientHeight, m = 14;
  if (!v.width || !sw) return;
  const fit = Math.min((sw - 2 * m) / v.width, (sh - 2 * m) / v.height);
  const z = E.view.z, sc = fit * z;
  /* Pan begrenzen, damit das Bild nicht verloren geht */
  const maxX = Math.max(0, (v.width * sc - sw) / 2 + sw * 0.35), maxY = Math.max(0, (v.height * sc - sh) / 2 + sh * 0.35);
  E.view.tx = clamp(E.view.tx, -maxX, maxX); E.view.ty = clamp(E.view.ty, -maxY, maxY);
  const left = sw / 2 - v.width * sc / 2 + E.view.tx, top = sh / 2 - v.height * sc / 2 + E.view.ty;
  v.style.left = left + 'px'; v.style.top = top + 'px'; v.style.width = v.width * sc + 'px'; v.style.height = v.height * sc + 'px';
  E.vr = { left, top, sc, cw: v.width, ch: v.height, sw, sh };
  $('fitBtn').hidden = Math.abs(E.view.z - 1) < 0.01 && !E.view.tx && !E.view.ty;
}
export const toCanvas = (sx, sy) => ({ x: (sx - E.vr.left) / E.vr.sc, y: (sy - E.vr.top) / E.vr.sc });
export const toScreen = (cx, cy) => ({ x: E.vr.left + cx * E.vr.sc, y: E.vr.top + cy * E.vr.sc });
export function resetView() { E.view = { z: 1, tx: 0, ty: 0 }; request(); }

/* ---------- UI-Ebene (Griffe, Rahmen, Cursor) ---------- */
export function drawUI() {
  const c = $('ui'), st = $('stage'), dpr = window.devicePixelRatio || 1, W = st.clientWidth, H = st.clientHeight;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const x = ctx2d(c, false); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  if (!E.vr || E.comparing) return;
  if (E.mode && E.mode.drawUI) { E.mode.drawUI(x); return; }
  const o = selObj();
  if (o && o.type !== 'drawing') drawSelection(x, o);
  if (guide.v || guide.h) {
    x.save(); x.strokeStyle = 'rgba(198,244,50,.9)'; x.lineWidth = 1; x.setLineDash([5, 4]);
    if (guide.v) { const p = toScreen(E.vr.cw / 2, 0); x.beginPath(); x.moveTo(p.x, E.vr.top); x.lineTo(p.x, E.vr.top + E.vr.ch * E.vr.sc); x.stroke(); }
    if (guide.h) { const p = toScreen(0, E.vr.ch / 2); x.beginPath(); x.moveTo(E.vr.left, p.y); x.lineTo(E.vr.left + E.vr.cw * E.vr.sc, p.y); x.stroke(); }
    x.restore();
  }
}
const guide = { v: false, h: false };
export const selObj = () => E.sel ? E.st.objects.find(o => o.id === E.sel) : null;
function objCorners(o) {
  const W = E.vr.cw, H = E.vr.ch, sz = objectSize(o, W, H, E.assets), c = toScreen(o.x * W, o.y * H), s = E.vr.sc;
  const hw = sz.w / 2 * s + 6, hh = sz.h / 2 * s + 6, a = o.rot || 0, ca = Math.cos(a), sa = Math.sin(a);
  const pt = (dx, dy) => ({ x: c.x + dx * ca - dy * sa, y: c.y + dx * sa + dy * ca });
  return { c, hw, hh, tl: pt(-hw, -hh), tr: pt(hw, -hh), br: pt(hw, hh), bl: pt(-hw, hh) };
}
function drawSelection(x, o) {
  const k = objCorners(o);
  x.save(); x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.setLineDash([6, 4]); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 3;
  x.beginPath(); x.moveTo(k.tl.x, k.tl.y); x.lineTo(k.tr.x, k.tr.y); x.lineTo(k.br.x, k.br.y); x.lineTo(k.bl.x, k.bl.y); x.closePath(); x.stroke();
  x.setLineDash([]);
  const handle = (p, draw, bg = '#fff', fg = '#000') => { x.fillStyle = bg; x.beginPath(); x.arc(p.x, p.y, 13, 0, 7); x.fill(); x.shadowBlur = 0; x.strokeStyle = fg; x.fillStyle = fg; x.lineWidth = 2; draw(p); x.shadowBlur = 3; };
  handle(k.tl, p => { x.beginPath(); x.moveTo(p.x - 4.5, p.y - 4.5); x.lineTo(p.x + 4.5, p.y + 4.5); x.moveTo(p.x + 4.5, p.y - 4.5); x.lineTo(p.x - 4.5, p.y + 4.5); x.stroke(); }, '#ff5a5f', '#fff');
  handle(k.tr, p => { x.strokeRect(p.x - 4, p.y - 2, 7, 7); x.strokeRect(p.x - 1.5, p.y - 5, 7, 7); });
  handle(k.br, p => { x.beginPath(); x.arc(p.x, p.y, 5, -0.3, 4.2); x.stroke(); x.beginPath(); x.moveTo(p.x + 5, p.y - 4); x.lineTo(p.x + 5, p.y); x.lineTo(p.x + 1, p.y); x.stroke(); }, '#c6f432', '#131a00');
  if (o.type === 'text') handle(k.bl, p => { x.beginPath(); x.moveTo(p.x - 4, p.y + 4); x.lineTo(p.x - 4, p.y + 1); x.lineTo(p.x + 3, p.y - 6); x.lineTo(p.x + 6, p.y - 3); x.lineTo(p.x - 1, p.y + 4); x.closePath(); x.stroke(); });
  x.restore();
}
function hitObject(sx, sy) {
  const W = E.vr.cw, H = E.vr.ch;
  for (let i = E.st.objects.length - 1; i >= 0; i--) {
    const o = E.st.objects[i]; if (o.type === 'drawing' || o.hidden || o.locked) continue;
    const sz = objectSize(o, W, H, E.assets), c = toScreen(o.x * W, o.y * H), a = -(o.rot || 0);
    const dx = sx - c.x, dy = sy - c.y, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    const pad = 10;
    if (Math.abs(lx) <= sz.w / 2 * E.vr.sc + pad && Math.abs(ly) <= sz.h / 2 * E.vr.sc + pad) return o;
  }
  return null;
}
function hitHandle(o, sx, sy) {
  const k = objCorners(o), d = p => Math.hypot(p.x - sx, p.y - sy) < 20;
  if (d(k.tl)) return 'del'; if (d(k.tr)) return 'dup'; if (d(k.br)) return 'scale'; if (o.type === 'text' && d(k.bl)) return 'edit';
  return null;
}
export function select(id, openTab = true) {
  E.sel = id;
  const o = selObj();
  if (o && openTab) {
    const t = { text: 'text', sticker: 'sticker', shape: 'shapes', image: 'overlay' }[o.type];
    if (t && E.tab !== t) { E.tab = t; E.onTabChange(); }
  }
  E.panelSync(); drawUI();
}
export function deleteObj(id) {
  E.st.objects = E.st.objects.filter(o => o.id !== id); if (E.sel === id) E.sel = null;
  request(); E.panelSync(); commit('Ebene gelöscht');
}
export function duplicateObj(id) {
  const o = E.st.objects.find(v => v.id === id); if (!o) return;
  const n = deep(o); n.id = uid(); n.x = clamp(n.x + 0.04, 0, 1); n.y = clamp(n.y + 0.04, 0, 1);
  E.st.objects.push(n); E.sel = n.id; request(); E.panelSync(); commit('Ebene dupliziert');
}
export function addObject(o) {
  o.id = uid(); o.x ??= 0.5; o.y ??= 0.5; o.rot ??= 0; o.opacity ??= 100;
  E.st.objects.push(o); E.sel = o.id; request(); E.panelSync(); commit('Ebene hinzugefügt');
  return o;
}

/* ---------- Gesten ---------- */
const ptrs = new Map();
let gest = null;
export function initStage() {
  const st = $('stage');
  st.addEventListener('pointerdown', onDown);
  st.addEventListener('pointermove', onMove);
  st.addEventListener('pointerup', onUp);
  st.addEventListener('pointercancel', onUp);
  st.addEventListener('lostpointercapture', onUp);
  st.addEventListener('wheel', e => {
    e.preventDefault();
    const r = st.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)));
  }, { passive: false });
  st.addEventListener('dblclick', e => { if (!E.mode || E.mode.allowDblZoom) { if (E.view.z > 1.01) resetView(); else { const r = st.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, 2.2); } } });
  /* iOS: Seiten-Zoom per Geste unterbinden */
  ['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault()));
  new ResizeObserver(() => request()).observe(st);
  const cmp = $('compare');
  const on = e => { e.preventDefault(); E.comparing = true; cmp.setAttribute('aria-pressed', 'true'); request(); };
  const off = () => { if (!E.comparing) return; E.comparing = false; cmp.setAttribute('aria-pressed', 'false'); request(); };
  cmp.addEventListener('pointerdown', on); cmp.addEventListener('pointerup', off); cmp.addEventListener('pointerleave', off); cmp.addEventListener('pointercancel', off);
  cmp.addEventListener('contextmenu', e => e.preventDefault());
  $('fitBtn').onclick = resetView;
}
export function zoomAt(sx, sy, f) {
  const z0 = E.view.z, z = clamp(z0 * f, 1, 8); if (z === z0) return;
  const st = $('stage'), cx = st.clientWidth / 2, cy = st.clientHeight / 2, k = z / z0;
  E.view.tx = (E.view.tx - (sx - cx)) * k + (sx - cx);
  E.view.ty = (E.view.ty - (sy - cy)) * k + (sy - cy);
  E.view.z = z; if (z === 1) { E.view.tx = 0; E.view.ty = 0; }
  placeView(); drawUI();
}
function local(e) { const r = $('stage').getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

function onDown(e) {
  if (!E.vr || E.comparing) return;
  try { $('stage').setPointerCapture(e.pointerId); } catch { /* egal */ }
  const p = local(e); ptrs.set(e.pointerId, p);
  if (ptrs.size === 2) {
    if (gest && gest.kind === 'mode' && E.mode && E.mode.cancelStroke) E.mode.cancelStroke();
    const [a, b] = [...ptrs.values()], o = selObj();
    const onObj = o && !E.mode && hitObject((a.x + b.x) / 2, (a.y + b.y) / 2) === o;
    gest = { kind: onObj ? 'objpinch' : 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), a0: Math.atan2(b.y - a.y, b.x - a.x), m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      z0: E.view.z, tx0: E.view.tx, ty0: E.view.ty, o0: onObj ? deep(o) : null };
    return;
  }
  if (ptrs.size > 2) return;
  if (E.mode && E.mode.down) { gest = { kind: 'mode' }; E.mode.down(p, e); return; }
  const o = selObj();
  if (o) {
    const h = hitHandle(o, p.x, p.y);
    if (h === 'del') { deleteObj(o.id); gest = null; return; }
    if (h === 'dup') { duplicateObj(o.id); gest = null; return; }
    if (h === 'edit') { E.panelSync('focusText'); gest = null; return; }
    if (h === 'scale') { const k = objCorners(o); gest = { kind: 'scale', c: k.c, d0: Math.hypot(p.x - k.c.x, p.y - k.c.y), a0: Math.atan2(p.y - k.c.y, p.x - k.c.x), o0: deep(o) }; return; }
  }
  const hit = hitObject(p.x, p.y);
  if (hit) {
    if (E.sel !== hit.id) select(hit.id);
    gest = { kind: 'move', p0: p, o0: deep(hit), moved: false }; return;
  }
  if (E.tapHandler && E.tapHandler(p)) { gest = null; return; }
  gest = { kind: 'pan', p0: p, tx0: E.view.tx, ty0: E.view.ty, moved: false };
}
function applyObj(o, patch) { Object.assign(o, patch); }
function onMove(e) {
  if (!ptrs.has(e.pointerId)) { if (E.mode && E.mode.hover && e.pointerType === 'mouse') E.mode.hover(local(e)); return; }
  const p = local(e); ptrs.set(e.pointerId, p);
  if (!gest) return;
  if ((gest.kind === 'pinch' || gest.kind === 'objpinch') && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (gest.kind === 'objpinch') {
      const o = selObj(); if (!o) return;
      const f = d / gest.d0, st = scaleFields(gest.o0, f);
      applyObj(o, { ...st, rot: snapAngle(gest.o0.rot + ang - gest.a0), x: gest.o0.x + (m.x - gest.m0.x) / E.vr.sc / E.vr.cw, y: gest.o0.y + (m.y - gest.m0.y) / E.vr.sc / E.vr.ch });
      request(); return;
    }
    const st = $('stage'), cx = st.clientWidth / 2, cy = st.clientHeight / 2, z = clamp(gest.z0 * d / gest.d0, 1, 8), k = z / gest.z0;
    E.view.z = z;
    E.view.tx = (gest.tx0 - (gest.m0.x - cx)) * k + (m.x - cx);
    E.view.ty = (gest.ty0 - (gest.m0.y - cy)) * k + (m.y - cy);
    placeView(); drawUI(); return;
  }
  if (gest.kind === 'mode' && E.mode && E.mode.move) { E.mode.move(p, e); return; }
  if (gest.kind === 'move') {
    const o = selObj(); if (!o) return;
    const dx = (p.x - gest.p0.x) / E.vr.sc / E.vr.cw, dy = (p.y - gest.p0.y) / E.vr.sc / E.vr.ch;
    if (Math.hypot(p.x - gest.p0.x, p.y - gest.p0.y) > 3) gest.moved = true;
    let nx = gest.o0.x + dx, ny = gest.o0.y + dy;
    guide.v = Math.abs(nx - 0.5) * E.vr.cw * E.vr.sc < 6; guide.h = Math.abs(ny - 0.5) * E.vr.ch * E.vr.sc < 6;
    if (guide.v) nx = 0.5; if (guide.h) ny = 0.5;
    o.x = clamp(nx, -0.2, 1.2); o.y = clamp(ny, -0.2, 1.2); request(); return;
  }
  if (gest.kind === 'scale') {
    const o = selObj(); if (!o) return;
    const d = Math.hypot(p.x - gest.c.x, p.y - gest.c.y), ang = Math.atan2(p.y - gest.c.y, p.x - gest.c.x);
    applyObj(o, { ...scaleFields(gest.o0, Math.max(0.05, d / gest.d0)), rot: snapAngle(gest.o0.rot + ang - gest.a0) });
    request(); return;
  }
  if (gest.kind === 'pan') {
    if (Math.hypot(p.x - gest.p0.x, p.y - gest.p0.y) > 4) gest.moved = true;
    if (E.view.z > 1.001) { E.view.tx = gest.tx0 + p.x - gest.p0.x; E.view.ty = gest.ty0 + p.y - gest.p0.y; placeView(); drawUI(); }
  }
}
function scaleFields(o0, f) {
  if (o0.type === 'text') return { size: clamp(o0.size * f, 0.008, 0.6) };
  if (o0.type === 'shape') return { w: clamp(o0.w * f, 0.01, 3), h: clamp(o0.h * f, 0.005, 3) };
  return { w: clamp(o0.w * f, 0.02, 3) };
}
function snapAngle(a) {
  const st = Math.PI / 4, n = Math.round(a / st);
  return Math.abs(a - n * st) < 0.05 ? n * st : a;
}
function onUp(e) {
  if (!ptrs.has(e.pointerId)) return;
  const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId);
  if (!gest) return;
  if (gest.kind === 'pinch' || gest.kind === 'objpinch') {
    if (ptrs.size === 0) { if (gest.kind === 'objpinch') commit('Ebene geändert'); gest = null; }
    return;
  }
  if (gest.kind === 'mode') { if (E.mode && E.mode.up) E.mode.up(p, e); gest = null; return; }
  if (gest.kind === 'move' || gest.kind === 'scale') {
    guide.v = guide.h = false;
    if (gest.kind === 'scale' || gest.moved) commit('Ebene verschoben');
    gest = null; drawUI(); E.panelSync(); return;
  }
  if (gest.kind === 'pan' && !gest.moved && E.sel) { E.sel = null; E.panelSync(); drawUI(); }
  gest = null;
}

/* ---------- Untermodi ---------- */
export function enterMode(m) {
  E.mode = m; E.sel = null;
  $('tabsWrap').hidden = true; $('modebar').hidden = false;
  $('eraseToggle').hidden = !m.eraseToggle;
  $('mTabs').innerHTML = m.tabs ? m.tabs.map(([id, l]) => `<button class="mt" data-mt="${id}" aria-pressed="${id === m.tab}">${l}</button>`).join('') : `<span class="title">${m.title || ''}</span>`;
  $('expBtn').disabled = true; $('qBtn').disabled = true;
  updUndo(); hint(m.hint || ''); E.panelSync(); request();
}
export function exitMode(ok) {
  const m = E.mode; if (!m) return;
  if (ok && m.ok) { const r = m.ok(); if (r === false) return; } else if (!ok && m.cancel) m.cancel();
  E.mode = null;
  $('tabsWrap').hidden = false; $('modebar').hidden = true; $('eraseToggle').hidden = true;
  $('expBtn').disabled = false; $('qBtn').disabled = false;
  hint(''); updUndo(); E.panelSync(); request();
}
export function initModebar() {
  $('mCancel').onclick = () => exitMode(false);
  $('mOk').onclick = () => exitMode(true);
  $('mTabs').onclick = e => {
    const b = e.target.closest('[data-mt]'); if (!b || !E.mode) return;
    E.mode.tab = b.dataset.mt;
    $('mTabs').querySelectorAll('[data-mt]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    if (E.mode.onTab) E.mode.onTab(b.dataset.mt);
    E.panelSync();
  };
  $('eraseToggle').onclick = () => { if (E.mode && E.mode.toggleErase) { const on = E.mode.toggleErase(); $('eraseToggle').setAttribute('aria-pressed', String(on)); } };
}

/* ---------- Ausgabe in voller Qualität ---------- */
export async function renderOutput(opts = {}) {
  const b = curBase(), full = b.full, st = opts.st || E.st;
  await ensureAssets(st);
  const L0 = layout(full.width, full.height, st);
  const maxArea = 16e6;
  let k = st.quality && st.quality !== 'orig' ? 2 : 1;
  if (opts.maxSide) k = Math.min(k, opts.maxSide / Math.max(L0.W, L0.H));
  k = Math.min(k, Math.sqrt(maxArea / (L0.W * L0.H)));
  let src;
  if (k > 1.001) src = enhance(full, st.quality, 1e9, Math.min(maxArea, full.width * full.height * k * k));
  else if (k < 0.999) src = resize(full, full.width * k, full.height * k);
  else src = full;
  const p1 = processImage(src, st), proc = applyEffect(p1, st.effect);
  const scale = src.width / full.width;
  if (proc !== p1) release(p1);
  if (src !== full) release(src);
  const comp = composite(proc, st, scale, opts.assets || E.assets);
  release(proc);
  return comp.canvas;
}
export function renderWith(base, st, maxSide, assets) {
  /* für Stapel/Vorlagen: beliebiges Bild mit Rezept */
  const L0 = layout(base.width, base.height, st);
  let k = Math.min(1, maxSide ? maxSide / Math.max(L0.W, L0.H) : 1);
  k = Math.min(k, Math.sqrt(16e6 / (L0.W * L0.H)));
  const src = k < 0.999 ? resize(base, base.width * k, base.height * k) : base;
  const proc = applyEffect(processImage(src, st), st.effect);
  return composite(proc, st, src.width / base.width, assets || E.assets).canvas;
}

const release = c => { if (c && c.width) { c.width = c.height = 0; } };

/* ---------- kleine UI-Helfer ---------- */
let toastT;
export function toast(t, ms = 1500) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, ms); }
export function hint(t) { const h = $('hint'); h.textContent = t; h.hidden = !t; }
export async function busy(text, fn) {
  $('busyT').textContent = text; $('busy').hidden = false;
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
  try { return await fn(); } finally { $('busy').hidden = true; }
}
export { copy, cv };
