import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { gameDataService, type Character } from '../../services/gameDataService';
import { localizationService } from '../../services/localizationService';
import type { EditLang } from '../LangDropdown';
import {
  DEFAULT_UNLOCK_PRICE,
  LEVEL_MAX_DEFAULT,
  mergeCharacterLevelPrices,
  resolveUnlockPriceFromCharacter,
  UNLOCK_PRICE_MIN,
  type EditingField,
} from './characterDetailUtils';

export type UseCharacterDetailLangControl = {
  editLang: EditLang;
  setEditLang: Dispatch<SetStateAction<EditLang>>;
};

export function useCharacterDetail(
  id: string | undefined,
  langControl?: UseCharacterDetailLangControl
) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [editingField, setEditingField] = useState<EditingField>(null);

  const [displayHp, setDisplayHp] = useState(0);
  const [displayElement, setDisplayElement] = useState('');
  const [displayLevel, setDisplayLevel] = useState(0);
  const [nameTranslations, setNameTranslations] = useState<Record<string, string>>({});
  const [descriptionTranslations, setDescriptionTranslations] = useState<Record<string, string>>({});
  const [i18nModalField, setI18nModalField] = useState<'name' | 'description' | null>(null);
  const [formI18nEn, setFormI18nEn] = useState('');
  const [formI18nVi, setFormI18nVi] = useState('');
  const [formI18nJa, setFormI18nJa] = useState('');
  const [internalEditLang, setInternalEditLang] = useState<EditLang>('en');
  const editLang = langControl?.editLang ?? internalEditLang;
  const setEditLang = langControl?.setEditLang ?? setInternalEditLang;
  const [translateLoading, setTranslateLoading] = useState(false);
  const [i18nError, setI18nError] = useState<string | null>(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const [displayUnlockPrice, setDisplayUnlockPriceState] = useState(DEFAULT_UNLOCK_PRICE);
  const [levelPrices, setLevelPrices] = useState<{ level: number; price: number }[]>(() =>
    mergeCharacterLevelPrices(
      LEVEL_MAX_DEFAULT,
      DEFAULT_UNLOCK_PRICE,
      []
    )
  );

  const setDisplayUnlockPrice = useCallback((v: number) => {
    setDisplayUnlockPriceState(v);
    setLevelPrices((prev) =>
      prev.length ? prev.map((r, i) => (i === 0 ? { ...r, price: v } : r)) : prev
    );
  }, []);
  const [editingPriceForLevel, setEditingPriceForLevel] = useState<number | null>(null);
  const [editedPriceValue, setEditedPriceValue] = useState('');

  const [levelEditModalOpen, setLevelEditModalOpen] = useState(false);
  const levelEditSnapshot = useRef<{
    max: number;
    rows: { level: number; price: number }[];
  } | null>(null);

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
        const maxLv = c.maxLevel ?? LEVEL_MAX_DEFAULT;
        setDisplayLevel(maxLv);
        const unlock = resolveUnlockPriceFromCharacter(c);
        setDisplayUnlockPriceState(unlock);
        const rawStats = (c.levelStats ?? []).map((s) => ({ level: s.level, price: s.price }));
        setLevelPrices(mergeCharacterLevelPrices(maxLv, unlock, rawStats));
      })
      .catch((err) => setError(err?.message ?? 'Failed to load character'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!character) return;
    const nameKey = `character.${character.nameId}.name`;
    const descKey = `character.${character.nameId}.description`;
    Promise.all([
      localizationService.getLocalizationByKey(nameKey).then((loc) => setNameTranslations(loc.translations ?? {})).catch(() => {}),
      localizationService.getLocalizationByKey(descKey).then((loc) => setDescriptionTranslations(loc.translations ?? {})).catch(() => {}),
    ]);
  }, [character?.nameId]);

  useEffect(() => {
    const levelMax = displayLevel;
    setLevelPrices((prev) => {
      if (prev.length === levelMax) return prev;
      if (prev.length < levelMax) {
        const newRows: { level: number; price: number }[] = [];
        let lastPrice = prev.length > 0 ? prev[prev.length - 1].price : DEFAULT_UNLOCK_PRICE;
        for (let lvl = prev.length + 1; lvl <= levelMax; lvl++) {
          lastPrice += 100;
          newRows.push({ level: lvl, price: lastPrice });
        }
        return [...prev, ...newRows];
      }
      return prev.slice(0, levelMax);
    });
  }, [displayLevel]);

  const savePriceEdit = (level: number) => {
    const num = parseInt(editedPriceValue, 10);
    const min = level === 1 ? UNLOCK_PRICE_MIN : 0;
    if (!isNaN(num) && num >= min) {
      if (level === 1) {
        setDisplayUnlockPrice(num);
      } else {
        setLevelPrices((prev) =>
          prev.map((row) => (row.level === level ? { ...row, price: num } : row))
        );
      }
    }
    setEditingPriceForLevel(null);
  };

  const startPriceEdit = (level: number, price: number) => {
    setEditingPriceForLevel(level);
    setEditedPriceValue(String(price));
  };

  const startEdit = (field: EditingField) => {
    setEditingField(field);
  };

  const persistChanges = async (updates: Partial<Character>) => {
    if (!character) return undefined;
    setSaveLoading(true);
    try {
      const updated = await gameDataService.updateCharacter(character._id, updates);
      setCharacter(updated);
      return updated;
    } finally {
      setSaveLoading(false);
    }
  };

  /** Chỉ cập nhật HP khi API thành công. */
  const commitHp = async (value: number): Promise<boolean> => {
    if (!character) return false;
    setSaveLoading(true);
    try {
      const updated = await gameDataService.updateCharacter(character._id, { HP: value });
      setCharacter(updated);
      setDisplayHp(updated.HP ?? value);
      return true;
    } catch {
      return false;
    } finally {
      setSaveLoading(false);
    }
  };

  const openLevelEditModal = () => {
    levelEditSnapshot.current = {
      max: displayLevel,
      rows: levelPrices.map((r) => ({ ...r })),
    };
    setEditingPriceForLevel(null);
    setLevelEditModalOpen(true);
  };

  const cancelLevelEditModal = () => {
    if (levelEditSnapshot.current) {
      setDisplayLevel(levelEditSnapshot.current.max);
      const rows = levelEditSnapshot.current.rows.map((r) => ({ ...r }));
      setLevelPrices(rows);
      const u = rows.find((r) => r.level === 1)?.price;
      if (typeof u === 'number' && Number.isFinite(u)) setDisplayUnlockPriceState(u);
    }
    setEditingPriceForLevel(null);
    setLevelEditModalOpen(false);
    levelEditSnapshot.current = null;
  };

  const saveLevelEditModal = async () => {
    if (!character) return;
    const unlock =
      levelPrices.find((r) => r.level === 1)?.price ?? displayUnlockPrice;
    const updated = await persistChanges({
      maxLevel: displayLevel,
      unlockPrice: unlock,
      levelStats: levelPrices.map((r) => ({ level: r.level, price: r.price })),
    });
    if (updated?.unlockPrice != null) setDisplayUnlockPriceState(updated.unlockPrice);
    setLevelEditModalOpen(false);
    levelEditSnapshot.current = null;
  };

  const openI18nPopup = (field: 'name' | 'description') => {
    setI18nModalField(field);
    setI18nError(null);
    if (field === 'name') {
      setFormI18nEn(nameTranslations.en ?? character?.name ?? '');
      setFormI18nVi(nameTranslations.vi ?? '');
      setFormI18nJa(nameTranslations.ja ?? '');
    } else {
      setFormI18nEn(descriptionTranslations.en ?? character?.description ?? '');
      setFormI18nVi(descriptionTranslations.vi ?? '');
      setFormI18nJa(descriptionTranslations.ja ?? '');
    }
  };

  const closeI18nPopup = () => {
    setI18nModalField(null);
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

  const handleI18nSave = async () => {
    if (!character || !i18nModalField) return;
    const key =
      i18nModalField === 'name'
        ? `character.${character.nameId}.name`
        : `character.${character.nameId}.description`;
    const translations = {
      en: formI18nEn.trim(),
      vi: formI18nVi.trim(),
      ja: formI18nJa.trim(),
    };
    setI18nError(null);
    try {
      await localizationService.updateLocalization(key, translations);
      if (i18nModalField === 'name') setNameTranslations(translations);
      else setDescriptionTranslations(translations);
      closeI18nPopup();
    } catch {
      try {
        await localizationService.createLocalization(key, translations);
        if (i18nModalField === 'name') setNameTranslations(translations);
        else setDescriptionTranslations(translations);
        closeI18nPopup();
      } catch {
        setI18nError('Lỗi lưu localization');
      }
    }
  };

  const getDisplayName = () =>
    nameTranslations[editLang] ?? nameTranslations.en ?? character?.name ?? '';

  const getDisplayDescription = () =>
    descriptionTranslations[editLang] ??
    descriptionTranslations.en ??
    character?.description ??
    '';

  const setDisplayLevelWithValue = (fn: (l: number) => number) => {
    setDisplayLevel((l) => fn(l));
  };

  const setDisplayElementAndPersist = (el: string) => {
    setDisplayElement(el);
    setEditingField(null);
    persistChanges({ element: el });
  };

  return {
    character,
    loading,
    error,
    saveLoading,
    editingField,
    setEditingField,
    displayHp,
    displayElement,
    displayLevel,
    setDisplayLevel: setDisplayLevelWithValue,
    nameTranslations,
    descriptionTranslations,
    i18nModalField,
    formI18nEn,
    formI18nVi,
    formI18nJa,
    editLang,
    setEditLang,
    translateLoading,
    i18nError,
    langDropdownOpen,
    setLangDropdownOpen,
    displayUnlockPrice,
    setDisplayUnlockPrice,
    levelPrices,
    editingPriceForLevel,
    editedPriceValue,
    setEditedPriceValue,
    savePriceEdit,
    startPriceEdit,
    startEdit,
    persistChanges,
    commitHp,
    levelEditModalOpen,
    openLevelEditModal,
    cancelLevelEditModal,
    saveLevelEditModal,
    openI18nPopup,
    closeI18nPopup,
    getFormI18n,
    setFormI18n,
    handleI18nTranslate,
    handleI18nSave,
    getDisplayName,
    getDisplayDescription,
    setDisplayElementAndPersist,
  };
}
