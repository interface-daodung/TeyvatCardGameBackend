import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');
const imagesBasePath = path.resolve(rootDir, '../admin-web/public/assets/images/cards');

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: FileTreeItem[];
}

function getImageTree(dirPath: string, webPath: string): FileTreeItem[] {
  const result: FileTreeItem[] = [];

  if (!fs.existsSync(dirPath)) {
    return result;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativeWebPath = webPath ? `${webPath}/${entry.name}` : `/${entry.name}`;

    if (entry.isDirectory()) {
      const children = getImageTree(fullPath, relativeWebPath);
      result.push({
        name: entry.name,
        path: relativeWebPath,
        type: 'dir',
        children,
      });
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.webp')) {
      result.push({
        name: entry.name,
        path: relativeWebPath,
        type: 'file',
      });
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
