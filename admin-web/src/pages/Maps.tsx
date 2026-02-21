import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  gameDataService,
  type Map as MapType,
  type MapTypeRatios,
  type MapCreatePayload,
  type AdventureCard,
} from '../services/gameDataService';
import { localizationService } from '../services/localizationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { PageHeader } from '../components/PageHeader';

type EditLang = 'en' | 'vi' | 'ja';
const LANG_OPTIONS: EditLang[] = ['en', 'vi', 'ja'];

const TYPE_RATIO_KEYS: (keyof MapTypeRatios)[] = [
  'enemies',
  'food',
  'weapons',
  'coins',
  'traps',
  'treasures',
  'bombs',
];

const TYPE_RATIO_ICONS: Record<keyof MapTypeRatios, string> = {
  enemies: '👹',
  food: '🍖',
  weapons: '⚔️',
  coins: '🪙',
  traps: '🕳️',
  treasures: '💎',
  bombs: '💣',
};

const MAP_STATUSES: ('enabled' | 'disabled' | 'hidden')[] = ['enabled', 'disabled', 'hidden'];

const DEFAULT_TYPE_RATIOS: MapTypeRatios = {
  enemies: 0,
  food: 0,
  weapons: 0,
  coins: 0,
  traps: 0,
  treasures: 0,
  bombs: 0,
};

/** Màu input Type ratios: 0=trắng, 1–9=xám, 10+ đậm dần qua xanh lá → vàng → đỏ → tím nhạt (max). */
function getRatioInputColorClass(value: number): string {
  const v = Math.max(0, Math.min(100, value));
  if (v === 0) return 'bg-white border-slate-200 text-slate-800';
  if (v < 5) return 'bg-slate-200 border-slate-300 text-slate-800';
  if (v < 10) return 'bg-green-100 border-green-300 text-green-900';
  if (v < 20) return 'bg-green-200 border-green-400 text-green-900';
  if (v < 30) return 'bg-yellow-200 border-yellow-400 text-yellow-900';
  if (v < 35) return 'bg-amber-200 border-amber-400 text-amber-900';
  if (v < 40) return 'bg-orange-200 border-orange-400 text-orange-900';
  if (v < 50) return 'bg-red-200 border-red-400 text-red-900';
  return 'bg-purple-200 border-purple-400 text-purple-900';
}

/** Tổng 7 loại (không tính free). */
function sumTypeRatios(tr: MapTypeRatios): number {
  return TYPE_RATIO_KEYS.reduce((s, k) => s + (tr[k] ?? 0), 0);
}

/** Free ratio = phần còn lại để tổng = 100. Luôn trong [0, 100]. */
function getFreeRatio(tr: MapTypeRatios): number {
  return Math.max(0, Math.min(100, 100 - sumTypeRatios(tr)));
}

function getFormTypeRatios(tr?: MapTypeRatios | null): MapTypeRatios {
  if (!tr || typeof tr !== 'object') return { ...DEFAULT_TYPE_RATIOS };
  return {
    enemies: tr.enemies ?? 0,
    food: tr.food ?? 0,
    weapons: tr.weapons ?? 0,
    coins: tr.coins ?? 0,
    traps: tr.traps ?? 0,
    treasures: tr.treasures ?? 0,
    bombs: tr.bombs ?? 0,
  };
}

function getCardImageUrl(card: AdventureCard): string {
  if (card.image) return card.image;
  const basePath = '/assets/images/cards';
  if (card.type === 'empty') return `${basePath}/empty.webp`;
  return `${basePath}/${card.type}/${card.nameId}.webp`;
}

export default function Maps() {
  const [maps, setMaps] = useState<MapType[]>([]);
  const [adventureCards, setAdventureCards] = useState<AdventureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<MapType | null>(null);
  const [form, setForm] = useState<{
    nameId: string;
    name: string;
    description: string;
    typeRatios: MapTypeRatios;
  status: 'enabled' | 'disabled' | 'hidden';
  deckIds: string[];
  }>({
    nameId: '',
    name: '',
    description: '',
    typeRatios: { ...DEFAULT_TYPE_RATIOS },
    status: 'enabled',
    deckIds: [],
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isDeckDragOver, setIsDeckDragOver] = useState(false);
  // i18n for name (readOnly + Edit i18n)
  const [nameTranslations, setNameTranslations] = useState<Record<string, string> | null>(null);
  const [editLang, setEditLang] = useState<EditLang>('en');
  const [i18nField, setI18nField] = useState<'name' | null>(null);
  const [formI18nEn, setFormI18nEn] = useState('');
  const [formI18nVi, setFormI18nVi] = useState('');
  const [formI18nJa, setFormI18nJa] = useState('');
  const [translateLoading, setTranslateLoading] = useState(false);
  const [i18nError, setI18nError] = useState<string | null>(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [ratioTooltipKey, setRatioTooltipKey] = useState<keyof MapTypeRatios | 'free' | null>(null);

  const fetchMaps = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gameDataService.getMaps();
      setMaps(data);
    } catch (err) {
      console.error('Failed to fetch maps:', err);
      setError('Không tải được danh sách maps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaps();
  }, []);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const data = await gameDataService.getAdventureCards();
        setAdventureCards(data);
      } catch (err) {
        console.error('Failed to fetch adventure cards:', err);
      }
    };
    fetchCards();
  }, []);

  const openCreateModal = () => {
    setEditingMap(null);
    setForm({
      nameId: '',
      name: '',
      description: '',
      typeRatios: { ...DEFAULT_TYPE_RATIOS },
      status: 'enabled',
      deckIds: [],
    });
    setModalOpen(true);
  };

  const openEditModal = (map: MapType) => {
    setEditingMap(map);
    setForm({
      nameId: map.nameId,
      name: map.name,
      description: map.description ?? '',
      typeRatios: getFormTypeRatios(map.typeRatios),
      status: map.status,
      deckIds: (map.deck ?? []).map((c: AdventureCard) => c._id),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingMap(null);
    setIsDeckDragOver(false);
    setNameTranslations(null);
    setI18nField(null);
    setI18nError(null);
  };

  // Load name i18n when editing a map
  useEffect(() => {
    if (!editingMap) {
      setNameTranslations(null);
      return;
    }
    const key = `map.${editingMap.nameId}.name`;
    localizationService
      .getLocalizationByKey(key)
      .then((loc) => setNameTranslations(loc.translations ?? {}))
      .catch(() => setNameTranslations(null));
  }, [editingMap]);

  const getFormI18n = (lang: EditLang) =>
    lang === 'en' ? formI18nEn : lang === 'vi' ? formI18nVi : formI18nJa;
  const setFormI18n = (lang: EditLang, val: string) => {
    if (lang === 'en') setFormI18nEn(val);
    else if (lang === 'vi') setFormI18nVi(val);
    else setFormI18nJa(val);
  };

  const openI18nNameEditor = async () => {
    if (!editingMap) return;
    setI18nField('name');
    setI18nError(null);
    const key = `map.${editingMap.nameId}.name`;
    try {
      const loc = await localizationService.getLocalizationByKey(key);
      const t = loc.translations ?? {};
      setFormI18nEn(t.en ?? form.name ?? editingMap.name);
      setFormI18nVi(t.vi ?? '');
      setFormI18nJa(t.ja ?? '');
    } catch {
      setFormI18nEn(form.name ?? editingMap.name ?? '');
      setFormI18nVi('');
      setFormI18nJa('');
    }
  };

  const handleI18nTranslate = async () => {
    const sourceText = getFormI18n(editLang).trim();
    if (!sourceText) {
      setI18nError('Vui lòng nhập nội dung gốc trước khi dịch');
      return;
    }
    setI18nError(null);
    setTranslateLoading(true);
    try {
      const promises: Promise<void>[] = [];
      if (!formI18nVi.trim())
        promises.push(localizationService.translate(sourceText, editLang, 'vi').then(setFormI18nVi));
      if (!formI18nJa.trim())
        promises.push(localizationService.translate(sourceText, editLang, 'ja').then(setFormI18nJa));
      await Promise.all(promises);
    } catch {
      setI18nError('Lỗi gọi dịch máy, hãy thử lại');
    } finally {
      setTranslateLoading(false);
    }
  };

  const handleI18nSave = async () => {
    if (!editingMap || i18nField !== 'name') return;
    const translations = {
      en: formI18nEn.trim(),
      vi: formI18nVi.trim(),
      ja: formI18nJa.trim(),
    };
    const key = `map.${editingMap.nameId}.name`;
    try {
      await localizationService.updateLocalization(key, translations);
    } catch {
      try {
        await localizationService.createLocalization(key, translations);
      } catch {
        setI18nError('Không lưu được bản dịch, hãy thử lại');
        return;
      }
    }
    setNameTranslations(translations);
    setI18nField(null);
    setI18nError(null);
  };

  const setTypeRatio = (key: keyof MapTypeRatios, rawValue: number) => {
    setForm((prev) => {
      const tr = prev.typeRatios;
      const sumOthers = sumTypeRatios(tr) - (tr[key] ?? 0);
      const maxAllowed = 100 - sumOthers;
      const value = Math.min(maxAllowed, Math.max(0, rawValue));
      return {
        ...prev,
        typeRatios: { ...tr, [key]: value },
      };
    });
  };

  const freeRatio = getFreeRatio(form.typeRatios);
  const canSaveRatios = freeRatio === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSaveRatios) {
      setError('Tổng tỉ lệ phải bằng 100 (free ratio phải về 0 mới được lưu).');
      return;
    }
    setSubmitLoading(true);
    setError(null);
    try {
      const payload: MapCreatePayload = {
        nameId: form.nameId.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        typeRatios: form.typeRatios,
        deck: form.deckIds,
        status: form.status,
      };
      if (editingMap) {
        await gameDataService.updateMap(editingMap._id, payload);
      } else {
        await gameDataService.createMap(payload);
      }
      await fetchMaps();
      closeModal();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Có lỗi';
      setError(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingMap) return;
    if (!window.confirm(`Bạn có chắc xóa map "${editingMap.name}"?`)) return;
    setDeleteLoading(true);
    try {
      await gameDataService.deleteMap(editingMap._id);
      closeModal();
      await fetchMaps();
    } catch (err) {
      console.error('Failed to delete map:', err);
      setError('Xóa map thất bại');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Maps" description="Quản lý map dungeon và deck thẻ" />
        <Button onClick={openCreateModal} className="bg-primary-600 hover:bg-primary-700">
          Thêm map
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {maps.map((map) => (
          <Card
            key={map._id}
            className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary-50 to-red-50 p-1">
              <CardContent className="bg-card p-6">
                <CardHeader className="p-0 mb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-2xl text-primary-700 flex items-center">
                        <span className="mr-2 text-3xl">🗺️</span>
                        {map.name}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <CardDescription className="font-mono text-sm">{map.nameId}</CardDescription>
                        <Badge
                          variant="outline"
                          className={
                            map.status === 'enabled'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : map.status === 'hidden'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                          }
                        >
                          {map.status}
                        </Badge>
                      </div>
                      {map.description && (
                        <CardDescription className="mt-2 text-base">{map.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(map)}>
                        Sửa
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {map.typeRatios && Object.keys(map.typeRatios).length > 0 && (
                  <div className="mb-4">
                    <span className="text-sm font-semibold text-foreground">Type ratios: </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(map.typeRatios).map(
                        ([k, v]) =>
                          v != null && (
                            <Badge key={k} variant="outline" className="bg-white border-primary-200">
                              {k}: {v}
                            </Badge>
                          )
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <div className="flex items-center mb-3">
                    <span className="text-sm font-semibold text-foreground mr-2">
                      📚 Deck ({map.deck?.length ?? 0} thẻ):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-br from-primary-50 to-red-50 rounded-lg border border-primary-100">
                    {(map.deck ?? []).map((card: AdventureCard) => (
                      <Badge
                        key={card._id}
                        variant="outline"
                        className="bg-white border-primary-200 text-primary-700 hover:bg-primary-50"
                      >
                        {card.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen w-full">
            <div
              className="absolute inset-0 min-h-full w-full bg-black/50"
              onClick={closeModal}
              aria-hidden
            />
            <div className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col rounded-lg bg-card shadow-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-primary-600 text-white shrink-0">
                <h2 className="text-xl font-semibold">
                  {editingMap ? 'Sửa map' : 'Thêm map'}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1 hover:bg-primary-500 rounded transition-colors text-xl leading-none"
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-1 min-h-0 overflow-hidden">
              <form onSubmit={handleSubmit} className="space-y-4 p-6 flex-1 overflow-y-auto min-w-0">
                <div>
                  <label htmlFor="map-nameId" className="block text-sm font-medium mb-1">
                    nameId (ID duy nhất)
                  </label>
                  <input
                    id="map-nameId"
                    type="text"
                    value={form.nameId}
                    onChange={(e) => setForm((p) => ({ ...p, nameId: e.target.value }))}
                    disabled={!!editingMap}
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500 font-mono"
                    placeholder="vd: dungeon_ice_palace"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label htmlFor="map-name" className="block text-sm font-medium">
                      Tên hiển thị
                    </label>
                    {editingMap ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => setLangDropdownOpen((o) => !o)}
                              onBlur={() => setTimeout(() => setLangDropdownOpen(false), 150)}
                            >
                              {editLang}
                              <span className="ml-0.5">{langDropdownOpen ? '▲' : '▼'}</span>
                            </Button>
                            {langDropdownOpen && (
                              <div className="absolute right-0 top-full mt-0.5 z-30 bg-card border border-border rounded shadow py-1 min-w-[4rem]">
                                {LANG_OPTIONS.map((lang) => (
                                  <button
                                    key={lang}
                                    type="button"
                                    onClick={() => {
                                      setEditLang(lang);
                                      setLangDropdownOpen(false);
                                    }}
                                    className={`block w-full text-left px-2 py-1.5 text-xs hover:bg-muted ${editLang === lang ? 'bg-muted font-medium' : ''}`}
                                  >
                                    {lang}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={openI18nNameEditor}
                            className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                          >
                            Sửa i18n
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                  <input
                    id="map-name"
                    type="text"
                    readOnly={!!editingMap}
                    value={
                      editingMap
                        ? (nameTranslations ?? undefined)?.[editLang] ?? form.name ?? editingMap.name
                        : form.name
                    }
                    onChange={(e) => !editingMap && setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm bg-background disabled:bg-muted/50 read-only:bg-muted/50"
                    placeholder="vd: Ice Palace"
                  />
                </div>
                <div>
                  <label htmlFor="map-description" className="block text-sm font-medium mb-1">
                    Mô tả
                  </label>
                  <textarea
                    id="map-description"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm min-h-[60px]"
                    placeholder="Mô tả map"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type ratios (%)</label>
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                    {TYPE_RATIO_KEYS.map((key) => (
                      <div
                        key={key}
                        className="flex items-center gap-1.5 shrink-0 relative"
                        onMouseEnter={() => setRatioTooltipKey(key)}
                        onMouseLeave={() => setRatioTooltipKey(null)}
                      >
                        {ratioTooltipKey === key && (
                          <span className="absolute bottom-full left-1/2 -translate-x-14 mb-1 px-2 py-0.5 text-xs font-medium text-white bg-slate-800 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                            {key}
                          </span>
                        )}
                        <span className="text-lg leading-none cursor-help" aria-label={key}>
                          {TYPE_RATIO_ICONS[key]}
                        </span>
                        <input
                          id={`tr-${key}`}
                          type="number"
                          min={0}
                          max={100}
                          value={form.typeRatios[key] ?? 0}
                          onChange={(e) =>
                            setTypeRatio(key, parseInt(e.target.value, 10) || 0)
                          }
                          className={`w-[3.25rem] rounded border px-1.5 py-1 text-sm text-center tabular-nums transition-colors ${getRatioInputColorClass(form.typeRatios[key] ?? 0)}`}
                          aria-label={key}
                        />
                      </div>
                    ))}
                    {/* Free ratio: chỉ hiển thị, tổng luôn 100 */}
                    <div
                      className="flex items-center gap-1.5 shrink-0 relative"
                      onMouseEnter={() => setRatioTooltipKey('free')}
                      onMouseLeave={() => setRatioTooltipKey(null)}
                    >
                      {ratioTooltipKey === 'free' && (
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 text-xs font-medium text-white bg-slate-800 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                          free
                        </span>
                      )}
                      <span className="text-lg leading-none cursor-help" aria-label="free">
                        🆓
                      </span>
                      <div
                        role="textbox"
                        aria-label="free ratio"
                        aria-readonly="true"
                        className="w-[3.25rem] rounded border border-slate-300 px-1.5 py-1 text-sm text-center tabular-nums bg-slate-100 text-slate-700 select-none cursor-default pointer-events-none"
                      >
                        {freeRatio}
                      </div>
                    </div>
                  </div>
                  {!canSaveRatios && (
                    <p className="text-xs text-amber-600 mt-1">
                      Tổng phải bằng 100. Giảm tỉ lệ các loại hoặc tăng đến khi free = 0 để lưu.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Trạng thái
                  </label>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent select-none cursor-pointer ${
                      form.status === 'enabled'
                        ? 'bg-emerald-500 text-emerald-50 hover:bg-emerald-600'
                        : form.status === 'hidden'
                        ? 'bg-slate-600 text-slate-50 hover:bg-slate-700'
                        : 'bg-red-500 text-red-50 hover:bg-red-600'
                    }`}
                    onClick={() => {
                      const index = MAP_STATUSES.indexOf(form.status);
                      const next = MAP_STATUSES[(index + 1) % MAP_STATUSES.length];
                      setForm((p) => ({ ...p, status: next }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const index = MAP_STATUSES.indexOf(form.status);
                        const next = MAP_STATUSES[(index + 1) % MAP_STATUSES.length];
                        setForm((p) => ({ ...p, status: next }));
                      }
                    }}
                  >
                    {form.status}
                  </div>
                </div>

                {/* Deck + thẻ có sẵn: 2 cột */}
                <div className="flex gap-6 flex-col sm:flex-row pt-2 border-t border-border">
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium mb-2">Deck</label>
                    <div
                      className={`min-h-[280px] rounded-lg border-2 border-dashed p-3 flex flex-wrap gap-2 content-start transition-colors ${
                        isDeckDragOver ? 'border-primary-400 ring-2 ring-primary-400 bg-primary-100/50' : 'border-primary-200 bg-primary-50/50'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                        setIsDeckDragOver(true);
                      }}
                      onDragLeave={() => setIsDeckDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDeckDragOver(false);
                        const id = e.dataTransfer.getData('cardId');
                        if (id) {
                          setForm((p) =>
                            p.deckIds.includes(id) ? p : { ...p, deckIds: [...p.deckIds, id] }
                          );
                        }
                      }}
                    >
                      {form.deckIds.length === 0 && (
                        <span className="text-sm text-muted-foreground self-center">Kéo thẻ từ danh sách bên phải vào đây</span>
                      )}
                      {form.deckIds.map((cardId, index) => {
                        const card = adventureCards.find((c) => c._id === cardId);
                        if (!card) return null;
                        return (
                          <div
                            key={`${cardId}-${index}`}
                            className="relative group w-14 shrink-0 aspect-[420/720] rounded overflow-hidden border border-border bg-card shadow-sm"
                          >
                            <img
                              src={getCardImageUrl(card)}
                              alt={card.name}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setForm((p) => ({
                                  ...p,
                                  deckIds: p.deckIds.filter((_, i) => i !== index),
                                }));
                              }}
                              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-600"
                              aria-label="Bỏ thẻ khỏi deck"
                            >
                              −
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{form.deckIds.length} thẻ trong deck</p>
                  </div>
                  <div className="w-full sm:w-72 shrink-0">
                    <label className="block text-sm font-medium mb-2">Thẻ có sẵn (kéo vào deck)</label>
                    <div className="max-h-[280px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-2">
                      <div className="grid grid-cols-3 gap-2">
                        {adventureCards
                          .filter((c) => c.type !== 'empty' && c.nameId !== 'empty')
                          .map((c) => (
                          <div
                            key={c._id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('cardId', c._id);
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            className="cursor-grab active:cursor-grabbing rounded overflow-hidden border border-border bg-card hover:border-primary-400 hover:shadow transition-all"
                          >
                            <div className="aspect-[420/720] relative">
                              <img
                                src={getCardImageUrl(c)}
                                alt={c.name}
                                className="w-full h-full object-cover pointer-events-none"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
                                }}
                              />
                            </div>
                            <p className="text-[10px] font-medium truncate px-1 py-0.5 bg-card" title={c.name}>
                              {c.name}
                            </p>
                          </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between gap-2 pt-2">
                  <div>
                    {editingMap && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? 'Đang xóa...' : 'Xóa map'}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={closeModal}>
                      Hủy
                    </Button>
                    <Button type="submit" disabled={submitLoading || !canSaveRatios}>
                      {submitLoading ? 'Đang xử lý...' : editingMap ? 'Lưu' : 'Thêm'}
                    </Button>
                  </div>
                </div>
              </form>
              {i18nField === 'name' && (
                <div className="w-full max-w-md shrink-0 rounded-r-lg border-l border-border bg-muted/30 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
                    <h3 className="text-sm font-semibold">Sửa Tên hiển thị (i18n)</h3>
                    <button
                      type="button"
                      onClick={() => { setI18nField(null); setI18nError(null); }}
                      className="p-1 hover:bg-blue-500 rounded text-lg leading-none"
                      aria-label="Đóng"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4 flex-1 overflow-auto space-y-3">
                    {LANG_OPTIONS.map((lang) => (
                      <div key={lang}>
                        <label className="block text-xs font-medium mb-1">
                          {lang.toUpperCase()}
                          {lang === editLang && <span className="ml-1 text-blue-600">(base)</span>}
                        </label>
                        <input
                          type="text"
                          value={getFormI18n(lang)}
                          onChange={(e) => setFormI18n(lang, e.target.value)}
                          className={`w-full rounded border px-2 py-1.5 text-sm ${
                            lang === editLang ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200'
                          }`}
                          placeholder={lang.toUpperCase()}
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleI18nTranslate}
                      disabled={translateLoading || !getFormI18n(editLang).trim()}
                      className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs"
                    >
                      {translateLoading ? 'Đang dịch...' : 'Gợi ý dịch máy'}
                    </Button>
                    {i18nError && <p className="text-xs text-red-600">{i18nError}</p>}
                  </div>
                  <div className="p-3 border-t border-border">
                    <Button type="button" size="sm" onClick={handleI18nSave} disabled={translateLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                      Lưu i18n
                    </Button>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
