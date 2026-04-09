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
  deleteAssetsImageHandler,
  renameCardFileHandler,
  renameAssetsImageFileHandler,
  moveCardFileHandler,
  deleteCardFileHandler,
  moveUploadedFileHandler,
  moveUploadedToCardsHandler,
  moveAssetsImageFileHandler,
  moveUploadedToAssetsImageHandler,
  convertToWebpHandler,
  resizeUploadedHandler,
  stageConvertToWebpLossyHandler,
  stageResizeUploadedHandler,
  stageResizeUploadedToWebpLossyHandler,
  commitStagedPreviewHandler,
  deleteStagedPreviewHandler,
  generateAllCardsAtlasHandler,
  getFileMetadataHandler,
  generateCustomAtlasHandler,
  generateAnimationAtlasHandler,
  getAtlasListHandler,
  exportSpritesheetBestGridHandler,
  animationSpritesheetSaveMiddleware,
  saveAnimationSpritesheetHandler,
  composeAnimationSpritesheetHandler,
  deleteAtlasHandler,
  exportAtlasToTeyvatHandler,
} from '../controllers/filesController.js';
import {
  buildCardClassTsDocHandler,
  getCharacterClassAstMapHandler,
  getCardClassSourceHandler,
  getCardClassTreeHandler,
  saveCardClassSourceHandler,
} from '../controllers/cardClassTreeController.js';

export const filesRoutes = Router();

filesRoutes.use(authenticate);
filesRoutes.use(authorize('admin', 'moderator'));

filesRoutes.get('/image-tree', getImageTreeHandler);
filesRoutes.get('/card-class-tree', getCardClassTreeHandler);
filesRoutes.get('/card-class-source', getCardClassSourceHandler);
filesRoutes.get('/character-class-ast-map', getCharacterClassAstMapHandler);
filesRoutes.post('/card-class-tsdoc', buildCardClassTsDocHandler);
filesRoutes.post('/card-class-source/save', saveCardClassSourceHandler);
filesRoutes.get('/uploaded-tree', getUploadedTreeHandler);
filesRoutes.get('/atlas-list', getAtlasListHandler);
filesRoutes.delete('/atlas', deleteAtlasHandler);
filesRoutes.post('/atlas/export-to-teyvat', exportAtlasToTeyvatHandler);
filesRoutes.get('/metadata', getFileMetadataHandler);
filesRoutes.post('/generate-atlas', generateCustomAtlasHandler);
filesRoutes.post('/generate-animation-atlas', generateAnimationAtlasHandler);
filesRoutes.patch('/uploaded/rename', renameUploadedHandler);
filesRoutes.delete('/uploaded', deleteUploadedHandler);
filesRoutes.delete('/assets', deleteAssetsImageHandler);
filesRoutes.patch('/cards/rename', renameCardFileHandler);
filesRoutes.patch('/assets/rename', renameAssetsImageFileHandler);
filesRoutes.patch('/cards/move', moveCardFileHandler);
filesRoutes.delete('/cards', deleteCardFileHandler);
filesRoutes.patch('/assets/move', moveAssetsImageFileHandler);
filesRoutes.patch('/uploaded/move', moveUploadedFileHandler);
filesRoutes.patch('/uploaded/to-assets', moveUploadedToAssetsImageHandler);
filesRoutes.patch('/uploaded/to-cards', moveUploadedToCardsHandler);
filesRoutes.post('/uploaded/convert-webp', convertToWebpHandler);
filesRoutes.post('/uploaded/resize', resizeUploadedHandler);
filesRoutes.post('/uploaded/stage/convert-webp-lossy', stageConvertToWebpLossyHandler);
filesRoutes.post('/uploaded/stage/resize', stageResizeUploadedHandler);
filesRoutes.post('/uploaded/stage/resize-webp-lossy', stageResizeUploadedToWebpLossyHandler);
filesRoutes.post('/uploaded/stage/commit', commitStagedPreviewHandler);
filesRoutes.post('/uploaded/stage/discard', deleteStagedPreviewHandler);
filesRoutes.post('/generate-all-cards-atlas', generateAllCardsAtlasHandler);
filesRoutes.post('/spritesheet-best-grid', exportSpritesheetBestGridHandler);

filesRoutes.post(
  '/animation-spritesheet-save',
  (req: Request, res: Response, next: NextFunction) => {
    animationSpritesheetSaveMiddleware(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File quá lớn (tối đa 20MB)' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload thất bại' });
      }
      next();
    });
  },
  saveAnimationSpritesheetHandler
);
filesRoutes.post('/animation-spritesheet-compose', composeAnimationSpritesheetHandler);

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
