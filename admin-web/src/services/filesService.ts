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

  uploadImage: async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post<{ imageUrl: string }>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  renameUploaded: async (currentName: string, newName: string): Promise<{ imageUrl: string }> => {
    const response = await api.patch<{ imageUrl: string }>('/files/uploaded/rename', {
      currentName,
      newName,
    });
    return response.data;
  },

  deleteUploaded: async (filename: string): Promise<void> => {
    await api.delete('/files/uploaded', { data: { filename } });
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

  /** Tạo TeyvatCard/public/assets/images/cards/all-cards.webp + all-cards.json, lưu tạm vào server/atlas và trả link hiển thị */
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
