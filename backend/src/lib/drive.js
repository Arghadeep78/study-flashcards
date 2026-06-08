// Helpers for turning a Google Drive share link into a direct-download URL and
// fetching the PDF bytes to local disk.

// Extracts the Drive file id from the common share-link shapes:
//   https://drive.google.com/file/d/<ID>/view?usp=sharing
//   https://drive.google.com/open?id=<ID>
//   https://drive.google.com/uc?id=<ID>&export=download
export function extractDriveId(link) {
  if (!link || typeof link !== 'string') return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];
  for (const re of patterns) {
    const m = link.match(re);
    if (m) return m[1];
  }
  return null;
}

export function driveDownloadUrl(id) {
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

// Downloads the PDF bytes for a Drive file id. Handles Drive's "large file"
// confirmation interstitial by following the confirm token when present.
export async function fetchDrivePdf(id) {
  const url = driveDownloadUrl(id);
  let res = await fetch(url, { redirect: 'follow' });

  const contentType = res.headers.get('content-type') || '';
  // Small/normal files come back as the PDF directly. Large files return an
  // HTML virus-scan warning page that contains a confirm token.
  if (contentType.includes('text/html')) {
    const html = await res.text();
    const tokenMatch = html.match(/confirm=([0-9A-Za-z_-]+)/);
    if (tokenMatch) {
      const confirmUrl = `${url}&confirm=${tokenMatch[1]}`;
      res = await fetch(confirmUrl, { redirect: 'follow' });
    } else {
      throw new Error('Could not download from Drive — make sure sharing is set to "Anyone with the link".');
    }
  }

  if (!res.ok) throw new Error(`Drive download failed (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());

  // Sanity check: PDFs start with "%PDF".
  if (buf.subarray(0, 4).toString() !== '%PDF') {
    throw new Error('Downloaded file is not a PDF — check the link and its sharing settings.');
  }
  return buf;
}
