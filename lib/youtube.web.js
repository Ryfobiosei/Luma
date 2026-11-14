// The native extractor replaces global URL and breaks browser routing.
const youtube = {
  getInfo: async () => {
    throw new Error('YouTube extraction is unavailable in the browser. Use a direct media URL or the native app.');
  },
  chooseFormat: () => null,
};
export default youtube;
