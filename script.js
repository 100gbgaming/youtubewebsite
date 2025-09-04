/* CONFIG: CHANNEL ID */
const CHANNEL_ID = 'UC6-xDKxqRrJ-pPEI4aqmjyA'; // Spirrow

/* Which mode: PROXY or CLIENT
   PROXY: call /api/* endpoints (recommended: deploy serverless with YT_API_KEY env var)
   CLIENT: include a local config.js with YT_API_KEY = "..." (NOT FOR PUBLIC REPOS)
*/
const USE_PROXY = true; // set to false only if you have config.js with YT_API_KEY

// helper to call backend / proxy or client direct
async function apiFetch(path, params = {}) {
  if (USE_PROXY) {
    // call the serverless proxy (must be deployed yoursite.com/api/yt?op=...)
    const url = `/api/yt?${new URLSearchParams({ op: path, ...params })}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Proxy fetch failed: ' + res.status);
    return res.json();
  } else {
    // direct client calls (dev): requires config.js to define YT_API_KEY
    if (typeof YT_API_KEY === 'undefined') throw new Error('YT_API_KEY not found (config.js)');
    const key = YT_API_KEY;
    // implement limited direct mapping: path names we support:
    if (path === 'channel') {
      const u = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${CHANNEL_ID}&key=${key}`;
      const r = await fetch(u); if(!r.ok) throw r; return r.json();
    } else if (path === 'uploads') {
      const playlistId = params.playlistId;
      const u = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${key}&pageToken=${params.pageToken||''}`;
      const r = await fetch(u); if(!r.ok) throw r; return r.json();
    } else if (path === 'videos') {
      const ids = params.ids;
      const u = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}&key=${key}`;
      const r = await fetch(u); if(!r.ok) throw r; return r.json();
    } else if (path === 'searchLive') {
      const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=${params.eventType}&type=video&key=${key}`;
      const r = await fetch(u); if(!r.ok) throw r; return r.json();
    }
    throw new Error('Unsupported direct op: ' + path);
  }
}

/* ---------- UI helpers ---------- */
const routeEls = {
  home: document.getElementById('home'),
  videos: document.getElementById('videos'),
  live: document.getElementById('live'),
  playlists: document.getElementById('playlists'),
  posts: document.getElementById('posts')
};

function showRoute(name){
  Object.values(routeEls).forEach(el => el.classList.add('hidden'));
  routeEls[name].classList.remove('hidden');
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.route === name));
  window.scrollTo({top:0, behavior:'smooth'});
}

/* wire nav */
document.querySelectorAll('.nav-link').forEach(a=>{
  a.addEventListener('click', ()=> showRoute(a.dataset.route));
});

/* counters animation */
function animateCount(el, target){
  let start = 0, duration = 1200, started = performance.now();
  (function tick(now){
    let t = Math.min((now - started)/duration, 1);
    el.textContent = Math.floor(t*target).toLocaleString();
    if (t<1) requestAnimationFrame(tick);
  })(performance.now());
}

/* create video card */
function createVideoCard({id, title, thumb, views, published}){
  const card = document.createElement('div'); card.className = 'card-video';
  card.innerHTML = `
    <iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
    <div class="card-body">
      <div class="card-title">${title}</div>
      <div class="card-meta">${views ? views.toLocaleString() + ' views' : ''} • ${new Date(published).toLocaleDateString()}</div>
    </div>`;
  // add hover animation via GSAP on enter
  card.addEventListener('mouseenter', () => {
    gsap.to(card, { scale: 1.02, boxShadow: '0 18px 40px rgba(255,43,77,0.12)', duration: 0.28 });
  });
  card.addEventListener('mouseleave', () => {
    gsap.to(card, { scale: 1, boxShadow: '0 0 0 rgba(0,0,0,0)', duration: 0.28 });
  });
  return card;
}

/* ---------- App logic ---------- */
async function init(){
  try {
    // 1) fetch channel info
    const ch = await apiFetch('channel');
    if (!ch.items || !ch.items.length) throw new Error('No channel found');
    const channel = ch.items[0];
    const sn = channel.snippet;
    const stats = channel.statistics;
    const branding = channel.brandingSettings || {};

    // fill header
    document.getElementById('channelTitle').innerText = sn.title;
    document.getElementById('channelDesc').innerText = (sn.description || '').slice(0, 180);
    document.getElementById('avatar').src = sn.thumbnails?.high?.url || '';
    document.getElementById('subs').textContent = Number(stats.subscriberCount || 0).toLocaleString();
    document.getElementById('views').textContent = Number(stats.viewCount || 0).toLocaleString();
    document.getElementById('countVideos').textContent = Number(stats.videoCount || 0).toLocaleString();
    document.getElementById('subscribeBtn').href = `https://www.youtube.com/channel/${CHANNEL_ID}?sub_confirmation=1`;

    // banner
    if (branding.image && branding.image.bannerExternalUrl){
      document.getElementById('banner').style.backgroundImage = `url(${branding.image.bannerExternalUrl})`;
      document.getElementById('banner').style.backgroundSize = 'cover';
      document.getElementById('banner').style.backgroundPosition = 'center';
    }

    // animate counters
    animateCount(document.getElementById('subs'), Number(stats.subscriberCount||0));
    animateCount(document.getElementById('views'), Number(stats.viewCount||0));
    animateCount(document.getElementById('countVideos'), Number(stats.videoCount||0));

    // 2) get uploads playlist id
    const uploadsPlaylist = channel.contentDetails.relatedPlaylists.uploads;
    // load all uploads (will paginate)
    const allIds = [];
    async function fetchPlaylistPage(pageToken = ''){
      const data = await apiFetch('uploads', { playlistId: uploadsPlaylist, pageToken });
      if (data.items) for (const it of data.items){
        if (it.snippet && it.snippet.resourceId && it.snippet.resourceId.videoId){
          allIds.push({ id: it.snippet.resourceId.videoId, title: it.snippet.title, published: it.snippet.publishedAt, thumb: it.snippet.thumbnails?.high?.url });
        }
      }
      if (data.nextPageToken) await fetchPlaylistPage(data.nextPageToken);
    }
    await fetchPlaylistPage();

    // batch get stats for video ids (max 50 per call)
    const videoIds = allIds.map(v=>v.id);
    const statsMap = {};
    for (let i=0;i<videoIds.length;i+=50){
      const batch = videoIds.slice(i, i+50).join(',');
      const vresp = await apiFetch('videos', { ids: batch });
      if (vresp.items) vresp.items.forEach(v=>{
        statsMap[v.id] = { viewCount: Number(v.statistics.viewCount||0), duration: v.contentDetails?.duration };
      });
    }

    // combine data
    const enriched = allIds.map(v => ({ id: v.id, title: v.title, published: v.published, thumb: v.thumb, views: statsMap[v.id]?.viewCount||0 }));

    // Popular: top 8 by views
    const popular = [...enriched].sort((a,b)=>b.views - a.views).slice(0,8);
    const popularGrid = document.getElementById('popularGrid');
    popular.forEach(p => popularGrid.appendChild(createVideoCard(p)));

    // Latest: first 12
    const latestGrid = document.getElementById('latestGrid');
    enriched.slice(0,12).forEach(p => latestGrid.appendChild(createVideoCard(p)));

    // All videos route grid
    const allGrid = document.getElementById('allVideosGrid');
    enriched.forEach(p => allGrid.appendChild(createVideoCard(p)));

    // Past live streams (search eventType=completed)
    const pastLive = await apiFetch('searchLive', { eventType: 'completed' });
    const pastLiveGrid = document.getElementById('pastLiveGrid');
    if (pastLive.items && pastLive.items.length){
      // fetch stats for those ids
      const ids = pastLive.items.map(x => x.id.videoId).filter(Boolean).join(',');
      const vdet = ids ? await apiFetch('videos', { ids }) : null;
      const mapDet = {};
      if (vdet && vdet.items) vdet.items.forEach(v=>mapDet[v.id] = { views: Number(v.statistics.viewCount||0), published: v.snippet.publishedAt });
      pastLive.items.forEach(it=>{
        const id = it.id.videoId;
        if (!id) return;
        const p = { id, title: it.snippet.title, thumb: it.snippet.thumbnails?.high?.url, views: mapDet[id]?.views || 0, published: it.snippet.publishedAt };
        pastLiveGrid.appendChild(createVideoCard(p));
      });
    }

    // Live now detection
    const nowLive = await apiFetch('searchLive', { eventType: 'live' });
    if (nowLive.items && nowLive.items.length){
      const id = nowLive.items[0].id.videoId;
      const liveContainer = document.getElementById('liveContainer');
      liveContainer.innerHTML = `<div class="live-badge">LIVE</div><iframe src="https://www.youtube.com/embed/${id}?autoplay=1" style="width:100%;height:480px;border:0;border-radius:12px;overflow:hidden"></iframe>`;
      // route to live automatically
      showRoute('live');
    } else {
      // hide live container if not live
      document.getElementById('liveContainer').innerHTML = `<div class="center muted">Not live currently</div>`;
    }

    // Playlists listing
    const playlistsRes = await apiFetch('playlists', {});
    if (playlistsRes && playlistsRes.items){
      const pg = document.getElementById('playlistGrid');
      playlistsRes.items.forEach(pl => {
        const card = document.createElement('div'); card.className = 'card-video';
        card.innerHTML = `<div style="padding:14px"><h3>${pl.snippet.title}</h3><p class="muted">${pl.contentDetails.itemCount} videos</p></div>`;
        pg.appendChild(card);
      });
    }

    // Posts: YouTube API doesn't expose community posts publicly via Data API in many cases.
    document.getElementById('postsList').innerHTML = '<p class="muted">Community posts may not be available via API. You can add manual posts here or use an RSS/webhook to pull updates.</p>';

    // reveal animation for cards
    gsap.registerPlugin(window.ScrollTrigger);
    gsap.utils.toArray('.animated-grid .card-video').forEach((el, i) => {
      gsap.fromTo(el, {opacity:0, y:20}, {
        opacity:1, y:0, duration:0.6, delay: i*0.06,
        scrollTrigger:{trigger:el, start:'top 90%'}
      });
    });

  } catch (err) {
    console.error('App init error', err);
    document.getElementById('latestGrid').innerHTML = `<div class="muted">Error loading data: ${err.message}</div>`;
  }
}

/* ---------- API mapping for proxy ---------- */
/* When using proxy, it expects the serverless function to handle 'op' values:
   - channel    -> returns channels.list (with contentDetails)
   - uploads    -> returns playlistItems
   - videos     -> returns videos.list
   - searchLive -> returns search (eventType live/completed)
   - playlists  -> returns playlists.list for channel
*/

init();

/* small helpers for proxies without playlists param */
