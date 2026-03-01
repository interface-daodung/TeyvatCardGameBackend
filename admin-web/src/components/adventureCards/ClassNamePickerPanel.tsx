import { useState, useCallback, useEffect } from 'react';
import { filesService, type CardClassTreeNode } from '../../services/filesService';

interface ClassNamePickerPanelProps {
  onSelect: (className: string) => void;
  onClose: () => void;
  currentValue?: string;
}

export function ClassNamePickerPanel({
  onSelect,
  onClose,
  currentValue = '',
}: ClassNamePickerPanelProps) {
  const [tree, setTree] = useState<CardClassTreeNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await filesService.getCardClassTree();
      setTree(data);
      setExpanded(new Set());
    } catch {
      setError('Không tải được danh sách class.');
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleSelect = (className: string) => {
    onSelect(className);
    onClose();
  };

  return (
    <div className="w-full max-w-md rounded-lg bg-card overflow-hidden shadow-xl border border-border flex-shrink-0 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white">
        <h3 className="text-lg font-semibold">Chọn Class name</h3>
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
        {!loading && tree && tree.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">Không có file .ts trong TeyvatCard/src/models/cards</p>
        )}
        {!loading && tree && tree.length > 0 && (
          <TreeNodeList
            nodes={tree}
            parentPath=""
            expanded={expanded}
            onToggle={toggle}
            onSelectClass={handleSelect}
            currentValue={currentValue}
          />
        )}
      </div>
      <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
        Bấm vào tên class để chọn (từ file .ts trong TeyvatCard/src/models/cards)
      </div>
    </div>
  );
}

interface TreeNodeListProps {
  nodes: CardClassTreeNode[];
  parentPath: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelectClass: (className: string) => void;
  currentValue: string;
}

function TreeNodeList({
  nodes,
  parentPath,
  expanded,
  onToggle,
  onSelectClass,
  currentValue,
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
                  />
                </div>
              )}
            </li>
          );
        }
        return (
          <li key={path}>
            <div className="flex items-center gap-2 flex-wrap py-0.5 px-2">
              <span className="text-muted-foreground select-none w-4 shrink-0" />
              <span className="text-sm text-muted-foreground shrink-0">📄 {node.name}</span>
              {node.classes && node.classes.length > 0 && (
                <>
                  {node.classes.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => onSelectClass(cls)}
                      className={`shrink-0 py-1 px-2 rounded text-sm hover:bg-emerald-100 hover:text-emerald-900 ${
                        currentValue === cls ? 'bg-emerald-100 text-emerald-900 font-medium' : ''
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
