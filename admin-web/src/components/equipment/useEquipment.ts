import { useState, useEffect } from 'react';
import { gameDataService } from '../../services/gameDataService';
import { localizationService } from '../../services/localizationService';
import { filesService, type FileTreeItem } from '../../services/filesService';
import type { EditLang } from '../LangDropdown';
import { useUnsavedBaseline } from '../share';
import {
  type GameItem,
  type LevelStat,
  type EditingField,
  type I18nPopupField,
  toGameItem,
  buildDefaultLevelStats,
  mergeLevelStatsForMax,
  validateLevelStatsPowerCooldownUnique,
} from './equipmentUtils';

const ITEM_LINK_PREFIX = '/assets/images/';
import type { EquipmentCreateFormValues } from './EquipmentCreateModal';

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
  const [formLevelMax, setFormLevelMax] = useState(1);
  const [formLevelStats, setFormLevelStats] = useState<LevelStat[]>([]);
  const [levelStatsValidationError, setLevelStatsValidationError] = useState<
    string | null
  >(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());
  const { setBaseline, clearBaseline, isDirty: checkDirty } =
    useUnsavedBaseline<Partial<GameItem>>();
  const {
    setBaseline: setLevelBaseline,
    clearBaseline: clearLevelBaseline,
    isDirty: checkLevelDirty,
  } = useUnsavedBaseline<{ maxLevel: number; levelStats: LevelStat[] }>();
  const {
    setBaseline: setI18nTextBaseline,
    clearBaseline: clearI18nTextBaseline,
    isDirty: checkI18nTextDirty,
  } = useUnsavedBaseline<{ en: string; vi: string; ja: string }>();
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [showLevelUnsavedConfirm, setShowLevelUnsavedConfirm] = useState(false);
  const [showI18nUnsavedConfirm, setShowI18nUnsavedConfirm] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [imageTreeOpen, setImageTreeOpen] = useState(false);
  const [imageTree, setImageTree] = useState<FileTreeItem[] | null>(null);
  const [imageTreeLoading, setImageTreeLoading] = useState(false);
  const [imageTreeExpanded, setImageTreeExpanded] = useState<Set<string>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  /** Khi đổi item khi dirty: lưu item đích để discard/save xong mở đúng item */
  const [pendingEditItem, setPendingEditItem] = useState<GameItem | null>(null);

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
        values.unlockPrice,
        values.maxLevel
      );
      const created = await gameDataService.createItem({
        nameId: values.nameId,
        image: img,
        basePower: values.basePower,
        baseCooldown: values.baseCooldown,
        maxLevel: values.maxLevel,
        unlockPrice: values.unlockPrice,
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
    setPendingEditItem(null);
    setSelectedItem(item);
    setFormValues(next);
    setBaseline(next);
    setEditingField(null);
    setI18nPopupField(null);
    setError(null);
    setShowUnsavedConfirm(false);
    setShowLevelUnsavedConfirm(false);
    setShowI18nUnsavedConfirm(false);
    setImageTreeOpen(false);
    setShowDeleteConfirm(false);
    setEditModalOpen(true);
  };

  const requestOpenEditModal = (item: GameItem) => {
    if (!editModalOpen) {
      openEditModal(item);
      return;
    }
    if (selectedItem?._id === item._id) return;
    if (checkDirty(formValues)) {
      setPendingEditItem(item);
      setShowUnsavedConfirm(true);
    } else {
      openEditModal(item);
    }
  };

  const closeEditModal = () => {
    setShowUnsavedConfirm(false);
    setShowLevelUnsavedConfirm(false);
    setShowI18nUnsavedConfirm(false);
    setPendingEditItem(null);
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
      setPendingEditItem(null);
      setShowUnsavedConfirm(true);
    } else {
      closeEditModal();
    }
  };

  const confirmDiscardEditModal = () => {
    const pending = pendingEditItem;
    setShowUnsavedConfirm(false);
    setPendingEditItem(null);
    if (pending) {
      openEditModal(pending);
    } else {
      closeEditModal();
    }
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
      const en = t?.en ?? formValues.name ?? selectedItem?.name ?? '';
      const vi = t?.vi ?? '';
      const ja = t?.ja ?? '';
      setFormI18nEn(en);
      setFormI18nVi(vi);
      setFormI18nJa(ja);
      setI18nTextBaseline({ en, vi, ja });
    } else if (field === 'description') {
      const t =
        formValues.descriptionTranslations ?? selectedItem?.descriptionTranslations;
      const en =
        t?.en ?? formValues.description ?? selectedItem?.description ?? '';
      const vi = t?.vi ?? '';
      const ja = t?.ja ?? '';
      setFormI18nEn(en);
      setFormI18nVi(vi);
      setFormI18nJa(ja);
      setI18nTextBaseline({ en, vi, ja });
    } else if (field === 'level') {
      setLevelStatsValidationError(null);
      const baseP = formValues.basePower ?? selectedItem?.basePower ?? 0;
      const baseC = formValues.baseCooldown ?? selectedItem?.baseCooldown ?? 0;
      const unlockP = formValues.unlockPrice ?? selectedItem?.unlockPrice ?? 0;
      const rawStats = formValues.levelStats ?? selectedItem?.levelStats;
      const hasStats = rawStats && rawStats.length > 0;
      const max = !hasStats
        ? 1
        : Math.max(
            1,
            Math.min(
              99,
              formValues.maxLevel ??
                selectedItem?.maxLevel ??
                rawStats!.length
            )
          );
      const levelStatsArr = mergeLevelStatsForMax(
        rawStats,
        max,
        baseP,
        baseC,
        unlockP
      );
      setFormLevelMax(max);
      setFormLevelStats(levelStatsArr);
      setExpandedLevels(new Set());
      setLevelBaseline({
        maxLevel: max,
        levelStats: structuredClone(levelStatsArr),
      });
    }
  };

  const closeI18nPopup = () => {
    setShowLevelUnsavedConfirm(false);
    setShowI18nUnsavedConfirm(false);
    setLevelStatsValidationError(null);
    clearLevelBaseline();
    clearI18nTextBaseline();
    setI18nPopupField(null);
    setI18nError(null);
  };

  const requestCloseI18nPopup = () => {
    if (
      i18nPopupField === 'level' &&
      checkLevelDirty({
        maxLevel: formLevelMax,
        levelStats: formLevelStats,
      })
    ) {
      setShowLevelUnsavedConfirm(true);
      return;
    }
    if (
      (i18nPopupField === 'name' || i18nPopupField === 'description') &&
      checkI18nTextDirty({
        en: formI18nEn,
        vi: formI18nVi,
        ja: formI18nJa,
      })
    ) {
      setShowI18nUnsavedConfirm(true);
      return;
    }
    closeI18nPopup();
  };

  const dismissLevelUnsavedConfirm = () => setShowLevelUnsavedConfirm(false);
  const dismissI18nUnsavedConfirm = () => setShowI18nUnsavedConfirm(false);

  const confirmDiscardLevelPopup = () => closeI18nPopup();

  const toggleLevelExpanded = (lvl: number) => {
    setExpandedLevels((prev) => {
      if (prev.has(lvl)) return new Set();
      return new Set([lvl]);
    });
  };

  const handleLevelMaxChange = (val: number) => {
    const v = Math.max(1, Math.min(99, val));
    setLevelStatsValidationError(null);
    const baseP = formValues.basePower ?? selectedItem?.basePower ?? 0;
    const baseC = formValues.baseCooldown ?? selectedItem?.baseCooldown ?? 0;
    const unlockP = formValues.unlockPrice ?? selectedItem?.unlockPrice ?? 0;
    setFormLevelMax(v);
    setFormLevelStats((prev) =>
      mergeLevelStatsForMax(prev, v, baseP, baseC, unlockP)
    );
  };

  const updateLevelStat = (
    lvlIdx: number,
    key: keyof LevelStat,
    value: number
  ) => {
    if (lvlIdx === 0) return;
    setLevelStatsValidationError(null);
    setFormLevelStats((prev) => {
      const next = [...prev];
      if (!next[lvlIdx]) return next;
      next[lvlIdx] = {
        ...next[lvlIdx],
        [key]: Math.max(0, Math.floor(Number(value) || 0)),
      };
      return next;
    });
  };

  const handleLevelSave = () => {
    if (!selectedItem) return;
    const baseP = formValues.basePower ?? selectedItem.basePower;
    const baseC = formValues.baseCooldown ?? selectedItem.baseCooldown;
    const unlockP = formValues.unlockPrice ?? selectedItem.unlockPrice ?? 0;
    const merged = mergeLevelStatsForMax(
      formLevelStats,
      formLevelMax,
      baseP,
      baseC,
      unlockP
    );
    const uniqErr = validateLevelStatsPowerCooldownUnique(merged);
    if (uniqErr) {
      setLevelStatsValidationError(uniqErr);
      return;
    }
    setLevelStatsValidationError(null);
    setFormValues((p) => ({
      ...p,
      maxLevel: formLevelMax,
      levelStats: merged,
    }));
    closeI18nPopup();
  };

  const confirmSaveLevelPopup = () => {
    setShowLevelUnsavedConfirm(false);
    handleLevelSave();
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

  const confirmDiscardI18nPopup = () => closeI18nPopup();

  const confirmSaveI18nPopup = () => {
    setShowI18nUnsavedConfirm(false);
    handleI18nSave();
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
      const maxLv = Math.max(
        1,
        Math.min(
          99,
          Math.floor(formValues.maxLevel ?? selectedItem.maxLevel ?? 1)
        )
      );
      const mergedLevelStats = mergeLevelStatsForMax(
        formValues.levelStats ?? selectedItem.levelStats,
        maxLv,
        formValues.basePower ?? selectedItem.basePower,
        formValues.baseCooldown ?? selectedItem.baseCooldown,
        formValues.unlockPrice ?? selectedItem.unlockPrice ?? 0
      );
      const levelUniqErr = validateLevelStatsPowerCooldownUnique(mergedLevelStats);
      if (levelUniqErr) {
        setError(levelUniqErr);
        setSaveLoading(false);
        return;
      }
      const nextStatus: 'enabled' | 'disabled' =
        (formValues.status ?? selectedItem.status) === 'enabled' ? 'enabled' : 'disabled';
      const promises: Promise<unknown>[] = [];
      const classPath = (formValues.className ?? selectedItem.className ?? '').trim();
      promises.push(
        gameDataService.updateItem(selectedItem._id, {
          image: img,
          nameClass: classPath,
          className: classPath,
          basePower: formValues.basePower ?? selectedItem.basePower,
          baseCooldown: formValues.baseCooldown ?? selectedItem.baseCooldown,
          maxLevel: maxLv,
          unlockPrice: Math.max(
            0,
            Math.floor(formValues.unlockPrice ?? selectedItem.unlockPrice ?? 0)
          ),
          levelStats: mergedLevelStats,
          status: nextStatus,
          attached: formValues.attached ?? selectedItem.attached,
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
                maxLevel: maxLv,
                levelStats: mergedLevelStats,
                status: nextStatus,
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
        p && p._id === selectedItem._id
          ? {
              ...p,
              ...formValues,
              maxLevel: maxLv,
              levelStats: mergedLevelStats,
              status: nextStatus,
            }
          : p
      );
      const switchAfter = pendingEditItem;
      setPendingEditItem(null);
      if (switchAfter && switchAfter._id !== selectedItem._id) {
        openEditModal(switchAfter);
      } else {
        closeEditModal();
      }
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
    requestOpenEditModal,
    closeEditModal,
    requestCloseEditModal,
    showUnsavedConfirm,
    dismissUnsavedConfirm: () => {
      setShowUnsavedConfirm(false);
      setPendingEditItem(null);
    },
    confirmDiscardEditModal,
    confirmSaveEditModal,
    getFormI18n,
    setFormI18n,
    openI18nPopup,
    requestCloseI18nPopup,
    showLevelUnsavedConfirm,
    dismissLevelUnsavedConfirm,
    confirmDiscardLevelPopup,
    confirmSaveLevelPopup,
    showI18nUnsavedConfirm,
    dismissI18nUnsavedConfirm,
    confirmDiscardI18nPopup,
    confirmSaveI18nPopup,
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
    levelStatsValidationError,
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
