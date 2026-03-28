import type { FieldTypeSummary } from '../../services/databaseManagementService';

export function splitFieldPath(path: string): string[] {
  if (!path) return [];
  return path.split('.');
}

/** Mọi prefix doc path (a, a.b, a.b.c) — dùng cho graph + trie. */
export function buildPrefixPaths(fullPath: string): string[] {
  const segments = splitFieldPath(fullPath);
  const out: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    out.push(segments.slice(0, i + 1).join('.'));
  }
  return out;
}

export function buildPathToSummaryMap(summaries: FieldTypeSummary[]): Map<string, FieldTypeSummary> {
  return new Map(summaries.map((s) => [s.path, s]));
}

export function collectGraphPathsFromLeafSummaries(summaries: FieldTypeSummary[]): Set<string> {
  const set = new Set<string>();
  for (const s of summaries) {
    for (const p of buildPrefixPaths(s.path)) {
      set.add(p);
    }
  }
  return set;
}

export type FieldPathEdge = { from: string; to: string };

export function buildFieldPathGraph(paths: Set<string>): { nodeIds: string[]; edges: FieldPathEdge[] } {
  const edgeKeys = new Set<string>();
  const nodeSet = new Set<string>(paths);

  for (const fullPath of paths) {
    const prefixes = buildPrefixPaths(fullPath);
    for (let i = 1; i < prefixes.length; i++) {
      const from = prefixes[i - 1];
      const to = prefixes[i];
      edgeKeys.add(`${from}\n${to}`);
    }
  }

  const edges: FieldPathEdge[] = Array.from(edgeKeys).map((k) => {
    const [from, to] = k.split('\n');
    return { from, to };
  });

  return {
    nodeIds: Array.from(nodeSet).sort((a, b) => a.localeCompare(b)),
    edges,
  };
}

export type FieldPathTrieNode = {
  segment: string;
  path: string;
  children: FieldPathTrieNode[];
};

function insertPath(siblings: FieldPathTrieNode[], fullPath: string) {
  const segs = splitFieldPath(fullPath);
  let built = '';
  let level = siblings;
  for (let i = 0; i < segs.length; i++) {
    built = i === 0 ? segs[0] : `${built}.${segs[i]}`;
    let node = level.find((n) => n.path === built);
    if (!node) {
      node = { segment: segs[i], path: built, children: [] };
      level.push(node);
    }
    level = node.children;
  }
}

function sortTrieNodes(nodes: FieldPathTrieNode[]) {
  nodes.sort((a, b) => a.segment.localeCompare(b.segment));
  for (const n of nodes) sortTrieNodes(n.children);
}

/** Cây folder từ tập mọi prefix path (sau filter). */
export function buildTrieFromPathSet(paths: Set<string>): FieldPathTrieNode[] {
  const roots: FieldPathTrieNode[] = [];
  const sortedPaths = Array.from(paths).sort((a, b) => a.localeCompare(b));
  for (const p of sortedPaths) {
    insertPath(roots, p);
  }
  sortTrieNodes(roots);
  return roots;
}

export function pathDepth(path: string): number {
  if (!path) return 0;
  return splitFieldPath(path).length;
}

/** Bố cục theo tầng: depth → danh sách path đã sort → x theo chỉ số. */
export function layoutFieldPathNodes(
  nodeIds: string[],
  options: { stepX: number; stepY: number }
): Map<string, { x: number; y: number }> {
  const { stepX, stepY } = options;
  const byDepth = new Map<number, string[]>();
  for (const id of nodeIds) {
    const d = pathDepth(id);
    const list = byDepth.get(d) ?? [];
    list.push(id);
    byDepth.set(d, list);
  }
  for (const [, list] of byDepth) {
    list.sort((a, b) => a.localeCompare(b));
  }
  const pos = new Map<string, { x: number; y: number }>();
  for (const [depth, row] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
    row.forEach((id, idx) => {
      pos.set(id, { x: idx * stepX, y: depth * stepY });
    });
  }
  return pos;
}
