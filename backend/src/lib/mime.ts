// src/lib/mime.ts
// ESM package in a CommonJS project → use dynamic import

let _fileTypeFromBuffer:
  | ((buf: Buffer) => Promise<{ mime: string; ext: string } | undefined>)
  | null = null;

async function getFileTypeFromBuffer() {
  if (!_fileTypeFromBuffer) {
    const { fileTypeFromBuffer } = await import('file-type'); // <-- dynamic import
    _fileTypeFromBuffer = fileTypeFromBuffer;
  }
  return _fileTypeFromBuffer!;
}

export async function sniffMime(
  buf: Buffer,
  fallback = 'application/octet-stream'
) {
  const fileTypeFromBuffer = await getFileTypeFromBuffer();
  const ft = await fileTypeFromBuffer(buf);
  return ft?.mime ?? fallback;
}

export async function sniffExt(buf: Buffer) {
  const fileTypeFromBuffer = await getFileTypeFromBuffer();
  const ft = await fileTypeFromBuffer(buf);
  return ft?.ext ?? undefined;
}
