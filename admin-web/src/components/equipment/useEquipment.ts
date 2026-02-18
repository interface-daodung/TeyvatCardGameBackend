import { useState, useEffect } from 'react';
import { gameDataService } from '../../services/gameDataService';
import { localizationService } from '../../services/localizationService';
import type { EditLang } from '../LangDropdown';
import {
  type GameItem,
  type LevelStat,
  type EditingField,
  type I18nPopupField,
  toGameItem,
} from './equipmentUtils';

export function useEquipment() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GameItem | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editLang, setEditLang] = useState<EditLang>('en');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

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
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedItem) setFormValues({ ...selectedItem });
  }, [selectedItem]);

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
      const t =
        formValues.descriptionTranslations ?? selectedItem?.descriptionTranslations;
      setFormI18nEn(
        t?.en ?? formValues.description ?? selectedItem?.description ?? ''
      );
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
        const baseC =
          formValues.baseCooldown ?? selectedItem?.baseCooldown ?? 18;
        const arr: LevelStat[] = [];
        for (let i = 0; i < max; i++) {
          arr.push(
            stats?.[i] ?? {
              power: Math.round(baseP * (1 + (i + 1) * 0.15)),
              cooldown: Math.max(0, baseC - (i + 1) * 0.5),
              price: (i + 1) * 100,
            }
          );
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
      const baseC =
        formValues.baseCooldown ?? selectedItem?.baseCooldown ?? 18;
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

  const updateLevelStat = (
    lvlIdx: number,
    key: keyof LevelStat,
    value: number
  ) => {
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
      setI18nError(
        `Vui lòng nhập ${editLang} trước (ngôn ngữ base để dịch)`
      );
      return;
    }
    setI18nError(null);
    setTranslateLoading(true);
    try {
      const promises: Promise<void>[] = [];
      if (editLang !== 'vi' && !formI18nVi.trim()) {
        promises.push(
          localizationService
            .translate(sourceText, editLang, 'vi')
            .then(setFormI18nVi)
        );
      }
      if (editLang !== 'ja' && !formI18nJa.trim()) {
        promises.push(
          localizationService
            .translate(sourceText, editLang, 'ja')
            .then(setFormI18nJa)
        );
      }
      if (editLang !== 'en' && !formI18nEn.trim()) {
        promises.push(
          localizationService
            .translate(sourceText, editLang, 'en')
            .then(setFormI18nEn)
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
    formValues.nameTranslations?.[editLang] ??
    formValues.name ??
    selectedItem?.name ??
    '';
  const getDisplayDescription = () =>
    formValues.descriptionTranslations?.[editLang] ??
    formValues.description ??
    selectedItem?.description ??
    '';

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
          localizationService.updateLocalization(
            `item.${nameId}.name`,
            formValues.nameTranslations
          )
        );
      }
      if (formValues.descriptionTranslations) {
        promises.push(
          localizationService.updateLocalization(
            `item.${nameId}.description`,
            formValues.descriptionTranslations
          )
        );
      }
      await Promise.all(promises);
      setItems((prev) =>
        prev.map((it) =>
          it._id === selectedItem._id
            ? {
                ...it,
                ...formValues,
                name:
                  formValues.nameTranslations?.[editLang] ??
                  formValues.name ??
                  it.name,
                description:
                  formValues.descriptionTranslations?.[editLang] ??
                  formValues.description ??
                  it.description,
              }
            : it
        )
      );
      setSelectedItem((p) =>
        p && p._id === selectedItem._id ? { ...p, ...formValues } : p
      );
      closeEditModal();
    } catch (err) {
      console.error('Save failed:', err);
      setError(err instanceof Error ? err.message : 'Lỗi lưu');
    } finally {
      setSaveLoading(false);
    }
  };

  const getItemDisplayName = (item: GameItem, lang: EditLang) =>
    item.nameTranslations?.[lang] ?? item.name ?? item.nameId;
  const getItemDisplayDescription = (item: GameItem, lang: EditLang) =>
    item.descriptionTranslations?.[lang] ?? item.description ?? '';

  return {
    items,
    loading,
    error,
    setError,
    editModalOpen,
    selectedItem,
    saveLoading,
    editingField,
    setEditingField,
    editLang,
    setEditLang,
    langDropdownOpen,
    setLangDropdownOpen,
    formValues,
    setFormValues,
    i18nPopupField,
    formLevelMax,
    formLevelStats,
    expandedLevels,
    openEditModal,
    closeEditModal,
    getFormI18n,
    setFormI18n,
    openI18nPopup,
    closeI18nPopup,
    toggleLevelExpanded,
    handleLevelMaxChange,
    updateLevelStat,
    handleLevelSave,
    handleI18nTranslate,
    handleI18nSave,
    getDisplayName,
    getDisplayDescription,
    handleSave,
    getItemDisplayName,
    getItemDisplayDescription,
    translateLoading,
    i18nError,
  };
}
