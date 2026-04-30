import { useState, useEffect, useRef } from 'react';
import { gameDataService, type AdventureCard } from '../../services/gameDataService';
import { useUnsavedBaseline } from '../share';
import { contentsToIds, normalizeAdventureCardStatus } from './adventureCardUtils';
import { localizationService } from '../../services/localizationService';
import { filesService, type FileTreeItem } from '../../services/filesService';
import type { EditLang } from '../LangDropdown';

const CREATE_DEFAULT: Partial<AdventureCard> = {
  nameId: '',
  name: '',
  description: '',
  type: 'weapon',
  status: 'enabled',
  rarity: 1,
};

export type AdventureCardEditI18nSaved = (
  nameId: string,
  field: 'name' | 'description',
  translations: Record<string, string>
) => void;

export function useAdventureCardEdit(
  setCards: React.Dispatch<React.SetStateAction<AdventureCard[]>>,
  onI18nSaved?: AdventureCardEditI18nSaved
) {
  const [editCard, setEditCard] = useState<AdventureCard | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Partial<AdventureCard>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [formCreate, setFormCreate] = useState<Partial<AdventureCard>>(CREATE_DEFAULT);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<EditLang>('vi');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [nameI18nEn, setNameI18nEn] = useState('');
  const [nameI18nVi, setNameI18nVi] = useState('');
  const [nameI18nJa, setNameI18nJa] = useState('');
  const [descI18nEn, setDescI18nEn] = useState('');
  const [descI18nVi, setDescI18nVi] = useState('');
  const [descI18nJa, setDescI18nJa] = useState('');
  const [translateNameLoading, setTranslateNameLoading] = useState(false);
  const [translateDescLoading, setTranslateDescLoading] = useState(false);
  const [i18nNameError, setI18nNameError] = useState<string | null>(null);
  const [i18nDescError, setI18nDescError] = useState<string | null>(null);
  const [imageTreeOpen, setImageTreeOpen] = useState(false);
  const [imageTree, setImageTree] = useState<FileTreeItem[] | null>(null);
  const [imageTreeLoading, setImageTreeLoading] = useState(false);
  const [imageTreeExpanded, setImageTreeExpanded] = useState<Set<string>>(new Set());

  const [classNamePickerOpen, setClassNamePickerOpen] = useState(false);
  const [i18nField, setI18nField] = useState<'name' | 'description' | null>(null);

  const {
    setBaseline: setEditBaseline,
    clearBaseline: clearEditBaseline,
    isDirty: isEditFormDirty,
  } = useUnsavedBaseline<Partial<AdventureCard>>();
  const {
    setBaseline: setCreateBaseline,
    clearBaseline: clearCreateBaseline,
    isDirty: isCreateFormDirty,
  } = useUnsavedBaseline<Partial<AdventureCard>>();
  const {
    setBaseline: setI18nBaseline,
    clearBaseline: clearI18nBaseline,
    isDirty: isI18nSnapshotDirty,
  } = useUnsavedBaseline<{ en: string; vi: string; ja: string }>();
  const [showUnsavedConfirmEdit, setShowUnsavedConfirmEdit] = useState(false);
  const [showUnsavedConfirmCreate, setShowUnsavedConfirmCreate] = useState(false);
  const [showUnsavedConfirmI18n, setShowUnsavedConfirmI18n] = useState(false);
  const [i18nSaveLoading, setI18nSaveLoading] = useState(false);
  /** Thẻ đích khi đổi thẻ trong lúc drawer mở còn chỉnh sửa chưa lưu (giống pendingEditItem ở equipment). */
  const [pendingEditCard, setPendingEditCard] = useState<AdventureCard | null>(null);
  const formRef = useRef(form);
  formRef.current = form;
  const pendingEditCardRef = useRef<AdventureCard | null>(null);
  useEffect(() => {
    pendingEditCardRef.current = pendingEditCard;
  }, [pendingEditCard]);

  const setNameI18n = (lang: EditLang, val: string) => {
    if (lang === 'en') setNameI18nEn(val);
    else if (lang === 'vi') setNameI18nVi(val);
    else setNameI18nJa(val);
  };

  const setDescI18n = (lang: EditLang, val: string) => {
    if (lang === 'en') setDescI18nEn(val);
    else if (lang === 'vi') setDescI18nVi(val);
    else setDescI18nJa(val);
  };

  const getFormI18n = (lang: EditLang) => {
    if (!i18nField) return '';
    if (i18nField === 'name') {
      return lang === 'en' ? nameI18nEn : lang === 'vi' ? nameI18nVi : nameI18nJa;
    }
    return lang === 'en' ? descI18nEn : lang === 'vi' ? descI18nVi : descI18nJa;
  };

  const setFormI18n = (lang: EditLang, val: string) => {
    if (!i18nField) return;
    if (i18nField === 'name') setNameI18n(lang, val);
    else setDescI18n(lang, val);
  };

  const openI18nEditor = (field: 'name' | 'description') => {
    setI18nField(field);
    setI18nNameError(null);
    setI18nDescError(null);
    if (field === 'name') {
      setI18nBaseline({ en: nameI18nEn, vi: nameI18nVi, ja: nameI18nJa });
    } else {
      setI18nBaseline({ en: descI18nEn, vi: descI18nVi, ja: descI18nJa });
    }
  };

  /** Đóng popup i18n và xóa baseline (sau lưu / không lưu / không có thay đổi). */
  const closeI18nEditor = () => {
    setShowUnsavedConfirmI18n(false);
    setI18nField(null);
    clearI18nBaseline();
    setI18nNameError(null);
    setI18nDescError(null);
  };

  const requestCloseI18nEditor = () => {
    if (!i18nField) return;
    const snapshot =
      i18nField === 'name'
        ? { en: nameI18nEn, vi: nameI18nVi, ja: nameI18nJa }
        : { en: descI18nEn, vi: descI18nVi, ja: descI18nJa };
    if (isI18nSnapshotDirty(snapshot)) {
      setShowUnsavedConfirmI18n(true);
      return;
    }
    closeI18nEditor();
  };

  useEffect(() => {
    if (!editCard) {
      setNameI18nEn('');
      setNameI18nVi('');
      setNameI18nJa('');
      setDescI18nEn('');
      setDescI18nVi('');
      setDescI18nJa('');
      return;
    }
    const loadLoc = async () => {
      const nameKey = `adventureCard.${editCard.nameId}.name`;
      const descKey = `adventureCard.${editCard.nameId}.description`;
      try {
        const nameLoc = await localizationService.getLocalizationByKey(nameKey);
        const nt = nameLoc.translations ?? {};
        setNameI18nEn(nt.en ?? editCard.name ?? '');
        setNameI18nVi(nt.vi ?? '');
        setNameI18nJa(nt.ja ?? '');
      } catch {
        setNameI18nEn(editCard.name ?? '');
        setNameI18nVi('');
        setNameI18nJa('');
      }
      try {
        const descLoc = await localizationService.getLocalizationByKey(descKey);
        const dt = descLoc.translations ?? {};
        setDescI18nEn(dt.en ?? editCard.description ?? '');
        setDescI18nVi(dt.vi ?? '');
        setDescI18nJa(dt.ja ?? '');
      } catch {
        setDescI18nEn(editCard.description ?? '');
        setDescI18nVi('');
        setDescI18nJa('');
      }
    };
    loadLoc();
  }, [editCard]);

  const handleI18nTranslate = async (field: 'name' | 'description') => {
    if (!editCard) return;
    const setLoading = field === 'name' ? setTranslateNameLoading : setTranslateDescLoading;
    const setErr = field === 'name' ? setI18nNameError : setI18nDescError;
    const sourceText =
      field === 'name'
        ? (editLang === 'en' ? nameI18nEn : editLang === 'vi' ? nameI18nVi : nameI18nJa).trim()
        : (editLang === 'en' ? descI18nEn : editLang === 'vi' ? descI18nVi : descI18nJa).trim();
    if (!sourceText) {
      setErr('Please enter source text before translating');
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const promises: Promise<void>[] = [];
      if (field === 'name') {
        if (!nameI18nVi.trim())
          promises.push(localizationService.translate(sourceText, editLang, 'vi').then(setNameI18nVi));
        if (!nameI18nJa.trim())
          promises.push(localizationService.translate(sourceText, editLang, 'ja').then(setNameI18nJa));
      } else {
        if (!descI18nVi.trim())
          promises.push(localizationService.translate(sourceText, editLang, 'vi').then(setDescI18nVi));
        if (!descI18nJa.trim())
          promises.push(localizationService.translate(sourceText, editLang, 'ja').then(setDescI18nJa));
      }
      await Promise.all(promises);
    } catch {
      setErr('Translation service error, please try again');
    } finally {
      setLoading(false);
    }
  };

  const openImageTree = async () => {
    setImageTreeOpen(true);
    if (imageTree === null && !imageTreeLoading) {
      setImageTreeLoading(true);
      try {
        const tree = await filesService.getImageTree();
        setImageTree(tree);
      } catch {
        setImageTree([]);
      } finally {
        setImageTreeLoading(false);
      }
    }
  };

  const toggleTreeExpanded = (path: string) => {
    setImageTreeExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectImage = (path: string) => {
    if (createOpen) {
      setFormCreate((p) => ({ ...p, image: path }));
    } else {
      setForm((p) => ({ ...p, image: path }));
    }
    setImageTreeOpen(false);
  };

  const closeEdit = () => {
    setShowUnsavedConfirmEdit(false);
    setShowUnsavedConfirmI18n(false);
    setPendingEditCard(null);
    clearEditBaseline();
    clearI18nBaseline();
    setEditOpen(false);
    setEditCard(null);
    setClassNamePickerOpen(false);
    setI18nField(null);
  };

  const applyOpenEdit = (card: AdventureCard) => {
    setPendingEditCard(null);
    setEditCard(card);
    const next = { ...structuredClone(card), status: normalizeAdventureCardStatus(card.status) };
    setForm(next);
    setEditBaseline(next);
    setShowUnsavedConfirmEdit(false);
    setShowUnsavedConfirmI18n(false);
    clearI18nBaseline();
    setEditOpen(true);
    setError(null);
    setImageTreeOpen(false);
    setClassNamePickerOpen(false);
    setI18nField(null);
    setI18nNameError(null);
    setI18nDescError(null);
  };

  const handleI18nSave = async (field: 'name' | 'description') => {
    if (!editCard) return;
    const setErr = field === 'name' ? setI18nNameError : setI18nDescError;
    const translations =
      field === 'name'
        ? { en: nameI18nEn.trim(), vi: nameI18nVi.trim(), ja: nameI18nJa.trim() }
        : { en: descI18nEn.trim(), vi: descI18nVi.trim(), ja: descI18nJa.trim() };
    const keyBase = `adventureCard.${editCard.nameId}.${field === 'name' ? 'name' : 'description'}`;
    setI18nSaveLoading(true);
    try {
      try {
        await localizationService.updateLocalization(keyBase, translations);
      } catch {
        try {
          await localizationService.createLocalization(keyBase, translations);
        } catch {
          setErr('Cannot save translation, please try again');
          return;
        }
      }
      if (field === 'name') {
        setForm((p) => ({ ...p, name: translations.en || p.name || editCard.name }));
      } else {
        setForm((p) => ({ ...p, description: translations.en || p.description || editCard.description }));
      }
      onI18nSaved?.(editCard.nameId, field, translations);
      setErr(null);
      const pendingAfter = pendingEditCardRef.current;
      closeI18nEditor();
      if (pendingAfter) {
        window.setTimeout(() => {
          const f = formRef.current;
          if (isEditFormDirty(f)) {
            setShowUnsavedConfirmEdit(true);
          } else {
            applyOpenEdit(pendingAfter);
          }
        }, 0);
      }
    } finally {
      setI18nSaveLoading(false);
    }
  };

  const requestOpenEdit = (card: AdventureCard) => {
    if (!editOpen || !editCard) {
      applyOpenEdit(card);
      return;
    }
    if (editCard._id === card._id) return;

    if (i18nField) {
      const snapshot =
        i18nField === 'name'
          ? { en: nameI18nEn, vi: nameI18nVi, ja: nameI18nJa }
          : { en: descI18nEn, vi: descI18nVi, ja: descI18nJa };
      if (isI18nSnapshotDirty(snapshot)) {
        setPendingEditCard(card);
        setShowUnsavedConfirmI18n(true);
        return;
      }
      closeI18nEditor();
      window.setTimeout(() => requestOpenEdit(card), 0);
      return;
    }

    if (classNamePickerOpen) {
      setClassNamePickerOpen(false);
    }

    if (isEditFormDirty(form)) {
      setPendingEditCard(card);
      setShowUnsavedConfirmEdit(true);
    } else {
      applyOpenEdit(card);
    }
  };

  const requestCloseEdit = () => {
    if (i18nField) {
      requestCloseI18nEditor();
      return;
    }
    if (classNamePickerOpen) {
      setClassNamePickerOpen(false);
      return;
    }
    if (editOpen && isEditFormDirty(form)) {
      setPendingEditCard(null);
      setShowUnsavedConfirmEdit(true);
    } else {
      closeEdit();
    }
  };

  const confirmDiscardEdit = () => {
    const pending = pendingEditCard;
    setShowUnsavedConfirmEdit(false);
    setPendingEditCard(null);
    if (pending) {
      applyOpenEdit(pending);
    } else {
      closeEdit();
    }
  };

  const dismissUnsavedConfirmI18n = () => {
    setShowUnsavedConfirmI18n(false);
    setPendingEditCard(null);
  };

  const confirmDiscardI18n = () => {
    const pending = pendingEditCardRef.current;
    closeI18nEditor();
    if (pending) {
      window.setTimeout(() => {
        const f = formRef.current;
        if (isEditFormDirty(f)) {
          setShowUnsavedConfirmEdit(true);
        } else {
          applyOpenEdit(pending);
        }
      }, 0);
    }
  };

  const confirmSaveI18n = () => {
    setShowUnsavedConfirmI18n(false);
    if (i18nField) void handleI18nSave(i18nField);
  };

  const handleSaveCard = async () => {
    if (!editCard) return;
    setSaveLoading(true);
    setError(null);
    try {
      const payload: Partial<AdventureCard> = {
        ...form,
        name: form.name ?? editCard.name,
        description: form.description ?? editCard.description,
        rarity: form.rarity ?? editCard.rarity,
        status: form.status ?? editCard.status,
        image: form.image ?? editCard.image,
        className: form.className !== undefined ? form.className : editCard.className,
      };
      if ((form.type ?? editCard.type) === 'treasure' && Array.isArray(form.contents)) {
        payload.contents = contentsToIds(form.contents);
      }
      const updated = await gameDataService.updateAdventureCard(editCard._id, payload);
      setCards((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
      const switchAfter = pendingEditCardRef.current;
      setPendingEditCard(null);
      if (switchAfter && switchAfter._id !== editCard._id) {
        applyOpenEdit(switchAfter);
      } else {
        closeEdit();
      }
    } catch (e: unknown) {
      setError(
        e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Failed to save card'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const confirmSaveEdit = () => {
    setShowUnsavedConfirmEdit(false);
    void handleSaveCard();
  };

  const handleDeleteCard = async () => {
    if (!editCard) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await gameDataService.deleteAdventureCard(editCard._id);
      setCards((prev) => prev.filter((c) => c._id !== editCard._id));
      closeEdit();
    } catch (e: unknown) {
      setError(
        e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Cannot delete card'
      );
      throw e;
    } finally {
      setDeleteLoading(false);
    }
  };

  const openClassNamePicker = () => setClassNamePickerOpen(true);
  const closeClassNamePicker = () => setClassNamePickerOpen(false);
  const selectClassName = (className: string) => {
    setForm((p) => ({ ...p, className: className || undefined }));
    setClassNamePickerOpen(false);
  };

  const closeCreate = () => {
    setShowUnsavedConfirmCreate(false);
    clearCreateBaseline();
    setCreateOpen(false);
  };

  const requestCloseCreate = () => {
    if (createOpen && isCreateFormDirty(formCreate)) {
      setShowUnsavedConfirmCreate(true);
    } else {
      closeCreate();
    }
  };

  const confirmDiscardCreate = () => {
    closeCreate();
  };

  const handleOpenCreate = () => {
    const initial = { ...CREATE_DEFAULT };
    setFormCreate(initial);
    setCreateBaseline(structuredClone(initial));
    setShowUnsavedConfirmCreate(false);
    setCreateOpen(true);
    setError(null);
    setImageTreeOpen(false);
  };

  const handleCreateCard = async () => {
    const nameId = (formCreate.nameId ?? '').trim();
    const name = (formCreate.name ?? '').trim();
    const type = formCreate.type ?? 'weapon';
    if (!nameId || !name) {
      setError('Please enter Name ID and Name');
      return;
    }
    setSaveLoading(true);
    setError(null);
    try {
      const payload: Partial<AdventureCard> = {
        ...formCreate,
        nameId,
        name,
        description: formCreate.description ?? '',
        type,
        status: formCreate.status ?? 'enabled',
        rarity: formCreate.rarity ?? 1,
      };
      if (type === 'treasure' && Array.isArray(formCreate.contents)) {
        payload.contents = contentsToIds(formCreate.contents);
      }
      const created = await gameDataService.createAdventureCard(payload);
      setCards((prev) => [...prev, created]);
      closeCreate();
    } catch (e: unknown) {
      setError(
        e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Failed to create card'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const confirmSaveCreate = () => {
    setShowUnsavedConfirmCreate(false);
    void handleCreateCard();
  };

  return {
    editCard,
    editOpen,
    form,
    setForm,
    createOpen,
    formCreate,
    setFormCreate,
    saveLoading,
    deleteLoading,
    error,
    editLang,
    setEditLang,
    langDropdownOpen,
    setLangDropdownOpen,
    nameI18nEn,
    nameI18nVi,
    nameI18nJa,
    descI18nEn,
    descI18nVi,
    descI18nJa,
    setNameI18n,
    setDescI18n,
    translateNameLoading,
    translateDescLoading,
    i18nNameError,
    i18nDescError,
    i18nField,
    getFormI18n,
    setFormI18n,
    openI18nEditor,
    requestCloseI18nEditor,
    imageTreeOpen,
    setImageTreeOpen,
    imageTree,
    imageTreeLoading,
    imageTreeExpanded,
    handleI18nTranslate,
    handleI18nSave,
    openImageTree,
    toggleTreeExpanded,
    selectImage,
    handleOpenEdit: requestOpenEdit,
    handleSaveCard,
    handleDeleteCard,
    closeEdit,
    requestCloseEdit,
    showUnsavedConfirmEdit,
    dismissUnsavedConfirmEdit: () => {
      setShowUnsavedConfirmEdit(false);
      setPendingEditCard(null);
    },
    confirmDiscardEdit,
    confirmSaveEdit,
    showUnsavedConfirmI18n,
    dismissUnsavedConfirmI18n,
    confirmDiscardI18n,
    confirmSaveI18n,
    i18nSaveLoading,
    classNamePickerOpen,
    openClassNamePicker,
    closeClassNamePicker,
    selectClassName,
    handleOpenCreate,
    closeCreate,
    requestCloseCreate,
    showUnsavedConfirmCreate,
    dismissUnsavedConfirmCreate: () => setShowUnsavedConfirmCreate(false),
    confirmDiscardCreate,
    confirmSaveCreate,
    handleCreateCard,
  };
}
