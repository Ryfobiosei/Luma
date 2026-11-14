import { Asset } from 'expo-asset';
import { Image as AppImage } from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icons';
import { ARTWORK_VERSION, extractArtwork, imageThumbnail, collectionArtwork } from './artwork';
import lumaMark from '../assets/branding/luma-mark.png';
import { readTracks, saveTracks, deleteTrack, updateTrack, mediaKind, formatTime, readPreferences, writePreferences } from './library';
import './luma.css';

const interFont = Asset.fromModule(require('../assets/fonts/inter/InterVariable.ttf')).uri;
const fontFaces = `@font-face{font-family:Inter;src:url("${interFont}") format("truetype");font-weight:100 900;font-display:swap}`;

const navigation = [['library','home','Home'],['video','video','Videos'],['audio','music','Music'],['favourites','heart','Favourites'],['history','history','Recently played']];
function Button({ icon, children, primary, className = '', ...props }) {
  return <button className={`${primary ? 'button primary' : 'button'} ${className}`} {...props}>{icon && <Icon name={icon} size={18} />}{children}</button>;
}
function Art({ track, large = false, coverIndex }) {
  const [failedArtwork, setFailedArtwork] = useState(null);
  if (track?.artwork && failedArtwork !== track.artwork) return <div className={`art artwork-art ${large ? 'large' : ''}`}><img className="media-artwork" src={track.artwork} alt="" draggable={false} onError={() => setFailedArtwork(track.artwork)}/></div>;
  const index = coverIndex ?? (track?.kind === 'video' ? 2 : (track?.name?.length || 0) % 2);
  return <div className={`art color-art art-tone-${index} ${large ? 'large' : ''}`}><span className="color-art-circle"/><span className="color-art-line"/><span className="color-art-symbol"><Icon name={track?.kind === 'video' ? 'video' : 'music'} size={large ? 40 : 24}/></span></div>;
}
export default function WebMediaApp() {
  const [tracks, setTracks] = useState([]);
  const [preferences, setPreferences] = useState({ favourites: [], history: [], playlists: [], theme: 'light', saveHistory: true });
  const [ready, setReady] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [view, setView] = useState('library');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [layout, setLayout] = useState('grid');
  const [currentId, setCurrentId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [videoHidden, setVideoHidden] = useState(false);
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamKind, setStreamKind] = useState('video');
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);
  const coverInput = useRef(null);
  const coverTarget = useRef(null);
  const artworkScheduled = useRef(new Set());
  const artworkTasks = useRef(Promise.resolve());
  const artworkMounted = useRef(true);
  const media = useRef(null);
  const dialogRef = useRef(null);
  const urls = useRef(new Map());
  const current = tracks.find(track => track.id === currentId);
  const playlist = preferences.playlists.find(item => `playlist:${item.id}` === view);
  const favouriteIds = preferences.favourites;
  const notify = (message, kind = 'info') => setToast({ message, kind });
  useEffect(() => {
    document.title = "Luma — Your personal media player";
    let active = true;
    setReady(false);
    setLibraryError('');
    readTracks().then(items => { if (active) setTracks(items); }).catch(() => { if (active) setLibraryError('Your browser could not open the media library. Check storage permissions and try again.'); }).finally(() => { if (active) setReady(true); });
    setPreferences(p => ({ ...p, ...readPreferences() }));
    return () => { active = false; };
  }, [libraryVersion]);
  useEffect(() => { const objectUrls = urls.current; return () => objectUrls.forEach(url => URL.revokeObjectURL(url)); }, []);
  useEffect(() => { artworkMounted.current = true; return () => { artworkMounted.current = false; }; }, []);
  useEffect(() => {
    for (const track of tracks) {
      if (!track.blob || track.artwork || track.artworkVersion === ARTWORK_VERSION || artworkScheduled.current.has(track.id)) continue;
      artworkScheduled.current.add(track.id);
      artworkTasks.current = artworkTasks.current.then(async () => {
        if (!artworkMounted.current) return;
        const changes = await extractArtwork(track);
        const updated = await updateTrack(track.id, changes, { ifArtworkMissing: true });
        if (updated && artworkMounted.current) setTracks(items => items.map(item => item.id === track.id ? { ...item, ...changes } : item));
      }).catch(() => { artworkScheduled.current.delete(track.id); });
    }
  }, [tracks]);
  useEffect(() => {
    if (!ready) return;
    try { writePreferences(preferences); } catch { setToast({message:'Preferences could not be saved. Browser storage may be full.',kind:'error'}); }
  }, [preferences, ready]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (media.current) media.current.volume = volume; }, [volume, currentId]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    const frame = requestAnimationFrame(() => dialogRef.current?.querySelector('input, button, select')?.focus());
    const trapFocus = event => {
      if (event.key !== 'Tab') return;
      const elements = [...(dialogRef.current?.querySelectorAll('button, input, select, [tabindex="0"]') || [])].filter(el => !el.disabled);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trapFocus);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', trapFocus); previous?.focus(); };
  }, [modal]);
  const source = useMemo(() => {
    if (!current) return '';
    if (current.url) return current.url;
    if (!urls.current.has(current.id)) urls.current.set(current.id, URL.createObjectURL(current.blob));
    return urls.current.get(current.id);
  }, [current]);
  const visible = useMemo(() => {
    let items = tracks.filter(track => {
      if (view === 'audio' || view === 'video') return track.kind === view;
      if (view === 'favourites') return favouriteIds.includes(track.id);
      if (view === 'history') return preferences.history.includes(track.id);
      if (playlist) return playlist.trackIds.includes(track.id);
      return true;
    }).filter(track => track.name.toLowerCase().includes(query.toLowerCase()));
    if (view === 'history') return items.sort((a,b) => preferences.history.indexOf(a.id) - preferences.history.indexOf(b.id));
    return items.sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'size' ? b.size - a.size : b.added - a.added);
  }, [tracks, view, favouriteIds, preferences.history, playlist, query, sort]);
  const updatePreferences = update => setPreferences(previous => ({ ...previous, ...update(previous) }));
  const favourite = id => updatePreferences(p => ({ favourites: p.favourites.includes(id) ? p.favourites.filter(item => item !== id) : [...p.favourites, id] }));
  const navigate = next => { setView(next); setQuery(''); window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); };
  async function importFiles(files) {
    setBusy(true);
    try {
      const additions = Array.from(files).filter(file => mediaKind(file)).filter(file => !tracks.some(track => track.fingerprint === `${file.name}-${file.size}-${file.lastModified}`)).map(file => ({
        id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ''), filename: file.name,
        kind: mediaKind(file), size: file.size, added: Date.now(), blob: file,
        fingerprint: `${file.name}-${file.size}-${file.lastModified}`,
      }));
      if (!additions.length) { notify('No new supported media found. Choose audio or video files.'); return; }
      await saveTracks(additions);
      setTracks(previous => [...previous, ...additions]);
      notify(`${additions.length} ${additions.length === 1 ? 'file' : 'files'} added to your library`);
    } catch { notify('Could not import files. Your browser storage may be full.', 'error'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  function chooseCover(type, id) {
    coverTarget.current = { type, id };
    coverInput.current.click();
  }
  async function saveCover(file) {
    const target = coverTarget.current;
    if (!file || !target) return;
    try {
      if (!['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(file.type) || file.size > 12 * 1024 * 1024) throw new Error('Choose a PNG, JPEG, WebP, GIF, or AVIF image smaller than 12 MB.');
      const artwork = await imageThumbnail(file);
      if (target.type === 'playlist') {
        updatePreferences(p => ({playlists:p.playlists.map(item => item.id === target.id ? {...item,artwork} : item)}));
      } else {
        const changes = { artwork, artworkVersion:ARTWORK_VERSION, artworkStatus:'ready' };
        const updated = await updateTrack(target.id, changes);
        if (!updated) throw new Error('This file is no longer in your library.');
        setTracks(items => items.map(item => item.id === target.id ? {...item,...changes} : item));
      }
      setModal(null); notify('Cover photo saved');
    } catch (error) { notify(error.message || 'Could not save this cover photo.', 'error'); }
    finally { if (coverInput.current) coverInput.current.value = ''; }
  }
  function start(track, items = visible) {
    setQueue(items.map(item => item.id));
    setMediaError(''); setBuffering(false); setPosition(0); if (currentId !== track.id) setDuration(0); setCurrentId(track.id); setVideoHidden(false); setPlaying(true);
    if (currentId === track.id && media.current) { media.current.currentTime = 0; media.current.play().catch(() => notify('Press play to start playback.')); }
  }
  function recordPlay() {
    setPlaying(true);
    if (preferences.saveHistory && currentId) updatePreferences(p => ({ history: [currentId, ...p.history.filter(id => id !== currentId)].slice(0,100) }));
  }
  function togglePlayback() {
    if (!media.current) return;
    if (media.current.paused) media.current.play().catch(() => notify('This file could not play. Try MP3, WAV, MP4, or WebM.', 'error'));
    else media.current.pause();
  }
  function advance(direction = 1, ended = false) {
    if (!queue.length) return;
    const index = queue.indexOf(currentId);
    if (direction === -1 && position > 3) { media.current.currentTime = 0; return; }
    let next = shuffle && queue.length > 1 ? (index + 1 + Math.floor(Math.random() * (queue.length - 1))) % queue.length : index + direction;
    if (next >= queue.length || next < 0) {
      if (repeat || !ended) next = (next + queue.length) % queue.length;
      else { setPlaying(false); return; }
    }
    const nextTrack = tracks.find(track => track.id === queue[next]);
    if (nextTrack?.id === currentId && media.current) { media.current.currentTime = 0; media.current.play().catch(() => notify('Press play to continue.')); return; }
    if (nextTrack) { setCurrentId(nextTrack.id); setPosition(0); setDuration(0); setPlaying(true); }
  }
  function seek(value) { if (media.current && Number.isFinite(duration)) { media.current.currentTime = Number(value); setPosition(Number(value)); } }
  useEffect(() => {
    const keyboard = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('[aria-label="Search library"]')?.focus(); return; }
      if (event.code === 'Escape') { setModal(null); setExpanded(false); return; }
      if (['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName) || modal) return;
      if (event.code === 'Space' && currentId) { event.preventDefault(); togglePlayback(); }
      if (event.code === 'ArrowRight' && currentId) { event.preventDefault(); seek(Math.min(duration,position+10)); }
      if (event.code === 'ArrowLeft' && currentId) { event.preventDefault(); seek(Math.max(0,position-10)); }
      if (event.code === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  });
  function openModal(value) { setName(value?.name || ''); setStreamUrl(''); setModal(value); }
  function savePlaylist(event) {
    event.preventDefault();
    if (!name.trim()) return;
    if (modal.type === 'rename') updatePreferences(p => ({ playlists: p.playlists.map(item => item.id === modal.id ? {...item,name:name.trim()} : item) }));
    else { const id = crypto.randomUUID(); updatePreferences(p => ({ playlists: [...p.playlists, { id, name: name.trim(), trackIds: [] }] })); navigate(`playlist:${id}`); }
    setModal(null); notify('Playlist saved');
  }
  async function addStream(event) {
    event.preventDefault();
    try {
      const parsed = new URL(streamUrl);
      if (!['http:','https:'].includes(parsed.protocol)) throw new Error();
      if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(parsed.hostname)) { notify('Use a direct media URL. YouTube page links cannot play in this player.'); return; }
      const track = { id: crypto.randomUUID(), name: name.trim() || decodeURIComponent(parsed.pathname.split('/').pop()) || 'Network stream', kind: streamKind, url: parsed.href, size: 0, added: Date.now() };
      await saveTracks([track]); setTracks(p => [...p,track]); setModal(null); start(track,[track]);
    } catch { notify('Enter a valid HTTP or HTTPS media URL.', 'error'); }
  }
  async function removeTrack(track) {
    try {
      await deleteTrack(track.id);
      if (currentId === track.id) { media.current?.pause(); setCurrentId(null); setPlaying(false); }
      if (urls.current.has(track.id)) { URL.revokeObjectURL(urls.current.get(track.id)); urls.current.delete(track.id); }
      setTracks(p => p.filter(item => item.id !== track.id));
      setQueue(p => p.filter(id => id !== track.id));
      updatePreferences(p => ({ favourites: p.favourites.filter(id => id !== track.id), history: p.history.filter(id => id !== track.id), playlists: p.playlists.map(item => ({...item,trackIds:item.trackIds.filter(id => id !== track.id)})) }));
      setModal(null); notify('Removed from your library. Your original file is unchanged.');
    } catch { notify('Could not remove the file. Please try again.', 'error'); }
  }
  const title = playlist?.name || ({ library:'Your library', audio:'Music', video:'Videos', favourites:'Your favourites', history:'Recently played', settings:'Settings' })[view] || 'Your library';
  const recentTracks = preferences.history.map(id => tracks.find(track => track.id === id)).filter(Boolean).slice(0,3);
  const featured = current || recentTracks[0] || tracks[tracks.length - 1];
  const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday:'long', month:'long', day:'numeric' }).format(new Date());
  const totalSize = tracks.reduce((sum,track) => sum + track.size,0);
  return <div className={`media-app ${preferences.theme} ${current ? 'has-player' : ''} ${playing ? 'is-playing' : ''}`} data-view={view} aria-busy={busy || !ready} onDragOver={event => { event.preventDefault(); if (event.dataTransfer.types.includes('Files')) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); importFiles(event.dataTransfer.files); }}>
    <style>{fontFaces}</style>
    <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden aria-label="Choose cover photo" onChange={event => saveCover(event.target.files?.[0])}/>
    <input ref={input} type="file" multiple accept="audio/*,video/*,.mkv,.flac,.m4a" hidden onChange={event => importFiles(event.target.files)} aria-label="Import media files" />
    <aside className="sidebar">
      <a className="brand" href="#library" onClick={event => { event.preventDefault(); navigate('library'); }}><AppImage source={lumaMark} style={{width:30,height:38,marginRight:3}} resizeMode="contain" accessibilityLabel="Luma logo"/><span>luma<span className="brand-dot">.</span></span></a>
      <span className="brand-tagline">YOUR SOUND. YOUR SPACE.</span><span className="nav-label">EXPLORE</span>
      <nav>{navigation.map(([id,icon,label]) => <button key={id} aria-label={label} className={`nav-item ${view === id ? 'active' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon name={icon} /><span>{label}</span>{['audio','video'].includes(id) && <span className="nav-count">{tracks.filter(track => track.kind === id).length}</span>}</button>)}</nav>
      <div className="playlist-heading"><span className="nav-label">YOUR PLAYLISTS</span><button className="icon-button" aria-label="Create playlist" onClick={() => openModal({type:'create'})}><Icon name="plus" size={17}/></button></div>
      <div className="playlist-nav">{preferences.playlists.map(item => <button className={`nav-item ${playlist?.id === item.id ? 'active' : ''}`} key={item.id} onClick={() => navigate(`playlist:${item.id}`)}><span className="playlist-dot playlist-cover"><Art track={item.artwork ? {artwork:item.artwork} : collectionArtwork(tracks,item.trackIds)}/></span><span>{item.name}</span><span className="nav-count">{item.trackIds.length}</span></button>)}{!preferences.playlists.length && <button className="create-playlist" onClick={() => openModal({type:'create'})}><Icon name="plus" size={16}/>Create your first playlist</button>}</div>
      <div className="sidebar-bottom"><div className="sidebar-library-note"><strong>A little more room.</strong><p>For your music, your films, your favourites.</p><Button icon="plus" onClick={() => input.current.click()}>Add to your library</Button></div><div className="local-badge"><span className="status-dot"/><div><strong>Your personal library</strong><small>Local files. No uploads.</small></div><Icon name="folder" size={20}/></div><button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><Icon name="settings"/><span>Settings</span></button><span className="version">LUMA COLLECTION · 1.0</span></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><div className="topbar-title"><Icon name="folder" size={18}/><span>Personal library</span></div><label className="global-search"><Icon name="search" size={18}/><input aria-label="Search library" placeholder="Search your music, films, or a favourite" value={query} onChange={event => { setQuery(event.target.value); if (view === 'settings') setView('library'); }}/>{query && <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={16}/></button>}</label><div className="top-actions"><button className="icon-button mobile-control" aria-label="Open playlists" onClick={() => openModal({type:'playlists'})}><Icon name="list"/></button><button className="icon-button mobile-control" aria-label="Open settings" onClick={() => navigate('settings')}><Icon name="settings"/></button><button className="icon-button theme-button" title="Toggle light and dark theme" aria-label="Toggle theme" onClick={() => updatePreferences(p => ({ theme:p.theme === 'dark' ? 'light' : 'dark' }))}><Icon name="sun"/></button><span className="avatar" aria-label="Local library">L</span></div></header>
      <div className={`workspace-grid ${view === 'settings' ? 'settings-grid' : ''}`}>
      <div className="page-content" key={view}>
        {view === 'settings' ? <><div className="section-eyebrow">PREFERENCES</div><h1>Settings</h1><p className="subtitle">Personalise Luma to suit you.</p><section className="settings-panel"><div><h3>Appearance</h3><p>Choose a comfortable view for your collection.</p><div className="segmented">{['dark','light'].map(theme => <button key={theme} className={preferences.theme === theme ? 'selected' : ''} onClick={() => updatePreferences(() => ({theme}))}>{theme === 'dark' ? 'Midnight' : 'Daylight'}</button>)}</div></div><div><h3>Playback history</h3><p>Keep a list of the media you play on this browser.</p><label className="switch-label"><input type="checkbox" checked={preferences.saveHistory} onChange={event => updatePreferences(() => ({saveHistory:event.target.checked}))}/>Remember recently played media</label><Button onClick={() => { updatePreferences(() => ({history:[]})); notify('Playback history cleared'); }}>Clear history</Button></div><div><h3>Library storage</h3><p>{tracks.length} files · {(totalSize / 1048576).toFixed(1)} MB stored in this browser. Files stay on this device; clearing browser data removes this library.</p><p>Playback depends on your browser’s codec support. MP3, WAV, MP4 (H.264), and WebM are recommended. Network streams must allow browser access.</p></div><div><h3>Keyboard shortcuts</h3><p><kbd>Space</kbd> Play / pause <kbd>←</kbd> Back 10 seconds <kbd>→</kbd> Forward 10 seconds <kbd>Esc</kbd> Close player</p></div></section></> : <>
          <div className="page-heading">{playlist && <div className="playlist-heading-cover"><Art track={playlist.artwork ? {artwork:playlist.artwork} : collectionArtwork(tracks,playlist.trackIds)}/></div>}<div>{view === 'library' && <p className="day-label">{dateLabel}</p>}<h1>{view === 'library' ? 'Find your kind of flow.' : title}</h1><p className="subtitle">{playlist ? `${visible.length} ${visible.length === 1 ? 'item' : 'items'} in this playlist` : view === 'history' ? 'Continue listening or watching.' : view === 'favourites' ? 'Your saved music and videos.' : view === 'library' ? 'Good sounds. Better days.' : 'Music, films and everything in between.'}</p></div><div className="heading-actions">{playlist && <button className="icon-button" aria-label="Playlist options" onClick={() => openModal({type:'playlist-options',...playlist})}><Icon name="more"/></button>}<Button icon="upload" primary onClick={() => input.current.click()} disabled={busy}>{busy ? 'Importing…' : 'Add media'}</Button></div></div>
          {view === 'library' && !query && <>
            <section className="room-hero" aria-label="Play your library"><div className="room-hero-copy"><span>YOUR DAILY ESCAPE</span><h2>Less noise.<br/>More feeling.</h2><p>Warm textures. Fresh energy. Room to breathe.</p><Button primary icon="play" disabled={busy || !ready} onClick={() => tracks.length ? start(featured || tracks[0],tracks) : input.current.click()}>{tracks.length ? 'Play your library' : 'Build your library'}</Button></div><div className="room-hero-art"><Art track={featured?.artwork ? featured : collectionArtwork(tracks)} coverIndex={0}/></div></section>
            <section className="room-collections"><div className="section-title"><h2>Made for this moment</h2><button onClick={() => navigate('audio')}>Browse music <Icon name="arrow" size={15}/></button></div><div className="room-collection-grid">{[
              {title:'Your everyday rotation',description:'Your music, all in one place.',view:'audio',count:tracks.filter(t => t.kind === 'audio').length},
              {title:'Worth another play',description:'Keep your favourites close.',view:'favourites',count:favouriteIds.length},
              {title:'A change of scene',description:'Your films and video collection.',view:'video',count:tracks.filter(t => t.kind === 'video').length},
            ].map((item,index) => <button className="room-collection" key={item.view} onClick={() => navigate(item.view)}><div className="room-collection-image"><Art track={item.view === 'favourites' ? collectionArtwork(tracks,favouriteIds) : collectionArtwork(tracks.filter(track => track.kind === item.view))} coverIndex={index}/><span className="collection-number">COLLECTION 0{index+1}</span><span className="collection-play"><Icon name="arrow" size={20}/></span></div><strong>{item.title}</strong><p>{item.description}</p><small>{item.count} {item.count === 1 ? 'file' : 'files'}</small></button>)}</div></section>
          </>}
          <div className="library-tabs" role="group" aria-label="Library sections">{[['library','All files'],['audio','Music'],['video','Videos'],['favourites','Favourites']].map(([id,label]) => <button key={id} className={view === id ? 'selected' : ''} aria-pressed={view === id} onClick={() => navigate(id)}>{label}<span>{id === 'library' ? tracks.length : id === 'favourites' ? preferences.favourites.length : tracks.filter(track => track.kind === id).length}</span></button>)}</div>
          {busy && <div className="import-progress" role="status"><span className="loading-spinner"/>Importing files into your library…</div>}
          <div className="collection-heading"><div><h2>{view === 'library' ? 'The collection' : playlist ? 'In this playlist' : 'Your collection'} <span className="count-badge">{visible.length}</span></h2><p>{ready ? visible.length ? 'Browse, play and organise your files.' : 'Add files to start your collection.' : 'Opening your collection…'}</p></div><div className="collection-tools"><select aria-label="Sort media" value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Recently added</option><option value="name">Name A–Z</option><option value="size">File size</option></select><div className="view-toggle"><button className={layout === 'grid' ? 'selected' : ''} aria-label="Grid view" onClick={() => setLayout('grid')}><Icon name="grid" size={17}/></button><button className={layout === 'list' ? 'selected' : ''} aria-label="List view" onClick={() => setLayout('list')}><Icon name="list" size={19}/></button></div></div></div>
          {!ready ? <div className="skeleton-grid" role="status" aria-label="Loading library">{[0,1,2,3].map(i => <div className="skeleton-card" key={i}><div/><span/><span/></div>)}</div> : libraryError ? <div className="library-error" role="alert"><Icon name="folder" size={34}/><h3>Unable to open your library</h3><p>{libraryError}</p><Button onClick={() => setLibraryVersion(value => value + 1)}>Try again</Button></div> : !visible.length ? <div className="empty-state"><div className="empty-art"><span/><Icon name={query ? 'search' : playlist ? 'list' : 'folder'} size={34}/><i>+</i></div><h3>{query ? 'No matching files' : playlist ? 'This playlist is empty' : view === 'favourites' ? 'No favourites yet' : view === 'history' ? 'No recently played files' : 'Add music or videos'}</h3><p>{query ? 'Try a different search, or add something new.' : playlist ? 'Add media from your library to start building your mix.' : view === 'favourites' ? 'Tap the heart on any file to keep it close.' : view === 'history' ? 'Play something from your library and it will appear here.' : 'Drop your audio and video files here, or browse your device.'}</p><Button icon={playlist || ['favourites','history'].includes(view) ? 'grid' : 'plus'} onClick={() => query ? setQuery('') : playlist ? openModal({type:'add-tracks',id:playlist.id}) : ['favourites','history'].includes(view) ? navigate('library') : input.current.click()}>{query ? 'Clear search' : playlist ? 'Choose tracks' : ['favourites','history'].includes(view) ? 'Explore library' : 'Add your first files'}</Button><small>MP3, WAV, MP4, WebM & more · Stored on this device</small></div> : <><div className="collection-actions"><Button icon="play" onClick={() => start(visible[0])}>Play all</Button>{playlist && <Button icon="plus" onClick={() => openModal({type:'add-tracks',id:playlist.id})}>Add tracks</Button>}<span>{visible.length} {visible.length === 1 ? 'item' : 'items'}</span></div><div className={`media-collection ${layout}`}>{visible.map(track => <article key={track.id} className={`media-card ${currentId === track.id ? 'now-playing' : ''}`}><button className="art-button" aria-label={`Play ${track.name}`} onClick={() => currentId === track.id && playing ? togglePlayback() : start(track)}><Art track={track}/><span className="play-overlay"><Icon name={currentId === track.id && playing ? 'pause' : 'play'} size={22}/></span><span className="kind-badge">{track.kind === 'video' ? 'VIDEO' : 'AUDIO'}</span></button><div className="media-info"><button className="track-title" onClick={() => start(track)}>{track.name}</button><p>{track.url ? 'Network stream' : `${(track.size / 1048576).toFixed(1)} MB`}<span>·</span>{track.filename?.split('.').pop()?.toUpperCase() || 'STREAM'}</p></div><div className="track-actions"><button className={`icon-button ${favouriteIds.includes(track.id) ? 'hearted' : ''}`} aria-label={`${favouriteIds.includes(track.id) ? 'Unfavourite' : 'Favourite'} ${track.name}`} onClick={() => favourite(track.id)}><Icon name="heart" size={18} filled={favouriteIds.includes(track.id)}/></button><button className="icon-button" aria-label={`Options for ${track.name}`} onClick={() => openModal({type:'track',track})}><Icon name="more" size={20}/></button></div></article>)}</div></>}
          <footer className="page-footer"><span><span className="status-dot"/> Saved locally on this device</span><button onClick={() => openModal({type:'stream'})}><Icon name="link" size={14}/>Open network stream</button></footer>
        </>}
      </div>
      {view !== 'settings' && <aside className="activity-panel" aria-label="Player and queue">
        <div className="panel-title"><h2>Your listening room</h2><span className={`player-status ${playing ? 'is-playing' : ''} ${mediaError ? 'is-error' : ''}`} role="status">{!ready ? 'Loading' : libraryError ? 'Unavailable' : mediaError ? 'Playback error' : buffering ? 'Buffering' : current ? playing ? 'Now playing' : 'Paused' : 'Ready'}</span></div>
        {featured ? <><button className="panel-art" aria-label={`Preview ${featured.name}`} onClick={() => current ? setExpanded(true) : start(featured,tracks)}><Art track={featured} large/></button><h3 className="panel-track-title">{featured.name}</h3><p className="panel-track-meta">{featured.kind === 'audio' ? 'Audio' : 'Video'} · {featured.filename?.split('.').pop()?.toUpperCase() || 'Network stream'}</p><div className="panel-track-actions"><Button primary icon={current && playing ? 'pause' : 'play'} aria-label="Play or pause from player panel" onClick={() => current ? togglePlayback() : start(featured,tracks)}>{current && playing ? 'Pause' : 'Play'}</Button><button className={`icon-button ${favouriteIds.includes(featured.id) ? 'hearted' : ''}`} aria-label="Favourite player preview" onClick={() => favourite(featured.id)}><Icon name="heart" filled={favouriteIds.includes(featured.id)}/></button></div>{mediaError && <div className="playback-error" role="alert"><p>{mediaError}</p><Button onClick={() => { setMediaError(''); media.current?.load(); media.current?.play().catch(() => setMediaError('This file cannot be played in your browser. Try another file.')); }}>Retry playback</Button></div>}</> : <div className="player-placeholder"><Icon name="music" size={45}/><h3>Nothing playing yet</h3><p>Pick a file from your library to start listening or watching.</p></div>}
        <div className="listening-note"><Icon name="folder" size={20}/><span>JUST YOUR COLLECTION</span><h3>A space that stays yours.</h3><p>{current ? 'Enjoy your file without leaving your library. Playback stays with you as you browse.' : 'Choose a track, settle in, and make a little time for yourself.'}</p></div><div className="panel-divider"/>
        <div className="panel-title"><h2>Play queue</h2><span>{queue.length} {queue.length === 1 ? 'track' : 'tracks'}</span></div>
        <div className="queue-list">{queue.length ? queue.map((id,index) => { const track = tracks.find(item => item.id === id); return track && <button key={`${id}-${index}`} className={`queue-item ${id === currentId ? 'selected' : ''}`} onClick={() => start(track,queue.map(key => tracks.find(item => item.id === key)).filter(Boolean))}><span className="queue-index">{id === currentId && playing ? <span className="playing-bars"><i/><i/><i/></span> : String(index+1).padStart(2,'0')}</span><span><strong>{track.name}</strong><small>{track.kind === 'audio' ? 'Audio' : 'Video'}</small></span><Icon name="play" size={14}/></button>; }) : <div className="queue-empty"><Icon name="list" size={22}/><p>Your queue is empty</p><small>Use Play all or add files from a file’s menu.</small></div>}</div>
        <button className="panel-stream" onClick={() => openModal({type:'stream'})}><Icon name="link" size={17}/><span>Open network stream</span><Icon name="plus" size={16}/></button>
      </aside>}
      </div>
    </main>
    {current && <><div className={`media-stage ${expanded || (current.kind === 'video' && !videoHidden) ? 'visible' : ''} ${expanded ? 'expanded' : ''}`}><div className="stage-header"><span>{current.name}</span><button className="icon-button" aria-label="Minimize player" tabIndex={expanded || (current.kind === 'video' && !videoHidden) ? 0 : -1} onClick={() => { setExpanded(false); setVideoHidden(true); }}><Icon name="close"/></button></div>{mediaError && <div className="stage-error" role="alert"><p>{mediaError}</p><Button onClick={() => input.current.click()}>Choose another file</Button></div>}{current.kind === 'video' ? <video key={currentId} ref={media} src={source} controls autoPlay playsInline onWaiting={() => setBuffering(true)} onCanPlay={() => setBuffering(false)} onPlaying={() => setBuffering(false)} onPlay={recordPlay} onPause={() => setPlaying(false)} onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onLoadedMetadata={event => { setMediaError(''); setBuffering(false); setDuration(event.currentTarget.duration); event.currentTarget.volume = volume; }} onEnded={() => advance(1,true)} onError={() => { setPlaying(false); setBuffering(false); setMediaError('Check this file’s format or stream URL, then try again.'); notify('This media could not play. Check the file format or stream URL.', 'error'); }}/> : <><Art track={current} large/><h2>{current.name}</h2><audio key={currentId} ref={media} src={source} autoPlay onWaiting={() => setBuffering(true)} onCanPlay={() => setBuffering(false)} onPlaying={() => setBuffering(false)} onPlay={recordPlay} onPause={() => setPlaying(false)} onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onLoadedMetadata={event => { setMediaError(''); setBuffering(false); setDuration(event.currentTarget.duration); event.currentTarget.volume = volume; }} onEnded={() => advance(1,true)} onError={() => { setPlaying(false); setBuffering(false); setMediaError('This audio format could not be played. Try MP3 or WAV.'); notify('Unable to play this audio. Try a browser-supported format such as MP3 or WAV.', 'error'); }}/></>}</div><div className="player-bar"><div className="player-track"><button className="mini-art" aria-label="Expand player" onClick={() => { setExpanded(!expanded); setVideoHidden(false); }}><Art track={current}/></button><div><strong>{current.name}</strong><small>{current.kind === 'video' ? 'Now watching' : 'Now listening'} · Your collection</small></div><button className={`icon-button ${favouriteIds.includes(currentId) ? 'hearted' : ''}`} aria-label="Favourite current track" onClick={() => favourite(currentId)}><Icon name="heart" size={17} filled={favouriteIds.includes(currentId)}/></button></div><div className="player-center"><div className="playback-buttons"><button className={`icon-button ${shuffle ? 'enabled' : ''}`} aria-label="Shuffle" aria-pressed={shuffle} onClick={() => setShuffle(!shuffle)}><Icon name="shuffle" size={16}/></button><button className="icon-button" aria-label="Previous track" onClick={() => advance(-1)}><Icon name="previous" size={19}/></button><button className="main-play" aria-label={playing ? 'Pause playback' : 'Resume playback'} onClick={togglePlayback}><Icon name={playing ? 'pause' : 'play'} size={20} filled={!playing}/></button><button className="icon-button" aria-label="Next track" onClick={() => advance(1)}><Icon name="next" size={19}/></button><button className={`icon-button ${repeat ? 'enabled' : ''}`} aria-label="Repeat queue" aria-pressed={repeat} onClick={() => setRepeat(!repeat)}><Icon name="repeat" size={17}/></button></div><div className="timeline"><span>{formatTime(position)}</span><input aria-label="Playback position" type="range" min="0" max={Number.isFinite(duration) ? duration || 1 : 1} step="0.1" value={position} onChange={event => seek(event.target.value)}/><span>{formatTime(duration)}</span></div></div><div className="player-right"><button className="icon-button" aria-label="View playback queue" onClick={() => openModal({type:'queue'})}><Icon name="list" size={18}/></button><button className="icon-button" aria-label="Mute or unmute" onClick={() => setVolume(volume ? 0 : 0.8)}><Icon name={volume ? 'volume' : 'mute'} size={18}/></button><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={event => setVolume(Number(event.target.value))}/><button className="icon-button" aria-label="Expand current player" onClick={() => { setExpanded(!expanded); setVideoHidden(false); }}><Icon name="expand" size={18}/></button><button className="icon-button" aria-label="Stop playback" onClick={() => { media.current?.pause(); setCurrentId(null); setPlaying(false); setExpanded(false); setMediaError(''); setBuffering(false); }}><Icon name="close" size={18}/></button></div></div></>}
    {dragging && <div className="drop-overlay" onDragLeave={() => setDragging(false)}><Icon name="upload" size={60}/><h2>Drop files to import</h2><p>Audio and video files, right here.</p></div>}
    {toast && <div className="toast" data-kind={toast.kind} role={toast.kind === 'error' ? 'alert' : 'status'}><Icon name={toast.kind === 'error' ? 'close' : 'check'} size={18}/>{toast.message}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast(null)}><Icon name="close" size={16}/></button></div>}
    {modal && <div className="modal-backdrop" onClick={() => setModal(null)}><section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-label="Library action" onClick={event => event.stopPropagation()}><button className="modal-close icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><Icon name="close"/></button>
      {modal.type === 'queue' && <><h2>Up next.</h2><p>{queue.length} items in your playback queue.</p><div className="track-picker">{queue.map((id,index) => { const track = tracks.find(item => item.id === id); return track && <Button key={`${id}-${index}`} icon={id === currentId ? 'play' : track.kind === 'audio' ? 'music' : 'video'} onClick={() => { start(track,queue.map(key => tracks.find(item => item.id === key)).filter(Boolean)); setModal(null); }}>{track.name}</Button>; })}</div></>}
      {modal.type === 'playlists' && <><h2>Your playlists.</h2><p>Create and manage your playlists.</p>{preferences.playlists.map(item => <Button key={item.id} icon="list" onClick={() => { navigate(`playlist:${item.id}`); setModal(null); }}>{item.name}</Button>)}<Button primary icon="plus" onClick={() => openModal({type:'create'})}>Create playlist</Button></>}
      {['create','rename'].includes(modal.type) && <form onSubmit={savePlaylist}><span className="modal-symbol"><Icon name="list" size={28}/></span><h2>{modal.type === 'rename' ? 'Rename playlist' : 'Create a playlist'}</h2><p>Choose a name for your playlist.</p><label>Playlist name<input autoFocus required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Sunday slowdowns"/></label><Button primary type="submit">{modal.type === 'rename' ? 'Save changes' : 'Create playlist'}</Button></form>}
      {modal.type === 'stream' && <form onSubmit={addStream}><span className="modal-symbol"><Icon name="link" size={28}/></span><h2>Open a network stream</h2><p>Paste a direct audio or video URL. The server must allow browser playback; YouTube page links are not supported.</p><label>Media URL<input type="url" autoFocus required value={streamUrl} onChange={event => setStreamUrl(event.target.value)} placeholder="https://example.com/film.mp4"/></label><label>Title (optional)<input value={name} onChange={event => setName(event.target.value)} placeholder="Give it a name"/></label><label>Media type<select value={streamKind} onChange={event => setStreamKind(event.target.value)}><option value="video">Video</option><option value="audio">Audio</option></select></label><Button primary icon="play" type="submit">Open stream</Button></form>}
      {modal.type === 'track' && <><h2>{modal.track.name}</h2><p>{modal.track.filename || 'Network stream'}</p><Button icon="play" onClick={() => { start(modal.track); setModal(null); }}>Play now</Button><Button icon="list" onClick={() => { setQueue(p => [...p,modal.track.id]); setModal(null); notify('Added to playback queue'); }}>Add to queue</Button><Button icon="folder" onClick={() => chooseCover('track',modal.track.id)}>Choose cover photo</Button><h3>Add to playlist</h3>{preferences.playlists.map(item => <Button key={item.id} icon={item.trackIds.includes(modal.track.id) ? 'check' : 'plus'} onClick={() => { updatePreferences(p => ({playlists:p.playlists.map(pl => pl.id === item.id ? {...pl,trackIds:[...new Set([...pl.trackIds,modal.track.id])]} : pl)})); notify(`Added to ${item.name}`); setModal(null); }}>{item.name}</Button>)}{!preferences.playlists.length && <Button onClick={() => openModal({type:'create'})}>Create a playlist first</Button>}{playlist && <Button onClick={() => { updatePreferences(p => ({playlists:p.playlists.map(pl => pl.id === playlist.id ? {...pl,trackIds:pl.trackIds.filter(id => id !== modal.track.id)} : pl)})); setModal(null); }}>Remove from this playlist</Button>}<Button className="danger" icon="trash" onClick={() => openModal({type:'delete-track',track:modal.track})}>Remove from library</Button></>}
      {modal.type === 'delete-track' && <><h2>Remove this file?</h2><p>“{modal.track.name}” will be removed from this browser’s library and playlists. Your original file stays on your device.</p><Button className="danger" onClick={() => removeTrack(modal.track)}>Remove from library</Button><Button onClick={() => setModal(null)}>Keep file</Button></>}
      {modal.type === 'playlist-options' && <><h2>{modal.name}</h2><Button icon="folder" onClick={() => chooseCover('playlist',modal.id)}>Choose cover photo</Button><Button icon="plus" onClick={() => openModal({type:'add-tracks',id:modal.id})}>Add tracks</Button><Button onClick={() => openModal({type:'rename',id:modal.id,name:modal.name})}>Rename playlist</Button><Button className="danger" onClick={() => openModal({type:'delete-playlist',id:modal.id})}>Delete playlist</Button></>}
      {modal.type === 'delete-playlist' && <><h2>Delete this playlist?</h2><p>Your media files will stay in the library.</p><Button className="danger" onClick={() => { updatePreferences(p => ({playlists:p.playlists.filter(pl => pl.id !== modal.id)})); navigate('library'); setModal(null); }}>Delete playlist</Button><Button onClick={() => setModal(null)}>Keep playlist</Button></>}
      {modal.type === 'add-tracks' && <><h2>Add to playlist</h2><p>Choose media to add. Changes are saved automatically.</p><div className="track-picker">{tracks.map(track => { const selected = preferences.playlists.find(pl => pl.id === modal.id)?.trackIds.includes(track.id); return <label key={track.id}><Icon name={track.kind === 'audio' ? 'music' : 'video'}/><span>{track.name}</span><input type="checkbox" checked={!!selected} onChange={() => updatePreferences(p => ({playlists:p.playlists.map(pl => pl.id === modal.id ? {...pl,trackIds:selected ? pl.trackIds.filter(id => id !== track.id) : [...pl.trackIds,track.id]} : pl)}))}/></label>; })}{!tracks.length && <p>Add files to your library first.</p>}</div><Button primary onClick={() => setModal(null)}>Done</Button></>}
    </section></div>}
  </div>;
}
