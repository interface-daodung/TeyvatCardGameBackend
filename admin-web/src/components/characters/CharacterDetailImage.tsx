import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { FileTreeNode } from '../FileTreeNode';
import { ImageLightbox, type ImageLightboxOpen, type LightboxImage } from '../ui/ImageLightbox';
import { cn } from '../../lib/utils';
import {
  CARD_IMAGE_RATIO,
  phaserSpritesheetTextureKey,
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
  const spriteContainerRef = useRef<HTMLDivElement | null>(null);
  const spriteLightboxRef = useRef<HTMLDivElement | null>(null);
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
    const parent = spriteContainerRef.current;
    if (!parent || !character.nameId) return;

    setSpriteLoading(true);
    setSpriteError(null);
    const spritesheetUrl = resolvedSpritesheetUrl;
    const textureKey = phaserSpritesheetTextureKey(character.nameId, spritesheetUrl);
    const animKey = `${textureKey}-anim`;
    let game: Phaser.Game | null = null;
    let sprite: Phaser.GameObjects.Sprite | null = null;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: SPRITESHEET_FRAME_WIDTH,
      height: SPRITESHEET_FRAME_HEIGHT,
      transparent: true,
      parent,
      scene: {
        preload(this: Phaser.Scene) {
          this.load.crossOrigin = 'anonymous';
          this.load.spritesheet(textureKey, spritesheetUrl, {
            frameWidth: SPRITESHEET_FRAME_WIDTH,
            frameHeight: SPRITESHEET_FRAME_HEIGHT,
          });
          this.load.once('loaderror', (file: { key: string }) => {
            if (file.key === textureKey) {
              setSpriteLoading(false);
              setSpriteError('Không load được spritesheet.');
            }
          });
        },
        create(this: Phaser.Scene) {
          const canvas = this.game.canvas as HTMLCanvasElement;
          canvas.style.width = '210px';
          canvas.style.height = 'auto';

          if (!this.textures.exists(textureKey)) {
            setSpriteLoading(false);
            setSpriteError('Không load được spritesheet.');
            return;
          }

          const texture = this.textures.get(textureKey);
          const frames = texture.frames as Record<string, Phaser.Textures.Frame>;
          const digitKeys = Object.keys(frames).filter((k) => /^\d+$/.test(k));
          let endFrame = 0;
          if (digitKeys.length > 0) {
            endFrame = Math.max(...digitKeys.map((k) => parseInt(k, 10)));
          } else if (texture.frameTotal > 1) {
            const hasBase = frames.__BASE !== undefined;
            endFrame = Math.max(0, texture.frameTotal - (hasBase ? 2 : 1));
          }

          sprite = this.add.sprite(
            SPRITESHEET_FRAME_WIDTH / 2,
            SPRITESHEET_FRAME_HEIGHT / 2,
            textureKey,
            0
          );

          if (endFrame >= 1) {
            if (this.anims.exists(animKey)) {
              this.anims.remove(animKey);
            }
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(textureKey, {
                start: 0,
                end: endFrame,
              }),
              frameRate: 12,
              repeat: -1,
            });
            sprite.play(animKey);
          }
          setSpriteLoading(false);
        },
      },
    };

    game = new Phaser.Game(config);
    return () => {
      if (sprite && sprite.active) sprite.stop();
      if (game) game.destroy(true);
    };
  }, [imageTab, character.nameId, resolvedSpritesheetUrl]);

  useLayoutEffect(() => {
    if (!spriteLightboxOpen) return;
    const parent = spriteLightboxRef.current;
    if (!parent || !character.nameId) return;

    setSpriteLightboxLoading(true);
    setSpriteLightboxError(null);
    const spritesheetUrl = resolvedSpritesheetUrl;
    const textureKey = phaserSpritesheetTextureKey(
      character.nameId,
      `${spritesheetUrl}#lightbox`
    );
    const animKey = `${textureKey}-anim`;
    let game: Phaser.Game | null = null;
    let sprite: Phaser.GameObjects.Sprite | null = null;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: SPRITESHEET_FRAME_WIDTH,
      height: SPRITESHEET_FRAME_HEIGHT,
      transparent: true,
      parent,
      scene: {
        preload(this: Phaser.Scene) {
          this.load.crossOrigin = 'anonymous';
          this.load.spritesheet(textureKey, spritesheetUrl, {
            frameWidth: SPRITESHEET_FRAME_WIDTH,
            frameHeight: SPRITESHEET_FRAME_HEIGHT,
          });
          this.load.once('loaderror', (file: { key: string }) => {
            if (file.key === textureKey) {
              setSpriteLightboxLoading(false);
              setSpriteLightboxError('Không load được spritesheet.');
            }
          });
        },
        create(this: Phaser.Scene) {
          const canvas = this.game.canvas as HTMLCanvasElement;
          canvas.style.width = 'auto';
          canvas.style.height = 'auto';
          canvas.style.maxWidth = 'min(90vw, 900px)';
          canvas.style.maxHeight = 'min(85vh, 800px)';

          if (!this.textures.exists(textureKey)) {
            setSpriteLightboxLoading(false);
            setSpriteLightboxError('Không load được spritesheet.');
            return;
          }

          const texture = this.textures.get(textureKey);
          const frames = texture.frames as Record<string, Phaser.Textures.Frame>;
          const digitKeys = Object.keys(frames).filter((k) => /^\d+$/.test(k));
          let endFrame = 0;
          if (digitKeys.length > 0) {
            endFrame = Math.max(...digitKeys.map((k) => parseInt(k, 10)));
          } else if (texture.frameTotal > 1) {
            const hasBase = frames.__BASE !== undefined;
            endFrame = Math.max(0, texture.frameTotal - (hasBase ? 2 : 1));
          }

          sprite = this.add.sprite(
            SPRITESHEET_FRAME_WIDTH / 2,
            SPRITESHEET_FRAME_HEIGHT / 2,
            textureKey,
            0
          );

          if (endFrame >= 1) {
            if (this.anims.exists(animKey)) {
              this.anims.remove(animKey);
            }
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(textureKey, {
                start: 0,
                end: endFrame,
              }),
              frameRate: 12,
              repeat: -1,
            });
            sprite.play(animKey);
          }
          setSpriteLightboxLoading(false);
        },
      },
    };

    game = new Phaser.Game(config);
    return () => {
      if (sprite && sprite.active) sprite.stop();
      if (game) game.destroy(true);
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
              <div
                ref={spriteLightboxRef}
                className="inline-flex items-center justify-center [&_canvas]:max-h-[min(85vh,800px)] [&_canvas]:w-auto [&_canvas]:max-w-[min(90vw,900px)]"
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
        Tab Mặc định: chọn ảnh trong cards/character. Tab Động: spritesheet trong Spritesheet.
        Tab Unlock: ảnh trong cards/character/unlock. Ctrl hoặc Cmd click để mở chọn file.
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
            onClick={() => setImageTab('default')}
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
            onClick={() => setImageTab('animated')}
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
            onClick={() => setImageTab('unlock')}
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
                      ? 'Chọn file (cards/character/Spritesheet)'
                      : imagePickerRoot === 'character-unlock'
                        ? 'Chọn ảnh (cards/character/unlock)'
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
                    title="Ctrl+click: chọn file (Spritesheet). Double-click: xem toàn màn hình."
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
                      <div
                        ref={spriteContainerRef}
                        className="inline-flex items-center justify-center [&_canvas]:max-h-full [&_canvas]:w-auto [&_canvas]:max-w-full"
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
                    title="Ctrl+click: chọn ảnh (unlock). Double-click: xem toàn màn hình."
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
