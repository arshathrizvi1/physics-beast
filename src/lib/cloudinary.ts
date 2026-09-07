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
  // If it's a Google Drive link, convert to embedded preview format
  if (url.includes("drive.google.com")) {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }
  return `${url}#toolbar=0`;
}
