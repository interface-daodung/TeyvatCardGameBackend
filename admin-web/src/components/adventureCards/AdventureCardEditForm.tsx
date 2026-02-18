import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { AdventureCard } from '../../services/gameDataService';

const STATUSES: AdventureCard['status'][] = ['enabled', 'disabled', 'hidden'];

interface AdventureCardEditFormProps {
  card: AdventureCard;
  form: Partial<AdventureCard>;
  setForm: React.Dispatch<React.SetStateAction<Partial<AdventureCard>>>;
  editLang: string;
  nameDisplay: string;
  descriptionDisplay: string;
  onOpenI18n: (field: 'name' | 'description') => void;
}

export function AdventureCardEditForm({
  card,
  form,
  setForm,
  editLang,
  nameDisplay,
  descriptionDisplay,
  onOpenI18n,
}: AdventureCardEditFormProps) {
  const currentStatus = (form.status ?? card.status) as AdventureCard['status'];
  const statusClasses =
    currentStatus === 'enabled'
      ? 'bg-emerald-500 text-emerald-50 hover:bg-emerald-600'
      : currentStatus === 'hidden'
      ? 'bg-slate-600 text-slate-50 hover:bg-slate-700'
      : 'bg-red-500 text-red-50 hover:bg-red-600';

  const cycleStatus = () => {
    const index = STATUSES.indexOf(currentStatus);
    const next = STATUSES[(index + 1) % STATUSES.length];
    setForm((p) => ({ ...p, status: next }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-mono">ID: {card.nameId}</span>
          {card.rarity != null && (
            <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
              ⭐ {card.rarity}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{card.type}</Badge>
          {card.category && <Badge variant="outline">{card.category}</Badge>}
          {card.element && <Badge variant="outline">{card.element}</Badge>}
          {card.clan && <Badge variant="outline">{card.clan}</Badge>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="block text-xs font-medium text-muted-foreground">Name</label>
          <button
            type="button"
            onClick={() => onOpenI18n('name')}
            className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Edit i18n
          </button>
        </div>
        <input
          type="text"
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
          readOnly
          value={nameDisplay}
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="block text-xs font-medium text-muted-foreground">Description</label>
          <button
            type="button"
            onClick={() => onOpenI18n('description')}
            className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Edit i18n
          </button>
        </div>
        <textarea
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background min-h-[80px]"
          readOnly
          value={descriptionDisplay}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Rarity</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const currentRarity = form.rarity ?? card.rarity ?? 0;
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
          <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
          <div
            role="button"
            tabIndex={0}
            className={`inline-flex items-center rounded-full border px-3.5 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent select-none ${statusClasses}`}
            onClick={cycleStatus}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                cycleStatus();
              }
            }}
          >
            {form.status ?? card.status}
          </div>
        </div>
      </div>
    </div>
  );
}
