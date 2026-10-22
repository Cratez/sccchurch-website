// Google Drive API v3: lists a public series folder and downloads notes PDFs.
// Works with just an API key because the folders are shared as "Anyone with the link can view".
const API = 'https://www.googleapis.com/drive/v3/files';

const folderId = (folderUrl) => {
  const m = /folders\/([\w-]+)/.exec(folderUrl);
  if (!m) throw new Error(`Not a Drive folder link: ${folderUrl}`);
  return m[1];
};

async function listFolder(id, key, fetchImpl = fetch, label = id) {
  const files = [];
  let pageToken = '';
  do {
    const q = encodeURIComponent(`'${id}' in parents and trashed=false`);
    const url = `${API}?q=${q}&fields=nextPageToken,files(id,name,mimeType,modifiedTime)&pageSize=1000`
      + `&key=${encodeURIComponent(key)}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetchImpl(url);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (body.error && body.error.message) || res.statusText;
      const hint = res.status === 403 || res.status === 404
        ? ' Is the folder shared as "Anyone with the link can view"?' : '';
      throw new Error(`Couldn't list the Drive folder for ${label} (HTTP ${res.status}): ${msg}.${hint}`);
    }
    files.push(...(body.files || []));
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return files;
}

async function download(fileId, key, fetchImpl = fetch) {
  const res = await fetchImpl(`${API}/${fileId}?alt=media&key=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`Couldn't download Drive file ${fileId} (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

module.exports = { folderId, listFolder, download };
