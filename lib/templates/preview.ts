import JSZip from 'jszip';

const PREVIEW_IMAGE_PATH = 'preview/prvimage.png';

export async function extractTemplatePreviewBytes(data: ArrayBuffer | Uint8Array) {
  try {
    const zip = await JSZip.loadAsync(data);
    const previewEntry = Object.values(zip.files).find(
      (entry) => !entry.dir && entry.name.toLowerCase() === PREVIEW_IMAGE_PATH
    );

    if (!previewEntry) return null;
    return previewEntry.async('uint8array');
  } catch {
    return null;
  }
}

export async function extractTemplatePreviewObjectUrl(data: ArrayBuffer) {
  const bytes = await extractTemplatePreviewBytes(data);
  if (!bytes) return undefined;

  const blob = new Blob([bytes.slice()], { type: 'image/png' });
  return URL.createObjectURL(blob);
}
