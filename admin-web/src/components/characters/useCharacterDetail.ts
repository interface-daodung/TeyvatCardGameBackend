import { useState, useEffect } from 'react';
import { gameDataService, type Character } from '../../services/gameDataService';
import { localizationService } from '../../services/localizationService';
import type { EditLang } from '../LangDropdown';
import {
  ELEMENT_OPTIONS,
  getDefaultLevelPrice,
  LEVEL_MAX_DEFAULT,
  type EditingField,
} from './characterDetailUtils';

export function useCharacterDetail(id: string | undefined) {
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
  const [nameTranslations, setNameTranslations] = useState<Record<string, string>>({});
  const [descriptionTranslations, setDescriptionTranslations] = useState<Record<string, string>>({});
  const [i18nModalField, setI18nModalField] = useState<'name' | 'description' | null>(null);
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
      const val = String(
        currentValue ?? displayElement ?? character?.element ?? 'cryo'
      ).toLowerCase();
      setEditedElement(
        val === 'none' || ELEMENT_OPTIONS.includes(val as (typeof ELEMENT_OPTIONS)[number])
          ? val
          : ELEMENT_OPTIONS[0]
      );
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

  const cancelEdit = () => setEditingField(null);

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
    editedHp,
    setEditedHp,
    editedElement,
    setEditedElement,
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
    levelPrices,
    editingPriceForLevel,
    editedPriceValue,
    setEditedPriceValue,
    savePriceEdit,
    startPriceEdit,
    startEdit,
    persistChanges,
    saveEdit,
    cancelEdit,
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
