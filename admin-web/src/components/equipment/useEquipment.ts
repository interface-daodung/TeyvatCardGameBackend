import { useState, useEffect } from 'react';
import { gameDataService } from '../../services/gameDataService';
import { localizationService } from '../../services/localizationService';
import { filesService, type FileTreeItem } from '../../services/filesService';
import type { EditLang } from '../LangDropdown';
import { useUnsavedBaseline } from '../unsavedChanges';
import {
  type GameItem,
  type LevelStat,
  type EditingField,
  type I18nPopupField,
  toGameItem,
} from './equipmentUtils';

const ITEM_LINK_PREFIX = '/assets/images/';
import type { EquipmentCreateFormValues } from './EquipmentCreateModal';

function buildDefaultLevelStats(
  basePower: number,
  baseCooldown: number,
  maxLevel: number
): LevelStat[] {
  const arr: LevelStat[] = [];
  for (let i = 0; i < maxLevel; i++) {
    arr.push({
      power: Math.round(basePower * (1 + (i + 1) * 0.15)),
      cooldown: Math.max(0, baseCooldown - (i + 1) * 0.5),
      price: (i + 1) * 100,
    });
  }
  return arr;
}

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
  const { setBaseline, clearBaseline, isDirty: checkDirty } =
    useUnsavedBaseline<Partial<GameItem>>();
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [imageTreeOpen, setImageTreeOpen] = useState(false);
  const [imageTree, setImageTree] = useState<FileTreeItem[] | null>(null);
  const [imageTreeLoading, setImageTreeLoading] = useState(false);
  const [imageTreeExpanded, setImageTreeExpanded] = useState<Set<string>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const openCreateModal = () => {
    setCreateError(null);
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateError(null);
  };

  const handleCreateItem = async (values: EquipmentCreateFormValues) => {
    const img = values.image.trim().replace(/\\/g, '/');
    if (!img.startsWith(ITEM_LINK_PREFIX)) {
      setCreateError('Bắt buộc chọn link ảnh đầy đủ (/assets/images/...).');
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const levelStats = buildDefaultLevelStats(
        values.basePower,
        values.baseCooldown,
        values.maxLevel
      );
      const created = await gameDataService.createItem({
        nameId: values.nameId,
        image: img,
        basePower: values.basePower,
        baseCooldown: values.baseCooldown,
        maxLevel: values.maxLevel,
        levelStats,
      });
      const gameItem = toGameItem(created, null, null);
      setItems((prev) =>
        [...prev, gameItem].sort((a, b) => a.nameId.localeCompare(b.nameId))
      );
      setCreateModalOpen(false);
      openEditModal(gameItem);
    } catch (err: unknown) {
      console.error('Create item failed:', err);
      let msg = err instanceof Error ? err.message : 'Lỗi tạo item';
      const e = err as { response?: { data?: { error?: string | unknown[] } } };
      if (e.response?.data?.error) {
        const serverErr = e.response.data.error;
        if (Array.isArray(serverErr)) {
          msg = (serverErr as { message?: string }[]).map((z) => z.message ?? '').join(', ');
        } else if (typeof serverErr === 'string') {
          msg = serverErr;
        }
      }
      setCreateError(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditModal = (item: GameItem) => {
    const next = structuredClone(item);
    setSelectedItem(item);
    setFormValues(next);
    setBaseline(next);
    setEditingField(null);
    setI18nPopupField(null);
    setError(null);
    setShowUnsavedConfirm(false);
    setImageTreeOpen(false);
    setShowDeleteConfirm(false);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setShowUnsavedConfirm(false);
    clearBaseline();
    setEditModalOpen(false);
    setSelectedItem(null);
    setEditingField(null);
    setI18nPopupField(null);
    setError(null);
    setImageTreeOpen(false);
    setShowDeleteConfirm(false);
  };

  const openItemImageTree = async () => {
    setImageTreeOpen(true);
    if (imageTree === null && !imageTreeLoading) {
      setImageTreeLoading(true);
      try {
        const tree = await filesService.getImageTree('item');
        setImageTree(tree);
      } catch {
        setImageTree([]);
      } finally {
        setImageTreeLoading(false);
      }
    }
  };

  const toggleImageTreeExpanded = (path: string) => {
    setImageTreeExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectItemImage = (webPath: string) => {
    setFormValues((p) => ({
      ...p,
      image: webPath.trim().replace(/\\/g, '/'),
    }));
    setImageTreeOpen(false);
  };

  const requestDeleteItem = () => setShowDeleteConfirm(true);
  const cancelDeleteItem = () => setShowDeleteConfirm(false);
  const closeItemImageTree = () => setImageTreeOpen(false);

  const confirmDeleteItem = async () => {
    if (!selectedItem) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await gameDataService.deleteItem(selectedItem._id);
      setItems((prev) => prev.filter((it) => it._id !== selectedItem._id));
      setShowDeleteConfirm(false);
      closeEditModal();
    } catch (err: unknown) {
      console.error('Delete item failed:', err);
      let msg = err instanceof Error ? err.message : 'Lỗi xóa item';
      const e = err as { response?: { data?: { error?: string } } };
      if (e.response?.data?.error && typeof e.response.data.error === 'string') {
        msg = e.response.data.error;
      }
      setError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const requestCloseEditModal = () => {
    if (editModalOpen && checkDirty(formValues)) {
      setShowUnsavedConfirm(true);
    } else {
      closeEditModal();
    }
  };

  const confirmDiscardEditModal = () => {
    closeEditModal();
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
      const img = (formValues.image ?? selectedItem.image ?? '').trim().replace(/\\/g, '/');
      if (!img.startsWith(ITEM_LINK_PREFIX)) {
        setError('Bắt buộc link ảnh đầy đủ bắt đầu bằng /assets/images/ (chọn từ cây hoặc sửa DB).');
        setSaveLoading(false);
        return;
      }
      const promises: Promise<unknown>[] = [];
      promises.push(
        gameDataService.updateItem(selectedItem._id, {
          image: img,
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
    } catch (err: any) {
      console.error('Save failed:', err);
      let msg = err instanceof Error ? err.message : 'Lỗi lưu';
      if (err.response?.data?.error) {
        const serverErr = err.response.data.error;
        if (Array.isArray(serverErr)) {
          msg = serverErr.map((e: any) => e.message).join(', ');
        } else if (typeof serverErr === 'string') {
          msg = serverErr;
        }
      }
      setError(msg);
    } finally {
      setSaveLoading(false);
    }
  };

  const confirmSaveEditModal = () => {
    setShowUnsavedConfirm(false);
    void handleSave();
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
    requestCloseEditModal,
    showUnsavedConfirm,
    dismissUnsavedConfirm: () => setShowUnsavedConfirm(false),
    confirmDiscardEditModal,
    confirmSaveEditModal,
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
    createModalOpen,
    createLoading,
    createError,
    openCreateModal,
    closeCreateModal,
    handleCreateItem,
    imageTreeOpen,
    imageTree,
    imageTreeLoading,
    imageTreeExpanded,
    openItemImageTree,
    toggleImageTreeExpanded,
    selectItemImage,
    closeItemImageTree,
    showDeleteConfirm,
    deleteLoading,
    requestDeleteItem,
    cancelDeleteItem,
    confirmDeleteItem,
  };
}
