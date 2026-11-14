import React, { createContext, useReducer, useContext } from 'react';

const PlaylistContext = createContext();

const playlistReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TRACK':
      return [...state, action.payload];
    case 'REMOVE_TRACK':
      return state.filter((_, i) => i !== action.payload);
    case 'CLEAR_PLAYLIST':
      return [];
    default:
      return state;
  }
};

export const PlaylistProvider = ({ children }) => {
  const [playlist, dispatch] = useReducer(playlistReducer, []);

  return (
    <PlaylistContext.Provider value={{ playlist, dispatch }}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylist = () => useContext(PlaylistContext);