import type { AdventureCard } from '../../services/gameDataService';

/** DB lưu contents là mảng ID (string[]). API có thể trả về populated (object[]) hoặc IDs. Chuẩn hóa về string[]. */
export function contentsToIds(contents: unknown): string[] {
  if (!Array.isArray(contents)) return [];
  return contents
    .map((c) => (typeof c === 'string' ? c : (c as { _id?: string })?._id))
    .filter((id): id is string => Boolean(id));
}

export const TYPE_ORDER: Record<string, number> = {
  weapon: 1,
  enemy: 2,
  food: 3,
  trap: 4,
  treasure: 5,
  bomb: 6,
  coin: 7,
  empty: 8,
};

export function sortAdventureCards(
  cards: AdventureCard[],
  sortBy: 'type' | 'rarity' | 'name'
): AdventureCard[] {
  const arr = [...cards];
  if (sortBy === 'type') {
    arr.sort(
      (a, b) =>
        (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99) ||
        a.name.localeCompare(b.name)
    );
  } else if (sortBy === 'rarity') {
    arr.sort(
      (a, b) => (b.rarity ?? 0) - (a.rarity ?? 0) || a.name.localeCompare(b.name)
    );
  } else {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }
  return arr;
}

export function getTypeIcon(type: string): string {
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
}

export function getAdventureCardImageUrl(card: { image?: string; type?: string; nameId?: string }): string {
  if (card.image) return card.image;
  const basePath = '/assets/images/cards';
  if (card.type === 'empty') return `${basePath}/empty.webp`;
  return `${basePath}/${card.type}/${card.nameId}.webp`;
}
