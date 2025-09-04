// script.js (frontend)
const PROXY_BASE = 'https://<YOUR_VERCEL_APP>.vercel.app/api/yt'; // <- set this
const CHANNEL_ID = 'UCX8EbsslPjq-hmas1LlaaWQ';

// helper to call proxy
async function proxyFetch(op, params = {}) {
  const url = new URL(PROXY_BASE);
  url.searchParams.set('op', op);
  Object.entries(params).forEach(([k,v]) => { if (v) url.searchParams.set(k, v); });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);
  return res.json();
}

// Example usage
async function loadChannel() {
  try {
    const ch = await proxyFetch('channel');
    const channel = ch.items[0];
    document.getElementById('channelTitle').innerText = channel.snippet.title;
    document.getElementById('avatar').src = channel.snippet.thumbnails.high.url;
    // set counters with animation...
  } catch (e) {
    console.error('Error loading channel', e);
  }
}

// Load uploads playlist items (paginated)
async function loadUploads(playlistId) {
  let next = '';
  let all = [];
  do {
    const resp = await proxyFetch('uploads', { playlistId, pageToken: next });
    resp.items.forEach(it => {
      if (it.snippet && it.snippet.resourceId && it.snippet.resourceId.videoId) {
        all.push({
          id: it.snippet.resourceId.videoId,
          title: it.snippet.title,
          thumb: it.snippet.thumbnails?.high?.url,
          published: it.snippet.publishedAt
        });
      }
    });
    next = resp.nextPageToken || '';
  } while (next);
  return all;
}

// Live search
async function checkLive(eventType = 'live') {
  const resp = await proxyFetch('searchLive', { eventType });
  return resp;
}

loadChannel().catch(console.error);
