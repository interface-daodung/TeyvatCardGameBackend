import { useState, type ReactNode } from 'react';
import { FileTreeNode } from '../FileTreeNode';
import { ImageLightbox, type LightboxImage } from './ImageLightbox';
import { cn } from '../../lib/utils';
import type { FileTreeItem } from '../../services/filesService';

interface ImagePickerSurfaceProps {
  pickerOpen: boolean;
  pickerTitle: string;
  pickerEmptyText?: string;
  tree: FileTreeItem[] | null;
  treeLoading: boolean;
  expanded: Set<string>;
  onToggleExpanded: (path: string) => void;
  onSelectPath: (path: string) => void;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  previewAlt: string;
  previewSrc?: string;
  previewWrapperClassName?: string;
  previewClassName?: string;
  pickerPanelClassName?: string;
  emptyState?: ReactNode;
  imageFallbackSrc?: string;
  triggerTitle: string;
  lightboxEnabled?: boolean;
  lightboxSmallAsset?: boolean;
}

export function ImagePickerSurface({
  pickerOpen,
  pickerTitle,
  pickerEmptyText = 'No images',
  tree,
  treeLoading,
  expanded,
  onToggleExpanded,
  onSelectPath,
  onOpenPicker,
  onClosePicker,
  previewAlt,
  previewSrc,
  previewWrapperClassName,
  previewClassName,
  pickerPanelClassName,
  emptyState,
  imageFallbackSrc,
  triggerTitle,
  lightboxEnabled = true,
  lightboxSmallAsset = false,
}: ImagePickerSurfaceProps) {
  const [imageLightbox, setImageLightbox] = useState<LightboxImage | null>(null);

  const handleTriggerPicker = () => {
    if (!pickerOpen) onOpenPicker();
  };

  const hasImage = Boolean(previewSrc?.trim());

  return (
    <>
      <div className={cn('relative overflow-hidden', previewWrapperClassName)}>
        {pickerOpen ? (
          <div className={cn('absolute inset-0 flex flex-col overflow-hidden', pickerPanelClassName)}>
            <div className="flex items-center justify-between px-2 py-1 bg-muted border-b border-border text-xs font-medium shrink-0">
              <span>{pickerTitle}</span>
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
              {treeLoading ? (
                <p className="text-muted-foreground">Đang tải...</p>
              ) : tree && tree.length > 0 ? (
                tree.map((item) => (
                  <FileTreeNode
                    key={item.path}
                    item={item}
                    expanded={expanded}
                    onToggle={onToggleExpanded}
                    onSelect={onSelectPath}
                  />
                ))
              ) : (
                <p className="text-muted-foreground">{pickerEmptyText}</p>
              )}
            </div>
          </div>
        ) : hasImage ? (
          <div
            className="absolute inset-0 cursor-default"
            role="button"
            tabIndex={0}
            title={triggerTitle}
            onDoubleClick={(e) => {
              if (!lightboxEnabled || !previewSrc) return;
              e.preventDefault();
              setImageLightbox({ src: previewSrc, alt: previewAlt });
            }}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                handleTriggerPicker();
              }
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleTriggerPicker();
              }
            }}
          >
            <img
              src={previewSrc}
              alt={previewAlt}
              className={cn('pointer-events-none absolute inset-0 w-full h-full object-cover', previewClassName)}
              onError={(e) => {
                if (imageFallbackSrc) {
                  (e.currentTarget as HTMLImageElement).src = imageFallbackSrc;
                }
              }}
            />
          </div>
        ) : (
          <div
            className="absolute inset-0"
            role="button"
            tabIndex={0}
            title={triggerTitle}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                handleTriggerPicker();
              }
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleTriggerPicker();
              }
            }}
          >
            {emptyState}
          </div>
        )}
      </div>
      <ImageLightbox
        open={imageLightbox}
        onClose={() => setImageLightbox(null)}
        smallAssetLightbox={lightboxSmallAsset}
      />
    </>
  );
}
