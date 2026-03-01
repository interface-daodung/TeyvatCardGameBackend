import type { MapTypeRatios } from '../../services/gameDataService';
export { getAdventureCardImageUrl as getCardImageUrl } from '../adventureCards/adventureCardUtils';

export const TYPE_RATIO_KEYS: (keyof MapTypeRatios)[] = [
    'enemies',
    'food',
    'weapons',
    'coins',
    'traps',
    'treasures',
    'bombs',
];

export const TYPE_RATIO_ICONS: Record<keyof MapTypeRatios, string> = {
    enemies: '👹',
    food: '🍖',
    weapons: '⚔️',
    coins: '🪙',
    traps: '🕳️',
    treasures: '💎',
    bombs: '💣',
};

export const MAP_STATUSES: ('enabled' | 'disabled' | 'hidden')[] = ['enabled', 'disabled', 'hidden'];

export const DEFAULT_TYPE_RATIOS: MapTypeRatios = {
    enemies: 0,
    food: 0,
    weapons: 0,
    coins: 0,
    traps: 0,
    treasures: 0,
    bombs: 0,
};

/** Màu input Type ratios: 0=trắng, 1–9=xám, 10+ đậm dần qua xanh lá → vàng → đỏ → tím nhạt (max). */
export function getRatioInputColorClass(value: number): string {
    const v = Math.max(0, Math.min(100, value));
    if (v === 0) return 'bg-white border-slate-200 text-slate-800';
    if (v < 5) return 'bg-slate-200 border-slate-300 text-slate-800';
    if (v < 10) return 'bg-green-100 border-green-300 text-green-900';
    if (v < 20) return 'bg-green-200 border-green-400 text-green-900';
    if (v < 30) return 'bg-yellow-200 border-yellow-400 text-yellow-900';
    if (v < 35) return 'bg-amber-200 border-amber-400 text-amber-900';
    if (v < 40) return 'bg-orange-200 border-orange-400 text-orange-900';
    if (v < 50) return 'bg-red-200 border-red-400 text-red-900';
    return 'bg-purple-200 border-purple-400 text-purple-900';
}

/** Tổng 7 loại (không tính free). */
export function sumTypeRatios(tr: MapTypeRatios): number {
    return TYPE_RATIO_KEYS.reduce((s, k) => s + (tr[k] ?? 0), 0);
}

/** Free ratio = phần còn lại để tổng = 100. Luôn trong [0, 100]. */
export function getFreeRatio(tr: MapTypeRatios): number {
    return Math.max(0, Math.min(100, 100 - sumTypeRatios(tr)));
}

export function getFormTypeRatios(tr?: MapTypeRatios | null): MapTypeRatios {
    if (!tr || typeof tr !== 'object') return { ...DEFAULT_TYPE_RATIOS };
    return {
        enemies: tr.enemies ?? 0,
        food: tr.food ?? 0,
        weapons: tr.weapons ?? 0,
        coins: tr.coins ?? 0,
        traps: tr.traps ?? 0,
        treasures: tr.treasures ?? 0,
        bombs: tr.bombs ?? 0,
    };
}
