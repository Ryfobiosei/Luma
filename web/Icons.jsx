import React from 'react';
const paths = {
 home: 'm3 10 9-7 9 7v11h-6v-7H9v7H3V10Z',
 play: 'm9 5 11 7-11 7V5Z', pause: 'M8 5v14M16 5v14', next: 'm5 5 10 7-10 7V5ZM19 5v14', previous: 'm19 5-10 7 10 7V5ZM5 5v14',
 music: 'M9 18V5l11-2v13M9 8l11-2M9 18c0 2-6 3-6 0s6-3 6 0Zm11-2c0 2-6 3-6 0s6-3 6 0Z',
 video: 'M4 4h16v16H4zM4 9h16M8 4l4 5m3-5 4 5m-9 4 5 3-5 3v-6Z',
 grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 heart: 'M20.8 4.6c-2-2-5.2-2-7.2 0L12 6.2l-1.6-1.6c-2-2-5.2-2-7.2 0s-2 5.2 0 7.2L12 21l8.8-9.2c2-2 2-5.2 0-7.2Z',
 history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2',
 folder: 'M3 6h6l2 2h10v12H3V6Z', plus: 'M12 5v14M5 12h14',
 search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
 arrow: 'M5 12h14m-5-5 5 5-5 5', upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
 settings: 'M10 2h4l1 3 2 1 3-.5 2 3.5-2 2v2l2 2-2 3.5-3-.5-2 1-1 3h-4l-1-3-2-1-3 .5-2-3.5 2-2v-2l-2-2 2-3.5 3 .5 2-1 1-3ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 list: 'M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1',
 close: 'm6 6 12 12M6 18 18 6', volume: 'M3 9h4l5-4v14l-5-4H3V9Zm13-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14',
 mute: 'M3 9h4l5-4v14l-5-4H3V9Zm13 0 6 6m-6 0 6-6',
 shuffle: 'M3 5h3l12 14h3m-4-4 4 4-4 4M3 19h3l4-5m4-4 4-5h3m-4-4 4 4-4 4',
 repeat: 'M3 8h17l-4-4m4 4-4 4M21 16H4l4 4m-4-4 4-4',
 link: 'm10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 12a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1',
 trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
 check: 'm5 12 4 4L20 5', more: 'M5 12h.1M12 12h.1M19 12h.1', sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
 disc: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z', expand: 'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6',
};
export default function Icon({ name, size = 20, filled = false, ...props }) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.music} /></svg>;
}
