import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquarePen } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { localizationService } from '../services/localizationService';
import { gameDataService, type Character } from '../services/gameDataService';

const CARD_IMAGE_RATIO = { width: 420, height: 720 };
const LEVEL_MAX_DEFAULT = 10;

const ELEMENT_OPTIONS = ['anemo', 'cryo', 'dendro', 'electro', 'geo', 'hydro', 'pyro'] as const;
const getDefaultLevelPrice = (level: number) => level * 100;

type EditingField = 'hp' | 'element' | 'level' | null;
type EditLang = 'en' | 'vi' | 'ja';
const LANG_OPTIONS: EditLang[] = ['en', 'vi', 'ja'];
const LANG_LABELS: Record<EditLang, string> = { en: 'English', vi: 'Vietnamese', ja: 'Japanese' };

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editedHp, setEditedHp] = useState('');
  const [editedElement, setEditedElement] = useState('');

  const [displayHp, setDisplayHp] = useState(0);
  const [displayElement, setDisplayElement] = useState('');
  const [displayLevel, setDisplayLevel] = useState(0);
  const [descriptionTranslations, setDescriptionTranslations] = useState<Record<string, string>>({});
  const [i18nDescriptionOpen, setI18nDescriptionOpen] = useState(false);
  const [formI18nEn, setFormI18nEn] = useState('');
  const [formI18nVi, setFormI18nVi] = useState('');
  const [formI18nJa, setFormI18nJa] = useState('');
  const [editLang, setEditLang] = useState<EditLang>('en');
  const [translateLoading, setTranslateLoading] = useState(false);
  const [i18nError, setI18nError] = useState<string | null>(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const [levelPrices, setLevelPrices] = useState<{ level: number; price: number }[]>(() =>
    Array.from({ length: LEVEL_MAX_DEFAULT }, (_, i) => ({
      level: i + 1,
      price: getDefaultLevelPrice(i + 1),
    }))
  );
  const [editingPriceForLevel, setEditingPriceForLevel] = useState<number | null>(null);
  const [editedPriceValue, setEditedPriceValue] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    gameDataService
      .getCharacterById(id)
      .then((c) => {
        setCharacter(c);
        setDisplayHp(c.HP);
        setDisplayElement(c.element ?? 'cryo');
        setDisplayLevel(c.maxLevel ?? 10);
        const stats = c.levelStats?.length
          ? c.levelStats.map((s) => ({ level: s.level, price: s.price }))
          : Array.from({ length: c.maxLevel ?? 10 }, (_, i) => ({
              level: i + 1,
              price: getDefaultLevelPrice(i + 1),
            }));
        setLevelPrices(stats);
      })
      .catch((err) => setError(err?.message ?? 'Failed to load character'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!character) return;
    const key = `character.${character.nameId}.description`;
    localizationService.getLocalizationByKey(key).then((loc) => {
      setDescriptionTranslations(loc.translations ?? {});
    }).catch(() => {});
  }, [character?.nameId]);

  useEffect(() => {
    const levelMax = displayLevel;
    setLevelPrices((prev) => {
      if (prev.length === levelMax) return prev;
      if (prev.length < levelMax) {
        const newRows = Array.from({ length: levelMax - prev.length }, (_, i) => ({
          level: prev.length + i + 1,
          price: getDefaultLevelPrice(prev.length + i + 1),
        }));
        return [...prev, ...newRows];
      }
      return prev.slice(0, levelMax);
    });
  }, [displayLevel]);

  const savePriceEdit = (level: number) => {
    const num = parseInt(editedPriceValue, 10);
    if (!isNaN(num) && num >= 0) {
      setLevelPrices((prev) =>
        prev.map((row) => (row.level === level ? { ...row, price: num } : row))
      );
    }
    setEditingPriceForLevel(null);
  };

  const startPriceEdit = (level: number, price: number) => {
    setEditingPriceForLevel(level);
    setEditedPriceValue(String(price));
  };

  const startEdit = (field: EditingField, currentValue?: string | number) => {
    setEditingField(field);
    if (field === 'hp') setEditedHp(String(currentValue ?? displayHp));
    if (field === 'element') {
      const val = String(currentValue ?? displayElement ?? character?.element ?? 'cryo').toLowerCase();
      setEditedElement(val === 'none' || ELEMENT_OPTIONS.includes(val as (typeof ELEMENT_OPTIONS)[number]) ? val : ELEMENT_OPTIONS[0]);
    }
  };

  const persistChanges = async (updates: Partial<Character>) => {
    if (!character) return;
    setSaveLoading(true);
    try {
      const updated = await gameDataService.updateCharacter(character._id, updates);
      setCharacter(updated);
    } finally {
      setSaveLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!character) return;
    if (editingField === 'hp') {
      const num = parseInt(editedHp, 10);
      if (!isNaN(num) && num >= 0) {
        setDisplayHp(num);
        await persistChanges({ HP: num });
      }
    }
    if (editingField === 'element' && editedElement.trim()) {
      const val = editedElement.trim().toLowerCase();
      setDisplayElement(val);
      await persistChanges({ element: val });
    }
    if (editingField === 'level') {
      await persistChanges({
        maxLevel: displayLevel,
        levelStats: levelPrices.map((r) => ({ level: r.level, price: r.price })),
      });
    }
    setEditingField(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  const openI18nDescriptionPopup = () => {
    setI18nDescriptionOpen(true);
    setI18nError(null);
    setFormI18nEn(descriptionTranslations.en ?? character?.description ?? '');
    setFormI18nVi(descriptionTranslations.vi ?? '');
    setFormI18nJa(descriptionTranslations.ja ?? '');
  };

  const closeI18nDescriptionPopup = () => {
    setI18nDescriptionOpen(false);
    setI18nError(null);
  };

  const getFormI18n = (lang: EditLang) =>
    lang === 'en' ? formI18nEn : lang === 'vi' ? formI18nVi : formI18nJa;
  const setFormI18n = (lang: EditLang, val: string) => {
    if (lang === 'en') setFormI18nEn(val);
    else if (lang === 'vi') setFormI18nVi(val);
    else setFormI18nJa(val);
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

  const handleI18nDescriptionSave = async () => {
    if (!character) return;
    const key = `character.${character.nameId}.description`;
    const translations = {
      en: formI18nEn.trim(),
      vi: formI18nVi.trim(),
      ja: formI18nJa.trim(),
    };
    setI18nError(null);
    try {
      await localizationService.updateLocalization(key, translations);
      setDescriptionTranslations(translations);
      closeI18nDescriptionPopup();
    } catch {
      try {
        await localizationService.createLocalization(key, translations);
        setDescriptionTranslations(translations);
        closeI18nDescriptionPopup();
      } catch {
        setI18nError('Lỗi lưu localization');
      }
    }
  };

  const getDisplayDescription = () =>
    descriptionTranslations[editLang] ?? descriptionTranslations.en ?? character?.description ?? '';

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading character...</p>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="p-6 space-y-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{error ?? 'Character not found'}</CardTitle>
          </CardHeader>
        </Card>
        <Button onClick={() => navigate('/characters')} className="bg-blue-600 hover:bg-blue-700 text-white">
          Back
        </Button>
      </div>
    );
  }

  const effectiveElement = displayElement || character.element || 'cryo';

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent mb-2">
            Character Details
          </h1>
          <p className="text-muted-foreground">View and manage character info</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Ảnh</h2>
          <Card className="border-0 shadow-none overflow-hidden max-w-[280px]">
            <CardContent className="p-0">
              <div
                className="relative"
                style={{ aspectRatio: `${CARD_IMAGE_RATIO.width}/${CARD_IMAGE_RATIO.height}` }}
              >
                <img
                  src={`/assets/images/cards/character/${character.nameId}.webp`}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1.5 left-1.5">
                  {effectiveElement === 'none' ? (
                    <span className="w-7 h-7 rounded-full border-2 border-white/70 bg-black/40 p-1 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </span>
                  ) : (
                    <img
                      src={`/assets/images/element/${effectiveElement}.webp`}
                      alt={effectiveElement}
                      className="w-7 h-7 rounded-full border border-white/70 bg-black/40 p-1"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Chi tiết</h2>
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-700">{character.name}</CardTitle>
              <div className="flex items-start gap-2 mt-2 group/desc">
                <CardDescription className="text-base flex-1">
                  {getDisplayDescription()}
                </CardDescription>
                <button
                  type="button"
                  onClick={openI18nDescriptionPopup}
                  className="text-muted-foreground hover:text-foreground flex-shrink-0 opacity-0 group-hover/desc:opacity-60 transition-opacity"
                  aria-label="Edit description i18n"
                >
                  <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                type="button"
                onClick={() => startEdit(editingField === 'hp' ? null : 'hp')}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg w-full text-left hover:bg-gray-100 transition-colors group cursor-pointer"
              >
                <span className="font-medium text-muted-foreground flex items-center gap-2">
                  ❤️ HP
                  <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                </span>
                <span className="font-bold text-gray-600">{displayHp}</span>
              </button>
              <button
                type="button"
                onClick={() => startEdit(editingField === 'element' ? null : 'element')}
                className="flex justify-between items-center p-3 bg-slate-100 rounded-lg w-full text-left hover:bg-slate-200 transition-colors group cursor-pointer"
              >
                <span className="font-medium text-muted-foreground flex items-center gap-2">
                  ⚡ Element
                  <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                </span>
                <span className="flex items-center gap-2">
                  {effectiveElement === 'none' ? (
                    <span className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </span>
                  ) : (
                    <img
                      src={`/assets/images/element/${effectiveElement}.webp`}
                      alt={effectiveElement}
                      className="w-5 h-5"
                    />
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => startEdit(editingField === 'level' ? null : 'level')}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg w-full text-left hover:bg-gray-100 transition-colors group cursor-pointer"
              >
                <span className="font-medium text-muted-foreground flex items-center gap-2">
                  ⭐ Level
                  <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                </span>
                <span className="font-bold text-gray-600">{displayLevel}</span>
              </button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Edit</h2>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              {!editingField && (
                <p className="text-sm text-muted-foreground">Chọn trường cần chỉnh sửa ở phần Chi tiết</p>
              )}
              {editingField === 'hp' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">HP</label>
                  <input
                    type="number"
                    value={editedHp}
                    onChange={(e) => setEditedHp(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={saveLoading}>
                      {saveLoading ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                    <Button onClick={cancelEdit} variant="outline" size="sm">Hủy</Button>
                  </div>
                </div>
              )}
              {editingField === 'element' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Element</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDisplayElement('none');
                        setEditingField(null);
                        persistChanges({ element: 'none' });
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-colors ${
                        effectiveElement === 'none'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <span className="w-6 h-6 shrink-0 rounded-full border-2 border-gray-400 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="6" y1="6" x2="18" y2="18" />
                          <line x1="18" y1="6" x2="6" y2="18" />
                        </svg>
                      </span>
                      <span className="text-sm font-medium">none</span>
                    </button>
                    {ELEMENT_OPTIONS.map((el) => (
                      <button
                        key={el}
                        type="button"
                        onClick={() => {
                          setDisplayElement(el);
                          setEditingField(null);
                          persistChanges({ element: el });
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-colors ${
                          effectiveElement === el
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <img
                          src={`/assets/images/element/${el}.webp`}
                          alt={el}
                          className="w-6 h-6 shrink-0"
                        />
                        <span className="text-sm font-medium capitalize">{el}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {editingField === 'level' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-medium text-muted-foreground">Bảng giá upgrade theo level</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">level max</span>
                        <span className="text-xs font-semibold min-w-[1.25rem] text-center">{displayLevel}</span>
                        <button
                          type="button"
                          onClick={() => setDisplayLevel((l) => Math.max(1, l - 1))}
                          className="w-5 h-5 rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold leading-none"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() => setDisplayLevel((l) => l + 1)}
                          className="w-5 h-5 rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold leading-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {levelPrices.map(({ level, price }) => (
                        <div
                          key={level}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm group hover:bg-gray-100"
                        >
                          <span className="font-medium">Level {level}</span>
                          {level === displayLevel ? (
                            <span className="text-gray-600">MAX</span>
                          ) : editingPriceForLevel === level ? (
                            <input
                              type="number"
                              value={editedPriceValue}
                              onChange={(e) => setEditedPriceValue(e.target.value)}
                              onBlur={() => savePriceEdit(level)}
                              onKeyDown={(e) => e.key === 'Enter' && savePriceEdit(level)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-16 px-2 py-0.5 rounded border border-gray-300 text-sm font-medium"
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => startPriceEdit(level, price)}
                              className="flex items-center gap-1.5 hover:bg-gray-200 rounded px-1 -mr-1"
                            >
                              <span className="text-gray-600">price {price}</span>
                              <FontAwesomeIcon icon={faSquarePen} className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={saveEdit} size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={saveLoading}>
                      {saveLoading ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                    <Button onClick={cancelEdit} variant="outline" size="sm">Hủy</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Button
        onClick={() => navigate('/characters')}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        Back
      </Button>

      {i18nDescriptionOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card overflow-hidden shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
              <h3 className="text-lg font-semibold">Sửa Description (i18n)</h3>
              <button
                type="button"
                onClick={closeI18nDescriptionPopup}
                className="p-1 hover:bg-blue-500 rounded transition-colors text-xl leading-none"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="p-6 flex-1 overflow-auto space-y-4">
              {([editLang, ...LANG_OPTIONS.filter((l) => l !== editLang)] as EditLang[]).map((lang) => (
                <div key={lang}>
                  <label className="block text-sm font-medium mb-1 cursor-pointer">
                    {lang}
                    {lang === editLang && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">(gb)</span>
                    )}
                  </label>
                  <textarea
                    value={getFormI18n(lang)}
                    onChange={(e) => setFormI18n(lang, e.target.value)}
                    className={`w-full rounded border px-3 py-2 text-sm min-h-[80px] resize-y ${
                      lang === editLang ? 'border-blue-200 bg-blue-50/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-200' : 'border-slate-200'
                    }`}
                    placeholder={LANG_LABELS[lang]}
                  />
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
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleI18nDescriptionSave}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Lưu
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
