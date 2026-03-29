import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage } from '@fortawesome/free-solid-svg-icons';
import { FileTreeNode } from '../FileTreeNode';
import { getItemImageSrcFromDb } from './equipmentUtils';
import type { GameItem } from './equipmentUtils';
import type { FileTreeItem } from '../../services/filesService';

interface EquipmentItemImagePickerProps {
  item: GameItem;
  formImage?: string;
  isTreeOpen: boolean;
  onToggleTree: () => void;
  imageTree: FileTreeItem[] | null;
  imageTreeLoading: boolean;
  imageTreeExpanded: Set<string>;
  onToggleExpanded: (path: string) => void;
  onSelectImage: (path: string) => void;
  onCloseTree: () => void;
}

export function EquipmentItemImagePicker({
  item,
  formImage,
  isTreeOpen,
  onToggleTree,
  imageTree,
  imageTreeLoading,
  imageTreeExpanded,
  onToggleExpanded,
  onSelectImage,
  onCloseTree,
}: EquipmentItemImagePickerProps) {
  const displayLink = (formImage ?? item.image ?? '').trim();
  const imageSrc = getItemImageSrcFromDb(displayLink);

  return (
    <div
      className="w-52 sm:w-64 md:w-72 aspect-square rounded-xl overflow-hidden bg-muted relative border border-border cursor-pointer shrink-0 shadow-sm"
      onClick={() => !isTreeOpen && onToggleTree()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isTreeOpen) {
          e.preventDefault();
          onToggleTree();
        }
      }}
    >
      {isTreeOpen ? (
        <div className="absolute inset-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1 bg-muted border-b border-border text-xs font-medium shrink-0">
            <span>Chọn ảnh (item)</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTree();
              }}
              className="px-1.5 py-0.5 rounded hover:bg-muted-foreground/20"
            >
              Đóng
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 text-xs">
            {imageTreeLoading ? (
              <p className="text-muted-foreground">Đang tải...</p>
            ) : imageTree && imageTree.length > 0 ? (
              imageTree.map((node) => (
                <FileTreeNode
                  key={node.path}
                  item={node}
                  expanded={imageTreeExpanded}
                  onToggle={onToggleExpanded}
                  onSelect={onSelectImage}
                />
              ))
            ) : (
              <p className="text-muted-foreground">Không có ảnh trong thư mục item</p>
            )}
          </div>
        </div>
      ) : imageSrc ? (
        <img
          src={imageSrc}
          alt={item.nameId}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground p-2">
          <FontAwesomeIcon icon={faImage} className="w-12 h-12 opacity-40" aria-hidden />
          <span className="text-[10px] text-center leading-tight">Chưa có link ảnh</span>
        </div>
      )}
    </div>
  );
}
