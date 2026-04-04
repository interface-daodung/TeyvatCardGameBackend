import fs from 'fs';
import sharp from 'sharp';

/** Đọc file vào buffer rồi Sharp(buffer) — tránh giữ handle đĩa mở (Windows/OneDrive) sau khi xử lý. */
async function readSourceBuffer(sourcePath: string): Promise<Buffer> {
  return fs.promises.readFile(sourcePath);
}

export async function convertToWebpLossyFile(sourcePath: string, outPath: string, quality: number): Promise<void> {
  const buf = await readSourceBuffer(sourcePath);
  await sharp(buf).webp({ quality }).toFile(outPath);
}

export async function resizeImageCoverFitFile(
  sourcePath: string,
  outPath: string,
  width: number,
  height: number
): Promise<void> {
  const buf = await readSourceBuffer(sourcePath);
  await sharp(buf)
    .resize(width, height, { fit: 'cover', position: 'center', withoutEnlargement: false })
    .toFile(outPath);
}

export async function resizeToWebpLossyFile(
  sourcePath: string,
  outPath: string,
  width: number,
  height: number,
  quality: number
): Promise<void> {
  const buf = await readSourceBuffer(sourcePath);
  await sharp(buf)
    .resize(width, height, { fit: 'cover', position: 'center', withoutEnlargement: false })
    .webp({ quality })
    .toFile(outPath);
}

