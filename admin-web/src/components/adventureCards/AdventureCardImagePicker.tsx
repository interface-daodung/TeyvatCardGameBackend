import { ImagePickerSurface } from '../ui/ImagePickerSurface';
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
    <ImagePickerSurface
      pickerOpen={isTreeOpen}
      pickerTitle="Select image"
      tree={imageTree}
      treeLoading={imageTreeLoading}
      expanded={imageTreeExpanded}
      onToggleExpanded={onToggleExpanded}
      onSelectPath={onSelectImage}
      onOpenPicker={onToggleTree}
      onClosePicker={onCloseTree}
      previewAlt={card.name}
      previewSrc={imageUrl}
      previewWrapperClassName="w-full max-w-[200px] mx-auto aspect-[420/720] rounded-xl bg-muted border border-border"
      triggerTitle="Ctrl+click: select image. Double-click: view fullscreen."
      imageFallbackSrc="/assets/images/cards/empty.webp"
    />
  );
}
