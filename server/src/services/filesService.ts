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

export function getImagesRootPath(): string {
  const base = getImagesBasePath();
  return path.dirname(base);
}

export function getMapBackgroundImagesBasePath(): string {
  return path.resolve(rootDir, '../admin-web/public/assets/images/ui/background');
}

/** Thư mục ảnh item (consumable) trong admin-web public */
export function getItemImagesBasePath(): string {
  return path.resolve(rootDir, '../admin-web/public/assets/images/item');
}

export function getItemImageTree(): FileTreeItem[] {
  return getImageTree(getItemImagesBasePath(), '/assets/images/item', true);
}

export function getMapBackgroundImageTree(): FileTreeItem[] {
  return getImageTree(getMapBackgroundImagesBasePath(), '/assets/images/ui/background', true);
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

export function getAdminPublicPath(): string {
  return path.resolve(rootDir, '../admin-web/public');
}

export function getTeyvatPublicPath(): string {
  return process.env.TEYVAT_PUBLIC_PATH
    ? path.resolve(process.env.TEYVAT_PUBLIC_PATH)
    : path.resolve(rootDir, '../TeyvatCard/public');
}

export interface FileMetadata {
  size: number;
  mtimeMs: number;
  ctimeMs: number;
}

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: FileTreeItem[];
  meta?: FileMetadata;
}

export function getImageTree(dirPath: string, webPath: string, imageOnly = false): FileTreeItem[] {
  const result: FileTreeItem[] = [];
  if (!fs.existsSync(dirPath)) return result;
  const isImage = (name: string) => IMAGE_EXT.includes(path.extname(name).toLowerCase());
  let names: string[];
  try {
    names = fs.readdirSync(dirPath);
  } catch {
    return result;
  }
  for (const name of names) {
    const fullPath = path.join(dirPath, name);
    const relativeWebPath = webPath ? `${webPath}/${name}` : `/${name}`;
    let st: fs.Stats;
    try {
      st = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      result.push({
        name,
        path: relativeWebPath,
        type: 'dir',
        children: getImageTree(fullPath, relativeWebPath, imageOnly),
      });
    } else if (st.isFile() && (!imageOnly || isImage(name))) {
      result.push({
        name,
        path: relativeWebPath,
        type: 'file',
        meta: {
          size: st.size,
          mtimeMs: st.mtimeMs,
          ctimeMs: st.ctimeMs,
        },
      });
    }
  }
  return result.sort((a, b) => (a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name)));
}

export function ensureUploadsDir(): void {
  const uploadsDir = getUploadsDir();
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

/** Cặp .webp + .json cùng tên gốc trong thư mục server/atlas (phục vụ Manager Assets). */
export interface AtlasFileEntry {
  name: string;
  imageUrl: string;
  jsonUrl: string;
  imageMeta: FileMetadata;
  jsonMeta: FileMetadata;
  hasAnimation: boolean;
}

export function listAtlasFiles(): AtlasFileEntry[] {
  const dir = getAtlasTempDir();
  if (!fs.existsSync(dir)) return [];
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const byLower = new Map(names.map((n) => [n.toLowerCase(), n] as const));
  const result: AtlasFileEntry[] = [];
  for (const webpName of names) {
    if (!webpName.toLowerCase().endsWith('.webp')) continue;
    const stem = path.basename(webpName, path.extname(webpName));
    const jsonActual = byLower.get(`${stem}.json`.toLowerCase());
    if (!jsonActual) continue;
    const imagePath = path.join(dir, webpName);
    const jsonPath = path.join(dir, jsonActual);
    try {
      const imageSt = fs.statSync(imagePath);
      const jsonSt = fs.statSync(jsonPath);
      if (!imageSt.isFile() || !jsonSt.isFile()) continue;

      let hasAnimation = false;
      try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const parsed = JSON.parse(raw) as {
          meta?: { hasAnimation?: boolean };
        };
        hasAnimation = Boolean(parsed?.meta?.hasAnimation);
      } catch {
        hasAnimation = false;
      }

      result.push({
        name: stem,
        imageUrl: `/atlas/${encodeURIComponent(webpName)}`,
        jsonUrl: `/atlas/${encodeURIComponent(jsonActual)}`,
        imageMeta: {
          size: imageSt.size,
          mtimeMs: imageSt.mtimeMs,
          ctimeMs: imageSt.ctimeMs,
        },
        jsonMeta: {
          size: jsonSt.size,
          mtimeMs: jsonSt.mtimeMs,
          ctimeMs: jsonSt.ctimeMs,
        },
        hasAnimation,
      });
    } catch {
      continue;
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function deleteAtlasByName(
  name: string
): { ok: true } | { error: string } {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'Thiếu tên atlas' };
  const safe = safeBasename(`${trimmed}.webp`);
  if (!safe) return { error: 'Tên atlas không hợp lệ' };

  const dir = getAtlasTempDir();
  if (!fs.existsSync(dir)) {
    return { error: 'Atlas không tồn tại' };
  }

  const webpPath = path.join(dir, `${trimmed}.webp`);
  const jsonPath = path.join(dir, `${trimmed}.json`);

  const hasWebp = fs.existsSync(webpPath);
  const hasJson = fs.existsSync(jsonPath);
  if (!hasWebp && !hasJson) {
    return { error: 'Atlas không tồn tại' };
  }

  try {
    if (hasWebp) fs.unlinkSync(webpPath);
  } catch {
    return { error: 'Không xóa được file .webp' };
  }
  try {
    if (hasJson) fs.unlinkSync(jsonPath);
  } catch {
    return { error: 'Không xóa được file .json' };
  }

  return { ok: true };
}

export function safeBasename(filename: string): string | null {
  const base = path.basename(filename);
  if (base !== filename || base.includes('..') || path.isAbsolute(base)) return null;
  return base;
}

function isValidNewFileName(name: string): boolean {
  // Allow simple cross-platform safe names only.
  return /^[a-zA-Z0-9._-]+$/.test(name);
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

export function resolveUploadedFilePath(webPath: string): string | null {
  const prefix = '/uploads/';
  if (!webPath.startsWith(prefix) && webPath !== '/uploads') return null;
  const uploadsDir = getUploadsDir();
  if (webPath === '/uploads') return null;
  const relative = webPath.slice(prefix.length).replace(/\\/g, '/');
  if (!relative || relative.includes('..') || path.isAbsolute(relative)) return null;
  const fullPath = path.join(uploadsDir, relative);
  const normalized = path.normalize(fullPath);
  if (!normalized.startsWith(path.normalize(uploadsDir))) return null;
  return normalized;
}

export function resolveAssetsImageFilePath(webPath: string): string | null {
  const prefix = '/assets/images/';
  if (!webPath.startsWith(prefix)) return null;
  const imagesRoot = getImagesRootPath();
  const relative = webPath.slice(prefix.length).replace(/\\/g, '/');
  if (!relative || relative.includes('..') || path.isAbsolute(relative)) return null;
  const fullPath = path.join(imagesRoot, relative);
  const normalized = path.normalize(fullPath);
  if (!normalized.startsWith(path.normalize(imagesRoot))) return null;
  return normalized;
}

function resolveFromWebPrefix(
  webPath: string,
  webPrefix: string,
  baseDir: string
): string | null {
  if (!webPath.startsWith(webPrefix)) return null;
  const relative = webPath.slice(webPrefix.length).replace(/\\/g, '/');
  if (!relative || relative.includes('..') || path.isAbsolute(relative)) return null;
  const fullPath = path.join(baseDir, relative);
  const normalized = path.normalize(fullPath);
  if (!normalized.startsWith(path.normalize(baseDir))) return null;
  return normalized;
}

export function resolvePublicWebFilePath(webPath: string): string | null {
  const roots: Array<{ prefix: string; baseDir: string }> = [
    { prefix: '/assets/', baseDir: getAdminPublicPath() },
    { prefix: '/demo/', baseDir: getTeyvatPublicPath() },
  ];
  for (const root of roots) {
    const resolved = resolveFromWebPrefix(webPath, root.prefix, root.baseDir);
    if (resolved) return resolved;
  }
  return null;
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

const ASSETS_IMAGES_WEB_ROOT = '/assets/images';

/** Thư mục con bất kỳ dưới `admin-web/public/assets/images` (web path bắt đầu bằng /assets/images). */
export function resolveAssetsImageFolderPath(webPath: string): string | null {
  const imagesRoot = getImagesRootPath();
  const p = webPath.replace(/\/+$/, '');
  if (p === ASSETS_IMAGES_WEB_ROOT) return path.normalize(imagesRoot);
  const prefix = `${ASSETS_IMAGES_WEB_ROOT}/`;
  if (!p.startsWith(prefix)) return null;
  const relative = p.slice(prefix.length).replace(/\\/g, '/');
  if (!relative || relative.includes('..') || path.isAbsolute(relative)) return null;
  const fullPath = path.join(imagesRoot, relative);
  const normalized = path.normalize(fullPath);
  if (!normalized.startsWith(path.normalize(imagesRoot))) return null;
  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isDirectory()) return null;
  return normalized;
}

export function renameUploaded(currentName: string, newName: string): { imageUrl: string } | { error: string } {
  const uploadsDir = getUploadsDir();
  const current = safeBasename(currentName);
  const next = safeBasename(newName);
  if (!current || !next) return { error: 'Tên file không hợp lệ' };
  if (!isValidNewFileName(next)) return { error: 'Tên file mới chỉ được chứa chữ, số, dấu chấm, gạch ngang, gạch dưới' };
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
  if (!isValidNewFileName(base)) return { error: 'Tên file mới chỉ được chứa chữ, số, dấu chấm, gạch ngang, gạch dưới' };
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

export function renameAssetsImageFile(
  webPath: string,
  newName: string
): { imageUrl: string } | { error: string } {
  const imagesRoot = getImagesRootPath();
  const currentPath = resolveAssetsImageFilePath(webPath);
  if (!currentPath) return { error: 'Đường dẫn không hợp lệ (phải thuộc thư mục assets/images)' };
  const base = safeBasename(newName);
  if (!base) return { error: 'Tên file mới không hợp lệ' };
  if (!isValidNewFileName(base)) return { error: 'Tên file mới chỉ được chứa chữ, số, dấu chấm, gạch ngang, gạch dưới' };
  if (!fs.existsSync(currentPath)) return { error: 'File không tồn tại' };
  if (!fs.statSync(currentPath).isFile()) return { error: 'Chỉ được đổi tên file' };
  const dir = path.dirname(currentPath);
  const nextPath = path.join(dir, base);
  if (!path.normalize(nextPath).startsWith(path.normalize(imagesRoot))) return { error: 'Tên file mới không hợp lệ' };
  if (fs.existsSync(nextPath)) return { error: 'Tên mới đã tồn tại' };
  fs.renameSync(currentPath, nextPath);
  const relative = path.relative(imagesRoot, nextPath).replace(/\\/g, '/');
  return { imageUrl: `${ASSETS_IMAGES_WEB_ROOT}/${relative}` };
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

/** Di chuyển file bất kỳ trong cây `/assets/images/...` (Spritesheet, animations, cards, …). */
export function moveAssetsImageFile(
  webPath: string,
  targetFolderPath: string
): { imageUrl: string } | { error: string } {
  const imagesRoot = getImagesRootPath();
  const currentPath = resolveAssetsImageFilePath(webPath);
  const targetDir = resolveAssetsImageFolderPath(targetFolderPath);
  if (!currentPath || !targetDir) return { error: 'Đường dẫn không hợp lệ' };
  if (!fs.existsSync(currentPath)) return { error: 'File không tồn tại' };
  if (!fs.statSync(currentPath).isFile()) return { error: 'Chỉ được di chuyển file' };
  const base = path.basename(currentPath);
  const nextPath = path.join(targetDir, base);
  if (path.normalize(nextPath) === path.normalize(currentPath)) return { error: 'File đã nằm trong thư mục này' };
  if (fs.existsSync(nextPath)) return { error: 'Đã tồn tại file cùng tên trong thư mục đích' };
  fs.renameSync(currentPath, nextPath);
  const relative = path.relative(imagesRoot, nextPath).replace(/\\/g, '/');
  return { imageUrl: `${ASSETS_IMAGES_WEB_ROOT}/${relative}` };
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

/** Di chuyển file trong cây `/uploads/...` (hỗ trợ thư mục con). */
export function moveUploadedFileByWebPath(
  uploadedWebPath: string,
  targetFolderPath: string
): { imageUrl: string } | { error: string } {
  const sourcePath = resolveUploadedFilePath(uploadedWebPath);
  if (!sourcePath || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    return { error: 'File không tồn tại' };
  }
  const uploadsDir = getUploadsDir();
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
  const base = path.basename(sourcePath);
  const nextPath = path.join(targetDir, base);
  if (path.normalize(nextPath) === path.normalize(sourcePath)) {
    const rel = path.relative(uploadsDir, nextPath).replace(/\\/g, '/');
    return { imageUrl: `/uploads/${rel}` };
  }
  if (fs.existsSync(nextPath)) return { error: 'Đã tồn tại file cùng tên trong thư mục đích' };
  fs.renameSync(sourcePath, nextPath);
  const relative = path.relative(uploadsDir, nextPath).replace(/\\/g, '/');
  return { imageUrl: `/uploads/${relative}` };
}

/** Copy từ uploaded sang bất kỳ thư mục con nào dưới `/assets/images/`. */
export function moveUploadedWebToAssetsImageFolder(
  uploadedWebPath: string,
  targetFolderPath: string
): { imageUrl: string } | { error: string } {
  const imagesRoot = getImagesRootPath();
  const sourcePath = resolveUploadedFilePath(uploadedWebPath);
  if (!sourcePath || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    return { error: 'File không tồn tại trong uploaded' };
  }
  const targetDir = resolveAssetsImageFolderPath(targetFolderPath);
  if (!targetDir) return { error: 'Thư mục đích không hợp lệ' };
  const base = path.basename(sourcePath);
  const destPath = path.join(targetDir, base);
  if (fs.existsSync(destPath)) return { error: 'Đã tồn tại file cùng tên trong thư mục đích' };
  fs.copyFileSync(sourcePath, destPath);
  fs.unlinkSync(sourcePath);
  const relative = path.relative(imagesRoot, destPath).replace(/\\/g, '/');
  return { imageUrl: `${ASSETS_IMAGES_WEB_ROOT}/${relative}` };
}

export function moveUploadedToCards(
  filename: string,
  targetFolderPath: string,
  _imagesBasePath: string
): { imageUrl: string } | { error: string } {
  const p = targetFolderPath.replace(/\/+$/, '');
  if (p !== CARDS_WEB_PREFIX_ROOT && !p.startsWith(CARDS_WEB_PREFIX)) {
    return { error: 'Thư mục đích không hợp lệ (phải thuộc cards)' };
  }
  const base = safeBasename(filename);
  if (!base) return { error: 'Tên file không hợp lệ' };
  return moveUploadedWebToAssetsImageFolder(`/uploads/${base}`, targetFolderPath);
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
  const q = typeof quality === 'number' ? Math.max(30, Math.min(100, Math.round(quality))) : 85;
  const sourcePath = path.join(getUploadsDir(), base);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) return { error: 'File không tồn tại' };
  const baseNameNoExt = path.basename(base, path.extname(base));
  const sourceExt = path.extname(base).toLowerCase();
  const outName = sourceExt === '.webp'
    ? `${baseNameNoExt}-q${q}-${Date.now()}.webp`
    : `${baseNameNoExt}.webp`;
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

export async function getFullImageMetadata(
  webPath: string
): Promise<
  | {
      file: FileMetadata;
      image: Omit<sharp.Metadata, 'exif' | 'icc' | 'xmp'>;
      exifBase64?: string;
    }
  | { error: string }
> {
  let fullPath: string | null = null;

  if (webPath.startsWith('/assets/images/')) {
    fullPath = resolveAssetsImageFilePath(webPath);
  } else if (webPath.startsWith('/assets/') || webPath.startsWith('/demo/')) {
    fullPath = resolvePublicWebFilePath(webPath);
  } else if (webPath.startsWith('/uploads/')) {
    fullPath = resolveUploadedFilePath(webPath);
  }

  if (!fullPath) return { error: 'Đường dẫn không hợp lệ' };
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return { error: 'File không tồn tại' };

  const stat = fs.statSync(fullPath);
  const rawMeta = await sharp(fullPath).metadata();
  const { exif, icc, xmp, ...rest } = rawMeta;

  return {
    file: {
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      ctimeMs: stat.ctimeMs,
    },
    image: rest,
    exifBase64: exif ? exif.toString('base64') : undefined,
  };
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

export async function generateCustomAtlas(
  webPaths: string[],
  baseName: string
): Promise<
  { imageUrl: string; jsonUrl: string; count: number; sheetSize: { w: number; h: number } } | { error: string }
> {
  const name = baseName.trim();
  if (!name || !/^[a-zA-Z0-9_-]{1,50}$/.test(name)) {
    return { error: 'Tên atlas không hợp lệ. Chỉ cho phép a-z, A-Z, 0-9, -, _ (tối đa 50 ký tự).' };
  }

  const uniquePaths = Array.from(new Set(webPaths.filter((p) => typeof p === 'string' && p.trim().length > 0)));
  if (uniquePaths.length === 0) return { error: 'Danh sách ảnh trống.' };

  const imagesRoot = getImagesRootPath();
  const uploadsDir = getUploadsDir();

  const resolvedFiles: string[] = [];

  for (const webPath of uniquePaths) {
    let fullPath: string | null = null;

    if (webPath.startsWith('/assets/images/')) {
      const relative = webPath.replace(/^\/assets\/images\/?/, '').replace(/\\/g, '/');
      if (!relative || relative.includes('..') || path.isAbsolute(relative)) continue;
      fullPath = path.join(imagesRoot, relative);
    } else if (webPath.startsWith('/uploads/')) {
      fullPath = resolveUploadedFilePath(webPath);
    }

    if (!fullPath) continue;
    const normalized = path.normalize(fullPath);
    const ext = path.extname(normalized).toLowerCase();
    if (!IMAGE_EXT.includes(ext)) continue;
    if (!fs.existsSync(normalized) || !fs.statSync(normalized).isFile()) continue;

    resolvedFiles.push(normalized);
  }

  if (resolvedFiles.length === 0) return { error: 'Không tìm thấy ảnh hợp lệ để tạo atlas.' };

  const firstFullPath = resolvedFiles[0];
  const firstMeta = await sharp(firstFullPath).metadata();
  const spriteWidth = firstMeta.width ?? 420;
  const spriteHeight = firstMeta.height ?? 720;
  const grid = bestGrid(resolvedFiles.length, spriteWidth, spriteHeight);

  const canvas = sharp({
    create: { width: grid.sheetWidth, height: grid.sheetHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });

  const compositeOperations: { input: Buffer | string; top: number; left: number }[] = [];

  for (let index = 0; index < resolvedFiles.length; index++) {
    const imagePath = resolvedFiles[index];
    if (!fs.existsSync(imagePath)) continue;

    const row = Math.floor(index / grid.columns);
    const col = index % grid.columns;
    const x = col * spriteWidth;
    const y = row * spriteHeight;

    const img = sharp(imagePath);
    const meta = await img.metadata();
    const needResize = meta.width !== spriteWidth || meta.height !== spriteHeight;
    const input = needResize
      ? await sharp(imagePath).resize(spriteWidth, spriteHeight, { fit: 'cover', position: 'center' }).toBuffer()
      : imagePath;

    compositeOperations.push({ input, top: y, left: x });
  }

  if (compositeOperations.length === 0) return { error: 'Không thể xử lý ảnh để tạo atlas.' };

  const spriteSheet = await canvas.composite(compositeOperations).webp({ quality: 90 });
  const webpBuffer = await spriteSheet.toBuffer();

  const atlasBaseName = name;
  const webpName = `${atlasBaseName}.webp`;
  const jsonName = `${atlasBaseName}.json`;

  const teyvatCardsPublicPath = getTeyvatCardsPublicPath();
  const atlasTempDir = getAtlasTempDir();

  if (!fs.existsSync(teyvatCardsPublicPath)) fs.mkdirSync(teyvatCardsPublicPath, { recursive: true });
  const teyvatWebpPath = path.join(teyvatCardsPublicPath, webpName);
  const teyvatJsonPath = path.join(teyvatCardsPublicPath, jsonName);

  const metadata: {
    frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
    meta: { image: string; size: { w: number; h: number }; scale: string; path: string };
  } = {
    frames: {},
    meta: {
      image: webpName,
      size: { w: grid.sheetWidth, h: grid.sheetHeight },
      scale: '1',
      path: `assets/images/cards/${webpName}`,
    },
  };

  resolvedFiles.forEach((filePath, index) => {
    const row = Math.floor(index / grid.columns);
    const col = index % grid.columns;
    const baseKey = path
      .basename(filePath)
      .replace(/\.[^.]+$/, '')
      .replace(/[/\\]/g, '_');
    metadata.frames[baseKey] = {
      frame: { x: col * spriteWidth, y: row * spriteHeight, w: spriteWidth, h: spriteHeight },
    };
  });

  await fs.promises.writeFile(teyvatWebpPath, webpBuffer);
  await fs.promises.writeFile(teyvatJsonPath, JSON.stringify(metadata, null, 2));

  if (!fs.existsSync(atlasTempDir)) fs.mkdirSync(atlasTempDir, { recursive: true });
  await fs.promises.writeFile(path.join(atlasTempDir, webpName), webpBuffer);
  await fs.promises.writeFile(path.join(atlasTempDir, jsonName), JSON.stringify(metadata, null, 2));

  return {
    imageUrl: `/atlas/${webpName}`,
    jsonUrl: `/atlas/${jsonName}`,
    count: resolvedFiles.length,
    sheetSize: { w: grid.sheetWidth, h: grid.sheetHeight },
  };
}

const ANIMATION_FRAME_SIZE = 192;
const ANIMATION_NAME_RE = /^[a-zA-Z0-9_-]{1,50}$/;

export type AnimationAtlasSource = {
  path: string;
  name?: string;
};

export async function generateAnimationAtlas(
  sources: AnimationAtlasSource[],
  baseName: string
): Promise<
  { imageUrl: string; jsonUrl: string; count: number; sheetSize: { w: number; h: number } } | { error: string }
> {
  const name = baseName.trim();
  if (!name || !ANIMATION_NAME_RE.test(name)) {
    return { error: 'Tên atlas không hợp lệ. Chỉ cho phép a-z, A-Z, 0-9, -, _ (tối đa 50 ký tự).' };
  }
  const unique: AnimationAtlasSource[] = [];
  const seen = new Set<string>();
  for (const s of sources) {
    const p = typeof s?.path === 'string' ? s.path.trim() : '';
    if (!p || seen.has(p)) continue;
    seen.add(p);
    unique.push(s);
  }
  if (unique.length === 0) return { error: 'Danh sách animations trống.' };

  const imagesRoot = getImagesRootPath();
  const resolved: { fullPath: string; alias: string }[] = [];
  for (const src of unique) {
    const webPath = src.path.replace(/\\/g, '/');
    if (!webPath.toLowerCase().startsWith('/assets/images/animations/')) continue;
    const relative = webPath.replace(/^\/assets\/images\/animations\/?/i, '').replace(/\\/g, '/');
    if (!relative || relative.includes('..') || path.isAbsolute(relative)) continue;
    const fullPath = path.normalize(path.join(imagesRoot, 'animations', relative));
    const ext = path.extname(fullPath).toLowerCase();
    if (!IMAGE_EXT.includes(ext)) continue;
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) continue;
    const fallback = path.basename(fullPath).replace(/\.[^.]+$/, '');
    const aliasCandidate = (src.name ?? fallback).trim();
    const alias = ANIMATION_NAME_RE.test(aliasCandidate) ? aliasCandidate : fallback;
    resolved.push({ fullPath, alias: alias.replace(/[^a-zA-Z0-9_-]/g, '_') });
  }
  if (resolved.length === 0) return { error: 'Không tìm thấy file animation hợp lệ trong /assets/images/animations/.' };

  const extractedFrames: { input: Buffer; key: string }[] = [];
  const perAliasIndex = new Map<string, number>();

  for (const item of resolved) {
    const meta = await sharp(item.fullPath).metadata();
    const iw = meta.width ?? 0;
    const ih = meta.height ?? 0;
    const cols = Math.floor(iw / ANIMATION_FRAME_SIZE);
    const rows = Math.floor(ih / ANIMATION_FRAME_SIZE);
    if (cols < 1 || rows < 1) continue;
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const left = col * ANIMATION_FRAME_SIZE;
      const top = row * ANIMATION_FRAME_SIZE;
      const raw = await sharp(item.fullPath)
        .extract({ left, top, width: ANIMATION_FRAME_SIZE, height: ANIMATION_FRAME_SIZE })
        .ensureAlpha()
        .raw()
        .toBuffer();
      let nonEmpty = false;
      for (let p = 3; p < raw.length; p += 4) {
        if (raw[p] !== 0) {
          nonEmpty = true;
          break;
        }
      }
      if (!nonEmpty) continue;
      const framePng = await sharp(raw, {
        raw: { width: ANIMATION_FRAME_SIZE, height: ANIMATION_FRAME_SIZE, channels: 4 },
      })
        .png()
        .toBuffer();
      const idx = perAliasIndex.get(item.alias) ?? 0;
      perAliasIndex.set(item.alias, idx + 1);
      const padded = idx.toString().padStart(2, '0');
      extractedFrames.push({ input: framePng, key: `${item.alias}_${padded}` });
    }
  }

  if (extractedFrames.length === 0) return { error: 'Không có frame animation nào khác rỗng để tạo atlas.' };

  const grid = bestGrid(extractedFrames.length, ANIMATION_FRAME_SIZE, ANIMATION_FRAME_SIZE);
  const canvas = sharp({
    create: { width: grid.sheetWidth, height: grid.sheetHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  const compositeOperations = extractedFrames.map((f, index) => {
    const row = Math.floor(index / grid.columns);
    const col = index % grid.columns;
    return { input: f.input, left: col * ANIMATION_FRAME_SIZE, top: row * ANIMATION_FRAME_SIZE };
  });
  const webpBuffer = await canvas.composite(compositeOperations).webp({ quality: 90 }).toBuffer();

  const webpName = `${name}.webp`;
  const jsonName = `${name}.json`;
  const teyvatCardsPublicPath = getTeyvatCardsPublicPath();
  const atlasTempDir = getAtlasTempDir();
  if (!fs.existsSync(teyvatCardsPublicPath)) fs.mkdirSync(teyvatCardsPublicPath, { recursive: true });
  if (!fs.existsSync(atlasTempDir)) fs.mkdirSync(atlasTempDir, { recursive: true });

  const metadata: {
    frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
    meta: { image: string; size: { w: number; h: number }; scale: string; path: string; hasAnimation: boolean };
  } = {
    frames: {},
    meta: {
      image: webpName,
      size: { w: grid.sheetWidth, h: grid.sheetHeight },
      scale: '1',
      path: `assets/images/animations/${webpName}`,
      hasAnimation: true,
    },
  };
  extractedFrames.forEach((f, index) => {
    const row = Math.floor(index / grid.columns);
    const col = index % grid.columns;
    metadata.frames[f.key] = {
      frame: { x: col * ANIMATION_FRAME_SIZE, y: row * ANIMATION_FRAME_SIZE, w: ANIMATION_FRAME_SIZE, h: ANIMATION_FRAME_SIZE },
    };
  });

  await fs.promises.writeFile(path.join(teyvatCardsPublicPath, webpName), webpBuffer);
  await fs.promises.writeFile(path.join(teyvatCardsPublicPath, jsonName), JSON.stringify(metadata, null, 2));
  await fs.promises.writeFile(path.join(atlasTempDir, webpName), webpBuffer);
  await fs.promises.writeFile(path.join(atlasTempDir, jsonName), JSON.stringify(metadata, null, 2));

  return {
    imageUrl: `/atlas/${webpName}`,
    jsonUrl: `/atlas/${jsonName}`,
    count: extractedFrames.length,
    sheetSize: { w: grid.sheetWidth, h: grid.sheetHeight },
  };
}

const ANIMATION_SPRITESHEET_NAME_RE = /^[a-zA-Z0-9._-]+\.(webp|png)$/i;

export function getAnimationsPublicDir(): string {
  return path.join(getAdminPublicPath(), 'assets', 'images', 'animations');
}

/**
 * Lưu ảnh spritesheet animation (client ghép frame 192×…) vào admin-web/public/assets/images/animations.
 * - Nếu tên trùng file có sẵn thì tự động thêm hậu tố -1, -2, ... để tránh ghi đè.
 */
export async function saveAnimationSpritesheetFile(
  buffer: Buffer,
  requestedName: string
): Promise<{ imageUrl: string } | { error: string }> {
  const trimmed = requestedName.trim();
  if (!trimmed || !ANIMATION_SPRITESHEET_NAME_RE.test(trimmed)) {
    return {
      error: 'Tên file chỉ gồm chữ, số, . _ - và đuôi .webp hoặc .png',
    };
  }
  const baseDir = path.normalize(getAnimationsPublicDir());
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  const ext = path.extname(trimmed).toLowerCase() || '.webp';
  const rawBase = path.basename(trimmed, path.extname(trimmed)) || 'animation';
  const safeBase = rawBase.replace(/[^a-zA-Z0-9._-]/g, '_');

  let candidateBase = safeBase;
  let suffix = 0;
  let finalPath: string;
  // Không bao giờ ghi đè: nếu trùng thì thêm -1, -2...
  for (;;) {
    const fileName = suffix === 0 ? `${candidateBase}${ext}` : `${candidateBase}-${suffix}${ext}`;
    const full = path.normalize(path.join(baseDir, fileName));
    const relToBase = path.relative(baseDir, full);
    if (relToBase.startsWith('..') || path.isAbsolute(relToBase) || relToBase.includes('..')) {
      return { error: 'Tên file không hợp lệ' };
    }
    if (!fs.existsSync(full)) {
      finalPath = full;
      break;
    }
    suffix += 1;
  }

  if (!buffer.length || buffer.length > 20 * 1024 * 1024) {
    return { error: 'File ảnh trống hoặc quá lớn (tối đa 20MB)' };
  }
  await fs.promises.writeFile(finalPath!, buffer);
  const relOut = path.relative(baseDir, finalPath!).replace(/\\/g, '/');
  const imageUrl = `/assets/images/animations/${relOut}`;
  return { imageUrl };
}

export async function composeAnimationSpritesheetFromSource(
  webPath: string,
  frameIndices: number[],
  requestedName: string
): Promise<{ imageUrl: string; frameCount: number; sheetSize: { w: number; h: number } } | { error: string }> {
  const normalized = webPath.replace(/\\/g, '/').trim();
  if (!normalized.toLowerCase().startsWith('/assets/images/animations/')) {
    return { error: 'Chỉ cho phép file trong /assets/images/animations/' };
  }
  const relative = normalized.replace(/^\/assets\/images\/animations\/?/i, '');
  if (!relative || relative.includes('..')) {
    return { error: 'Đường dẫn không hợp lệ' };
  }
  const baseDir = path.normalize(getAnimationsPublicDir());
  const fullPath = path.normalize(path.join(baseDir, relative));
  const relToBase = path.relative(baseDir, fullPath);
  if (relToBase.startsWith('..') || path.isAbsolute(relToBase)) {
    return { error: 'Đường dẫn không hợp lệ' };
  }
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return { error: 'File không tồn tại' };
  }

  const meta = await sharp(fullPath).metadata();
  const iw = meta.width ?? 0;
  const ih = meta.height ?? 0;
  const cols = Math.floor(iw / ANIMATION_FRAME_SIZE);
  const rows = Math.floor(ih / ANIMATION_FRAME_SIZE);
  const total = cols * rows;
  if (cols < 1 || rows < 1 || total < 1) {
    return { error: 'Ảnh không có frame 192×192 hợp lệ' };
  }

  const picked = Array.from(
    new Set(
      frameIndices
        .map((n) => Math.floor(Number(n)))
        .filter((n) => Number.isFinite(n) && n >= 0 && n < total)
    )
  ).sort((a, b) => a - b);
  if (picked.length === 0) return { error: 'Danh sách frame trống hoặc không hợp lệ' };

  const grid = bestGrid(picked.length, ANIMATION_FRAME_SIZE, ANIMATION_FRAME_SIZE);
  const compositeOperations: { input: Buffer; top: number; left: number }[] = [];

  for (let index = 0; index < picked.length; index++) {
    const frame = picked[index];
    const srcCol = frame % cols;
    const srcRow = Math.floor(frame / cols);
    const left = srcCol * ANIMATION_FRAME_SIZE;
    const top = srcRow * ANIMATION_FRAME_SIZE;
    const frameBuf = await sharp(fullPath)
      .extract({ left, top, width: ANIMATION_FRAME_SIZE, height: ANIMATION_FRAME_SIZE })
      .png()
      .toBuffer();
    const dstCol = index % grid.columns;
    const dstRow = Math.floor(index / grid.columns);
    compositeOperations.push({
      input: frameBuf,
      left: dstCol * ANIMATION_FRAME_SIZE,
      top: dstRow * ANIMATION_FRAME_SIZE,
    });
  }

  const outBuffer = await sharp({
    create: {
      width: grid.sheetWidth,
      height: grid.sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeOperations)
    .webp({ quality: 90 })
    .toBuffer();

  const saved = await saveAnimationSpritesheetFile(outBuffer, requestedName);
  if ('error' in saved) return saved;
  return {
    imageUrl: saved.imageUrl,
    frameCount: picked.length,
    sheetSize: { w: grid.sheetWidth, h: grid.sheetHeight },
  };
}

const SPRITESHEET_FRAME_EXPORT_W = 350;
const SPRITESHEET_FRAME_EXPORT_H = 590;

export function getSpritesheetPublicDir(): string {
  return path.join(getAdminPublicPath(), 'assets', 'images', 'Spritesheet');
}

/**
 * Đọc spritesheet nguồn trong admin-web/public/assets/images/Spritesheet, cắt frame 350×590,
 * ghép lại theo bestGrid, ghi `{basename}-bestGrid.webp` cùng thư mục với file nguồn.
 */
export async function exportSpritesheetBestGrid(
  webPath: string
): Promise<
  | { imageUrl: string; sheetSize: { w: number; h: number }; frameCount: number }
  | { error: string }
> {
  const normalized = webPath.replace(/\\/g, '/').trim();
  if (!normalized.toLowerCase().startsWith('/assets/images/spritesheet/')) {
    return { error: 'Chỉ cho phép file trong /assets/images/Spritesheet/' };
  }
  const relative = normalized.replace(/^\/assets\/images\/Spritesheet\/?/i, '');
  if (!relative || relative.includes('..')) {
    return { error: 'Đường dẫn không hợp lệ' };
  }
  const baseDir = path.normalize(getSpritesheetPublicDir());
  const fullPath = path.normalize(path.join(baseDir, relative));
  const relToBase = path.relative(baseDir, fullPath);
  if (relToBase.startsWith('..') || path.isAbsolute(relToBase)) {
    return { error: 'Đường dẫn không hợp lệ' };
  }
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return { error: 'File không tồn tại' };
  }
  const ext = path.extname(fullPath).toLowerCase();
  if (!IMAGE_EXT.includes(ext)) {
    return { error: 'Định dạng ảnh không hỗ trợ' };
  }

  const meta = await sharp(fullPath).metadata();
  const iw = meta.width ?? 0;
  const ih = meta.height ?? 0;
  const cols = Math.floor(iw / SPRITESHEET_FRAME_EXPORT_W);
  const rows = Math.floor(ih / SPRITESHEET_FRAME_EXPORT_H);
  const totalFrames = cols * rows;
  if (cols < 1 || rows < 1 || totalFrames < 1) {
    return { error: 'Ảnh không đủ để cắt các frame 350×590' };
  }

  const grid = bestGrid(totalFrames, SPRITESHEET_FRAME_EXPORT_W, SPRITESHEET_FRAME_EXPORT_H);
  const compositeOperations: { input: Buffer; top: number; left: number }[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = col * SPRITESHEET_FRAME_EXPORT_W;
    const top = row * SPRITESHEET_FRAME_EXPORT_H;
    const buf = await sharp(fullPath)
      .extract({
        left,
        top,
        width: SPRITESHEET_FRAME_EXPORT_W,
        height: SPRITESHEET_FRAME_EXPORT_H,
      })
      .png()
      .toBuffer();
    const gCol = i % grid.columns;
    const gRow = Math.floor(i / grid.columns);
    compositeOperations.push({
      input: buf,
      left: gCol * SPRITESHEET_FRAME_EXPORT_W,
      top: gRow * SPRITESHEET_FRAME_EXPORT_H,
    });
  }

  const canvas = sharp({
    create: {
      width: grid.sheetWidth,
      height: grid.sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  const outBuffer = await canvas.composite(compositeOperations).webp({ quality: 90 }).toBuffer();

  const baseName = path.basename(fullPath, ext);
  const outName = `${baseName}-bestGrid.webp`;
  const outPath = path.join(path.dirname(fullPath), outName);
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await fs.promises.writeFile(outPath, outBuffer);

  const relOut = path.relative(baseDir, outPath).replace(/\\/g, '/');
  const imageUrl = `/assets/images/Spritesheet/${relOut}`;

  return {
    imageUrl,
    sheetSize: { w: grid.sheetWidth, h: grid.sheetHeight },
    frameCount: totalFrames,
  };
}

// (phiên bản mới của getAnimationsPublicDir/saveAnimationSpritesheetFile được định nghĩa phía trên cùng ANIMATION_SPRITESHEET_NAME_RE)
