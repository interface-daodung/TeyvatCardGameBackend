import { execFileSync } from 'child_process';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { convertToWebpLossyFile, resizeImageCoverFitFile, resizeToWebpLossyFile } from './files/imageTransforms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');

export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];

/** Lỗi IO khi đổi tên (Windows/OneDrive/EPERM); dùng để map HTTP 423 ở controller. */
export const RENAME_UPLOADED_IO_ERROR =
  'Không thể đổi tên file (file đang được dùng hoặc không có quyền)';
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

export type StagedPreviewKind = 'resize' | 'lossy';

export function getUploadsTmpDir(): string {
  return path.join(getUploadsDir(), 'tmp');
}

export function getUploadsTmpResizeDir(): string {
  return path.join(getUploadsTmpDir(), 'resize');
}

export function getUploadsTmpLossyDir(): string {
  return path.join(getUploadsTmpDir(), 'lossy');
}

export function ensureUploadsTmpDirs(): void {
  ensureUploadsDir();
  const dirs = [getUploadsTmpResizeDir(), getUploadsTmpLossyDir()];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

export function getUploadsResizeDir(): string {
  return path.join(getUploadsDir(), 'resize');
}

export function getUploadsLossyDir(): string {
  return path.join(getUploadsDir(), 'lossy');
}

export function ensureUploadsFinalDirs(): void {
  ensureUploadsDir();
  const dirs = [getUploadsResizeDir(), getUploadsLossyDir()];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

export function getAtlasTempDir(): string {
  return path.join(rootDir, 'atlas');
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
  scope: 'default' | 'desktop' | 'mobile';
}

export function listAtlasFiles(scope: 'default' | 'desktop' | 'mobile'): AtlasFileEntry[] {
  const dir =
    scope === 'default'
      ? getAtlasTempDir()
      : path.join(getAtlasTempDir(), scope);
  const atlasWebPrefix = scope === 'default' ? '/atlas' : `/atlas/${scope}`;
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
        imageUrl: `${atlasWebPrefix}/${encodeURIComponent(webpName)}`,
        jsonUrl: `${atlasWebPrefix}/${encodeURIComponent(jsonActual)}`,
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
        scope,
      });
    } catch {
      continue;
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function deleteAtlasByName(
  name: string,
  scope: 'default' | 'desktop' | 'mobile'
): { ok: true } | { error: string } {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'Thiếu tên atlas' };
  const safe = safeBasename(`${trimmed}.webp`);
  if (!safe) return { error: 'Tên atlas không hợp lệ' };

  const dir =
    scope === 'default'
      ? getAtlasTempDir()
      : path.join(getAtlasTempDir(), scope);
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

export type ExportAtlasToTeyvatResult =
  | { ok: true }
  | { error: string; code?: 'NEEDS_OVERWRITE_CONFIRM' };

/**
 * Bản sao từ `server/atlas/desktop|mobile` sang `TeyvatCard/public/assets/{desktop|mobile}/atlas`
 * (không đụng tới file trong `server/atlas`). JSON đích: `meta.path` = `assets/{desktop|mobile}/atlas/*.webp`
 * để client load đúng như các atlas trong `public/data` (AssetManager dùng meta.path làm URL).
 * Nếu đích đã có .webp hoặc .json cùng tên: trả `NEEDS_OVERWRITE_CONFIRM` trừ khi `confirmOverwrite === true`.
 */
export function exportAtlasVariantToTeyvatPublic(
  name: string,
  variantScope: 'desktop' | 'mobile',
  confirmOverwrite = false
): ExportAtlasToTeyvatResult {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'Thiếu tên atlas' };
  const safe = safeBasename(`${trimmed}.webp`);
  if (!safe) return { error: 'Tên atlas không hợp lệ' };

  const atlasDir = getAtlasTempDir();
  const srcDir = path.join(atlasDir, variantScope);
  const webpName = `${trimmed}.webp`;
  const jsonName = `${trimmed}.json`;
  const srcWebp = path.join(srcDir, webpName);
  const srcJson = path.join(srcDir, jsonName);
  if (!fs.existsSync(srcWebp) || !fs.existsSync(srcJson)) {
    return { error: `Không tìm thấy atlas trong bản ${variantScope}` };
  }

  const teyvatPublic = getTeyvatPublicPath();
  const destDir = path.join(teyvatPublic, 'assets', variantScope, 'atlas');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const destWebp = path.join(destDir, webpName);
  const destJson = path.join(destDir, jsonName);

  const destHasWebp = fs.existsSync(destWebp);
  const destHasJson = fs.existsSync(destJson);
  if ((destHasWebp || destHasJson) && !confirmOverwrite) {
    return {
      error:
        'Đã có file cùng tên trong TeyvatCard/public. Gửi lại yêu cầu với confirmOverwrite: true để ghi đè.',
      code: 'NEEDS_OVERWRITE_CONFIRM',
    };
  }

  const metaPathForClient = `assets/${variantScope}/atlas/${webpName}`;

  try {
    fs.copyFileSync(srcWebp, destWebp);
    const raw = fs.readFileSync(srcJson, 'utf8');
    let data: { meta?: { path?: string; image?: string } };
    try {
      data = JSON.parse(raw) as { meta?: { path?: string; image?: string } };
    } catch {
      return { error: 'File JSON atlas không hợp lệ' };
    }
    if (data.meta && typeof data.meta === 'object') {
      data.meta.path = metaPathForClient;
      data.meta.image = webpName;
    }
    fs.writeFileSync(destJson, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    return { error: 'Không xuất được atlas sang TeyvatCard/public' };
  }

  return { ok: true };
}

/** Tên file an toàn (không path traversal). Chấp nhận cả `foo.webp` lẫn `/uploads/foo.webp` — chỉ lấy basename. */
export function safeBasename(filename: string): string | null {
  const s = String(filename ?? '')
    .replace(/\\/g, '/')
    .trim();
  if (!s || s.includes('..')) return null;
  const base = path.basename(s);
  if (!base || base.includes('..')) return null;
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

const fsp = fs.promises;

/** Best-effort xóa file (rollback khi copy xong mà không xóa được nguồn). */
function tryUnlinkQuiet(p: string): void {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    /* ignore */
  }
}

/** Cho event loop chạy (đóng handle đọc ảnh / OneDrive) trước khi thử unlink lại. */
function yieldEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/** Windows/OneDrive: thử unlink lặp sau vài lần yield — tránh EPERM khi file vừa được đọc. */
async function unlinkSourceWithRetries(from: string, maxAttempts = 120): Promise<void> {
  let last: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fsp.unlink(from);
      return;
    } catch (e) {
      last = e;
      await yieldEventLoop();
    }
  }
  throw last;
}

/** Thử rename trực tiếp nhiều lần (trước khi copy+unlink) — tránh fallback tốn kém khi EPERM tạm thời. */
async function renameWithRetries(from: string, to: string, maxAttempts = 40): Promise<void> {
  let last: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fsp.rename(from, to);
      return;
    } catch (e) {
      last = e;
      await yieldEventLoop();
    }
  }
  throw last;
}

async function copyFileWithRetries(from: string, to: string, maxAttempts = 40): Promise<void> {
  let last: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fsp.copyFile(from, to);
      return;
    } catch (e) {
      last = e;
      await yieldEventLoop();
    }
  }
  throw last;
}

async function readWriteCopyWithRetries(from: string, to: string, maxAttempts = 40): Promise<void> {
  let last: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const buf = await fsp.readFile(from);
      await fsp.writeFile(to, buf);
      return;
    } catch (e) {
      last = e;
      await yieldEventLoop();
    }
  }
  throw last;
}

/** Windows: `move` của cmd đôi khi thành công khi `fs.rename`/`unlink` bị EPERM (OneDrive, preview). */
function tryWindowsCmdMoveSync(from: string, to: string): void {
  execFileSync('cmd.exe', ['/d', '/s', '/c', 'move', '/Y', from, to], {
    windowsHide: true,
    stdio: 'pipe',
  });
}

async function windowsCmdMoveWithRetries(from: string, to: string, maxAttempts = 30): Promise<void> {
  let last: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      tryWindowsCmdMoveSync(from, to);
      return;
    } catch (e) {
      last = e;
      await yieldEventLoop();
    }
  }
  throw last;
}

/**
 * Windows/OneDrive: rename thất bại (EBUSY/EPERM) → copy + unlink nguồn (có retry async).
 * Nếu unlink nguồn lỗi sau khi đã ghi `to`, xóa `to` để không để file đích sót lại.
 */
async function tryMoveFileAsync(from: string, to: string): Promise<void> {
  try {
    await renameWithRetries(from, to);
    return;
  } catch (e1) {
    if (process.platform === 'win32') {
      try {
        await windowsCmdMoveWithRetries(from, to);
        return;
      } catch {
        /* fall through */
      }
    }
    let wroteDest = false;
    try {
      await copyFileWithRetries(from, to);
      wroteDest = true;
    } catch {
      try {
        await readWriteCopyWithRetries(from, to);
        wroteDest = true;
      } catch (e3) {
        if (process.platform === 'win32') {
          try {
            await windowsCmdMoveWithRetries(from, to);
            return;
          } catch (eCmd) {
            console.error('tryMoveFileAsync', { from, to, e1, e3, eCmd });
            throw e3;
          }
        }
        console.error('tryMoveFileAsync', { from, to, e1, e3 });
        throw e3;
      }
    }
    try {
      await unlinkSourceWithRetries(from);
    } catch (unlinkErr) {
      if (wroteDest) tryUnlinkQuiet(to);
      if (process.platform === 'win32') {
        try {
          await windowsCmdMoveWithRetries(from, to);
          return;
        } catch (eCmd) {
          console.error('tryMoveFileAsync', { from, to, e1, unlinkErr, eCmd });
          throw unlinkErr;
        }
      }
      console.error('tryMoveFileAsync', { from, to, e1, unlinkErr });
      throw unlinkErr;
    }
  }
}

export async function renameUploaded(
  currentName: string,
  newName: string,
  currentWebPath?: string
): Promise<{ imageUrl: string } | { error: string }> {
  const uploadsDir = getUploadsDir();
  const currentBase = safeBasename(currentName);
  const next = safeBasename(newName);
  if (!currentBase || !next) {
    return { error: 'Tên file không hợp lệ' };
  }
  if (!isValidNewFileName(next)) return { error: 'Tên file mới chỉ được chứa chữ, số, dấu chấm, gạch ngang, gạch dưới' };

  let currentPath: string;
  if (currentWebPath && typeof currentWebPath === 'string' && currentWebPath.trim()) {
    const resolved = resolveUploadedFilePath(currentWebPath.trim());
    if (!resolved) {
      return { error: 'Đường dẫn không hợp lệ' };
    }
    if (path.basename(resolved).toLowerCase() !== currentBase.toLowerCase()) {
      return { error: 'Tên file không khớp đường dẫn' };
    }
    currentPath = resolved;
  } else {
    currentPath = path.join(uploadsDir, currentBase);
  }

  const ext = path.extname(currentPath).toLowerCase();
  if (!IMAGE_EXT.includes(ext) || path.extname(next).toLowerCase() !== ext) {
    return { error: 'Chỉ đổi tên file, giữ nguyên phần mở rộng' };
  }
  if (!fs.existsSync(currentPath)) return { error: 'File không tồn tại' };

  const dir = path.dirname(currentPath);
  const nextPath = path.join(dir, next);
  const normalizedNext = path.normalize(nextPath);
  if (!normalizedNext.startsWith(path.normalize(uploadsDir))) {
    return { error: 'Tên mới không hợp lệ' };
  }

  const baseNow = path.basename(currentPath);
  const onlyCaseChange =
    process.platform === 'win32' &&
    baseNow !== next &&
    baseNow.toLowerCase() === next.toLowerCase() &&
    ext !== '.';

  if (!onlyCaseChange && fs.existsSync(nextPath)) {
    return { error: 'Tên mới đã tồn tại' };
  }

  try {
    if (onlyCaseChange) {
      const tmpBase = `.___rename_${randomBytes(8).toString('hex')}___`;
      const tmpPath = path.join(dir, tmpBase);
      await tryMoveFileAsync(currentPath, tmpPath);
      await tryMoveFileAsync(tmpPath, nextPath);
    } else {
      await tryMoveFileAsync(currentPath, nextPath);
    }
    const rel = path.relative(uploadsDir, nextPath).replace(/\\/g, '/');
    return { imageUrl: `/uploads/${rel}` };
  } catch (err) {
    console.error('renameUploaded:', err, { currentPath, nextPath });
    return { error: RENAME_UPLOADED_IO_ERROR };
  }
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

export function deleteAssetsImageFile(webPath: string): { success: true } | { error: string } {
  const currentPath = resolveAssetsImageFilePath(webPath);
  if (!currentPath) return { error: 'Đường dẫn không hợp lệ (phải thuộc thư mục assets/images)' };
  if (!fs.existsSync(currentPath)) return { error: 'File không tồn tại' };
  if (!fs.statSync(currentPath).isFile()) return { error: 'Chỉ được xóa file' };
  try {
    fs.unlinkSync(currentPath);
    return { success: true };
  } catch (err) {
    console.error('deleteAssetsImageFile:', err, { webPath });
    return { error: 'Không thể xóa file' };
  }
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

/** Không cho phép pipeline staging từ bản derivative hoặc tmp. */
function isBlockedStagingSourceWebPath(webPath: string): boolean {
  const p = webPath.replace(/\\/g, '/').toLowerCase();
  return (
    p.startsWith('/uploads/tmp/') ||
    p.startsWith('/uploads/lossy/') ||
    p.startsWith('/uploads/resize/')
  );
}

function sanitizeStageStem(s: string): string {
  const t = s
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return t.slice(0, 180) || 'asset';
}

/**
 * Nguồn staging: legacy `filename` (basename trong uploads root) hoặc `sourceWebPath` đầy đủ
 * (`/assets/images/...` hoặc `/uploads/...` có thư mục con).
 */
function resolveStageSource(
  filename: string | undefined,
  sourceWebPath: string | undefined
):
  | { sourcePath: string; base: string; uniqueStem: string }
  | { error: string } {
  const sw = typeof sourceWebPath === 'string' ? sourceWebPath.trim() : '';
  if (sw) {
    if (isBlockedStagingSourceWebPath(sw)) {
      return { error: 'Không dùng file nguồn từ thư mục tmp/lossy/resize' };
    }
    if (sw.startsWith('/assets/images/')) {
      const disk = resolveAssetsImageFilePath(sw);
      if (!disk || !fs.existsSync(disk) || !fs.statSync(disk).isFile()) {
        return { error: 'File không tồn tại' };
      }
      const base = path.basename(disk);
      const rel = sw.slice('/assets/images/'.length).replace(/\\/g, '/');
      const stemFromRel = rel.replace(/\.[^/.]+$/, '');
      const uniqueStem = sanitizeStageStem(stemFromRel.replace(/\//g, '_')) || sanitizeStageStem(path.basename(base, path.extname(base)));
      return { sourcePath: disk, base, uniqueStem };
    }
    if (sw.startsWith('/uploads/')) {
      const disk = resolveUploadedFilePath(sw);
      if (!disk || !fs.existsSync(disk) || !fs.statSync(disk).isFile()) {
        return { error: 'File không tồn tại' };
      }
      const base = path.basename(disk);
      const uploadsDir = getUploadsDir();
      const rel = path.relative(uploadsDir, disk).replace(/\\/g, '/');
      const stemFromRel = rel.replace(/\.[^/.]+$/, '');
      const uniqueStem = sanitizeStageStem(stemFromRel.replace(/\//g, '_')) || sanitizeStageStem(path.basename(base, path.extname(base)));
      return { sourcePath: disk, base, uniqueStem };
    }
    return { error: 'Đường dẫn nguồn không hợp lệ' };
  }

  const base = filename ? safeBasename(filename) : null;
  if (!base) return { error: 'Thiếu filename hoặc sourceWebPath' };
  const sourcePath = path.join(getUploadsDir(), base);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) return { error: 'File không tồn tại' };
  const uniqueStem = sanitizeStageStem(path.basename(base, path.extname(base)));
  return { sourcePath, base, uniqueStem };
}

function makeStageId(): string {
  // Avoid overwriting when user clicks fast; deterministic về "targetFilename" ở commit.
  // Stage id only needs to be unique-ish.
  return `${Date.now()}-${String(process.hrtime.bigint()).slice(-6)}`;
}

export async function stageConvertToWebpLossy(
  filename: string | undefined,
  quality?: number,
  sourceWebPath?: string
): Promise<
  | {
      kind: 'lossy';
      previewUrl: string;
      targetFilename: string;
      stagedFilename: string;
    }
  | { error: string }
> {
  const resolved = resolveStageSource(filename, sourceWebPath);
  if ('error' in resolved) return resolved;
  const { sourcePath, base, uniqueStem: baseNameNoExt } = resolved;
  if (!isConvertibleImage(base)) return { error: 'Định dạng không hỗ trợ convert lossy. Hỗ trợ: png, jpg, jpeg, gif, webp, bmp, tiff' };

  const q = typeof quality === 'number' ? Math.max(10, Math.min(100, Math.round(quality))) : 85;

  const sourceExt = path.extname(base).toLowerCase();
  const isSourceWebp = sourceExt === '.webp';
  const targetFilename = isSourceWebp ? `${baseNameNoExt}.webp` : `${baseNameNoExt}-q${q}.webp`;
  const stagedFilename = isSourceWebp
    ? `${baseNameNoExt}-stage-${makeStageId()}.webp`
    : `${baseNameNoExt}-q${q}-stage-${makeStageId()}.webp`;
  const outPath = path.join(getUploadsTmpLossyDir(), stagedFilename);

  ensureUploadsTmpDirs();
  await convertToWebpLossyFile(sourcePath, outPath, q);

  return {
    kind: 'lossy',
    previewUrl: `/uploads/tmp/lossy/${stagedFilename}`,
    targetFilename,
    stagedFilename,
  };
}

export async function stageResizeUploaded(
  filename: string | undefined,
  width?: number,
  height?: number,
  sourceWebPath?: string
): Promise<
  | {
      kind: 'resize';
      previewUrl: string;
      targetFilename: string;
      stagedFilename: string;
    }
  | { error: string }
> {
  const w = typeof width === 'number' ? Math.max(1, Math.min(4096, Math.round(width))) : 420;
  const h = typeof height === 'number' ? Math.max(1, Math.min(4096, Math.round(height))) : 720;
  const resolved = resolveStageSource(filename, sourceWebPath);
  if ('error' in resolved) return resolved;
  const { sourcePath, base, uniqueStem: baseNameNoExt } = resolved;
  if (!isConvertibleImage(base)) return { error: 'Định dạng không hỗ trợ resize. Hỗ trợ: png, jpg, jpeg, gif, webp, bmp, tiff' };

  const ext = path.extname(base).toLowerCase();
  const targetFilename = `${baseNameNoExt}-${w}x${h}${ext}`;
  const stagedFilename = `${baseNameNoExt}-${w}x${h}-stage-${makeStageId()}${ext}`;
  const outPath = path.join(getUploadsTmpResizeDir(), stagedFilename);

  ensureUploadsTmpDirs();
  await resizeImageCoverFitFile(sourcePath, outPath, w, h);

  return {
    kind: 'resize',
    previewUrl: `/uploads/tmp/resize/${stagedFilename}`,
    targetFilename,
    stagedFilename,
  };
}

export async function stageResizeUploadedToWebpLossy(
  filename: string | undefined,
  width?: number,
  height?: number,
  quality?: number,
  sourceWebPath?: string
): Promise<
  | {
      kind: 'lossy';
      previewUrl: string;
      targetFilename: string;
      stagedFilename: string;
    }
  | { error: string }
> {
  const w = typeof width === 'number' ? Math.max(1, Math.min(4096, Math.round(width))) : 420;
  const h = typeof height === 'number' ? Math.max(1, Math.min(4096, Math.round(height))) : 720;
  const resolved = resolveStageSource(filename, sourceWebPath);
  if ('error' in resolved) return resolved;
  const { sourcePath, base, uniqueStem: baseNameNoExt } = resolved;
  if (!isConvertibleImage(base)) return { error: 'Định dạng không hỗ trợ resize. Hỗ trợ: png, jpg, jpeg, gif, webp, bmp, tiff' };

  const q = typeof quality === 'number' ? Math.max(10, Math.min(100, Math.round(quality))) : 85;

  const sourceExt = path.extname(base).toLowerCase();
  const isSourceWebp = sourceExt === '.webp';

  const targetFilename = isSourceWebp ? `${baseNameNoExt}-${w}x${h}.webp` : `${baseNameNoExt}-${w}x${h}-q${q}.webp`;
  const stagedFilename = isSourceWebp
    ? `${baseNameNoExt}-${w}x${h}-stage-${makeStageId()}.webp`
    : `${baseNameNoExt}-${w}x${h}-q${q}-stage-${makeStageId()}.webp`;
  const outPath = path.join(getUploadsTmpLossyDir(), stagedFilename);

  ensureUploadsTmpDirs();
  await resizeToWebpLossyFile(sourcePath, outPath, w, h, q);

  return {
    kind: 'lossy',
    previewUrl: `/uploads/tmp/lossy/${stagedFilename}`,
    targetFilename,
    stagedFilename,
  };
}

export async function commitStagedPreview(
  kind: StagedPreviewKind,
  stagedFilename: string,
  targetFilename: string
): Promise<{ imageUrl: string } | { error: string }> {
  const stagedBase = safeBasename(stagedFilename);
  const targetBase = safeBasename(targetFilename);
  if (!stagedBase || !targetBase) return { error: 'Tên file staged/target không hợp lệ' };

  const stageDir = kind === 'resize' ? getUploadsTmpResizeDir() : getUploadsTmpLossyDir();
  const stagedPath = path.join(stageDir, stagedBase);
  const targetDir = kind === 'resize' ? getUploadsResizeDir() : getUploadsLossyDir();
  const targetPath = path.join(targetDir, targetBase);

  ensureUploadsFinalDirs();

  if (!fs.existsSync(stagedPath) || !fs.statSync(stagedPath).isFile()) return { error: 'File staged không tồn tại' };
  if (fs.existsSync(targetPath)) return { error: 'File đích đã tồn tại (không ghi đè)' };

  try {
    await tryMoveFileAsync(stagedPath, targetPath);
  } catch (err) {
    console.error('commitStagedPreview:', err, { stagedPath, targetPath });
    return { error: RENAME_UPLOADED_IO_ERROR };
  }

  const webPrefix = kind === 'resize' ? '/uploads/resize' : '/uploads/lossy';
  return { imageUrl: `${webPrefix}/${targetBase}` };
}

export function deleteStagedPreview(
  kind: StagedPreviewKind,
  stagedFilename: string
): { success: true } | { error: string } {
  const stagedBase = safeBasename(stagedFilename);
  if (!stagedBase) return { error: 'Tên file staged không hợp lệ' };
  const stageDir = kind === 'resize' ? getUploadsTmpResizeDir() : getUploadsTmpLossyDir();
  const stagedPath = path.join(stageDir, stagedBase);
  if (!fs.existsSync(stagedPath)) return { error: 'File staged không tồn tại' };
  fs.unlinkSync(stagedPath);
  return { success: true };
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
  await convertToWebpLossyFile(sourcePath, outPath, q);
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
  await resizeImageCoverFitFile(sourcePath, outPath, w, h);
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
  const fileBuf = await fs.promises.readFile(fullPath);
  const rawMeta = await sharp(fileBuf).metadata();
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

type AtlasResolvedSource = {
  webPath: string;
  fullPath: string;
  frameKey: string;
  cacheRelativePath: string;
};

function buildCustomAtlasFrameKey(webPath: string, fullPath: string): string {
  const normalizedWebPath = webPath.replace(/\\/g, '/').toLowerCase();
  const segments = normalizedWebPath.split('/').filter(Boolean);
  const weaponTypes = new Set(['sword', 'claymore', 'polearm', 'bow', 'catalyst']);
  if (segments.length >= 2) {
    const file = segments[segments.length - 1];
    const parent = segments[segments.length - 2];
    const hasWeaponContext = segments.includes('weapon') || segments.includes('badge');
    if (hasWeaponContext && weaponTypes.has(parent)) {
      const basename = file.replace(/\.[^.]+$/, '');
      if (basename) return `${parent}-${basename}`;
    }
  }
  return path
    .basename(fullPath)
    .replace(/\.[^.]+$/, '')
    .replace(/[/\\]/g, '_');
}

function toAtlasCacheRelativePath(webPath: string): string | null {
  const normalized = webPath.replace(/\\/g, '/').trim();
  if (normalized.startsWith('/assets/')) {
    const rel = normalized.slice('/assets/'.length);
    if (!rel || rel.includes('..') || path.isAbsolute(rel)) return null;
    return rel;
  }
  if (normalized.startsWith('/uploads/')) {
    const rel = normalized.slice('/uploads/'.length);
    if (!rel || rel.includes('..') || path.isAbsolute(rel)) return null;
    return `uploads/${rel}`;
  }
  return null;
}

async function ensureAtlasVariantCachedImage(
  sourcePath: string,
  cachePath: string,
  resizeWidth: number
): Promise<{ cachedPath: string; width: number; height: number }> {
  if (!fs.existsSync(cachePath)) {
    const outDir = path.dirname(cachePath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    await sharp(sourcePath)
      .resize({
        width: resizeWidth,
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      })
      .webp({ quality: 80 })
      .toFile(cachePath);
  }
  const meta = await sharp(cachePath).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 1 || height < 1) {
    throw new Error('Invalid cached image dimension');
  }
  return { cachedPath: cachePath, width, height };
}

async function buildAtlasBuffers(
  sourceFiles: string[],
  quality = 90
): Promise<
  | {
      webpBuffer: Buffer;
      spriteWidth: number;
      spriteHeight: number;
      grid: { columns: number; rows: number; sheetWidth: number; sheetHeight: number };
    }
  | { error: string }
> {
  if (sourceFiles.length === 0) return { error: 'Danh sách ảnh trống.' };
  const firstMeta = await sharp(sourceFiles[0]).metadata();
  const spriteWidth = firstMeta.width ?? 0;
  const spriteHeight = firstMeta.height ?? 0;
  if (spriteWidth < 1 || spriteHeight < 1) {
    return { error: 'Không đọc được kích thước ảnh đầu vào để tạo atlas.' };
  }
  const grid = bestGrid(sourceFiles.length, spriteWidth, spriteHeight);
  const canvas = sharp({
    create: { width: grid.sheetWidth, height: grid.sheetHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });

  const compositeOperations: { input: Buffer | string; top: number; left: number }[] = [];
  for (let index = 0; index < sourceFiles.length; index++) {
    const imagePath = sourceFiles[index];
    if (!fs.existsSync(imagePath)) continue;
    const row = Math.floor(index / grid.columns);
    const col = index % grid.columns;
    const x = col * spriteWidth;
    const y = row * spriteHeight;
    const meta = await sharp(imagePath).metadata();
    const needResize = meta.width !== spriteWidth || meta.height !== spriteHeight;
    const input = needResize
      ? await sharp(imagePath).resize(spriteWidth, spriteHeight, { fit: 'cover', position: 'center' }).toBuffer()
      : imagePath;
    compositeOperations.push({ input, top: y, left: x });
  }
  if (compositeOperations.length === 0) {
    return { error: 'Không thể xử lý ảnh để tạo atlas.' };
  }
  const webpBuffer = await canvas.composite(compositeOperations).webp({ quality }).toBuffer();
  return { webpBuffer, spriteWidth, spriteHeight, grid };
}

function buildAtlasMetadata(
  frameKeys: string[],
  spriteWidth: number,
  spriteHeight: number,
  grid: { columns: number; rows: number; sheetWidth: number; sheetHeight: number },
  webpName: string,
  metaPath: string
): {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
  meta: { image: string; size: { w: number; h: number }; scale: string; path: string };
} {
  const metadata: {
    frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
    meta: { image: string; size: { w: number; h: number }; scale: string; path: string };
  } = {
    frames: {},
    meta: {
      image: webpName,
      size: { w: grid.sheetWidth, h: grid.sheetHeight },
      scale: '1',
      path: metaPath,
    },
  };
  frameKeys.forEach((key, index) => {
    const row = Math.floor(index / grid.columns);
    const col = index % grid.columns;
    metadata.frames[key] = {
      frame: { x: col * spriteWidth, y: row * spriteHeight, w: spriteWidth, h: spriteHeight },
    };
  });
  return metadata;
}

export async function generateAllCardsAtlas(): Promise<
  { imageUrl: string; jsonUrl: string; count: number; sheetSize: { w: number; h: number } } | { error: string }
> {
  const imagesBasePath = getImagesBasePath();
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

  const metadata: {
    frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
    meta: { image: string; size: { w: number; h: number }; scale: string; path: string };
  } = {
    frames: {},
    meta: {
      image: allCardsWebpName,
      size: { w: grid.sheetWidth, h: grid.sheetHeight },
      scale: '1',
      path: `atlas/${allCardsWebpName}`,
    },
  };
  assets.forEach((asset, index) => {
    const row = Math.floor(index / grid.columns);
    const col = index % grid.columns;
    metadata.frames[asset.key] = {
      frame: { x: col * spriteWidth, y: row * spriteHeight, w: spriteWidth, h: spriteHeight },
    };
  });

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
  const resolvedSources: AtlasResolvedSource[] = [];

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
    const cacheRelativePath = toAtlasCacheRelativePath(webPath);
    if (!cacheRelativePath) continue;
    const frameKey = buildCustomAtlasFrameKey(webPath, normalized);
    resolvedSources.push({
      webPath,
      fullPath: normalized,
      frameKey,
      cacheRelativePath,
    });
  }

  if (resolvedSources.length === 0) return { error: 'Không tìm thấy ảnh hợp lệ để tạo atlas.' };

  const atlasBaseName = name;
  const webpName = `${atlasBaseName}.webp`;
  const jsonName = `${atlasBaseName}.json`;

  const atlasTempDir = getAtlasTempDir();
  const atlasDesktopDir = path.join(atlasTempDir, 'desktop');
  const atlasMobileDir = path.join(atlasTempDir, 'mobile');

  if (!fs.existsSync(atlasTempDir)) fs.mkdirSync(atlasTempDir, { recursive: true });

  const originalFiles = resolvedSources.map((s) => s.fullPath);
  const frameKeys = resolvedSources.map((s) => s.frameKey);
  const rootBuild = await buildAtlasBuffers(originalFiles, 90);
  if ('error' in rootBuild) return rootBuild;
  // AtlasBuilderModal đã lọc chỉ 1 loại/lần: nếu frame đầu là vuông thì xem như item atlas.
  const isItemAtlas = rootBuild.spriteWidth === rootBuild.spriteHeight;
  const desktopResizeWidth = isItemAtlas ? 128 : 210;
  const mobileResizeWidth = isItemAtlas ? 64 : 105;
  const rootMetadata = buildAtlasMetadata(
    frameKeys,
    rootBuild.spriteWidth,
    rootBuild.spriteHeight,
    rootBuild.grid,
    webpName,
    `atlas/${webpName}`
  );

  await fs.promises.writeFile(path.join(atlasTempDir, webpName), rootBuild.webpBuffer);
  await fs.promises.writeFile(path.join(atlasTempDir, jsonName), JSON.stringify(rootMetadata, null, 2));

  if (!fs.existsSync(atlasDesktopDir)) fs.mkdirSync(atlasDesktopDir, { recursive: true });
  if (!fs.existsSync(atlasMobileDir)) fs.mkdirSync(atlasMobileDir, { recursive: true });

  const desktopCachedFiles: string[] = [];
  const mobileCachedFiles: string[] = [];
  for (const source of resolvedSources) {
    const desktopCachePath = path.join(atlasDesktopDir, source.cacheRelativePath);
    const mobileCachePath = path.join(atlasMobileDir, source.cacheRelativePath);
    const desktopCached = await ensureAtlasVariantCachedImage(source.fullPath, desktopCachePath, desktopResizeWidth);
    const mobileCached = await ensureAtlasVariantCachedImage(source.fullPath, mobileCachePath, mobileResizeWidth);
    desktopCachedFiles.push(desktopCached.cachedPath);
    mobileCachedFiles.push(mobileCached.cachedPath);
  }

  const desktopBuild = await buildAtlasBuffers(desktopCachedFiles, 90);
  if ('error' in desktopBuild) return desktopBuild;
  const desktopMetadata = buildAtlasMetadata(
    frameKeys,
    desktopBuild.spriteWidth,
    desktopBuild.spriteHeight,
    desktopBuild.grid,
    webpName,
    `atlas/desktop/${webpName}`
  );
  await fs.promises.writeFile(path.join(atlasDesktopDir, webpName), desktopBuild.webpBuffer);
  await fs.promises.writeFile(path.join(atlasDesktopDir, jsonName), JSON.stringify(desktopMetadata, null, 2));

  const mobileBuild = await buildAtlasBuffers(mobileCachedFiles, 90);
  if ('error' in mobileBuild) return mobileBuild;
  const mobileMetadata = buildAtlasMetadata(
    frameKeys,
    mobileBuild.spriteWidth,
    mobileBuild.spriteHeight,
    mobileBuild.grid,
    webpName,
    `atlas/mobile/${webpName}`
  );
  await fs.promises.writeFile(path.join(atlasMobileDir, webpName), mobileBuild.webpBuffer);
  await fs.promises.writeFile(path.join(atlasMobileDir, jsonName), JSON.stringify(mobileMetadata, null, 2));

  return {
    imageUrl: `/atlas/${webpName}`,
    jsonUrl: `/atlas/${jsonName}`,
    count: resolvedSources.length,
    sheetSize: { w: rootBuild.grid.sheetWidth, h: rootBuild.grid.sheetHeight },
  };
}

const ANIMATION_FRAME_SIZE = 192;
const ANIMATION_FRAME_SIZE_DESKTOP = 96;
const ANIMATION_FRAME_SIZE_MOBILE = 64;
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

  const buildAnimationAtlasVariant = async (
    frames: { input: Buffer; key: string }[],
    frameSize: number,
    metaPath: string
  ): Promise<{
    webpBuffer: Buffer;
    metadata: {
      frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
      meta: { image: string; size: { w: number; h: number }; scale: string; path: string; hasAnimation: boolean };
    };
    grid: { columns: number; rows: number; sheetWidth: number; sheetHeight: number };
  }> => {
    const grid = bestGrid(frames.length, frameSize, frameSize);
    const canvas = sharp({
      create: { width: grid.sheetWidth, height: grid.sheetHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    });
    const compositeOperations = frames.map((f, index) => {
      const row = Math.floor(index / grid.columns);
      const col = index % grid.columns;
      return { input: f.input, left: col * frameSize, top: row * frameSize };
    });
    const webpBuffer = await canvas.composite(compositeOperations).webp({ quality: 90 }).toBuffer();
    const metadata: {
      frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
      meta: { image: string; size: { w: number; h: number }; scale: string; path: string; hasAnimation: boolean };
    } = {
      frames: {},
      meta: {
        image: webpName,
        size: { w: grid.sheetWidth, h: grid.sheetHeight },
        scale: '1',
        path: metaPath,
        hasAnimation: true,
      },
    };
    frames.forEach((f, index) => {
      const row = Math.floor(index / grid.columns);
      const col = index % grid.columns;
      metadata.frames[f.key] = {
        frame: { x: col * frameSize, y: row * frameSize, w: frameSize, h: frameSize },
      };
    });
    return { webpBuffer, metadata, grid };
  };

  const webpName = `${name}.webp`;
  const jsonName = `${name}.json`;
  const atlasTempDir = getAtlasTempDir();
  const atlasDesktopDir = path.join(atlasTempDir, 'desktop');
  const atlasMobileDir = path.join(atlasTempDir, 'mobile');
  if (!fs.existsSync(atlasTempDir)) fs.mkdirSync(atlasTempDir, { recursive: true });
  if (!fs.existsSync(atlasDesktopDir)) fs.mkdirSync(atlasDesktopDir, { recursive: true });
  if (!fs.existsSync(atlasMobileDir)) fs.mkdirSync(atlasMobileDir, { recursive: true });

  const rootVariant = await buildAnimationAtlasVariant(
    extractedFrames,
    ANIMATION_FRAME_SIZE,
    `atlas/${webpName}`
  );

  await fs.promises.writeFile(path.join(atlasTempDir, webpName), rootVariant.webpBuffer);
  await fs.promises.writeFile(path.join(atlasTempDir, jsonName), JSON.stringify(rootVariant.metadata, null, 2));

  const desktopFrames = await Promise.all(
    extractedFrames.map(async (f) => ({
      key: f.key,
      input: await sharp(f.input)
        .resize({
          width: ANIMATION_FRAME_SIZE_DESKTOP,
          height: ANIMATION_FRAME_SIZE_DESKTOP,
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toBuffer(),
    }))
  );
  const desktopVariant = await buildAnimationAtlasVariant(
    desktopFrames,
    ANIMATION_FRAME_SIZE_DESKTOP,
    `atlas/desktop/${webpName}`
  );
  await fs.promises.writeFile(path.join(atlasDesktopDir, webpName), desktopVariant.webpBuffer);
  await fs.promises.writeFile(path.join(atlasDesktopDir, jsonName), JSON.stringify(desktopVariant.metadata, null, 2));

  const mobileFrames = await Promise.all(
    extractedFrames.map(async (f) => ({
      key: f.key,
      input: await sharp(f.input)
        .resize({
          width: ANIMATION_FRAME_SIZE_MOBILE,
          height: ANIMATION_FRAME_SIZE_MOBILE,
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toBuffer(),
    }))
  );
  const mobileVariant = await buildAnimationAtlasVariant(
    mobileFrames,
    ANIMATION_FRAME_SIZE_MOBILE,
    `atlas/mobile/${webpName}`
  );
  await fs.promises.writeFile(path.join(atlasMobileDir, webpName), mobileVariant.webpBuffer);
  await fs.promises.writeFile(path.join(atlasMobileDir, jsonName), JSON.stringify(mobileVariant.metadata, null, 2));

  return {
    imageUrl: `/atlas/${webpName}`,
    jsonUrl: `/atlas/${jsonName}`,
    count: extractedFrames.length,
    sheetSize: { w: rootVariant.grid.sheetWidth, h: rootVariant.grid.sheetHeight },
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
