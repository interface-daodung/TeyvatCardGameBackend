import { useEffect, useState, useMemo } from 'react';
import { gameDataService, AdventureCard } from '../services/gameDataService';
import { localizationService } from '../services/localizationService';
import { filesService, FileTreeItem } from '../services/filesService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';

const CARD_TYPES = ['all', 'weapon', 'enemy', 'food', 'trap', 'treasure', 'bomb', 'coin', 'empty'] as const;
const SORT_OPTIONS = ['type', 'rarity', 'name'] as const;
const TYPE_ORDER: Record<string, number> = {
  weapon: 1,
  enemy: 2,
  food: 3,
  trap: 4,
  treasure: 5,
  bomb: 6,
  coin: 7,
  empty: 8,
};

const STATUSES: AdventureCard['status'][] = ['enabled', 'disabled', 'hidden'];

type EditLang = 'en' | 'vi' | 'ja';
const LANG_OPTIONS: EditLang[] = ['en', 'vi', 'ja'];

function TreeNode({
  item,
  expanded,
  onToggle,
  onSelect,
  depth = 0,
}: {
  item: FileTreeItem;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  if (item.type === 'file') {
    return (
      <button
        type="button"
        onClick={() => onSelect(item.path)}
        className="w-full text-left px-2 py-1 rounded hover:bg-primary/20 flex items-center gap-1 truncate"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <span className="text-blue-600 truncate">📄 {item.name}</span>
      </button>
    );
  }
  const isExpanded = expanded.has(item.path);
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(item.path)}
        className="w-full text-left px-2 py-1 rounded hover:bg-muted flex items-center gap-1"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <span className="shrink-0">{isExpanded ? '▼' : '▶'}</span>
        <span className="font-medium">📁 {item.name}</span>
      </button>
      {isExpanded && item.children && (
        <div className="pl-0">
          {item.children.map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdventureCards() {
  const [cards, setCards] = useState<AdventureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'type' | 'rarity' | 'name'>('type');
  const [editCard, setEditCard] = useState<AdventureCard | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Partial<AdventureCard>>({});
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
    const fetchCards = async () => {
      try {
        setLoading(true);
        const type = typeFilter === 'all' ? undefined : typeFilter;
        const data = await gameDataService.getAdventureCards(undefined, type);
        setCards(data);
      } catch (error) {
        console.error('Failed to fetch adventure cards:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [typeFilter]);

  const sortedCards = useMemo(() => {
    const arr = [...cards];
    if (sortBy === 'type') {
      arr.sort((a, b) => (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99) || a.name.localeCompare(b.name));
    } else if (sortBy === 'rarity') {
      arr.sort((a, b) => (b.rarity ?? 0) - (a.rarity ?? 0) || a.name.localeCompare(b.name));
    } else {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return arr;
  }, [cards, sortBy]);

  // Load localization for current editing card (for read-only display fields)
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
      setFormI18nEn(t.en ?? (field === 'name' ? form.name ?? editCard.name : form.description ?? editCard.description ?? ''));
      setFormI18nVi(t.vi ?? '');
      setFormI18nJa(t.ja ?? '');
    } catch {
      // nếu chưa có key thì dùng giá trị hiện tại làm EN
      if (field === 'name') {
        setFormI18nEn(form.name ?? editCard.name ?? '');
      } else {
        setFormI18nEn(form.description ?? editCard.description ?? '');
      }
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
      if (!formI18nVi.trim()) {
        promises.push(
          localizationService.translate(sourceText, editLang, 'vi').then(setFormI18nVi)
        );
      }
      if (!formI18nJa.trim()) {
        promises.push(
          localizationService.translate(sourceText, editLang, 'ja').then(setFormI18nJa)
        );
      }
      await Promise.all(promises);
    } catch {
      setI18nError('Lỗi gọi dịch máy, hãy thử lại');
    } finally {
      setTranslateLoading(false);
    }
  };

  const handleI18nSave = async () => {
    if (!editCard || !i18nField) return;
    const translations = {
      en: formI18nEn.trim(),
      vi: formI18nVi.trim(),
      ja: formI18nJa.trim(),
    };
    const keyBase = `adventureCard.${editCard.nameId}.${i18nField === 'name' ? 'name' : 'description'}`;
    try {
      await localizationService.updateLocalization(keyBase, translations);
    } catch {
      // nếu update fail (chưa tồn tại) thì thử create
      try {
        await localizationService.createLocalization(keyBase, translations);
      } catch {
        setI18nError('Không lưu được bản dịch, hãy thử lại');
        return;
      }
    }

    if (i18nField === 'name') {
      setForm((p) => ({
        ...p,
        name: translations.en || p.name || editCard.name,
      }));
      setNameTranslations(translations);
    } else {
      setForm((p) => ({
        ...p,
        description: translations.en || p.description || editCard.description,
      }));
      setDescriptionTranslations(translations);
    }

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
    setForm((p) => ({ ...p, image: path }));
    setImageTreeOpen(false);
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      weapon: '⚔️',
      enemy: '👹',
      food: '🍎',
      trap: '🕳️',
      treasure: '💎',
      bomb: '💣',
      coin: '🪙',
      empty: '⬜',
    };
    return icons[type] || '🎴';
  };

  const getCardImageUrl = (card: AdventureCard) => {
    if (card.image) {
      return card.image;
    }

    const basePath = '/assets/images/cards';

    if (card.type === 'empty') {
      return `${basePath}/empty.webp`;
    }

    return `${basePath}/${card.type}/${card.nameId}.webp`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-red-600 bg-clip-text text-transparent mb-2">
            Adventure Cards
          </h1>
          <p className="text-muted-foreground">Manage adventure cards for maps</p>
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLangDropdownOpen((o) => !o)}
            onBlur={() => setTimeout(() => setLangDropdownOpen(false), 150)}
            className="min-w-[4rem]"
          >
            {editLang}
            <span className="ml-1">{langDropdownOpen ? '▲' : '▼'}</span>
          </Button>
          {langDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-md shadow-lg py-1 min-w-[4rem]">
              {LANG_OPTIONS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setEditLang(lang);
                    setLangDropdownOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-muted ${editLang === lang ? 'bg-muted font-medium' : ''}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="type-filter" className="text-sm font-medium text-muted-foreground">
            Type:
          </label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-input rounded-md bg-background"
          >
            {CARD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All' : t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-by" className="text-sm font-medium text-muted-foreground">
            Sort by:
          </label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 text-sm border border-input rounded-md bg-background"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'type' ? 'Type' : s === 'rarity' ? 'Rarity (high → low)' : 'Name (A-Z)'}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          {sortedCards.length} card{sortedCards.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sortedCards.map((card) => (
          <Card
            key={card._id}
            role="button"
            tabIndex={0}
            onClick={() => {
              setEditCard(card);
              setForm(card);
              setEditOpen(true);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setEditCard(card);
                setForm(card);
                setEditOpen(true);
                setError(null);
                setImageTreeOpen(false);
              }
            }}
            className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800"
          >
            <CardContent className="relative p-0">
              <div className="relative w-full aspect-[420/720] overflow-hidden">
                <img
                  src={getCardImageUrl(card)}
                  alt={card.name}
                  className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
                  }}
                />
                {card.className && (
                  <Badge
                    variant="outline"
                    className="absolute top-3 left-3 text-[10px] font-mono bg-black/40 text-slate-100 border-white/20 backdrop-blur-sm"
                  >
                    {card.className}
                  </Badge>
                )}

                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                  {card.rarity != null && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-semibold text-white shadow-md">
                      <span>⭐</span>
                      <span>{card.rarity}</span>
                    </div>
                  )}
                  <Badge
                    variant={
                      card.status === 'enabled'
                        ? 'default'
                        : card.status === 'disabled'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className={
                      card.status === 'enabled'
                        ? 'bg-emerald-500/90 text-white border-emerald-300/60'
                        : card.status === 'hidden'
                        ? 'bg-slate-700/90 text-slate-50 border-slate-500/60'
                        : 'bg-red-500/90 text-white border-red-300/60'
                    }
                  >
                    {card.status}
                  </Badge>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-4 pt-6">
                  <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 space-y-2 shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
                    <CardHeader className="p-0">
                      <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="text-2xl drop-shadow">{getTypeIcon(card.type)}</span>
                        <span className="truncate">{card.name}</span>
                      </CardTitle>
                      {card.description && (
                        <CardDescription className="mt-1 text-xs text-slate-200/80 line-clamp-2">
                          {card.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-100">
                      <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 font-mono uppercase tracking-wide">
                        ID: {card.nameId}
                      </span>
                      <Badge className="bg-indigo-500/80 text-white border-indigo-300/60">
                        {card.type}
                      </Badge>
                      {card.category && (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                          {card.category}
                        </span>
                      )}
                      {card.element && (
                        <Badge className="bg-sky-500/80 text-white border-sky-300/60">
                          {card.element}
                        </Badge>
                      )}
                      {card.clan && (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                          {card.clan}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit modal Adventure Card + popup i18n bên phải */}
      {editOpen && editCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setEditOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 flex items-stretch gap-4">
            <div className="w-full max-w-3xl rounded-xl bg-card shadow-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-primary-600 to-red-600 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Edit Adventure Card</h2>
                  <p className="text-sm text-primary-100 mt-1">
                    {editCard.name} ({editCard.nameId})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex h-10 w-10 items-center justify-center text-white text-3xl leading-none hover:bg-white/10 rounded-full border border-white/30"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {error && (
                  <div className="mb-4 rounded bg-destructive/10 text-destructive text-sm px-3 py-2">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-[1.1fr,1.2fr] gap-6 items-start">
                  <div className="space-y-3">
                    <div
                      className="w-full max-w-[200px] mx-auto aspect-[420/720] rounded-xl overflow-hidden bg-muted relative border border-border cursor-pointer"
                      onClick={() => !imageTreeOpen && openImageTree()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !imageTreeOpen) {
                          e.preventDefault();
                          openImageTree();
                        }
                      }}
                    >
                      {imageTreeOpen ? (
                        <div className="absolute inset-0 flex flex-col overflow-hidden">
                          <div className="flex items-center justify-between px-2 py-1 bg-muted border-b border-border text-xs font-medium shrink-0">
                            <span>Chọn ảnh</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageTreeOpen(false);
                              }}
                              className="px-1.5 py-0.5 rounded hover:bg-muted-foreground/20"
                            >
                              Đóng
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 text-xs">
                            {imageTreeLoading ? (
                              <p className="text-muted-foreground">Đang tải...</p>
                            ) : imageTree && imageTree.length > 0 ? (
                              imageTree.map((item) => (
                                <TreeNode
                                  key={item.path}
                                  item={item}
                                  expanded={imageTreeExpanded}
                                  onToggle={toggleTreeExpanded}
                                  onSelect={selectImage}
                                />
                              ))
                            ) : (
                              <p className="text-muted-foreground">Không có ảnh</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <img
                          src={getCardImageUrl({ ...editCard, ...form } as AdventureCard)}
                          alt={editCard.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">ID: {editCard.nameId}</span>
                        {editCard.rarity != null && (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                            ⭐ {editCard.rarity}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{editCard.type}</Badge>
                        {editCard.category && <Badge variant="outline">{editCard.category}</Badge>}
                        {editCard.element && <Badge variant="outline">{editCard.element}</Badge>}
                        {editCard.clan && <Badge variant="outline">{editCard.clan}</Badge>}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block text-xs font-medium text-muted-foreground">
                          Name
                        </label>
                        <button
                          type="button"
                          onClick={() => openI18nEditor('name')}
                          className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                        >
                          Edit i18n
                        </button>
                      </div>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                        readOnly
                        value={
                          (nameTranslations ?? undefined)?.[editLang] ??
                          form.name ??
                          editCard.name
                        }
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block text-xs font-medium text-muted-foreground">
                          Description
                        </label>
                        <button
                          type="button"
                          onClick={() => openI18nEditor('description')}
                          className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                        >
                          Edit i18n
                        </button>
                      </div>
                      <textarea
                        className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background min-h-[80px]"
                        readOnly
                        value={
                          (descriptionTranslations ?? undefined)?.[editLang] ??
                          form.description ??
                          editCard.description
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Rarity
                        </label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const currentRarity = form.rarity ?? editCard.rarity ?? 0;
                            const isActive = star <= currentRarity;
                            return (
                              <button
                                key={star}
                                type="button"
                                className={`h-7 w-7 flex items-center justify-center transition-colors ${
                                  isActive
                                    ? 'text-amber-400'
                                    : 'text-muted-foreground hover:text-amber-200'
                                }`}
                                onClick={() =>
                                  setForm((p) => ({
                                    ...p,
                                    rarity: star,
                                  }))
                                }
                                aria-label={`Set rarity to ${star}`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  className="h-5 w-5"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.947a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.365 2.444a1 1 0 00-.364 1.118l1.287 3.947c.3.921-.755 1.688-1.54 1.118l-3.365-2.444a1 1 0 00-1.175 0l-3.365 2.444c-.783.57-1.84-.197-1.54-1.118l1.287-3.947a1 1 0 00-.364-1.118L2.07 9.374c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.947z" />
                                </svg>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Status
                        </label>
                        {(() => {
                          const current = (form.status ?? editCard.status) as AdventureCard['status'];
                          const statusClasses =
                            current === 'enabled'
                              ? 'bg-emerald-500 text-emerald-50 hover:bg-emerald-600'
                              : current === 'hidden'
                              ? 'bg-slate-600 text-slate-50 hover:bg-slate-700'
                              : 'bg-red-500 text-red-50 hover:bg-red-600';
                          return (
                            <div
                              role="button"
                              tabIndex={0}
                              className={`inline-flex items-center rounded-full border px-3.5 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent select-none ${statusClasses}`}
                              onClick={() => {
                                const current = (form.status ?? editCard.status) as AdventureCard['status'];
                                const index = STATUSES.indexOf(current);
                                const next = STATUSES[(index + 1) % STATUSES.length];
                                setForm((p) => ({ ...p, status: next }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  const current = (form.status ?? editCard.status) as AdventureCard['status'];
                                  const index = STATUSES.indexOf(current);
                                  const next = STATUSES[(index + 1) % STATUSES.length];
                                  setForm((p) => ({ ...p, status: next }));
                                }
                              }}
                            >
                              {form.status ?? editCard.status}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setEditOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  disabled={saveLoading}
                  onClick={async () => {
                    if (!editCard) return;
                    setSaveLoading(true);
                    setError(null);
                    try {
                      const payload: Partial<AdventureCard> = {
                        name: form.name ?? editCard.name,
                        description: form.description ?? editCard.description,
                        rarity: form.rarity ?? editCard.rarity,
                        status: form.status ?? editCard.status,
                        image: form.image ?? editCard.image,
                      };
                      const updated = await gameDataService.updateAdventureCard(editCard._id, payload);
                      setCards((prev) =>
                        prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c))
                      );
                      setEditCard(updated);
                      setEditOpen(false);
                    } catch (e: any) {
                      console.error(e);
                      setError(e?.message ?? 'Failed to save card');
                    } finally {
                      setSaveLoading(false);
                    }
                  }}
                >
                  {saveLoading ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </div>

            {i18nField && (
              <div className="w-full max-w-md rounded-lg bg-card overflow-hidden shadow-xl border border-border flex-shrink-0 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
                  <h3 className="text-lg font-semibold">
                    {i18nField === 'name' && 'Sửa Name (i18n)'}
                    {i18nField === 'description' && 'Sửa Description (i18n)'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setI18nField(null);
                      setI18nError(null);
                    }}
                    className="p-1 hover:bg-blue-500 rounded transition-colors text-xl leading-none"
                    aria-label="Đóng"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6 flex-1 overflow-auto">
                  <div className="space-y-4">
                    {(LANG_OPTIONS as EditLang[]).map((lang) => (
                      <div key={lang}>
                        <label className="block text-sm font-medium mb-1">
                          {lang.toUpperCase()}
                          {lang === editLang && (
                            <span className="ml-1 text-xs text-blue-200 font-normal">(base)</span>
                          )}
                        </label>
                        {i18nField === 'description' ? (
                          <textarea
                            value={getFormI18n(lang)}
                            onChange={(e) => setFormI18n(lang, e.target.value)}
                            className={`w-full rounded border px-3 py-2 text-sm min-h-[80px] resize-y ${
                              lang === editLang ? 'border-blue-200 bg-blue-50/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-200' : 'border-slate-200'
                            }`}
                            placeholder={lang.toUpperCase()}
                          />
                        ) : (
                          <input
                            type="text"
                            value={getFormI18n(lang)}
                            onChange={(e) => setFormI18n(lang, e.target.value)}
                            className={`w-full rounded border px-3 py-2 text-sm ${
                              lang === editLang ? 'border-blue-200 bg-blue-50/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-200' : 'border-slate-200'
                            }`}
                            placeholder={lang.toUpperCase()}
                          />
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleI18nTranslate}
                      disabled={translateLoading || !getFormI18n(editLang).trim()}
                      className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 text-sm"
                    >
                      {translateLoading ? 'Đang dịch...' : 'Gợi ý dịch máy'}
                    </Button>
                    {i18nError && (
                      <p className="text-sm text-red-200">{i18nError}</p>
                    )}
                  </div>
                </div>
                <div className="p-4 border-t border-border">
                  <Button
                    onClick={handleI18nSave}
                    disabled={translateLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Lưu i18n
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
