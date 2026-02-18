import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import type { FileTreeItem } from '../services/filesService';

interface TreeNodeProps {
  item: FileTreeItem;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  depth?: number;
  onEdit?: (path: string) => void;
  showEditFor?: (item: FileTreeItem) => boolean;
}

export function FileTreeNode({
  item,
  expanded,
  onToggle,
  onSelect,
  depth = 0,
  onEdit,
  showEditFor,
}: TreeNodeProps) {
  if (item.type === 'file') {
    const showEdit = onEdit && showEditFor?.(item);
    return (
      <div
        className="group group/file flex items-center w-full rounded hover:bg-primary/20"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <button
          type="button"
          onClick={() => onSelect(item.path)}
          className="flex-1 min-w-0 text-left px-2 py-1 flex items-center gap-1 truncate"
        >
          <span className="text-blue-600 truncate">📄 {item.name}</span>
        </button>
        {showEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item.path);
            }}
            className="shrink-0 p-1.5 rounded opacity-0 group-hover/file:opacity-100 text-slate-500 hover:text-primary transition-opacity"
            title="Chỉnh sửa"
            aria-label="Chỉnh sửa"
          >
            <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  const isExpanded = expanded.has(item.path);
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(item.path)}
        className="w-full text-left px-2 py-1 rounded hover:bg-muted flex items-center gap-1"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <span className="shrink-0">{isExpanded ? '▼' : '▶'}</span>
        <span className="font-medium">📁 {item.name}</span>
      </button>
      {isExpanded && item.children && (
        <div className="pl-0">
          {item.children.map((child) => (
            <FileTreeNode
              key={child.path}
              item={child}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              depth={depth + 1}
              onEdit={onEdit}
              showEditFor={showEditFor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
