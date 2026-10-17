/* RoF WebP: wandelt Bilder lokal im Browser in WebP um.
   Safari kann selbst kein WebP speichern (canvas.toBlob liefert dort PNG). Deshalb kodiert hier
   ein eigener WebP-Baustein (libwebp als WebAssembly, aus jSquash/Squoosh, Apache-2.0). */
import factory from './webp_enc.js';

const $ = id => document.getElementById(id);
const S = { max: 2560, mode: 'high', items: [] };

/* Einstellungen. "Sehr hoch": Qualität 92, gründlichste Methode, saubere Farbkanten (sharp YUV). */
const BASE = { quality: 75, target_size: 0, target_PSNR: 0, method: 4, sns_strength: 50, filter_strength: 60,
  filter_sharpness: 0, filter_type: 1, partitions: 0, segments: 4, pass: 1, show_compressed: 0, preprocessing: 0,
  autofilter: 0, partition_limit: 0, alpha_compression: 1, alpha_filtering: 1, alpha_quality: 100, lossless: 0,
  exact: 0, image_hint: 0, emulate_jpeg_size: 0, thread_level: 0, low_memory: 0, near_lossless: 100,
  use_delta_palette: 0, use_sharp_yuv: 0 };
const OPTS = {
  high: { ...BASE, quality: 92, method: 6, use_sharp_yuv: 1 },
  lossless: { ...BASE, lossless: 1, quality: 75, method: 4, exact: 1 }
};
const HINTS = {
  size: { 2560: 'Längste Seite höchstens 2560 Pixel. So verkleinert WordPress das Bild nicht noch einmal selbst.',
          0: 'Bild bleibt in voller Größe. WordPress verkleinert es beim Hochladen auf 2560 Pixel, wenn es größer ist.' },
  q: { high: 'Kein sichtbarer Unterschied zum Original, deutlich kleinere Datei.',
       lossless: 'Jeder Pixel bleibt exakt erhalten. Bei Fotos ist die Datei oft größer als das Original.' }
};

let encoderP = null;
function encoder() {
  if (!encoderP) encoderP = fetch(new URL('webp_enc.wasm', import.meta.url))
    .then(r => { if (!r.ok) throw new Error('WebP-Baustein nicht geladen'); return r.arrayBuffer(); })
    .then(buf => factory({ noInitialRun: true, wasmBinary: new Uint8Array(buf) }))
    .catch(e => { encoderP = null; throw e; });
  return encoderP;
}

function seg(id, key, cb) {
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    for (const x of $(id).querySelectorAll('button')) x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    cb(b.dataset.v);
  });
}
seg('size', 'max', v => { S.max = +v; $('sizeHint').textContent = HINTS.size[v]; resetResults(); });
seg('quality', 'mode', v => { S.mode = v; $('qHint').textContent = HINTS.q[v]; resetResults(); });

const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.round(n / 1024) + ' KB';
const slug = s => s.replace(/\.[^.]+$/, '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bild';

function addFiles(files) {
  for (const f of files) {
    if (!(f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|avif|gif)$/i.test(f.name))) continue;
    const it = { file: f, url: URL.createObjectURL(f), out: null, el: document.createElement('div') };
    it.el.className = 'item';
    it.el.innerHTML = `<img alt=""><div><div class="n"></div><div class="m">${kb(f.size)}</div></div>`;
    it.el.querySelector('img').src = it.url;
    it.el.querySelector('.n').textContent = slug(f.name) + '.webp';
    $('list').append(it.el); S.items.push(it);
  }
  $('convert').disabled = !S.items.length;
  resetResults();
}
$('files').addEventListener('change', e => { addFiles([...e.target.files]); e.target.value = ''; });
const drop = $('drop');
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); addFiles([...e.dataTransfer.files]); });

function resetResults() {
  for (const it of S.items) { it.out = null; it.el.querySelector('.m').textContent = kb(it.file.size); }
  $('share').hidden = $('save').hidden = true;
}

async function loadImage(it) {
  const img = new Image(); img.decoding = 'async'; img.src = it.url;
  await img.decode().catch(() => { throw new Error('Bild lässt sich nicht öffnen'); });
  return img;
}

/* Verkleinern in Halbschritten, dann ein letzter Schritt. Ergibt schärfere Ergebnisse als ein einziger großer Sprung. */
function draw(img, w, h) {
  let src = img, sw = img.naturalWidth, sh = img.naturalHeight;
  while (sw / 2 >= w * 1.05) {
    const c = document.createElement('canvas'); c.width = Math.round(sw / 2); c.height = Math.round(sh / 2);
    const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, c.width, c.height); src = c; sw = c.width; sh = c.height;
  }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, w, h);
  return x.getImageData(0, 0, w, h);
}

async function convertOne(it, mod) {
  const m = it.el.querySelector('.m');
  m.textContent = 'Wird umgewandelt …';
  await new Promise(r => setTimeout(r, 30));
  const img = await loadImage(it);
  let w = img.naturalWidth, h = img.naturalHeight;
  if (S.max && Math.max(w, h) > S.max) { const k = S.max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
  if (w * h > 16_000_000) throw new Error('Zu groß für das iPad. Bitte „Für WordPress“ wählen.');
  const data = draw(img, w, h);
  const res = mod.encode(data.data, w, h, OPTS[S.mode]);
  if (!res) throw new Error('Umwandlung fehlgeschlagen');
  it.out = new File([res], slug(it.file.name) + '.webp', { type: 'image/webp' });
  m.innerHTML = `${kb(it.file.size)} → <span class="ok">${kb(it.out.size)}</span> · ${w} × ${h} px`;
}

$('convert').addEventListener('click', async () => {
  const btn = $('convert'); btn.disabled = true; btn.textContent = 'Lädt …';
  let mod;
  try { mod = await encoder(); }
  catch (e) { btn.textContent = 'Umwandeln'; btn.disabled = false; alert('Der WebP-Baustein konnte nicht geladen werden. Bitte mit Internet neu öffnen.'); return; }
  let done = 0;
  for (const it of S.items) {
    if (it.out) { done++; continue; }
    btn.textContent = `Wandle um … ${done + 1} von ${S.items.length}`;
    try { await convertOne(it, mod); done++; }
    catch (e) { it.el.querySelector('.m').innerHTML = `<span class="err">${e.message}</span>`; }
  }
  btn.textContent = 'Umwandeln'; btn.disabled = false;
  const ready = S.items.filter(i => i.out).length;
  $('save').hidden = !ready;
  $('share').hidden = !ready || !(navigator.canShare && navigator.canShare({ files: [S.items.find(i => i.out).out] }));
});

$('share').addEventListener('click', async () => {
  const files = S.items.filter(i => i.out).map(i => i.out);
  try { await navigator.share({ files }); } catch (e) { /* abgebrochen */ }
});

$('save').addEventListener('click', async () => {
  for (const it of S.items.filter(i => i.out)) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(it.out); a.download = it.out.name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    await new Promise(r => setTimeout(r, 400));
  }
});
