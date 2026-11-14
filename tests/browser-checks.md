# Browser acceptance checks

Verified against the running Expo web app on 2026-11-14 using actual UI interactions.

- Imported a generated 30-second WAV through the file chooser; playback reported 30 seconds and `paused: false`.
- Paused, resumed, restarted, and sought the WAV with the timeline; confirmed the media element moved to 12.1 seconds.
- Imported a generated H.264 MP4; playback reported 5 seconds, 320-pixel video width, and `paused: false`.
- Played a direct HTTP MP4 stream from a temporary local test server; confirmed 5-second playback without errors. Removed the temporary stream entry and stopped that server afterwards.
- Favourited an audio file and verified it appeared in Favourites.
- Created a playlist, added the audio file, played it, renamed the playlist, and verified the saved name after reload.
- Confirmed audio/video files and favourites survived a page reload through IndexedDB and local preferences.
- Confirmed recently played items appeared in History after reload.
- Searched for an unmatched title and verified the empty search result.
- Switched grid/list views and light/dark appearance.
- Verified that YouTube page URLs show an actionable validation message.
- Inspected the narrow layout and the 1360-pixel desktop breakpoint, including mobile playlist/settings access.

The generated local WAV and MP4 are playback test fixtures. Native device media access, codec support, and background playback still require physical-device checks. Browser playback supports the codecs provided by the browser, rather than every format supported by desktop VLC.
