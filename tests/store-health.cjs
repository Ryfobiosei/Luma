const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function harness() {
  const saved = new Map();
  const storage = {
    getItem: async key => saved.get(key) ?? null,
    setItem: async (key, value) => { saved.set(key, value); },
    removeItem: async key => { saved.delete(key); },
  };
  const cache = new Map();
  const sound = { playAsync: async () => {}, stopAsync: async () => {}, unloadAsync: async () => {} };
  function load(name, fresh = false) {
    if (!fresh && cache.has(name)) return cache.get(name);
    const filename = path.resolve(__dirname, '../store', name + '.js');
    const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
      filename, configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    });
    const module = { exports: {} };
    const mockedRequire = id => {
      if (id === '@react-native-async-storage/async-storage') return storage;
      if (id === 'react-native-uuid') return { v4: () => 'test-playlist' };
      if (id === 'expo-media-library') return {};
      if (id === 'expo-av') return { Audio: { setAudioModeAsync: async () => {}, Sound: { createAsync: async () => ({ sound }) } } };
      if (id.startsWith('./')) return { __esModule: true, default: load(id.slice(2)) };
      return require(id);
    };
    vm.runInNewContext(code, { require: mockedRequire, module, exports: module.exports, console, setTimeout, clearTimeout });
    const store = module.exports.default;
    cache.set(name, store);
    return store;
  }
  return { load, saved };
}

for (const [name, mutate, verify] of [
  ['playlistStore', s => s.createPlaylist('Road trip', [{ id: 'song' }]), s => assert.equal(s.playlists[0].tracks[0].id, 'song')],
  ['historyStore', s => s.addToHistory({ id: 'song' }), s => assert.equal(s.history[0].id, 'song')],
  ['favouriteStore', s => s.toggleFavourite({ id: 'song' }), s => assert.equal(s.isFavourite('song'), true)],
]) {
  test(`${name} survives a new store instance`, async () => {
    const { load, saved } = harness();
    const first = load(name);
    await first.persist.rehydrate();
    mutate(first.getState());
    assert.equal(saved.size, 1);
    const reopened = load(name, true);
    await reopened.persist.rehydrate();
    verify(reopened.getState());
  });
}

test('theme restores matching colors with saved preferences', async () => {
  const { load } = harness();
  const first = load('theme');
  await first.persist.rehydrate();
  first.getState().toggleTheme();
  first.getState().setAccentColor('blue');
  const reopened = load('theme', true);
  await reopened.persist.rehydrate();
  assert.equal(reopened.getState().activeTheme, 'dark');
  assert.equal(reopened.getState().themeColors.background, '#111017');
  assert.equal(reopened.getState().themeColors.primary, '#2563EB');
});

test('audio handles empty shuffle and starts a selected queue', async () => {
  const { load } = harness();
  const store = load('useAudioControl');
  store.getState().toggleShuffle();
  assert.equal(store.getState().playQueue.length, 0);
  await store.getState().setAndPlayPlaylist([{ id: 'song', uri: 'file:///song.mp3' }]);
  assert.equal(store.getState().isPlaying, true);
  assert.equal(store.getState().lyrics, null);
  await store.getState().stop();
});

test('video history respects the saved history preference', async () => {
  const { load } = harness();
  const history = load('historyStore');
  const video = load('VideoHeadStore');
  await Promise.all([history.persist.rehydrate(), video.persist.rehydrate()]);
  history.getState().setSaveHistory(false);
  video.getState().addToHistory({ id: 'private-video' });
  assert.equal(video.getState().videoHistory.length, 0);
  history.getState().setSaveHistory(true);
  video.getState().addToHistory({ id: 'saved-video' });
  assert.equal(video.getState().videoHistory[0].id, 'saved-video');
});

test('web development bundle transforms import.meta into executable script syntax', () => {
  const config = require('../babel.config.js')({ cache: () => {} });
  const { code } = babel.transformSync('const mode = import.meta.env?.MODE;', {
    filename: path.resolve(__dirname, 'startup.js'),
    configFile: false, babelrc: false,
    caller: { name: 'metro', platform: 'web', isDev: true, supportsStaticESM: false },
    presets: [config.presets[0]],
  });
  assert.doesNotThrow(() => new vm.Script(code));
});
