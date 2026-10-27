// OneDrive: lists a series subfolder inside a public OneDrive share ("Anyone with the link").
// Microsoft's documented API needs a signed-in account even for public shares, so this does what
// the OneDrive website does for a signed-out visitor: it gets a short-lived guest token
// ("badger" token) and reads the share with it. This is not a documented API, so Microsoft could
// change it; if that happens the job fails with a clear error and the site keeps its last data.
const TOKEN_URL = 'https://api-badgerp.svc.ms/v1.0/token';
const ONEDRIVE_WEB_APP = '5cbed6ac-a083-4e14-b191-b4ba07653de2'; // the OneDrive website's public app id
const API = 'https://my.microsoftpersonalcontent.com/_api/v2.0';

const isOneDriveLink = (url) => /^https:\/\/(1drv\.ms|onedrive\.live\.com)\//.test(url);

// The API names a share by its link: "u!" + the link in URL-safe base64.
const shareId = (link) => `u!${Buffer.from(link).toString('base64').replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-')}`;

// A link a signed-out visitor can open: the share link plus the item to show. Files open in
// OneDrive's viewer, folders as a file list. (The plain webUrl from the API asks visitors to sign in.)
const visitorUrl = (link, driveId, itemId) => `https://onedrive.live.com/?redeem=${
  encodeURIComponent(Buffer.from(link).toString('base64').replace(/=+$/, ''))}&id=${encodeURIComponent(itemId)}&cid=${driveId}`;

// One reader per job run, so the guest token and the share's top folder are fetched only once.
function oneDrive(fetchImpl = fetch) {
  let token = null;
  const shares = new Map();

  async function getJson(url, what, hint = '') {
    if (!token) {
      const res = await fetchImpl(TOKEN_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appId: ONEDRIVE_WEB_APP }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.token) {
        throw new Error(`Couldn't get a OneDrive guest token (HTTP ${res.status}). Microsoft may have changed how public shares work; see "OneDrive" in README.md.`);
      }
      token = body.token;
    }
    const res = await fetchImpl(url, { headers: { Authorization: `Badger ${token}`, Prefer: 'autoredeem' } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (body.error && body.error.message) || res.statusText;
      throw new Error(`Couldn't list ${what} (HTTP ${res.status}): ${msg}.${hint}`);
    }
    return body;
  }

  // All children of a folder, following "next page" links.
  async function children(url, what, hint) {
    const items = [];
    for (let next = url; next;) {
      const body = await getJson(next, what, hint);
      items.push(...(body.value || []));
      next = body['@odata.nextLink'];
    }
    return items;
  }

  async function openShare(link, label) {
    if (!shares.has(link)) {
      const hint = ' Is the OneDrive link still shared as "Anyone with the link can view"?';
      const root = await getJson(`${API}/shares/${shareId(link)}/driveItem`, `the OneDrive share for ${label}`, hint);
      const driveId = root.parentReference && root.parentReference.driveId;
      const items = await children(`${API}/drives/${driveId}/items/${encodeURIComponent(root.id)}/children`, `the OneDrive share for ${label}`, hint);
      shares.set(link, { driveId, items });
    }
    return shares.get(link);
  }

  // Returns the subfolder's link for visitors, and its files in the same shape as drive.js
  // plus `url` (for visitors) and `downloadUrl` (temporary, for reading notes PDFs during this run).
  async function listFolder(link, subfolder, label = subfolder) {
    const { driveId, items } = await openShare(link, label);
    const folder = items.find((i) => i.folder && i.name.trim().toLowerCase() === String(subfolder).trim().toLowerCase());
    if (!folder) {
      throw new Error(`Couldn't find the folder "${subfolder}" for ${label} in the OneDrive share. Was it renamed? `
        + 'Fix "subfolder" in data/series.json.');
    }
    const files = await children(`${API}/drives/${driveId}/items/${encodeURIComponent(folder.id)}/children`, `the OneDrive folder for ${label}`);
    return {
      folderUrl: visitorUrl(link, driveId, folder.id),
      files: files.filter((f) => f.file).map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.file.mimeType,
        modifiedTime: f.lastModifiedDateTime,
        url: visitorUrl(link, driveId, f.id),
        downloadUrl: f['@content.downloadUrl'],
      })),
    };
  }

  return { listFolder };
}

async function downloadUrl(url, fetchImpl = fetch) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Couldn't download from OneDrive (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

module.exports = { isOneDriveLink, oneDrive, downloadUrl };
