import { Button } from '../ui/button';
import { onlyPositiveInt, type LevelStat, type I18nPopupField } from './equipmentUtils';
import type { EditLang } from '../LangDropdown';

const LANG_OPTIONS: EditLang[] = ['en', 'vi', 'ja'];
const LANG_LABELS: Record<EditLang, string> = {
  en: 'English',
  vi: 'Vietnamese',
  ja: 'Japanese',
};

interface EquipmentI18nPanelProps {
  field: I18nPopupField;
  editLang: EditLang;
  getFormI18n: (lang: EditLang) => string;
  setFormI18n: (lang: EditLang, val: string) => void;
  formLevelMax: number;
  formLevelStats: LevelStat[];
  expandedLevels: Set<number>;
  translateLoading: boolean;
  i18nError: string | null;
  onLevelMaxChange: (val: number) => void;
  onToggleLevelExpanded: (lvl: number) => void;
  onUpdateLevelStat: (lvlIdx: number, key: keyof LevelStat, value: number) => void;
  onTranslate: () => Promise<void>;
  onSave: () => void;
  onClose: () => void;
}

export function EquipmentI18nPanel({
  field,
  editLang,
  getFormI18n,
  setFormI18n,
  formLevelMax,
  formLevelStats,
  expandedLevels,
  translateLoading,
  i18nError,
  onLevelMaxChange,
  onToggleLevelExpanded,
  onUpdateLevelStat,
  onTranslate,
  onSave,
  onClose,
}: EquipmentI18nPanelProps) {
  const title =
    field === 'name'
      ? 'Sửa Name (i18n)'
      : field === 'description'
        ? 'Sửa Description (i18n)'
        : 'Level';

  return (
    <div
      className={`w-full max-w-md rounded-lg 
        bg-card overflow-hidden shadow-xl border border-border 
        flex-shrink-0 flex flex-col 
        ${field === 'level' ? 'min-w-[28rem] w-[28rem]' : ''}`}
    >
      <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-blue-500 rounded transition-colors text-xl leading-none"
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>
      <div
        className={`p-6 flex-1 overflow-auto ${field === 'level' ? 'min-h-[380px]' : ''}`}
      >
        {field === 'level' ? (
          <div className="space-y-4 min-h-[360px] flex flex-col">
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium mb-1">Max Level</label>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold tabular-nums">
                  {formLevelMax}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onLevelMaxChange(Math.max(1, formLevelMax - 1))}
                    disabled={formLevelMax <= 1}
                    className="w-9 h-9 flex items-center justify-center rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                    aria-label="Giảm"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => onLevelMaxChange(Math.min(99, formLevelMax + 1))}
                    disabled={formLevelMax >= 99}
                    className="w-9 h-9 flex items-center justify-center rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                    aria-label="Tăng"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-1 h-[280px] overflow-y-scroll overflow-x-hidden shrink-0 [scrollbar-gutter:stable]">
              {formLevelStats.map((stat, idx) => {
                const lvl = idx + 1;
                const expanded = expandedLevels.has(lvl);
                return (
                  <div
                    key={lvl}
                    className={`border rounded overflow-hidden ${expanded ? 'border-blue-400 ring-1 ring-blue-200' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleLevelExpanded(lvl)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${expanded ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
                    >
                      <span
                        className="text-slate-500 w-4 shrink-0"
                        aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}
                      >
                        {expanded ? '▼' : '▶'}
                      </span>
                      <span className="font-medium shrink-0">Level {lvl}</span>
                      <span className="text-red-600">Power {stat.power}</span>
                      <span className="text-blue-600">Cooldown {stat.cooldown}</span>
                      <span className="text-amber-600">Price 🪙 : {stat.price}</span>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-3 pt-2 grid grid-cols-3 gap-3 bg-slate-50/50 border-t border-slate-200">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Power
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={stat.power}
                            onChange={(e) =>
                              onUpdateLevelStat(
                                idx,
                                'power',
                                Math.max(0, Math.floor(Number(e.target.value) || 0))
                              )
                            }
                            onKeyDown={onlyPositiveInt}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Cooldown
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={stat.cooldown}
                            onChange={(e) =>
                              onUpdateLevelStat(
                                idx,
                                'cooldown',
                                Math.max(0, Math.floor(Number(e.target.value) || 0))
                              )
                            }
                            onKeyDown={onlyPositiveInt}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Price 🪙
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={stat.price}
                            onChange={(e) =>
                              onUpdateLevelStat(
                                idx,
                                'price',
                                Math.max(0, Math.floor(Number(e.target.value) || 0))
                              )
                            }
                            onKeyDown={onlyPositiveInt}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {([editLang, ...LANG_OPTIONS.filter((l) => l !== editLang)] as EditLang[]).map(
              (lang) => (
                <div key={lang}>
                  <label className="block text-sm font-medium mb-1 cursor-pointer">
                    {lang}
                    {lang === editLang && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">(gb)</span>
                    )}
                  </label>
                  {field === 'description' ? (
                    <textarea
                      value={getFormI18n(lang)}
                      onChange={(e) => setFormI18n(lang, e.target.value)}
                      className={`w-full rounded border px-3 py-2 text-sm min-h-[80px] resize-y ${
                        lang === editLang
                          ? 'border-blue-200 bg-blue-50/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-200'
                          : 'border-slate-200'
                      }`}
                      placeholder={LANG_LABELS[lang]}
                    />
                  ) : (
                    <input
                      type="text"
                      value={getFormI18n(lang)}
                      onChange={(e) => setFormI18n(lang, e.target.value)}
                      className={`w-full rounded border px-3 py-2 text-sm ${
                        lang === editLang
                          ? 'border-blue-200 bg-blue-50/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-200'
                          : 'border-slate-200'
                      }`}
                      placeholder={LANG_LABELS[lang]}
                    />
                  )}
                </div>
              )
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onTranslate}
              disabled={translateLoading || !getFormI18n(editLang).trim()}
              className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 text-sm"
            >
              {translateLoading ? 'Đang dịch...' : 'Gợi ý dịch máy'}
            </Button>
            {i18nError && <p className="text-sm text-red-600">{i18nError}</p>}
          </div>
        )}
      </div>
      <div className="p-4 border-t border-border">
        <Button onClick={onSave} className="w-full bg-blue-600 hover:bg-blue-700">
          Lưu
        </Button>
      </div>
    </div>
  );
}
