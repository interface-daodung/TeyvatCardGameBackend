import { FileTreeNode } from '../FileTreeNode';
import { getAdventureCardImageUrl } from './adventureCardUtils';
import type { AdventureCard } from '../../services/gameDataService';
import type { FileTreeItem } from '../../services/filesService';

interface AdventureCardImagePickerProps {
  card: AdventureCard;
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

export function AdventureCardImagePicker({
  card,
  formImage,
  isTreeOpen,
  onToggleTree,
  imageTree,
  imageTreeLoading,
  imageTreeExpanded,
  onToggleExpanded,
  onSelectImage,
  onCloseTree,
}: AdventureCardImagePickerProps) {
  const displayCard = { ...card, image: formImage ?? card.image };
  const imageUrl = getAdventureCardImageUrl(displayCard);

  return (
    <div
      className="w-full max-w-[200px] mx-auto aspect-[420/720] rounded-xl overflow-hidden bg-muted relative border border-border cursor-pointer"
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
            <span>Chọn ảnh</span>
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
              imageTree.map((item) => (
                <FileTreeNode
                  key={item.path}
                  item={item}
                  expanded={imageTreeExpanded}
                  onToggle={onToggleExpanded}
                  onSelect={onSelectImage}
                />
              ))
            ) : (
              <p className="text-muted-foreground">Không có ảnh</p>
            )}
          </div>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={card.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
          }}
        />
      )}
    </div>
  );
}
