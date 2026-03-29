import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Project } from 'ts-morph';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');
const cardsBasePath = process.env.TEYVAT_CARD_MODELS_PATH
  ? path.resolve(process.env.TEYVAT_CARD_MODELS_PATH)
  : path.resolve(rootDir, '../TeyvatCard/src/models/cards');

const itemsBasePath = process.env.TEYVAT_ITEM_MODELS_PATH
  ? path.resolve(process.env.TEYVAT_ITEM_MODELS_PATH)
  : path.resolve(rootDir, '../TeyvatCard/src/models/items');

export type ModelsClassScope = 'cards' | 'items';

function getModelsRootPath(scope: ModelsClassScope): string {
  return scope === 'items' ? itemsBasePath : cardsBasePath;
}

export interface CardClassTreeNode {
  name: string;
  type: 'dir' | 'file';
  path?: string;
  children?: CardClassTreeNode[];
  classes?: string[];
}

export interface CardClassSourceResult {
  className: string;
  filePath: string;
  sourceText: string;
}

export interface SaveCardClassSourceInput {
  relativePath: string;
  className?: string;
  sourceText: string;
}

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

function resolveClassFilePath(relativePath: string, scope: ModelsClassScope = 'cards'): string {
  const normalizedRelativePath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalizedRelativePath.endsWith('.ts') || normalizedRelativePath.includes('..')) {
    throw new Error('Invalid class file path');
  }

  const base = getModelsRootPath(scope);
  const fullPath = path.resolve(base, normalizedRelativePath);
  if (!fullPath.startsWith(path.resolve(base))) {
    throw new Error('Invalid class file path');
  }
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    throw new Error('Class file not found');
  }
  return fullPath;
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

function getClassMethodNodes(classDecl: import('ts-morph').ClassDeclaration): ClassMethodAstNode[] {
  const methods: ClassMethodAstNode[] = [];
  for (const ctor of classDecl.getConstructors()) {
    methods.push({
      name: 'constructor',
      kind: 'constructor',
      isStatic: false,
      parameters: ctor.getParameters().map((p) => p.getName()),
    });
  }
  for (const method of classDecl.getMethods()) {
    methods.push({
      name: method.getName(),
      kind: 'method',
      isStatic: method.isStatic(),
      parameters: method.getParameters().map((p) => p.getName()),
      returnType: method.getReturnType().getText(method),
    });
  }
  for (const getter of classDecl.getGetAccessors()) {
    methods.push({
      name: getter.getName(),
      kind: 'get',
      isStatic: getter.isStatic(),
      parameters: [],
      returnType: getter.getReturnType().getText(getter),
    });
  }
  for (const setter of classDecl.getSetAccessors()) {
    methods.push({
      name: setter.getName(),
      kind: 'set',
      isStatic: setter.isStatic(),
      parameters: setter.getParameters().map((p) => p.getName()),
      returnType: 'void',
    });
  }
  return methods;
}

function getExportedClassNames(filePath: string): string[] {
  const names: string[] = [];
  try {
    const project = new Project({ skipAddingFilesFromTsConfig: true });
    const sourceFile = project.addSourceFileAtPath(filePath);
    const classes = sourceFile.getClasses();
    const defaultExportNames: string[] = [];

    for (const cls of classes) {
      const name = cls.getName();
      if (!name) continue;
      if (cls.isDefaultExport()) defaultExportNames.push(name);
      // fallback for files without default export
      if (cls.isExported()) names.push(name);
    }

    // Only care about `export default class ...` in the UI.
    // If a file has no default export, fall back to exported classes to avoid empty results.
    if (defaultExportNames.length > 0) {
      return [defaultExportNames[0]];
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

function getTokenFingerprint(sourceText: string): string {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    sourceText
  );
  const tokens: string[] = [];
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    tokens.push(`${token}:${scanner.getTokenText()}`);
    token = scanner.scan();
  }
  return tokens.join('|');
}

function isLogicIdenticalIgnoringComments(oldCode: string, newCode: string): boolean {
  return getTokenFingerprint(oldCode) === getTokenFingerprint(newCode);
}

export function getCardClassTree(): CardClassTreeNode[] {
  return buildCardClassTree(cardsBasePath, '');
}

export function getItemClassTree(): CardClassTreeNode[] {
  return buildCardClassTree(itemsBasePath, '');
}

export function getModelsClassTree(scope: ModelsClassScope): CardClassTreeNode[] {
  return buildCardClassTree(getModelsRootPath(scope), '');
}

export function getCardClassSource(
  relativePath: string,
  className?: string,
  scope: ModelsClassScope = 'cards'
): CardClassSourceResult {
  const normalizedRelativePath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const fullPath = resolveClassFilePath(relativePath, scope);

  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(fullPath);
  const classes = sourceFile.getClasses();
  if (!classes.length) {
    throw new Error('No class found in file');
  }

  const classDecl = className
    ? sourceFile.getClass(className) ?? classes[0]
    : classes[0];

  const resolvedClassName = classDecl.getName() ?? className ?? 'UnknownClass';
  const sourceText = classDecl.getText();

  return {
    className: resolvedClassName,
    filePath: normalizedRelativePath,
    sourceText,
  };
}

export function buildCardClassTsDoc(
  relativePath: string,
  className?: string,
  scope: ModelsClassScope = 'cards'
): CardClassSourceResult {
  const normalizedRelativePath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const fullPath = resolveClassFilePath(relativePath, scope);
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(fullPath);
  const classes = sourceFile.getClasses();
  if (!classes.length) {
    throw new Error('No class found in file');
  }

  const classDecl = className
    ? sourceFile.getClass(className) ?? classes[0]
    : classes[0];
  const resolvedClassName = classDecl.getName() ?? className ?? 'UnknownClass';

  if (classDecl.getJsDocs().length === 0) {
    classDecl.addJsDoc({
      description: `${resolvedClassName} class.`,
      tags: [{ tagName: 'description', text: `Auto-generated TSDoc for ${resolvedClassName}.` }],
    });
  }

  for (const method of classDecl.getMethods()) {
    if (method.getJsDocs().length > 0) continue;
    const methodName = method.getName();
    const parameters = method.getParameters().map((p) => p.getName());
    const returnType = method.getReturnType().getText(method);
    const tags = parameters.map((name) => ({ tagName: 'param', text: `${name} TODO` }));
    if (returnType !== 'void') {
      tags.push({ tagName: 'returns', text: 'TODO' });
    }
    method.addJsDoc({
      description: `${methodName} method.`,
      tags,
    });
  }

  return {
    className: resolvedClassName,
    filePath: normalizedRelativePath,
    sourceText: classDecl.getText(),
  };
}

export function saveCardClassSource(
  input: SaveCardClassSourceInput,
  scope: ModelsClassScope = 'cards'
): CardClassSourceResult {
  const normalizedRelativePath = input.relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const fullPath = resolveClassFilePath(input.relativePath, scope);
  const sourceText = input.sourceText?.trim();
  if (!sourceText) {
    throw new Error('Source text is required');
  }

  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(fullPath);
  const classes = sourceFile.getClasses();
  if (!classes.length) {
    throw new Error('No class found in file');
  }
  const classDecl = input.className
    ? sourceFile.getClass(input.className) ?? classes[0]
    : classes[0];
  const oldClassText = classDecl.getText();

  if (!isLogicIdenticalIgnoringComments(oldClassText, sourceText)) {
    throw new Error(
      'Save blocked: only TSDoc/comments updates are allowed; class AST logic changed.'
    );
  }

  classDecl.replaceWithText(sourceText);
  sourceFile.saveSync();

  const updatedClass = input.className
    ? sourceFile.getClass(input.className) ?? sourceFile.getClasses()[0]
    : sourceFile.getClasses()[0];

  return {
    className: updatedClass.getName() ?? input.className ?? 'UnknownClass',
    filePath: normalizedRelativePath,
    sourceText: updatedClass.getText(),
  };
}

export function getCharacterClassAstMap(relativePath: string, className?: string): CharacterClassAstMapResult {
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const fullPath = resolveClassFilePath(relativePath, 'cards');
  const parentRelativePath = 'modules/typeCard/character.ts';
  const parentBasePath = process.env.TEYVAT_CARD_MODELS_PATH
    ? path.resolve(path.dirname(cardsBasePath), '../modules/typeCard')
    : path.resolve(rootDir, '../TeyvatCard/src/modules/typeCard');
  const parentFullPath = path.resolve(parentBasePath, 'character.ts');
  if (!fs.existsSync(parentFullPath) || !fs.statSync(parentFullPath).isFile()) {
    throw new Error('Parent class file not found');
  }

  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(fullPath);
  const parentSourceFile = project.addSourceFileAtPath(parentFullPath);

  const classes = sourceFile.getClasses();
  if (!classes.length) throw new Error('No class found in file');
  const classDecl = className ? sourceFile.getClass(className) ?? classes[0] : classes[0];
  const resolvedClassName = classDecl.getName() ?? className ?? 'UnknownClass';

  const parentClasses = parentSourceFile.getClasses();
  if (!parentClasses.length) throw new Error('No parent class found in character.ts');
  const parentClassDecl = parentSourceFile.getClass('Character') ?? parentClasses[0];
  const resolvedParentClassName = parentClassDecl.getName() ?? 'Character';

  return {
    className: resolvedClassName,
    classRelativePath: normalizedRelativePath,
    parentClassName: resolvedParentClassName,
    parentRelativePath,
    methodMap: {
      [resolvedClassName]: getClassMethodNodes(classDecl),
      [resolvedParentClassName]: getClassMethodNodes(parentClassDecl),
    },
  };
}
