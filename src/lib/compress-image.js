import imageCompression from "browser-image-compression";

/**
 * Compress an image file client-side before uploading.
 * Converts to WebP when supported by the browser, with fallback to JPEG.
 *
 * @param {File} file - The original image file
 * @param {object} [options] - Override defaults
 * @param {number} [options.maxSizeMB=1] - Target maximum size in MB
 * @param {number} [options.maxWidthOrHeight=1920] - Max dimension in pixels
 * @param {number} [options.quality=0.8] - Compression quality 0-1
 * @returns {Promise<{file: File, originalSize: number, compressedSize: number}>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxSizeMB = 1,
    maxWidthOrHeight = 1920,
    quality = 0.8,
  } = options;

  const originalSize = file.size;

  // Skip compression for tiny files (< 100KB) or GIFs (animation)
  if (originalSize < 100 * 1024 || file.type === "image/gif") {
    return { file, originalSize, compressedSize: originalSize };
  }

  // Determine output type: prefer WebP, fallback to JPEG
  const supportsWebP = await checkWebPSupport();
  const fileType = supportsWebP ? "image/webp" : "image/jpeg";

  const compressed = await imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight,
    initialQuality: quality,
    useWebWorker: true,
    fileType,
  });

  // Only use compressed version if it's actually smaller
  if (compressed.size >= originalSize) {
    return { file, originalSize, compressedSize: originalSize };
  }

  // Rename file to reflect new extension
  const ext = supportsWebP ? ".webp" : ".jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const compressedFile = new File([compressed], `${baseName}${ext}`, {
    type: fileType,
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    originalSize,
    compressedSize: compressedFile.size,
  };
}

/**
 * Check if the browser supports WebP encoding via Canvas.
 */
let _webpSupported = null;
function checkWebPSupport() {
  if (_webpSupported !== null) return Promise.resolve(_webpSupported);
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL("image/webp");
    _webpSupported = dataUrl.startsWith("data:image/webp");
    resolve(_webpSupported);
  });
}

/**
 * Format file size to human-readable string.
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
