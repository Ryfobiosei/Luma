import { parseBlob, selectCover } from 'music-metadata';

export const ARTWORK_VERSION = 1;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export function pictureDataUrl(picture) {
  if (!picture?.data?.length || picture.data.length > MAX_IMAGE_BYTES) return null;
  const mime = picture.format?.toLowerCase();
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(mime)) return null;
  let binary = '';
  for (let i = 0; i < picture.data.length; i += 8192) {
    binary += String.fromCharCode(...picture.data.subarray(i, i + 8192));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function thumbnail(element, width, height) {
  if (!width || !height) throw new Error('This image has no dimensions.');
  const scale = Math.min(1, 640 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing is unavailable.');
  context.drawImage(element, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export function imageThumbnail(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const temporaryUrl = source instanceof Blob ? URL.createObjectURL(source) : null;
    const cleanup = () => { clearTimeout(timer); image.onload = null; image.onerror = null; if (temporaryUrl) URL.revokeObjectURL(temporaryUrl); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Image loading timed out.')); }, 8000);
    image.onload = () => {
      try { const result = thumbnail(image, image.naturalWidth, image.naturalHeight); cleanup(); resolve(result); }
      catch (error) { cleanup(); reject(error); }
    };
    image.onerror = () => { cleanup(); reject(new Error('This image could not be read.')); };
    image.src = temporaryUrl || source;
  });
}

export function videoThumbnail(blob) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    let finished = false;
    let target = null;
    const cleanup = () => {
      finished = true;
      clearTimeout(timer);
      video.onloadedmetadata = video.onloadeddata = video.onseeked = video.onerror = null;
      video.pause(); video.removeAttribute('src'); video.load();
      URL.revokeObjectURL(url);
    };
    const capture = () => {
      if (finished || video.readyState < 2) return;
      try { const image = thumbnail(video, video.videoWidth, video.videoHeight); cleanup(); resolve(image); }
      catch (error) { cleanup(); reject(error); }
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Video thumbnail timed out.')); }, 10000);
    video.muted = true; video.preload = 'auto'; video.playsInline = true;
    video.onloadedmetadata = () => {
      target = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(1, video.duration * 0.1) : 0;
      if (target > 0) video.currentTime = target;
      else capture();
    };
    video.onloadeddata = () => { if (target === 0) capture(); };
    video.onseeked = capture;
    video.onerror = () => { cleanup(); reject(new Error('This video format could not be decoded.')); };
    video.src = url;
    video.load();
  });
}

export async function extractArtwork(track) {
  if (track.artwork) return { artwork: track.artwork, artworkVersion: ARTWORK_VERSION, artworkStatus: 'ready' };
  if (!track.blob) return { artworkVersion: ARTWORK_VERSION, artworkStatus: 'none' };
  try {
    if (track.kind === 'video') {
      return { artwork: await videoThumbnail(track.blob), artworkVersion: ARTWORK_VERSION, artworkStatus: 'ready' };
    }
    const { common } = await parseBlob(track.blob, { duration: false, skipPostHeaders: true });
    const dataUrl = pictureDataUrl(selectCover(common.picture));
    if (!dataUrl) return { artworkVersion: ARTWORK_VERSION, artworkStatus: 'none' };
    const artwork = await imageThumbnail(dataUrl);
    return { artwork, artworkVersion: ARTWORK_VERSION, artworkStatus: 'ready' };
  } catch {
    return { artworkVersion: ARTWORK_VERSION, artworkStatus: 'unavailable' };
  }
}

export function collectionArtwork(tracks, ids) {
  const contents = ids ? ids.map(id => tracks.find(track => track.id === id)).filter(Boolean) : tracks;
  return contents.find(track => track.artwork) || contents[0] || null;
}
