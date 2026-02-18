import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');
const imagesBasePath = path.resolve(rootDir, '../admin-web/public/assets/images/cards');
const uploadsDir = path.join(rootDir, 'uploads');

const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const base = path.basename(file.originalname, path.extname(file.originalname));
    const safe = base.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 32) || 'image';
    const name = `${Date.now()}-${safe}${ext}`;
    cb(null, name);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (IMAGE_EXT.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh: .png, .jpg, .jpeg, .gif, .webp, .svg, .bmp'));
    }
  },
}).single('image');

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: FileTreeItem[];
}

function getImageTree(dirPath: string, webPath: string, imageOnly = false): FileTreeItem[] {
  const result: FileTreeItem[] = [];

  if (!fs.existsSync(dirPath)) {
    return result;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  const isImage = (name: string) => {
    const ext = path.extname(name).toLowerCase();
    return IMAGE_EXT.includes(ext);
  };

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativeWebPath = webPath ? `${webPath}/${entry.name}` : `/${entry.name}`;

    if (entry.isDirectory()) {
      const children = getImageTree(fullPath, relativeWebPath, imageOnly);
      result.push({
        name: entry.name,
        path: relativeWebPath,
        type: 'dir',
        children,
      });
    } else if (entry.isFile()) {
      if (!imageOnly || isImage(entry.name)) {
        result.push({
          name: entry.name,
          path: relativeWebPath,
          type: 'file',
        });
      }
    }
  }

  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getImageTreeHandler(req: Request, res: Response) {
  try {
    const tree = getImageTree(imagesBasePath, '/assets/images/cards');
    res.json({ tree });
  } catch (err) {
    console.error('Failed to read image tree:', err);
    res.status(500).json({ error: 'Failed to read image folder structure' });
  }
}

export async function getUploadedTreeHandler(req: Request, res: Response) {
  try {
    ensureUploadsDir();
    const tree = getImageTree(uploadsDir, '/uploads', true);
    res.json({ tree });
  } catch (err) {
    console.error('Failed to read uploaded tree:', err);
    res.status(500).json({ error: 'Failed to read uploaded folder structure' });
  }
}

export async function uploadImageHandler(req: Request, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Không có file ảnh được gửi (field: image)' });
      return;
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({ imageUrl });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Upload thất bại' });
  }
}

function safeBasename(filename: string): string | null {
  const base = path.basename(filename);
  if (base !== filename || base.includes('..') || path.isAbsolute(base)) return null;
  return base;
}

export async function renameUploadedHandler(req: Request, res: Response) {
  try {
    const { currentName, newName } = req.body as { currentName?: string; newName?: string };
    if (!currentName || !newName || typeof currentName !== 'string' || typeof newName !== 'string') {
      res.status(400).json({ error: 'Thiếu currentName hoặc newName' });
      return;
    }
    const current = safeBasename(currentName);
    const next = safeBasename(newName);
    if (!current || !next) {
      res.status(400).json({ error: 'Tên file không hợp lệ' });
      return;
    }
    const ext = path.extname(current).toLowerCase();
    if (!IMAGE_EXT.includes(ext) || path.extname(next).toLowerCase() !== ext) {
      res.status(400).json({ error: 'Chỉ đổi tên file, giữ nguyên phần mở rộng' });
      return;
    }
    const currentPath = path.join(uploadsDir, current);
    const nextPath = path.join(uploadsDir, next);
    if (!fs.existsSync(currentPath)) {
      res.status(404).json({ error: 'File không tồn tại' });
      return;
    }
    if (fs.existsSync(nextPath)) {
      res.status(400).json({ error: 'Tên mới đã tồn tại' });
      return;
    }
    fs.renameSync(currentPath, nextPath);
    res.json({ imageUrl: `/uploads/${next}` });
  } catch (err) {
    console.error('Rename uploaded failed:', err);
    res.status(500).json({ error: 'Đổi tên thất bại' });
  }
}

export async function deleteUploadedHandler(req: Request, res: Response) {
  try {
    const { filename } = req.body as { filename?: string };
    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ error: 'Thiếu filename' });
      return;
    }
    const base = safeBasename(filename);
    if (!base) {
      res.status(400).json({ error: 'Tên file không hợp lệ' });
      return;
    }
    const filePath = path.join(uploadsDir, base);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File không tồn tại' });
      return;
    }
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete uploaded failed:', err);
    res.status(500).json({ error: 'Xóa file thất bại' });
  }
}

const CARDS_WEB_PREFIX = '/assets/images/cards/';
const CARDS_WEB_PREFIX_ROOT = '/assets/images/cards';

function resolveCardFilePath(webPath: string): string | null {
  if (!webPath.startsWith(CARDS_WEB_PREFIX)) return null;
  const relative = webPath.slice(CARDS_WEB_PREFIX.length).replace(/\\/g, '/');
  if (relative.includes('..') || path.isAbsolute(relative)) return null;
  const fullPath = path.join(imagesBasePath, relative);
  const normalized = path.normalize(fullPath);
  if (!normalized.startsWith(path.normalize(imagesBasePath))) return null;
  return normalized;
}

function resolveCardFolderPath(webPath: string): string | null {
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

export async function renameCardFileHandler(req: Request, res: Response) {
  try {
    const { filePath: webPath, newName } = req.body as { filePath?: string; newName?: string };
    if (!webPath || typeof webPath !== 'string' || !newName || typeof newName !== 'string') {
      res.status(400).json({ error: 'Thiếu filePath hoặc newName' });
      return;
    }
    const base = safeBasename(newName);
    if (!base) {
      res.status(400).json({ error: 'Tên file mới không hợp lệ' });
      return;
    }
    const currentPath = resolveCardFilePath(webPath);
    if (!currentPath) {
      res.status(400).json({ error: 'Đường dẫn không hợp lệ (phải thuộc thư mục cards)' });
      return;
    }
    if (!fs.existsSync(currentPath)) {
      res.status(404).json({ error: 'File không tồn tại' });
      return;
    }
    const stat = fs.statSync(currentPath);
    if (!stat.isFile()) {
      res.status(400).json({ error: 'Chỉ được đổi tên file' });
      return;
    }
    const dir = path.dirname(currentPath);
    const nextPath = path.join(dir, base);
    const normalizedNext = path.normalize(nextPath);
    if (!normalizedNext.startsWith(path.normalize(imagesBasePath))) {
      res.status(400).json({ error: 'Tên file mới không hợp lệ' });
      return;
    }
    if (fs.existsSync(nextPath)) {
      res.status(400).json({ error: 'Tên mới đã tồn tại' });
      return;
    }
    fs.renameSync(currentPath, nextPath);
    const relative = path.relative(imagesBasePath, nextPath).replace(/\\/g, '/');
    res.json({ imageUrl: `${CARDS_WEB_PREFIX}${relative}` });
  } catch (err) {
    console.error('Rename card file failed:', err);
    res.status(500).json({ error: 'Đổi tên thất bại' });
  }
}

export async function moveCardFileHandler(req: Request, res: Response) {
  try {
    const { filePath: webPath, targetFolderPath } = req.body as { filePath?: string; targetFolderPath?: string };
    if (!webPath || typeof webPath !== 'string' || !targetFolderPath || typeof targetFolderPath !== 'string') {
      res.status(400).json({ error: 'Thiếu filePath hoặc targetFolderPath' });
      return;
    }
    const currentPath = resolveCardFilePath(webPath);
    const targetDir = resolveCardFolderPath(targetFolderPath);
    if (!currentPath || !targetDir) {
      res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
      return;
    }
    if (!fs.existsSync(currentPath)) {
      res.status(404).json({ error: 'File không tồn tại' });
      return;
    }
    if (!fs.statSync(currentPath).isFile()) {
      res.status(400).json({ error: 'Chỉ được di chuyển file' });
      return;
    }
    const base = path.basename(currentPath);
    const nextPath = path.join(targetDir, base);
    if (path.normalize(nextPath) === path.normalize(currentPath)) {
      res.status(400).json({ error: 'File đã nằm trong thư mục này' });
      return;
    }
    if (fs.existsSync(nextPath)) {
      res.status(400).json({ error: 'Đã tồn tại file cùng tên trong thư mục đích' });
      return;
    }
    fs.renameSync(currentPath, nextPath);
    const relative = path.relative(imagesBasePath, nextPath).replace(/\\/g, '/');
    res.json({ imageUrl: `${CARDS_WEB_PREFIX}${relative}` });
  } catch (err) {
    console.error('Move card file failed:', err);
    res.status(500).json({ error: 'Di chuyển thất bại' });
  }
}

export async function moveUploadedFileHandler(req: Request, res: Response) {
  try {
    const { filename, targetFolderPath } = req.body as { filename?: string; targetFolderPath?: string };
    if (!filename || typeof filename !== 'string' || !targetFolderPath || typeof targetFolderPath !== 'string') {
      res.status(400).json({ error: 'Thiếu filename hoặc targetFolderPath' });
      return;
    }
    const base = safeBasename(filename);
    if (!base) {
      res.status(400).json({ error: 'Tên file không hợp lệ' });
      return;
    }
    const currentPath = path.join(uploadsDir, base);
    if (!fs.existsSync(currentPath) || !fs.statSync(currentPath).isFile()) {
      res.status(404).json({ error: 'File không tồn tại' });
      return;
    }
    const prefix = '/uploads';
    const targetNorm = targetFolderPath.replace(/\/+$/, '') || prefix;
    if (!targetNorm.startsWith(prefix)) {
      res.status(400).json({ error: 'Thư mục đích phải thuộc /uploads' });
      return;
    }
    let targetDir: string;
    if (targetNorm === '/uploads') {
      targetDir = uploadsDir;
    } else {
      const sub = targetNorm.slice(prefix.length + 1).replace(/\\/g, '/');
      if (sub.includes('..') || path.isAbsolute(sub)) {
        res.status(400).json({ error: 'Thư mục đích không hợp lệ' });
        return;
      }
      targetDir = path.join(uploadsDir, sub);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    }
    const nextPath = path.join(targetDir, base);
    if (path.normalize(nextPath) === path.normalize(currentPath)) {
      res.json({ imageUrl: `/uploads/${base}` });
      return;
    }
    if (fs.existsSync(nextPath)) {
      res.status(400).json({ error: 'Đã tồn tại file cùng tên trong thư mục đích' });
      return;
    }
    fs.renameSync(currentPath, nextPath);
    const relative = path.relative(uploadsDir, nextPath).replace(/\\/g, '/');
    res.json({ imageUrl: `/uploads/${relative}` });
  } catch (err) {
    console.error('Move uploaded file failed:', err);
    res.status(500).json({ error: 'Di chuyển thất bại' });
  }
}

export async function moveUploadedToCardsHandler(req: Request, res: Response) {
  try {
    const { filename, targetFolderPath } = req.body as { filename?: string; targetFolderPath?: string };
    if (!filename || typeof filename !== 'string' || !targetFolderPath || typeof targetFolderPath !== 'string') {
      res.status(400).json({ error: 'Thiếu filename hoặc targetFolderPath' });
      return;
    }
    const base = safeBasename(filename);
    if (!base) {
      res.status(400).json({ error: 'Tên file không hợp lệ' });
      return;
    }
    const sourcePath = path.join(uploadsDir, base);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      res.status(404).json({ error: 'File không tồn tại trong uploaded' });
      return;
    }
    const targetDir = resolveCardFolderPath(targetFolderPath);
    if (!targetDir) {
      res.status(400).json({ error: 'Thư mục đích không hợp lệ (phải thuộc cards)' });
      return;
    }
    const destPath = path.join(targetDir, base);
    if (fs.existsSync(destPath)) {
      res.status(400).json({ error: 'Đã tồn tại file cùng tên trong thư mục đích' });
      return;
    }
    fs.copyFileSync(sourcePath, destPath);
    fs.unlinkSync(sourcePath);
    const relative = path.relative(imagesBasePath, destPath).replace(/\\/g, '/');
    res.json({ imageUrl: `${CARDS_WEB_PREFIX}${relative}` });
  } catch (err) {
    console.error('Move uploaded to cards failed:', err);
    res.status(500).json({ error: 'Di chuyển thất bại' });
  }
}

export async function deleteCardFileHandler(req: Request, res: Response) {
  try {
    const { filePath: webPath } = req.body as { filePath?: string };
    if (!webPath || typeof webPath !== 'string') {
      res.status(400).json({ error: 'Thiếu filePath' });
      return;
    }
    const fullPath = resolveCardFilePath(webPath);
    if (!fullPath) {
      res.status(400).json({ error: 'Đường dẫn không hợp lệ (phải thuộc thư mục cards)' });
      return;
    }
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'File không tồn tại' });
      return;
    }
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      res.status(400).json({ error: 'Chỉ được xóa file, không xóa thư mục' });
      return;
    }
    fs.unlinkSync(fullPath);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete card file failed:', err);
    res.status(500).json({ error: 'Xóa file thất bại' });
  }
}
