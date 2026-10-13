/* Untere Bedienleiste: Tabs und Panels aller Werkzeuge */
import { $, cv, ctx2d, scaled, clamp, deep, escapeHtml, loadImageFromBlob, fitLimit, resize, rng } from './util.js';
import { E, request, commit, enterMode, exitMode, toast, selObj, addObject, deleteObj, duplicateObj, curBase, freshCurves, drawUI, busy, hint } from './editor.js';
import { FILTERS, FILTER_CATS, ADJ_GROUPS, EFFECTS, EFFECT_CATS, TEMPLATES, TEMPLATE_CATS, BG_RATIOS, PALETTE, GRADIENTS, FONTS, TEXT_STYLES, FRAMES, SHAPES, STICKERS, STICKER_CATS, PATTERN_STAMPS, ASPECTS } from './data.js';
import { processImage, autoAdjust, HSL_BANDS, curveLut } from './process.js';
import { applyEffect, EFFECT_POINT_DEFAULT } from './effects.js';
import { composite, stickerSvg, fontFamily, shapePath } from './compose.js';
import { icon } from './icons.js';
import { cropMode, brushMode, cutoutMode, warpMode, drawMode, selectiveMode, curveMode, hslMode } from './modes.js';

export const TABS = [['templates', 'Vorlagen'], ['retouch', 'Retusche'], ['filter', 'Filter'], ['adjust', 'Anpassen'], ['erase', 'Radieren'], ['effects', 'Effekte'],
  ['draw', 'Zeichnen'], ['sticker', 'Sticker'], ['text', 'Text'], ['cutout', 'Freistellen'], ['overlay', 'Überlagern'], ['background', 'Hintergrund'],
  ['reshape', 'Verformen'], ['shapes', 'Formen'], ['frame', 'Rahmen']];

const UI = { fcat: 'beliebt', ecat: 'trend', tcat: 'all', scat: 'rof', adjGroup: 'visual', adjTool: null, bgSub: 'ratio', textSub: 'style', favs: [], selParam: 'b', drawColorTarget: null };
export const panelState = UI;
let R = { sl: {}, act: {}, txt: null };
const panel = () => $('panel');

/* ---------- Tabs ---------- */
export function buildTabs() {
  $('tabs').innerHTML = TABS.map(([id, l]) => `<button class="tab" role="tab" data-tab="${id}" aria-selected="${id === E.tab}">${l}</button>`).join('');
  $('tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; switchTab(b.dataset.tab); };
}
export function switchTab(t) {
  if (E.mode) return;
  E.tab = t; E.tapHandler = null; UI.adjTool = null; hint('');
  const so = selObj();
  const objTab = so ? { text: 'text', sticker: 'sticker', shape: 'shapes', image: 'overlay' }[so.type] : null;
  if (so && objTab !== t) E.sel = null;
  markTabs(); build();
  if (t === 'draw') drawMode();
  drawUI();
}
export function markTabs() {
  document.querySelectorAll('#tabs .tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === E.tab)));
  const a = document.querySelector(`#tabs [data-tab="${E.tab}"]`); if (a && a.scrollIntoView) a.scrollIntoView({ inline: 'nearest', block: 'nearest' });
}

/* ---------- Grundbausteine ---------- */
const pct = (v, mn, mx) => ((v - mn) / (mx - mn) * 100).toFixed(1) + '%';
function slider(key, label, min, max, val, input, change, step = 1) {
  R.sl[key] = { input, change };
  return `<div class="slrow"><span class="lab">${label}</span><input type="range" data-sl="${key}" min="${min}" max="${max}" step="${step}" value="${val}" style="--p:${pct(val, min, max)}" aria-label="${label}"><output data-out="${key}">${Math.round(val)}</output></div>`;
}
function act(name, fn) { R.act[name] = fn; return name; }
function chips(list, cur, name, fn, cls = 'cats') {
  act(name, el => fn(el.dataset.v));
  return `<div class="hscroll ${cls}" data-keep="${name}">${list.map(([id, l]) => `<button class="${cls === 'cats' ? 'cat' : 'chip'}" data-act="${name}" data-v="${id}" aria-pressed="${id === cur}">${l}</button>`).join('')}</div>`;
}
function colorsRow(cur, name, fn, opt = {}) {
  act(name, el => fn(el.dataset.v));
  R.act[name + ':pick'] = v => fn(v);
  let h = `<div class="hscroll colors" data-keep="${name}">`;
  if (opt.eyedrop) h += `<button class="sw eye" data-act="${act(name + ':eye', opt.eyedrop)}" aria-label="Pipette">${icon('dropper')}</button>`;
  h += `<label class="sw pick" aria-label="Eigene Farbe"><input type="color" data-pick="${name}:pick" value="${/^#[0-9a-f]{6}$/i.test(cur) ? cur : '#ffffff'}"></label>`;
  if (opt.none) h += `<button class="sw none" data-act="${name}" data-v="none" aria-pressed="${cur === 'none'}" aria-label="Keine"></button>`;
  if (opt.transparent) h += `<button class="sw check" data-act="${name}" data-v="transparent" aria-pressed="${cur === 'transparent'}" aria-label="Transparent"></button>`;
  h += PALETTE.map(c => `<button class="sw" style="background:${c}" data-act="${name}" data-v="${c}" aria-pressed="${c === cur}" aria-label="${c}"></button>`).join('');
  return h + '</div>';
}
function toolsRow(list, curFn, name, fn) {
  act(name, el => fn(el.dataset.v));
  return `<div class="hscroll tools" data-keep="${name}">${list.map(([id, l, ic, dot]) => `<button class="tool" data-act="${name}" data-v="${id}" aria-pressed="${curFn(id)}">${icon(ic || id)}<span>${l}</span>${dot ? '<i class="dot"></i>' : ''}</button>`).join('')}</div>`;
}
const btn = (name, fn, label, ic, cls = '') => `<button class="btn ${cls}" data-act="${act(name, fn)}">${ic ? icon(ic) : ''}${label}</button>`;

/* ---------- Vorschaubilder ---------- */
const thumbCache = new Map();
let thumbBaseKey = null, thumbSrc = null;
function getThumbSrc() {
  const key = E.baseId;
  if (thumbBaseKey !== key) { thumbBaseKey = key; thumbSrc = scaled(curBase().prev, 170); thumbCache.clear(); }
  return thumbSrc;
}
function queueThumbs(root) {
  const items = [...root.querySelectorAll('canvas[data-th]')];
  let i = 0;
  const step = () => {
    const t0 = performance.now();
    while (i < items.length && performance.now() - t0 < 24) {
      const c = items[i++]; if (!c.isConnected) continue;
      const k = c.dataset.th; let img = thumbCache.get(k);
      if (!img) { try { img = renderThumb(k); } catch (e) { console.error(e); img = getThumbSrc(); } thumbCache.set(k, img); }
      const x = ctx2d(c), s = Math.max(c.width / img.width, c.height / img.height);
      x.clearRect(0, 0, c.width, c.height);
      x.drawImage(img, (c.width - img.width * s) / 2, (c.height - img.height * s) / 2, img.width * s, img.height * s);
    }
    if (i < items.length) setTimeout(step, 0);
  };
  step();
}
function renderThumb(k) {
  const src = getThumbSrc(), [kind, id] = k.split(':');
  const base = { adj: {}, hsl: {}, curves: freshCurves(), selective: [], filter: null, effect: null };
  if (kind === 'f') return processImage(src, { ...base, filter: { id, amount: 100 } });
  if (kind === 'e') return applyEffect(src, { id, amount: 75 });
  if (kind === 't') { const t = TEMPLATES.find(v => v.id === id); const st = templateState(t); return composite(applyEffect(processImage(src, st), st.effect), { ...st, bg: E.st.bg, objects: [] }, src.width / curBase().full.width, E.assets).canvas; }
  if (kind === 'fr') { const st = { ...E.st, frame: { id, size: 6, color: id === 'film' ? '#111111' : id === 'polaroid' ? '#f7f4ee' : '#ffffff' }, objects: [], bg: { ...E.st.bg, ratio: 'none', pad: 0 } }; return composite(src, st, src.width / curBase().full.width, E.assets).canvas; }
  return src;
}
export function templateState(t, keep = {}) {
  const st = { adj: { ...(t.adj || {}) }, hsl: {}, curves: freshCurves(), selective: [], filter: t.filter ? { id: t.filter[0], amount: t.filter[1] } : null, effect: t.effect ? { id: t.effect[0], amount: t.effect[1] } : null };
  return { ...keep, ...st, frame: t.frame ? { ...t.frame } : (keep.frame || { id: 'none', size: 5, color: '#ffffff' }), tpl: t.id };
}
export function applyTemplate(t) {
  const keep = { bg: E.st.bg, objects: E.st.objects, quality: E.st.quality };
  E.st = { ...E.st, ...templateState(t, { frame: E.st.frame }), ...keep };
  if (!t.frame) E.st.frame = E.st.frame || { id: 'none', size: 5, color: '#ffffff' };
  request(); commit(`Vorlage ${t.n}`);
}
function thumbStrip(items, name, cur, fn, opts = {}) {
  act(name, el => fn(el.dataset.v));
  return `<div class="hscroll strip" data-keep="${name}">${items.map(([id, label, key, extra]) => `<button class="th" data-act="${name}" data-v="${id}" aria-pressed="${id === cur}"><canvas width="136" height="168" data-th="${key}"></canvas><span class="lb">${escapeHtml(label)}</span>${extra || ''}</button>`).join('')}</div>`;
}

/* ---------- Haupt-Aufbau ---------- */
let pendingFocus = false;
export function sync(why) {
  if (why === 'focusText') pendingFocus = true;
  build();
}
export function build() {
  const p = panel(), keep = {};
  p.querySelectorAll('[data-keep]').forEach(el => { keep[el.dataset.keep] = el.scrollLeft; });
  const ta = p.querySelector('textarea'), typing = ta && document.activeElement === ta, selRange = typing ? [ta.selectionStart, ta.selectionEnd] : null;
  R = { sl: {}, act: {}, txt: null };
  let h = '';
  try { h = E.mode ? modePanel(E.mode) : tabPanel(E.tab); } catch (e) { console.error(e); h = `<div class="empty">Fehler im Panel: ${escapeHtml(e.message)}</div>`; }
  p.innerHTML = h;
  p.querySelectorAll('[data-keep]').forEach(el => { if (keep[el.dataset.keep] != null) el.scrollLeft = keep[el.dataset.keep]; });
  queueThumbs(p);
  if (R.after) R.after(p);
  const nt = p.querySelector('textarea');
  if (pendingFocus) { pendingFocus = false; if (nt) { nt.focus(); nt.select(); } }
  else if (typing && nt) { nt.focus(); try { nt.setSelectionRange(selRange[0], selRange[1]); } catch { /* egal */ } }
}

export function initPanel() {
  const p = panel();
  p.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || !p.contains(el)) return; const f = R.act[el.dataset.act]; if (f) f(el, e); });
  p.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.sl) { const s = R.sl[t.dataset.sl]; const v = +t.value; t.style.setProperty('--p', pct(v, +t.min, +t.max)); const o = p.querySelector(`[data-out="${t.dataset.sl}"]`); if (o) o.textContent = Math.round(v); if (s && s.input) s.input(v); }
    else if (t.dataset.pick) { const f = R.act[t.dataset.pick]; if (f) f(t.value, true); }
    else if (t.dataset.txt && R.txt) R.txt(t.value);
  });
  p.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.sl) { const s = R.sl[t.dataset.sl]; if (s && s.change) s.change(+t.value); }
    else if (t.dataset.pick) { const f = R.act[t.dataset.pick]; if (f) f(t.value, false); }
    else if (t.dataset.txtc && R.txtc) R.txtc(t.value);
  });
  /* iOS: Schieberegler sollen nicht die Seite scrollen */
  p.addEventListener('touchmove', e => { if (e.target.type === 'range') e.stopPropagation(); }, { passive: true });
}

/* Regler-Helfer für einfache Zustandswerte */
function stateSlider(key, label, min, max, get, set, heavy = true, histLabel = label) {
  return slider(key, label, min, max, get(), v => { set(v); if (heavy) E.interacting = true; request(); }, v => { set(v); E.interacting = false; request(); commit(histLabel); build(); });
}

/* ================= Tab-Panels ================= */
function tabPanel(t) {
  switch (t) {
    case 'templates': return pTemplates();
    case 'filter': return pFilter();
    case 'adjust': return pAdjust();
    case 'retouch': return pRetouch();
    case 'erase': return pErase();
    case 'effects': return pEffects();
    case 'draw': return pDraw();
    case 'sticker': return pSticker();
    case 'text': return pText();
    case 'cutout': return pCutout();
    case 'overlay': return pOverlay();
    case 'background': return pBackground();
    case 'reshape': return pReshape();
    case 'shapes': return pShapes();
    case 'frame': return pFrame();
  }
  return '';
}

function pTemplates() {
  const list = TEMPLATES.filter(t => UI.tcat === 'all' || t.cat === UI.tcat);
  act('tplNone', () => { E.st.filter = null; E.st.effect = null; E.st.adj = {}; delete E.st.tpl; request(); commit('Vorlage entfernt'); build(); });
  return `<div class="hscroll cats" data-keep="tc"><button class="none" data-act="tplNone" aria-label="Keine Vorlage">${icon('none')}</button><span class="sep"></span>${TEMPLATE_CATS.map(([id, l]) => `<button class="cat" data-act="${act('tcat', el => { UI.tcat = el.dataset.v; build(); })}" data-v="${id}" aria-pressed="${id === UI.tcat}">${l}</button>`).join('')}</div>` +
    thumbStrip(list.map(t => [t.id, t.n, 't:' + t.id]), 'tpl', E.st.tpl, id => { applyTemplate(TEMPLATES.find(t => t.id === id)); build(); });
}

function pFilter() {
  const f = E.st.filter;
  let h = '';
  if (f) {
    const fav = UI.favs.includes(f.id);
    h += `<div class="slrow" style="grid-template-columns:auto minmax(0,1fr) 46px 36px"><span class="lab">${escapeHtml(FILTERS[f.id].n)}</span><input type="range" data-sl="famt" min="0" max="100" value="${f.amount}" style="--p:${f.amount}%" aria-label="Stärke"><output data-out="famt">${f.amount}</output><button class="ibtn" style="width:36px;height:36px;color:${fav ? '#ffd27a' : '#aaa'};font-size:20px" data-act="${act('fav', () => { toggleFav(f.id); })}" aria-label="Favorit">${fav ? '★' : '☆'}</button></div>`;
    R.sl.famt = { input: v => { E.st.filter.amount = v; E.interacting = true; request(); }, change: v => { E.st.filter.amount = v; E.interacting = false; request(); commit('Filterstärke'); } };
  }
  const cat = FILTER_CATS.find(c => c[0] === UI.fcat) || FILTER_CATS[1];
  const ids = cat[0] === 'fav' ? UI.favs.filter(id => FILTERS[id]) : cat[2];
  act('fnone', () => { E.st.filter = null; request(); commit('Filter entfernt'); build(); });
  h += `<div class="hscroll cats" data-keep="fc"><button class="none" data-act="fnone" aria-label="Kein Filter">${icon('none')}</button>${FILTER_CATS.map(([id, l], i) => `${i === 1 ? '<span class="sep"></span>' : ''}<button class="cat" data-act="${act('fcat', el => { UI.fcat = el.dataset.v; build(); const s = panel().querySelector('[data-keep="filters"]'); if (s) s.scrollLeft = 0; })}" data-v="${id}" aria-pressed="${id === UI.fcat}">${l}</button>`).join('')}</div>`;
  if (!ids.length) return h + '<div class="empty">Noch keine Favoriten. Filter wählen und auf ☆ tippen.</div>';
  return h + thumbStrip(ids.map(id => [id, FILTERS[id].n, 'f:' + id, UI.favs.includes(id) ? '<i class="fav">★</i>' : '']), 'filters', f && f.id, id => {
    if (E.st.filter && E.st.filter.id === id) return;
    E.st.filter = { id, amount: 100 }; request(); commit(`Filter ${FILTERS[id].n}`); build();
  });
}
export function toggleFav(id) {
  UI.favs = UI.favs.includes(id) ? UI.favs.filter(x => x !== id) : [...UI.favs, id];
  toast(UI.favs.includes(id) ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
  E.onFavs && E.onFavs(UI.favs); build();
}

function pAdjust() {
  const grp = ADJ_GROUPS.find(g => g[0] === UI.adjGroup), tool = UI.adjTool && grp[2].find(t => t[0] === UI.adjTool);
  let h = '';
  if (tool && tool[3] !== 0) {
    const k = tool[0];
    h += stateSlider('adj', tool[1], tool[2], tool[3], () => E.st.adj[k] || 0, v => { E.st.adj[k] = v; }, true, tool[1]);
    if (k === 'light') h += chips([['l', 'Von links'], ['r', 'Von rechts'], ['t', 'Von oben'], ['b', 'Von unten'], ['c', 'Spot Mitte']], E.st.adj.lightDir || 'l', 'ldir', v => { E.st.adj.lightDir = v; if (!E.st.adj.light) E.st.adj.light = 40; request(); commit('Licht'); build(); }, 'subchips');
    if (k === 'rays') { E.tapHandler = p => { const c = toCanvasFromStage(p); if (!c) return false; E.st.adj.raysPt = c; if (!E.st.adj.rays) E.st.adj.rays = 50; request(); commit('Lichtquelle'); build(); return true; }; hint('Tippe aufs Bild, um die Lichtquelle zu setzen'); }
    else { E.tapHandler = null; hint(''); }
  } else { E.tapHandler = null; }
  h += chips(ADJ_GROUPS.map(g => [g[0], g[1]]), UI.adjGroup, 'agrp', v => { UI.adjGroup = v; UI.adjTool = null; build(); }, 'subchips');
  const list = grp[2].map(([k, l, mn, mx, ic]) => [k, l, ic, mx !== 0 && E.st.adj[k] ? 1 : (k === 'hsl' && hslOn()) || (k === 'curve' && curveOn()) || (k === 'selective' && E.st.selective.length) ? 1 : 0]);
  if (UI.adjGroup === 'visual') list.push(['reset', 'Alles zurück', 'restore', 0]);
  h += toolsRow(list, id => id === UI.adjTool, 'atool', id => {
    if (id === 'crop') return cropMode();
    if (id === 'selective') return selectiveMode();
    if (id === 'hsl') return hslMode();
    if (id === 'curve') return curveMode();
    if (id === 'auto') { Object.assign(E.st.adj, autoAdjust(curBase().prev)); request(); commit('Auto'); toast('Automatisch verbessert'); UI.adjTool = null; build(); return; }
    if (id === 'reset') { E.st.adj = {}; E.st.hsl = {}; E.st.curves = freshCurves(); E.st.selective = []; request(); commit('Anpassungen zurückgesetzt'); toast('Alle Anpassungen zurückgesetzt'); build(); return; }
    UI.adjTool = UI.adjTool === id ? null : id; build();
  });
  return h;
}
const hslOn = () => Object.values(E.st.hsl || {}).some(b => b && (b.h || b.s || b.l));
const curveOn = () => ['rgb', 'r', 'g', 'b'].some(k => E.st.curves[k].length !== 2 || E.st.curves[k][0][1] !== 0 || E.st.curves[k][1][1] !== 1);
function toCanvasFromStage(p) {
  if (!E.vr || !E.lastComp) return null;
  const cx = (p.x - E.vr.left) / E.vr.sc, cy = (p.y - E.vr.top) / E.vr.sc, L = E.lastComp.L, k = E.lastComp.k;
  const ix = (cx / k - L.img.x) / L.img.w, iy = (cy / k - L.img.y) / L.img.h;
  if (ix < 0 || iy < 0 || ix > 1 || iy > 1) return null;
  return { x: ix, y: iy };
}

function pRetouch() {
  return `<div class="empty" style="padding:4px 20px 8px;font-size:12px">Retusche für Produktfotos: Staub, Fingerabdrücke und Reflexe auf Flakons korrigieren.</div>` +
    toolsRow([['smooth', 'Glätten', 'smooth'], ['heal', 'Fleck entfernen', 'heal'], ['lighten', 'Aufhellen', 'lighten'], ['darken', 'Abdunkeln', 'darken'], ['highlight', 'Glanzlicht', 'highlight'],
      ['sharpen', 'Schärfen', 'sharpen'], ['soften', 'Weichzeichnen', 'soften'], ['saturate', 'Sättigen', 'saturate'], ['desaturate', 'Entsättigen', 'desaturate'], ['warm', 'Wärmer', 'warm'], ['reshape', 'Verformen', 'push']],
    () => false, 'rt', id => id === 'reshape' ? warpMode() : brushMode(id));
}
function pErase() {
  return `<div class="empty" style="padding:4px 20px 8px;font-size:12px">Alles wird direkt auf dem Gerät berechnet – kein Upload.</div>` +
    toolsRow([['erase', 'Radierer', 'eraser'], ['heal', 'Fleck entfernen', 'heal'], ['clone', 'Kopierstempel', 'clone'], ['mosaic', 'Mosaik', 'mosaic'], ['privacy', 'Unkenntlich', 'privacy']], () => false, 'er', id => brushMode(id));
}
function pEffects() {
  const ef = E.st.effect, meta = ef && EFFECTS.find(e => e[0] === ef.id);
  let h = '';
  if (ef && meta) {
    h += stateSlider('eamt', meta[1], 0, 100, () => ef.amount, v => { E.st.effect.amount = v; }, true, 'Effektstärke');
    if (meta[3]) { E.tapHandler = p => { const c = toCanvasFromStage(p); if (!c) return false; E.st.effect.pt = c; request(); commit('Effekt-Position'); return true; }; hint('Tippe aufs Bild, um den Effekt zu platzieren'); }
    else { E.tapHandler = null; hint(''); }
  } else { E.tapHandler = null; hint(''); }
  const cat = EFFECT_CATS.find(c => c[0] === UI.ecat);
  const ids = cat[2] || EFFECTS.filter(e => e[2] === cat[0]).map(e => e[0]);
  act('enone', () => { E.st.effect = null; request(); commit('Effekt entfernt'); build(); });
  h += `<div class="hscroll cats" data-keep="ec"><button class="none" data-act="enone" aria-label="Kein Effekt">${icon('none')}</button><span class="sep"></span>${EFFECT_CATS.map(([id, l]) => `<button class="cat" data-act="${act('ecat', el => { UI.ecat = el.dataset.v; build(); })}" data-v="${id}" aria-pressed="${id === UI.ecat}">${l}</button>`).join('')}</div>`;
  return h + thumbStrip(ids.map(id => { const m = EFFECTS.find(e => e[0] === id); return [id, m[1], 'e:' + id, m[3] ? '<i class="pt">◎</i>' : '']; }), 'effects', ef && ef.id, id => {
    if (E.st.effect && E.st.effect.id === id) return;
    E.st.effect = { id, amount: 70 }; const m = EFFECTS.find(e => e[0] === id); if (m[3]) E.st.effect.pt = { ...(EFFECT_POINT_DEFAULT[id] || { x: 0.5, y: 0.5 }) };
    request(); commit(`Effekt ${m[1]}`); build();
  });
}
function pDraw() {
  const has = E.st.objects.find(o => o.type === 'drawing');
  return `<div class="btnrow" style="justify-content:center;padding:18px 14px">${btn('dstart', () => drawMode(), has ? 'Weiter zeichnen' : 'Zeichnen starten', 'edit', 'primary')}${has ? btn('ddel', () => { E.st.objects = E.st.objects.filter(o => o.type !== 'drawing'); request(); commit('Zeichnung gelöscht'); build(); }, 'Zeichnung löschen', 'trash') : ''}</div>`;
}

/* ---------- Ebenen-Eigenschaften (gemeinsam) ---------- */
function layerTools(o) {
  const idx = E.st.objects.indexOf(o);
  return `<div class="btnrow">` +
    btn('lflip', () => { o.flip = !o.flip; request(); commit('Gespiegelt'); }, 'Spiegeln', 'flipH') +
    btn('lfront', () => { const i = E.st.objects.indexOf(o); if (i < E.st.objects.length - 1) { E.st.objects.splice(i, 1); E.st.objects.push(o); request(); commit('Nach vorn'); toast('Ganz nach vorn'); } }, 'Vorn', 'front') +
    btn('lback', () => { const i = E.st.objects.indexOf(o); if (i > 0) { E.st.objects.splice(i, 1); E.st.objects.unshift(o); request(); commit('Nach hinten'); toast('Ganz nach hinten'); } }, 'Hinten', 'back') +
    btn('ldup', () => duplicateObj(o.id), 'Duplizieren', 'dup') +
    btn('lcenter', () => { o.x = 0.5; o.y = 0.5; o.rot = 0; request(); commit('Zentriert'); }, 'Zentrieren', 'expand') +
    btn('ldel', () => deleteObj(o.id), 'Löschen', 'trash') + `</div>` + (idx < 0 ? '' : '');
}
const objSlider = (o, key, label, min, max, histLabel) => stateSlider('o_' + key, label, min, max, () => o[key] ?? 0, v => { o[key] = v; }, false, histLabel || label);

function pSticker() {
  const o = selObj();
  if (o && o.type === 'sticker') {
    let h = '';
    if (!o.emoji) h += colorsRow(o.color, 'scol', v => { o.color = v; request(); commit('Stickerfarbe'); build(); });
    h += objSlider(o, 'opacity', 'Deckkraft', 0, 100);
    h += `<div class="btnrow">${btn('sshadow', () => { o.shadow = !o.shadow; request(); commit('Schatten'); build(); }, o.shadow ? 'Schatten aus' : 'Schatten an', 'ambient')}${btn('snew', () => { E.sel = null; build(); drawUI(); }, 'Weitere Sticker', 'plus')}</div>`;
    return h + layerTools(o);
  }
  const list = STICKERS[UI.scat];
  let h = chips(STICKER_CATS, UI.scat, 'scat', v => { UI.scat = v; build(); });
  if (UI.scat === 'emoji') {
    act('stk', el => addObject({ type: 'sticker', emoji: el.dataset.v, w: 0.18 }));
    h += `<div class="hscroll strip" data-keep="stk">${list.map(e => `<button class="stk" data-act="stk" data-v="${e}">${e}</button>`).join('')}</div>`;
  } else {
    act('stk', el => {
      const id = el.dataset.v, wide = ['rating5', 'rating4', 'rating3', 'review', 'underline'].includes(id);
      addObject({ type: 'sticker', sticker: id, color: UI.scat === 'rof' ? (id.startsWith('rating') ? '#f5c518' : '#b08a5a') : '#ffffff', w: wide ? 0.45 : 0.2, shadow: true });
    });
    h += `<div class="hscroll strip" data-keep="stk">${list.map(([id, n, svg]) => `<button class="stk" data-act="stk" data-v="${id}" title="${n}" aria-label="${n}"><img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replaceAll('{c}', UI.scat === 'rof' ? '#d9b07a' : '#ffffff'))}"></button>`).join('')}</div>`;
  }
  return h;
}

function newText(style, text, extra = {}) {
  const s = TEXT_STYLES.find(t => t[0] === style)[2];
  return addObject({ type: 'text', text: text || 'Dein Text', size: 0.07, align: 'center', lineHeight: 1.2, curve: 0, opacity: 100, shadowColor: '#000000', bgRadius: 30, strokeColor: '#000000', bgColor: '#000000', glow: 0, ...deep(s), ...extra });
}
function pText() {
  const o = selObj();
  if (!o || o.type !== 'text') {
    act('tstyle', el => { newText(el.dataset.v); E.panelSync('focusText'); });
    return `<div class="btnrow" style="padding-top:4px">${btn('tadd', () => { newText('plain'); E.panelSync('focusText'); }, 'Text hinzufügen', 'plus', 'primary')}${btn('twm', () => {
      newText('editorial', E.watermark || 'Realm of Fragrance', { size: 0.035, x: 0.78, y: 0.94, opacity: 80 }); build();
    }, 'Wasserzeichen', 'shield')}${btn('tdate', () => { const d = new Date(); newText('date', `${String(d.getDate()).padStart(2, '0')} ${String(d.getMonth() + 1).padStart(2, '0')} '${String(d.getFullYear()).slice(2)}`, { x: 0.8, y: 0.92, size: 0.045 }); build(); }, 'Datum', 'film')}</div>` +
      `<div class="hscroll strip" data-keep="tst">${TEXT_STYLES.map(([id, n, s]) => `<button class="th" data-act="tstyle" data-v="${id}" style="width:86px"><span style="display:grid;place-items:center;height:62px;background:#1c1c1e;font-family:${escapeHtml(fontFamily(s.font))};font-size:22px;${s.italic ? 'font-style:italic;' : ''}${s.bold ? 'font-weight:700;' : ''}color:${s.color};${s.bg ? `background:${s.bgColor};` : ''}${s.stroke ? `-webkit-text-stroke:1px ${s.strokeColor};` : ''}${s.glow ? `text-shadow:0 0 8px ${s.color};` : ''}">${s.caps ? 'AA' : 'Aa'}</span><span class="lb" style="position:static">${n}</span></button>`).join('')}</div>`;
  }
  R.txt = v => { o.text = v; request(); };
  R.txtc = () => commit('Text geändert');
  let h = `<div class="textin"><textarea data-txt="1" data-txtc="1" rows="1" aria-label="Text" placeholder="Text eingeben">${escapeHtml(o.text)}</textarea></div>`;
  h += chips([['style', 'Stil'], ['font', 'Schrift'], ['color', 'Farbe'], ['stroke', 'Kontur'], ['bg', 'Hintergrund'], ['layout', 'Layout'], ['layer', 'Ebene']], UI.textSub, 'tsub', v => { UI.textSub = v; build(); }, 'subchips');
  const set = (k, v, l) => { o[k] = v; request(); commit(l); build(); };
  switch (UI.textSub) {
    case 'style':
      act('tsty', el => { const s = TEXT_STYLES.find(t => t[0] === el.dataset.v)[2]; Object.assign(o, { stroke: 0, shadow: 0, bg: 0, glow: 0 }, deep(s)); request(); commit('Textstil'); build(); });
      h += `<div class="hscroll fontlist" data-keep="tsty">${TEXT_STYLES.map(([id, n]) => `<button class="font" style="font-size:14px" data-act="tsty" data-v="${id}">${n}</button>`).join('')}</div>`;
      h += `<div class="btnrow">${btn('tb', () => set('bold', !o.bold, 'Fett'), o.bold ? '<b>F</b> an' : 'Fett')}${btn('ti', () => set('italic', !o.italic, 'Kursiv'), o.italic ? '<i>K</i> an' : 'Kursiv')}${btn('tc', () => set('caps', !o.caps, 'Großbuchstaben'), o.caps ? 'AA an' : 'Großbuchst.')}</div>`;
      break;
    case 'font':
      act('tfont', el => set('font', el.dataset.v, 'Schrift'));
      h += `<div class="hscroll fontlist" data-keep="tfont">${FONTS.map(([n, fam]) => `<button class="font" data-act="tfont" data-v="${n}" aria-pressed="${n === o.font}" style="font-family:${escapeHtml(fam)}">${n}</button>`).join('')}</div>`;
      h += objSlider(o, 'spacing', 'Abstand', -5, 60, 'Zeichenabstand');
      break;
    case 'color':
      h += colorsRow(o.color, 'tcol', v => set('color', v, 'Textfarbe'));
      h += objSlider(o, 'opacity', 'Deckkraft', 0, 100) + objSlider(o, 'glow', 'Leuchten', 0, 100);
      break;
    case 'stroke':
      h += colorsRow(o.strokeColor, 'tscol', v => { o.strokeColor = v; if (!o.stroke) o.stroke = 6; request(); commit('Konturfarbe'); build(); });
      h += objSlider(o, 'stroke', 'Kontur', 0, 30) + objSlider(o, 'shadow', 'Schatten', 0, 100);
      break;
    case 'bg':
      h += colorsRow(o.bgColor, 'tbcol', v => { o.bgColor = v; if (!o.bg) o.bg = 85; request(); commit('Texthintergrund'); build(); });
      h += objSlider(o, 'bg', 'Deckkraft', 0, 100, 'Texthintergrund') + objSlider(o, 'bgRadius', 'Ecken', 0, 100);
      break;
    case 'layout':
      act('talign', el => set('align', el.dataset.v, 'Ausrichtung'));
      h += `<div class="btnrow">${[['left', 'alignL'], ['center', 'alignC'], ['right', 'alignR']].map(([v, ic]) => `<button class="btn" data-act="talign" data-v="${v}" aria-pressed="${o.align === v}" style="${o.align === v ? 'background:#48484c' : ''}">${icon(ic)}</button>`).join('')}</div>`;
      h += stateSlider('tlh', 'Zeilen', 80, 200, () => Math.round((o.lineHeight || 1.2) * 100), v => { o.lineHeight = v / 100; }, false, 'Zeilenabstand');
      h += objSlider(o, 'curve', 'Bogen', -100, 100);
      h += stateSlider('tsize', 'Größe', 1, 40, () => Math.round(o.size * 100 * 10) / 10, v => { o.size = v / 100; }, false, 'Textgröße');
      break;
    case 'layer':
      h += layerTools(o);
      break;
  }
  return h;
}

function pCutout() {
  return `<div class="empty" style="padding:4px 20px 8px;font-size:12px">Freistellen läuft lokal. „Automatisch“ funktioniert am besten bei ruhigem, einfarbigem Hintergrund – danach mit dem Pinsel nachbessern.</div>` +
    toolsRow([['auto', 'Automatisch', 'autocut'], ['wand', 'Zauberstab', 'wand'], ['remove', 'Radieren', 'remove'], ['keep', 'Behalten', 'keep']], () => false, 'co', id => {
      const m = cutoutMode(); m.tab = id; document.querySelectorAll('#mTabs [data-mt]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mt === id)));
      if (id === 'auto') m.runAuto();
      build();
    });
}

/* Überlagern: eigene Fotos oder erzeugte Licht-Ebenen */
const OVERLAYS = [['leak', 'Lichtleck'], ['bokeh', 'Bokeh'], ['rainbow', 'Regenbogen'], ['glitter', 'Glitzer'], ['dust', 'Staub'], ['grad', 'Verlauf'], ['sun', 'Sonne'], ['film', 'Filmkorn']];
function makeOverlay(id) {
  const W = 1200, H = 900, c = cv(W, H), x = ctx2d(c), R = rng(id.length * 31 + 7);
  if (id === 'leak') { for (const [px, py, col] of [[0, 300, '255,90,40'], [80, 820, '255,40,120'], [260, 520, '255,190,80']]) { const g = x.createRadialGradient(px, py, 0, px, py, 620); g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(0, 0, W, H); } }
  if (id === 'bokeh') { for (let i = 0; i < 60; i++) { const px = R() * W, py = R() * H, r = 20 + R() * 70, hue = 20 + R() * 50, g = x.createRadialGradient(px, py, r * 0.6, px, py, r); g.addColorStop(0, `hsla(${hue},100%,75%,${0.25 + R() * 0.35})`); g.addColorStop(1, `hsla(${hue},100%,70%,0)`); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); } }
  if (id === 'rainbow') { const g = x.createLinearGradient(0, 0, W, H); ['#ff0040', '#ff9a00', '#ffe600', '#33ff66', '#00b3ff', '#8a2bff'].forEach((col, i) => g.addColorStop(0.2 + i * 0.12, col)); x.fillStyle = g; x.globalAlpha = 0.85; x.fillRect(0, 0, W, H); }
  if (id === 'glitter') { for (let i = 0; i < 400; i++) { const px = R() * W, py = R() * H, r = 1 + R() * 3.5; x.fillStyle = `hsla(${40 + R() * 300},100%,${80 + R() * 20}%,${0.5 + R() * 0.5})`; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); if (R() > 0.92) { x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px - r * 5, py); x.lineTo(px + r * 5, py); x.moveTo(px, py - r * 5); x.lineTo(px, py + r * 5); x.stroke(); } } }
  if (id === 'dust') { for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(255,250,240,${0.2 + R() * 0.6})`; const r = 0.6 + R() * R() * 4; x.beginPath(); x.ellipse(R() * W, R() * H, r, r * (0.4 + R()), R() * 3, 0, 7); x.fill(); } for (let i = 0; i < 12; i++) { x.strokeStyle = `rgba(255,250,240,${0.2 + R() * 0.4})`; x.lineWidth = 0.6 + R(); const sx = R() * W; x.beginPath(); x.moveTo(sx, R() * H); x.lineTo(sx + (R() - 0.5) * 40, R() * H); x.stroke(); } }
  if (id === 'grad') { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ff8fab'); g.addColorStop(1, '#3e63dd'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  if (id === 'sun') { const g = x.createRadialGradient(W * 0.8, H * 0.15, 0, W * 0.8, H * 0.15, 900); g.addColorStop(0, 'rgba(255,245,220,1)'); g.addColorStop(0.15, 'rgba(255,200,120,.8)'); g.addColorStop(1, 'rgba(255,140,60,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  if (id === 'film') { x.fillStyle = '#808080'; x.fillRect(0, 0, W, H); const d = x.getImageData(0, 0, W, H); for (let i = 0; i < d.data.length; i += 4) { const n = 128 + (R() - 0.5) * 120; d.data[i] = d.data[i + 1] = d.data[i + 2] = n; } x.putImageData(d, 0, 0); }
  return c;
}
const BLENDS = [['normal', 'Normal'], ['screen', 'Negativ mult.'], ['multiply', 'Multiplizieren'], ['overlay', 'Ineinander'], ['soft-light', 'Weiches Licht'], ['lighten', 'Aufhellen'], ['darken', 'Abdunkeln'], ['color-dodge', 'Farbig abwedeln'], ['difference', 'Differenz'], ['color', 'Farbe'], ['luminosity', 'Luminanz']];
function addImageLayer(canvas, blend, opacity, name) {
  const id = 'a' + Math.random().toString(36).slice(2, 8); E.assets.set(id, canvas);
  const o = addObject({ type: 'image', asset: id, w: 1, blend, opacity, feather: 0, name });
  /* Lichteffekte decken das ganze Bild ab */
  const c = E.lastComp; if (c) { const ar = c.canvas.width / c.canvas.height, ia = canvas.width / canvas.height; o.w = ia >= ar ? ia / ar * 1 : 1; o.w = Math.max(1, o.w); }
  request();
  return o;
}
function pOverlay() {
  const o = selObj();
  if (o && o.type === 'image') {
    let h = chips(BLENDS, o.blend || 'normal', 'oblend', v => { o.blend = v; request(); commit('Mischmodus'); build(); }, 'subchips');
    h += objSlider(o, 'opacity', 'Deckkraft', 0, 100) + objSlider(o, 'feather', 'Weicher Rand', 0, 100);
    return h + layerTools(o);
  }
  act('ovl', el => { const id = el.dataset.v; addImageLayer(makeOverlay(id), id === 'grad' || id === 'rainbow' ? 'soft-light' : id === 'film' ? 'overlay' : 'screen', id === 'rainbow' ? 45 : 80, OVERLAYS.find(v => v[0] === id)[1]); commit('Überlagerung'); build(); });
  return `<div class="btnrow" style="padding-top:4px">${btn('oadd', () => E.pickOverlayPhoto && E.pickOverlayPhoto(), 'Foto hinzufügen', 'photo', 'primary')}</div>` +
    `<div class="hscroll strip" data-keep="ovl">${OVERLAYS.map(([id, n]) => `<button class="th" data-act="ovl" data-v="${id}"><canvas width="136" height="168" data-ov="${id}"></canvas><span class="lb">${n}</span></button>`).join('')}</div>` + afterOverlayThumbs();
}
function afterOverlayThumbs() {
  R.after = p => p.querySelectorAll('canvas[data-ov]').forEach(c => { const src = makeOverlayThumb(c.dataset.ov); ctx2d(c).drawImage(src, 0, 0, c.width, c.height); });
  return '';
}
const ovThumbs = new Map();
function makeOverlayThumb(id) { if (!ovThumbs.has(id)) { const big = makeOverlay(id), t = cv(136, 168), x = ctx2d(t); x.fillStyle = '#222'; x.fillRect(0, 0, 136, 168); x.drawImage(big, 0, 0, 136, 168); ovThumbs.set(id, t); } return ovThumbs.get(id); }
export function addOverlayPhoto(img) {
  const f = fitLimit(img.naturalWidth || img.width, img.naturalHeight || img.height, 2400);
  const c = resize(img, f.w, f.h);
  const o = addImageLayer(c, 'normal', 100, 'Foto'); o.w = 0.6; request(); commit('Foto überlagert'); build();
}

function pBackground() {
  const bg = E.st.bg;
  let h = chips([['ratio', 'Format'], ['fill', 'Füllung'], ['shape', 'Rand & Ecken']], UI.bgSub, 'bgsub', v => { UI.bgSub = v; build(); }, 'subchips');
  const setBg = (patch, l) => { Object.assign(E.st.bg, patch); request(); commit(l); build(); };
  if (UI.bgSub === 'ratio') {
    act('bgr', el => { const v = el.dataset.v; setBg({ ratio: v, fill: v !== 'none' && bg.fill === 'none' ? 'blur' : bg.fill }, 'Format'); });
    h += `<div class="hscroll ratios" data-keep="bgr">${BG_RATIOS.map(([id, l, r]) => { const w = r ? (r >= 1 ? 22 : 22 * r) : 18, hh = r ? (r >= 1 ? 22 / r : 22) : 18; return `<button class="ratio" data-act="bgr" data-v="${id}" aria-pressed="${id === bg.ratio}">${id === 'none' ? icon('none') : `<i style="width:${w}px;height:${hh}px"></i>`}<span>${l}</span></button>`; }).join('')}</div>`;
    h += `<div class="empty" style="padding:0 20px 10px;font-size:12px">Format ändern ohne Zuschneiden – der freie Raum wird gefüllt (wie „Erweitern“).</div>`;
  } else if (UI.bgSub === 'fill') {
    act('bgf', el => setBg({ fill: el.dataset.v }, 'Hintergrund'));
    act('bgg', el => { const g = GRADIENTS[+el.dataset.v]; setBg({ fill: 'gradient', g1: g[0], g2: g[1] }, 'Verlauf'); });
    h += `<div class="hscroll colors" data-keep="bgf"><button class="sw none" data-act="bgf" data-v="none" aria-pressed="${bg.fill === 'none'}" aria-label="Ohne"></button>` +
      `<button class="bsh" style="height:30px;min-width:auto;padding:0 10px" data-act="bgf" data-v="blur" aria-pressed="${bg.fill === 'blur'}">Weich</button>` +
      `<button class="bsh" style="height:30px;min-width:auto;padding:0 10px" data-act="bgf" data-v="mirror" aria-pressed="${bg.fill === 'mirror'}">Spiegeln</button>` +
      GRADIENTS.map((g, i) => `<button class="sw" style="background:linear-gradient(160deg,${g[0]},${g[1]})" data-act="bgg" data-v="${i}" aria-pressed="${bg.fill === 'gradient' && bg.g1 === g[0] && bg.g2 === g[1]}" aria-label="Verlauf"></button>`).join('') + '</div>';
    h += colorsRow(bg.fill === 'color' ? bg.color : '', 'bgc', v => { if (v === 'transparent') setBg({ fill: 'none' }, 'Transparent'); else setBg({ fill: 'color', color: v }, 'Hintergrundfarbe'); }, { transparent: true });
  } else {
    h += stateSlider('bpad', 'Rand', 0, 40, () => bg.pad, v => { E.st.bg.pad = v; if (v && E.st.bg.fill === 'none' && E.st.bg.ratio === 'none') E.st.bg.fill = 'color'; }, false, 'Rand');
    h += stateSlider('bround', 'Ecken', 0, 100, () => bg.round, v => { E.st.bg.round = v; }, false, 'Ecken');
    h += stateSlider('bshadow', 'Schatten', 0, 100, () => bg.shadow, v => { E.st.bg.shadow = v; }, false, 'Schatten');
  }
  return h;
}
function pReshape() {
  return `<div class="empty" style="padding:4px 20px 8px;font-size:12px">Formen verschieben, vergrößern oder verkleinern – z. B. schiefe Flakons begradigen.</div>` +
    toolsRow([['push', 'Schieben', 'push'], ['bulge', 'Vergrößern', 'bulge'], ['pinch', 'Verkleinern', 'pinch'], ['restore', 'Zurück', 'restore']], () => false, 'rs', id => {
      const m = warpMode(); m.tab = id; document.querySelectorAll('#mTabs [data-mt]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mt === id))); build();
    });
}
function shapeIcon(kind) {
  const c = cv(64, 64), x = ctx2d(c); x.translate(32, 32); shapePath(x, kind, kind === 'line' || kind === 'arrow' ? 44 : 40, kind === 'line' || kind === 'arrow' ? 6 : 40);
  x.lineWidth = 3; x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineCap = 'round'; if (['line', 'arrow', 'ring'].includes(kind)) x.stroke(); else x.fill();
  return c.toDataURL();
}
const shapeIcons = {};
function pShapes() {
  const o = selObj();
  if (o && o.type === 'shape') {
    let h = colorsRow(o.color, 'shcol', v => { o.color = v; request(); commit('Formfarbe'); build(); });
    h += `<div class="btnrow">${btn('shfill', () => { o.fillOn = !o.fillOn; if (!o.fillOn && !o.strokeW) o.strokeW = 20; request(); commit('Füllung'); build(); }, o.fillOn ? 'Nur Kontur' : 'Gefüllt', 'shine')}</div>`;
    h += objSlider(o, 'strokeW', 'Linie', 0, 100) + objSlider(o, 'opacity', 'Deckkraft', 0, 100);
    return h + layerTools(o);
  }
  act('shp', el => { const k = el.dataset.v, thin = k === 'line' || k === 'arrow'; addObject({ type: 'shape', shape: k, w: 0.3, h: thin ? 0.02 : 0.3, color: '#ffffff', fillOn: !['line', 'arrow', 'ring'].includes(k), strokeW: thin || k === 'ring' ? 20 : 0 }); });
  return `<div class="hscroll strip" data-keep="shp">${SHAPES.map(([id, n]) => `<button class="stk" data-act="shp" data-v="${id}" title="${n}" aria-label="${n}"><img alt="" src="${shapeIcons[id] ||= shapeIcon(id)}"></button>`).join('')}</div>`;
}
function pFrame() {
  const f = E.st.frame;
  let h = '';
  if (f.id !== 'none') {
    h += stateSlider('fsize', 'Breite', 1, 20, () => f.size, v => { E.st.frame.size = v; }, false, 'Rahmenbreite');
    h += colorsRow(f.color, 'fcol', v => { E.st.frame.color = v; request(); commit('Rahmenfarbe'); build(); });
  }
  return h + thumbStrip(FRAMES.map(([id, n]) => [id, n, 'fr:' + id]), 'frames', f.id, id => {
    const def = { film: '#111111', polaroid: '#f7f4ee', vintage: '#efe6d2', gallery: '#ffffff' };
    E.st.frame = { id, size: id === 'none' ? 5 : (f.id === 'none' ? (id === 'film' ? 6 : 5) : f.size), color: def[id] || (f.id === 'none' ? '#ffffff' : f.color) };
    request(); commit('Rahmen'); build();
  });
}

/* ================= Modus-Panels ================= */
function modePanel(m) {
  switch (m.id) {
    case 'crop': return mCrop(m);
    case 'brush': return mBrush(m);
    case 'cutout': return mCutout(m);
    case 'warp': return mWarp(m);
    case 'draw': return mDraw(m);
    case 'selective': return mSelective(m);
    case 'curve': return mCurve(m);
    case 'hsl': return mHsl(m);
  }
  return '';
}
function mCrop(m) {
  if (m.tab === 'crop') {
    act('asp', el => { m.setAspect(el.dataset.v); build(); });
    return `<div class="hscroll ratios" data-keep="asp" style="padding-top:10px">${ASPECTS.map(([id, l, r]) => { const rr = r === 'orig' ? 4 / 3 : r; const w = rr ? (rr >= 1 ? 22 : 22 * rr) : 20, hh = rr ? (rr >= 1 ? 22 / rr : 22) : 20; return `<button class="ratio" data-act="asp" data-v="${id}" aria-pressed="${id === m.aspect}"><i style="width:${w}px;height:${hh}px;${!r ? 'border-style:dashed' : ''}"></i><span>${l}</span></button>`; }).join('')}</div>` +
      `<div class="btnrow" style="justify-content:center">${btn('creset', () => { m.t = { rot: 0, flipH: false, flipV: false, straight: 0, persH: 0, persV: 0 }; m.tkey = null; m.aspect = 'free'; m.fitRect(); request(); build(); }, 'Zurücksetzen', 'restore')}</div>`;
  }
  if (m.tab === 'rotate') {
    return `<div class="btnrow" style="justify-content:center;padding-top:10px">${btn('rl', () => m.changeT({ rot: (m.t.rot + 270) % 360 }), 'Links', 'rot')}${btn('rr', () => m.changeT({ rot: (m.t.rot + 90) % 360 }), 'Rechts', 'rot')}${btn('fh', () => m.changeT({ flipH: !m.t.flipH }), 'Horizontal', 'flipH')}${btn('fv', () => m.changeT({ flipV: !m.t.flipV }), 'Vertikal', 'flipV')}</div>` +
      slider('straight', 'Begradigen', -45, 45, m.t.straight, v => { m.t.straight = v; m.tkey = null; request(); }, v => { m.changeT({ straight: v }); }, 0.5);
  }
  return slider('ph', 'Horizontal', -100, 100, m.t.persH, v => { m.t.persH = v; m.tkey = null; request(); }, v => m.changeT({ persH: v })) +
    slider('pv', 'Vertikal', -100, 100, m.t.persV, v => { m.t.persV = v; m.tkey = null; request(); }, v => m.changeT({ persV: v })) +
    `<div class="empty" style="padding:0 20px 8px;font-size:12px">Stürzende Linien von Flakons und Regalen ausgleichen.</div>`;
}
function mBrush(m) {
  let h = slider('bsize', 'Größe', 4, 150, m.size, v => { m.size = v; m.cursor = { x: E.vr.sw / 2, y: E.vr.sh / 2 }; drawUI(); }, v => { m.size = v; m.cursor = null; drawUI(); });
  if (!['erase', 'heal', 'clone'].includes(m.kind)) h += slider('bflow', 'Stärke', 10, 100, Math.round(m.flow * 100), v => { m.flow = v / 100; }, v => { m.flow = v / 100; });
  h += `<div class="btnrow" style="justify-content:center">`;
  if (m.kind === 'clone') h += btn('csrc', () => { m.pickSource = true; m.source = null; m.offset = null; toast('Tippe auf die Stelle, von der kopiert werden soll'); }, m.source ? 'Neue Quelle' : 'Quelle wählen', 'clone', m.source ? '' : 'primary');
  h += btn('bback', () => m.stepBack(), 'Schritt zurück', 'restore');
  if (m.kind !== 'erase' && m.kind !== 'heal') h += btn('berase', () => { const on = m.toggleErase(); $('eraseToggle').setAttribute('aria-pressed', String(on)); build(); }, m.erase ? 'Malen' : 'Wegradieren', 'eraser');
  return h + '</div>';
}
function mCutout(m) {
  let h = '';
  if (m.tab === 'auto') h += `<div class="btnrow" style="justify-content:center;padding-top:6px">${btn('cauto', () => m.runAuto(), 'Hintergrund erkennen', 'autocut', 'primary')}${btn('cinv', () => m.invert(), 'Umkehren', 'flipH')}${btn('cclr', () => m.clear(), 'Neu', 'restore')}</div>`;
  if (m.tab === 'auto' || m.tab === 'wand') h += slider('ctol', 'Toleranz', 5, 90, m.tol, v => { m.tol = v; }, v => { m.tol = v; });
  if (m.tab === 'wand') h += `<div class="empty" style="padding:0 20px 8px;font-size:12px">Auf eine Fläche tippen, um ähnliche Farben zu entfernen.</div>`;
  if (m.tab === 'remove' || m.tab === 'keep') h += slider('csize', 'Größe', 4, 150, m.size, v => { m.size = v; m.cursor = { x: E.vr.sw / 2, y: E.vr.sh / 2 }; drawUI(); }, v => { m.size = v; m.cursor = null; drawUI(); });
  h += slider('cfea', 'Kante weich', 0, 100, m.feather, v => { m.feather = v; }, v => { m.feather = v; });
  return h + `<div class="btnrow" style="justify-content:center">${btn('cback', () => m.stepBack(), 'Schritt zurück', 'restore')}</div>`;
}
function mWarp(m) {
  return slider('wsize', 'Größe', 10, 250, m.size, v => { m.size = v; m.cursor = { x: E.vr.sw / 2, y: E.vr.sh / 2 }; drawUI(); }, v => { m.size = v; m.cursor = null; drawUI(); }) +
    slider('wstr', 'Stärke', 5, 100, m.strength, v => { m.strength = v; }, v => { m.strength = v; }) +
    `<div class="btnrow" style="justify-content:center">${btn('wback', () => m.stepBack(), 'Schritt zurück', 'restore')}${btn('wall', () => { m.warp.dx.fill(0); m.warp.dy.fill(0); m.img = null; request(); }, 'Alles zurück', 'trash')}</div>`;
}
function mDraw(m) {
  let h = '';
  const sizeMax = m.tab === 'pattern' ? 60 : 80;
  h += slider('dsize', 'Größe', 2, sizeMax, Math.min(m.size, sizeMax), v => { m.size = v; m.cursor = { x: E.vr.sw / 2, y: E.vr.sh / 2 }; drawUI(); }, v => { m.size = v; m.cursor = null; drawUI(); });
  if (m.tab === 'basic') {
    h += slider('dop', 'Deckkraft', 10, 100, m.opacity, v => { m.opacity = v; }, v => { m.opacity = v; });
    act('dtool', el => { m.tool = el.dataset.v; m.erase = false; $('eraseToggle').setAttribute('aria-pressed', 'false'); build(); });
    h += `<div class="hscroll brushes" data-keep="dtool">${[['pen', 'Stift', '✎'], ['marker', 'Marker', '▬'], ['neon', 'Neon', '✺'], ['dash', 'Gestrichelt', '┅']].map(([id, n, g]) => `<button class="bsh" data-act="dtool" data-v="${id}" aria-pressed="${m.tool === id && !m.erase}"><span class="glyph">${g}</span>${n}</button>`).join('')}</div>`;
  } else if (m.tab === 'pattern') {
    act('dstamp', el => { m.stamp = el.dataset.v; build(); });
    h += `<div class="hscroll brushes" data-keep="dstamp">${PATTERN_STAMPS.map(([id, g]) => `<button class="bsh" data-act="dstamp" data-v="${g}" aria-pressed="${m.stamp === g}"><span class="glyph">${g}</span></button>`).join('')}</div>`;
  } else {
    R.txt = v => { m.text = v || ' '; };
    h += `<div class="textin"><textarea data-txt="1" rows="1" aria-label="Pinsel-Text">${escapeHtml(m.text)}</textarea></div>`;
  }
  h += colorsRow(m.color, 'dcol', v => { m.color = v; m.erase = false; build(); }, { eyedrop: () => { m.picking = true; toast('Tippe aufs Bild, um eine Farbe aufzunehmen'); } });
  h += `<div class="btnrow" style="justify-content:center">${btn('dun', () => m.stepBack(), 'Zurück', 'restore')}${btn('dre', () => m.stepFwd(), 'Vor', 'rot')}${btn('dclr', () => m.clearAll(), 'Alles löschen', 'trash')}</div>`;
  return h;
}
function mSelective(m) {
  const s = E.st.selective[m.active];
  if (!s) return `<div class="empty" style="text-align:center;padding:30px 20px">Tippe auf eine Stelle im Bild, um sie gezielt anzupassen.</div>`;
  const P = [['b', 'Helligkeit', -100, 100], ['c', 'Kontrast', -100, 100], ['s', 'Sättigung', -100, 100], ['t', 'Wärme', -100, 100], ['r', 'Größe', 3, 80]];
  const cur = P.find(p => p[0] === UI.selParam) || P[0], k = cur[0];
  const get = () => k === 'r' ? Math.round(s.r * 100) : s[k];
  let h = slider('sel', cur[1], cur[2], cur[3], get(), v => { if (k === 'r') s.r = v / 100; else s[k] = v; E.interacting = true; request(); drawUI(); }, v => { if (k === 'r') s.r = v / 100; else s[k] = v; E.interacting = false; request(); });
  h += chips(P.map(p => [p[0], p[1]]), UI.selParam, 'selp', v => { UI.selParam = v; build(); }, 'subchips');
  h += `<div class="btnrow" style="justify-content:center">${btn('seldel', () => { E.st.selective.splice(m.active, 1); m.active = E.st.selective.length - 1; request(); build(); }, `Punkt ${m.active + 1} löschen`, 'trash')}</div>`;
  return h;
}
function mCurve(m) {
  const ch = m.channel;
  act('cch', el => { m.channel = el.dataset.v; build(); });
  let h = `<div class="hscroll subchips" data-keep="cch">${[['rgb', 'RGB', '#fff'], ['r', 'Rot', '#ff5a5f'], ['g', 'Grün', '#46c768'], ['b', 'Blau', '#4c8dff']].map(([id, l, c]) => `<button class="chip" data-act="cch" data-v="${id}" aria-pressed="${id === ch}" style="${id === ch ? `color:${c}` : ''}">${l}</button>`).join('')}<button class="chip" data-act="${act('creset', () => { E.st.curves[ch] = [[0, 0], [1, 1]]; request(); build(); })}">Zurücksetzen</button></div>`;
  h += `<div style="padding:0 20px 10px;display:flex;justify-content:center"><canvas id="curveCv" width="560" height="300" style="width:min(100%,560px);height:150px;background:#111;border-radius:10px;touch-action:none"></canvas></div>`;
  R.after = () => initCurveEditor(m);
  return h;
}
function initCurveEditor(m) {
  const c = $('curveCv'); if (!c) return;
  const x = ctx2d(c), col = { rgb: '#ffffff', r: '#ff5a5f', g: '#46c768', b: '#4c8dff' }[m.channel];
  const pts = () => E.st.curves[m.channel];
  const pad = 14, W = c.width - 2 * pad, H = c.height - 2 * pad;
  const draw = () => {
    x.clearRect(0, 0, c.width, c.height);
    x.strokeStyle = '#2a2a2d'; x.lineWidth = 1;
    for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(pad + W * i / 4, pad); x.lineTo(pad + W * i / 4, pad + H); x.moveTo(pad, pad + H * i / 4); x.lineTo(pad + W, pad + H * i / 4); x.stroke(); }
    x.strokeStyle = '#3a3a3d'; x.beginPath(); x.moveTo(pad, pad + H); x.lineTo(pad + W, pad); x.stroke();
    const lut = curveLut(pts());
    x.strokeStyle = col; x.lineWidth = 3; x.beginPath();
    for (let i = 0; i < 256; i++) { const px = pad + i / 255 * W, py = pad + H - lut[i] / 255 * H; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    for (const p of pts()) { x.fillStyle = '#000'; x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.arc(pad + p[0] * W, pad + H - p[1] * H, 9, 0, 7); x.fill(); x.stroke(); }
  };
  draw();
  let drag = -1;
  const pos = e => { const r = c.getBoundingClientRect(); return [clamp(((e.clientX - r.left) * c.width / r.width - pad) / W, 0, 1), clamp(1 - ((e.clientY - r.top) * c.height / r.height - pad) / H, 0, 1)]; };
  c.onpointerdown = e => {
    c.setPointerCapture(e.pointerId);
    const [px, py] = pos(e), P = pts(), r = c.getBoundingClientRect(), tol = 24 * c.width / r.width / W;
    drag = P.findIndex(p => Math.hypot(p[0] - px, (p[1] - py) * H / W) < tol);
    if (drag < 0) { if (P.length >= 10) return; P.push([px, py]); P.sort((a, b) => a[0] - b[0]); drag = P.findIndex(p => p[0] === px && p[1] === py); }
    draw(); E.interacting = true; request();
  };
  c.onpointermove = e => {
    if (drag < 0) return; const [px, py] = pos(e), P = pts();
    const lo = drag > 0 ? P[drag - 1][0] + 0.01 : 0, hi = drag < P.length - 1 ? P[drag + 1][0] - 0.01 : 1;
    P[drag] = [drag === 0 && P.length > 1 && P[0][0] === 0 ? clamp(px, 0, hi) : clamp(px, lo, hi), py];
    draw(); request();
  };
  c.onpointerup = e => {
    if (drag < 0) return; const [px, py] = pos(e), P = pts();
    /* Punkt aus dem Feld ziehen = löschen (nicht die Endpunkte) */
    if (P.length > 2 && drag > 0 && drag < P.length - 1 && (py < -0.05 || py > 1.05 || px < 0 || px > 1)) P.splice(drag, 1);
    drag = -1; E.interacting = false; draw(); request();
  };
  c.ondblclick = e => { const [px] = pos(e), P = pts(); const i = P.findIndex(p => Math.abs(p[0] - px) < 0.04); if (i > 0 && i < P.length - 1) { P.splice(i, 1); draw(); request(); } };
}
function mHsl(m) {
  const band = m.band, cur = E.st.hsl[band] || { h: 0, s: 0, l: 0 };
  act('hb', el => { m.band = el.dataset.v; build(); });
  let h = `<div class="hscroll colors" data-keep="hb" style="justify-content:center;padding-top:8px">${HSL_BANDS.map(([id, n, , c]) => `<button class="sw" style="background:${c}" data-act="hb" data-v="${id}" aria-pressed="${id === band}" aria-label="${n}" title="${n}"></button>`).join('')}</div>`;
  const setv = (k, v) => { E.st.hsl[band] = { ...(E.st.hsl[band] || { h: 0, s: 0, l: 0 }), [k]: v }; };
  h += slider('hh', 'Farbton', -100, 100, cur.h, v => { setv('h', v); E.interacting = true; request(); }, v => { setv('h', v); E.interacting = false; request(); });
  h += slider('hs', 'Sättigung', -100, 100, cur.s, v => { setv('s', v); E.interacting = true; request(); }, v => { setv('s', v); E.interacting = false; request(); });
  h += slider('hl', 'Helligkeit', -100, 100, cur.l, v => { setv('l', v); E.interacting = true; request(); }, v => { setv('l', v); E.interacting = false; request(); });
  return h + `<div class="btnrow" style="justify-content:center">${btn('hreset', () => { E.st.hsl = {}; request(); build(); }, 'Alle Farben zurücksetzen', 'restore')}</div>`;
}
export { busy };
