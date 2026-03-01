import { useEffect, useState } from 'react';
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
import { I18nEditorPanel, type EditLang } from '../i18n/I18nEditorPanel';
import { TypeRatioEditor } from './TypeRatioEditor';
import { CardDeckBuilder } from './CardDeckBuilder';
import { DEFAULT_TYPE_RATIOS, MAP_STATUSES, getFormTypeRatios, getFreeRatio } from './mapUtils';

const LANG_OPTIONS: EditLang[] = ['en', 'vi', 'ja'];

interface MapFormModalProps {
    open: boolean;
    editingMap: MapType | null;
    adventureCards: AdventureCard[];
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
    onClose,
    onSaved,
}: MapFormModalProps) {
    // ── Form state ──
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

    // ── Sync form when editingMap changes ──
    useEffect(() => {
        if (editingMap) {
            setForm({
                nameId: editingMap.nameId,
                name: editingMap.name,
                description: editingMap.description ?? '',
                typeRatios: getFormTypeRatios(editingMap.typeRatios),
                status: editingMap.status,
                deckIds: (editingMap.deck ?? []).map((c: AdventureCard) => c._id),
            });
        } else {
            setForm({
                nameId: '',
                name: '',
                description: '',
                typeRatios: { ...DEFAULT_TYPE_RATIOS },
                status: 'enabled',
                deckIds: [],
            });
        }
    }, [editingMap]);

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

    // ── Type ratio handler ──
    const setTypeRatio = (key: keyof MapTypeRatios, value: number) => {
        setForm((prev) => ({
            ...prev,
            typeRatios: { ...prev.typeRatios, [key]: value },
        }));
    };

    const freeRatio = getFreeRatio(form.typeRatios);
    const canSaveRatios = freeRatio === 0;

    // ── Submit / Delete ──
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
            handleClose();
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
            handleClose();
            onSaved();
        } catch (err) {
            console.error('Failed to delete map:', err);
            setError('Xóa map thất bại');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleClose = () => {
        setI18nField(null);
        setI18nError(null);
        setNameTranslations(null);
        setError(null);
        onClose();
    };

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen w-full">
            <div
                className="absolute inset-0 min-h-full w-full bg-black/50"
                onClick={handleClose}
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
                        onClick={handleClose}
                        className="p-1 hover:bg-primary-500 rounded transition-colors text-xl leading-none"
                        aria-label="Đóng"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 p-6 flex-1 overflow-y-auto min-w-0">
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

                        {/* Card Deck Builder */}
                        <CardDeckBuilder
                            cardIds={form.deckIds}
                            availableCards={adventureCards}
                            onDeckChange={(newIds) => setForm((p) => ({ ...p, deckIds: newIds }))}
                        />

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
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    Hủy
                                </Button>
                                <Button type="submit" disabled={submitLoading || !canSaveRatios}>
                                    {submitLoading ? 'Đang xử lý...' : editingMap ? 'Lưu' : 'Thêm'}
                                </Button>
                            </div>
                        </div>
                    </form>

                    {/* i18n side panel */}
                    {i18nField === 'name' && (
                        <I18nEditorPanel
                            title="Sửa Tên hiển thị (i18n)"
                            fieldType="name"
                            editLang={editLang}
                            getValue={getFormI18n}
                            onChange={setFormI18n}
                            onTranslate={handleI18nTranslate}
                            onSave={handleI18nSave}
                            onClose={() => {
                                setI18nField(null);
                                setI18nError(null);
                            }}
                            translateLoading={translateLoading}
                            error={i18nError}
                        />
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
