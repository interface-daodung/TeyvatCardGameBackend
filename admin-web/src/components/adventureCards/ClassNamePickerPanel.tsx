import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  filesService,
  type CardClassTreeNode,
  type ModelsClassScope,
} from '../../services/filesService';

function filterTreeToSubfolder(
  nodes: CardClassTreeNode[] | null,
  subfolder: string | undefined
): CardClassTreeNode[] | null {
  if (!nodes || !subfolder) return nodes;
  const dir = nodes.find((n) => n.type === 'dir' && n.name === subfolder);
  return dir?.children ?? [];
}

export type ClassPickerSelectionMode = 'className' | 'relativePath';

interface ClassNamePickerPanelProps {
  /** Nếu trả về `false` (sync hoặc Promise), panel không đóng (ví dụ trùng nameId). */
  onSelect: (value: string) => void | boolean | Promise<void | boolean>;
  onClose: () => void;
  currentValue?: string;
  /** Chỉ hiển thị nhánh con của thư mục này trong `TeyvatCard/src/models/cards` (vd: `character`). */
  subfolder?: string;
  /** `cards` (mặc định) hoặc `items` — cây từ `models/cards` / `models/items`. */
  modelsScope?: ModelsClassScope;
  /**
   * `className`: giá trị chọn là tên class export default (như cũ).
   * `relativePath`: giá trị là `path` file `.ts` tương đối so với thư mục models (vd: `Foo.ts`).
   */
  selectionMode?: ClassPickerSelectionMode;
  title?: string;
}

export function ClassNamePickerPanel({
  onSelect,
  onClose,
  currentValue = '',
  subfolder,
  modelsScope = 'cards',
  selectionMode = 'className',
  title = 'Chọn Class name',
}: ClassNamePickerPanelProps) {
  const [tree, setTree] = useState<CardClassTreeNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const displayTree = useMemo(
    () => filterTreeToSubfolder(tree, subfolder),
    [tree, subfolder]
  );

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await filesService.getCardClassTree(modelsScope);
      setTree(data);
      setExpanded(new Set());
    } catch {
      setError('Không tải được danh sách class.');
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, [modelsScope]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      if (prev.has(path)) {
        return new Set([...prev].filter((p) => p !== path && !p.startsWith(path + '/')));
      }
      const ancestors = path.split('/').slice(0, -1).reduce<string[]>((acc, _, i, parts) => {
        acc.push(parts.slice(0, i + 1).join('/'));
        return acc;
      }, []);
      return new Set([...ancestors, path]);
    });
  };

  const handleSelect = async (className: string) => {
    try {
      const result = onSelect(className);
      const resolved = result instanceof Promise ? await result : result;
      if (resolved !== false) onClose();
    } catch {
      // Giữ panel mở khi lỗi
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg bg-card overflow-hidden shadow-xl border border-border flex-shrink-0 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-emerald-500 rounded transition-colors text-xl leading-none"
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto min-h-[200px] max-h-[60vh]">
        {loading && (
          <p className="text-sm text-muted-foreground">Đang tải cây thư mục...</p>
        )}
        {error && (
          <p className="text-sm text-destructive mb-2">{error}</p>
        )}
        {!loading && displayTree && displayTree.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">
            {subfolder
              ? `Không có file .ts trong TeyvatCard/src/models/${modelsScope === 'items' ? 'items' : 'cards'}/${subfolder}`
              : `Không có file .ts trong TeyvatCard/src/models/${modelsScope === 'items' ? 'items' : 'cards'}`}
          </p>
        )}
        {!loading && displayTree && displayTree.length > 0 && (
          <TreeNodeList
            nodes={displayTree}
            parentPath=""
            expanded={expanded}
            onToggle={toggle}
            onSelectClass={handleSelect}
            currentValue={currentValue}
            selectionMode={selectionMode}
          />
        )}
      </div>
      <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
        Bấm vào tên file .ts để chọn (mỗi file lấy `export default class`)
        {subfolder ? ` — thư mục: ${subfolder}/` : ''}
        {modelsScope === 'items' ? ' — models/items' : ''}
      </div>
    </div>
  );
}

interface TreeNodeListProps {
  nodes: CardClassTreeNode[];
  parentPath: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelectClass: (value: string) => void;
  currentValue: string;
  selectionMode: ClassPickerSelectionMode;
}

function TreeNodeList({
  nodes,
  parentPath,
  expanded,
  onToggle,
  onSelectClass,
  currentValue,
  selectionMode,
}: TreeNodeListProps) {
  return (
    <ul className="list-none pl-0 space-y-0.5">
      {nodes.map((node) => {
        const path = parentPath ? `${parentPath}/${node.name}` : node.name;
        if (node.type === 'dir') {
          const isExpanded = expanded.has(path);
          const hasChildren = (node.children?.length ?? 0) > 0;
          return (
            <li key={path}>
              <button
                type="button"
                onClick={() => hasChildren && onToggle(path)}
                className="flex items-center gap-1.5 w-full text-left py-1 px-2 rounded hover:bg-muted/60 text-sm"
              >
                <span className="text-muted-foreground select-none w-4">
                  {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
                </span>
                <span className="font-medium text-foreground">📁 {node.name}</span>
              </button>
              {isExpanded && hasChildren && node.children && (
                <div className="pl-5 border-l border-border ml-2">
                  <TreeNodeList
                    nodes={node.children}
                    parentPath={path}
                    expanded={expanded}
                    onToggle={onToggle}
                    onSelectClass={onSelectClass}
                    currentValue={currentValue}
                    selectionMode={selectionMode}
                  />
                </div>
              )}
            </li>
          );
        }
        return (
          <li key={path}>
            {(() => {
              const classes = node.classes ?? [];
              const selectedClassName = classes[0];
              const fileRelPath = path;
              const selectValue =
                selectionMode === 'relativePath' ? fileRelPath : selectedClassName;
              const canSelect =
                selectionMode === 'relativePath'
                  ? Boolean(fileRelPath && node.name.endsWith('.ts'))
                  : Boolean(selectedClassName);
              const isSelected = canSelect && currentValue === selectValue;

              return (
                <div
                  className={`flex items-center gap-2 flex-wrap py-0.5 px-2 ${
                    canSelect ? 'cursor-pointer hover:bg-muted/60 rounded' : ''
                  } ${isSelected ? 'bg-muted/60' : ''}`}
                  role={canSelect ? 'button' : undefined}
                  tabIndex={canSelect ? 0 : undefined}
                  onClick={canSelect ? () => onSelectClass(selectValue!) : undefined}
                  onKeyDown={(e) => {
                    if (!canSelect) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectClass(selectValue!);
                    }
                  }}
                >
                  <span className="text-muted-foreground select-none w-4 shrink-0" />
                  <span
                    className={`text-sm shrink-0 ${
                      isSelected ? 'text-emerald-900 font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    📄 {node.name}
                  </span>
                </div>
              );
            })()}
          </li>
        );
      })}
    </ul>
  );
}
