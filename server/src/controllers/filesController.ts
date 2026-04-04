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

/** Lưu spritesheet animation (buffer) vào assets/images/animations. */
export const animationSpritesheetSaveMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.png' || ext === '.webp') cb(null, true);
    else cb(new Error('Chỉ chấp nhận .png hoặc .webp'));
  },
}).single('image');

export type { FileTreeItem } from '../services/filesService.js';

export async function getImageTreeHandler(req: Request, res: Response) {
  try {
    // `scope` là tên query param FE hiện dùng, nhưng hỗ trợ thêm alias để coi đây là "theme key".
    // Ví dụ: /api/files/image-tree?theme=map-background
    const scopeFromQuery =
      typeof req.query.scope === 'string'
        ? req.query.scope
        : typeof req.query.theme === 'string'
          ? req.query.theme
          : typeof req.query.themeKey === 'string'
            ? req.query.themeKey
            : undefined;

    // Map scope -> basePath + webRoot so `FileTreeItem.path` is always correct.
    // - `map-background`: assets/images/ui/background
    // - `item`: assets/images/item
    // - `manager-assets`: assets/images
    // - `cards-assets` (default): assets/images/cards
    const normalizedScope =
      scopeFromQuery === 'map-background'
        ? 'map-background'
        : scopeFromQuery === 'item'
          ? 'item'
          : scopeFromQuery === 'manager-assets'
            ? 'manager-assets'
            : 'cards-assets';

    const tree =
      normalizedScope === 'map-background'
        ? filesService.getMapBackgroundImageTree()
        : normalizedScope === 'item'
          ? filesService.getItemImageTree()
          : filesService.getImageTree(
              normalizedScope === 'manager-assets' ? filesService.getImagesRootPath() : filesService.getImagesBasePath(),
              normalizedScope === 'manager-assets' ? '/assets/images' : '/assets/images/cards',
            );
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

export async function getAtlasListHandler(req: Request, res: Response) {
  try {
    const scopeRaw = req.query.scope;
    const scope =
      scopeRaw === 'mobile' || scopeRaw === 'desktop' || scopeRaw === 'default'
        ? scopeRaw
        : 'default';
    const items = filesService.listAtlasFiles(scope);
    res.json({ items });
  } catch (err) {
    console.error('Failed to list atlas files:', err);
    res.status(500).json({ error: 'Không đọc được thư mục atlas' });
  }
}

export async function deleteAtlasHandler(req: Request, res: Response) {
  try {
    const { name, scope } = req.body as { name?: string; scope?: string };
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Thiếu name' });
      return;
    }
    const normalizedScope: 'default' | 'desktop' | 'mobile' =
      scope === 'mobile' || scope === 'desktop' ? scope : 'default';
    const result = filesService.deleteAtlasByName(name, normalizedScope);
    if ('error' in result) {
      const status =
        result.error === 'Atlas không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete atlas:', err);
    res.status(500).json({ error: 'Xóa atlas thất bại' });
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
    const { currentName, newName, currentWebPath } = req.body as {
      currentName?: string;
      newName?: string;
      currentWebPath?: string;
    };
    if (!currentName || !newName || typeof currentName !== 'string' || typeof newName !== 'string') {
      res.status(400).json({ error: 'Thiếu currentName hoặc newName' });
      return;
    }
    const result = await filesService.renameUploaded(
      currentName,
      newName,
      typeof currentWebPath === 'string' ? currentWebPath : undefined
    );
    if ('error' in result) {
      let status: number;
      if (result.error === 'File không tồn tại') status = 404;
      else if (result.error === filesService.RENAME_UPLOADED_IO_ERROR) status = 423;
      else status = 400;
      if (status === 400 || status === 423) {
        console.warn('[files] PATCH /uploaded/rename', result.error, { currentName, newName });
      }
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

export async function deleteAssetsImageHandler(req: Request, res: Response) {
  try {
    const { filePath } = req.body as { filePath?: string };
    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({ error: 'Thiếu filePath' });
      return;
    }
    const result = filesService.deleteAssetsImageFile(filePath);
    if ('error' in result) {
      const status =
        result.error === 'File không tồn tại' ? 404 : result.error.includes('hợp lệ') ? 400 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Delete assets image failed:', err);
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

export async function renameAssetsImageFileHandler(req: Request, res: Response) {
  try {
    const { filePath: webPath, newName } = req.body as { filePath?: string; newName?: string };
    if (!webPath || typeof webPath !== 'string' || !newName || typeof newName !== 'string') {
      res.status(400).json({ error: 'Thiếu filePath hoặc newName' });
      return;
    }
    const result = filesService.renameAssetsImageFile(webPath, newName);
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Rename assets image file failed:', err);
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
    const { filename, filePath, targetFolderPath } = req.body as {
      filename?: string;
      filePath?: string;
      targetFolderPath?: string;
    };
    if (!targetFolderPath || typeof targetFolderPath !== 'string') {
      res.status(400).json({ error: 'Thiếu targetFolderPath' });
      return;
    }
    const result =
      filePath && typeof filePath === 'string'
        ? filesService.moveUploadedFileByWebPath(filePath, targetFolderPath)
        : filename && typeof filename === 'string'
          ? filesService.moveUploadedFile(filename, targetFolderPath)
          : null;
    if (result === null) {
      res.status(400).json({ error: 'Thiếu filename hoặc filePath' });
      return;
    }
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

export async function moveAssetsImageFileHandler(req: Request, res: Response) {
  try {
    const { filePath: webPath, targetFolderPath } = req.body as { filePath?: string; targetFolderPath?: string };
    if (!webPath || typeof webPath !== 'string' || !targetFolderPath || typeof targetFolderPath !== 'string') {
      res.status(400).json({ error: 'Thiếu filePath hoặc targetFolderPath' });
      return;
    }
    const result = filesService.moveAssetsImageFile(webPath, targetFolderPath);
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Move assets image file failed:', err);
    res.status(500).json({ error: 'Di chuyển thất bại' });
  }
}

export async function moveUploadedToAssetsImageHandler(req: Request, res: Response) {
  try {
    const { filePath, targetFolderPath } = req.body as { filePath?: string; targetFolderPath?: string };
    if (!filePath || typeof filePath !== 'string' || !targetFolderPath || typeof targetFolderPath !== 'string') {
      res.status(400).json({ error: 'Thiếu filePath hoặc targetFolderPath' });
      return;
    }
    const result = filesService.moveUploadedWebToAssetsImageFolder(filePath, targetFolderPath);
    if ('error' in result) {
      const status = result.error === 'File không tồn tại trong uploaded' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Move uploaded to assets failed:', err);
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

export async function stageConvertToWebpLossyHandler(req: Request, res: Response) {
  try {
    const { filename, quality, sourceWebPath } = req.body as {
      filename?: string;
      quality?: number;
      sourceWebPath?: string;
    };
    const sw = typeof sourceWebPath === 'string' ? sourceWebPath.trim() : '';
    if (!sw && (!filename || typeof filename !== 'string')) {
      res.status(400).json({ error: 'Thiếu filename hoặc sourceWebPath' });
      return;
    }
    const result = await filesService.stageConvertToWebpLossy(
      typeof filename === 'string' ? filename : undefined,
      quality,
      sw || undefined
    );
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Stage convert to webp lossy failed:', err);
    res.status(500).json({ error: 'Stage convert webp thất bại' });
  }
}

export async function stageResizeUploadedHandler(req: Request, res: Response) {
  try {
    const { filename, width: w, height: h, sourceWebPath } = req.body as {
      filename?: string;
      width?: number;
      height?: number;
      sourceWebPath?: string;
    };
    const sw = typeof sourceWebPath === 'string' ? sourceWebPath.trim() : '';
    if (!sw && (!filename || typeof filename !== 'string')) {
      res.status(400).json({ error: 'Thiếu filename hoặc sourceWebPath' });
      return;
    }
    const result = await filesService.stageResizeUploaded(
      typeof filename === 'string' ? filename : undefined,
      w,
      h,
      sw || undefined
    );
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Stage resize uploaded failed:', err);
    res.status(500).json({ error: 'Stage resize thất bại' });
  }
}

export async function stageResizeUploadedToWebpLossyHandler(req: Request, res: Response) {
  try {
    const { filename, width: w, height: h, quality, sourceWebPath } = req.body as {
      filename?: string;
      width?: number;
      height?: number;
      quality?: number;
      sourceWebPath?: string;
    };
    const sw = typeof sourceWebPath === 'string' ? sourceWebPath.trim() : '';
    if (!sw && (!filename || typeof filename !== 'string')) {
      res.status(400).json({ error: 'Thiếu filename hoặc sourceWebPath' });
      return;
    }
    const result = await filesService.stageResizeUploadedToWebpLossy(
      typeof filename === 'string' ? filename : undefined,
      w,
      h,
      quality,
      sw || undefined
    );
    if ('error' in result) {
      const status = result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Stage resize uploaded to webp lossy failed:', err);
    res.status(500).json({ error: 'Stage resize webp lossy thất bại' });
  }
}

export async function commitStagedPreviewHandler(req: Request, res: Response) {
  try {
    const { kind, stagedFilename, targetFilename } = req.body as {
      kind?: string;
      stagedFilename?: string;
      targetFilename?: string;
    };
    if (!kind || (kind !== 'resize' && kind !== 'lossy') || !stagedFilename || !targetFilename) {
      res.status(400).json({ error: 'Thiếu kind/stagedFilename/targetFilename' });
      return;
    }
    const result = await filesService.commitStagedPreview(kind, stagedFilename, targetFilename);
    if ('error' in result) {
      let status: number;
      if (result.error.includes('không tồn tại')) status = 404;
      else if (result.error === filesService.RENAME_UPLOADED_IO_ERROR) status = 423;
      else status = 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Commit staged preview failed:', err);
    res.status(500).json({ error: 'Commit staged preview thất bại' });
  }
}

export async function deleteStagedPreviewHandler(req: Request, res: Response) {
  try {
    const { kind, stagedFilename } = req.body as { kind?: string; stagedFilename?: string };
    if (!kind || (kind !== 'resize' && kind !== 'lossy') || !stagedFilename) {
      res.status(400).json({ error: 'Thiếu kind/stagedFilename' });
      return;
    }
    const result = filesService.deleteStagedPreview(kind, stagedFilename);
    if ('error' in result) {
      const status = result.error.includes('không tồn tại') ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Delete staged preview failed:', err);
    res.status(500).json({ error: 'Xóa staged preview thất bại' });
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

export async function generateCustomAtlasHandler(req: Request, res: Response) {
  try {
    const { images, name } = req.body as { images?: string[]; name?: string };
    if (!name || !Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: 'Thiếu name hoặc danh sách images' });
      return;
    }
    const result = await filesService.generateCustomAtlas(images, name);
    if ('error' in result) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Generate custom atlas failed:', err);
    res.status(500).json({ error: 'Tạo atlas thất bại' });
  }
}

export async function generateAnimationAtlasHandler(req: Request, res: Response) {
  try {
    const { animations, name } = req.body as {
      animations?: Array<{ path?: string; name?: string }>;
      name?: string;
    };
    if (!name || !Array.isArray(animations) || animations.length === 0) {
      res.status(400).json({ error: 'Thiếu name hoặc danh sách animations' });
      return;
    }
    const result = await filesService.generateAnimationAtlas(
      animations
        .filter((a) => typeof a?.path === 'string')
        .map((a) => ({ path: String(a.path), name: typeof a.name === 'string' ? a.name : undefined })),
      name
    );
    if ('error' in result) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Generate animation atlas failed:', err);
    res.status(500).json({ error: 'Tạo animation atlas thất bại' });
  }
}

export async function getFileMetadataHandler(req: Request, res: Response) {
  try {
    const webPath = typeof req.query.path === 'string' ? req.query.path : undefined;
    if (!webPath) {
      res.status(400).json({ error: 'Thiếu path' });
      return;
    }
    const result = await filesService.getFullImageMetadata(webPath);
    if ('error' in result) {
      const status =
        result.error === 'File không tồn tại' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Get file metadata failed:', err);
    res.status(500).json({ error: 'Đọc metadata thất bại' });
  }
}

export async function exportSpritesheetBestGridHandler(req: Request, res: Response) {
  try {
    const bodyPath = (req.body as { path?: string })?.path;
    if (typeof bodyPath !== 'string' || !bodyPath.trim()) {
      res.status(400).json({ error: 'Thiếu path' });
      return;
    }
    const result = await filesService.exportSpritesheetBestGrid(bodyPath.trim());
    if ('error' in result) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Spritesheet bestGrid export failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Xuất thất bại' });
  }
}

export async function saveAnimationSpritesheetHandler(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      res.status(400).json({ error: 'Thiếu image (field: image)' });
      return;
    }
    const bodyFilename = (req.body as { filename?: string })?.filename;
    const original = file.originalname || 'animation.webp';
    const origExt = path.extname(original) || '.webp';
    const origBase = path.basename(original, path.extname(original)) || 'animation';
    const defaultName = `${origBase}-customize${origExt}`;
    const rawName =
      typeof bodyFilename === 'string' && bodyFilename.trim().length > 0 ? bodyFilename : defaultName;
    const result = await filesService.saveAnimationSpritesheetFile(file.buffer, rawName.trim());
    if ('error' in result) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result);
  } catch (err) {
    console.error('Save animation spritesheet failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Lưu thất bại' });
  }
}

export async function composeAnimationSpritesheetHandler(req: Request, res: Response) {
  try {
    const { path: webPath, frames, filename } = req.body as {
      path?: string;
      frames?: number[];
      filename?: string;
    };
    if (typeof webPath !== 'string' || !webPath.trim()) {
      res.status(400).json({ error: 'Thiếu path' });
      return;
    }
    if (!Array.isArray(frames) || frames.length === 0) {
      res.status(400).json({ error: 'Thiếu frames' });
      return;
    }
    if (typeof filename !== 'string' || !filename.trim()) {
      res.status(400).json({ error: 'Thiếu filename' });
      return;
    }
    const result = await filesService.composeAnimationSpritesheetFromSource(
      webPath.trim(),
      frames,
      filename.trim()
    );
    if ('error' in result) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result);
  } catch (err) {
    console.error('Compose animation spritesheet failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Lưu thất bại' });
  }
}
