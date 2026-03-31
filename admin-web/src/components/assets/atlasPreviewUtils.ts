/**
 * Giống `bestGrid` trong server `filesService.ts` — chọn lưới gần vuông nhất.
 */
export function bestGrid(
  totalFrames: number,
  frameWidth: number,
  frameHeight: number
): { columns: number; rows: number; sheetWidth: number; sheetHeight: number } {
  let best: {
    columns: number;
    rows: number;
    sheetWidth: number;
    sheetHeight: number;
  } = {
    columns: 1,
    rows: totalFrames,
    sheetWidth: frameWidth,
    sheetHeight: totalFrames * frameHeight,
  };
  let minDiff = Infinity;
  for (let columns = 1; columns <= totalFrames; columns++) {
    const rows = Math.ceil(totalFrames / columns);
    const sheetWidth = columns * frameWidth;
    const sheetHeight = rows * frameHeight;
    const ratio = sheetWidth / sheetHeight;
    const diff = Math.abs(ratio - 1);
    if (diff < minDiff) {
      minDiff = diff;
      best = { columns, rows, sheetWidth, sheetHeight };
    }
  }
  return best;
}

/** Cùng cấu trúc JSON `generateCustomAtlas` ghi ra (xem server `filesService.ts`). */
export type SimulatedAtlasMetadata = {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
  meta: {
    image: string;
    size: { w: number; h: number };
    scale: string;
    path: string;
  };
};

/** Key frame như server: basename, bỏ đuôi, `_` thay `/`. */
export function atlasFrameKeyFromWebPath(webPath: string, index: number): string {
  const base = webPath.split(/[/\\]/).pop() ?? `frame_${index}`;
  return base.replace(/\.[^.]+$/, '').replace(/[/\\]/g, '_') || `frame_${index}`;
}

export function buildSimulatedAtlasMetadata(
  selectedPaths: string[],
  getDims: (path: string) => { w: number; h: number } | undefined,
  baseNameRaw: string
): {
  metadata: SimulatedAtlasMetadata;
  grid: ReturnType<typeof bestGrid>;
  spriteWidth: number;
  spriteHeight: number;
} | null {
  if (selectedPaths.length === 0) return null;
  const firstPath = selectedPaths[0];
  const d0 = getDims(firstPath);
  if (!d0) return null;
  const spriteWidth = d0.w;
  const spriteHeight = d0.h;
  const grid = bestGrid(selectedPaths.length, spriteWidth, spriteHeight);
  const safeName = (baseNameRaw.trim() || 'ten-atlas').replace(/[^a-zA-Z0-9_-]/g, '_') || 'ten-atlas';
  const webpName = `${safeName}.webp`;
  const metadata: SimulatedAtlasMetadata = {
    frames: {},
    meta: {
      image: webpName,
      size: { w: grid.sheetWidth, h: grid.sheetHeight },
      scale: '1',
      path: `assets/images/cards/${webpName}`,
    },
  };
  selectedPaths.forEach((filePath, index) => {
    const row = Math.floor(index / grid.columns);
    const col = index % grid.columns;
    const baseKey = atlasFrameKeyFromWebPath(filePath, index);
    metadata.frames[baseKey] = {
      frame: {
        x: col * spriteWidth,
        y: row * spriteHeight,
        w: spriteWidth,
        h: spriteHeight,
      },
    };
  });
  return { metadata, grid, spriteWidth, spriteHeight };
}

/** Giống sharp resize cover center — vẽ ảnh lấp đầy ô (dw×dh). */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const sw =
    img instanceof HTMLImageElement
      ? img.naturalWidth
      : (img as HTMLCanvasElement).width;
  const sh =
    img instanceof HTMLImageElement
      ? img.naturalHeight
      : (img as HTMLCanvasElement).height;
  if (!sw || !sh) return;
  const scale = Math.max(dw / sw, dh / sh);
  const scaledW = sw * scale;
  const scaledH = sh * scale;
  const offsetX = dx + (dw - scaledW) / 2;
  const offsetY = dy + (dh - scaledH) / 2;
  ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);
}
