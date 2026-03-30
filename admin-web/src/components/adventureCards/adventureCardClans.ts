/** Clan enemy — khớp ảnh `public/assets/images/ui/Clan/*.webp` (PascalCase, xem `ClanReactionPicker`) */
export const ADVENTURE_CARD_CLANS = [
  'abyss',
  'Automatons',
  'boss',
  'eremite',
  'fatui',
  'hilichurl',
  'kairagi',
  'shroom',
  'slime',
] as const;

export type AdventureCardClan = (typeof ADVENTURE_CARD_CLANS)[number];
