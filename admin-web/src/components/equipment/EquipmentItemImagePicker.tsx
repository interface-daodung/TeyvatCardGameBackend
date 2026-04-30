import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage } from '@fortawesome/free-solid-svg-icons';
import { ImagePickerSurface } from '../ui/ImagePickerSurface';
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
    <ImagePickerSurface
      pickerOpen={isTreeOpen}
      pickerTitle="Select image (item)"
      pickerEmptyText="No images in item folder"
      tree={imageTree}
      treeLoading={imageTreeLoading}
      expanded={imageTreeExpanded}
      onToggleExpanded={onToggleExpanded}
      onSelectPath={onSelectImage}
      onOpenPicker={onToggleTree}
      onClosePicker={onCloseTree}
      previewAlt={item.nameId}
      previewSrc={imageSrc ?? undefined}
      previewWrapperClassName="w-52 sm:w-64 md:w-72 aspect-square rounded-xl bg-muted border border-border shrink-0 shadow-sm"
      triggerTitle="Ctrl+click: select image (item). Double-click: view fullscreen."
      lightboxSmallAsset
      emptyState={
        <div className="flex h-full cursor-default flex-col items-center justify-center gap-1 bg-muted p-2 text-muted-foreground">
          <FontAwesomeIcon icon={faImage} className="w-12 h-12 opacity-40" aria-hidden />
          <span className="text-[10px] text-center leading-tight">Chưa có link ảnh</span>
        </div>
      }
    />
  );
}
