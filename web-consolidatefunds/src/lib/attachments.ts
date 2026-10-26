import type { DocumentFile } from "./types";

/**
 * Prepares uploaded documents as email attachments.
 *
 * - Images are resized (max 1600px longest side) and re-encoded as JPEG q~0.75.
 * - Total payload is capped so the request stays under Vercel's 4 MB+ body limit.
 * - Files live only in memory for this session (they are never written to localStorage);
 *   if the applicant reloads before submitting, those files are reported as skipped
 *   instead of failing the submission.
 */

export interface PreparedAttachment {
  filename: string;
  contentType: string;
  base64: string;
  size: number; // decoded bytes
}

export interface SkippedFile {
  name: string;
  reason: string;
}

export interface PreparedPackage {
  attachments: PreparedAttachment[];
  skipped: SkippedFile[];
}

/** Registry of the actual File objects behind the draft's DocumentFile metadata. */
export const docFiles = new Map<string, File>();

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.75;
/** Total base64 characters allowed across all attachments (leaves headroom under the 4.5 MB request limit). */
const MAX_TOTAL_BASE64 = 3_800_000;

const readBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result ?? "");
      resolve(s.slice(s.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });

async function decodeImage(file: Blob): Promise<{ width: number; height: number; source: CanvasImageSource } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { width: bmp.width, height: bmp.height, source: bmp };
    } catch {
      /* fall through to <img> decoding */
    }
  }
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("decode failed"));
        el.src = url;
      });
      return { width: img.naturalWidth, height: img.naturalHeight, source: img };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

/** Returns a compressed JPEG blob, or null when the original should be used as-is. */
async function compressImage(file: File): Promise<Blob | null> {
  try {
    if (file.size <= 300_000) return null; // already small — keep the original bytes
    const src = await decodeImage(file);
    if (!src || !src.width || !src.height) return null;
    const scale = Math.min(1, MAX_WIDTH / Math.max(src.width, src.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(src.width * scale));
    canvas.height = Math.max(1, Math.round(src.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(src.source, 0, 0, canvas.width, canvas.height);
    if (typeof (src.source as ImageBitmap).close === "function") (src.source as ImageBitmap).close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY));
    return blob && blob.size < file.size ? blob : null;
  } catch {
    return null;
  }
}

function inferType(name: string, type: string): string {
  if (type) return type;
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "heic" || ext === "heif") return "image/heic";
  if (ext === "csv") return "text/csv";
  if (ext === "txt" || ext === "md") return "text/plain";
  return "application/octet-stream";
}

const isImage = (file: File) =>
  /^image\//.test(file.type) || /\.(jpe?g|png|webp|heic|heif|bmp)$/i.test(file.name);

/** Compress/encode every uploaded document and fit as many as possible into the size budget. */
export async function prepareAttachments(docs: DocumentFile[]): Promise<PreparedPackage> {
  const attachments: PreparedAttachment[] = [];
  const skipped: SkippedFile[] = [];
  let total = 0;

  for (const doc of docs) {
    const file = docFiles.get(doc.id);
    if (!file) {
      skipped.push({ name: doc.name, reason: "file content unavailable" });
      continue;
    }
    const type = inferType(doc.name, file.type);
    if (!/^(application\/pdf|image\/|text\/)/.test(type)) {
      skipped.push({ name: doc.name, reason: "file type not supported for email attachment" });
      continue;
    }
    let blob: Blob = file;
    let contentType = type;
    if (isImage(file) && type !== "image/gif") {
      const compressed = await compressImage(file);
      if (compressed) {
        blob = compressed;
        contentType = "image/jpeg";
      }
    }
    if (blob.size > MAX_TOTAL_BASE64 * 0.75) {
      skipped.push({ name: doc.name, reason: "file too large for email" });
      continue;
    }
    try {
      const base64 = await readBase64(blob);
      if (total + base64.length > MAX_TOTAL_BASE64) {
        skipped.push({ name: doc.name, reason: "email size limit reached" });
        continue;
      }
      total += base64.length;
      attachments.push({ filename: doc.name, contentType, base64, size: blob.size });
    } catch {
      skipped.push({ name: doc.name, reason: "could not read file" });
    }
  }
  return { attachments, skipped };
}
