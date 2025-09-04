// api/yt.js  (Vercel serverless)
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const key = process.env.YT_API_KEY;      // set on Vercel dashboard
  const channelId = process.env.CHANNEL_ID; // set on Vercel dashboard

  if (!key) return res.status(500).json({ error: 'YT_API_KEY not configured' });

  const { op } = req.query;

  try {
    let url = '';
    if (op === 'channel') {
      url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${channelId}&key=${key}`;
    } else if (op === 'uploads') {
      const playlistId = req.query.playlistId;
      url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${key}${req.query.pageToken ? `&pageToken=${req.query.pageToken}` : ''}`;
    } else if (op === 'videos') {
      const ids = req.query.ids;
      url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${key}`;
    } else if (op === 'searchLive') {
      const eventType = req.query.eventType; // 'live' or 'completed'
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=${eventType}&type=video&maxResults=50&key=${key}`;
    } else if (op === 'playlists') {
      url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=50&key=${key}`;
    } else {
      return res.status(400).json({ error: 'Unknown op' });
    }

    const r = await fetch(url);
    const json = await r.json();
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res.status(r.status).json(json);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
