// YouTube Data API v3: lists the channel's live-stream recordings (where sermons are saved).
const UPLOADS_PLAYLIST = 'UU1Svz8uLW3raCDDP9I1eg_A'; // channel UC1Svz8uLW3raCDDP9I1eg_A, "UC" -> "UU"
const API = 'https://www.googleapis.com/youtube/v3/';

async function getJson(url, fetchImpl) {
  const res = await fetchImpl(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body.error && body.error.message) || res.statusText;
    throw new Error(`YouTube API error (HTTP ${res.status}): ${msg}`);
  }
  return body;
}

// Returns completed live streams and any stream that is live right now. Upcoming/scheduled
// streams and regular uploads are left out.
async function listStreams(key, fetchImpl = fetch) {
  const ids = [];
  let pageToken = '';
  do {
    const url = `${API}playlistItems?part=contentDetails&maxResults=50&playlistId=${UPLOADS_PLAYLIST}`
      + `&key=${encodeURIComponent(key)}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const page = await getJson(url, fetchImpl);
    for (const item of page.items || []) ids.push(item.contentDetails.videoId);
    pageToken = page.nextPageToken || '';
  } while (pageToken);

  const streams = [];
  for (let i = 0; i < ids.length; i += 50) {
    const url = `${API}videos?part=snippet,liveStreamingDetails&id=${ids.slice(i, i + 50).join(',')}`
      + `&key=${encodeURIComponent(key)}`;
    const page = await getJson(url, fetchImpl);
    for (const v of page.items || []) {
      const live = v.snippet.liveBroadcastContent === 'live';
      const details = v.liveStreamingDetails;
      if (!details || !(details.actualEndTime || live)) continue;
      streams.push({
        videoId: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        actualStartTime: details.actualStartTime || null,
        live,
      });
    }
  }
  return streams;
}

module.exports = { listStreams, UPLOADS_PLAYLIST };
