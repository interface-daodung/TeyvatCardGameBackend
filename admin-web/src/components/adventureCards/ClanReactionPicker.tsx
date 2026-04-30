import { useMemo } from 'react';
import { ReactionPicker, type ReactionPickerItem } from '../share/ReactionPicker';
import { ADVENTURE_CARD_CLANS } from './adventureCardClans';

/** Tên file trên disk (ls): Abyss.webp, Boss.webp, … — slug DB khác hoa thường. */
const CLAN_IMAGE_STEM: Record<string, string> = {
  abyss: 'Abyss',
  Automatons: 'Automatons',
  boss: 'Boss',
  eremite: 'Eremite',
  fatui: 'Fatui',
  hilichurl: 'Hilichurl',
  kairagi: 'Kairagi',
  shroom: 'Shroom',
  slime: 'Slime',
};

function clanImageSrc(slug: string): string {
  const stem = CLAN_IMAGE_STEM[slug] ?? slug;
  return `/assets/images/ui/clan/${stem}.webp`;
}

const CLAN_PALETTE: { accent: string; bg: string }[] = [
  { accent: '#64748B', bg: '#F1F5F9' },
  { accent: '#0EA5E9', bg: '#E0F2FE' },
  { accent: '#A855F7', bg: '#F3E8FF' },
  { accent: '#EA580C', bg: '#FFEDD5' },
  { accent: '#16A34A', bg: '#DCFCE7' },
  { accent: '#DB2777', bg: '#FCE7F3' },
  { accent: '#CA8A04', bg: '#FEF9C3' },
  { accent: '#059669', bg: '#D1FAE5' },
  { accent: '#6366F1', bg: '#EEF2FF' },
];

const CLAN_ITEMS: ReactionPickerItem[] = ADVENTURE_CARD_CLANS.map((clan, i) => {
  const { accent, bg } = CLAN_PALETTE[i % CLAN_PALETTE.length];
  const src = clanImageSrc(clan);
  return {
    id: clan,
    label: clan,
    accentColor: accent,
    bgColor: bg,
    icon: <img src={src} alt="" className="h-[52px] w-[52px] object-contain" draggable={false} />,
    closedIcon: <img src={src} alt="" className="h-12 w-12 object-contain" draggable={false} />,
  };
});

function normalizeClan(raw: string | undefined): string | null {
  if (raw === '' || raw === undefined) return null;
  if ((ADVENTURE_CARD_CLANS as readonly string[]).includes(raw)) return raw;
  return null;
}

export interface ClanReactionPickerProps {
  selectedClan: string;
  onSelect: (clan: string) => void;
}

export function ClanReactionPicker({ selectedClan, onSelect }: ClanReactionPickerProps) {
  const items = useMemo(() => CLAN_ITEMS, []);
  const current = normalizeClan(selectedClan);

  return (
    <ReactionPicker
      items={items}
      selectedId={current}
      onSelect={onSelect}
      emptyLabel="None"
    />
  );
}

export type { AdventureCardClan } from './adventureCardClans';
