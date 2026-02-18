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

  deleteCardFile: async (filePath: string): Promise<void> => {
    await api.delete('/files/cards', { data: { filePath } });
  },
};
