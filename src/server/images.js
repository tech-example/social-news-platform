import "server-only";
import sharp from "sharp";
import { getAdminClient } from "@/server/admin-client";
import { LIMITS } from "@/lib/constants";

/**
 * Inspect magic bytes / file signature to verify the genuine image format.
 * Returns the detected format string ('jpeg', 'png', 'webp', 'gif', 'avif') or null.
 * Never trusts client MIME types or file extensions.
 */
export function detectImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // GIF: GIF87a or GIF89a (47 49 46 38 37/39 61)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "gif";
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  // AVIF: ISOBMFF ftyp box with "avif", "avis", or compatible brands
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    const brand = buffer.toString("ascii", 8, 12);
    if (["avif", "avis", "mif1"].includes(brand)) {
      return "avif";
    }
    const headerString = buffer.slice(8, Math.min(buffer.length, 64)).toString("ascii");
    if (headerString.includes("avif") || headerString.includes("avis")) {
      return "avif";
    }
  }

  return null;
}

/**
 * Validates, compresses with sharp, and uploads full and thumbnail versions to Supabase Storage.
 *
 * @param {File|Blob|Buffer} fileInput Raw file from client
 * @param {string} userId User UUID
 * @returns {Promise<{ fullUrl: string, thumbUrl: string, isAnimated: boolean, format: string }>}
 */
export async function processAndUploadPostImage(fileInput, userId) {
  if (!fileInput) {
    throw new Error("No image file provided.");
  }

  let buffer;
  let clientSize = 0;
  if (typeof fileInput.arrayBuffer === "function") {
    clientSize = fileInput.size;
    buffer = Buffer.from(await fileInput.arrayBuffer());
  } else if (Buffer.isBuffer(fileInput)) {
    buffer = fileInput;
    clientSize = buffer.length;
  } else {
    throw new Error("Invalid image input format.");
  }

  if (!buffer || buffer.length === 0) {
    throw new Error("The uploaded image file is empty.");
  }

  // 1. Authoritative Magic Bytes Detection
  const magicFormat = detectImageMagicBytes(buffer);
  const supportedFormats = ["jpeg", "png", "webp", "gif", "avif"];

  if (!magicFormat || !supportedFormats.includes(magicFormat)) {
    throw new Error(
      "Invalid image format. Supported formats are JPEG, PNG, WebP, GIF, and AVIF."
    );
  }

  // 2. Size Validation (5 MB static, 10 MB for GIF)
  const maxBytes =
    magicFormat === "gif"
      ? LIMITS.MAX_UPLOAD_GIF_BYTES
      : LIMITS.MAX_UPLOAD_IMAGE_BYTES;

  if (buffer.length > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(
      `File exceeds maximum upload size of ${maxMb} MB for ${magicFormat.toUpperCase()}.`
    );
  }

  // 3. Sharp Header & Format Decoding
  let metadata;
  try {
    metadata = await sharp(buffer, { animated: true }).metadata();
  } catch (err) {
    console.error("Sharp image decoding error:", err);
    throw new Error("Could not decode image data. The file appears to be corrupted.");
  }

  if (!metadata || !metadata.format) {
    throw new Error("Could not determine image structure.");
  }

  const isAnimated = metadata.format === "gif" && (metadata.pages || 1) > 1;

  // 4. Server-Side Compression to WebP (Dual Size: Full 2048px, Thumb 640px)
  let fullBuffer;
  let thumbBuffer;

  try {
    if (isAnimated) {
      // Animated WebP:
      // GIFs use 8-bit indexed palettes and dithering patterns that degrade severely ("แตก")
      // under lossy DCT compression (e.g. 300KB -> 63KB). Using lossless WebP (or high-fidelity
      // near-lossless for very large files) preserves 100% pixel sharpness, clean transparency,
      // and crisp edges with zero artifacting, while still optimizing file size.
      const isVeryLargeGif = buffer.length > 4 * 1024 * 1024;
      const fullOptions = isVeryLargeGif
        ? { nearLossless: true, quality: 92, effort: 4, loop: 0 }
        : { lossless: true, effort: 4, loop: 0 };
      const thumbOptions = isVeryLargeGif
        ? { nearLossless: true, quality: 88, effort: 4, loop: 0 }
        : { lossless: true, effort: 4, loop: 0 };

      fullBuffer = await sharp(buffer, { animated: true })
        .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
        .webp(fullOptions)
        .toBuffer();

      thumbBuffer = await sharp(buffer, { animated: true })
        .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
        .webp(thumbOptions)
        .toBuffer();
    } else {
      // Static image: auto-rotate per EXIF orientation, strip metadata, resize to max 2048px and 640px
      fullBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85, effort: 4, smartSubsample: true })
        .toBuffer();

      thumbBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, effort: 4, smartSubsample: true })
        .toBuffer();
    }
  } catch (compErr) {
    console.error("Compression processing error:", compErr);
    throw new Error("Failed to process and compress image.");
  }

  // 5. Server-side Supabase Storage Upload
  const adminSupabase = getAdminClient();
  const fileKeyBase = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const fullPath = `${fileKeyBase}-full.webp`;
  const thumbPath = `${fileKeyBase}-thumb.webp`;

  // Ensure 'media' bucket exists
  const { data: buckets } = await adminSupabase.storage.listBuckets();
  const mediaBucket = buckets?.find((b) => b.name === "media");
  if (!mediaBucket) {
    await adminSupabase.storage.createBucket("media", {
      public: true,
      fileSizeLimit: LIMITS.MAX_UPLOAD_GIF_BYTES,
    });
  }

  // Upload Full Version
  const { error: fullError } = await adminSupabase.storage
    .from("media")
    .upload(fullPath, fullBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (fullError) {
    console.error("Storage upload full image error:", fullError);
    throw new Error("Failed to store optimized image.");
  }

  // Upload Thumbnail Version
  const { error: thumbError } = await adminSupabase.storage
    .from("media")
    .upload(thumbPath, thumbBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (thumbError) {
    console.error("Storage upload thumbnail image error:", thumbError);
    // Best effort cleanup of fullPath on failure
    await adminSupabase.storage.from("media").remove([fullPath]);
    throw new Error("Failed to store image thumbnail.");
  }

  const { data: fullData } = adminSupabase.storage.from("media").getPublicUrl(fullPath);
  const { data: thumbData } = adminSupabase.storage.from("media").getPublicUrl(thumbPath);

  return {
    fullUrl: fullData.publicUrl,
    thumbUrl: thumbData.publicUrl,
    isAnimated,
    format: metadata.format,
  };
}
