export type FrameRect = { x: number; y: number; w: number; h: number };

export type AtlasFrameEntry = { name: string; frame: FrameRect };

function isFrameRect(v: unknown): v is FrameRect {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const x = Number(o.x);
  const y = Number(o.y);
  const w = Number(o.w);
  const h = Number(o.h);
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
}

/**
 * Hỗ trợ format atlas của server: `{ frames: { name: { frame: {x,y,w,h} } }, meta }`
 * hoặc mỗi key gốc trực tiếp là `{ frame: {x,y,w,h} }`.
 */
export function extractAtlasFrameEntries(data: unknown): AtlasFrameEntry[] {
  if (!data || typeof data !== 'object') return [];
  const root = data as Record<string, unknown>;

  let bucket: Record<string, unknown> | null = null;
  if (root.frames && typeof root.frames === 'object' && root.frames !== null) {
    bucket = root.frames as Record<string, unknown>;
  } else {
    const skip = new Set(['meta', 'size', 'image', 'scale', 'path']);
    bucket = {};
    for (const [k, v] of Object.entries(root)) {
      if (skip.has(k)) continue;
      if (v && typeof v === 'object' && v !== null && 'frame' in (v as object)) {
        bucket[k] = v;
      }
    }
  }

  const out: AtlasFrameEntry[] = [];
  for (const [name, val] of Object.entries(bucket)) {
    if (!val || typeof val !== 'object') continue;
    const frame = (val as { frame?: unknown }).frame;
    if (!isFrameRect(frame)) continue;
    out.push({ name, frame });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
