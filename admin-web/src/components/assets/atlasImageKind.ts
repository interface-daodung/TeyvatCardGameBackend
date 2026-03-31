/** Tỉ lệ card: rộng / cao = 7 / 12 */
export const CARD_WH_RATIO = 7 / 12;

/**
 * Không đưa ảnh từ các thư mục này vào danh sách tạo atlas (animations, about, Spritesheet).
 * Đường dẫn chuẩn hóa dùng `/`, so khớp không phân biệt hoa thường.
 */
export function isPathExcludedFromAtlasBuilder(path: string): boolean {
  const n = path.replace(/\\/g, '/').toLowerCase();
  if (n.includes('/animations/')) return true;
  if (n.includes('/about/')) return true;
  const lastSlash = n.lastIndexOf('/');
  const parent = lastSlash <= 0 ? '' : n.slice(0, lastSlash);
  const parentLast = parent.split('/').pop() ?? '';
  if (parentLast === 'spritesheet') return true;
  return false;
}

const RATIO_TOL = 0.02;

export type AtlasImageKind = 'card' | 'square' | 'other';

export function classifyAtlasImageKind(w: number, h: number): AtlasImageKind {
  if (w <= 0 || h <= 0) return 'other';
  const wh = w / h;
  if (Math.abs(wh - CARD_WH_RATIO) <= Math.max(RATIO_TOL, CARD_WH_RATIO * RATIO_TOL)) {
    return 'card';
  }
  if (Math.abs(wh - 1) <= RATIO_TOL) {
    return 'square';
  }
  return 'other';
}
