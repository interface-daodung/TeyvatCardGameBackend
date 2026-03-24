import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Phaser from 'phaser';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { LangDropdown } from '../components/LangDropdown';
import { fadeSlideCard } from '../components/animations/motionPresets';
import { I18nDescriptionModal } from '../components/i18n/I18nDescriptionModal';
import { CharacterDetailLoading } from '../components/characters/CharacterDetailLoading';
import { CharacterDetailError } from '../components/characters/CharacterDetailError';
import { CharacterDetailImage } from '../components/characters/CharacterDetailImage';
import { CharacterDetailInfo } from '../components/characters/CharacterDetailInfo';
import { CharacterDetailEditPanel } from '../components/characters/CharacterDetailEditPanel';
import { useCharacterDetail } from '../components/characters/useCharacterDetail';
import { SourceClassEditor } from '../components/code/SourceClassEditor';
import { CharacterClassAstFlow } from '../components/code/CharacterClassAstFlow';
import { filesService, type CharacterClassAstMapResult } from '../services/filesService';

const SPRITESHEET_FRAME_WIDTH = 350;
const SPRITESHEET_FRAME_HEIGHT = 590;
const SPRITESHEET_TOTAL_FRAMES = 76;

function toPascalCase(input: string): string {
  return input
    .replace(/[-_\s]+(.)?/g, (_, ch: string | undefined) => (ch ? ch.toUpperCase() : ''))
    .replace(/^(.)/, (s) => s.toUpperCase());
}

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const detail = useCharacterDetail(id);
  const spriteContainerRef = useRef<HTMLDivElement | null>(null);
  const [spriteLoading, setSpriteLoading] = useState(true);
  const [spriteError, setSpriteError] = useState<string | null>(null);
  const [astMapLoading, setAstMapLoading] = useState(false);
  const [astMapError, setAstMapError] = useState<string | null>(null);
  const [astMapData, setAstMapData] = useState<CharacterClassAstMapResult | null>(null);

  const character = detail.character;
  const characterNameId = character?.nameId ?? '';
  const effectiveElement = detail.displayElement || character?.element || 'cryo';
  const characterClassName = useMemo(() => toPascalCase(characterNameId), [characterNameId]);
  const spritesheetUrl = useMemo(
    () => `/assets/images/cards/character/${characterNameId}-sprite.webp`,
    [characterNameId]
  );
  const skillIconUrl = useMemo(
    () => `/assets/images/skill/icon/${characterNameId}.png`,
    [characterNameId]
  );
  const characterRelativeClassPath = useMemo(
    () => `character/${characterClassName}.ts`,
    [characterClassName]
  );
  useEffect(() => {
    if (!spriteContainerRef.current || !characterNameId) return;

    setSpriteLoading(true);
    setSpriteError(null);
    const textureKey = `character-sprite-${characterNameId}`;
    const animKey = `${textureKey}-animation`;
    let game: Phaser.Game | null = null;
    let sprite: Phaser.GameObjects.Sprite | null = null;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: SPRITESHEET_FRAME_WIDTH,
      height: SPRITESHEET_FRAME_HEIGHT,
      transparent: true,
      parent: spriteContainerRef.current,
      scene: {
        preload() {
          this.load.spritesheet(textureKey, spritesheetUrl, {
            frameWidth: SPRITESHEET_FRAME_WIDTH,
            frameHeight: SPRITESHEET_FRAME_HEIGHT,
          });
          this.load.on('loaderror', () => {
            setSpriteLoading(false);
            setSpriteError(`Không load được spritesheet: ${spritesheetUrl}`);
          });
        },
        create() {
          const canvas = this.game.canvas as HTMLCanvasElement;
          canvas.style.width = '210px';
          canvas.style.height = 'auto';

          sprite = this.add.sprite(
            SPRITESHEET_FRAME_WIDTH / 2,
            SPRITESHEET_FRAME_HEIGHT / 2,
            textureKey
          );
          if (!this.anims.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(textureKey, {
                start: 0,
                end: SPRITESHEET_TOTAL_FRAMES - 1,
              }),
              frameRate: 12,
              repeat: -1,
            });
          }
          sprite.play(animKey);
          setSpriteLoading(false);
        },
      },
    };

    game = new Phaser.Game(config);
    return () => {
      if (sprite && sprite.active) sprite.stop();
      if (game) game.destroy(true);
    };
  }, [characterNameId, spritesheetUrl]);

  useEffect(() => {
    if (!characterClassName) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d03b28b5-f56f-4326-9f2c-71f619658cd5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'94244b'},body:JSON.stringify({sessionId:'94244b',runId:'pre-fix',hypothesisId:'H1',location:'CharacterDetail.tsx:119',message:'Skip AST fetch because class name is empty',data:{characterClassName},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setAstMapData(null);
      setAstMapError(null);
      return;
    }
    let cancelled = false;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d03b28b5-f56f-4326-9f2c-71f619658cd5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'94244b'},body:JSON.stringify({sessionId:'94244b',runId:'pre-fix',hypothesisId:'H2',location:'CharacterDetail.tsx:126',message:'Start AST fetch',data:{characterClassName,characterRelativeClassPath},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setAstMapLoading(true);
    setAstMapError(null);
    filesService
      .getCharacterClassAstMap(characterRelativeClassPath, characterClassName)
      .then((data) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d03b28b5-f56f-4326-9f2c-71f619658cd5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'94244b'},body:JSON.stringify({sessionId:'94244b',runId:'pre-fix',hypothesisId:'H2',location:'CharacterDetail.tsx:131',message:'AST fetch success',data:{className:data.className,parentClassName:data.parentClassName,classMethodCount:data.methodMap[data.className]?.length ?? 0,parentMethodCount:data.methodMap[data.parentClassName]?.length ?? 0},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (!cancelled) setAstMapData(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : 'Không phân tích được AST class nhân vật';
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d03b28b5-f56f-4326-9f2c-71f619658cd5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'94244b'},body:JSON.stringify({sessionId:'94244b',runId:'pre-fix',hypothesisId:'H3',location:'CharacterDetail.tsx:137',message:'AST fetch failed',data:{characterClassName,errorMessage:message},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setAstMapError(message);
        setAstMapData(null);
      })
      .finally(() => {
        if (!cancelled) setAstMapLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [characterClassName, characterRelativeClassPath]);

  if (detail.loading) return <CharacterDetailLoading />;
  if (detail.error || !detail.character) {
    return (
      <CharacterDetailError
        message={detail.error ?? 'Character not found'}
        onBack={() => navigate('/characters')}
      />
    );
  }
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Character Details" description="View and manage character info" />
        <LangDropdown
          value={detail.editLang}
          onChange={detail.setEditLang}
          open={detail.langDropdownOpen}
          onOpenChange={detail.setLangDropdownOpen}
        />
      </div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        variants={fadeSlideCard}
        initial="hidden"
        animate="visible"
      >
        <CharacterDetailImage character={detail.character} effectiveElement={effectiveElement} />
        <CharacterDetailInfo
          effectiveElement={effectiveElement}
          displayName={detail.getDisplayName()}
          displayHp={detail.displayHp}
          displayLevel={detail.displayLevel}
          displayDescription={detail.getDisplayDescription()}
          editingField={detail.editingField}
          onOpenI18n={detail.openI18nPopup}
          onStartEdit={detail.startEdit}
        />
        <CharacterDetailEditPanel
          editingField={detail.editingField}
          editedHp={detail.editedHp}
          onEditedHpChange={detail.setEditedHp}
          effectiveElement={effectiveElement}
          displayLevel={detail.displayLevel}
          onDisplayLevelChange={detail.setDisplayLevel}
          levelPrices={detail.levelPrices}
          editingPriceForLevel={detail.editingPriceForLevel}
          editedPriceValue={detail.editedPriceValue}
          onEditedPriceValueChange={detail.setEditedPriceValue}
          saveLoading={detail.saveLoading}
          onSaveEdit={detail.saveEdit}
          onCancelEdit={detail.cancelEdit}
          onSavePriceEdit={detail.savePriceEdit}
          onStartPriceEdit={detail.startPriceEdit}
          onSetDisplayElementAndPersist={detail.setDisplayElementAndPersist}
        />
      </motion.div>

      <motion.div
        className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
        variants={fadeSlideCard}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-wrap items-start gap-6">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Phát animation theo logic `SpritesheetWrapper.CharacterAnimation` (start: 0, end:
              totalFrames - 1, 76 frame, 12 fps).
            </p>
            <div className="relative inline-flex min-h-[300px] w-[230px] items-center justify-center rounded-lg border border-slate-300 p-2">
              <div ref={spriteContainerRef} className="inline-flex items-center justify-center" />
              {spriteLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-slate-900/70">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-transparent" />
                  <p className="text-xs text-slate-200">Đang tải spritesheet...</p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 break-all">Nguồn: {spritesheetUrl}</p>
            {spriteError && <p className="text-sm text-red-600">{spriteError}</p>}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-600">Icon Preview:</p>
            <div className="inline-flex items-center justify-center rounded-lg bg-black p-4">
              <img
                src={skillIconUrl}
                alt={`${characterNameId} icon preview`}
                className="h-20 w-20 object-contain"
              />
            </div>
            <p className="text-xs text-slate-500 break-all">{skillIconUrl}</p>
          </div>
        </div>

        <SourceClassEditor type="character" className={characterClassName} />
        <CharacterClassAstFlow
          loading={astMapLoading}
          error={astMapError}
          astMapData={astMapData}
          classRelativePath={characterRelativeClassPath}
        />
      </motion.div>

      <Button onClick={() => navigate('/characters')} className="bg-blue-600 hover:bg-blue-700 text-white">
        Back
      </Button>

      <I18nDescriptionModal
        open={detail.i18nModalField !== null}
        title={detail.i18nModalField === 'name' ? 'Sửa Name (i18n)' : 'Sửa Description (i18n)'}
        editLang={detail.editLang}
        getValue={detail.getFormI18n}
        onChange={(lang, val) => detail.setFormI18n(lang, val)}
        onTranslate={detail.handleI18nTranslate}
        onSave={detail.handleI18nSave}
        onClose={detail.closeI18nPopup}
        translateLoading={detail.translateLoading}
        error={detail.i18nError}
      />
    </div>
  );
}
