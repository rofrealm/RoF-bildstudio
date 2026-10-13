/* Untermodi mit ✕/✓: Zuschnitt, Pinsel-Werkzeuge, Freistellen, Verformen, Zeichnen, Selektiv, Kurve, HSL */
import { E, curBase, setNewBase, request, drawUI, toCanvas, toScreen, enterMode, exitMode, toast, busy, commit, processedPreview } from './editor.js';
import { cv, ctx2d, copy, clamp, deep, uid, getData, resize } from './util.js';
import { OPS, newMask, paintLine, paintDab, maskBlend, maskTint, inpaint, cloneResult, magicWand, autoBackground, applyCutout, Warp, transformImage, cropCanvas } from './brush.js';
import { ASPECTS } from './data.js';
import { composite, drawStroke } from './compose.js';
import { applyEffect } from './effects.js';
import { processImage } from './process.js';

const brushCursor = (x, p, r, extra) => {
  if (!p) return;
  x.save(); x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 3;
  x.beginPath(); x.arc(p.x, p.y, r, 0, 7); x.stroke();
  if (extra) extra(x);
  x.restore();
};

/* ================= Zuschnitt ================= */
export function cropMode() {
  const b = curBase();
  const m = {
    id: 'crop', title: 'Zuschnitt', tabs: [['crop', 'Zuschnitt'], ['rotate', 'Drehen'], ['persp', 'Perspektive']], tab: 'crop', hideObjects: true, allowDblZoom: false,
    t: { rot: 0, flipH: false, flipV: false, straight: 0, persH: 0, persV: 0 }, aspect: 'free', rect: { x: 0, y: 0, w: 1, h: 1 },
    img: null, tkey: null, drag: null,
    get ratio() {
      const a = ASPECTS.find(v => v[0] === this.aspect)[2];
      if (a === 'orig') { const s = this.trans(); return s.width / s.height; }
      return a;
    },
    trans() {
      const key = JSON.stringify(this.t);
      if (this.tkey !== key) { this.img = transformImage(processedPreview(false), this.t); this.tkey = key; }
      return this.img;
    },
    render() { return this.trans(); },
    setAspect(id) { this.aspect = id; this.fitRect(); request(); },
    fitRect() {
      const img = this.trans(), r = this.ratio;
      if (!r) { this.rect = { x: 0, y: 0, w: 1, h: 1 }; return; }
      const ia = img.width / img.height;
      if (ia > r) { const w = r / ia; this.rect = { x: (1 - w) / 2, y: 0, w, h: 1 }; } else { const h = ia / r; this.rect = { x: 0, y: (1 - h) / 2, w: 1, h }; }
    },
    changeT(patch) { Object.assign(this.t, patch); this.tkey = null; this.fitRect(); request(); },
    screenRect() { const a = toScreen(this.rect.x * E.vr.cw, this.rect.y * E.vr.ch), c = toScreen((this.rect.x + this.rect.w) * E.vr.cw, (this.rect.y + this.rect.h) * E.vr.ch); return { x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y }; },
    drawUI(x) {
      const r = this.screenRect(), v = E.vr, L = v.left, T = v.top, W = v.cw * v.sc, H = v.ch * v.sc;
      x.save(); x.fillStyle = 'rgba(0,0,0,.55)';
      x.fillRect(L, T, W, r.y - T); x.fillRect(L, r.y + r.h, W, T + H - r.y - r.h); x.fillRect(L, r.y, r.x - L, r.h); x.fillRect(r.x + r.w, r.y, L + W - r.x - r.w, r.h);
      x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.strokeRect(r.x, r.y, r.w, r.h);
      x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 1;
      for (let i = 1; i < 3; i++) { x.beginPath(); x.moveTo(r.x + r.w * i / 3, r.y); x.lineTo(r.x + r.w * i / 3, r.y + r.h); x.moveTo(r.x, r.y + r.h * i / 3); x.lineTo(r.x + r.w, r.y + r.h * i / 3); x.stroke(); }
      x.strokeStyle = '#fff'; x.lineWidth = 4; const k = Math.min(22, r.w / 3, r.h / 3);
      for (const [cx, cy, dx, dy] of [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x, r.y + r.h, 1, -1], [r.x + r.w, r.y + r.h, -1, -1]]) { x.beginPath(); x.moveTo(cx, cy + dy * k); x.lineTo(cx, cy); x.lineTo(cx + dx * k, cy); x.stroke(); }
      x.restore();
    },
    down(p) {
      const r = this.screenRect(), near = (a, bb) => Math.abs(a - bb) < 26;
      let hx = near(p.x, r.x) ? 'l' : near(p.x, r.x + r.w) ? 'r' : '', hy = near(p.y, r.y) ? 't' : near(p.y, r.y + r.h) ? 'b' : '';
      const inside = p.x > r.x - 26 && p.x < r.x + r.w + 26 && p.y > r.y - 26 && p.y < r.y + r.h + 26;
      if (this.ratio && (!hx || !hy)) { hx = hy = ''; }
      if ((hx || hy) && inside) this.drag = { kind: hx + hy, p0: p, r0: { ...this.rect } };
      else if (inside) this.drag = { kind: 'move', p0: p, r0: { ...this.rect } };
      else this.drag = null;
    },
    move(p) {
      const d = this.drag; if (!d) return;
      const dx = (p.x - d.p0.x) / (E.vr.cw * E.vr.sc), dy = (p.y - d.p0.y) / (E.vr.ch * E.vr.sc), min = 0.05;
      let r = { ...d.r0 };
      const ratio = this.ratio;
      if (d.kind === 'move') { r.x = clamp(d.r0.x + dx, 0, 1 - r.w); r.y = clamp(d.r0.y + dy, 0, 1 - r.h); }
      else if (!ratio) {
        if (d.kind.includes('l')) { r.x = clamp(d.r0.x + dx, 0, d.r0.x + d.r0.w - min); r.w = d.r0.x + d.r0.w - r.x; }
        if (d.kind.includes('r')) r.w = clamp(d.r0.w + dx, min, 1 - d.r0.x);
        if (d.kind.includes('t')) { r.y = clamp(d.r0.y + dy, 0, d.r0.y + d.r0.h - min); r.h = d.r0.y + d.r0.h - r.y; }
        if (d.kind.includes('b')) r.h = clamp(d.r0.h + dy, min, 1 - d.r0.y);
      } else {
        /* Ecke ziehen, gegenüberliegende Ecke bleibt fest, Seitenverhältnis in Pixeln */
        const ia = E.vr.cw / E.vr.ch, L = d.kind.includes('l'), T = d.kind.includes('t');
        const ax = L ? d.r0.x + d.r0.w : d.r0.x, ay = T ? d.r0.y + d.r0.h : d.r0.y;
        const px = (L ? d.r0.x : d.r0.x + d.r0.w) + dx, py = (T ? d.r0.y : d.r0.y + d.r0.h) + dy;
        let w = Math.max(min, Math.abs(px - ax)), h = w * ia / ratio;
        const hp = Math.abs(py - ay); if (hp > h) { h = hp; w = h * ratio / ia; }
        const maxW = L ? ax : 1 - ax, maxH = T ? ay : 1 - ay;
        if (w > maxW) { w = maxW; h = w * ia / ratio; }
        if (h > maxH) { h = maxH; w = h * ratio / ia; }
        r = { x: L ? ax - w : ax, y: T ? ay - h : ay, w, h };
      }
      this.rect = r; drawUI();
    },
    up() { this.drag = null; },
    ok() {
      const t = this.t, r = this.rect, ident = !t.rot && !t.flipH && !t.flipV && !t.straight && !t.persH && !t.persV && r.x < 0.001 && r.y < 0.001 && r.w > 0.999 && r.h > 0.999;
      if (ident) return;
      busy('Zuschnitt wird angewendet …', () => { const full = cropCanvas(transformImage(curBase().full, t), r); setNewBase(full, 'Zuschnitt'); request(); });
    }
  };
  enterMode(m);
  return m;
}

/* ================= Pinsel (Retusche / Radieren / Stempel / Mosaik) ================= */
const BRUSH_INFO = {
  smooth: ['Glätten', 'Über Flächen streichen, um sie zu glätten'],
  heal: ['Fleck entfernen', 'Auf Flecken, Staub oder Kratzer tippen'],
  lighten: ['Aufhellen', 'Bereiche aufhellen'], darken: ['Abdunkeln', 'Bereiche abdunkeln'],
  highlight: ['Glanzlicht', 'Glanz auf Flakon oder Glas malen'], sharpen: ['Schärfen', 'Details gezielt schärfen'],
  soften: ['Weichzeichnen', 'Bereiche weichzeichnen'], saturate: ['Sättigen', 'Farben gezielt verstärken'],
  desaturate: ['Entsättigen', 'Farben gezielt entfernen'], warm: ['Wärmer', 'Bereiche wärmer färben'],
  erase: ['Radierer', 'Über störende Objekte malen – sie werden entfernt'],
  clone: ['Kopierstempel', 'Erst auf die Quelle tippen, dann malen'],
  mosaic: ['Mosaik', 'Bereiche verpixeln (z. B. Etiketten, Kennzeichen)'],
  privacy: ['Unkenntlich', 'Bereiche stark verwischen (Datenschutz)']
};
export function brushMode(kind) {
  const b = curBase(), src = b.prev, isInpaint = kind === 'erase' || kind === 'heal';
  const info = BRUSH_INFO[kind];
  const m = {
    id: 'brush', kind, title: info[0], hint: info[1] + ' · Ansicht ohne Filter', eraseToggle: kind !== 'heal',
    size: kind === 'heal' ? 18 : 34, hard: kind === 'erase' || kind === 'heal' || kind === 'mosaic' ? 0.6 : 0.3, flow: 1, erase: false,
    mask: newMask(src.width, src.height), undoStack: [], cursor: null, last: null, painting: false, result: null, opPrev: null,
    offset: null, source: null, pickSource: kind === 'clone', allowDblZoom: false,
    get r() { return this.size / E.vr.sc; },
    op() { if (!this.opPrev) this.opPrev = kind === 'clone' ? null : OPS[kind] ? OPS[kind](src) : null; return this.opPrev; },
    render() {
      if (isInpaint) {
        const base = this.result || src;
        if (!this.painting) return base;
        const c = copy(base); ctx2d(c).drawImage(maskTint(this.stroke || this.mask), 0, 0); return c;
      }
      if (kind === 'clone') return this.offset ? maskBlend(src, cloneResult(src, this.offset), this.mask) : src;
      return maskBlend(src, this.op(), this.mask);
    },
    drawUI(x) {
      brushCursor(x, this.cursor, this.size, () => {
        if (kind === 'clone' && this.source) {
          const s = this.cursor && this.offset && this.painting ? { x: this.cursor.x + this.offset.x * E.vr.cw * E.vr.sc, y: this.cursor.y + this.offset.y * E.vr.ch * E.vr.sc } : toScreen(this.source.x * E.vr.cw, this.source.y * E.vr.ch);
          x.strokeStyle = '#c6f432'; x.lineWidth = 2; x.beginPath(); x.arc(s.x, s.y, this.size, 0, 7); x.moveTo(s.x - 8, s.y); x.lineTo(s.x + 8, s.y); x.moveTo(s.x, s.y - 8); x.lineTo(s.x, s.y + 8); x.stroke();
        }
      });
    },
    hover(p) { this.cursor = p; drawUI(); },
    pushUndo() { this.undoStack.push({ mask: copy(this.mask), result: this.result, offset: this.offset, source: this.source }); if (this.undoStack.length > 20) this.undoStack.shift(); },
    stepBack() {
      const s = this.undoStack.pop(); if (!s) { toast('Nichts mehr rückgängig zu machen'); return; }
      const mx = ctx2d(this.mask); mx.clearRect(0, 0, this.mask.width, this.mask.height); mx.drawImage(s.mask, 0, 0);
      this.result = s.result; this.offset = s.offset; this.source = s.source; request(); E.panelSync();
    },
    down(p) {
      this.cursor = p;
      const c = toCanvas(p.x, p.y);
      if (kind === 'clone' && this.pickSource) { this.source = { x: c.x / E.vr.cw, y: c.y / E.vr.ch }; this.offset = null; this.pickSource = false; toast('Quelle gesetzt – jetzt malen'); E.panelSync(); drawUI(); return; }
      if (kind === 'clone' && !this.source) { toast('Zuerst „Quelle wählen“ und auf das Bild tippen'); return; }
      this.pushUndo();
      if (kind === 'clone' && !this.offset) this.offset = { x: this.source.x - c.x / E.vr.cw, y: this.source.y - c.y / E.vr.ch };
      this.painting = true; this.last = c;
      if (isInpaint) { this.stroke = newMask(src.width, src.height); ctx2d(this.stroke).drawImage(this.mask, 0, 0); }
      const target = isInpaint ? this.stroke : this.mask;
      paintDab(target, c.x, c.y, this.r, this.hard, this.erase && !isInpaint, this.flow);
      request();
    },
    move(p) {
      this.cursor = p; if (!this.painting) { drawUI(); return; }
      const c = toCanvas(p.x, p.y), target = isInpaint ? this.stroke : this.mask;
      paintLine(target, this.last, c, this.r, this.hard, this.erase && !isInpaint, this.flow); this.last = c; request();
    },
    cancelStroke() { if (this.painting) { this.painting = false; this.stepBack(); } },
    up() {
      if (!this.painting) return;
      this.painting = false;
      if (isInpaint) {
        const stroke = this.stroke; this.stroke = null;
        const mx = ctx2d(this.mask); mx.clearRect(0, 0, this.mask.width, this.mask.height); mx.drawImage(stroke, 0, 0);
        this.result = inpaint(src, this.mask);
      }
      request(); E.panelSync();
    },
    toggleErase() { this.erase = !this.erase; toast(this.erase ? 'Wiederherstellen-Pinsel' : 'Pinsel'); return this.erase; },
    hasWork() { const d = getData(this.mask).data; for (let i = 3; i < d.length; i += 32) if (d[i] > 8) return true; return false; },
    ok() {
      if (!this.hasWork()) return;
      busy('Wird angewendet …', () => {
        const full = curBase().full;
        let out;
        if (isInpaint) out = inpaint(full, this.mask);
        else if (kind === 'clone') out = maskBlend(full, cloneResult(full, this.offset), this.mask);
        else out = maskBlend(full, OPS[kind](full), this.mask);
        setNewBase(out, info[0]); request();
      });
    }
  };
  if (isInpaint) m.eraseToggle = false;
  enterMode(m);
  return m;
}

/* ================= Freistellen ================= */
export function cutoutMode() {
  const b = curBase(), src = b.prev;
  const m = {
    id: 'cutout', title: 'Freistellen', tabs: [['auto', 'Auto'], ['wand', 'Zauberstab'], ['remove', 'Entfernen'], ['keep', 'Behalten']], tab: 'auto',
    hint: 'Hintergrund entfernen – Ergebnis mit Transparenz', checker: true, hideObjects: true, allowDblZoom: false,
    mask: newMask(src.width, src.height), size: 30, tol: 32, feather: 15, undoStack: [], cursor: null, painting: false, last: null, cacheImg: null,
    get r() { return this.size / E.vr.sc; },
    render() { if (!this.cacheImg) this.cacheImg = applyCutout(src, this.mask, 0); return this.cacheImg; },
    dirty() { this.cacheImg = null; request(); },
    drawUI(x) { if (this.tab === 'remove' || this.tab === 'keep') brushCursor(x, this.cursor, this.size); },
    hover(p) { this.cursor = p; drawUI(); },
    pushUndo() { this.undoStack.push(copy(this.mask)); if (this.undoStack.length > 20) this.undoStack.shift(); },
    stepBack() { const s = this.undoStack.pop(); if (!s) { toast('Nichts mehr rückgängig zu machen'); return; } const x = ctx2d(this.mask); x.clearRect(0, 0, this.mask.width, this.mask.height); x.drawImage(s, 0, 0); this.dirty(); },
    runAuto() { this.pushUndo(); const am = autoBackground(src, this.tol); const x = ctx2d(this.mask); x.clearRect(0, 0, this.mask.width, this.mask.height); x.drawImage(am, 0, 0); this.dirty(); toast('Hintergrund erkannt – mit Pinsel nachbessern'); },
    invert() { this.pushUndo(); const t = cv(this.mask.width, this.mask.height), x = ctx2d(t); x.fillStyle = '#fff'; x.fillRect(0, 0, t.width, t.height); x.globalCompositeOperation = 'destination-out'; x.drawImage(this.mask, 0, 0); const mx = ctx2d(this.mask); mx.clearRect(0, 0, t.width, t.height); mx.drawImage(t, 0, 0); this.dirty(); },
    clear() { this.pushUndo(); ctx2d(this.mask).clearRect(0, 0, this.mask.width, this.mask.height); this.dirty(); },
    down(p) {
      this.cursor = p; const c = toCanvas(p.x, p.y);
      if (this.tab === 'auto') { toast('Tippe „Hintergrund erkennen“ oder wähle Zauberstab/Pinsel'); return; }
      this.pushUndo();
      if (this.tab === 'wand') { const wm = magicWand(src, c.x, c.y, this.tol); ctx2d(this.mask).drawImage(wm, 0, 0); this.dirty(); return; }
      this.painting = true; this.last = c; paintDab(this.mask, c.x, c.y, this.r, 0.55, this.tab === 'keep'); this.dirty();
    },
    move(p) { this.cursor = p; if (!this.painting) { drawUI(); return; } const c = toCanvas(p.x, p.y); paintLine(this.mask, this.last, c, this.r, 0.55, this.tab === 'keep'); this.last = c; this.dirty(); },
    up() { this.painting = false; },
    cancelStroke() { if (this.painting) { this.painting = false; this.stepBack(); } },
    ok() {
      const d = getData(this.mask).data; let any = false; for (let i = 3; i < d.length; i += 32) if (d[i] > 8) { any = true; break; }
      if (!any) return;
      busy('Wird freigestellt …', () => { setNewBase(applyCutout(curBase().full, this.mask, this.feather), 'Freistellen'); request(); toast('Tipp: Unter „Hintergrund“ eine Farbe wählen'); });
    }
  };
  enterMode(m);
  return m;
}

/* ================= Verformen ================= */
export function warpMode() {
  const b = curBase();
  const m = {
    id: 'warp', title: 'Verformen', tabs: [['push', 'Schieben'], ['bulge', 'Vergrößern'], ['pinch', 'Verkleinern'], ['restore', 'Zurück']], tab: 'push',
    hint: 'Mit dem Finger formen · Ansicht ohne Filter', hideObjects: true, allowDblZoom: false,
    warp: new Warp(b.prev.width, b.prev.height), size: 60, strength: 50, cursor: null, last: null, painting: false, timer: null, img: null, undoStack: [],
    render() { if (!this.img) this.img = this.painting ? resize(this.warp.render(b.fast), b.prev.width, b.prev.height) : this.warp.render(b.prev); return this.img; },
    drawUI(x) { brushCursor(x, this.cursor, this.size); },
    hover(p) { this.cursor = p; drawUI(); },
    stamp(c, vx = 0, vy = 0) { const k = this.warp.w / E.vr.cw; this.warp.apply(this.tab, c.x * k, c.y * k, vx * k, vy * k, this.size / E.vr.sc * k, this.strength / 50); this.img = null; request(); },
    down(p) {
      this.cursor = p; this.undoStack.push({ dx: Float32Array.from(this.warp.dx), dy: Float32Array.from(this.warp.dy) }); if (this.undoStack.length > 15) this.undoStack.shift();
      this.painting = true; const c = toCanvas(p.x, p.y); this.last = c;
      if (this.tab !== 'push') { this.stamp(c); clearInterval(this.timer); this.timer = setInterval(() => this.painting && this.stamp(this.last), 60); }
    },
    move(p) {
      this.cursor = p; if (!this.painting) { drawUI(); return; }
      const c = toCanvas(p.x, p.y);
      if (this.tab === 'push') this.stamp(c, c.x - this.last.x, c.y - this.last.y); else this.stamp(c);
      this.last = c;
    },
    up() { this.painting = false; clearInterval(this.timer); this.img = null; request(); },
    cancelStroke() { this.up(); },
    stepBack() { const s = this.undoStack.pop(); if (!s) { toast('Nichts mehr rückgängig zu machen'); return; } this.warp.dx = s.dx; this.warp.dy = s.dy; this.img = null; request(); },
    cancel() { clearInterval(this.timer); },
    ok() { clearInterval(this.timer); if (this.warp.empty()) return; busy('Wird angewendet …', () => { setNewBase(this.warp.render(curBase().full), 'Verformen'); request(); }); }
  };
  enterMode(m);
  return m;
}

/* ================= Zeichnen ================= */
export function drawMode() {
  let obj = E.st.objects.find(o => o.type === 'drawing');
  const backup = obj ? deep(obj) : null;
  const m = {
    id: 'draw', title: 'Zeichnen', tabs: [['basic', 'Pinsel'], ['pattern', 'Muster'], ['text', 'Text']], tab: 'basic', eraseToggle: true, allowDblZoom: false,
    tool: 'pen', color: '#ffffff', size: 12, opacity: 100, stamp: '♥', text: 'Realm of Fragrance ', erase: false, cur: null, cursor: null, picking: false,
    strokes: obj ? deep(obj.strokes) : [], undone: [],
    render() {
      const b = curBase(), img = processedPreview(false), k = img.width / b.full.width;
      const objs = E.st.objects.filter(o => o.type !== 'drawing');
      const comp = composite(img, { ...E.st, objects: [...objs, { type: 'drawing', id: 'tmp', strokes: this.strokes, opacity: 100 }] }, k, E.assets);
      this.comp = comp.canvas; return comp.canvas;
    },
    drawUI(x) {
      if (this.cur) {
        const off = cv(E.vr.cw, E.vr.ch); drawStroke(ctx2d(off), this.cur, E.vr.cw, E.vr.ch);
        x.save(); x.drawImage(off, E.vr.left, E.vr.top, E.vr.cw * E.vr.sc, E.vr.ch * E.vr.sc); x.restore();
      }
      const r = this.size / 2;
      brushCursor(x, this.cursor, Math.max(3, r * (this.tool === 'pattern' ? 2.2 : 1)));
    },
    hover(p) { this.cursor = p; drawUI(); },
    down(p) {
      this.cursor = p;
      const c = toCanvas(p.x, p.y), n = [c.x / E.vr.cw, c.y / E.vr.ch];
      if (this.picking) {
        const px = ctx2d(this.comp || this.render()).getImageData(clamp(Math.round(c.x), 0, E.vr.cw - 1), clamp(Math.round(c.y), 0, E.vr.ch - 1), 1, 1).data;
        this.color = '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join(''); this.picking = false; E.panelSync(); toast('Farbe übernommen'); return;
      }
      const tool = this.erase ? 'eraser' : this.tab === 'pattern' ? 'pattern' : this.tab === 'text' ? 'text' : this.tool;
      this.cur = { tool, color: this.color, size: this.size / E.vr.sc / E.vr.cw, opacity: this.opacity, stamp: this.stamp, text: this.text, pts: [n] };
      drawUI();
    },
    move(p) {
      this.cursor = p; if (!this.cur) { drawUI(); return; }
      const c = toCanvas(p.x, p.y), n = [c.x / E.vr.cw, c.y / E.vr.ch], l = this.cur.pts[this.cur.pts.length - 1];
      if (Math.hypot((n[0] - l[0]) * E.vr.cw, (n[1] - l[1]) * E.vr.ch) * E.vr.sc > 1.5) this.cur.pts.push(n);
      drawUI();
    },
    up() { if (this.cur) { this.strokes.push(this.cur); this.undone = []; this.cur = null; request(); E.panelSync(); } },
    cancelStroke() { this.cur = null; drawUI(); },
    stepBack() { const s = this.strokes.pop(); if (s) { this.undone.push(s); request(); } else toast('Nichts mehr rückgängig zu machen'); E.panelSync(); },
    stepFwd() { const s = this.undone.pop(); if (s) { this.strokes.push(s); request(); } E.panelSync(); },
    clearAll() { if (!this.strokes.length) return; this.undone = this.strokes.reverse(); this.strokes = []; request(); E.panelSync(); },
    toggleErase() { this.erase = !this.erase; return this.erase; },
    ok() {
      obj = E.st.objects.find(o => o.type === 'drawing');
      if (!this.strokes.length) { if (obj) { E.st.objects = E.st.objects.filter(o => o !== obj); commit('Zeichnung gelöscht'); } return; }
      if (!obj) { obj = { type: 'drawing', id: uid(), opacity: 100, strokes: [] }; E.st.objects.push(obj); }
      obj.strokes = this.strokes; commit('Zeichnen');
    },
    cancel() { if (backup) { const o = E.st.objects.find(v => v.type === 'drawing'); if (o) Object.assign(o, backup); } }
  };
  enterMode(m);
  return m;
}

/* ================= Selektiv ================= */
export function selectiveMode() {
  const backup = deep(E.st.selective);
  const m = {
    id: 'selective', title: 'Selektiv', hint: 'Auf das Bild tippen, um einen Punkt zu setzen', allowDblZoom: false,
    active: E.st.selective.length ? E.st.selective.length - 1 : -1, param: 'b', drag: null,
    drawUI(x) {
      E.st.selective.forEach((s, i) => {
        const p = toScreen(s.x * E.vr.cw, s.y * E.vr.ch), on = i === this.active;
        x.save(); x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 4;
        if (on) { x.strokeStyle = 'rgba(255,255,255,.6)'; x.setLineDash([4, 4]); x.lineWidth = 1; x.beginPath(); x.arc(p.x, p.y, s.r * Math.max(E.vr.cw, E.vr.ch) * E.vr.sc, 0, 7); x.stroke(); x.setLineDash([]); }
        x.fillStyle = on ? '#c6f432' : '#fff'; x.beginPath(); x.arc(p.x, p.y, on ? 11 : 9, 0, 7); x.fill();
        x.fillStyle = '#000'; x.font = '700 11px -apple-system,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowBlur = 0; x.fillText(String(i + 1), p.x, p.y + 0.5);
        x.restore();
      });
    },
    down(p) {
      const i = E.st.selective.findIndex(s => { const q = toScreen(s.x * E.vr.cw, s.y * E.vr.ch); return Math.hypot(q.x - p.x, q.y - p.y) < 22; });
      if (i >= 0) { this.active = i; this.drag = { i, p0: p, s0: { ...E.st.selective[i] } }; E.panelSync(); drawUI(); return; }
      const c = toCanvas(p.x, p.y);
      if (c.x < 0 || c.y < 0 || c.x > E.vr.cw || c.y > E.vr.ch) return;
      if (E.st.selective.length >= 8) { toast('Maximal 8 Punkte'); return; }
      E.st.selective.push({ x: c.x / E.vr.cw, y: c.y / E.vr.ch, r: 0.18, b: 0, c: 0, s: 0, t: 0 });
      this.active = E.st.selective.length - 1; E.panelSync(); request();
    },
    move(p) {
      const d = this.drag; if (!d) return;
      const s = E.st.selective[d.i];
      s.x = clamp(d.s0.x + (p.x - d.p0.x) / E.vr.sc / E.vr.cw, 0, 1); s.y = clamp(d.s0.y + (p.y - d.p0.y) / E.vr.sc / E.vr.ch, 0, 1);
      E.interacting = true; request();
    },
    up() { if (this.drag) { this.drag = null; E.interacting = false; request(); } },
    cancel() { E.st.selective = backup; },
    ok() { E.st.selective = E.st.selective.filter(s => s.b || s.c || s.s || s.t); commit('Selektiv'); }
  };
  enterMode(m);
  return m;
}

/* ================= Kurve & HSL (nur Panel, mit Abbrechen) ================= */
export function curveMode() {
  const backup = deep(E.st.curves);
  enterMode({ id: 'curve', title: 'Kurve', channel: 'rgb', cancel() { E.st.curves = backup; }, ok() { commit('Kurve'); } });
}
export function hslMode() {
  const backup = deep(E.st.hsl);
  enterMode({ id: 'hsl', title: 'HSL', band: 'red', cancel() { E.st.hsl = backup; }, ok() { commit('HSL'); } });
}
export { exitMode };
