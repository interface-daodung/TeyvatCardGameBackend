/**
 * Item.image trong DB: đường dẫn web đầy đủ, ví dụ `/assets/images/item/foo.webp`.
 * Không dùng stem-only; không rỗng khi tạo/cập nhật qua API (validate zod).
 */
export const ITEM_IMAGE_LINK_PREFIX = '/assets/images/';

export function normalizeItemImageLink(raw: string): string {
  return String(raw).trim().replace(/\\/g, '/');
}
