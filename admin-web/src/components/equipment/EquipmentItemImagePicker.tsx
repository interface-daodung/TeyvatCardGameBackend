import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage } from '@fortawesome/free-solid-svg-icons';
import { FileTreeNode } from '../FileTreeNode';
import { ImageLightbox, type LightboxImage } from '../ui/ImageLightbox';
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
  const [imageLightbox, setImageLightbox] = useState<LightboxImage | null>(null);
  const displayLink = (formImage ?? item.image ?? '').trim();
  const imageSrc = getItemImageSrcFromDb(displayLink);

  const openImageTree = () => {
    if (!isTreeOpen) onToggleTree();
  };

  return (
    <>
      <div className="w-52 sm:w-64 md:w-72 aspect-square rounded-xl overflow-hidden bg-muted relative border border-border shrink-0 shadow-sm">
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
          <div
            className="absolute inset-0 cursor-default"
            role="button"
            tabIndex={0}
            title="Ctrl+click: chọn ảnh (item). Double-click: xem toàn màn hình."
            onDoubleClick={(e) => {
              e.preventDefault();
              setImageLightbox({ src: imageSrc, alt: item.nameId });
            }}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                openImageTree();
              }
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                openImageTree();
              }
            }}
          >
            <img
              src={imageSrc}
              alt={item.nameId}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : (
          <div
            className="absolute inset-0 flex cursor-default flex-col items-center justify-center gap-1 bg-muted p-2 text-muted-foreground"
            role="button"
            tabIndex={0}
            title="Ctrl+click: chọn ảnh (item)."
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                openImageTree();
              }
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                openImageTree();
              }
            }}
          >
            <FontAwesomeIcon icon={faImage} className="w-12 h-12 opacity-40" aria-hidden />
            <span className="text-[10px] text-center leading-tight">Chưa có link ảnh</span>
          </div>
        )}
      </div>
      <ImageLightbox
        open={imageLightbox}
        onClose={() => setImageLightbox(null)}
        smallAssetLightbox
      />
    </>
  );
}
