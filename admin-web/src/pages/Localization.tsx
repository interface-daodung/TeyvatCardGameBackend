import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  localizationService,
  Localization,
  LocalizationSortField,
  LocalizationSortOrder,
} from '../services/localizationService';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { LocalizationFilters } from '../components/localization/LocalizationFilters';
import { LocalizationTable } from '../components/localization/LocalizationTable';
import { LocalizationFormModal } from '../components/localization/LocalizationFormModal';
import { fadeSlideCard } from '../components/animations/motionPresets';

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
  const [searchInput, setSearchInput] = useState('');
  const [searchKey, setSearchKey] = useState('');
  const [sortBy, setSortBy] = useState<LocalizationSortField>('key');
  const [sortOrder, setSortOrder] = useState<LocalizationSortOrder>('asc');
  const [emptyOnly, setEmptyOnly] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        setSearchInput(decodeURIComponent(hash));
      } catch {
        setSearchInput(hash);
      }
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchKey(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSuggestTranslation = async () => {
    const sourceText = formEn.trim();
    if (!sourceText) {
      setError('Please enter English first (default input for translation)');
      return;
    }
    setError(null);
    setTranslateLoading(true);
    try {
      const promises: Promise<void>[] = [];
      if (!formVi.trim()) {
        promises.push(localizationService.translate(sourceText, 'en', 'vi').then(setFormVi));
      }
      if (!formJa.trim()) {
        promises.push(localizationService.translate(sourceText, 'en', 'ja').then(setFormJa));
      }
      await Promise.all(promises);
    } catch {
      setError('Translation service connection error, please try again');
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await localizationService.getLocalizations(page, limit, {
        search: searchKey.trim() || undefined,
        sort: sortBy,
        order: sortOrder,
        emptyOnly: emptyOnly || undefined,
      });
      setLocalizations(data.localizations);
      setTotalPages(data.pagination.pages);
      setTotal(data.pagination.total);
      setLimit(data.pagination.limit);
    } catch (err) {
      console.error('Failed to fetch localizations:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchKey, sortBy, sortOrder, emptyOnly]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, sortOrder, emptyOnly]);

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
          setError('Key cannot be empty');
          setSubmitLoading(false);
          return;
        }
        await localizationService.createLocalization(formKey.trim(), translations);
      }
      closeModal();
      await loadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'An error occurred';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (loc: Localization) => {
    if (!window.confirm(`Are you sure you want to delete "${loc.key}"?`)) return;
    try {
      await localizationService.deleteLocalization(loc.key);
      await loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Delete failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Localization" description="Manage multi-language translations" />
        <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700">
          + Add new
        </Button>
      </div>

      <motion.div variants={fadeSlideCard} initial="hidden" animate="visible">
        <LocalizationFilters
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          emptyOnly={emptyOnly}
          onEmptyOnlyChange={setEmptyOnly}
        />
      </motion.div>

      <motion.div variants={fadeSlideCard} initial="hidden" animate="visible">
        <Card className="border-0 shadow-lg overflow-hidden">
          {loading ? (
            <CardContent className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          ) : (
            <LocalizationTable
              items={localizations}
              expandedKeys={expandedKeys}
              onToggleExpand={toggleExpand}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          )}
        </Card>
      </motion.div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        itemLabel="localizations"
      />

      <LocalizationFormModal
        open={modalOpen}
        isEditing={!!editingItem}
        formKey={formKey}
        formEn={formEn}
        formVi={formVi}
        formJa={formJa}
        onKeyChange={setFormKey}
        onEnChange={setFormEn}
        onViChange={setFormVi}
        onJaChange={setFormJa}
        onSuggestTranslation={handleSuggestTranslation}
        onSubmit={handleSubmit}
        onClose={closeModal}
        submitLoading={submitLoading}
        translateLoading={translateLoading}
        error={error}
      />
    </div>
  );
}
