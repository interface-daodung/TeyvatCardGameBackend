import api from '../lib/api';

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: FileTreeItem[];
}

export const filesService = {
  getImageTree: async (): Promise<FileTreeItem[]> => {
    const response = await api.get<{ tree: FileTreeItem[] }>('/files/image-tree');
    return response.data.tree;
  },

  getUploadedTree: async (): Promise<FileTreeItem[]> => {
    const response = await api.get<{ tree: FileTreeItem[] }>('/files/uploaded-tree');
    return response.data.tree;
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
};
