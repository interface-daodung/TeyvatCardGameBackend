import { Card, CardContent } from '../ui/card';
import { ElementIcon } from '../ElementIcon';
import { FileTreeNode } from '../FileTreeNode';
import { CARD_IMAGE_RATIO } from './characterDetailUtils';
import type { Character } from '../../services/gameDataService';
import type { FileTreeItem } from '../../services/filesService';

interface CharacterDetailImageProps {
  character: Character;
  effectiveElement: string;
  referenceImagePath: string | null;
  isPickerOpen: boolean;
  characterImageTree: FileTreeItem[] | null;
  imageTreeLoading: boolean;
  imageTreeExpanded: Set<string>;
  onToggleExpanded: (path: string) => void;
  onSelectReferenceImage: (path: string) => void;
  onClosePicker: () => void;
  onOpenPicker: () => void;
}

export function CharacterDetailImage({
  character,
  effectiveElement,
  referenceImagePath,
  isPickerOpen,
  characterImageTree,
  imageTreeLoading,
  imageTreeExpanded,
  onToggleExpanded,
  onSelectReferenceImage,
  onClosePicker,
  onOpenPicker,
}: CharacterDetailImageProps) {
  const displaySrc =
    referenceImagePath ?? `/assets/images/cards/character/${character.nameId}.webp`;

  return (
    <div className="flex flex-col">
      <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Ảnh
      </h2>
      <p className="sr-only">
        Ctrl+click hoặc Cmd+click vào thẻ để chọn ảnh tham khảo trong thư mục character.
      </p>
      <Card className="border-0 shadow-none overflow-hidden max-w-[280px]">
        <CardContent className="p-0">
          <div
            className="w-full max-w-[280px] mx-auto rounded-xl overflow-hidden bg-muted relative border border-border"
            style={{ aspectRatio: `${CARD_IMAGE_RATIO.width}/${CARD_IMAGE_RATIO.height}` }}
          >
            {isPickerOpen ? (
              <div className="absolute inset-0 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-2 py-1 bg-muted border-b border-border text-xs font-medium shrink-0">
                  <span>Chọn ảnh tham khảo</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClosePicker();
                    }}
                    className="px-1.5 py-0.5 rounded hover:bg-muted-foreground/20"
                  >
                    Đóng
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 text-xs">
                  {imageTreeLoading ? (
                    <p className="text-muted-foreground">Đang tải...</p>
                  ) : characterImageTree && characterImageTree.length > 0 ? (
                    characterImageTree.map((item) => (
                      <FileTreeNode
                        key={item.path}
                        item={item}
                        expanded={imageTreeExpanded}
                        onToggle={onToggleExpanded}
                        onSelect={onSelectReferenceImage}
                      />
                    ))
                  ) : (
                    <p className="text-muted-foreground">Không có ảnh</p>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="relative w-full h-full cursor-default"
                role="button"
                tabIndex={0}
                title="Ctrl+click: chọn ảnh tham khảo (thư mục cards/character)"
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    onOpenPicker();
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onOpenPicker();
                  }
                }}
              >
                <img
                  src={displaySrc}
                  alt={character.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
                  }}
                />
                <div className="absolute top-1.5 left-1.5 z-10">
                  <ElementIcon
                    element={effectiveElement}
                    size="md"
                    className="border-2 border-white/70"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
