/* App-Rahmen: Startseite, Vorlagen, Einstellungen, Export, Stapel, Collage, lokale Projekte */
import { $, cv, ctx2d, uid, slug, debounce, loadImageFromBlob, canvasToBlob, escapeHtml, fitLimit, resize, clamp, deep, scaled } from './util.js';
import { E, loadImage, request, commit, toast, busy, renderOutput, renderWith, initStage, initModebar, curBase, updUndo, freshState, exitMode, baseBlob } from './editor.js';
import { buildTabs, switchTab, markTabs, build, initPanel, sync, panelState, templateState, applyTemplate, addOverlayPhoto } from './panels.js';
import { TEMPLATES, TEMPLATE_CATS, PALETTE } from './data.js';
import { processImage, autoAdjust } from './process.js';
import { applyEffect } from './effects.js';
import { composite } from './compose.js';
import { store } from './store.js';
import { makeZip } from './zip.js';
import { icon } from './icons.js';

const VERSION = '2.0.0';
const S = { workMax: 3000, fmt: 'jpeg', size: '1600', q: 86, watermark: 'Realm of Fragrance', saveProjects: true };

/* ================= Start ================= */
async function boot() {
  const saved = await store.get('settings'); if (saved) Object.assign(S, saved);
  panelState.favs = (await store.get('favs')) || [];
  E.workMax = S.workMax; E.watermark = S.watermark;
  E.onFavs = f => store.set('favs', f);
  E.panelSync = sync; E.onTabChange = () => { markTabs(); };
  E.onCommit = () => saveSoon();
  E.pickOverlayPhoto = () => pick(false, async files => { try { addOverlayPhoto(await loadImageFromBlob(files[0])); } catch { toast('Foto konnte nicht gelesen werden'); } });
  initStage(); initModebar(); initPanel(); buildTabs();
  bindEditorTop(); bindNav(); buildQuick(); renderHero(); renderForYou(); renderRecent(); buildTplScreen(); buildMe();
  bindDrop();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  document.addEventListener('keydown', onKey);
  window.addEventListener('beforeunload', () => { if (E.baseId) saveNow(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && E.baseId) saveNow(); });
}

/* ================= Navigation ================= */
function show(id) {
  for (const s of ['home', 'tplScreen', 'meScreen', 'editor', 'collage']) $(s).hidden = s !== id;
  document.querySelectorAll('[data-nav]').forEach(n => n.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', String(b.dataset.go === id))));
}
function bindNav() {
  document.querySelectorAll('[data-nav]').forEach(n => {
    n.innerHTML = [['home', 'Bearbeiten'], ['tplScreen', 'Vorlagen'], ['meScreen', 'Ich']].map(([id, l]) => `<button type="button" data-go="${id}">${l}</button>`).join('');
    n.onclick = e => { const b = e.target.closest('[data-go]'); if (!b) return; show(b.dataset.go); if (b.dataset.go === 'home') renderRecent(); if (b.dataset.go === 'meScreen') buildMe(); };
  });
  show('home');
  $('homeOpen').onclick = () => openPicker();
  $('allPhotos').onclick = () => openPicker();
  $('moreTpl').onclick = () => show('tplScreen');
  $('heroGo').onclick = () => openPicker({ template: 't-2013' });
}

/* ================= Dateien ================= */
function pick(multiple, cb) {
  const inp = multiple ? $('multiIn') : $('fileIn');
  inp.value = '';
  inp.onchange = () => { const files = [...inp.files].filter(f => f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif|avif)$/i.test(f.name)); if (files.length) cb(files); else if (inp.files.length) toast('Das ist keine Bilddatei'); };
  inp.click();
}
function openPicker(opts = {}) { pick(false, files => openFile(files[0], opts)); }
async function openFile(file, opts = {}) {
  let img;
  try { img = await busy('Foto wird geladen …', () => loadImageFromBlob(file)); }
  catch { toast('Foto konnte nicht gelesen werden. Probier JPG oder PNG.', 2600); return; }
  startEditor(img, slug((file.name || 'bild').replace(/\.[^.]+$/, '')), opts);
}
function startEditor(img, name, opts = {}) {
  if (E.mode) exitMode(false);
  loadImage(img, name);
  E.projectId = uid(); savedBase = null; savedAssets = new Map();
  show('editor');
  E.tab = opts.tab || 'filter'; markTabs();
  if (opts.template) { const t = TEMPLATES.find(v => v.id === opts.template); if (t) applyTemplate(t); }
  if (opts.quality) { E.st.quality = opts.quality; Object.assign(E.st.adj, autoAdjust(curBase().prev)); commit('Verbessern'); }
  if (opts.after) opts.after();
  updQuality(); build(); request();
  if (opts.tab) switchTab(opts.tab);
  saveSoon();
}
function bindDrop() {
  window.addEventListener('dragover', e => { e.preventDefault(); });
  window.addEventListener('drop', e => {
    e.preventDefault(); const f = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
    if (!f) return;
    if (!$('editor').hidden && E.tab === 'overlay') { loadImageFromBlob(f).then(addOverlayPhoto).catch(() => toast('Foto konnte nicht gelesen werden')); return; }
    openFile(f);
  });
  window.addEventListener('paste', e => {
    const f = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (f) openFile(f.getAsFile());
  });
}
function onKey(e) {
  if ($('editor').hidden || /input|textarea/i.test(document.activeElement?.tagName || '')) return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? import('./editor.js').then(m => m.redo()) : import('./editor.js').then(m => m.undo()); }
  else if (e.key === 'Escape' && E.mode) exitMode(false);
  else if (e.key === 'Enter' && E.mode) exitMode(true);
  else if ((e.key === 'Delete' || e.key === 'Backspace') && E.sel) { import('./editor.js').then(m => m.deleteObj(E.sel)); }
}

/* ================= Editor-Kopf ================= */
function bindEditorTop() {
  $('eClose').onclick = async () => { if (E.mode) exitMode(false); await saveNow(); E.baseId = null; show('home'); renderRecent(); };
  $('undo').onclick = () => import('./editor.js').then(m => m.undo());
  $('redo').onclick = () => import('./editor.js').then(m => m.redo());
  $('expBtn').onclick = openExport;
  $('qBtn').onclick = openQuality;
}
const QLAB = { orig: 'Qualität', hd: 'HD', detail: 'Detail+' };
function updQuality() { $('qLabel').textContent = QLAB[E.st.quality || 'orig']; }
function openQuality() {
  const r = $('qBtn').getBoundingClientRect();
  const html = `<div class="scrim" data-close></div><div class="pop" style="top:${r.bottom + 8}px;right:${Math.max(10, innerWidth - r.right)}px">
    <h4>Qualität verbessern</h4><div class="qsteps">${[['orig', 'Original'], ['hd', 'HD 2×'], ['detail', 'Detail+']].map(([v, l]) => `<button type="button" data-q="${v}" aria-pressed="${(E.st.quality || 'orig') === v}">${l}</button>`).join('')}</div>
    <p>HD verdoppelt die Auflösung beim Export und schärft nach. Detail+ betont zusätzlich feine Strukturen. Alles lokal – ohne Cloud-KI.</p></div>`;
  const lay = $('layer'); lay.innerHTML = html;
  lay.onclick = e => {
    if (e.target.closest('[data-close]')) { lay.innerHTML = ''; return; }
    const b = e.target.closest('[data-q]'); if (!b) return;
    E.st.quality = b.dataset.q; commit('Qualität'); updQuality(); lay.innerHTML = '';
    toast(b.dataset.q === 'orig' ? 'Originalqualität' : `${QLAB[b.dataset.q]} wird beim Export angewendet`);
  };
}

/* ================= Export ================= */
function openExport() {
  if (!E.baseId) return;
  const lay = $('layer'), fmts = [['jpeg', 'JPG'], ['webp', 'WebP'], ['png', 'PNG']], sizes = [['0', 'Original'], ['2400', '2400'], ['1600', '1600'], ['1200', '1200'], ['800', '800']];
  const segs = (name, list, cur) => `<div class="seg">${list.map(([v, l]) => `<button type="button" data-${name}="${v}" aria-pressed="${v === cur}">${l}</button>`).join('')}</div>`;
  lay.innerHTML = `<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-label="Exportieren"><div class="grab"></div><h3>Exportieren</h3>
    <div class="prev"><canvas id="expPrev"></canvas></div>
    <div class="row"><span class="t">Format</span>${segs('fmt', fmts, S.fmt)}</div>
    <div class="row"><span class="t">Längste Seite</span>${segs('size', sizes, S.size)}</div>
    <div class="row" id="qRow" ${S.fmt === 'png' ? 'hidden' : ''}><span class="t">Qualität</span><input type="range" min="50" max="100" value="${S.q}" id="expQ" style="max-width:220px;--p:${(S.q - 50) * 2}%"><output id="expQo" style="width:40px;text-align:right;color:var(--accent);font-weight:700">${S.q}</output></div>
    <div class="row"><span class="t">Dateiname</span><input type="text" id="expName" value="${escapeHtml(E.name)}" autocomplete="off" spellcheck="false"></div>
    <div class="note">${icon('shield')}Wird nur auf diesem Gerät berechnet. Ort (GPS) und Kameradaten werden entfernt.</div>
    <div class="actions"><button class="btn primary" id="expShare" type="button">${icon('share')}Teilen / Sichern</button><button class="btn" id="expDl" type="button">${icon('download')}Herunterladen</button></div>
    <div class="actions"><button class="btn" id="expBatch" type="button">${icon('batch')}Stapel: gleiche Bearbeitung auf mehrere Fotos</button></div>
    <div class="note" id="expInfo"></div></div>`;
  const pc = $('expPrev'), src = E.lastComp ? E.lastComp.canvas : curBase().prev, s = Math.min(1, 520 / Math.max(src.width, src.height));
  pc.width = Math.round(src.width * s); pc.height = Math.round(src.height * s); ctx2d(pc).drawImage(src, 0, 0, pc.width, pc.height);
  const info = () => {
    const b = curBase().full, out = E.lastComp ? E.lastComp.canvas : b, k = (E.st.quality && E.st.quality !== 'orig' ? 2 : 1) * b.width / (E.lastComp ? E.lastComp.canvas.width / E.lastComp.k : b.width);
    let W = (E.lastComp ? E.lastComp.canvas.width / E.lastComp.k : b.width) * k, H = (E.lastComp ? E.lastComp.canvas.height / E.lastComp.k : b.height) * k;
    const mx = +S.size; if (mx && Math.max(W, H) > mx) { const f = mx / Math.max(W, H); W *= f; H *= f; }
    const f2 = Math.min(1, Math.sqrt(16e6 / (W * H))); W *= f2; H *= f2;
    $('expInfo').textContent = `Ausgabe ca. ${Math.round(W)} × ${Math.round(H)} px` + (out ? '' : '');
  };
  info();
  lay.onclick = async e => {
    if (e.target.closest('[data-close]')) { lay.innerHTML = ''; return; }
    const f = e.target.closest('[data-fmt]'), z = e.target.closest('[data-size]');
    if (f) { S.fmt = f.dataset.fmt; lay.querySelectorAll('[data-fmt]').forEach(b => b.setAttribute('aria-pressed', String(b === f))); $('qRow').hidden = S.fmt === 'png'; saveSettings(); }
    if (z) { S.size = z.dataset.size; lay.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', String(b === z))); saveSettings(); info(); }
    if (e.target.closest('#expShare')) doExport(true);
    if (e.target.closest('#expDl')) doExport(false);
    if (e.target.closest('#expBatch')) { lay.innerHTML = ''; batch(); }
  };
  $('expQ').oninput = e => { S.q = +e.target.value; $('expQo').textContent = S.q; e.target.style.setProperty('--p', (S.q - 50) * 2 + '%'); };
  $('expQ').onchange = saveSettings;
  $('expName').oninput = e => { E.name = slug(e.target.value) || 'bild'; };
}
async function encode(canvas, fmt, q) {
  let type = 'image/' + fmt, c = canvas;
  if (fmt === 'jpeg') { c = cv(canvas.width, canvas.height); const x = ctx2d(c); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(canvas, 0, 0); }
  let blob = await canvasToBlob(c, type, fmt === 'png' ? undefined : q / 100);
  if (blob.type !== type) {
    /* Safari kann kein WebP kodieren → JPG */
    const j = cv(canvas.width, canvas.height), x = ctx2d(j); x.fillStyle = '#fff'; x.fillRect(0, 0, j.width, j.height); x.drawImage(canvas, 0, 0);
    blob = await canvasToBlob(j, 'image/jpeg', q / 100); toast('Dieser Browser kann kein WebP speichern – JPG erstellt', 2600);
  }
  return blob;
}
const extOf = t => ({ 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' }[t] || 'jpg');
async function doExport(share) {
  try {
    const blob = await busy('Bild wird erstellt …', async () => { const c = await renderOutput({ maxSide: +S.size || 0 }); return encode(c, S.fmt, S.q); });
    const name = `${E.name || 'bild'}.${extOf(blob.type)}`, file = new File([blob], name, { type: blob.type });
    if (share) {
      const r = await shareFiles([file]);
      if (r === true) { toast('Geteilt'); $('layer').innerHTML = ''; return; }
      if (r === 'gesture') { readyToShare(file, blob, name); return; }
    }
    download(blob, name); toast(`Gespeichert: ${name}`, 2200); $('layer').innerHTML = '';
  } catch (err) { console.error(err); toast('Export fehlgeschlagen: ' + (err.message || err), 3500); }
}
async function shareFiles(files) {
  try {
    if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files }); return true; }
  } catch (e) {
    if (e && e.name === 'AbortError') return true;
    /* Safari verlangt nach längerer Berechnung einen neuen Fingertipp */
    if (e && e.name === 'NotAllowedError') return 'gesture';
  }
  return false;
}
function readyToShare(file, blob, name) {
  const sh = document.querySelector('#layer .sheet'); if (!sh) return;
  sh.querySelectorAll('.actions').forEach(a => a.remove());
  const a = document.createElement('div'); a.className = 'actions';
  a.innerHTML = `<button class="btn primary" type="button" id="shareNow">${icon('share')}Fertig – jetzt teilen</button><button class="btn" type="button" id="dlNow">${icon('download')}Herunterladen</button>`;
  sh.appendChild(a);
  $('shareNow').onclick = async () => { const r = await shareFiles([file]); if (r === true) { toast('Geteilt'); $('layer').innerHTML = ''; } else { download(blob, name); $('layer').innerHTML = ''; } };
  $('dlNow').onclick = () => { download(blob, name); $('layer').innerHTML = ''; };
}
function download(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/* ================= Stapel ================= */
function batch() {
  const recipe = deep(E.st); recipe.objects = recipe.objects.filter(o => o.type !== 'drawing');
  pick(true, async files => {
    const out = [];
    try {
      $('busy').hidden = false;
      for (let i = 0; i < files.length; i++) {
        $('busyT').textContent = `Stapel ${i + 1} / ${files.length} …`;
        await new Promise(r => setTimeout(r, 20));
        try {
          const img = await loadImageFromBlob(files[i]), f = fitLimit(img.naturalWidth, img.naturalHeight, S.workMax), base = resize(img, f.w, f.h);
          const c = renderWith(base, recipe, +S.size || 0, E.assets), blob = await encode(c, S.fmt, S.q);
          out.push({ name: `${slug(files[i].name.replace(/\.[^.]+$/, ''))}-rof.${extOf(blob.type)}`, blob });
        } catch (e) { console.error(e); }
      }
    } finally { $('busy').hidden = true; }
    if (!out.length) { toast('Keine Fotos verarbeitet'); return; }
    if (out.length <= 10 && (await shareFiles(out.map(o => new File([o.blob], o.name, { type: o.blob.type })))) === true) { toast(`${out.length} Fotos geteilt`); return; }
    if (out.length === 1) { download(out[0].blob, out[0].name); return; }
    download(await makeZip(out), `rof-stapel-${new Date().toISOString().slice(0, 10)}.zip`); toast(`${out.length} Fotos als ZIP gespeichert`, 2500);
  });
}

/* ================= Lokale Projekte ================= */
let savedBase = null, savedAssets = new Map(), saving = null;
const saveSoon = debounce(() => saveNow(), 1200);
async function saveNow() {
  if (!S.saveProjects || !E.baseId || !E.projectId) return;
  if (saving) await saving;
  saving = (async () => {
    try {
      const b = curBase();
      if (!savedBase || savedBase.id !== E.baseId) { const id = E.baseId; savedBase = { id, blob: await baseBlob(id) }; }
      const assets = {};
      for (const o of E.st.objects) if (o.type === 'image' && E.assets.has(o.asset)) {
        if (!savedAssets.has(o.asset)) savedAssets.set(o.asset, await canvasToBlob(E.assets.get(o.asset), 'image/png'));
        assets[o.asset] = savedAssets.get(o.asset);
      }
      const src = E.lastComp ? E.lastComp.canvas : b.prev, t = scaled(src, 360), tc = cv(t.width, t.height), tx = ctx2d(tc);
      tx.fillStyle = '#222'; tx.fillRect(0, 0, tc.width, tc.height); tx.drawImage(t, 0, 0);
      const thumb = await canvasToBlob(tc, 'image/jpeg', 0.8);
      await store.putProject({ id: E.projectId, name: E.name, updated: Date.now(), st: E.st, base: savedBase.blob, assets, thumb, v: 2 });
    } catch (e) { console.warn('Speichern fehlgeschlagen', e); }
  })();
  await saving; saving = null;
}
async function openProject(id) {
  const p = await store.getProject(id); if (!p) { toast('Projekt nicht gefunden'); return; }
  let img; try { img = await busy('Projekt wird geöffnet …', () => loadImageFromBlob(p.base)); } catch { toast('Projekt beschädigt'); return; }
  if (E.mode) exitMode(false);
  loadImage(img, p.name, { ...freshState(), ...p.st });
  E.projectId = p.id; savedBase = { id: E.baseId, blob: p.base }; curBase().blob = p.base; savedAssets = new Map();
  for (const [aid, blob] of Object.entries(p.assets || {})) {
    try { const ai = await loadImageFromBlob(blob), c = cv(ai.naturalWidth, ai.naturalHeight); ctx2d(c).drawImage(ai, 0, 0); E.assets.set(aid, c); savedAssets.set(aid, blob); } catch { /* Ebene fehlt */ }
  }
  show('editor'); E.tab = 'filter'; markTabs(); updQuality(); build(); request();
}
const thumbUrls = [];
async function renderRecent() {
  thumbUrls.splice(0).forEach(u => URL.revokeObjectURL(u));
  const list = S.saveProjects ? await store.listProjects() : [];
  const el = $('recent');
  el.innerHTML = `<button class="rc add" type="button" data-new><span class="circ">${icon('plus')}</span>Foto wählen</button>` +
    list.slice(0, 23).map(p => { const u = p.thumb ? URL.createObjectURL(p.thumb) : ''; if (u) thumbUrls.push(u); return `<div class="rc" role="button" tabindex="0" data-open="${p.id}">${u ? `<img alt="" src="${u}">` : ''}<span class="nm">${escapeHtml(p.name)}</span><button class="del" type="button" data-del="${p.id}" aria-label="Projekt löschen">${icon('x')}</button></div>`; }).join('');
  el.onclick = async e => {
    if (e.target.closest('[data-new]')) return openPicker();
    const d = e.target.closest('[data-del]');
    if (d) { e.stopPropagation(); if (confirm('Projekt löschen? Das Originalfoto in deiner Mediathek bleibt erhalten.')) { await store.deleteProject(d.dataset.del); renderRecent(); } return; }
    const o = e.target.closest('[data-open]'); if (o) openProject(o.dataset.open);
  };
}

/* ================= Startseite ================= */
function buildQuick() {
  const Q = [['expand', 'Erweitern', () => openPicker({ tab: 'background', after: () => { panelState.bgSub = 'ratio'; E.st.bg.ratio = '1:1'; E.st.bg.fill = 'mirror'; commit('Erweitern'); } })],
    ['retouch', 'Retusche', () => openPicker({ tab: 'retouch' })], ['collage', 'Collage', () => pick(true, files => openCollage(files))],
    ['hd', 'Verbessern', () => openPicker({ quality: 'hd' })], ['cutout', 'Freistellen', () => openPicker({ tab: 'cutout' })],
    ['batch', 'Stapel', () => { toast('Erst ein Foto bearbeiten, dann im Export „Stapel“ wählen', 3200); openPicker({ tab: 'filter' }); }]];
  $('quick').innerHTML = Q.map(([ic, l], i) => `<button class="qt" type="button" data-q="${i}">${icon(ic)}<span>${l}</span></button>`).join('');
  $('quick').onclick = e => { const b = e.target.closest('[data-q]'); if (b) Q[+b.dataset.q][2](); };
}
let sampleCache = null;
function sampleImage() {
  if (sampleCache) return sampleCache;
  const c = cv(1200, 900), x = ctx2d(c);
  let g = x.createLinearGradient(0, 0, 1200, 900); g.addColorStop(0, '#e9c9cf'); g.addColorStop(1, '#6b4a63'); x.fillStyle = g; x.fillRect(0, 0, 1200, 900);
  g = x.createRadialGradient(420, 270, 30, 420, 270, 520); g.addColorStop(0, 'rgba(255,240,230,.75)'); g.addColorStop(1, 'rgba(255,240,230,0)'); x.fillStyle = g; x.fillRect(0, 0, 1200, 900);
  x.fillStyle = '#4a3046'; x.fillRect(0, 675, 1200, 225);
  x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(615, 716, 195, 30, 0, 0, Math.PI * 2); x.fill();
  const rr = (X, Y, W, H, R) => { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); };
  g = x.createLinearGradient(450, 0, 780, 0); g.addColorStop(0, '#c98a3c'); g.addColorStop(.45, '#f2c37a'); g.addColorStop(1, '#8a5420'); x.fillStyle = g; rr(450, 360, 330, 352, 34); x.fill();
  x.fillStyle = 'rgba(255,255,255,.4)'; rr(480, 390, 30, 285, 15); x.fill();
  x.fillStyle = '#e8d9b6'; x.fillRect(570, 322, 90, 45);
  g = x.createLinearGradient(540, 0, 690, 0); g.addColorStop(0, '#3a2a20'); g.addColorStop(.5, '#8a6a4a'); g.addColorStop(1, '#2a1e16'); x.fillStyle = g; rr(540, 202, 150, 128, 10); x.fill();
  x.fillStyle = 'rgba(250,244,232,.92)'; rr(525, 480, 180, 112, 6); x.fill();
  x.fillStyle = '#4a3046'; x.textAlign = 'center'; x.font = 'italic 600 42px Didot, "Bodoni 72", Georgia, serif'; x.fillText('No. 7', 615, 538);
  x.font = '600 14px -apple-system, sans-serif'; x.fillText('EAU DE PARFUM', 615, 570);
  sampleCache = c; return c;
}
function tplPreview(t, w, h, src = sampleImage()) {
  const s = Math.max(w / src.width, h / src.height), base = resize(src, src.width * s, src.height * s);
  const st = { ...freshState(), ...templateState(t) };
  const out = composite(applyEffect(processImage(base, st), st.effect), { ...st, objects: [] }, 1, new Map()).canvas;
  const c = cv(w, h), x = ctx2d(c), k = Math.max(w / out.width, h / out.height);
  x.drawImage(out, (w - out.width * k) / 2, (h - out.height * k) / 2, out.width * k, out.height * k);
  return c;
}
function renderHero() {
  requestAnimationFrame(() => {
    /* Motiv rechts, damit links Platz für den Text bleibt */
    const t = TEMPLATES.find(v => v.id === 't-2013'), c = $('heroCv'), x = ctx2d(c), p = tplPreview(t, 1000, 750);
    const g = x.createLinearGradient(0, 0, c.width, 0); g.addColorStop(0, '#3a2433'); g.addColorStop(1, '#8a5f74'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(p, c.width - 1000, -25, 1000, 750);
  });
}
function renderForYou() {
  const list = ['t-flakon', 't-golden', 't-2013', 't-noirlux', 't-polaroid', 't-y2k', 't-cinestill', 't-rose', 't-fluted', 't-editorial'];
  $('foryou').innerHTML = list.map(id => `<button class="fy" type="button" data-t="${id}"><canvas width="300" height="400" data-tp="${id}"></canvas><span>${TEMPLATES.find(t => t.id === id).n}</span></button>`).join('');
  $('foryou').onclick = e => { const b = e.target.closest('[data-t]'); if (b) openPicker({ template: b.dataset.t }); };
  paintTplCanvases($('foryou'));
}
function paintTplCanvases(root) {
  const items = [...root.querySelectorAll('canvas[data-tp]')]; let i = 0;
  const step = () => { const c = items[i++]; if (!c) return; ctx2d(c).drawImage(tplPreview(TEMPLATES.find(t => t.id === c.dataset.tp), c.width, c.height), 0, 0); setTimeout(step, 0); };
  setTimeout(step, 50);
}
let tplCat = 'all';
function buildTplScreen() {
  $('tplCats').innerHTML = TEMPLATE_CATS.map(([id, l]) => `<button class="chip" type="button" data-c="${id}" aria-pressed="${id === tplCat}">${l}</button>`).join('');
  $('tplCats').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; tplCat = b.dataset.c; buildTplScreen(); };
  const list = TEMPLATES.filter(t => tplCat === 'all' || t.cat === tplCat);
  $('tplGrid').innerHTML = list.map(t => `<button class="fy" type="button" data-t="${t.id}"><canvas width="300" height="400" data-tp="${t.id}"></canvas><span>${t.n}</span></button>`).join('');
  $('tplGrid').onclick = e => { const b = e.target.closest('[data-t]'); if (b) openPicker({ template: b.dataset.t }); };
  paintTplCanvases($('tplGrid'));
}

/* ================= Einstellungen ================= */
function saveSettings() { store.set('settings', { ...S }); }
async function buildMe() {
  const n = (await store.listProjects()).length;
  let swState = 'nicht aktiv';
  try { const r = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration(); if (r && r.active) swState = 'aktiv – funktioniert ohne Internet'; } catch { /* egal */ }
  const seg = (name, list, cur) => `<div class="seg">${list.map(([v, l]) => `<button type="button" data-${name}="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('')}</div>`;
  $('meBody').innerHTML = `
  <div class="privacy" style="margin-top:0;margin-bottom:16px">${icon('shield')}<div><b>Deine Daten bleiben bei dir.</b> Das Bildstudio lädt keine Skripte, Schriften oder Dienste von fremden Servern. Fotos und Projekte liegen nur im Speicher dieses Browsers. Exportierte Bilder enthalten keine Standortdaten.</div></div>
  <div class="set"><h3>Bearbeitung</h3>
    <div class="row"><div><div class="t">Arbeitsauflösung</div><div class="s">Höher = schärfer, braucht mehr Speicher</div></div>${seg('wm', [[2400, '2400'], [3000, '3000'], [4096, '4096']], S.workMax)}</div>
    <div class="row"><div><div class="t">Wasserzeichen-Text</div><div class="s">Für „Text → Wasserzeichen“</div></div><input type="text" id="setWm" value="${escapeHtml(S.watermark)}"></div>
  </div>
  <div class="set"><h3>Export-Standard</h3>
    <div class="row"><span class="t">Format</span>${seg('sf', [['jpeg', 'JPG'], ['webp', 'WebP'], ['png', 'PNG']], S.fmt)}</div>
    <div class="row"><span class="t">Längste Seite</span>${seg('ss', [['0', 'Original'], ['2400', '2400'], ['1600', '1600'], ['1200', '1200']], S.size)}</div>
  </div>
  <div class="set"><h3>Speicher</h3>
    <div class="row"><div><div class="t">Projekte lokal speichern</div><div class="s">${n} Projekt${n === 1 ? '' : 'e'} auf diesem Gerät</div></div><button class="switch" type="button" role="switch" id="setSave" aria-checked="${S.saveProjects}" aria-label="Projekte speichern"></button></div>
    <div class="row"><span class="t">Alle Projekte löschen</span><button class="btn danger" type="button" id="setClear">Löschen</button></div>
    <div class="row"><div><div class="t">Alles zurücksetzen</div><div class="s">Projekte, Favoriten und Einstellungen</div></div><button class="btn danger" type="button" id="setWipe">Zurücksetzen</button></div>
  </div>
  <div class="set"><h3>Info</h3>
    <div class="row"><span class="t">Offline-Modus</span><span class="s">${swState}</span></div>
    <div class="row"><span class="t">Version</span><span class="s">${VERSION}</span></div>
  </div>`;
  const body = $('meBody');
  body.onclick = async e => {
    const w = e.target.closest('[data-wm]'), f = e.target.closest('[data-sf]'), s = e.target.closest('[data-ss]');
    if (w) { S.workMax = +w.dataset.wm; E.workMax = S.workMax; toast('Gilt ab dem nächsten geöffneten Foto'); }
    if (f) S.fmt = f.dataset.sf;
    if (s) S.size = s.dataset.ss;
    if (w || f || s) { saveSettings(); buildMe(); return; }
    if (e.target.closest('#setSave')) { S.saveProjects = !S.saveProjects; saveSettings(); buildMe(); return; }
    if (e.target.closest('#setClear')) { if (confirm('Alle gespeicherten Projekte löschen? Deine Originalfotos bleiben erhalten.')) { await store.clearProjects(); toast('Projekte gelöscht'); buildMe(); renderRecent(); } return; }
    if (e.target.closest('#setWipe')) { if (confirm('Alles zurücksetzen? Projekte, Favoriten und Einstellungen werden gelöscht.')) { await store.wipe(); location.reload(); } }
  };
  $('setWm').onchange = e => { S.watermark = e.target.value.trim() || 'Realm of Fragrance'; E.watermark = S.watermark; saveSettings(); toast('Gespeichert'); };
}

/* ================= Collage ================= */
const C = { imgs: [], lay: 0, gap: 12, round: 0, ratio: '1:1', color: '#ffffff', cells: [], sel: -1, sub: 'layout' };
const grid = (r, c) => { const o = []; for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) o.push([x / c, y / r, 1 / c, 1 / r]); return o; };
function layoutsFor(n) {
  const L = {
    1: [[[0, 0, 1, 1]]],
    2: [grid(1, 2), grid(2, 1), [[0, 0, 0.62, 1], [0.62, 0, 0.38, 1]], [[0, 0, 1, 0.62], [0, 0.62, 1, 0.38]]],
    3: [[[0, 0, 0.5, 1], [0.5, 0, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]], [[0, 0, 1, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]], grid(1, 3), grid(3, 1), [[0, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0, 0.5, 1]]],
    4: [grid(2, 2), [[0, 0, 1, 0.62], [0, 0.62, 1 / 3, 0.38], [1 / 3, 0.62, 1 / 3, 0.38], [2 / 3, 0.62, 1 / 3, 0.38]], [[0, 0, 0.62, 1], [0.62, 0, 0.38, 1 / 3], [0.62, 1 / 3, 0.38, 1 / 3], [0.62, 2 / 3, 0.38, 1 / 3]], grid(1, 4), grid(4, 1)],
    5: [[[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 1 / 3, 0.5], [1 / 3, 0.5, 1 / 3, 0.5], [2 / 3, 0.5, 1 / 3, 0.5]], [[0, 0, 0.6, 0.6], [0.6, 0, 0.4, 0.3], [0.6, 0.3, 0.4, 0.3], [0, 0.6, 0.5, 0.4], [0.5, 0.6, 0.5, 0.4]]],
    6: [grid(2, 3), grid(3, 2), [[0, 0, 2 / 3, 2 / 3], [2 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3], [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]]],
    7: [[...grid(2, 2).map(r => [r[0] * 2 / 3, r[1] * 0.5, r[2] * 2 / 3, r[3] * 0.5]), [2 / 3, 0, 1 / 3, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]].slice(0, 7)],
    8: [grid(2, 4), grid(4, 2)],
    9: [grid(3, 3)]
  };
  return L[Math.min(9, n)];
}
const C_RATIOS = [['1:1', 1], ['4:5', 4 / 5], ['3:4', 3 / 4], ['9:16', 9 / 16], ['16:9', 16 / 9], ['3:2', 3 / 2]];
async function openCollage(files) {
  files = files.slice(0, 9);
  if (files.length < 2) { openFile(files[0]); return; }
  const imgs = await busy('Fotos werden geladen …', async () => { const out = []; for (const f of files) { try { const im = await loadImageFromBlob(f); const ff = fitLimit(im.naturalWidth, im.naturalHeight, 2000); out.push(resize(im, ff.w, ff.h)); } catch { /* übersprungen */ } } return out; });
  if (imgs.length < 2) { toast('Mindestens zwei lesbare Fotos nötig'); return; }
  Object.assign(C, { imgs, lay: 0, sel: -1, cells: imgs.map(() => ({ ox: 0, oy: 0, z: 1 })) });
  show('collage'); buildCollagePanel(); drawCollage();
}
function renderCollage(long) {
  const r = C_RATIOS.find(v => v[0] === C.ratio)[1], W = r >= 1 ? long : long * r, H = r >= 1 ? long / r : long;
  const c = cv(W, H), x = ctx2d(c), rects = layoutsFor(C.imgs.length)[C.lay] || grid(1, C.imgs.length), g = C.gap / 1000 * Math.max(W, H);
  x.fillStyle = C.color; x.fillRect(0, 0, c.width, c.height);
  const pad = g / 2, AW = W - 2 * pad, AH = H - 2 * pad, px = [];
  rects.forEach((rc, i) => {
    const img = C.imgs[i]; if (!img) return;
    const cell = C.cells[i], X = pad + rc[0] * AW + g / 2, Y = pad + rc[1] * AH + g / 2, w2 = Math.max(1, rc[2] * AW - g), Hc = Math.max(1, rc[3] * AH - g);
    const rad = C.round / 100 * Math.min(w2, Hc) / 2;
    x.save(); x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w2, Hc, rad); else x.rect(X, Y, w2, Hc); x.clip();
    const s = Math.max(w2 / img.width, Hc / img.height) * cell.z, iw = img.width * s, ih = img.height * s, u = long / 1000;
    const maxX = (iw - w2) / 2 / u, maxY = (ih - Hc) / 2 / u; cell.ox = clamp(cell.ox, -maxX, maxX) || 0; cell.oy = clamp(cell.oy, -maxY, maxY) || 0;
    x.drawImage(img, X + (w2 - iw) / 2 + cell.ox * u, Y + (Hc - ih) / 2 + cell.oy * u, iw, ih);
    x.restore();
    if (i === C.sel && long < 1500) { x.strokeStyle = '#c6f432'; x.lineWidth = 4; x.strokeRect(X + 2, Y + 2, w2 - 4, Hc - 4); }
    px[i] = [X / W, Y / H, w2 / W, Hc / H];
  });
  if (long < 1500) C.px = px;
  return c;
}
function drawCollage() {
  const v = $('cView'), c = renderCollage(1000);
  v.width = c.width; v.height = c.height; ctx2d(v).drawImage(c, 0, 0);
}
function buildCollagePanel() {
  const p = $('cPanel'), n = C.imgs.length, lays = layoutsFor(n);
  const sub = [['layout', 'Layout'], ['border', 'Rand'], ['ratio', 'Format'], ['color', 'Farbe']];
  let h = `<div class="hscroll subchips">${sub.map(([id, l]) => `<button class="chip" data-csub="${id}" aria-pressed="${id === C.sub}">${l}</button>`).join('')}</div>`;
  if (C.sub === 'layout') h += `<div class="hscroll layouts">${lays.map((L, i) => `<button class="lay" data-lay="${i}" aria-pressed="${i === C.lay}"><svg viewBox="0 0 40 40">${L.map(r => `<rect x="${r[0] * 40 + 1}" y="${r[1] * 40 + 1}" width="${r[2] * 40 - 2}" height="${r[3] * 40 - 2}" rx="2" fill="#8e8e93"/>`).join('')}</svg></button>`).join('')}</div>`;
  if (C.sub === 'border') h += `<div class="slrow"><span class="lab">Abstand</span><input type="range" min="0" max="40" value="${C.gap}" data-cg="gap"><output>${C.gap}</output></div><div class="slrow"><span class="lab">Ecken</span><input type="range" min="0" max="100" value="${C.round}" data-cg="round"><output>${C.round}</output></div>`;
  if (C.sub === 'ratio') h += `<div class="hscroll ratios">${C_RATIOS.map(([id, r]) => `<button class="ratio" data-cr="${id}" aria-pressed="${id === C.ratio}"><i style="width:${r >= 1 ? 22 : 22 * r}px;height:${r >= 1 ? 22 / r : 22}px"></i><span>${id}</span></button>`).join('')}</div>`;
  if (C.sub === 'color') h += `<div class="hscroll colors">${PALETTE.map(c => `<button class="sw" style="background:${c}" data-cc="${c}" aria-pressed="${c === C.color}"></button>`).join('')}</div>`;
  h += `<div class="empty" style="padding:2px 20px 14px;font-size:12px">Ziehen = Ausschnitt verschieben · Tippen = auswählen · zweites Foto antippen = tauschen</div>`;
  p.innerHTML = h;
  p.onclick = e => {
    const s = e.target.closest('[data-csub]'), l = e.target.closest('[data-lay]'), r = e.target.closest('[data-cr]'), c = e.target.closest('[data-cc]');
    if (s) C.sub = s.dataset.csub; if (l) C.lay = +l.dataset.lay; if (r) C.ratio = r.dataset.cr; if (c) C.color = c.dataset.cc;
    if (s || l || r || c) { buildCollagePanel(); drawCollage(); }
  };
  p.oninput = e => { const k = e.target.dataset.cg; if (!k) return; C[k] = +e.target.value; e.target.nextElementSibling.textContent = e.target.value; drawCollage(); };
}
function initCollage() {
  const v = $('cView'); let drag = null;
  const hit = e => { const r = v.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; return (C.px || []).findIndex(q => q && x >= q[0] && y >= q[1] && x <= q[0] + q[2] && y <= q[1] + q[3]); };
  v.addEventListener('pointerdown', e => { const i = hit(e); if (i < 0) return; v.setPointerCapture(e.pointerId); drag = { i, x: e.clientX, y: e.clientY, ox: C.cells[i].ox, oy: C.cells[i].oy, moved: false }; });
  v.addEventListener('pointermove', e => {
    if (!drag) return; const r = v.getBoundingClientRect(), k = v.width / r.width;
    const dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k; if (Math.hypot(dx, dy) > 6) drag.moved = true;
    C.cells[drag.i].ox = drag.ox + dx; C.cells[drag.i].oy = drag.oy + dy; drawCollage();
  });
  v.addEventListener('pointerup', () => {
    if (!drag) return; const i = drag.i;
    if (!drag.moved) {
      if (C.sel >= 0 && C.sel !== i) { [C.imgs[C.sel], C.imgs[i]] = [C.imgs[i], C.imgs[C.sel]]; C.cells[C.sel] = { ox: 0, oy: 0, z: 1 }; C.cells[i] = { ox: 0, oy: 0, z: 1 }; C.sel = -1; toast('Getauscht'); }
      else C.sel = C.sel === i ? -1 : i;
      drawCollage();
    }
    drag = null;
  });
  v.addEventListener('wheel', e => { e.preventDefault(); const i = hit(e); if (i < 0) return; C.cells[i].z = clamp(C.cells[i].z * Math.exp(-e.deltaY * 0.002), 1, 4); drawCollage(); }, { passive: false });
  $('cClose').onclick = () => { show('home'); C.imgs = []; };
  $('cAdd').onclick = () => { if (C.sel < 0) { toast('Erst ein Feld antippen, dann ein Foto wählen'); return; } pick(false, async files => { try { const im = await loadImageFromBlob(files[0]), ff = fitLimit(im.naturalWidth, im.naturalHeight, 2000); C.imgs[C.sel] = resize(im, ff.w, ff.h); C.cells[C.sel] = { ox: 0, oy: 0, z: 1 }; drawCollage(); } catch { toast('Foto konnte nicht gelesen werden'); } }); };
  $('cNext').onclick = async () => {
    const sel = C.sel; C.sel = -1;
    const c = await busy('Collage wird erstellt …', () => renderCollage(Math.min(3000, S.workMax)));
    C.sel = sel; startEditor(c, `collage-${new Date().toISOString().slice(0, 10)}`, {});
  };
}

initCollage();
boot().catch(e => { console.error(e); toast('Start fehlgeschlagen: ' + e.message, 4000); });
export { VERSION };
