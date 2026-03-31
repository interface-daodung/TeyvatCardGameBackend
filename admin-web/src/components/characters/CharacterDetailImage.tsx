import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FileTreeNode } from '../FileTreeNode';
import { ImageLightbox, type ImageLightboxOpen, type LightboxImage } from '../ui/ImageLightbox';
import { cn } from '../../lib/utils';
import {
  CARD_IMAGE_RATIO,
  SPRITESHEET_FRAME_HEIGHT,
  SPRITESHEET_FRAME_WIDTH,
} from './characterDetailUtils';
import type { Character } from '../../services/gameDataService';
import type { FileTreeItem } from '../../services/filesService';

type ImageTab = 'default' | 'unlock' | 'animated';

export type CharacterImagePickerRoot = 'character' | 'character-spritesheet' | 'character-unlock';

interface CharacterDetailImageProps {
  character: Character;
  referenceImagePath: string | null;
  isPickerOpen: boolean;
  imagePickerRoot: CharacterImagePickerRoot;
  characterImageTree: FileTreeItem[] | null;
  imageTreeLoading: boolean;
  imageTreeExpanded: Set<string>;
  onToggleExpanded: (path: string) => void;
  onSelectReferenceImage: (path: string) => void;
  onClosePicker: () => void;
  onOpenPicker: (root: CharacterImagePickerRoot) => void;
}

export function CharacterDetailImage({
  character,
  referenceImagePath,
  isPickerOpen,
  imagePickerRoot,
  characterImageTree,
  imageTreeLoading,
  imageTreeExpanded,
  onToggleExpanded,
  onSelectReferenceImage,
  onClosePicker,
  onOpenPicker,
}: CharacterDetailImageProps) {
  const [imageTab, setImageTab] = useState<ImageTab>('default');
  const spriteCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spriteLightboxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [spriteLoading, setSpriteLoading] = useState(true);
  const [spriteError, setSpriteError] = useState<string | null>(null);
  const [spriteLightboxOpen, setSpriteLightboxOpen] = useState(false);
  const [spriteLightboxLoading, setSpriteLightboxLoading] = useState(true);
  const [spriteLightboxError, setSpriteLightboxError] = useState<string | null>(null);
  const [imageLightbox, setImageLightbox] = useState<LightboxImage | null>(null);

  const displaySrc =
    referenceImagePath ?? `/assets/images/cards/character/${character.nameId}.webp`;

  const EMPTY_CARD_WEBP = '/assets/images/cards/empty.webp';
  const unlockDisplaySrc = useMemo(() => {
    const s = character.imageUnlock?.trim();
    if (!s) return EMPTY_CARD_WEBP;
    return s;
  }, [character.imageUnlock]);

  const resolvedSpritesheetUrl = useMemo(() => {
    const s = character.spritesheetImage?.trim();
    if (s) return s;
    return `/assets/images/cards/character/${character.nameId}-sprite.webp`;
  }, [character.spritesheetImage, character.nameId]);

  useEffect(() => {
    if (imageTab !== 'animated') return;
    const canvas = spriteCanvasRef.current;
    if (!canvas || !character.nameId) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setSpriteLoading(true);
    setSpriteError(null);
    const spritesheetUrl = resolvedSpritesheetUrl;
    const image = new Image();
    let timer: number | null = null;
    let frame = 0;
    let cancelled = false;

    canvas.width = SPRITESHEET_FRAME_WIDTH;
    canvas.height = SPRITESHEET_FRAME_HEIGHT;
    canvas.style.width = '210px';
    canvas.style.height = 'auto';

    const drawFrame = (index: number, totalColumns: number) => {
      const row = Math.floor(index / totalColumns);
      const col = index % totalColumns;
      const sx = col * SPRITESHEET_FRAME_WIDTH;
      const sy = row * SPRITESHEET_FRAME_HEIGHT;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        image,
        sx,
        sy,
        SPRITESHEET_FRAME_WIDTH,
        SPRITESHEET_FRAME_HEIGHT,
        0,
        0,
        SPRITESHEET_FRAME_WIDTH,
        SPRITESHEET_FRAME_HEIGHT
      );
    };

    image.onload = () => {
      if (cancelled) return;
      const totalColumns = Math.max(1, Math.floor(image.naturalWidth / SPRITESHEET_FRAME_WIDTH));
      const totalRows = Math.max(1, Math.floor(image.naturalHeight / SPRITESHEET_FRAME_HEIGHT));
      const totalFrames = Math.max(1, totalColumns * totalRows);
      drawFrame(0, totalColumns);
      setSpriteLoading(false);
      if (totalFrames > 1) {
        timer = window.setInterval(() => {
          frame = (frame + 1) % totalFrames;
          drawFrame(frame, totalColumns);
        }, Math.floor(1000 / 12));
      }
    };
    image.onerror = () => {
      if (cancelled) return;
      setSpriteLoading(false);
      setSpriteError('Không load được spritesheet.');
    };
    image.crossOrigin = 'anonymous';
    image.src = spritesheetUrl;

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [imageTab, character.nameId, resolvedSpritesheetUrl]);

  useLayoutEffect(() => {
    if (!spriteLightboxOpen) return;
    const canvas = spriteLightboxCanvasRef.current;
    if (!canvas || !character.nameId) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setSpriteLightboxLoading(true);
    setSpriteLightboxError(null);
    const spritesheetUrl = resolvedSpritesheetUrl;
    const image = new Image();
    let timer: number | null = null;
    let frame = 0;
    let cancelled = false;

    canvas.width = SPRITESHEET_FRAME_WIDTH;
    canvas.height = SPRITESHEET_FRAME_HEIGHT;

    const drawFrame = (index: number, totalColumns: number) => {
      const row = Math.floor(index / totalColumns);
      const col = index % totalColumns;
      const sx = col * SPRITESHEET_FRAME_WIDTH;
      const sy = row * SPRITESHEET_FRAME_HEIGHT;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        image,
        sx,
        sy,
        SPRITESHEET_FRAME_WIDTH,
        SPRITESHEET_FRAME_HEIGHT,
        0,
        0,
        SPRITESHEET_FRAME_WIDTH,
        SPRITESHEET_FRAME_HEIGHT
      );
    };

    image.onload = () => {
      if (cancelled) return;
      const totalColumns = Math.max(1, Math.floor(image.naturalWidth / SPRITESHEET_FRAME_WIDTH));
      const totalRows = Math.max(1, Math.floor(image.naturalHeight / SPRITESHEET_FRAME_HEIGHT));
      const totalFrames = Math.max(1, totalColumns * totalRows);
      drawFrame(0, totalColumns);
      setSpriteLightboxLoading(false);
      if (totalFrames > 1) {
        timer = window.setInterval(() => {
          frame = (frame + 1) % totalFrames;
          drawFrame(frame, totalColumns);
        }, Math.floor(1000 / 12));
      }
    };
    image.onerror = () => {
      if (cancelled) return;
      setSpriteLightboxLoading(false);
      setSpriteLightboxError('Không load được spritesheet.');
    };
    image.crossOrigin = 'anonymous';
    image.src = spritesheetUrl;

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [spriteLightboxOpen, character.nameId, resolvedSpritesheetUrl]);

  const closeLightbox = () => {
    setImageLightbox(null);
    setSpriteLightboxOpen(false);
  };

  const lightboxPayload: ImageLightboxOpen | null = imageLightbox
    ? imageLightbox
    : spriteLightboxOpen
      ? {
          type: 'custom',
          label: 'Ảnh động (spritesheet)',
          children: (
            <div className="relative inline-flex max-h-[min(85vh,800px)] max-w-[min(90vw,900px)] flex-col items-center justify-center">
              <canvas
                ref={spriteLightboxCanvasRef}
                className="max-h-[min(85vh,800px)] w-auto max-w-[min(90vw,900px)]"
              />
              {spriteLightboxLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-slate-900/70">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-transparent" />
                  <p className="text-sm text-slate-200">Đang tải spritesheet...</p>
                </div>
              )}
              {spriteLightboxError && (
                <p className="mt-2 max-w-[90vw] text-center text-sm text-red-400">{spriteLightboxError}</p>
              )}
            </div>
          ),
        }
      : null;

  return (
    <div className="flex flex-col">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Ảnh
      </h2>
      <p className="sr-only">
        Tab Mặc định: chọn ảnh trong cards/character. Tab Động: spritesheet trong assets/images/Spritesheet.
        Tab Unlock: ảnh trong assets/images/cards/unlock. Ctrl hoặc Cmd click để mở chọn file.
        Double-click để xem toàn màn hình (ảnh tĩnh hoặc spritesheet động).
      </p>

      <div className="w-full max-w-[280px] overflow-hidden rounded-lg border border-border bg-muted/50 text-card-foreground shadow-sm">
        <div className="flex" role="tablist" aria-label="Loại hiển thị ảnh">
          <button
            type="button"
            role="tab"
            aria-selected={imageTab === 'default'}
            id="character-image-tab-default"
            className={cn(
              'relative min-w-0 flex-1 cursor-pointer px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
              imageTab === 'default'
                ? 'bg-card text-foreground after:absolute after:bottom-[-4px] after:left-0 after:z-[1] after:h-[6px] after:w-full after:bg-card after:content-[""]'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
            onClick={() => {
              setImageTab('default');
              if (isPickerOpen) onClosePicker();
            }}
          >
            Mặc định
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={imageTab === 'animated'}
            id="character-image-tab-animated"
            className={cn(
              'relative min-w-0 flex-1 cursor-pointer px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
              imageTab === 'animated'
                ? 'bg-card text-foreground after:absolute after:bottom-[-4px] after:left-0 after:z-[1] after:h-[6px] after:w-full after:bg-card after:content-[""]'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
            onClick={() => {
              setImageTab('animated');
              if (isPickerOpen) onClosePicker();
            }}
          >
            Động
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={imageTab === 'unlock'}
            id="character-image-tab-unlock"
            className={cn(
              'relative min-w-0 flex-1 cursor-pointer px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
              imageTab === 'unlock'
                ? 'bg-card text-foreground after:absolute after:bottom-[-4px] after:left-0 after:z-[1] after:h-[6px] after:w-full after:bg-card after:content-[""]'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
            onClick={() => {
              setImageTab('unlock');
              if (isPickerOpen) onClosePicker();
            }}
          >
            Unlock
          </button>
        </div>

        <div className="bg-card p-4">
          <div
            className="relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-muted"
            style={{ aspectRatio: `${CARD_IMAGE_RATIO.width}/${CARD_IMAGE_RATIO.height}` }}
            role="tabpanel"
            aria-labelledby={
              imageTab === 'default'
                ? 'character-image-tab-default'
                : imageTab === 'animated'
                  ? 'character-image-tab-animated'
                  : 'character-image-tab-unlock'
            }
          >
            {isPickerOpen ? (
              <div className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-muted">
                <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted px-2 py-1 text-xs font-medium">
                  <span className="truncate pr-2">
                    {imagePickerRoot === 'character-spritesheet'
                      ? 'Chọn file (assets/images/Spritesheet)'
                      : imagePickerRoot === 'character-unlock'
                        ? 'Chọn ảnh (assets/images/cards/unlock)'
                        : 'Chọn ảnh tham khảo (cards/character)'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClosePicker();
                    }}
                    className="shrink-0 rounded px-1.5 py-0.5 hover:bg-muted-foreground/20"
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
                    <p className="text-muted-foreground">Không có file trong thư mục này</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {imageTab === 'default' && (
                  <div
                    className="relative h-full w-full cursor-default"
                    role="button"
                    tabIndex={0}
                    title="Ctrl+click: chọn ảnh (cards/character). Double-click: xem toàn màn hình."
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      setImageLightbox({ src: displaySrc, alt: character.name });
                    }}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        onOpenPicker('character');
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onOpenPicker('character');
                      }
                    }}
                  >
                    <img
                      src={displaySrc}
                      alt={character.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = EMPTY_CARD_WEBP;
                      }}
                    />
                  </div>
                )}

                {imageTab === 'animated' && (
                  <div
                    className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-muted/40 p-1"
                    role="button"
                    tabIndex={0}
                    title="Ctrl+click: chọn file (assets/images/Spritesheet). Double-click: xem toàn màn hình."
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      setSpriteLightboxOpen(true);
                    }}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        onOpenPicker('character-spritesheet');
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onOpenPicker('character-spritesheet');
                      }
                    }}
                  >
                    <div className="pointer-events-none relative inline-flex max-h-full max-w-full items-center justify-center">
                      <canvas
                        ref={spriteCanvasRef}
                        className="max-h-full w-auto max-w-full"
                      />
                      {spriteLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-slate-900/60">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-transparent" />
                          <p className="text-xs text-slate-200">Đang tải spritesheet...</p>
                        </div>
                      )}
                    </div>
                    {spriteError && (
                      <p className="pointer-events-none absolute bottom-1 left-1 right-1 text-center text-[10px] text-red-600">
                        {spriteError}
                      </p>
                    )}
                  </div>
                )}

                {imageTab === 'unlock' && (
                  <div
                    className="relative h-full w-full cursor-default"
                    role="button"
                    tabIndex={0}
                    title="Ctrl+click: chọn ảnh (assets/images/cards/unlock). Double-click: xem toàn màn hình."
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      setImageLightbox({ src: unlockDisplaySrc, alt: `${character.name} unlock` });
                    }}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        onOpenPicker('character-unlock');
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onOpenPicker('character-unlock');
                      }
                    }}
                  >
                    <img
                      src={unlockDisplaySrc}
                      alt={`${character.name} unlock`}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = EMPTY_CARD_WEBP;
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ImageLightbox open={lightboxPayload} onClose={closeLightbox} />
    </div>
  );
}
