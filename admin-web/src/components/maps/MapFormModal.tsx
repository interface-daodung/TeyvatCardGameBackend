import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    gameDataService,
    type Map as MapType,
    type MapTypeRatios,
    type MapCreatePayload,
    type AdventureCard,
} from '../../services/gameDataService';
import { localizationService } from '../../services/localizationService';
import { Button } from '../ui/button';
import { FileTreeNode } from '../FileTreeNode';
import { I18nEditorPanel, type EditLang } from '../i18n/I18nEditorPanel';
import { TypeRatioEditor } from './TypeRatioEditor';
import { CardDeckBuilder } from './CardDeckBuilder';
import {
    DEFAULT_TYPE_RATIOS,
    MAP_STATUSES,
    deckContainsDisabledAdventureCard,
    getCardImageUrl,
    getFormTypeRatios,
    getFreeRatio,
    isAdventureCardShownInDeckSource,
    normalizeMapStatus,
    type MapStatus,
} from './mapUtils';
import { AtlasBuilderModal } from '../assets/AtlasBuilderModal';
import type { FileTreeItem } from '../../services/filesService';
import { UnsavedChangesDialog, useUnsavedBaseline } from '../share';
import { ImageLightbox, type LightboxImage } from '../ui/ImageLightbox';

const LANG_OPTIONS: EditLang[] = ['en', 'vi', 'ja'];

/** Chuẩn hóa tên map → tên atlas (a–z, A–Z, 0-9, -, _, tối đa 50 ký tự) giống AtlasBuilderModal. */
function defaultAtlasNameFromMap(mapName: string, nameId: string): string {
    const tryName = mapName.trim();
    if (/^[a-zA-Z0-9_-]{1,50}$/.test(tryName)) return tryName;
    const tryId = nameId.trim();
    if (/^[a-zA-Z0-9_-]{1,50}$/.test(tryId)) return tryId;
    const slug = tryName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 50);
    return slug.length >= 1 ? slug : 'map-atlas';
}

type I18nNameSnapshot = { en: string; vi: string; ja: string };

interface MapFormModalProps {
    open: boolean;
    editingMap: MapType | null;
    adventureCards: AdventureCard[];
    mapBackgroundTree: FileTreeItem[] | null;
    mapBackgroundTreeLoading: boolean;
    onClose: () => void;
    /** Called after a successful create/update/delete to reload data */
    onSaved: () => void;
}

/**
 * Modal for creating or editing a map.
 * Contains all form state, submit/delete handlers, and i18n editing.
 */
export function MapFormModal({
    open,
    editingMap,
    adventureCards,
    mapBackgroundTree,
    mapBackgroundTreeLoading,
    onClose,
    onSaved,
}: MapFormModalProps) {
    // ── Form state ──
    type FormState = {
        nameId: string;
        name: string;
        description: string;
        mapBackground: string;
        typeRatios: MapTypeRatios;
        status: MapStatus;
        deckIds: string[];
    };

    const [form, setForm] = useState<FormState>({
        nameId: '',
        name: '',
        description: '',
        mapBackground: '',
        typeRatios: { ...DEFAULT_TYPE_RATIOS },
        status: 'enabled',
        deckIds: [],
    });

    const { setBaseline, clearBaseline, isDirty: checkDirty } = useUnsavedBaseline<FormState>();
    const {
        setBaseline: setI18nBaseline,
        clearBaseline: clearI18nBaseline,
        isDirty: checkI18nDirty,
    } = useUnsavedBaseline<I18nNameSnapshot>();
    const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
    const [showI18nUnsavedConfirm, setShowI18nUnsavedConfirm] = useState(false);
    const [i18nSaveSubmitting, setI18nSaveSubmitting] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const [submitLoading, setSubmitLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── i18n state ──
    const [nameTranslations, setNameTranslations] = useState<Record<string, string> | null>(null);
    const [editLang, setEditLang] = useState<EditLang>('en');
    const [i18nField, setI18nField] = useState<'name' | null>(null);
    const [formI18nEn, setFormI18nEn] = useState('');
    const [formI18nVi, setFormI18nVi] = useState('');
    const [formI18nJa, setFormI18nJa] = useState('');
    const [translateLoading, setTranslateLoading] = useState(false);
    const [i18nError, setI18nError] = useState<string | null>(null);
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);

    // ── Map background picker state ──
    const [mapBackgroundTreeOpen, setMapBackgroundTreeOpen] = useState(false);
    const [mapBackgroundTreeExpanded, setMapBackgroundTreeExpanded] = useState<Set<string>>(new Set());
    const [mapBackgroundLightbox, setMapBackgroundLightbox] = useState<LightboxImage | null>(null);
    const [showDisabledDeckBlockDialog, setShowDisabledDeckBlockDialog] = useState(false);
    const [atlasBuilderOpen, setAtlasBuilderOpen] = useState(false);

    // ── Sync form when modal opens or editing target changes ──
    useEffect(() => {
        if (!open) {
            clearBaseline();
            return;
        }
        if (editingMap) {
            const next: FormState = {
                nameId: editingMap.nameId,
                name: editingMap.name,
                description: editingMap.description ?? '',
                mapBackground: editingMap.map_background ?? '',
                typeRatios: getFormTypeRatios(editingMap.typeRatios),
                status: normalizeMapStatus(editingMap.status),
                deckIds: (editingMap.deck ?? []).map((c: AdventureCard) => c._id),
            };
            setForm(next);
            setBaseline(next);
        } else {
            const next: FormState = {
                nameId: '',
                name: '',
                description: '',
                mapBackground: '',
                typeRatios: { ...DEFAULT_TYPE_RATIOS },
                status: 'enabled',
                deckIds: [],
            };
            setForm(next);
            setBaseline(next);
        }
    }, [open, editingMap, clearBaseline, setBaseline]);

    useEffect(() => {
        if (!open) {
            setShowUnsavedConfirm(false);
            setShowI18nUnsavedConfirm(false);
            setShowDisabledDeckBlockDialog(false);
            setAtlasBuilderOpen(false);
        }
    }, [open]);

    const isDirty = open && checkDirty(form);

    const i18nSnapshot: I18nNameSnapshot = {
        en: formI18nEn,
        vi: formI18nVi,
        ja: formI18nJa,
    };
    const i18nDirty = i18nField === 'name' && checkI18nDirty(i18nSnapshot);

    // ── Load name translations when editing ──
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

    // ── i18n helpers ──
    const getFormI18n = (lang: EditLang) =>
        lang === 'en' ? formI18nEn : lang === 'vi' ? formI18nVi : formI18nJa;
    const setFormI18n = (lang: EditLang, val: string) => {
        if (lang === 'en') setFormI18nEn(val);
        else if (lang === 'vi') setFormI18nVi(val);
        else setFormI18nJa(val);
    };

    const closeI18nPanel = () => {
        setI18nField(null);
        setI18nError(null);
        clearI18nBaseline();
    };

    const requestCloseI18n = () => {
        if (i18nDirty) {
            setShowI18nUnsavedConfirm(true);
        } else {
            closeI18nPanel();
        }
    };

    const openI18nNameEditor = async () => {
        if (!editingMap) return;
        if (i18nField === 'name') {
            requestCloseI18n();
            return;
        }
        setI18nField('name');
        setI18nError(null);
        const fallback: I18nNameSnapshot = {
            en: form.name ?? editingMap.name ?? '',
            vi: '',
            ja: '',
        };
        setFormI18nEn(fallback.en);
        setFormI18nVi(fallback.vi);
        setFormI18nJa(fallback.ja);
        setI18nBaseline(fallback);

        const key = `map.${editingMap.nameId}.name`;
        try {
            const loc = await localizationService.getLocalizationByKey(key);
            const t = loc.translations ?? {};
            const snapshot: I18nNameSnapshot = {
                en: t.en ?? form.name ?? editingMap.name,
                vi: t.vi ?? '',
                ja: t.ja ?? '',
            };
            setFormI18nEn(snapshot.en);
            setFormI18nVi(snapshot.vi);
            setFormI18nJa(snapshot.ja);
            setI18nBaseline(snapshot);
        } catch {
            /* giữ fallback đã baseline */
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

    const handleI18nSave = async (): Promise<boolean> => {
        if (!editingMap || i18nField !== 'name') return false;
        setI18nSaveSubmitting(true);
        setI18nError(null);
        const translations = {
            en: formI18nEn.trim(),
            vi: formI18nVi.trim(),
            ja: formI18nJa.trim(),
        };
        const key = `map.${editingMap.nameId}.name`;
        try {
            try {
                await localizationService.updateLocalization(key, translations);
            } catch {
                try {
                    await localizationService.createLocalization(key, translations);
                } catch {
                    setI18nError('Không lưu được bản dịch, hãy thử lại');
                    return false;
                }
            }
            setNameTranslations(translations);
            setI18nField(null);
            setI18nError(null);
            setShowI18nUnsavedConfirm(false);
            clearI18nBaseline();
            return true;
        } finally {
            setI18nSaveSubmitting(false);
        }
    };

    const confirmI18nDiscard = () => {
        setShowI18nUnsavedConfirm(false);
        closeI18nPanel();
    };

    const confirmI18nSaveFromDialog = () => {
        void handleI18nSave();
    };

    // ── Type ratio handler ──
    const setTypeRatio = (key: keyof MapTypeRatios, value: number) => {
        setForm((prev) => ({
            ...prev,
            typeRatios: { ...prev.typeRatios, [key]: value },
        }));
    };

    const freeRatio = getFreeRatio(form.typeRatios);
    const canSaveRatios = freeRatio === 0;
    const deckHasDisabledCards = deckContainsDisabledAdventureCard(form.deckIds, adventureCards);

    const deckAtlasImages = useMemo(() => {
        const seen = new Set<string>();
        const result: { path: string; name: string }[] = [];
        const cardById = new Map(adventureCards.map((card) => [card._id, card]));

        const addImage = (card: AdventureCard, fallbackName: string) => {
            const path = getCardImageUrl(card);
            if (!path || seen.has(path)) return;
            seen.add(path);
            result.push({
                path,
                name: card.name || card.nameId || fallbackName,
            });
        };

        for (const id of form.deckIds) {
            const card = cardById.get(id);
            if (!card) continue;
            addImage(card, id);

            if (card.type !== 'treasure' || !Array.isArray(card.contents)) continue;
            const contentIds = card.contents
                .map((content) => (typeof content === 'string' ? content : content?._id))
                .filter((contentId): contentId is string => Boolean(contentId));
            for (const contentId of contentIds) {
                const contentCard = cardById.get(contentId);
                if (!contentCard) continue;
                addImage(contentCard, contentId);
            }
        }
        return result;
    }, [form.deckIds, adventureCards]);

    const deckAtlasInitialName = defaultAtlasNameFromMap(form.name, form.nameId);

    // ── Submit / Delete ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSaveRatios) {
            setError('Tổng tỉ lệ phải bằng 100 (free ratio phải về 0 mới được lưu).');
            return;
        }
        if (deckHasDisabledCards) {
            setShowUnsavedConfirm(false);
            setShowDisabledDeckBlockDialog(true);
            return;
        }
        setSubmitLoading(true);
        setError(null);
        try {
            const payload: MapCreatePayload = {
                nameId: form.nameId.trim(),
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                map_background: form.mapBackground.trim() || undefined,
                typeRatios: form.typeRatios,
                deck: form.deckIds,
                status: form.status,
            };
            if (editingMap) {
                await gameDataService.updateMap(editingMap._id, payload);
            } else {
                await gameDataService.createMap(payload);
            }
            performClose();
            onSaved();
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as { message: string }).message)
                    : 'Có lỗi';
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
            performClose();
            onSaved();
        } catch (err) {
            console.error('Failed to delete map:', err);
            setError('Xóa map thất bại');
        } finally {
            setDeleteLoading(false);
        }
    };

    const performClose = () => {
        setShowUnsavedConfirm(false);
        setShowI18nUnsavedConfirm(false);
        setI18nField(null);
        setI18nError(null);
        clearI18nBaseline();
        setNameTranslations(null);
        setError(null);
        setMapBackgroundTreeOpen(false);
        setMapBackgroundTreeExpanded(new Set());
        setMapBackgroundLightbox(null);
        setShowDisabledDeckBlockDialog(false);
        setAtlasBuilderOpen(false);
        onClose();
    };

    const requestClose = () => {
        if (showI18nUnsavedConfirm) {
            setShowI18nUnsavedConfirm(false);
            return;
        }
        if (i18nDirty) {
            setShowI18nUnsavedConfirm(true);
            return;
        }
        if (isDirty) {
            setShowUnsavedConfirm(true);
        } else {
            performClose();
        }
    };

    const confirmDiscard = () => {
        performClose();
    };

    const confirmSaveFromDialog = () => {
        setShowUnsavedConfirm(false);
        formRef.current?.requestSubmit();
    };

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen w-full">
            <div
                className="absolute inset-0 min-h-full w-full bg-black/50"
                onClick={() => {
                    if (showI18nUnsavedConfirm) setShowI18nUnsavedConfirm(false);
                    else if (showUnsavedConfirm) setShowUnsavedConfirm(false);
                    else requestClose();
                }}
                aria-hidden
            />
            <div className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col rounded-lg bg-card shadow-xl border border-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-primary-600 text-white shrink-0">
                    <h2 className="text-xl font-semibold">
                        {editingMap ? 'Sửa map' : 'Thêm map'}
                    </h2>
                    <button
                        type="button"
                        onClick={requestClose}
                        className="p-1 hover:bg-primary-500 rounded transition-colors text-xl leading-none"
                        aria-label="Đóng"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    <form
                        ref={formRef}
                        onSubmit={handleSubmit}
                        className="space-y-4 p-6"
                    >
                        {error && (
                            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2 text-destructive text-sm">
                                {error}
                            </div>
                        )}

                        {/* nameId */}
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

                        {/* name */}
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
                                                {i18nField === 'name' ? 'Thu gọn i18n' : 'Sửa i18n'}
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
                            {i18nField === 'name' && (
                                <div className="mt-3">
                                    <I18nEditorPanel
                                        variant="inline"
                                        title="Sửa Tên hiển thị (i18n)"
                                        fieldType="name"
                                        editLang={editLang}
                                        getValue={getFormI18n}
                                        onChange={setFormI18n}
                                        onTranslate={handleI18nTranslate}
                                        onSave={() => void handleI18nSave()}
                                        onClose={requestCloseI18n}
                                        translateLoading={translateLoading}
                                        saveLoading={i18nSaveSubmitting}
                                        error={i18nError}
                                    />
                                </div>
                            )}
                        </div>

                        {/* description */}
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

                        {/* map_background */}
                        <div>
                            <label className="block text-sm font-medium mb-1">map_background</label>
                            <div
                                className={`relative w-full max-w-[360px] rounded-xl overflow-hidden border border-border bg-muted aspect-[16/9] ${mapBackgroundTreeOpen || !form.mapBackground ? 'cursor-pointer' : ''}`}
                                aria-label="Ảnh map background"
                            >
                                {mapBackgroundTreeOpen ? (
                                    <div className="absolute inset-0 flex flex-col overflow-hidden">
                                        <div className="flex items-center justify-between px-2 py-1 bg-muted border-b border-border text-xs font-medium shrink-0">
                                            <span>Chọn ảnh nền</span>
                                            <button
                                                type="button"
                                                className="px-1.5 py-0.5 rounded hover:bg-muted-foreground/20"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMapBackgroundTreeOpen(false);
                                                }}
                                            >
                                                Đóng
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 text-xs">
                                            {mapBackgroundTreeLoading ? (
                                                <p className="text-muted-foreground">Đang tải...</p>
                                            ) : mapBackgroundTree && mapBackgroundTree.length > 0 ? (
                                                mapBackgroundTree.map((item) => (
                                                    <FileTreeNode
                                                        key={item.path}
                                                        item={item}
                                                        expanded={mapBackgroundTreeExpanded}
                                                        onToggle={(path) => {
                                                            setMapBackgroundTreeExpanded((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(path)) next.delete(path);
                                                                else next.add(path);
                                                                return next;
                                                            });
                                                        }}
                                                        onSelect={(path) => {
                                                            setForm((p) => ({ ...p, mapBackground: path }));
                                                            setMapBackgroundTreeOpen(false);
                                                        }}
                                                    />
                                                ))
                                            ) : (
                                                <p className="text-muted-foreground">Không có ảnh</p>
                                            )}
                                        </div>
                                    </div>
                                ) : form.mapBackground ? (
                                    <>
                                        <div
                                            className="absolute inset-0 cursor-default"
                                            role="button"
                                            tabIndex={0}
                                            title="Ctrl+click: chọn ảnh nền. Double-click: xem toàn màn hình."
                                            onDoubleClick={(e) => {
                                                e.preventDefault();
                                                setMapBackgroundLightbox({
                                                    src: form.mapBackground,
                                                    alt: 'map_background',
                                                });
                                            }}
                                            onClick={(e) => {
                                                if (e.ctrlKey || e.metaKey) {
                                                    e.preventDefault();
                                                    setMapBackgroundTreeOpen(true);
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === ' ')) {
                                                    e.preventDefault();
                                                    setMapBackgroundTreeOpen(true);
                                                }
                                            }}
                                        >
                                            <img
                                                src={form.mapBackground}
                                                alt="map_background"
                                                className="pointer-events-none absolute inset-0 w-full h-full object-cover"
                                                onError={(e) => {
                                                    // Nếu path sai, bỏ render ảnh để khỏi làm vỡ layout.
                                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            <div className="pointer-events-none absolute inset-0 bg-black/30" />
                                            <div className="pointer-events-none absolute left-2 right-10 bottom-2 text-[11px] text-white/90 line-clamp-2">
                                                {form.mapBackground}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-sm text-white shadow-sm transition-colors hover:bg-black/75"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setForm((p) => ({ ...p, mapBackground: '' }));
                                            }}
                                            aria-label="Xóa ảnh nền"
                                        >
                                            ✕
                                        </button>
                                    </>
                                ) : (
                                    <div
                                        className="absolute inset-0 flex items-center justify-center px-2 text-xs text-muted-foreground"
                                        role="button"
                                        tabIndex={0}
                                        title="Click để chọn ảnh nền"
                                        onClick={() => setMapBackgroundTreeOpen(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setMapBackgroundTreeOpen(true);
                                            }
                                        }}
                                    >
                                        Chưa chọn map_background
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Type ratios */}
                        <TypeRatioEditor
                            typeRatios={form.typeRatios}
                            onChange={setTypeRatio}
                        />

                        {/* Status toggle */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Trạng thái</label>
                            <div
                                role="button"
                                tabIndex={0}
                                className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent select-none cursor-pointer ${form.status === 'enabled'
                                        ? 'bg-emerald-500 text-emerald-50 hover:bg-emerald-600'
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

                        {/* Card Deck Builder */}
                        <div>
                            <CardDeckBuilder
                                cardIds={form.deckIds}
                                availableCards={adventureCards}
                                onDeckChange={(newIds) => setForm((p) => ({ ...p, deckIds: newIds }))}
                                filterCard={isAdventureCardShownInDeckSource}
                            />
                            {deckHasDisabledCards && (
                                <p className="text-sm text-destructive mt-2">
                                    Deck còn thẻ đã disabled (viền đỏ). Xóa hết các thẻ đó khỏi deck
                                    trước khi lưu.
                                </p>
                            )}
                        </div>

                        {/* Action buttons */}
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
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAtlasBuilderOpen(true)}
                                    disabled={deckAtlasImages.length === 0}
                                    title={
                                        deckAtlasImages.length === 0
                                            ? 'Thêm ít nhất một thẻ vào deck để tạo atlas'
                                            : undefined
                                    }
                                >
                                    Tạo atlas
                                </Button>
                                <Button type="submit" disabled={submitLoading || !canSaveRatios}>
                                    {submitLoading ? 'Đang xử lý...' : editingMap ? 'Lưu' : 'Thêm'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <ImageLightbox
                open={mapBackgroundLightbox}
                onClose={() => setMapBackgroundLightbox(null)}
                className="z-[10000]"
            />

            <UnsavedChangesDialog
                open={showUnsavedConfirm}
                onStay={() => setShowUnsavedConfirm(false)}
                onDiscard={confirmDiscard}
                onSave={confirmSaveFromDialog}
                saveLoading={submitLoading}
                saveDisabled={!canSaveRatios}
                title="Lưu thay đổi?"
                description="Bạn đã chỉnh sửa map. Bạn có muốn lưu trước khi đóng không?"
            />

            <UnsavedChangesDialog
                open={showI18nUnsavedConfirm}
                onStay={() => setShowI18nUnsavedConfirm(false)}
                onDiscard={confirmI18nDiscard}
                onSave={confirmI18nSaveFromDialog}
                saveLoading={i18nSaveSubmitting}
                overlayClassName="z-[10001]"
                title="Lưu bản dịch?"
                description="Bạn đã chỉnh sửa i18n tên map chưa lưu. Bạn có muốn lưu trước khi đóng không?"
            />

            {showDisabledDeckBlockDialog ? (
                <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowDisabledDeckBlockDialog(false)}
                        aria-hidden
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="disabled-deck-dialog-title"
                        className="relative z-10 w-full max-w-md rounded-lg bg-card border border-border shadow-xl overflow-hidden"
                    >
                        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-muted/30 shrink-0">
                            <h3 id="disabled-deck-dialog-title" className="text-lg font-semibold pr-2">
                                Không thể lưu
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowDisabledDeckBlockDialog(false)}
                                className="shrink-0 p-1.5 rounded-md hover:bg-muted text-xl leading-none"
                                aria-label="Đóng"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Map vẫn còn thẻ adventure đã bị disabled trong deck. Hãy bấm nút −
                                trên từng thẻ có viền đỏ để gỡ hết khỏi deck, sau đó lưu lại.
                            </p>
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    onClick={() => setShowDisabledDeckBlockDialog(false)}
                                >
                                    Đã hiểu
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {atlasBuilderOpen ? (
                <AtlasBuilderModal
                    images={deckAtlasImages}
                    initialAtlasName={deckAtlasInitialName}
                    initialSelectedPaths={deckAtlasImages.map((i) => i.path)}
                    onClose={() => setAtlasBuilderOpen(false)}
                    onCreated={() => setAtlasBuilderOpen(false)}
                />
            ) : null}
        </div>,
        document.body
    );
}
