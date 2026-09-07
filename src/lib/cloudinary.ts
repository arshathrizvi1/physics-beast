export async function uploadToCloudinary(file: File, retries = 3): Promise<string> {
  const cloudName = "e0yy6czx";
  const uploadPreset = "brilliant_academy";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
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
        
        // Check if it's a transient error that warrants a retry
        const isTransient = res.status === 420 || res.status === 429 || res.status >= 500 || 
                            message.includes("Slow Down") || message.includes("Processing Capacity");
                            
        if (isTransient && attempt < retries) {
          throw new Error(`TransientError: ${message}`);
        } else {
          throw new Error(message); // Throw normal error to break out or fail finally
        }
      }

      const data = await res.json();
      return data.secure_url || data.url;
    } catch (error: any) {
      if (!error.message.startsWith("TransientError:") && attempt === retries) {
        throw error;
      }
      
      if (error.message.startsWith("TransientError:") && attempt < retries) {
        // Exponential backoff: 2s, 4s, 8s...
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Cloudinary upload transient error: ${error.message}. Retrying in ${delay}ms... (Attempt ${attempt} of ${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error("Upload failed after retries");
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
