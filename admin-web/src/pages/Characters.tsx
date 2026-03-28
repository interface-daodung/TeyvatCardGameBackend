import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gameDataService, type Character } from '../services/gameDataService';

type CharacterElement = NonNullable<Character['element']>;
import { localizationService } from '../services/localizationService';
import { PageHeader } from '../components/PageHeader';
import { LangDropdown } from '../components/LangDropdown';
import type { EditLang } from '../components/LangDropdown';
import { CharacterCard } from '../components/characters/CharacterCard';
import {
  fadeSlideCard,
  slideUpItem,
  scaleInModal,
  fadeInOverlay,
} from '../components/animations/motionPresets';
import { Button } from '../components/ui/button';
import { ClassNamePickerPanel } from '../components/adventureCards/ClassNamePickerPanel';
import { ELEMENT_OPTIONS } from '../components/characters/characterDetailUtils';

export default function Characters() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<EditLang>('en');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [descriptionByNameId, setDescriptionByNameId] = useState<Record<string, string>>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [createNameId, setCreateNameId] = useState('');
  const [createHp, setCreateHp] = useState('10');
  const [createElement, setCreateElement] = useState<CharacterElement>('cryo');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    gameDataService
      .getCharacters()
      .then(setCharacters)
      .catch((err) => setError(err?.message ?? 'Failed to load characters'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (characters.length === 0) {
      setDescriptionByNameId({});
      return;
    }
    const keyFor = (c: Character) => c.description?.startsWith('character.') ? c.description : `character.${c.nameId}.description`;
    Promise.all(
      characters.map((c) =>
        localizationService
          .getLocalizationByKey(keyFor(c))
          .then((loc) => ({ nameId: c.nameId, t: loc.translations ?? {} }))
          .catch(() => ({ nameId: c.nameId, t: {} as Record<string, string> }))
      )
    ).then((results) => {
      const next: Record<string, string> = {};
      results.forEach(({ nameId, t }) => {
        next[nameId] = t[editLang] ?? t.en ?? '';
      });
      setDescriptionByNameId(next);
    });
  }, [characters, editLang]);

  const handlePickCharacterClass = (className: string) => {
    setCreateError(null);
    setSelectedClassName(className);
    setCreateNameId(className.toLowerCase());
  };

  const handleCreateCharacterSubmit = async () => {
    const className = selectedClassName.trim();
    if (!className) {
      setCreateError('Hãy chọn class từ thư mục character.');
      return;
    }
    const nameId = createNameId.trim().toLowerCase();
    if (!nameId) {
      setCreateError('Nhập nameId (ID duy nhất trong game, thường trùng chữ thường của tên class).');
      return;
    }
    const hp = Math.floor(Number(createHp));
    if (!Number.isFinite(hp) || hp < 1) {
      setCreateError('HP phải là số ≥ 1.');
      return;
    }
    if (characters.some((c) => c.nameId === nameId)) {
      setCreateError(`Nhân vật với nameId "${nameId}" đã tồn tại.`);
      return;
    }
    setCreateError(null);
    setCreateLoading(true);
    try {
      const created = await gameDataService.createCharacter({
        nameId,
        name: className,
        HP: hp,
        element: createElement,
        description: `character.${nameId}.description`,
      });
      setCharacters((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      setClassPickerOpen(false);
      setSelectedClassName('');
      setCreateNameId('');
      setCreateHp('10');
      setCreateElement('cryo');
      navigate(`/characters/${created.nameId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không tạo được nhân vật.';
      setCreateError(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const closeCreateModal = () => {
    if (createLoading) return;
    setCreateModalOpen(false);
    setClassPickerOpen(false);
    setSelectedClassName('');
    setCreateNameId('');
    setCreateHp('10');
    setCreateElement('cryo');
    setCreateError(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading characters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Characters" description="Manage game characters and their stats" />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              setCreateError(null);
              setSelectedClassName('');
              setCreateNameId('');
              setCreateHp('10');
              setCreateElement('cryo');
              setClassPickerOpen(false);
              setCreateModalOpen(true);
            }}
          >
            Tạo thẻ mới
          </Button>
          <LangDropdown
            value={editLang}
            onChange={setEditLang}
            open={langDropdownOpen}
            onOpenChange={setLangDropdownOpen}
          />
        </div>
      </div>

      <motion.div
        className="flex flex-wrap gap-4"
        variants={fadeSlideCard}
        initial="hidden"
        animate="visible"
      >
        {characters.map((character, index) => (
          <motion.div key={character._id} variants={slideUpItem} initial="hidden" animate="visible" custom={index}>
            <CharacterCard
              character={character}
              descriptionDisplay={descriptionByNameId[character.nameId]}
            />
          </motion.div>
        ))}
      </motion.div>

      {createModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-x-auto overflow-y-auto">
            <motion.div
              className="fixed inset-0 bg-black/50"
              aria-hidden
              variants={fadeInOverlay}
              initial="hidden"
              animate="visible"
              onClick={closeCreateModal}
            />
            <div className="relative z-10 flex min-h-full w-full min-w-0 items-center justify-center p-4 sm:p-6">
              <motion.div
                className="flex w-max max-w-none max-h-[min(90vh,900px)] flex-shrink-0 flex-col items-stretch gap-4 md:flex-row md:items-stretch"
                variants={scaleInModal}
                initial="hidden"
                animate="visible"
              >
              <div className="flex w-full min-w-0 max-w-lg flex-shrink-0 flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Tạo nhân vật mới</h2>
                    <p className="mt-1 text-sm text-primary-100">
                      Chọn class từ <span className="font-mono">…/cards/character</span>, rồi bấm Tạo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    disabled={createLoading}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 text-3xl leading-none text-white hover:bg-white/10"
                    aria-label="Đóng"
                  >
                    ×
                  </button>
                </div>
                <div className="max-h-[60vh] space-y-4 overflow-y-auto p-6">
                  {createError && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {createError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">nameId</p>
                    <input
                      type="text"
                      value={createNameId}
                      onChange={(e) => {
                        setCreateError(null);
                        setCreateNameId(e.target.value);
                      }}
                      disabled={createLoading}
                      placeholder="vd: nahida, raiden"
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white/80 px-3 py-2 font-mono text-sm text-slate-900 shadow-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      autoComplete="off"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      ID lưu trong DB và save game; chọn class bên dưới sẽ gợi ý theo tên file .ts.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">HP</p>
                    <input
                      type="number"
                      min={1}
                      value={createHp}
                      onChange={(e) => {
                        setCreateError(null);
                        setCreateHp(e.target.value);
                      }}
                      disabled={createLoading}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nguyên tố</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCreateError(null);
                          setCreateElement('none');
                        }}
                        disabled={createLoading}
                        className={`flex items-center gap-2 rounded-lg border-2 p-2 transition-colors ${
                          createElement === 'none'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-400">
                          <svg
                            className="h-3.5 w-3.5 text-gray-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="6" y1="6" x2="18" y2="18" />
                            <line x1="18" y1="6" x2="6" y2="18" />
                          </svg>
                        </span>
                        <span className="text-xs font-medium">none</span>
                      </button>
                      {ELEMENT_OPTIONS.map((el) => (
                        <button
                          key={el}
                          type="button"
                          onClick={() => {
                            setCreateError(null);
                            setCreateElement(el);
                          }}
                          disabled={createLoading}
                          className={`flex items-center gap-2 rounded-lg border-2 p-2 transition-colors ${
                            createElement === el
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <img
                            src={`/assets/images/element/${el}.webp`}
                            alt={el}
                            className="h-6 w-6 shrink-0"
                          />
                          <span className="text-xs font-medium capitalize">{el}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="block text-xs font-medium text-muted-foreground">Class name</label>
                      <button
                        type="button"
                        onClick={() => setClassPickerOpen(true)}
                        className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        Chọn từ cây thư mục
                      </button>
                    </div>
                    <input
                      type="text"
                      readOnly
                      placeholder="Chọn từ cây thư mục"
                      disabled={createLoading}
                      className="w-full cursor-pointer rounded-md border border-input bg-muted/50 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                      value={selectedClassName}
                      onClick={() => setClassPickerOpen(true)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                  <Button variant="outline" type="button" disabled={createLoading} onClick={closeCreateModal}>
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      createLoading || !selectedClassName.trim() || !createNameId.trim()
                    }
                    onClick={handleCreateCharacterSubmit}
                  >
                    {createLoading ? 'Đang tạo...' : 'Tạo'}
                  </Button>
                </div>
              </div>

              {classPickerOpen && (
                <ClassNamePickerPanel
                  title="Chọn class nhân vật"
                  subfolder="character"
                  currentValue={selectedClassName}
                  onSelect={(className) => {
                    handlePickCharacterClass(className);
                  }}
                  onClose={() => setClassPickerOpen(false)}
                />
              )}
              </motion.div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
