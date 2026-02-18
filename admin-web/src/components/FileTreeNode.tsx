import { useDrag, useDrop } from 'react-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import type { FileTreeItem } from '../services/filesService';

export const FILE_TREE_ITEM_TYPE = 'file-tree-item';

export interface FileTreeDragItem {
  path: string;
  name: string;
}

interface TreeNodeProps {
  item: FileTreeItem;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  depth?: number;
  onEdit?: (path: string) => void;
  showEditFor?: (item: FileTreeItem) => boolean;
  onDropOnFolder?: (targetFolderPath: string, droppedFilePath: string) => void;
  canDropOnFolder?: (targetFolderPath: string, droppedFilePath: string) => boolean;
}

export function FileTreeNode({
  item,
  expanded,
  onToggle,
  onSelect,
  depth = 0,
  onEdit,
  showEditFor,
  onDropOnFolder,
  canDropOnFolder,
}: TreeNodeProps) {
  if (item.type === 'file') {
    const showEdit = onEdit && showEditFor?.(item);
    const draggable = !!onDropOnFolder;
    const [{ isDragging }, dragRef] = useDrag<FileTreeDragItem, void, { isDragging: boolean }>({
      type: FILE_TREE_ITEM_TYPE,
      item: { path: item.path, name: item.name },
      canDrag: draggable,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });

    return (
      <div
        ref={dragRef}
        className={`group group/file flex items-center w-full rounded hover:bg-primary/20 ${isDragging ? 'opacity-50' : ''}`}
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
  const isDropTarget = !!onDropOnFolder;
  const folderPath = item.path;

  const [{ isOver, canDrop }, dropRef] = useDrop<FileTreeDragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: FILE_TREE_ITEM_TYPE,
    drop: (draggedItem) => {
      if (!isDropTarget) return;
      if (canDropOnFolder && !canDropOnFolder(folderPath, draggedItem.path)) return;
      onDropOnFolder?.(folderPath, draggedItem.path);
    },
    canDrop: (draggedItem) => (canDropOnFolder ? canDropOnFolder(folderPath, draggedItem.path) : isDropTarget),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const dragOver = isOver && canDrop;

  return (
    <div>
      <div
        ref={dropRef}
        role="button"
        tabIndex={0}
        className={`w-full text-left px-2 py-1 rounded flex items-center gap-1 cursor-pointer select-none ${dragOver ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted'}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => onToggle(item.path)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(item.path);
          }
        }}
      >
        <span className="shrink-0">{isExpanded ? '▼' : '▶'}</span>
        <span className="font-medium">📁 {item.name}</span>
      </div>
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
              onDropOnFolder={onDropOnFolder}
              canDropOnFolder={canDropOnFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
