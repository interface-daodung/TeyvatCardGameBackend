import { ReactionPicker, type ReactionPickerItem } from '../share/ReactionPicker';

const WEAPON_CATEGORIES = ['bow', 'catalyst', 'claymore', 'polearm', 'sword'] as const;
export type WeaponCategorySlug = (typeof WEAPON_CATEGORIES)[number];

/** Ảnh trong `public/assets/images/ui/category/` — PascalCase trùng slug (Bow.png ↔ bow). */
function weaponCategoryImageSrc(slug: string): string {
  const base = slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase();
  return `/assets/images/ui/category/${base}.png`;
}

const WEAPON_CATEGORY_TINT: Record<WeaponCategorySlug, { accent: string; bg: string }> = {
  bow: { accent: '#0EA5E9', bg: '#E0F2FE' },
  catalyst: { accent: '#8B5CF6', bg: '#EDE9FE' },
  claymore: { accent: '#EA580C', bg: '#FFEDD5' },
  polearm: { accent: '#16A34A', bg: '#DCFCE7' },
  sword: { accent: '#64748B', bg: '#F1F5F9' },
};

const WEAPON_ITEMS: ReactionPickerItem[] = WEAPON_CATEGORIES.map((cat) => {
  const { accent, bg } = WEAPON_CATEGORY_TINT[cat];
  const src = weaponCategoryImageSrc(cat);
  const label = cat.charAt(0).toUpperCase() + cat.slice(1);
  return {
    id: cat,
    label,
    accentColor: accent,
    bgColor: bg,
    icon: <img src={src} alt="" className="h-[52px] w-[52px] object-contain" draggable={false} />,
    closedIcon: <img src={src} alt="" className="h-12 w-12 object-contain" draggable={false} />,
  };
});

function normalizeCategory(raw: string): WeaponCategorySlug | 'none' {
  const s = (raw || '').toLowerCase();
  if (!s) return 'none';
  return (WEAPON_CATEGORIES as readonly string[]).includes(s) ? (s as WeaponCategorySlug) : 'none';
}

export interface WeaponCategoryReactionPickerProps {
  selectedCategory: string;
  onSelect: (category: string) => void;
}

/** Cùng kiểu `ElementReactionPicker`: pill + mở rail; chưa chọn hiển thị nhãn trống tương ứng. */
export function WeaponCategoryReactionPicker({ selectedCategory, onSelect }: WeaponCategoryReactionPickerProps) {
  const current = normalizeCategory(selectedCategory);

  return (
    <ReactionPicker
      items={WEAPON_ITEMS}
      selectedId={current === 'none' ? null : current}
      onSelect={onSelect}
      emptyLabel="None"
    />
  );
}
