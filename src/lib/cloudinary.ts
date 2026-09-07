export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = "e0yy6czx";
  const uploadPreset = "brilliant_academy";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData?.error?.message || `Upload failed with status ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  return data.secure_url || data.url;
}

export function formatPdfViewerUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  // If it's a Google Drive link, convert to embedded preview format
  if (trimmed.includes("drive.google.com")) {
    const fileIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }

  // If it's an external PDF URL (like Cloudinary or standard web link),
  // use Google Docs Viewer to avoid browser blocking and X-Frame-Options headers
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(trimmed)}&embedded=true`;
  }

  return `${trimmed}#toolbar=0`;
}
