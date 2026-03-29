import { Response } from 'express';
import {
  buildCardClassTsDoc,
  getCharacterClassAstMap,
  getCardClassSource,
  getCardClassTree,
  getItemClassTree,
  type ModelsClassScope,
  saveCardClassSource,
} from '../services/cardClassTreeService.js';
import { AuthRequest } from '../types/index.js';

function parseModelsScope(value: unknown): ModelsClassScope {
  return value === 'items' ? 'items' : 'cards';
}

export async function getCardClassTreeHandler(req: AuthRequest, res: Response) {
  try {
    const scope = parseModelsScope(req.query.scope);
    const tree = scope === 'items' ? getItemClassTree() : getCardClassTree();
    res.json({ tree });
  } catch (error) {
    console.error('getCardClassTree error:', error);
    res.status(500).json({ error: 'Failed to load card class tree' });
  }
}

export async function getCardClassSourceHandler(req: AuthRequest, res: Response) {
  try {
    const filePath = typeof req.query.path === 'string' ? req.query.path : '';
    const className =
      typeof req.query.className === 'string' && req.query.className.trim().length > 0
        ? req.query.className.trim()
        : undefined;
    const scope = parseModelsScope(req.query.scope);

    if (!filePath) {
      res.status(400).json({ error: 'Missing class file path' });
      return;
    }

    const data = getCardClassSource(filePath, className, scope);
    res.json(data);
  } catch (error) {
    console.error('getCardClassSource error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load class source';
    const status = /not found/i.test(message) ? 404 : 400;
    res.status(status).json({ error: message });
  }
}

export async function buildCardClassTsDocHandler(req: AuthRequest, res: Response) {
  try {
    const filePath = typeof req.body.path === 'string' ? req.body.path : '';
    const className =
      typeof req.body.className === 'string' && req.body.className.trim().length > 0
        ? req.body.className.trim()
        : undefined;
    const scope = parseModelsScope(req.body.scope);

    if (!filePath) {
      res.status(400).json({ error: 'Missing class file path' });
      return;
    }

    const data = buildCardClassTsDoc(filePath, className, scope);
    res.json(data);
  } catch (error) {
    console.error('buildCardClassTsDoc error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate class tsdoc';
    const status = /not found/i.test(message) ? 404 : 400;
    res.status(status).json({ error: message });
  }
}

export async function saveCardClassSourceHandler(req: AuthRequest, res: Response) {
  try {
    const filePath = typeof req.body.path === 'string' ? req.body.path : '';
    const sourceText = typeof req.body.sourceText === 'string' ? req.body.sourceText : '';
    const className =
      typeof req.body.className === 'string' && req.body.className.trim().length > 0
        ? req.body.className.trim()
        : undefined;
    const scope = parseModelsScope(req.body.scope);

    if (!filePath) {
      res.status(400).json({ error: 'Missing class file path' });
      return;
    }
    if (!sourceText.trim()) {
      res.status(400).json({ error: 'Missing source text' });
      return;
    }

    const data = saveCardClassSource({ relativePath: filePath, className, sourceText }, scope);
    res.json(data);
  } catch (error) {
    console.error('saveCardClassSource error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save class source';
    const status = /not found/i.test(message) ? 404 : 400;
    res.status(status).json({ error: message });
  }
}

export async function getCharacterClassAstMapHandler(req: AuthRequest, res: Response) {
  try {
    const filePath = typeof req.query.path === 'string' ? req.query.path : '';
    const className =
      typeof req.query.className === 'string' && req.query.className.trim().length > 0
        ? req.query.className.trim()
        : undefined;

    if (!filePath) {
      res.status(400).json({ error: 'Missing class file path' });
      return;
    }

    const data = getCharacterClassAstMap(filePath, className);
    res.json(data);
  } catch (error) {
    console.error('getCharacterClassAstMap error:', error);
    const message = error instanceof Error ? error.message : 'Failed to build character class AST map';
    const status = /not found/i.test(message) ? 404 : 400;
    res.status(status).json({ error: message });
  }
}
