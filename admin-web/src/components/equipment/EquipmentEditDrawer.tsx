import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useDragControls,
  usePresence,
} from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faFloppyDisk,
  faSquarePen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { EquipmentItemImagePicker } from './EquipmentItemImagePicker';
import {
  intNat,
  onlyPositiveInt,
  renderColoredDescription,
} from './equipmentUtils';
import type { FileTreeItem } from '../../services/filesService';
import { EquipmentItemFieldModal } from './EquipmentItemFieldModal';
import { ConfirmDangerDialog } from '../ConfirmDangerDialog';
import { EquipmentItemClassCodePanel } from './EquipmentItemClassCodePanel';
import { UnsavedChangesDialog } from '../unsavedChanges';
import {
  BottomDockFabShell,
  DockFabButtonRow,
  DockFabMotionGroup,
  DockPeekFabButton,
  StatusCyclePillButton,
  dockPeekFabIconClassName,
  enabledDisabledStatusPillClass,
  type EnabledDisabledStatus,
} from '../share';
import {
  slideInDrawerBottom,
  fadeInOverlay,
  fadeSlideUpModal,
} from '../animations/motionPresets';
import type { GameItem } from './equipmentUtils';
import type { EditLang } from '../LangDropdown';

interface EquipmentEditDrawerProps {
  selectedItem: GameItem;
  formValues: Partial<GameItem>;
  setFormValues: React.Dispatch<React.SetStateAction<Partial<GameItem>>>;
  editLang: EditLang;
  editingField: 'basePower' | 'baseCooldown' | 'unlockPrice' | null;
  setEditingField: (f: 'basePower' | 'baseCooldown' | 'unlockPrice' | null) => void;
  i18nPopupField: 'name' | 'description' | 'level' | null;
  expandedLevels: Set<number>;
  formLevelMax: number;
  formLevelStats: { power: number; cooldown: number; price: number }[];
  saveLoading: boolean;
  getDisplayName: () => string;
  getDisplayDescription: () => string;
  getFormI18n: (lang: EditLang) => string;
  setFormI18n: (lang: EditLang, val: string) => void;
  translateLoading: boolean;
  i18nError: string | null;
  levelStatsValidationError: string | null;
  error: string | null;
  onRequestClose: () => void;
  showUnsavedConfirm: boolean;
  onUnsavedStay: () => void;
  onUnsavedDiscard: () => void;
  onUnsavedSave: () => void;
  onSave: () => void;
  onOpenI18nPopup: (field: 'name' | 'description' | 'level') => void;
  onRequestCloseI18nPopup: () => void;
  showLevelUnsavedConfirm: boolean;
  onLevelUnsavedStay: () => void;
  onLevelUnsavedDiscard: () => void;
  onLevelUnsavedSave: () => void;
  showI18nUnsavedConfirm: boolean;
  onI18nUnsavedStay: () => void;
  onI18nUnsavedDiscard: () => void;
  onI18nUnsavedSave: () => void;
  onLevelMaxChange: (val: number) => void;
  onToggleLevelExpanded: (lvl: number) => void;
  onUpdateLevelStat: (
    lvlIdx: number,
    key: 'power' | 'cooldown' | 'price',
    value: number
  ) => void;
  onLevelSave: () => void;
  onI18nTranslate: () => Promise<void>;
  onI18nSave: () => void;
  imageTreeOpen: boolean;
  imageTree: FileTreeItem[] | null;
  imageTreeLoading: boolean;
  imageTreeExpanded: Set<string>;
  onToggleImageTree: () => void;
  onToggleImageTreeExpanded: (path: string) => void;
  onSelectItemImage: (path: string) => void;
  onCloseImageTree: () => void;
  showDeleteConfirm: boolean;
  deleteLoading: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export function EquipmentEditDrawer({
  selectedItem,
  formValues,
  setFormValues,
  editLang,
  editingField,
  setEditingField,
  i18nPopupField,
  expandedLevels,
  formLevelMax,
  formLevelStats,
  saveLoading,
  getDisplayName,
  getDisplayDescription,
  getFormI18n,
  setFormI18n,
  translateLoading,
  i18nError,
  levelStatsValidationError,
  error,
  onRequestClose,
  showUnsavedConfirm,
  onUnsavedStay,
  onUnsavedDiscard,
  onUnsavedSave,
  onSave,
  onOpenI18nPopup,
  onRequestCloseI18nPopup,
  showLevelUnsavedConfirm,
  onLevelUnsavedStay,
  onLevelUnsavedDiscard,
  onLevelUnsavedSave,
  showI18nUnsavedConfirm,
  onI18nUnsavedStay,
  onI18nUnsavedDiscard,
  onI18nUnsavedSave,
  onLevelMaxChange,
  onToggleLevelExpanded,
  onUpdateLevelStat,
  onLevelSave,
  onI18nTranslate,
  onI18nSave,
  imageTreeOpen,
  imageTree,
  imageTreeLoading,
  imageTreeExpanded,
  onToggleImageTree,
  onToggleImageTreeExpanded,
  onSelectItemImage,
  onCloseImageTree,
  showDeleteConfirm,
  deleteLoading,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: EquipmentEditDrawerProps) {
  const [isPresent, safeToRemove] = usePresence();
  const dragControls = useDragControls();
  /** Mặc định ẩn vùng ts-morph; bật bằng nút code ở FAB — toàn drawer chỉ còn editor class. */
  const [itemClassDrawerOpen, setItemClassDrawerOpen] = useState(false);

  useEffect(() => {
    setItemClassDrawerOpen(false);
  }, [selectedItem._id]);

  const selectedLevelPreview =
    i18nPopupField === 'level' && expandedLevels.size > 0 ? [...expandedLevels][0] : null;
  const currStat =
    selectedLevelPreview && formLevelStats[selectedLevelPreview - 1];
  const maxLvl = formValues.maxLevel ?? selectedItem?.maxLevel ?? 1;
  const level1Power = intNat(formValues.basePower ?? selectedItem.basePower);
  const level1Cooldown = intNat(formValues.baseCooldown ?? selectedItem.baseCooldown);
  const level1Price = intNat(formValues.unlockPrice ?? selectedItem.unlockPrice ?? 0);
  const basePower = formValues.basePower ?? selectedItem.basePower ?? 0;
  const baseCooldown = formValues.baseCooldown ?? selectedItem.baseCooldown ?? 0;

  const i18nFieldModal =
    i18nPopupField === 'name' ||
    i18nPopupField === 'level' ||
    i18nPopupField === 'description'
      ? i18nPopupField
      : null;

  const itemClassPath =
    (formValues.className ?? selectedItem.className ?? '').trim();

  const itemStatus: EnabledDisabledStatus =
    (formValues.status ?? selectedItem.status) === 'enabled' ? 'enabled' : 'disabled';

  const metaFields = (
    <>
      <div className="mx-auto shrink-0 sm:mx-0">
        <EquipmentItemImagePicker
          item={selectedItem}
          formImage={formValues.image}
          isTreeOpen={imageTreeOpen}
          onToggleTree={onToggleImageTree}
          imageTree={imageTree}
          imageTreeLoading={imageTreeLoading}
          imageTreeExpanded={imageTreeExpanded}
          onToggleExpanded={onToggleImageTreeExpanded}
          onSelectImage={onSelectItemImage}
          onCloseTree={onCloseImageTree}
        />
      </div>
      <motion.div
        layout
        transition={{ layout: { duration: 0.2, ease: 'easeOut' } }}
        className="min-w-0 flex-1 space-y-3 text-base leading-relaxed"
      >
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-medium text-muted-foreground">NameId:</span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-base">
              {formValues.nameId ?? selectedItem.nameId}
            </code>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-medium text-muted-foreground">Status:</span>
            <StatusCyclePillButton
              value={itemStatus}
              options={['enabled', 'disabled'] as const}
              onChange={(next) => setFormValues((p) => ({ ...p, status: next }))}
              getPillClassName={enabledDisabledStatusPillClass}
              aria-label="Trạng thái item"
            />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-medium text-muted-foreground">Name:</span>
            <span>{getDisplayName()}</span>
            <button
              type="button"
              onClick={() => onOpenI18nPopup('name')}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Edit name i18n"
            >
              <FontAwesomeIcon icon={faSquarePen} className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-medium text-muted-foreground">Unlock price:</span>
            {editingField === 'unlockPrice' ? (
              <input
                type="number"
                min={0}
                step={1}
                value={formValues.unlockPrice ?? selectedItem.unlockPrice ?? 0}
                onChange={(e) => {
                  const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                  setFormValues((p) => ({ ...p, unlockPrice: v }));
                }}
                onKeyDown={(e) => {
                  onlyPositiveInt(e);
                  if (e.key === 'Enter') setEditingField(null);
                }}
                onBlur={() => setEditingField(null)}
                className="w-28 rounded border px-2.5 py-1.5 text-base"
                autoFocus
              />
            ) : (
              <>
                <span className="text-lg font-semibold text-amber-600">
                  {formValues.unlockPrice ?? selectedItem.unlockPrice ?? 0}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingField('unlockPrice')}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Edit unlock price"
                >
                  <FontAwesomeIcon icon={faSquarePen} className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {currStat ? (
            <>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-medium text-muted-foreground">Power:</span>
                <span className="text-lg font-semibold text-red-600">{currStat.power}</span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-medium text-muted-foreground">Cooldown:</span>
                <span className="text-lg font-semibold text-blue-600">{currStat.cooldown}</span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-medium text-muted-foreground">Level:</span>
                <span className="text-lg font-semibold text-yellow-600">
                  {selectedLevelPreview} / {maxLvl}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenI18nPopup('level')}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Edit level"
                >
                  <FontAwesomeIcon icon={faSquarePen} className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-medium text-muted-foreground">Base Power:</span>
                {editingField === 'basePower' ? (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formValues.basePower ?? 0}
                    onChange={(e) => {
                      const v = Math.max(
                        0,
                        Math.floor(Number(e.target.value) || 0)
                      );
                      setFormValues((p) => ({ ...p, basePower: v }));
                    }}
                    onKeyDown={(e) => {
                      onlyPositiveInt(e);
                      if (e.key === 'Enter') setEditingField(null);
                    }}
                    onBlur={() => setEditingField(null)}
                    className="w-24 rounded border px-2.5 py-1.5 text-base"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="text-lg font-semibold text-red-600">
                      {formValues.basePower ?? selectedItem.basePower}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingField('basePower')}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit base power"
                    >
                      <FontAwesomeIcon icon={faSquarePen} className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-medium text-muted-foreground">
                  Base Cooldown:
                </span>
                {editingField === 'baseCooldown' ? (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formValues.baseCooldown ?? 0}
                    onChange={(e) => {
                      const v = Math.max(
                        0,
                        Math.floor(Number(e.target.value) || 0)
                      );
                      setFormValues((p) => ({ ...p, baseCooldown: v }));
                    }}
                    onKeyDown={(e) => {
                      onlyPositiveInt(e);
                      if (e.key === 'Enter') setEditingField(null);
                    }}
                    onBlur={() => setEditingField(null)}
                    className="w-24 rounded border px-2.5 py-1.5 text-base"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="text-lg font-semibold text-blue-600">
                      {formValues.baseCooldown ?? selectedItem.baseCooldown}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingField('baseCooldown')}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit base cooldown"
                    >
                      <FontAwesomeIcon icon={faSquarePen} className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-medium text-muted-foreground">Level:</span>
                <span className="text-lg font-semibold text-yellow-600">
                  {formValues.level ?? selectedItem.level} / {maxLvl}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenI18nPopup('level')}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Edit level"
                >
                  <FontAwesomeIcon icon={faSquarePen} className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
          <div className="flex flex-col gap-2.5">
            <span className="font-medium text-muted-foreground">Description:</span>
            <p className="m-0 text-base leading-relaxed">
              {renderColoredDescription(
                getDisplayDescription(),
                currStat ? currStat.power : basePower,
                currStat ? currStat.cooldown : baseCooldown
              )}
              <button
                type="button"
                onClick={() => onOpenI18nPopup('description')}
                className="ml-1.5 inline-flex align-baseline text-muted-foreground hover:text-foreground"
                aria-label="Edit description i18n"
              >
                <FontAwesomeIcon icon={faSquarePen} className="h-4 w-4 translate-y-px" />
              </button>
            </p>
          </div>
      </motion.div>
    </>
  );

  const mainForm = itemClassDrawerOpen ? (
    <div className="flex min-h-0 min-w-0 max-h-[calc(100dvh-11.5rem)] flex-col overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
      <EquipmentItemClassCodePanel
        variant="fullDrawer"
        itemRelativePath={itemClassPath}
        onChangePath={(path) => setFormValues((p) => ({ ...p, className: path }))}
      />
    </div>
  ) : (
    <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:gap-8 sm:p-6 md:p-8">
      {metaFields}
    </div>
  );

  const drawer = (
    <motion.aside
      variants={slideInDrawerBottom}
      initial="hidden"
      animate="visible"
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 320 }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (info.offset.y > 72 || info.velocity.y > 500) {
          onRequestClose();
        }
      }}
      className="flex min-h-0 flex-1 flex-col w-[calc(100%+2rem)] max-w-none -mx-4 min-w-0 rounded-t-2xl border border-border border-b-0 bg-card shadow-[0_-10px_40px_-4px_rgba(0,0,0,0.12)] z-30 overflow-hidden"
    >
      <div
        className="flex justify-center pt-2.5 pb-2 shrink-0 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => dragControls.start(e)}
        role="presentation"
        aria-label="Kéo xuống để đóng"
      >
        <div className="h-1.5 w-12 rounded-full bg-muted-foreground/35" />
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div
          className={
            'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain ' +
            'pb-[calc(500px+1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(500px+2rem+env(safe-area-inset-bottom,0px))]'
          }
        >
          {mainForm}
          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="mx-4 mt-3 shrink-0 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive sm:mx-5"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );

  /** Neo đáy viewport (portal): absolute trong drawer bị đẩy xuống theo chiều cao scroll → ra khỏi màn hình */
  const equipmentFabPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <BottomDockFabShell>
            <DockFabMotionGroup
              aria-label="Thao tác item"
              initial={{ y: 72, opacity: 0 }}
              animate={
                isPresent
                  ? { y: 0, opacity: 1 }
                  : { y: 72, opacity: 0 }
              }
              transition={{
                duration: 0.36,
                ease: [0.22, 1, 0.36, 1],
              }}
              onAnimationComplete={() => {
                if (!isPresent) safeToRemove();
              }}
            >
              <DockFabButtonRow>
                <DockPeekFabButton
                  tone="destructive"
                  onClick={onRequestDelete}
                  disabled={saveLoading || deleteLoading || showDeleteConfirm}
                  title="Xóa item"
                  aria-label="Xóa item"
                >
                  <FontAwesomeIcon
                    icon={faTrash}
                    className={dockPeekFabIconClassName}
                    aria-hidden
                  />
                </DockPeekFabButton>
                <DockPeekFabButton
                  tone="primary"
                  onClick={onSave}
                  disabled={saveLoading}
                  title="Lưu"
                  aria-label="Lưu"
                >
                  {saveLoading ? (
                    <span
                      className={`inline-block ${dockPeekFabIconClassName} animate-spin rounded-full border-2 border-white/35 border-t-white`}
                      aria-hidden
                    />
                  ) : (
                    <FontAwesomeIcon
                      icon={faFloppyDisk}
                      className={dockPeekFabIconClassName}
                      aria-hidden
                    />
                  )}
                </DockPeekFabButton>
                <DockPeekFabButton
                  tone={itemClassDrawerOpen ? 'slateActive' : 'slate'}
                  onClick={() => setItemClassDrawerOpen((v) => !v)}
                  title={
                    itemClassDrawerOpen
                      ? 'Đóng trình sửa class'
                      : 'Mở trình sửa class (toàn drawer)'
                  }
                  aria-label={
                    itemClassDrawerOpen
                      ? 'Đóng trình sửa class'
                      : 'Mở trình sửa class'
                  }
                  aria-pressed={itemClassDrawerOpen}
                >
                  <FontAwesomeIcon
                    icon={faCode}
                    className={dockPeekFabIconClassName}
                    aria-hidden
                  />
                </DockPeekFabButton>
              </DockFabButtonRow>
            </DockFabMotionGroup>
          </BottomDockFabShell>,
          document.body
        )
      : null;

  const i18nModalPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {i18nFieldModal ? (
              <motion.div
                key={`i18n-modal-${i18nFieldModal}`}
                className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  role="presentation"
                  variants={fadeInOverlay}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute inset-0 bg-black/50"
                  onClick={onRequestCloseI18nPopup}
                />
                <motion.div
                  variants={fadeSlideUpModal}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={`relative z-10 w-full max-h-[min(92vh,960px)] flex flex-col min-h-0 ${
                    i18nFieldModal === 'level'
                      ? 'max-w-[min(48rem,96vw)]'
                      : i18nFieldModal === 'description'
                        ? 'max-w-[min(42rem,96vw)]'
                        : 'max-w-[min(34rem,95vw)]'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="rounded-2xl overflow-hidden bg-card flex flex-col min-h-0 max-h-[min(92vh,960px)]
                      ring-1 ring-slate-900/[0.08]
                      shadow-[0_12px_48px_-12px_rgba(15,23,42,0.28),0_4px_16px_-4px_rgba(15,23,42,0.12)]"
                  >
                    <EquipmentItemFieldModal
                      field={i18nFieldModal}
                      editLang={editLang}
                      getFormI18n={getFormI18n}
                      setFormI18n={setFormI18n}
                      formLevelMax={formLevelMax}
                      formLevelStats={formLevelStats}
                      expandedLevels={expandedLevels}
                      translateLoading={translateLoading}
                      i18nError={i18nError}
                      levelStatsValidationError={levelStatsValidationError}
                      level1Power={level1Power}
                      level1Cooldown={level1Cooldown}
                      level1Price={level1Price}
                      onLevelMaxChange={onLevelMaxChange}
                      onToggleLevelExpanded={onToggleLevelExpanded}
                      onUpdateLevelStat={onUpdateLevelStat}
                      onTranslate={onI18nTranslate}
                      onSave={i18nFieldModal === 'level' ? onLevelSave : onI18nSave}
                      onClose={onRequestCloseI18nPopup}
                      modalSurface
                    />
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col min-w-0">
      {drawer}
      {equipmentFabPortal}
      {i18nModalPortal}
      {createPortal(
        <>
          <UnsavedChangesDialog
            open={showUnsavedConfirm}
            onStay={onUnsavedStay}
            onDiscard={onUnsavedDiscard}
            onSave={onUnsavedSave}
            saveLoading={saveLoading}
            title="Lưu thay đổi?"
            description="Bạn đã chỉnh sửa equipment. Bạn có muốn lưu trước khi đóng không?"
          />
          <UnsavedChangesDialog
            open={showLevelUnsavedConfirm}
            onStay={onLevelUnsavedStay}
            onDiscard={onLevelUnsavedDiscard}
            onSave={onLevelUnsavedSave}
            overlayClassName="z-[20100]"
            title="Lưu thay đổi?"
            description="Bạn đã chỉnh sửa level. Bạn có muốn lưu vào form trước khi đóng không?"
          />
          <UnsavedChangesDialog
            open={showI18nUnsavedConfirm}
            onStay={onI18nUnsavedStay}
            onDiscard={onI18nUnsavedDiscard}
            onSave={onI18nUnsavedSave}
            overlayClassName="z-[20100]"
            title="Lưu thay đổi?"
            description={
              i18nPopupField === 'name'
                ? 'Bạn đã chỉnh sửa tên (i18n). Bạn có muốn lưu vào form trước khi đóng không?'
                : 'Bạn đã chỉnh sửa mô tả (i18n). Bạn có muốn lưu vào form trước khi đóng không?'
            }
          />
          <ConfirmDangerDialog
            open={showDeleteConfirm}
            onCancel={onCancelDelete}
            onConfirm={onConfirmDelete}
            confirmLoading={deleteLoading}
            title="Xóa item?"
            description="Xóa item này khỏi DB? Hành động không hoàn tác."
            confirmLabel="Xóa"
            confirmLoadingLabel="Đang xóa…"
          />
        </>,
        document.body
      )}
    </div>
  );
}
