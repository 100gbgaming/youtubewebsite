// api/yt.js  (Vercel serverless)
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { op, playlistId, ids, eventType } = req.query;
  const key = process.env.YT_API_KEY;
  if (!key) return res.status(500).json({ error: 'YT_API_KEY not configured' });

  try {
    let url;
    if (op === 'channel') {
      url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${process.env.CHANNEL_ID || ''}&key=${key}`;
    } else if (op === 'uploads') {
      url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${key}`;
      if (req.query.pageToken) url += `&pageToken=${req.query.pageToken}`;
    } else if (op === 'videos') {
      url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${key}`;
    } else if (op === 'searchLive') {
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${process.env.CHANNEL_ID || ''}&eventType=${eventType}&type=video&key=${key}`;
    } else if (op === 'playlists') {
      url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${process.env.CHANNEL_ID || ''}&maxResults=50&key=${key}`;
    } else {
      return res.status(400).json({ error: 'Unknown op' });
    }

    const r = await fetch(url);
    const j = await r.json();
    res.setHeader('cache-control', 'public, max-age=30'); // tiny caching
    res.status(r.status).json(j);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
