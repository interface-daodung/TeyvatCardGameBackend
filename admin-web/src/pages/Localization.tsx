import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { localizationService, Localization } from '../services/localizationService';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

const fetchLocalizations = async (page: number) => {
  const data = await localizationService.getLocalizations(page, 6);
  return data;
};

export default function LocalizationPage() {
  const [localizations, setLocalizations] = useState<Localization[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(6);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Localization | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formEn, setFormEn] = useState('');
  const [formVi, setFormVi] = useState('');
  const [formJa, setFormJa] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const handleSuggestTranslation = async () => {
    const sourceText = formEn.trim();
    if (!sourceText) {
      setError('Vui lòng nhập English trước (đầu vào mặc định để dịch)');
      return;
    }
    setError(null);
    setTranslateLoading(true);
    try {
      const promises: Promise<void>[] = [];
      if (!formVi.trim()) {
        promises.push(
          localizationService.translate(sourceText, 'en', 'vi').then(setFormVi)
        );
      }
      if (!formJa.trim()) {
        promises.push(
          localizationService.translate(sourceText, 'en', 'ja').then(setFormJa)
        );
      }
      await Promise.all(promises);
    } catch {
      setError('Lỗi kết nối dịch máy, vui lòng thử lại');
    } finally {
      setTranslateLoading(false);
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getPrimaryValue = (values: Record<string, string> | undefined) => {
    if (!values) return '-';
    return values.en ?? values.vi ?? Object.values(values)[0] ?? '-';
  };

  const getLangEntries = (values: Record<string, string> | undefined) => {
    if (!values || Object.keys(values).length === 0) return [];
    const order = ['en', 'vi', 'ja', 'zh', 'ko', 'fr', 'de', 'es'];
    const entries = Object.entries(values).filter(([, v]) => v != null && v !== '');
    return entries.sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b);
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchLocalizations(page);
      setLocalizations(data.localizations);
      setTotalPages(data.pagination.pages);
      setTotal(data.pagination.total);
      setLimit(data.pagination.limit);
    } catch (err) {
      console.error('Failed to fetch localizations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(1);
  }, [totalPages, page]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormKey('');
    setFormEn('');
    setFormVi('');
    setFormJa('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (loc: Localization) => {
    setEditingItem(loc);
    setFormKey(loc.key);
    setFormEn(loc.translations?.en ?? '');
    setFormVi(loc.translations?.vi ?? '');
    setFormJa(loc.translations?.ja ?? '');
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitLoading(true);
    try {
      const translations = { en: formEn.trim(), vi: formVi.trim(), ja: formJa.trim() };
      if (editingItem) {
        await localizationService.updateLocalization(formKey, translations);
      } else {
        if (!formKey.trim()) {
          setError('Key không được để trống');
          setSubmitLoading(false);
          return;
        }
        await localizationService.createLocalization(formKey.trim(), translations);
      }
      closeModal();
      await loadData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Có lỗi xảy ra';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (loc: Localization) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${loc.key}"?`)) return;
    try {
      await localizationService.deleteLocalization(loc.key);
      await loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Xóa thất bại');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Localization
          </h1>
          <p className="text-muted-foreground">Manage multi-language translations</p>
        </div>
        <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700">
          + Thêm mới
        </Button>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Key | Preview
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-blue-700 uppercase tracking-wider w-32">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {localizations.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center text-muted-foreground">
                      No localizations found
                    </td>
                  </tr>
                ) : (
                  localizations.map((loc) => {
                    const expanded = expandedKeys.has(loc.key);
                    const entries = getLangEntries(loc.translations);
                    const primaryValue = getPrimaryValue(loc.translations);
                    return (
                      <tr key={loc._id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-3">
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={() => toggleExpand(loc.key)}
                                className="mt-0.5 text-slate-500 hover:text-slate-700 shrink-0"
                                aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}
                              >
                                {expanded ? '▼' : '▶'}
                              </button>
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground">{loc.key}</span>
                                <span className="text-slate-400 mx-2">|</span>
                                <span className="text-muted-foreground">
                                  {primaryValue || <span className="text-destructive">-</span>}
                                </span>
                                {expanded && entries.length > 0 && (
                                  <div className="mt-2 ml-6 text-sm text-muted-foreground font-mono space-y-0.5">
                                    {entries.map(([lang, val], i) => (
                                      <div key={lang}>
                                        {i === entries.length - 1 ? '└' : '├'} {lang}: {val}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right align-top">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(loc)}
                                className="border-slate-200"
                              >
                                Sửa
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(loc)}
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                Xóa
                              </Button>
                            </div>
                          </td>
                        </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} localizations
          </p>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              variant="outline"
              className="border-slate-200"
            >
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              variant="outline"
              className="border-slate-200"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 min-h-screen w-full z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 top-0 left-0 right-0 bottom-0 min-h-full w-full bg-black/50" onClick={closeModal} aria-hidden />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-card overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Sửa localization' : 'Thêm localization'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 hover:bg-blue-500 rounded transition-colors text-xl leading-none"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label htmlFor="localization-form-key" className="block text-sm font-medium mb-1 cursor-pointer">Key</label>
                <input
                  id="localization-form-key"
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  disabled={!!editingItem}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="e.g. menu.play"
                />
              </div>
              <div>
                <label htmlFor="localization-form-en" className="block text-sm font-medium mb-1 cursor-pointer">🇬🇧 English</label>
                <input
                  id="localization-form-en"
                  type="text"
                  value={formEn}
                  onChange={(e) => setFormEn(e.target.value)}
                  className="w-full rounded border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
                  placeholder="English translation"
                />
              </div>
              <div>
                <label htmlFor="localization-form-vi" className="block text-sm font-medium mb-1 cursor-pointer">🇻🇳 Vietnamese</label>
                <input
                  id="localization-form-vi"
                  type="text"
                  value={formVi}
                  onChange={(e) => setFormVi(e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Vietnamese translation"
                />
              </div>
              <div>
                <label htmlFor="localization-form-ja" className="block text-sm font-medium mb-1 cursor-pointer">🇯🇵 Japanese</label>
                <input
                  id="localization-form-ja"
                  type="text"
                  value={formJa}
                  onChange={(e) => setFormJa(e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Japanese translation"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleSuggestTranslation}
                disabled={translateLoading || !formEn.trim()}
                className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 text-sm"
              >
                {translateLoading ? 'Đang dịch...' : 'Gợi ý dịch máy'}
              </Button>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={submitLoading}>
                  {submitLoading ? 'Đang xử lý...' : editingItem ? 'Lưu' : 'Thêm'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
