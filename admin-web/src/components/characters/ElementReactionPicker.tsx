import { useMemo } from 'react';
import { ReactionPicker, type ReactionPickerItem } from '../share/ReactionPicker';
import { ELEMENT_OPTIONS, type ElementOption } from './characterDetailUtils';

const ELEMENT_ACCENT: Record<ElementOption, string> = {
  anemo: '#74C2A3',
  cryo: '#9FD4E6',
  dendro: '#A6C938',
  electro: '#B794F6',
  geo: '#FAB632',
  hydro: '#4FC3F7',
  pyro: '#FF7A64',
};

const ELEMENT_BG: Record<ElementOption, string> = {
  anemo: '#E8F8F2',
  cryo: '#E8F6FC',
  dendro: '#F4F8E8',
  electro: '#F3EDFC',
  geo: '#FFF8E8',
  hydro: '#E8F7FE',
  pyro: '#FFF0EC',
};

/** Character detail: trống / none trong DB = chưa gán element. */
function normalizeCharacterElement(raw: string | undefined): ElementOption | null {
  const s = (raw ?? '').toLowerCase();
  if (!s || s === 'none') return null;
  return (ELEMENT_OPTIONS as readonly string[]).includes(s) ? (s as ElementOption) : null;
}

/** Adventure enemy: mặc định `none`; không có trạng thái “chưa chọn”. */
function normalizeAdventureEnemyElement(raw: string | undefined): string | null {
  const s = (raw ?? '').toLowerCase();
  if (!s || s === 'none') return 'none';
  if ((ELEMENT_OPTIONS as readonly string[]).includes(s)) return s;
  return 'none';
}

const ELEMENT_ITEMS: ReactionPickerItem[] = ELEMENT_OPTIONS.map((el) => ({
  id: el,
  label: el.charAt(0).toUpperCase() + el.slice(1),
  accentColor: ELEMENT_ACCENT[el],
  bgColor: ELEMENT_BG[el],
  closedIcon: (
    <img
      src={`/assets/images/element/${el}.webp`}
      alt=""
      className="h-12 w-12 shrink-0 rounded-full object-cover"
      draggable={false}
    />
  ),
  icon: (
    <img
      src={`/assets/images/element/${el}.webp`}
      alt={el}
      className="h-[52px] w-[52px] object-contain"
      draggable={false}
    />
  ),
}));

const NONE_ELEMENT_ITEM: ReactionPickerItem = {
  id: 'none',
  label: 'None',
  accentColor: '#94A3B8',
  bgColor: '#E2E8F0',
  closedIcon: (
    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-gray-400" aria-hidden>
      <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </svg>
    </span>
  ),
  icon: (
    <span className="flex h-[52px] w-[52px] items-center justify-center text-muted-foreground" aria-hidden>
      <svg className="h-9 w-9 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </svg>
    </span>
  ),
};

export interface ElementReactionPickerProps {
  selectedElement: string;
  onSelect: (element: string) => void;
  /**
   * Adventure enemy: rail = None + 7 element; `''` / không hợp lệ → `none`.
   * Character detail: mặc định — trống/none trong DB = Không.
   */
  includeNoneInRail?: boolean;
  emptyLabel?: string;
}

export function ElementReactionPicker({
  selectedElement,
  onSelect,
  includeNoneInRail = false,
  emptyLabel = 'Không',
}: ElementReactionPickerProps) {
  const current = includeNoneInRail
    ? normalizeAdventureEnemyElement(selectedElement)
    : normalizeCharacterElement(selectedElement);

  const items = useMemo(() => {
    if (includeNoneInRail) return [NONE_ELEMENT_ITEM, ...ELEMENT_ITEMS];
    return ELEMENT_ITEMS;
  }, [includeNoneInRail]);

  return (
    <ReactionPicker
      items={items}
      selectedId={current}
      onSelect={onSelect}
      emptyLabel={emptyLabel}
    />
  );
}
