import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquarePen } from '@fortawesome/free-solid-svg-icons';
import type { AdventureCard } from '../../services/gameDataService';
import { normalizeAdventureCardStatus } from './adventureCardUtils';
import { DualRangeSlider } from '../ui/DualRangeSlider';
import { StatusCyclePillButton, adventureCardStatusPillClass } from '../share';
import { ElementReactionPicker } from '../characters/ElementReactionPicker';
import { ClanReactionPicker } from './ClanReactionPicker';
import { WeaponCategoryReactionPicker } from './WeaponCategoryReactionPicker';

const STATUSES: AdventureCard['status'][] = ['enabled', 'disabled'];

interface AdventureCardEditFormProps {
  card: AdventureCard;
  form: Partial<AdventureCard>;
  setForm: React.Dispatch<React.SetStateAction<Partial<AdventureCard>>>;
  /** Theo ngôn ngữ toolbar — hiển thị một dòng trước khi mở popup I18nEditor. */
  namePreview: string;
  descriptionPreview: string;
  onOpenI18nName: () => void;
  onOpenI18nDesc: () => void;
  onOpenClassNamePicker?: () => void;
}

export function AdventureCardEditForm({
  card,
  form,
  setForm,
  namePreview,
  descriptionPreview,
  onOpenI18nName,
  onOpenI18nDesc,
  onOpenClassNamePicker,
}: AdventureCardEditFormProps) {
  const currentStatus = normalizeAdventureCardStatus(form.status ?? card.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">ID: {card.nameId}</span>
        {card.rarity != null && (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
            ⭐ {card.rarity}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="font-medium text-muted-foreground">Name:</span>
        <span className="min-w-0 text-sm text-foreground">{namePreview || '—'}</span>
        <button
          type="button"
          onClick={onOpenI18nName}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Edit name i18n"
          title="Edit name i18n (EN / VI / JA)"
        >
          <FontAwesomeIcon icon={faSquarePen} className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Mô tả (i18n)</span>
        <div className="relative rounded-md border border-border bg-muted/30">
          <span
            className="pointer-events-none absolute right-2 top-2 z-10 text-muted-foreground"
            aria-hidden
          >
            <FontAwesomeIcon icon={faSquarePen} className="h-4 w-4" />
          </span>
          <textarea
            readOnly
            rows={4}
            value={descriptionPreview}
            placeholder="—"
            onClick={onOpenI18nDesc}
            aria-label="Description (i18n), click to edit translations"
            className="min-h-[5rem] w-full cursor-pointer resize-none rounded-md border-0 bg-transparent px-3 py-2.5 pr-10 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          />
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="block text-xs font-medium text-muted-foreground">Class name</label>
          {onOpenClassNamePicker && (
            <button
              type="button"
              onClick={onOpenClassNamePicker}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Chọn từ cây thư mục (modal)
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="Select from folder tree"
          readOnly
          className="w-full cursor-pointer rounded-md border border-input bg-muted/50 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          value={form.className ?? card.className ?? ''}
          onClick={onOpenClassNamePicker}
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
                  className={`h-7 w-7 flex items-center justify-center transition-colors ${isActive ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-200'
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
          <StatusCyclePillButton
            value={currentStatus}
            options={STATUSES}
            onChange={(next) => setForm((p) => ({ ...p, status: next }))}
            getPillClassName={adventureCardStatusPillClass}
            aria-label="Adventure card status"
          />
        </div>
      </div>

      {/* Conditional Fields based on Type */}
      {card.type === 'enemy' && (
        <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg bg-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="shrink-0 text-sm font-medium text-muted-foreground">⚡ Element</span>
              <div
                className="min-w-0 w-full flex justify-center sm:w-auto sm:justify-end sm:pl-2"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <ElementReactionPicker
                  selectedElement={form.element ?? card.element ?? ''}
                  onSelect={(e) => setForm((p) => ({ ...p, element: e }))}
                  includeNoneInRail
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg bg-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="shrink-0 text-sm font-medium text-muted-foreground">🏴 Clan</span>
              <div
                className="min-w-0 w-full flex justify-center sm:w-auto sm:justify-end sm:pl-2"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <ClanReactionPicker
                  selectedClan={form.clan ?? card.clan ?? ''}
                  onSelect={(c) => setForm((p) => ({ ...p, clan: c }))}
                />
              </div>
            </div>
          </div>
          <DualRangeSlider
            min={0}
            max={49}
            start={[form.healthMin ?? card.healthMin ?? 1, form.healthMax ?? card.healthMax ?? 10]}
            label="Health Range (Min - Max)"
            onChange={([min, max]) => setForm((p) => ({ ...p, healthMin: min, healthMax: max }))}
          />
          <DualRangeSlider
            min={0}
            max={49}
            start={[form.scoreMin ?? card.scoreMin ?? 1, form.scoreMax ?? card.scoreMax ?? 5]}
            label="Score Range (Min - Max)"
            onChange={([min, max]) => setForm((p) => ({ ...p, scoreMin: min, scoreMax: max }))}
          />
        </div>
      )}

      {(card.type === 'bomb' || card.type === 'trap') && (
        <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
          <DualRangeSlider
            min={0}
            max={49}
            start={[form.damageMin ?? card.damageMin ?? 1, form.damageMax ?? card.damageMax ?? 10]}
            label="Damage Range (Min - Max)"
            onChange={([min, max]) => setForm((p) => ({ ...p, damageMin: min, damageMax: max }))}
          />
          {card.type === 'bomb' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Countdown</label>
              <input
                type="number"
                min="0"
                max="49"
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                value={form.countdown ?? card.countdown ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, countdown: Math.min(49, Math.max(0, parseInt(e.target.value) || 0)) }))}
              />
            </div>
          )}
        </div>
      )}

      {card.type === 'weapon' && (
        <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex flex-col gap-3 rounded-lg bg-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="shrink-0 text-sm font-medium text-muted-foreground">⚔️ Weapon category</span>
            <div
              className="min-w-0 w-full flex justify-center sm:w-auto sm:justify-end sm:pl-2"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <WeaponCategoryReactionPicker
                selectedCategory={form.category ?? card.category ?? ''}
                onSelect={(id) => setForm((p) => ({ ...p, category: id }))}
              />
            </div>
          </div>
          <DualRangeSlider
            min={0}
            max={49}
            start={[form.durabilityMin ?? card.durabilityMin ?? 1, form.durabilityMax ?? card.durabilityMax ?? 5]}
            label="Durability Range (Min - Max)"
            onChange={([min, max]) => setForm((p) => ({ ...p, durabilityMin: min, durabilityMax: max }))}
          />
        </div>
      )}

      {card.type === 'treasure' && (
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <DualRangeSlider
            min={0}
            max={49}
            start={[form.durabilityMin ?? card.durabilityMin ?? 1, form.durabilityMax ?? card.durabilityMax ?? 5]}
            label="Durability Range (Min - Max)"
            onChange={([min, max]) => setForm((p) => ({ ...p, durabilityMin: min, durabilityMax: max }))}
          />
        </div>
      )}

      {card.type === 'food' && (
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <DualRangeSlider
            min={0}
            max={49}
            start={[form.foodMin ?? card.foodMin ?? 1, form.foodMax ?? card.foodMax ?? 10]}
            label="Food Heal Range (Min - Max)"
            onChange={([min, max]) => setForm((p) => ({ ...p, foodMin: min, foodMax: max }))}
          />
        </div>
      )}
    </div>
  );
}
