const DATABASE = 'vlc-media-library';
let database;
function openDatabase() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onblocked = () => { database = null; reject(new Error('Close other library tabs, then reload.')); };
    request.onupgradeneeded = () => request.result.createObjectStore('tracks', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = null; reject(request.error); };
  });
  return database;
}
export async function readTracks() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('tracks').objectStore('tracks').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveTracks(tracks) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    tracks.forEach(track => tx.objectStore('tracks').put(track));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function deleteTrack(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    tx.objectStore('tracks').delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
export function readPreferences() {
  try { return JSON.parse(localStorage.getItem('vlc-library-preferences')) || {}; }
  catch { return {}; }
}
export function writePreferences(value) {
  localStorage.setItem('vlc-library-preferences', JSON.stringify(value));
}
export function mediaKind(file) {
  if (file.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(file.name)) return 'audio';
  if (file.type?.startsWith('video/') || /\.(mp4|webm|mov|mkv|m4v|avi|ogv)$/i.test(file.name)) return 'video';
  return null;
}
export const formatTime = value => {
  if (!Number.isFinite(value)) return '0:00';
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

// Patch the current record, rather than re-saving an old copy of a deleted file.
export async function updateTrack(id, changes, { ifArtworkMissing = false } = {}) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    let updated = false;
    const request = store.get(id);
    request.onsuccess = () => {
      if (!request.result || (ifArtworkMissing && request.result.artwork)) return;
      store.put({ ...request.result, ...changes, id });
      updated = true;
    };
    tx.oncomplete = () => resolve(updated);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
