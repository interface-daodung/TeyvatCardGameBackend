import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');

export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
const CONVERTIBLE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.tif'];
const CARDS_WEB_PREFIX = '/assets/images/cards/';
const CARDS_WEB_PREFIX_ROOT = '/assets/images/cards';

export function getImagesBasePath(): string {
  return process.env.CARDS_IMAGES_PATH
    ? path.resolve(process.env.CARDS_IMAGES_PATH)
    : path.resolve(rootDir, '../admin-web/public/assets/images/cards');
}

export function getUploadsDir(): string {
  return path.join(rootDir, 'uploads');
}

export function getAtlasTempDir(): string {
  return path.join(rootDir, 'atlas');
}

export function getTeyvatCardsPublicPath(): string {
  return process.env.TEYVAT_CARDS_PUBLIC_PATH
    ? path.resolve(process.env.TEYVAT_CARDS_PUBLIC_PATH)
    : path.resolve(rootDir, '../TeyvatCard/public/assets/images/cards');
}

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: FileTreeItem[];
}

export function getImageTree(dirPath: string, webPath: string, imageOnly = false): FileTreeItem[] {
  const result: FileTreeItem[] = [];
  if (!fs.existsSync(dirPath)) return result;
  const isImage = (name: string) => IMAGE_EXT.includes(path.extname(name).toLowerCase());
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativeWebPath = webPath ? `${webPath}/${entry.name}` : `/${entry.name}`;
    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        path: relativeWebPath,
        type: 'dir',
        children: getImageTree(fullPath, relativeWebPath, imageOnly),
      });
    } else if (entry.isFile() && (!imageOnly || isImage(entry.name))) {
      result.push({ name: entry.name, path: relativeWebPath, type: 'file' });
    }
  }
  return result.sort((a, b) => (a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name)));
}

export function ensureUploadsDir(): void {
  const uploadsDir = getUploadsDir();
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

export function safeBasename(filename: string): string | null {
  const base = path.basename(filename);
  if (base !== filename || base.includes('..') || path.isAbsolute(base)) return null;
  return base;
}

export function resolveCardFilePath(webPath: string, imagesBasePath: string): string | null {
  if (!webPath.startsWith(CARDS_WEB_PREFIX)) return null;
  const relative = webPath.slice(CARDS_WEB_PREFIX.length).replace(/\\/g, '/');
  if (relative.includes('..') || path.isAbsolute(relative)) return null;
  const fullPath = path.join(imagesBasePath, relative);
  const normalized = path.normalize(fullPath);
  if (!normalized.startsWith(path.normalize(imagesBasePath))) return null;
  return normalized;
}

export function resolveCardFolderPath(webPath: string, imagesBasePath: string): string | null {
  const p = webPath.replace(/\/+$/, '');
  if (p === CARDS_WEB_PREFIX_ROOT) return path.normalize(imagesBasePath);
  if (!p.startsWith(CARDS_WEB_PREFIX)) return null;
  const relative = p.slice(CARDS_WEB_PREFIX.length).replace(/\\/g, '/');
  if (relative.includes('..') || path.isAbsolute(relative)) return null;
  const fullPath = path.join(imagesBasePath, relative);
  const normalized = path.normalize(fullPath);
  if (!normalized.startsWith(path.normalize(imagesBasePath))) return null;
  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isDirectory()) return null;
  return normalized;
}

export function renameUploaded(currentName: string, newName: string): { imageUrl: string } | { error: string } {
  const uploadsDir = getUploadsDir();
  const current = safeBasename(currentName);
  const next = safeBasename(newName);
  if (!current || !next) return { error: 'Tên file không hợp lệ' };
  const ext = path.extname(current).toLowerCase();
  if (!IMAGE_EXT.includes(ext) || path.extname(next).toLowerCase() !== ext) return { error: 'Chỉ đổi tên file, giữ nguyên phần mở rộng' };
  const currentPath = path.join(uploadsDir, current);
  const nextPath = path.join(uploadsDir, next);
  if (!fs.existsSync(currentPath)) return { error: 'File không tồn tại' };
  if (fs.existsSync(nextPath)) return { error: 'Tên mới đã tồn tại' };
  fs.renameSync(currentPath, nextPath);
  return { imageUrl: `/uploads/${next}` };
}

export function deleteUploaded(filename: string): { success: true } | { error: string } {
  const base = safeBasename(filename);
  if (!base) return { error: 'Tên file không hợp lệ' };
  const filePath = path.join(getUploadsDir(), base);
  if (!fs.existsSync(filePath)) return { error: 'File không tồn tại' };
  fs.unlinkSync(filePath);
  return { success: true };
}

export function renameCardFile(
  webPath: string,
  newName: string,
  imagesBasePath: string
): { imageUrl: string } | { error: string } {
  const currentPath = resolveCardFilePath(webPath, imagesBasePath);
  if (!currentPath) return { error: 'Đường dẫn không hợp lệ (phải thuộc thư mục cards)' };
  const base = safeBasename(newName);
  if (!base) return { error: 'Tên file mới không hợp lệ' };
  if (!fs.existsSync(currentPath)) return { error: 'File không tồn tại' };
  if (!fs.statSync(currentPath).isFile()) return { error: 'Chỉ được đổi tên file' };
  const dir = path.dirname(currentPath);
  const nextPath = path.join(dir, base);
  if (!path.normalize(nextPath).startsWith(path.normalize(imagesBasePath))) return { error: 'Tên file mới không hợp lệ' };
  if (fs.existsSync(nextPath)) return { error: 'Tên mới đã tồn tại' };
  fs.renameSync(currentPath, nextPath);
  const relative = path.relative(imagesBasePath, nextPath).replace(/\\/g, '/');
  return { imageUrl: `${CARDS_WEB_PREFIX}${relative}` };
}

export function moveCardFile(
  webPath: string,
  targetFolderPath: string,
  imagesBasePath: string
): { imageUrl: string } | { error: string } {
  const currentPath = resolveCardFilePath(webPath, imagesBasePath);
  const targetDir = resolveCardFolderPath(targetFolderPath, imagesBasePath);
  if (!currentPath || !targetDir) return { error: 'Đường dẫn không hợp lệ' };
  if (!fs.existsSync(currentPath)) return { error: 'File không tồn tại' };
  if (!fs.statSync(currentPath).isFile()) return { error: 'Chỉ được di chuyển file' };
  const base = path.basename(currentPath);
  const nextPath = path.join(targetDir, base);
  if (path.normalize(nextPath) === path.normalize(currentPath)) return { error: 'File đã nằm trong thư mục này' };
  if (fs.existsSync(nextPath)) return { error: 'Đã tồn tại file cùng tên trong thư mục đích' };
  fs.renameSync(currentPath, nextPath);
  const relative = path.relative(imagesBasePath, nextPath).replace(/\\/g, '/');
  return { imageUrl: `${CARDS_WEB_PREFIX}${relative}` };
}

export function moveUploadedFile(
  filename: string,
  targetFolderPath: string
): { imageUrl: string } | { error: string } {
  const uploadsDir = getUploadsDir();
  const base = safeBasename(filename);
  if (!base) return { error: 'Tên file không hợp lệ' };
  const currentPath = path.join(uploadsDir, base);
  if (!fs.existsSync(currentPath) || !fs.statSync(currentPath).isFile()) return { error: 'File không tồn tại' };
  const prefix = '/uploads';
  const targetNorm = targetFolderPath.replace(/\/+$/, '') || prefix;
  if (!targetNorm.startsWith(prefix)) return { error: 'Thư mục đích phải thuộc /uploads' };
  let targetDir: string;
  if (targetNorm === '/uploads') {
    targetDir = uploadsDir;
  } else {
    const sub = targetNorm.slice(prefix.length + 1).replace(/\\/g, '/');
    if (sub.includes('..') || path.isAbsolute(sub)) return { error: 'Thư mục đích không hợp lệ' };
    targetDir = path.join(uploadsDir, sub);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  }
  const nextPath = path.join(targetDir, base);
  if (path.normalize(nextPath) === path.normalize(currentPath)) return { imageUrl: `/uploads/${base}` };
  if (fs.existsSync(nextPath)) return { error: 'Đã tồn tại file cùng tên trong thư mục đích' };
  fs.renameSync(currentPath, nextPath);
  const relative = path.relative(uploadsDir, nextPath).replace(/\\/g, '/');
  return { imageUrl: `/uploads/${relative}` };
}

export function moveUploadedToCards(
  filename: string,
  targetFolderPath: string,
  imagesBasePath: string
): { imageUrl: string } | { error: string } {
  const uploadsDir = getUploadsDir();
  const base = safeBasename(filename);
  if (!base) return { error: 'Tên file không hợp lệ' };
  const sourcePath = path.join(uploadsDir, base);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) return { error: 'File không tồn tại trong uploaded' };
  const targetDir = resolveCardFolderPath(targetFolderPath, imagesBasePath);
  if (!targetDir) return { error: 'Thư mục đích không hợp lệ (phải thuộc cards)' };
  const destPath = path.join(targetDir, base);
  if (fs.existsSync(destPath)) return { error: 'Đã tồn tại file cùng tên trong thư mục đích' };
  fs.copyFileSync(sourcePath, destPath);
  fs.unlinkSync(sourcePath);
  const relative = path.relative(imagesBasePath, destPath).replace(/\\/g, '/');
  return { imageUrl: `${CARDS_WEB_PREFIX}${relative}` };
}

function isConvertibleImage(filename: string): boolean {
  return CONVERTIBLE_EXT.includes(path.extname(filename).toLowerCase());
}

export async function convertToWebp(
  filename: string,
  quality?: number
): Promise<{ imageUrl: string } | { error: string }> {
  const base = safeBasename(filename);
  if (!base) return { error: 'Tên file không hợp lệ' };
  if (!isConvertibleImage(base)) return { error: 'Định dạng không hỗ trợ chuyển webp. Hỗ trợ: png, jpg, jpeg, gif, webp, bmp, tiff' };
  const q = typeof quality === 'number' ? Math.max(70, Math.min(100, Math.round(quality))) : 85;
  const sourcePath = path.join(getUploadsDir(), base);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) return { error: 'File không tồn tại' };
  const baseNameNoExt = path.basename(base, path.extname(base));
  const outName = `${baseNameNoExt}.webp`;
  const outPath = path.join(getUploadsDir(), outName);
  await sharp(sourcePath).webp({ quality: q }).toFile(outPath);
  return { imageUrl: `/uploads/${outName}` };
}

export async function resizeUploaded(
  filename: string,
  width?: number,
  height?: number
): Promise<{ imageUrl: string } | { error: string }> {
  const w = typeof width === 'number' ? Math.max(1, Math.min(4096, Math.round(width))) : 420;
  const h = typeof height === 'number' ? Math.max(1, Math.min(4096, Math.round(height))) : 720;
  const base = safeBasename(filename);
  if (!base) return { error: 'Tên file không hợp lệ' };
  if (!isConvertibleImage(base)) return { error: 'Định dạng không hỗ trợ resize. Hỗ trợ: png, jpg, jpeg, gif, webp, bmp, tiff' };
  const sourcePath = path.join(getUploadsDir(), base);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) return { error: 'File không tồn tại' };
  const ext = path.extname(base).toLowerCase();
  const baseNameNoExt = path.basename(base, ext);
  const outName = `${baseNameNoExt}-${w}x${h}${ext}`;
  const outPath = path.join(getUploadsDir(), outName);
  if (fs.existsSync(outPath)) return { error: `Đã tồn tại file ${outName}` };
  await sharp(sourcePath)
    .resize(w, h, { fit: 'cover', position: 'center', withoutEnlargement: false })
    .toFile(outPath);
  return { imageUrl: `/uploads/${outName}` };
}

export function deleteCardFile(webPath: string, imagesBasePath: string): { success: true } | { error: string } {
  const fullPath = resolveCardFilePath(webPath, imagesBasePath);
  if (!fullPath) return { error: 'Đường dẫn không hợp lệ (phải thuộc thư mục cards)' };
  if (!fs.existsSync(fullPath)) return { error: 'File không tồn tại' };
  if (!fs.statSync(fullPath).isFile()) return { error: 'Chỉ được xóa file, không xóa thư mục' };
  fs.unlinkSync(fullPath);
  return { success: true };
}

function flattenImageTree(items: FileTreeItem[], prefix = ''): { key: string; path: string }[] {
  const result: { key: string; path: string }[] = [];
  for (const item of items) {
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.type === 'file') {
      const ext = path.extname(item.name).toLowerCase();
      if (IMAGE_EXT.includes(ext)) {
        result.push({ key: rel.replace(/\.[^.]+$/, '').replace(/[/\\]/g, '/'), path: item.path });
      }
    } else if (item.type === 'dir' && item.children?.length) {
      result.push(...flattenImageTree(item.children, rel));
    }
  }
  return result;
}

function bestGrid(
  totalFrames: number,
  frameWidth: number,
  frameHeight: number
): { columns: number; rows: number; sheetWidth: number; sheetHeight: number } {
  let best: { columns: number; rows: number; sheetWidth: number; sheetHeight: number } = { columns: 1, rows: totalFrames, sheetWidth: frameWidth, sheetHeight: totalFrames * frameHeight };
  let minDiff = Infinity;
  for (let columns = 1; columns <= totalFrames; columns++) {
    const rows = Math.ceil(totalFrames / columns);
    const sheetWidth = columns * frameWidth;
    const sheetHeight = rows * frameHeight;
    const ratio = sheetWidth / sheetHeight;
    const diff = Math.abs(ratio - 1);
    if (diff < minDiff) {
      minDiff = diff;
      best = { columns, rows, sheetWidth, sheetHeight };
    }
  }
  return best;
}

export async function generateAllCardsAtlas(): Promise<
  { imageUrl: string; jsonUrl: string; count: number; sheetSize: { w: number; h: number } } | { error: string }
> {
  const imagesBasePath = getImagesBasePath();
  const teyvatCardsPublicPath = getTeyvatCardsPublicPath();
  const atlasTempDir = getAtlasTempDir();

  const tree = getImageTree(imagesBasePath, '/assets/images/cards');
  const assets = flattenImageTree(tree);
  if (assets.length === 0) return { error: 'Không có ảnh nào trong thư mục cards' };

  const firstFullPath = path.join(
    imagesBasePath,
    assets[0].path.replace(/^\/assets\/images\/cards\/?/, '').replace(/\//g, path.sep)
  );
  const firstMeta = await sharp(firstFullPath).metadata();
  const spriteWidth = firstMeta.width ?? 420;
  const spriteHeight = firstMeta.height ?? 720;
  const grid = bestGrid(assets.length, spriteWidth, spriteHeight);

  const canvas = sharp({
    create: { width: grid.sheetWidth, height: grid.sheetHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });

  const compositeOperations: { input: Buffer | string; top: number; left: number }[] = [];
  let currentIndex = 0;
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.columns; col++) {
      if (currentIndex >= assets.length) break;
      const asset = assets[currentIndex];
      const relative = asset.path.replace(/^\/assets\/images\/cards\/?/, '').replace(/\//g, path.sep);
      const imagePath = path.join(imagesBasePath, relative);
      if (!fs.existsSync(imagePath)) {
        currentIndex++;
        continue;
      }
      const x = col * spriteWidth;
      const y = row * spriteHeight;
      const img = sharp(imagePath);
      const meta = await img.metadata();
      const needResize = meta.width !== spriteWidth || meta.height !== spriteHeight;
      const input = needResize
        ? await sharp(imagePath).resize(spriteWidth, spriteHeight, { fit: 'cover', position: 'center' }).toBuffer()
        : imagePath;
      compositeOperations.push({ input, top: y, left: x });
      currentIndex++;
    }
  }

  const spriteSheet = await canvas.composite(compositeOperations).webp({ quality: 90 });
  const webpBuffer = await spriteSheet.toBuffer();

  const allCardsWebpName = 'all-cards.webp';
  const allCardsJsonName = 'all-cards.json';

  if (!fs.existsSync(teyvatCardsPublicPath)) fs.mkdirSync(teyvatCardsPublicPath, { recursive: true });
  const teyvatWebpPath = path.join(teyvatCardsPublicPath, allCardsWebpName);
  const teyvatJsonPath = path.join(teyvatCardsPublicPath, allCardsJsonName);

  const metadata: {
    frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
    meta: { image: string; size: { w: number; h: number }; scale: string; path: string };
  } = {
    frames: {},
    meta: {
      image: allCardsWebpName,
      size: { w: grid.sheetWidth, h: grid.sheetHeight },
      scale: '1',
      path: `assets/images/cards/${allCardsWebpName}`,
    },
  };
  assets.forEach((asset, index) => {
    const row = Math.floor(index / grid.columns);
    const col = index % grid.columns;
    metadata.frames[asset.key] = {
      frame: { x: col * spriteWidth, y: row * spriteHeight, w: spriteWidth, h: spriteHeight },
    };
  });

  await fs.promises.writeFile(teyvatWebpPath, webpBuffer);
  await fs.promises.writeFile(teyvatJsonPath, JSON.stringify(metadata, null, 2));

  if (!fs.existsSync(atlasTempDir)) fs.mkdirSync(atlasTempDir, { recursive: true });
  await fs.promises.writeFile(path.join(atlasTempDir, allCardsWebpName), webpBuffer);
  await fs.promises.writeFile(path.join(atlasTempDir, allCardsJsonName), JSON.stringify(metadata, null, 2));

  return {
    imageUrl: '/atlas/all-cards.webp',
    jsonUrl: '/atlas/all-cards.json',
    count: assets.length,
    sheetSize: { w: grid.sheetWidth, h: grid.sheetHeight },
  };
}
