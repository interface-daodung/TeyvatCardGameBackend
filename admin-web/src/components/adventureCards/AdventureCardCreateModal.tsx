import { createPortal } from 'react-dom';
import { Button } from '../ui/button';
import { AdventureCardImagePicker } from './AdventureCardImagePicker';
import type { AdventureCard } from '../../services/gameDataService';
import type { FileTreeItem } from '../../services/filesService';

const TYPES: AdventureCard['type'][] = [
  'weapon',
  'enemy',
  'food',
  'trap',
  'treasure',
  'bomb',
  'coin',
  'empty',
];
const STATUSES: AdventureCard['status'][] = ['enabled', 'disabled', 'hidden'];

interface AdventureCardCreateModalProps {
  form: Partial<AdventureCard>;
  setForm: React.Dispatch<React.SetStateAction<Partial<AdventureCard>>>;
  error: string | null;
  saveLoading: boolean;
  imageTreeOpen: boolean;
  imageTree: FileTreeItem[] | null;
  imageTreeLoading: boolean;
  imageTreeExpanded: Set<string>;
  onClose: () => void;
  onCreate: () => void;
  onToggleTree: () => void;
  onToggleTreeExpanded: (path: string) => void;
  onSelectImage: (path: string) => void;
  onCloseTree: () => void;
}

export function AdventureCardCreateModal({
  form,
  setForm,
  error,
  saveLoading,
  imageTreeOpen,
  imageTree,
  imageTreeLoading,
  imageTreeExpanded,
  onClose,
  onCreate,
  onToggleTree,
  onToggleTreeExpanded,
  onSelectImage,
  onCloseTree,
}: AdventureCardCreateModalProps) {
  const type = form.type ?? 'weapon';
  const status = form.status ?? 'enabled';
  const statusClasses =
    status === 'enabled'
      ? 'bg-emerald-500 text-emerald-50 hover:bg-emerald-600'
      : status === 'hidden'
      ? 'bg-slate-600 text-slate-50 hover:bg-slate-700'
      : 'bg-red-500 text-red-50 hover:bg-red-600';

  const cycleStatus = () => {
    const index = STATUSES.indexOf(status);
    const next = STATUSES[(index + 1) % STATUSES.length];
    setForm((p) => ({ ...p, status: next }));
  };

  const displayCard: AdventureCard = {
    _id: '',
    nameId: form.nameId ?? 'new',
    name: form.name ?? 'New',
    description: form.description ?? '',
    type,
    status,
    rarity: form.rarity ?? 1,
    image: form.image,
  };

  const modal = (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 min-h-screen min-w-screen w-full h-full z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex items-stretch gap-4">
        <div className="w-full max-w-3xl rounded-xl bg-card shadow-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-primary-600 to-red-600 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Thêm Adventure Card</h2>
            <button
              type="button"
              onClick={onClose}
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
                <AdventureCardImagePicker
                  card={displayCard}
                  formImage={form.image}
                  isTreeOpen={imageTreeOpen}
                  onToggleTree={onToggleTree}
                  imageTree={imageTree}
                  imageTreeLoading={imageTreeLoading}
                  imageTreeExpanded={imageTreeExpanded}
                  onToggleExpanded={onToggleTreeExpanded}
                  onSelectImage={onSelectImage}
                  onCloseTree={onCloseTree}
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Name ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                    value={form.nameId ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, nameId: e.target.value.trim() }))}
                    placeholder="vd: sword_01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                    value={form.name ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Tên hiển thị"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background min-h-[80px]"
                    value={form.description ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Mô tả"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                    value={type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, type: e.target.value as AdventureCard['type'] }))
                    }
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Rarity
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const currentRarity = form.rarity ?? 1;
                        const isActive = star <= currentRarity;
                        return (
                          <button
                            key={star}
                            type="button"
                            className={`h-7 w-7 flex items-center justify-center transition-colors ${
                              isActive ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-200'
                            }`}
                            onClick={() => setForm((p) => ({ ...p, rarity: star }))}
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
                    <div
                      role="button"
                      tabIndex={0}
                      className={`inline-flex items-center rounded-full border px-3.5 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent select-none cursor-pointer ${statusClasses}`}
                      onClick={cycleStatus}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          cycleStatus();
                        }
                      }}
                    >
                      {status}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Hủy
            </Button>
            <Button type="button" disabled={saveLoading} onClick={onCreate}>
              {saveLoading ? 'Đang tạo...' : 'Tạo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}
