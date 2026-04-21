import axios from 'axios';
import api from '../lib/api';

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

export type StagedPreviewKind = 'resize' | 'lossy';

export interface StagedPreviewInfo {
  kind: StagedPreviewKind;
  previewUrl: string;
  targetFilename: string;
  stagedFilename: string;
}

/** Chất lượng WebP tối đa (100) cho nút sticky “Convert to WebP” trong modal chỉnh ảnh upload. Truyền vào `stageConvertToWebpLossy`. */
export const STICKY_BAR_CONVERT_WEBP_QUALITY = 100;

export interface FullImageMetadata {
  file: FileMetadata;
  image: Record<string, unknown>;
  exifBase64?: string;
}

export interface CardClassTreeNode {
  name: string;
  type: 'dir' | 'file';
  path?: string;
  children?: CardClassTreeNode[];
  classes?: string[];
}

export interface CardClassSource {
  className: string;
  filePath: string;
  sourceText: string;
}

export type ModelsClassScope = 'cards' | 'items';

export interface ClassMethodAstNode {
  name: string;
  kind: 'method' | 'constructor' | 'get' | 'set';
  isStatic: boolean;
  parameters: string[];
  returnType?: string;
}

export interface CharacterClassAstMapResult {
  className: string;
  classRelativePath: string;
  parentClassName: string;
  parentRelativePath: string;
  methodMap: Record<string, ClassMethodAstNode[]>;
}

export interface AtlasFileEntry {
  name: string;
  imageUrl: string;
  jsonUrl: string;
  imageMeta: FileMetadata;
  jsonMeta: FileMetadata;
  hasAnimation: boolean;
  scope: 'default' | 'desktop' | 'mobile';
}

export const filesService = {
  getImageTree: async (scope?: string): Promise<FileTreeItem[]> => {
    const response = await api.get<{ tree: FileTreeItem[] }>('/files/image-tree', {
      params: scope ? { scope } : undefined,
    });
    return response.data.tree;
  },

  getCardClassTree: async (scope: ModelsClassScope = 'cards'): Promise<CardClassTreeNode[]> => {
    const response = await api.get<{ tree: CardClassTreeNode[] }>('/files/card-class-tree', {
      params: scope === 'items' ? { scope: 'items' } : undefined,
    });
    return response.data.tree;
  },

  getCardClassSource: async (
    path: string,
    className?: string,
    scope: ModelsClassScope = 'cards'
  ): Promise<CardClassSource> => {
    const response = await api.get<CardClassSource>('/files/card-class-source', {
      params:
        className || scope === 'items'
          ? { path, ...(className ? { className } : {}), ...(scope === 'items' ? { scope: 'items' } : {}) }
          : { path },
    });
    return response.data;
  },

  buildCardClassTsDoc: async (
    path: string,
    className?: string,
    scope: ModelsClassScope = 'cards'
  ): Promise<CardClassSource> => {
    const response = await api.post<CardClassSource>('/files/card-class-tsdoc', {
      path,
      className,
      ...(scope === 'items' ? { scope: 'items' } : {}),
    });
    return response.data;
  },

  saveCardClassSource: async (
    path: string,
    sourceText: string,
    className?: string,
    scope: ModelsClassScope = 'cards'
  ): Promise<CardClassSource> => {
    const response = await api.post<CardClassSource>('/files/card-class-source/save', {
      path,
      sourceText,
      className,
      ...(scope === 'items' ? { scope: 'items' } : {}),
    });
    return response.data;
  },

  getCharacterClassAstMap: async (
    path: string,
    className?: string
  ): Promise<CharacterClassAstMapResult> => {
    const response = await api.get<CharacterClassAstMapResult>('/files/character-class-ast-map', {
      params: className ? { path, className } : { path },
    });
    return response.data;
  },

  getUploadedTree: async (): Promise<FileTreeItem[]> => {
    const response = await api.get<{ tree: FileTreeItem[] }>('/files/uploaded-tree');
    return response.data.tree;
  },

  getAtlasList: async (scope: 'default' | 'desktop' | 'mobile'): Promise<AtlasFileEntry[]> => {
    const response = await api.get<{ items: AtlasFileEntry[] }>('/files/atlas-list', {
      params: { scope },
    });
    return response.data.items;
  },

  deleteAtlas: async (name: string, scope: 'default' | 'desktop' | 'mobile'): Promise<void> => {
    await api.delete('/files/atlas', { data: { name, scope } });
  },

  /**
   * Bản sao từ `server/atlas/desktop|mobile` → `TeyvatCard/public/assets/images/{desktop|mobile}/atlas`
   * (server/atlas không đổi). JSON: `meta.path` = `assets/images/desktop|mobile/atlas/*.webp`.
   */
  exportAtlasToTeyvat: async (
    name: string,
    scope: 'desktop' | 'mobile',
    confirmOverwrite = false
  ): Promise<void> => {
    await api.post('/files/atlas/export-to-teyvat', { name, scope, confirmOverwrite });
  },

  /**
   * Xuất lần lượt desktop + mobile (hoặc mobile trước nếu đang ở tab mobile).
   * Bỏ qua variant không có trên server (404). Một lần 409 → cần gọi lại với confirmOverwrite.
   */
  exportAtlasDualVariantsToTeyvat: async (
    name: string,
    priorityScope: 'default' | 'desktop' | 'mobile',
    confirmOverwrite: boolean
  ): Promise<
    | { ok: true; exported: ('desktop' | 'mobile')[] }
    | { needsOverwrite: true }
    | { ok: false; error: string }
  > => {
    const order: ('desktop' | 'mobile')[] =
      priorityScope === 'mobile' ? ['mobile', 'desktop'] : ['desktop', 'mobile'];
    const exported: ('desktop' | 'mobile')[] = [];
    for (const scope of order) {
      try {
        await api.post('/files/atlas/export-to-teyvat', { name, scope, confirmOverwrite });
        exported.push(scope);
      } catch (err: unknown) {
        const needsOverwrite =
          axios.isAxiosError(err) &&
          err.response?.status === 409 &&
          (err.response?.data as { code?: string })?.code === 'NEEDS_OVERWRITE_CONFIRM';
        if (needsOverwrite) {
          return { needsOverwrite: true };
        }
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          continue;
        }
        const msg =
          axios.isAxiosError(err) && err.response?.data
            ? String((err.response.data as { error?: string }).error ?? 'Xuất atlas thất bại')
            : err instanceof Error
              ? err.message
              : 'Xuất atlas thất bại';
        return { ok: false, error: msg };
      }
    }
    if (exported.length === 0) {
      return {
        ok: false,
        error:
          'Không tìm thấy atlas cùng tên trong server/atlas/desktop hoặc server/atlas/mobile.',
      };
    }
    return { ok: true, exported };
  },

  exportAnimationToTeyvat: async (
    path: string,
    confirmOverwrite: boolean
  ): Promise<void> => {
    await api.post('/files/animations/export-to-teyvat', {
      path,
      confirmOverwrite,
    });
  },

  uploadImage: async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post<{ imageUrl: string }>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  renameUploaded: async (
    currentName: string,
    newName: string,
    currentWebPath?: string
  ): Promise<{ imageUrl: string }> => {
    const response = await api.patch<{ imageUrl: string }>('/files/uploaded/rename', {
      currentName,
      newName,
      ...(currentWebPath ? { currentWebPath } : {}),
    });
    return response.data;
  },

  deleteUploaded: async (filename: string): Promise<void> => {
    await api.delete('/files/uploaded', { data: { filename } });
  },

  deleteAssetsImage: async (filePath: string): Promise<void> => {
    await api.delete('/files/assets', { data: { filePath } });
  },

  renameCardFile: async (filePath: string, newName: string): Promise<{ imageUrl: string }> => {
    const response = await api.patch<{ imageUrl: string }>('/files/cards/rename', {
      filePath,
      newName,
    });
    return response.data;
  },

  renameAssetsFile: async (filePath: string, newName: string): Promise<{ imageUrl: string }> => {
    const response = await api.patch<{ imageUrl: string }>('/files/assets/rename', {
      filePath,
      newName,
    });
    return response.data;
  },

  moveCardFile: async (filePath: string, targetFolderPath: string): Promise<{ imageUrl: string }> => {
    const response = await api.patch<{ imageUrl: string }>('/files/cards/move', {
      filePath,
      targetFolderPath,
    });
    return response.data;
  },

  deleteCardFile: async (filePath: string): Promise<void> => {
    await api.delete('/files/cards', { data: { filePath } });
  },

  moveUploadedFile: async (filename: string, targetFolderPath: string): Promise<{ imageUrl: string }> => {
    const response = await api.patch<{ imageUrl: string }>('/files/uploaded/move', {
      filename,
      targetFolderPath,
    });
    return response.data;
  },

  moveUploadedToCards: async (filename: string, targetFolderPath: string): Promise<{ imageUrl: string }> => {
    const response = await api.patch<{ imageUrl: string }>('/files/uploaded/to-cards', {
      filename,
      targetFolderPath,
    });
    return response.data;
  },

  /**
   * Di chuyển file trong cây Manager Assets (assets images hoặc uploads).
   * Server: `/files/assets/move`, `/files/uploaded/move`, `/files/uploaded/to-assets`.
   */
  moveTreeFile: async (filePath: string, targetFolderPath: string): Promise<{ imageUrl: string }> => {
    const src = filePath.replace(/\\/g, '/');
    const tgt = targetFolderPath.replace(/\/+$/, '');
    if (src.startsWith('/assets/images/')) {
      const response = await api.patch<{ imageUrl: string }>('/files/assets/move', {
        filePath: src,
        targetFolderPath,
      });
      return response.data;
    }
    if (src.startsWith('/uploads/')) {
      if (tgt === '/uploads' || tgt.startsWith('/uploads/')) {
        const response = await api.patch<{ imageUrl: string }>('/files/uploaded/move', {
          filePath: src,
          targetFolderPath,
        });
        return response.data;
      }
      if (tgt === '/assets/images' || tgt.startsWith('/assets/images/')) {
        const response = await api.patch<{ imageUrl: string }>('/files/uploaded/to-assets', {
          filePath: src,
          targetFolderPath,
        });
        return response.data;
      }
    }
    throw new Error('Không thể di chuyển file tới thư mục đích');
  },

  stageConvertToWebpLossy: async (
    filename: string,
    quality: number,
    sourceWebPath?: string
  ): Promise<StagedPreviewInfo> => {
    const response = await api.post<StagedPreviewInfo>('/files/uploaded/stage/convert-webp-lossy', {
      quality,
      ...(sourceWebPath ? { sourceWebPath } : { filename }),
    });
    return response.data;
  },

  stageResizeUploaded: async (
    filename: string,
    width: number,
    height: number,
    sourceWebPath?: string
  ): Promise<StagedPreviewInfo> => {
    const response = await api.post<StagedPreviewInfo>('/files/uploaded/stage/resize', {
      width,
      height,
      ...(sourceWebPath ? { sourceWebPath } : { filename }),
    });
    return response.data;
  },

  stageResizeUploadedToWebpLossy: async (
    filename: string,
    width: number,
    height: number,
    quality: number,
    sourceWebPath?: string
  ): Promise<StagedPreviewInfo> => {
    const response = await api.post<StagedPreviewInfo>('/files/uploaded/stage/resize-webp-lossy', {
      width,
      height,
      quality,
      ...(sourceWebPath ? { sourceWebPath } : { filename }),
    });
    return response.data;
  },

  commitStagedPreview: async (
    payload: Pick<StagedPreviewInfo, 'kind' | 'stagedFilename' | 'targetFilename'>
  ): Promise<{ imageUrl: string }> => {
    const response = await api.post<{ imageUrl: string }>('/files/uploaded/stage/commit', payload);
    return response.data;
  },

  deleteStagedPreview: async (payload: Pick<StagedPreviewInfo, 'kind' | 'stagedFilename'>): Promise<{ success: true }> => {
    const response = await api.post<{ success: true }>('/files/uploaded/stage/discard', payload);
    return response.data;
  },

  convertToWebp: async (filename: string, quality: number): Promise<{ imageUrl: string }> => {
    const response = await api.post<{ imageUrl: string }>('/files/uploaded/convert-webp', {
      filename,
      quality,
    });
    return response.data;
  },

  resizeUploaded: async (filename: string, width: number, height: number): Promise<{ imageUrl: string }> => {
    const response = await api.post<{ imageUrl: string }>('/files/uploaded/resize', {
      filename,
      width,
      height,
    });
    return response.data;
  },

  /** Tạo all-cards.webp + all-cards.json trong `server/atlas` và trả link `/atlas/...` */
  generateAllCardsAtlas: async (): Promise<{
    imageUrl: string;
    jsonUrl: string;
    count: number;
    sheetSize: { w: number; h: number };
  }> => {
    const response = await api.post<{
      imageUrl: string;
      jsonUrl: string;
      count: number;
      sheetSize: { w: number; h: number };
    }>('/files/generate-all-cards-atlas');
    return response.data;
  },

  generateCustomAtlas: async (
    images: string[],
    name: string
  ): Promise<{
    imageUrl: string;
    jsonUrl: string;
    count: number;
    sheetSize: { w: number; h: number };
  }> => {
    const response = await api.post<{
      imageUrl: string;
      jsonUrl: string;
      count: number;
      sheetSize: { w: number; h: number };
    }>('/files/generate-atlas', { images, name });
    return response.data;
  },

  generateAnimationAtlas: async (
    animations: Array<{ path: string; name?: string }>,
    name: string
  ): Promise<{
    imageUrl: string;
    jsonUrl: string;
    count: number;
    sheetSize: { w: number; h: number };
  }> => {
    const response = await api.post<{
      imageUrl: string;
      jsonUrl: string;
      count: number;
      sheetSize: { w: number; h: number };
    }>('/files/generate-animation-atlas', { animations, name });
    return response.data;
  },

  /** Xuất spritesheet đã cắt frame 350×590 và ghép bestGrid → `{name}-bestGrid.webp` trong Spritesheet. */
  exportSpritesheetBestGrid: async (
    path: string
  ): Promise<{
    imageUrl: string;
    sheetSize: { w: number; h: number };
    frameCount: number;
  }> => {
    const response = await api.post<{
      imageUrl: string;
      sheetSize: { w: number; h: number };
      frameCount: number;
    }>('/files/spritesheet-best-grid', { path });
    return response.data;
  },

  /**
   * Cắt từng frame 350×590, resize stretch (fill) 210×360 / 105×180, ghép bestGrid.
   * Ghi `server/uploads/resize/desktop/{name}.webp` và `server/uploads/resize/mobile/{name}.webp`.
   */
  exportSpritesheetResizeVariants: async (path: string) => {
    const response = await api.post<{
      desktop: { imageUrl: string; sheetSize: { w: number; h: number }; frameCount: number };
      mobile: { imageUrl: string; sheetSize: { w: number; h: number }; frameCount: number };
    }>('/files/spritesheet-resize-exports', { path });
    return response.data;
  },

  /** Lưu spritesheet animation (192×… frame) vào public/assets/images/animations. */
  saveAnimationSpritesheet: async (
    blob: Blob,
    filename: string
  ): Promise<{ imageUrl: string }> => {
    const form = new FormData();
    form.append('image', blob, filename);
    form.append('filename', filename);
    const response = await api.post<{ imageUrl: string }>(
      '/files/animation-spritesheet-save',
      form
    );
    return response.data;
  },

  composeAnimationSpritesheet: async (
    path: string,
    frames: number[],
    filename: string
  ): Promise<{ imageUrl: string; frameCount: number; sheetSize: { w: number; h: number } }> => {
    const response = await api.post<{ imageUrl: string; frameCount: number; sheetSize: { w: number; h: number } }>(
      '/files/animation-spritesheet-compose',
      { path, frames, filename }
    );
    return response.data;
  },

  getFileMetadata: async (path: string): Promise<FullImageMetadata> => {
    const response = await api.get<FullImageMetadata>('/files/metadata', {
      params: { path },
    });
    return response.data;
  },
};
