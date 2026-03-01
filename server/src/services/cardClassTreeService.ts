import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Project } from 'ts-morph';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');
const cardsBasePath = process.env.TEYVAT_CARD_MODELS_PATH
  ? path.resolve(process.env.TEYVAT_CARD_MODELS_PATH)
  : path.resolve(rootDir, '../TeyvatCard/src/models/cards');

export interface CardClassTreeNode {
  name: string;
  type: 'dir' | 'file';
  path?: string;
  children?: CardClassTreeNode[];
  classes?: string[];
}

function getExportedClassNames(filePath: string): string[] {
  const names: string[] = [];
  try {
    const project = new Project({ skipAddingFilesFromTsConfig: true });
    const sourceFile = project.addSourceFileAtPath(filePath);
    const classes = sourceFile.getClasses();
    for (const cls of classes) {
      const name = cls.getName();
      if (name && (cls.isDefaultExport() || cls.isExported())) names.push(name);
    }
  } catch {
    // ignore parse errors
  }
  return names;
}

function buildCardClassTree(dirPath: string, relativePath: string): CardClassTreeNode[] {
  const result: CardClassTreeNode[] = [];
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return result;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const children = buildCardClassTree(fullPath, relPath);
      result.push({ name: entry.name, type: 'dir', path: relPath, children });
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      const classes = getExportedClassNames(fullPath);
      result.push({ name: entry.name, type: 'file', path: relPath, classes });
    }
  }
  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  return result;
}

export function getCardClassTree(): CardClassTreeNode[] {
  return buildCardClassTree(cardsBasePath, '');
}
