import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { TabPanelLoading } from './TabPanelLoading';

const DEFAULT_ROOT_PREFIX = '/assets/images/Spritesheet';

function stripRootWebPrefix(filePath: string, rootPrefix: string): string {
  const p = filePath.replace(/\\/g, '/');
  const r = rootPrefix.replace(/\\/g, '/').replace(/\/+$/, '');
  const pl = p.toLowerCase();
  const rl = r.toLowerCase();
  if (pl === rl) return '';
  const prefix = `${rl}/`;
  if (!pl.startsWith(prefix)) return '';
  return p.slice(r.length + 1);
}

export type SpritesheetFileOption = {
  path: string;
  name: string;
};

export type SpritesheetTreeNode =
  | { type: 'dir'; name: string; folderId: string; children: SpritesheetTreeNode[] }
  | { type: 'file'; name: string; path: string };

function sortTree(nodes: SpritesheetTreeNode[]): SpritesheetTreeNode[] {
  const dirs = nodes.filter((n): n is Extract<SpritesheetTreeNode, { type: 'dir' }> => n.type === 'dir');
  const files = nodes.filter((n): n is Extract<SpritesheetTreeNode, { type: 'file' }> => n.type === 'file');
  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));
  for (const d of dirs) {
    d.children = sortTree(d.children);
  }
  return [...dirs, ...files];
}

function insertInto(
  nodes: SpritesheetTreeNode[],
  parts: string[],
  file: SpritesheetFileOption,
  parentPrefix: string
) {
  if (parts.length === 1) {
    nodes.push({ type: 'file', name: parts[0], path: file.path });
    return;
  }
  const [first, ...rest] = parts;
  const folderId = `${parentPrefix}/${first}`;
  let dir = nodes.find(
    (n): n is Extract<SpritesheetTreeNode, { type: 'dir' }> => n.type === 'dir' && n.name === first
  );
  if (!dir) {
    dir = { type: 'dir', name: first, folderId, children: [] };
    nodes.push(dir);
  }
  insertInto(dir.children, rest, file, folderId);
}

export function buildSpritesheetFolderTree(
  files: SpritesheetFileOption[],
  rootWebPrefix: string = DEFAULT_ROOT_PREFIX
): SpritesheetTreeNode[] {
  const root: SpritesheetTreeNode[] = [];
  const norm = rootWebPrefix.replace(/\\/g, '/').replace(/\/+$/, '');
  for (const f of files) {
    const rel = stripRootWebPrefix(f.path, norm);
    const parts = rel.split('/').filter(Boolean);
    if (parts.length === 0) continue;
    insertInto(root, parts, f, norm);
  }
  return sortTree(root);
}

function collectFolderIds(nodes: SpritesheetTreeNode[]): string[] {
  const ids: string[] = [];
  for (const n of nodes) {
    if (n.type === 'dir') {
      ids.push(n.folderId);
      ids.push(...collectFolderIds(n.children));
    }
  }
  return ids;
}

type TreeRowProps = {
  nodes: SpritesheetTreeNode[];
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  expanded: Set<string>;
  onToggle: (folderId: string) => void;
};

function TreeRows({ nodes, depth, selectedPath, onSelect, expanded, onToggle }: TreeRowProps) {
  return (
    <ul className={depth === 0 ? 'space-y-0.5' : 'mt-0.5 space-y-0.5 border-l border-border/60 pl-1.5'}>
      {nodes.map((node) => {
        if (node.type === 'file') {
          const active = selectedPath === node.path;
          return (
            <li key={node.path}>
              <button
                type="button"
                onClick={() => onSelect(node.path)}
                className={cn(
                  'flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs transition-colors',
                  active
                    ? 'bg-primary/15 font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                style={{ paddingLeft: depth === 0 ? 4 : 6 }}
              >
                <span className="shrink-0 text-[10px] opacity-70">🖼️</span>
                <span className="min-w-0 truncate">{node.name}</span>
              </button>
            </li>
          );
        }
        const isOpen = expanded.has(node.folderId);
        return (
          <li key={node.folderId}>
            <div className="flex items-center gap-0.5" style={{ paddingLeft: depth === 0 ? 0 : 4 }}>
              <button
                type="button"
                className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                aria-expanded={isOpen}
                onClick={() => onToggle(node.folderId)}
              >
                <span className="text-[10px]">{isOpen ? '▼' : '▶'}</span>
              </button>
              <span className="min-w-0 truncate text-xs font-medium text-foreground">📁 {node.name}</span>
            </div>
            {isOpen && node.children.length > 0 && (
              <TreeRows
                nodes={node.children}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                expanded={expanded}
                onToggle={onToggle}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

type SpritesheetFolderTreeProps = {
  files: SpritesheetFileOption[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  /** Đang tải danh sách file từ cây assets. */
  loading?: boolean;
  className?: string;
  /** Gốc web cho cây (vd. `/assets/images/animations`). */
  rootWebPrefix?: string;
  emptyMessage?: string;
};

export function SpritesheetFolderTree({
  files,
  selectedPath,
  onSelect,
  loading,
  className,
  rootWebPrefix = DEFAULT_ROOT_PREFIX,
  emptyMessage,
}: SpritesheetFolderTreeProps) {
  const tree = useMemo(() => buildSpritesheetFolderTree(files, rootWebPrefix), [files, rootWebPrefix]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpanded(new Set(collectFolderIds(tree)));
  }, [tree]);

  const onToggle = (folderId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  return (
    <div
      className={cn(
        'relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-input bg-muted/30',
        className
      )}
    >
      <TabPanelLoading show={Boolean(loading)} label="Loading list…" />
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!loading && tree.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {emptyMessage ?? 'No files in Spritesheet yet.'}
          </p>
        )}
        {!loading && tree.length > 0 && (
          <TreeRows
            nodes={tree}
            depth={0}
            selectedPath={selectedPath}
            onSelect={onSelect}
            expanded={expanded}
            onToggle={onToggle}
          />
        )}
      </div>
    </div>
  );
}
