import path from 'path';
import { Request, Response } from 'express';
import multer from 'multer';
import * as filesService from '../services/filesService.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    filesService.ensureUploadsDir();
    cb(null, filesService.getUploadsDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const base = path.basename(file.originalname, path.extname(file.originalname));
    const safe = base.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 32) || 'image';
    cb(null, `${Date.now()}-${safe}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (filesService.IMAGE_EXT.includes(ext)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh: .png, .jpg, .jpeg, .gif, .webp, .svg, .bmp'));
  },
}).single('image');

export type { FileTreeItem } from '../services/filesService.js';

export async function getImageTreeHandler(_req: Request, res: Response) {
  try {
    const tree = filesService.getImageTree(filesService.getImagesBasePath(), '/assets/images/cards');
    res.json({ tree });
  } catch (err) {
    console.error('Failed to read image tree:', err);
    res.status(500).json({ error: 'Failed to read image folder structure' });
  }
}

export async function getUploadedTreeHandler(_req: Request, res: Response) {
  try {
    filesService.ensureUploadsDir();
    const tree = filesService.getImageTree(filesService.getUploadsDir(), '/uploads', true);
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
    res.status(201).json({ imageUrl: `/uploads/${req.file.filename}` });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Upload thất bại' });
  }
}

export async function renameUploadedHandler(req: Request, res: Response) {
  try {
    const { currentName, newName } = req.body as { currentName?: string; newName?: string };
    if (!currentName || !newName || typeof currentName !== 'string' || typeof newName !== 'string') {
      res.status(400).json({ error: 'Thiếu currentName hoặc newName' });
      return;
    }
    const result = filesService.renameUploaded(currentName, newName);
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
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
    const result = filesService.deleteUploaded(filename);
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Delete uploaded failed:', err);
    res.status(500).json({ error: 'Xóa file thất bại' });
  }
}

export async function renameCardFileHandler(req: Request, res: Response) {
  try {
    const { filePath: webPath, newName } = req.body as { filePath?: string; newName?: string };
    if (!webPath || typeof webPath !== 'string' || !newName || typeof newName !== 'string') {
      res.status(400).json({ error: 'Thiếu filePath hoặc newName' });
      return;
    }
    const result = filesService.renameCardFile(webPath, newName, filesService.getImagesBasePath());
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
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
    const result = filesService.moveCardFile(webPath, targetFolderPath, filesService.getImagesBasePath());
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
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
    const result = filesService.moveUploadedFile(filename, targetFolderPath);
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
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
    const result = filesService.moveUploadedToCards(filename, targetFolderPath, filesService.getImagesBasePath());
    if ('error' in result) {
      const status = result.error === 'File không tồn tại trong uploaded' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Move uploaded to cards failed:', err);
    res.status(500).json({ error: 'Di chuyển thất bại' });
  }
}

export async function convertToWebpHandler(req: Request, res: Response) {
  try {
    const { filename, quality } = req.body as { filename?: string; quality?: number };
    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ error: 'Thiếu filename' });
      return;
    }
    const result = await filesService.convertToWebp(filename, quality);
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Convert to webp failed:', err);
    res.status(500).json({ error: 'Chuyển webp thất bại' });
  }
}

export async function resizeUploadedHandler(req: Request, res: Response) {
  try {
    const { filename, width: w, height: h } = req.body as { filename?: string; width?: number; height?: number };
    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ error: 'Thiếu filename' });
      return;
    }
    const result = await filesService.resizeUploaded(filename, w, h);
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Resize uploaded failed:', err);
    res.status(500).json({ error: 'Resize thất bại' });
  }
}

export async function deleteCardFileHandler(req: Request, res: Response) {
  try {
    const { filePath: webPath } = req.body as { filePath?: string };
    if (!webPath || typeof webPath !== 'string') {
      res.status(400).json({ error: 'Thiếu filePath' });
      return;
    }
    const result = filesService.deleteCardFile(webPath, filesService.getImagesBasePath());
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Delete card file failed:', err);
    res.status(500).json({ error: 'Xóa file thất bại' });
  }
}

export async function generateAllCardsAtlasHandler(_req: Request, res: Response) {
  try {
    const result = await filesService.generateAllCardsAtlas();
    if ('error' in result) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Generate all-cards atlas failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Tạo atlas thất bại' });
  }
}
