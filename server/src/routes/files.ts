import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getImageTreeHandler,
  getUploadedTreeHandler,
  uploadMiddleware,
  uploadImageHandler,
  renameUploadedHandler,
  deleteUploadedHandler,
  renameCardFileHandler,
  deleteCardFileHandler,
} from '../controllers/filesController.js';

export const filesRoutes = Router();

filesRoutes.use(authenticate);
filesRoutes.use(authorize('admin', 'moderator'));

filesRoutes.get('/image-tree', getImageTreeHandler);
filesRoutes.get('/uploaded-tree', getUploadedTreeHandler);
filesRoutes.patch('/uploaded/rename', renameUploadedHandler);
filesRoutes.delete('/uploaded', deleteUploadedHandler);
filesRoutes.patch('/cards/rename', renameCardFileHandler);
filesRoutes.delete('/cards', deleteCardFileHandler);

filesRoutes.post('/upload', (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File quá lớn (tối đa 10MB)' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload thất bại' });
    }
    next();
  });
}, uploadImageHandler);
