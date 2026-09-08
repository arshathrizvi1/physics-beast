/**
 * Uploads a file to Amazon S3 bucket via server presigned URL.
 * Strictly used for Videos, PDFs, and auto-fallback storage.
 */
export async function uploadToS3(file: File, folder: string = "uploads"): Promise<string> {
  const res = await fetch("/api/s3/upload", {
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

  return publicUrl;
}

/**
 * Intelligent file uploader:
 * - Videos (.mp4, .webm, .mov, etc.) & PDFs (.pdf) -> Stored strictly in Amazon S3.
 * - Other files (images, avatar, profiles) -> Stored in Firebase, but automatically fallback to S3 if Firebase limits/quotas are exceeded.
 */
export async function uploadSmartFile(
  file: File,
  firebaseUploadFn?: (file: File) => Promise<string>,
  folder: string = "media"
): Promise<string> {
  const isVideoOrPdf =
    file.type.startsWith("video/") ||
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf") ||
    file.name.toLowerCase().endsWith(".mp4") ||
    file.name.toLowerCase().endsWith(".mov") ||
    file.name.toLowerCase().endsWith(".mkv");

  // Rule 1: Videos and PDFs go straight to Amazon S3
  if (isVideoOrPdf) {
    console.log("[SmartStorage] File " + file.name + " is Video/PDF. Routing strictly to Amazon S3...");
    return await uploadToS3(file, folder);
  }

  // Rule 2: Non-video/PDF files try Firebase first (if function provided)
  if (firebaseUploadFn) {
    try {
      console.log("[SmartStorage] Attempting Firebase Storage upload for " + file.name + "...");
      return await firebaseUploadFn(file);
    } catch (firebaseErr: any) {
      console.warn("[SmartStorage] Firebase upload failed: " + firebaseErr?.message + ". Falling back to Amazon S3...");
      return await uploadToS3(file, folder);
    }
  }

  // Fallback default
  return await uploadToS3(file, folder);
}
