/* Lokale Ablage im Browser (IndexedDB). Nichts verlässt das Gerät. */
const DB = 'rof-bildstudio', VER = 1;
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    let r;
    try { r = indexedDB.open(DB, VER); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
function tx(store, mode, fn) {
  return db().then(d => new Promise((res, rej) => {
    const t = d.transaction(store, mode), s = t.objectStore(store);
    let out; const r = fn(s); if (r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  }));
}
export const store = {
  async listProjects() {
    try {
      const all = await tx('projects', 'readonly', s => s.getAll());
      return (all || []).map(p => ({ id: p.id, name: p.name, updated: p.updated, thumb: p.thumb })).sort((a, b) => b.updated - a.updated);
    } catch { return []; }
  },
  getProject(id) { return tx('projects', 'readonly', s => s.get(id)); },
  putProject(p) { return tx('projects', 'readwrite', s => s.put(p)); },
  deleteProject(id) { return tx('projects', 'readwrite', s => s.delete(id)); },
  clearProjects() { return tx('projects', 'readwrite', s => s.clear()); },
  get(k) { return tx('kv', 'readonly', s => s.get(k)).catch(() => undefined); },
  set(k, v) { return tx('kv', 'readwrite', s => s.put(v, k)).catch(() => {}); },
  async wipe() {
    try { (await db()).close(); } catch { /* egal */ }
    dbp = null;
    await new Promise(res => { const r = indexedDB.deleteDatabase(DB); r.onsuccess = r.onerror = r.onblocked = () => res(); });
  }
};
