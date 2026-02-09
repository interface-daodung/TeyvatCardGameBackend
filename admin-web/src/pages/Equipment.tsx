import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquarePen } from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { localizationService } from '../services/localizationService';
import { gameDataService, type Item } from '../services/gameDataService';

/** Chỉ cho phép số nguyên dương (0, 1, 2, ...) - không có dấu . , */
const onlyPositiveInt = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['.', ',', '-', 'e', 'E', '+'].includes(e.key)) e.preventDefault();
};

/** Thông tin mỗi level: power, cooldown, price */
export interface LevelStat {
  power: number;
  cooldown: number;
  price: number;
}

/** Item type for display - combines Item from API + localization name/description */
export interface GameItem {
  _id: string;
  name: string;
  nameId: string;
  image: string;
  basePower: number;
  baseCooldown: number;
  description: string;
  level: number;
  maxLevel: number;
  /** Power formula: HealingPotion uses * (1 + level * 0.15), base Item uses * (1 + level * 0.2) */
  powerFormula?: 'healing' | 'base';
  /** i18n translations - nếu có thì dùng thay cho name/description */
  nameTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  /** Mỗi level từ 1..maxLevel có power, cooldown, price - index 0 = level 1 */
  levelStats?: LevelStat[];
  /** Sau này đọc từ API - status: 'ban' | 'pre-release' | ... ban thì header màu xám */
  status?: 'ban' | 'pre-release' | string;
}

const getDisplayPower = (item: GameItem): number => {
  if (item.powerFormula === 'healing') {
    return item.basePower * (1 + item.level * 0.15);
  }
  return item.basePower * (1 + item.level * 0.2);
};

const getDisplayCooldown = (item: GameItem): number => {
  return Math.max(0, item.baseCooldown - item.level * 0.5);
};

/** Bôi màu power (đỏ) và cooldown (xanh) trong description - hỗ trợ {basePower} {baseCooldown} {currPower} {currCooldown} */
const renderColoredDescription = (
  template: string,
  powerVal: number,
  cooldownVal: number
) => {
  const parts: (string | JSX.Element)[] = [];
  const re = /\{basePower\}|\{baseCooldown\}|\{currPower\}|\{currCooldown\}/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(template)) !== null) {
    parts.push(
      <span key={key++}>{template.slice(lastIndex, match.index)}</span>
    );
    if (match[0] === '{basePower}' || match[0] === '{currPower}') {
      parts.push(
        <span key={key++} className="text-red-600 font-medium">
          {powerVal}
        </span>
      );
    } else {
      parts.push(
        <span key={key++} className="text-blue-600 font-medium">
          {cooldownVal}
        </span>
      );
    }
    lastIndex = re.lastIndex;
  }
  parts.push(<span key={key++}>{template.slice(lastIndex)}</span>);
  return <>{parts}</>;
};

const getItemImageUrl = (imageName: string) =>
  `/assets/images/item/${imageName}.webp`;

/** Map Item from API + localization data -> GameItem for display */
function toGameItem(
  item: Item,
  nameLoc: { translations?: Record<string, string> } | null,
  descLoc: { translations?: Record<string, string> } | null
): GameItem {
  const nameTranslations = nameLoc?.translations ?? {};
  const descriptionTranslations = descLoc?.translations ?? {};
  return {
    _id: item._id,
    name: nameTranslations.en ?? item.nameId,
    nameId: item.nameId,
    image: item.nameId,
    basePower: item.basePower,
    baseCooldown: item.baseCooldown,
    description: descriptionTranslations.en ?? '',
    level: 0,
    maxLevel: item.maxLevel,
    levelStats: item.levelStats ?? [],
    nameTranslations,
    descriptionTranslations,
  };
}

type EditingField = 'basePower' | 'baseCooldown' | null;

type I18nPopupField = 'name' | 'description' | 'level' | null;

type EditLang = 'en' | 'vi' | 'ja';

const LANG_OPTIONS: EditLang[] = ['en', 'vi', 'ja'];

const LANG_LABELS: Record<EditLang, string> = { en: 'English', vi: 'Vietnamese', ja: 'Japanese' };

export default function Equipment() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GameItem | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editLang, setEditLang] = useState<EditLang>('en');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const apiItems = await gameDataService.getItems();
        if (cancelled) return;
        const gameItems: GameItem[] = [];
        for (const item of apiItems) {
          const nameKey = `item.${item.nameId}.name`;
          const descKey = `item.${item.nameId}.description`;
          let nameLoc: { translations?: Record<string, string> } | null = null;
          let descLoc: { translations?: Record<string, string> } | null = null;
          try {
            nameLoc = await localizationService.getLocalizationByKey(nameKey);
          } catch {
            /* key may not exist */
          }
          try {
            descLoc = await localizationService.getLocalizationByKey(descKey);
          } catch {
            /* key may not exist */
          }
          gameItems.push(toGameItem(item, nameLoc, descLoc));
        }
        setItems(gameItems);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  const [formValues, setFormValues] = useState<Partial<GameItem>>({});
  const [i18nPopupField, setI18nPopupField] = useState<I18nPopupField>(null);
  const [formI18nEn, setFormI18nEn] = useState('');
  const [formI18nVi, setFormI18nVi] = useState('');
  const [formI18nJa, setFormI18nJa] = useState('');
  const [translateLoading, setTranslateLoading] = useState(false);
  const [i18nError, setI18nError] = useState<string | null>(null);
  const [formLevelMax, setFormLevelMax] = useState(10);
  const [formLevelStats, setFormLevelStats] = useState<LevelStat[]>([]);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());

  const openEditModal = (item: GameItem) => {
    setSelectedItem(item);
    setFormValues({ ...item });
    setEditingField(null);
    setI18nPopupField(null);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedItem(null);
    setEditingField(null);
    setI18nPopupField(null);
  };

  const getFormI18n = (lang: EditLang) =>
    lang === 'en' ? formI18nEn : lang === 'vi' ? formI18nVi : formI18nJa;
  const setFormI18n = (lang: EditLang, val: string) => {
    if (lang === 'en') setFormI18nEn(val);
    else if (lang === 'vi') setFormI18nVi(val);
    else setFormI18nJa(val);
  };

  const openI18nPopup = (field: I18nPopupField) => {
    setI18nPopupField(field);
    setI18nError(null);
    if (field === 'name') {
      const t = formValues.nameTranslations ?? selectedItem?.nameTranslations;
      setFormI18nEn(t?.en ?? formValues.name ?? selectedItem?.name ?? '');
      setFormI18nVi(t?.vi ?? '');
      setFormI18nJa(t?.ja ?? '');
    } else if (field === 'description') {
      const t = formValues.descriptionTranslations ?? selectedItem?.descriptionTranslations;
      setFormI18nEn(t?.en ?? formValues.description ?? selectedItem?.description ?? '');
      setFormI18nVi(t?.vi ?? '');
      setFormI18nJa(t?.ja ?? '');
    } else if (field === 'level') {
      const max = formValues.maxLevel ?? selectedItem?.maxLevel ?? 10;
      setFormLevelMax(max);
      const stats = formValues.levelStats ?? selectedItem?.levelStats;
      if (stats && stats.length >= max) {
        setFormLevelStats(stats.slice(0, max));
      } else {
        const baseP = formValues.basePower ?? selectedItem?.basePower ?? 2;
        const baseC = formValues.baseCooldown ?? selectedItem?.baseCooldown ?? 18;
        const arr: LevelStat[] = [];
        for (let i = 0; i < max; i++) {
          arr.push(stats?.[i] ?? {
            power: Math.round(baseP * (1 + (i + 1) * 0.15)),
            cooldown: Math.max(0, baseC - (i + 1) * 0.5),
            price: (i + 1) * 100,
          });
        }
        setFormLevelStats(arr);
      }
      setExpandedLevels(new Set());
    }
  };

  const closeI18nPopup = () => {
    setI18nPopupField(null);
    setI18nError(null);
  };

  const toggleLevelExpanded = (lvl: number) => {
    setExpandedLevels((prev) => {
      if (prev.has(lvl)) return new Set();
      return new Set([lvl]);
    });
  };

  const handleLevelMaxChange = (val: number) => {
    const v = Math.max(1, Math.min(99, val));
    setFormLevelMax(v);
    setFormLevelStats((prev) => {
      const arr = [...prev];
      const baseP = formValues.basePower ?? selectedItem?.basePower ?? 2;
      const baseC = formValues.baseCooldown ?? selectedItem?.baseCooldown ?? 18;
      while (arr.length < v) {
        const i = arr.length;
        arr.push({
          power: Math.round(baseP * (1 + (i + 1) * 0.15)),
          cooldown: Math.max(0, baseC - (i + 1) * 0.5),
          price: (i + 1) * 100,
        });
      }
      return arr.slice(0, v);
    });
  };

  const updateLevelStat = (lvlIdx: number, key: keyof LevelStat, value: number) => {
    setFormLevelStats((prev) => {
      const next = [...prev];
      if (!next[lvlIdx]) return next;
      next[lvlIdx] = { ...next[lvlIdx], [key]: value };
      return next;
    });
  };

  const handleLevelSave = () => {
    setFormValues((p) => ({
      ...p,
      maxLevel: formLevelMax,
      levelStats: formLevelStats,
    }));
    closeI18nPopup();
  };

  const handleI18nTranslate = async () => {
    const sourceText = getFormI18n(editLang).trim();
    if (!sourceText) {
      setI18nError(`Vui lòng nhập ${editLang} trước (ngôn ngữ base để dịch)`);
      return;
    }
    setI18nError(null);
    setTranslateLoading(true);
    try {
      const promises: Promise<void>[] = [];
      if (editLang !== 'vi' && !formI18nVi.trim()) {
        promises.push(
          localizationService.translate(sourceText, editLang, 'vi').then(setFormI18nVi)
        );
      }
      if (editLang !== 'ja' && !formI18nJa.trim()) {
        promises.push(
          localizationService.translate(sourceText, editLang, 'ja').then(setFormI18nJa)
        );
      }
      if (editLang !== 'en' && !formI18nEn.trim()) {
        promises.push(
          localizationService.translate(sourceText, editLang, 'en').then(setFormI18nEn)
        );
      }
      await Promise.all(promises);
    } catch {
      setI18nError('Lỗi kết nối dịch máy, vui lòng thử lại');
    } finally {
      setTranslateLoading(false);
    }
  };

  const handleI18nSave = () => {
    if (i18nPopupField === 'name') {
      setFormValues((p) => ({
        ...p,
        name: formI18nEn.trim() || p.name,
        nameTranslations: {
          en: formI18nEn.trim(),
          vi: formI18nVi.trim(),
          ja: formI18nJa.trim(),
        },
      }));
    } else if (i18nPopupField === 'description') {
      setFormValues((p) => ({
        ...p,
        description: formI18nEn.trim() || p.description,
        descriptionTranslations: {
          en: formI18nEn.trim(),
          vi: formI18nVi.trim(),
          ja: formI18nJa.trim(),
        },
      }));
    }
    closeI18nPopup();
  };

  const getDisplayName = () =>
    formValues.nameTranslations?.[editLang] ?? formValues.name ?? selectedItem?.name ?? '';
  const getDisplayDescription = () =>
    formValues.descriptionTranslations?.[editLang] ?? formValues.description ?? selectedItem?.description ?? '';

  const handleSave = async () => {
    if (!selectedItem) return;
    setError(null);
    setSaveLoading(true);
    try {
      const nameId = formValues.nameId ?? selectedItem.nameId;
      const promises: Promise<unknown>[] = [];
      promises.push(
        gameDataService.updateItem(selectedItem._id, {
          basePower: formValues.basePower ?? selectedItem.basePower,
          baseCooldown: formValues.baseCooldown ?? selectedItem.baseCooldown,
          maxLevel: formValues.maxLevel ?? selectedItem.maxLevel,
          levelStats: formValues.levelStats ?? selectedItem.levelStats,
        })
      );
      if (formValues.nameTranslations) {
        promises.push(
          localizationService.updateLocalization(`item.${nameId}.name`, formValues.nameTranslations)
        );
      }
      if (formValues.descriptionTranslations) {
        promises.push(
          localizationService.updateLocalization(`item.${nameId}.description`, formValues.descriptionTranslations)
        );
      }
      await Promise.all(promises);
      setItems((prev) =>
        prev.map((it) =>
          it._id === selectedItem._id
            ? {
                ...it,
                ...formValues,
                name: formValues.nameTranslations?.[editLang] ?? formValues.name ?? it.name,
                description: formValues.descriptionTranslations?.[editLang] ?? formValues.description ?? it.description,
              }
            : it
        )
      );
      setSelectedItem((p) => (p && p._id === selectedItem._id ? { ...p, ...formValues } : p));
      closeEditModal();
    } catch (err) {
      console.error('Save failed:', err);
      setError(err instanceof Error ? err.message : 'Lỗi lưu');
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    if (selectedItem) setFormValues({ ...selectedItem });
  }, [selectedItem]);

  const getItemDisplayName = (item: GameItem, lang: EditLang) =>
    item.nameTranslations?.[lang] ?? item.name ?? item.nameId;
  const getItemDisplayDescription = (item: GameItem, lang: EditLang) =>
    item.descriptionTranslations?.[lang] ?? item.description ?? '';

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Equipment
          </h1>
          <p className="text-muted-foreground">
            Xem và quản lý các item trong game (đọc từ DB)
          </p>
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLangDropdownOpen((o) => !o)}
            onBlur={() => setTimeout(() => setLangDropdownOpen(false), 150)}
            className="min-w-[4rem]"
          >
            {editLang}
            <span className="ml-1">{langDropdownOpen ? '▲' : '▼'}</span>
          </Button>
          {langDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-md shadow-lg py-1 min-w-[4rem]">
              {LANG_OPTIONS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setEditLang(lang);
                    setLangDropdownOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-muted ${editLang === lang ? 'bg-muted font-medium' : ''}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground">Đang tải...</div>
      ) : (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {items.map((item) => (
          <Card
            key={item.nameId}
            role="button"
            tabIndex={0}
            onClick={() => openEditModal(item)}
            onKeyDown={(e) => e.key === 'Enter' && openEditModal(item)}
            className="relative border-0 shadow-sm hover:shadow-md hover:z-10 transition-all duration-300 overflow-visible group cursor-pointer"
          >
            <div className="bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-50 p-0.5 rounded-lg overflow-visible">
              <CardContent className="bg-card p-0 overflow-visible">
                {/* Khung hình item luôn vuông - ảnh tràn ra khi hover */}
                <div className="relative aspect-square bg-gradient-to-b from-emerald-200/50 to-teal-100/50 overflow-visible">
                  <img
                    src={getItemImageUrl(item.image)}
                    alt={getItemDisplayName(item, editLang)}
                    className="absolute inset-0 w-full h-full object-cover z-10 rounded-lg group-hover:scale-150 group-hover:-translate-y-3 transition-transform duration-300 ease-out"
                  />
                  <div className="absolute top-0.5 right-0.5 z-20">
                    <Badge
                      variant="secondary"
                      className="bg-emerald-600/90 text-white border-0 text-[9px] px-1 py-0"
                    >
                      Lv.{item.level}/{item.maxLevel}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="p-1.5 pb-0">
                  <CardTitle className="text-[11px] font-semibold text-emerald-800 leading-tight line-clamp-1">
                    {getItemDisplayName(item, editLang)}
                  </CardTitle>
                  <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">
                    {renderColoredDescription(getItemDisplayDescription(item, editLang), item.basePower, item.baseCooldown)}
                  </p>
                </CardHeader>

                <div className="px-1.5 pb-1.5 space-y-0.5">
                  <div className="flex items-center justify-between gap-0.5 text-[9px]">
                    <span className="text-emerald-600 font-medium">⚡{getDisplayPower(item).toFixed(1)}</span>
                    <span className="text-teal-600 font-medium">⏱{getDisplayCooldown(item).toFixed(1)}</span>
                  </div>
                  <div className="pt-0.5">
                    <span className="text-[8px] text-muted-foreground font-mono truncate block">
                      {item.nameId}
                    </span>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
      )}

      {/* Edit modal */}
      {editModalOpen &&
        selectedItem &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={closeEditModal}
              aria-hidden
            />
            <div className="relative z-10 flex items-stretch gap-4">
            <div className="w-full max-w-lg rounded-xl bg-card shadow-2xl border border-border overflow-hidden flex-shrink-0">
              <div className={`p-4 flex items-center justify-between gap-4 ${formValues.status === 'ban' ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Edit: {getItemDisplayName(selectedItem, editLang)}
                  </h2>
                  <p className={`text-sm mt-1 ${formValues.status === 'ban' ? 'text-gray-200' : 'text-emerald-100'}`}>
                    Sửa thông tin và bấm Lưu
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
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
                  {(() => {
                    const selectedLevelPreview = i18nPopupField === 'level' && expandedLevels.size > 0
                      ? [...expandedLevels][0]
                      : null;
                    const currStat = selectedLevelPreview && formLevelStats[selectedLevelPreview - 1];
                    const maxLvl = formValues.maxLevel ?? selectedItem?.maxLevel ?? 10;
                    return (
                      <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-muted-foreground">
                      NameId:
                    </span>
                    <code className="bg-muted px-1 rounded">
                      {formValues.nameId ?? selectedItem.nameId}
                    </code>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-muted-foreground">
                      Name:
                    </span>
                    <span>{getDisplayName()}</span>
                    <button
                      type="button"
                      onClick={() => openI18nPopup('name')}
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
                        <button type="button" onClick={() => openI18nPopup('level')} className="text-muted-foreground hover:text-foreground" aria-label="Edit level">
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
                              const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                              setFormValues((p) => ({ ...p, basePower: v }));
                            }}
                            onKeyDown={(e) => { onlyPositiveInt(e); if (e.key === 'Enter') setEditingField(null); }}
                            onBlur={() => setEditingField(null)}
                            className="w-20 border rounded px-2 py-1 text-sm"
                            autoFocus
                          />
                        ) : (
                          <>
                            <span className="text-red-600 font-medium">{formValues.basePower ?? selectedItem.basePower}</span>
                            <button type="button" onClick={() => setEditingField('basePower')} className="text-muted-foreground hover:text-foreground" aria-label="Edit base power">
                              <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-muted-foreground">Base Cooldown:</span>
                        {editingField === 'baseCooldown' ? (
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={formValues.baseCooldown ?? 0}
                            onChange={(e) => {
                              const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                              setFormValues((p) => ({ ...p, baseCooldown: v }));
                            }}
                            onKeyDown={(e) => { onlyPositiveInt(e); if (e.key === 'Enter') setEditingField(null); }}
                            onBlur={() => setEditingField(null)}
                            className="w-20 border rounded px-2 py-1 text-sm"
                            autoFocus
                          />
                        ) : (
                          <>
                            <span className="text-blue-600 font-medium">{formValues.baseCooldown ?? selectedItem.baseCooldown}</span>
                            <button type="button" onClick={() => setEditingField('baseCooldown')} className="text-muted-foreground hover:text-foreground" aria-label="Edit base cooldown">
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
                        <button type="button" onClick={() => openI18nPopup('level')} className="text-muted-foreground hover:text-foreground" aria-label="Edit level">
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
                          currStat ? currStat.power : (formValues.basePower ?? selectedItem.basePower ?? 0),
                          currStat ? currStat.cooldown : (formValues.baseCooldown ?? selectedItem.baseCooldown ?? 0)
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => openI18nPopup('description')}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        aria-label="Edit description i18n"
                      >
                        <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="flex justify-end items-center p-4 border-t border-border gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {saveLoading ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </div>

            {i18nPopupField && (
              <div className={`w-full max-w-md rounded-lg 
              bg-card overflow-hidden shadow-xl border border-border 
              flex-shrink-0 flex flex-col 
              ${i18nPopupField === 'level' ? 'min-w-[28rem] w-[28rem]' : ''}`}>
                <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
                  <h3 className="text-lg font-semibold">
                    {i18nPopupField === 'name' && 'Sửa Name (i18n)'}
                    {i18nPopupField === 'description' && 'Sửa Description (i18n)'}
                    {i18nPopupField === 'level' && 'Level'}
                  </h3>
                  <button
                    type="button"
                    onClick={closeI18nPopup}
                    className="p-1 hover:bg-blue-500 rounded transition-colors text-xl leading-none"
                    aria-label="Đóng"
                  >
                    ✕
                  </button>
                </div>
                <div className={`p-6 flex-1 overflow-auto ${i18nPopupField === 'level' ? 'min-h-[380px]' : ''}`}>
                  {i18nPopupField === 'level' ? (
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
                              onClick={() => handleLevelMaxChange(Math.max(1, formLevelMax - 1))}
                              disabled={formLevelMax <= 1}
                              className="w-9 h-9 flex items-center justify-center rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                              aria-label="Giảm"
                            >
                              −
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLevelMaxChange(Math.min(99, formLevelMax + 1))}
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
                            <div key={lvl} className={`border rounded overflow-hidden ${expanded ? 'border-blue-400 ring-1 ring-blue-200' : ''}`}>
                              <button
                                type="button"
                                onClick={() => toggleLevelExpanded(lvl)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${expanded ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
                              >
                                <span className="text-slate-500 w-4 shrink-0" aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}>
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
                                    <label className="text-xs font-medium text-muted-foreground block mb-1">Power</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={stat.power}
                                      onChange={(e) => updateLevelStat(idx, 'power', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                                      onKeyDown={onlyPositiveInt}
                                      className="w-full border rounded px-2 py-1 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground block mb-1">Cooldown</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={stat.cooldown}
                                      onChange={(e) => updateLevelStat(idx, 'cooldown', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                                      onKeyDown={onlyPositiveInt}
                                      className="w-full border rounded px-2 py-1 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground block mb-1">Price 🪙</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={stat.price}
                                      onChange={(e) => updateLevelStat(idx, 'price', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
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
                      {([editLang, ...LANG_OPTIONS.filter((l) => l !== editLang)] as EditLang[]).map((lang) => (
                        <div key={lang}>
                          <label className="block text-sm font-medium mb-1 cursor-pointer">
                            {lang}
                            {lang === editLang && (
                              <span className="ml-2 text-xs text-blue-600 font-normal">(gb)</span>
                            )}
                          </label>
                          {i18nPopupField === 'description' ? (
                            <textarea
                              value={getFormI18n(lang)}
                              onChange={(e) => setFormI18n(lang, e.target.value)}
                              className={`w-full rounded border px-3 py-2 text-sm min-h-[80px] resize-y ${
                                lang === editLang ? 'border-blue-200 bg-blue-50/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-200' : 'border-slate-200'
                              }`}
                              placeholder={LANG_LABELS[lang]}
                            />
                          ) : (
                            <input
                              type="text"
                              value={getFormI18n(lang)}
                              onChange={(e) => setFormI18n(lang, e.target.value)}
                              className={`w-full rounded border px-3 py-2 text-sm ${
                                lang === editLang ? 'border-blue-200 bg-blue-50/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-200' : 'border-slate-200'
                              }`}
                              placeholder={LANG_LABELS[lang]}
                            />
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleI18nTranslate}
                        disabled={translateLoading || !getFormI18n(editLang).trim()}
                        className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 text-sm"
                      >
                        {translateLoading ? 'Đang dịch...' : 'Gợi ý dịch máy'}
                      </Button>
                      {i18nError && (
                        <p className="text-sm text-red-600">{i18nError}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-border">
                  <Button
                    onClick={i18nPopupField === 'level' ? handleLevelSave : handleI18nSave}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Lưu
                  </Button>
                </div>
              </div>
            )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
