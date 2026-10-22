// Extracts the text of a PDF's first page, one line per row of text.

async function firstPageText(buffer) {
  const { getDocumentProxy } = await import('unpdf'); // unpdf is ES-module only
  const pdf = await getDocumentProxy(new Uint8Array(buffer), { verbosity: 0 });
  const page = await pdf.getPage(1);
  const { items } = await page.getTextContent();

  // Items on the same row share a y position; start a new line when it changes.
  const lines = [];
  let y = null;
  for (const item of items) {
    if (!('str' in item)) continue;
    const itemY = Math.round(item.transform[5]);
    if (y === null || itemY !== y) lines.push('');
    lines[lines.length - 1] += item.str;
    y = itemY;
  }
  await (pdf.loadingTask ? pdf.loadingTask.destroy() : pdf.cleanup());
  return lines.map((l) => l.trim()).filter(Boolean).join('\n');
}

module.exports = { firstPageText };
