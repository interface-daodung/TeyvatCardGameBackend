import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquarePen } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/button';
import { getItemImageUrl, onlyPositiveInt, renderColoredDescription } from './equipmentUtils';
import { EquipmentI18nPanel } from './EquipmentI18nPanel';
import type { GameItem } from './equipmentUtils';
import type { EditLang } from '../LangDropdown';

interface EquipmentEditModalProps {
  selectedItem: GameItem;
  formValues: Partial<GameItem>;
  setFormValues: React.Dispatch<React.SetStateAction<Partial<GameItem>>>;
  editLang: EditLang;
  editingField: 'basePower' | 'baseCooldown' | null;
  setEditingField: (f: 'basePower' | 'baseCooldown' | null) => void;
  i18nPopupField: 'name' | 'description' | 'level' | null;
  expandedLevels: Set<number>;
  formLevelMax: number;
  formLevelStats: { power: number; cooldown: number; price: number }[];
  saveLoading: boolean;
  getItemDisplayName: (item: GameItem, lang: EditLang) => string;
  getDisplayName: () => string;
  getDisplayDescription: () => string;
  getFormI18n: (lang: EditLang) => string;
  setFormI18n: (lang: EditLang, val: string) => void;
  translateLoading: boolean;
  i18nError: string | null;
  error: string | null;
  onClose: () => void;
  onSave: () => void;
  onOpenI18nPopup: (field: 'name' | 'description' | 'level') => void;
  onCloseI18nPopup: () => void;
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
}

export function EquipmentEditModal({
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
  getItemDisplayName,
  getDisplayName,
  getDisplayDescription,
  getFormI18n,
  setFormI18n,
  translateLoading,
  i18nError,
  error,
  onClose,
  onSave,
  onOpenI18nPopup,
  onCloseI18nPopup,
  onLevelMaxChange,
  onToggleLevelExpanded,
  onUpdateLevelStat,
  onLevelSave,
  onI18nTranslate,
  onI18nSave,
}: EquipmentEditModalProps) {
  const selectedLevelPreview =
    i18nPopupField === 'level' && expandedLevels.size > 0 ? [...expandedLevels][0] : null;
  const currStat =
    selectedLevelPreview && formLevelStats[selectedLevelPreview - 1];
  const maxLvl = formValues.maxLevel ?? selectedItem?.maxLevel ?? 10;
  const basePower = formValues.basePower ?? selectedItem.basePower ?? 0;
  const baseCooldown = formValues.baseCooldown ?? selectedItem.baseCooldown ?? 0;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex items-stretch gap-4">
        <div className="w-full max-w-lg rounded-xl bg-card shadow-2xl border border-border overflow-hidden flex-shrink-0">
          <div
            className={`p-4 flex items-center justify-between gap-4 ${
              formValues.status === 'ban'
                ? 'bg-gradient-to-r from-gray-500 to-gray-600'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600'
            }`}
          >
            <div>
              <h2 className="text-xl font-semibold text-white">
                Edit: {getItemDisplayName(selectedItem, editLang)}
              </h2>
              <p
                className={`text-sm mt-1 ${formValues.status === 'ban' ? 'text-gray-200' : 'text-emerald-100'}`}
              >
                Sửa thông tin và bấm Lưu
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors text-3xl font-light leading-none"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>
          <div className="p-6 flex gap-6">
            <div className="flex-shrink-0">
              <img
                src={getItemImageUrl(selectedItem.image)}
                alt={getItemDisplayName(selectedItem, editLang)}
                className="aspect-square w-40 h-40 sm:w-48 sm:h-48 object-cover rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-2 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-muted-foreground">NameId:</span>
                <code className="bg-muted px-1 rounded">
                  {formValues.nameId ?? selectedItem.nameId}
                </code>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-muted-foreground">Name:</span>
                <span>{getDisplayName()}</span>
                <button
                  type="button"
                  onClick={() => onOpenI18nPopup('name')}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Edit name i18n"
                >
                  <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
                </button>
              </div>
              {currStat ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-muted-foreground">Power:</span>
                    <span className="text-red-600 font-medium">{currStat.power}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-muted-foreground">Cooldown:</span>
                    <span className="text-blue-600 font-medium">{currStat.cooldown}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-muted-foreground">Level:</span>
                    <span className="text-yellow-600 font-medium">
                      {selectedLevelPreview} / {maxLvl}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenI18nPopup('level')}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit level"
                    >
                      <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
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
                        className="w-20 border rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="text-red-600 font-medium">
                          {formValues.basePower ?? selectedItem.basePower}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingField('basePower')}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Edit base power"
                        >
                          <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
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
                        className="w-20 border rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="text-blue-600 font-medium">
                          {formValues.baseCooldown ?? selectedItem.baseCooldown}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingField('baseCooldown')}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Edit base cooldown"
                        >
                          <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-muted-foreground">Level:</span>
                    <span className="text-yellow-600 font-medium">
                      {formValues.level ?? selectedItem.level} / {maxLvl}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenI18nPopup('level')}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit level"
                    >
                      <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
              <div className="flex flex-col gap-2">
                <span className="font-medium text-muted-foreground">Description:</span>
                <div className="flex items-start gap-2">
                  <span className="flex-1">
                    {renderColoredDescription(
                      getDisplayDescription(),
                      currStat ? currStat.power : basePower,
                      currStat ? currStat.cooldown : baseCooldown
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenI18nPopup('description')}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    aria-label="Edit description i18n"
                  >
                    <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 p-4 border-t border-border">
            {error && (
              <div className="bg-destructive/10 text-destructive text-xs px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            <div className="flex justify-end items-center gap-2">
              <Button
                onClick={onSave}
                disabled={saveLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {saveLoading ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
          </div>
        </div>

        {i18nPopupField && (
          <EquipmentI18nPanel
            field={i18nPopupField}
            editLang={editLang}
            getFormI18n={getFormI18n}
            setFormI18n={setFormI18n}
            formLevelMax={formLevelMax}
            formLevelStats={formLevelStats}
            expandedLevels={expandedLevels}
            translateLoading={translateLoading}
            i18nError={i18nError}
            onLevelMaxChange={onLevelMaxChange}
            onToggleLevelExpanded={onToggleLevelExpanded}
            onUpdateLevelStat={onUpdateLevelStat}
            onTranslate={onI18nTranslate}
            onSave={
              i18nPopupField === 'level' ? onLevelSave : onI18nSave
            }
            onClose={onCloseI18nPopup}
          />
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
