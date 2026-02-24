/**
 * File validation utilities
 *
 * Validates file uploads for type, size, and security.
 */

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/**
 * Allowed file extensions
 */
export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

/**
 * Maximum file size (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  details?: string;
}

/**
 * Validate image file
 *
 * Checks:
 * - File exists
 * - File type is allowed
 * - File size is within limits
 * - Filename is safe
 */
export function validateImageFile(file: File): FileValidationResult {
  // Check if file exists
  if (!file || !(file instanceof File)) {
    return {
      valid: false,
      error: "No file provided",
      details: "File object is required",
    };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: "Invalid file type",
      details: `Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
    return {
      valid: false,
      error: "File too large",
      details: `File is ${sizeMB}MB, maximum is ${maxMB}MB`,
    };
  }

  // Check minimum size (avoid empty files)
  if (file.size < 100) {
    return {
      valid: false,
      error: "File too small",
      details: "File appears to be empty or corrupted",
    };
  }

  // Check filename length
  if (file.name.length > 255) {
    return {
      valid: false,
      error: "Filename too long",
      details: "Filename must be less than 255 characters",
    };
  }

  // Check for file extension
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: "Invalid file extension",
      details: `Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename for safe storage
 *
 * Removes or replaces potentially dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  // Get file extension
  const parts = filename.split(".");
  const ext = parts.length > 1 ? parts.pop() : "";
  const name = parts.join(".");

  // Remove or replace dangerous characters
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_") // Replace non-alphanumeric with underscore
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
    .substring(0, 200); // Limit length

  // Return with extension
  return ext ? `${sanitized}.${ext.toLowerCase()}` : sanitized;
}

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const sanitized = sanitizeFilename(originalFilename);

  // Get extension
  const parts = sanitized.split(".");
  const ext = parts.length > 1 ? parts.pop() : "jpg";
  const name = parts.join(".");

  return `${timestamp}-${random}-${name}.${ext}`;
}

/**
 * Validate file type matches extension
 * Prevents mime type spoofing
 */
export function validateFileTypeMatchesExtension(file: File): boolean {
  const extension = file.name.toLowerCase().split(".").pop();

  const typeToExtension: Record<string, string[]> = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/jpg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
    "image/gif": ["gif"],
  };

  const expectedExtensions = typeToExtension[file.type];
  if (!expectedExtensions) return false;

  return expectedExtensions.includes(extension || "");
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
