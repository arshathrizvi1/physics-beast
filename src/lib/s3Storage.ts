/**
 * Direct Cloudflare R2 Streaming Uploader.
 * Stores PDFs and resources with zero egress fees and native same-origin CORS.
 */
export async function uploadToR2(
  file: File,
  folder: string = "course-resources",
  onProgress?: (percent: number) => void
): Promise<string> {
  const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  const key = `${folder}/${timestamp}_${cleanFilename}`;
  
  const uploadUrl = `/api/r2-media/${encodeURIComponent(key)}`;

  if (onProgress) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
      if (xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Direct R2 upload failed with status ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error during R2 upload"));
      xhr.send(file);
    });
  } else {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/pdf",
      },
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Direct R2 upload failed with status ${res.status}`);
    }
  }

  const host = typeof window !== 'undefined' ? window.location.origin : 'https://brillliantacademy.site';
  return `${host}/api/r2-media/${encodeURIComponent(key)}`;
}

/**
 * Uploads a file to Amazon S3 or Cloudflare R2.
 * PDFs are automatically routed to Cloudflare R2 for zero-egress, high-speed, CORS-free delivery.
 */
export async function uploadToS3(
  file: File, 
  folder: string = "uploads", 
  forceBunny: boolean = false,
  onProgress?: (percent: number) => void
): Promise<string> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  
  // Route all PDFs directly to Cloudflare R2
  if (isPdf) {
    return await uploadToR2(file, folder, onProgress);
  }

  const apiUrl = forceBunny ? "/api/bunny/s3-upload" : "/api/s3/upload";
  
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder: folder,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || ("S3 Presigned API failed with status " + res.status));
  }

  const { presignedUrl, publicUrl } = await res.json();

  if (onProgress) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      if (xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Direct S3 upload failed with status ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error during S3 upload"));
      xhr.send(file);
    });
  } else {
    // Upload file directly from browser to S3 via presigned URL
    const uploadRes = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error("Direct S3 upload failed with status " + uploadRes.status);
    }
  }

  return publicUrl;
}

/**
 * Intelligent file uploader:
 * - PDFs (.pdf) -> Stored strictly in Cloudflare R2.
 * - Videos (.mp4, .webm, .mov, etc.) -> Stored in Amazon S3 / R2.
 * - Other files (images, avatar, profiles) -> Stored in Firebase, but automatically fallback to S3/R2 if Firebase limits are exceeded.
 */
export async function uploadSmartFile(
  file: File,
  firebaseUploadFn?: (file: File) => Promise<string>,
  folder: string = "media"
): Promise<string> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    console.log("[SmartStorage] File " + file.name + " is PDF. Routing strictly to Cloudflare R2...");
    return await uploadToR2(file, folder);
  }

  const isVideo =
    file.type.startsWith("video/") ||
    file.name.toLowerCase().endsWith(".mp4") ||
    file.name.toLowerCase().endsWith(".mov") ||
    file.name.toLowerCase().endsWith(".mkv");

  if (isVideo) {
    console.log("[SmartStorage] File " + file.name + " is Video. Routing strictly to Amazon S3...");
    return await uploadToS3(file, folder);
  }

  // Non-video/PDF files try Firebase first (if function provided)
  if (firebaseUploadFn) {
    try {
      console.log("[SmartStorage] Attempting Firebase Storage upload for " + file.name + "...");
      return await firebaseUploadFn(file);
    } catch (firebaseErr: any) {
      console.warn("[SmartStorage] Firebase upload failed: " + firebaseErr?.message + ". Falling back to Cloudflare R2...");
      return await uploadToR2(file, folder);
    }
  }

  return await uploadToR2(file, folder);
}
