// ============================================================
// BE_CREATOR MUSIC PLAYLISTS REGISTRY
// ============================================================
// To add a new playlist in the future:
// 1. Create a new JS file in util/playlists/ (e.g., study.js)
// 2. Load it in player.html before config.js
// 3. Add your playlist object to BE_CREATOR_PLAYLISTS below!

window.BE_CREATOR_PLAYLISTS = [
  typeof teashopPlaylist !== 'undefined' ? teashopPlaylist : null,
  typeof shivaPlaylist !== 'undefined' ? shivaPlaylist : null
].filter(Boolean);
