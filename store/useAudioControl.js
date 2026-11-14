import {create} from "zustand";
import {Audio} from "expo-av";
import useHistoryStore from './historyStore';

const useAudioControl = create((set, get) => ({
  // Audio state
  sound: null,
  isPlaying: false,
  currentTrack: null,
  playQueue: [],
  originalQueue: [], // Store the original, unshuffled queue
  isShuffleOn: false,
  currentIndex: 0,
  duration: 0,
  position: 0,
  isLoading: false,
  isMiniPlayerVisible: true,

  // Sleep Timer State
  sleepTimerId: null,

  // Lyrics State
  lyrics: null,
  showLyrics: false,
  lyricsLoading: false,
  lyricsError: null,

  // Initialize audio
  initialize: async () => {
    try {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error("Error initializing audio:", error);
    }
  },

  // Check if audio is initialized
  isInitialized: () => {
    return true; // For now, assume it's initialized if no error was thrown
  },

  // Set play queue and start playing
  setPlayQueue: async (tracks, startIndex = 0) => {
    const { sound } = get();
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (error) {
        console.error("Error stopping/unloading previous sound:", error);
      }
    }
    set({
      playQueue: tracks,
      originalQueue: tracks,
      currentIndex: startIndex,
      currentTrack: tracks[startIndex] || null,
      isPlaying: false,
      sound: null,
      isMiniPlayerVisible: true,
    });
    // Also fetch lyrics for the new track
    get().fetchLyricsFromAPI(tracks[startIndex]);
  },

  // Play current track
  play: async () => {
    const { sound, currentTrack, isPlaying, isLoading } = get();
    if (isPlaying || !currentTrack || isLoading) return;

    set({ isLoading: true });
    try {
      await get().initialize();

      if (sound) {
        // Sound object exists, so it's paused. Let's resume.
        set({ isPlaying: true });
        await sound.playAsync();
        set({ isLoading: false });
      } else {
        // No sound object, so this is a new track.
        const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: currentTrack.uri },
            { shouldPlay: true, volume: 1.0 },
            (status) => onPlaybackStatusUpdate(status, set, get)
        );
        set({
            sound: newSound,
            isPlaying: true,
            isLoading: false,
        });
        try {
          if (useHistoryStore.getState().saveHistory) {
            useHistoryStore.getState().addToHistory(currentTrack);
          }
        } catch (e) {}
        get().fetchLyricsFromAPI(currentTrack);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      set({ isLoading: false, isPlaying: false });
    }
  },

  // Pause current track
  pause: async () => {
    const {sound, isLoading} = get();
    if (isLoading) return;
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        try {
          set({isLoading: true, isPlaying: false }); // Immediately update UI to show paused state
          await sound.pauseAsync();
          set({ isLoading: false});
        } catch (error) {
          console.error("Error pausing audio:", error);
          set({isLoading: false, isPlaying: true }); // Revert playing state on error
        }
      }
    }
  },

  // Stop current track
  stop: async () => {
    const {sound} = get();
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (error) {
        console.error("Error stopping audio:", error);
      }
    }
    // Also clear the track info to reset the UI
    set({
      sound: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      currentTrack: null,
      playQueue: [],
      currentIndex: 0,
      lyrics: null, // Clear lyrics on stop
    });
     // Also clear any active sleep timer
    get().clearSleepTimer();
  },

  // Next track
  next: async () => {
    const { playQueue, currentIndex, sound } = get();
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      set({ sound: null, isPlaying: false, position: 0 });
    }
    if (playQueue.length > currentIndex + 1) {
      const nextIndex = currentIndex + 1;
      set({ currentIndex: nextIndex, currentTrack: playQueue[nextIndex] });
      get().play();
    } else {
      // End of queue, what to do? Maybe stop.
      get().stop();
    }
  },

  // Previous track
  previous: async () => {
    const { playQueue, currentIndex, sound } = get();
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      set({ sound: null, isPlaying: false, position: 0 });
    }
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      set({ currentIndex: prevIndex, currentTrack: playQueue[prevIndex] });
      get().play();
    }
  },

  // Seek to position
  seek: async (position) => {
    const {sound} = get();
    if (sound) {
      try {
        await sound.setPositionAsync(position);
      } catch (error) {
        console.error("Error seeking audio:", error);
      }
    }
  },

  // Sleep Timer Controls
  setSleepTimer: (minutes) => {
    const { clearSleepTimer, stop, sleepTimerId } = get();
    
    // Clear any existing timer first
    if (sleepTimerId) {
      clearSleepTimer();
    }

    const timeoutId = setTimeout(() => {
      stop();
    }, minutes * 60 * 1000);

    set({ sleepTimerId: timeoutId });
  },

  clearSleepTimer: () => {
    const { sleepTimerId } = get();
    if (sleepTimerId) {
      clearTimeout(sleepTimerId);
      set({ sleepTimerId: null });
    }
  },

  // Lyrics Controls
  fetchLyrics: async (track) => {
    if (!track || !track.uri) {
        set({ lyrics: null });
        return;
    }
    set({ lyrics: track.lyrics || null });
  },

  toggleLyrics: () => {
    set((state) => ({ showLyrics: !state.showLyrics }));
  },

  // Cleanup
  cleanup: async () => {
    const {sound} = get();
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        console.error("Error cleaning up audio:", error);
      }
    }
  },

  // Helper to set playlist and play immediately
  setAndPlayPlaylist: async (tracks, startIndex = 0) => {
    await get().setPlayQueue(tracks, startIndex);
    await get().play();
  },

  // Control mini player visibility
  hideMiniPlayer: () => set({ isMiniPlayerVisible: false }),
  showMiniPlayer: () => set({ isMiniPlayerVisible: true }),
  toggleMiniPlayer: () => set((state) => ({ isMiniPlayerVisible: !state.isMiniPlayerVisible })),

  // Shuffle playlist
  toggleShuffle: () => {
    set((state) => {
      if (!state.currentTrack || state.playQueue.length === 0) return state;
      const isShuffleOn = !state.isShuffleOn;
      let newQueue = [...state.playQueue];
      
      if (isShuffleOn) {
        // Shuffle the queue, keeping the current track at the beginning
        const current = newQueue[state.currentIndex];
        const rest = newQueue.filter((_, i) => i !== state.currentIndex);
        for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        newQueue = [current, ...rest];
      } else {
        // Restore the original order
        newQueue = [...state.originalQueue];
      }
      
      // Find the new index of the current track
      const newIndex = newQueue.findIndex(track => track.id === state.currentTrack.id);

      return { isShuffleOn, playQueue: newQueue, currentIndex: newIndex };
    });
  },

  // Show embedded lyrics when available; never fabricate lyrics.
  fetchLyricsFromAPI: async (track) => {
    set({ lyrics: track?.lyrics || null, lyricsLoading: false, lyricsError: null });
  },

  refreshLyrics: () => {
    const { currentTrack, fetchLyricsFromAPI } = get();
    if (currentTrack) {
      fetchLyricsFromAPI(currentTrack);
    }
  }
}));

const onPlaybackStatusUpdate = (status, set, get) => {
  if (!status.isLoaded) {
    if (status.error) {
      console.error(`Playback Error: ${status.error}`);
      set({isPlaying: false, isLoading: false, error: status.error});
    }
  } else {
    set({
      position: status.positionMillis,
      duration: status.durationMillis,
      isPlaying: status.isPlaying,
    });

    if (status.didJustFinish) {
      get().next();
    }
  }
};

export default useAudioControl; 