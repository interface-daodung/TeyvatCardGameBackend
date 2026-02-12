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
};
