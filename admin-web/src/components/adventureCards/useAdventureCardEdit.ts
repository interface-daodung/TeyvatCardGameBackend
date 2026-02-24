import { useState, useEffect } from 'react';
import { gameDataService, type AdventureCard } from '../../services/gameDataService';
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
  const [error, setError] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<EditLang>('vi');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [i18nField, setI18nField] = useState<'name' | 'description' | null>(null);
  const [formI18nEn, setFormI18nEn] = useState('');
  const [formI18nVi, setFormI18nVi] = useState('');
  const [formI18nJa, setFormI18nJa] = useState('');
  const [translateLoading, setTranslateLoading] = useState(false);
  const [i18nError, setI18nError] = useState<string | null>(null);
  const [nameTranslations, setNameTranslations] = useState<Record<string, string> | null>(null);
  const [descriptionTranslations, setDescriptionTranslations] = useState<Record<string, string> | null>(null);
  const [imageTreeOpen, setImageTreeOpen] = useState(false);
  const [imageTree, setImageTree] = useState<FileTreeItem[] | null>(null);
  const [imageTreeLoading, setImageTreeLoading] = useState(false);
  const [imageTreeExpanded, setImageTreeExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!editCard) {
      setNameTranslations(null);
      setDescriptionTranslations(null);
      return;
    }
    const loadLoc = async () => {
      try {
        const nameKey = `adventureCard.${editCard.nameId}.name`;
        const descKey = `adventureCard.${editCard.nameId}.description`;
        try {
          const nameLoc = await localizationService.getLocalizationByKey(nameKey);
          setNameTranslations(nameLoc.translations ?? {});
        } catch {
          setNameTranslations(null);
        }
        try {
          const descLoc = await localizationService.getLocalizationByKey(descKey);
          setDescriptionTranslations(descLoc.translations ?? {});
        } catch {
          setDescriptionTranslations(null);
        }
      } catch {
        setNameTranslations(null);
        setDescriptionTranslations(null);
      }
    };
    loadLoc();
  }, [editCard]);

  const getFormI18n = (lang: EditLang) =>
    lang === 'en' ? formI18nEn : lang === 'vi' ? formI18nVi : formI18nJa;
  const setFormI18n = (lang: EditLang, val: string) => {
    if (lang === 'en') setFormI18nEn(val);
    else if (lang === 'vi') setFormI18nVi(val);
    else setFormI18nJa(val);
  };

  const openI18nEditor = async (field: 'name' | 'description') => {
    if (!editCard) return;
    setI18nField(field);
    setI18nError(null);
    const keyBase = `adventureCard.${editCard.nameId}.${field === 'name' ? 'name' : 'description'}`;
    try {
      const loc = await localizationService.getLocalizationByKey(keyBase);
      const t = loc.translations ?? {};
      setFormI18nEn(
        t.en ?? (field === 'name' ? form.name ?? editCard.name : form.description ?? editCard.description ?? '')
      );
      setFormI18nVi(t.vi ?? '');
      setFormI18nJa(t.ja ?? '');
    } catch {
      setFormI18nEn(
        field === 'name' ? form.name ?? editCard.name ?? '' : form.description ?? editCard.description ?? ''
      );
      setFormI18nVi('');
      setFormI18nJa('');
    }
  };

  const handleI18nTranslate = async () => {
    if (!i18nField) return;
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
    if (!editCard || !i18nField) return;
    const translations = { en: formI18nEn.trim(), vi: formI18nVi.trim(), ja: formI18nJa.trim() };
    const keyBase = `adventureCard.${editCard.nameId}.${i18nField === 'name' ? 'name' : 'description'}`;
    try {
      await localizationService.updateLocalization(keyBase, translations);
    } catch {
      try {
        await localizationService.createLocalization(keyBase, translations);
      } catch {
        setI18nError('Không lưu được bản dịch, hãy thử lại');
        return;
      }
    }
    if (i18nField === 'name') {
      setForm((p) => ({ ...p, name: translations.en || p.name || editCard.name }));
      setNameTranslations(translations);
    } else {
      setForm((p) => ({ ...p, description: translations.en || p.description || editCard.description }));
      setDescriptionTranslations(translations);
    }
    onI18nSaved?.(editCard.nameId, i18nField, translations);
    setI18nField(null);
    setI18nError(null);
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

  const handleOpenEdit = (card: AdventureCard) => {
    setEditCard(card);
    setForm(card);
    setEditOpen(true);
    setError(null);
    setImageTreeOpen(false);
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
      };
      const updated = await gameDataService.updateAdventureCard(editCard._id, payload);
      setCards((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
      setEditCard(updated);
      setEditOpen(false);
    } catch (e: unknown) {
      setError(
        e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Failed to save card'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const closeEdit = () => setEditOpen(false);

  const handleOpenCreate = () => {
    setFormCreate({ ...CREATE_DEFAULT });
    setCreateOpen(true);
    setError(null);
    setImageTreeOpen(false);
  };

  const closeCreate = () => setCreateOpen(false);

  const handleCreateCard = async () => {
    const nameId = (formCreate.nameId ?? '').trim();
    const name = (formCreate.name ?? '').trim();
    const type = formCreate.type ?? 'weapon';
    if (!nameId || !name) {
      setError('Vui lòng nhập Name ID và Name');
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
      const created = await gameDataService.createAdventureCard(payload);
      setCards((prev) => [...prev, created]);
      setCreateOpen(false);
    } catch (e: unknown) {
      setError(
        e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Failed to create card'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const nameDisplay =
    (nameTranslations ?? undefined)?.[editLang] ?? form.name ?? editCard?.name ?? '';
  const descriptionDisplay =
    (descriptionTranslations ?? undefined)?.[editLang] ?? form.description ?? editCard?.description ?? '';

  return {
    editCard,
    editOpen,
    form,
    setForm,
    createOpen,
    formCreate,
    setFormCreate,
    saveLoading,
    error,
    editLang,
    setEditLang,
    langDropdownOpen,
    setLangDropdownOpen,
    i18nField,
    setI18nField,
    getFormI18n,
    setFormI18n,
    translateLoading,
    i18nError,
    setI18nError,
    imageTreeOpen,
    setImageTreeOpen,
    imageTree,
    imageTreeLoading,
    imageTreeExpanded,
    openI18nEditor,
    handleI18nTranslate,
    handleI18nSave,
    openImageTree,
    toggleTreeExpanded,
    selectImage,
    handleOpenEdit,
    handleSaveCard,
    closeEdit,
    handleOpenCreate,
    closeCreate,
    handleCreateCard,
    nameDisplay,
    descriptionDisplay,
  };
}
