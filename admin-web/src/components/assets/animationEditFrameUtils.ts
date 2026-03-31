import { extractFrameToCanvas } from './spritesheetEditFrameUtils';

/** Cùng ManagerAssets — spritesheet trong `animations/`. */
export const ANIMATION_FRAME_SIZE = 192;

export function countAnimationFrames(imgW: number, imgH: number): {
  cols: number;
  rows: number;
  total: number;
} {
  const cols = Math.floor(imgW / ANIMATION_FRAME_SIZE);
  const rows = Math.floor(imgH / ANIMATION_FRAME_SIZE);
  return { cols, rows, total: cols * rows };
}

export function extractAnimationFrameToCanvas(
  source: CanvasImageSource,
  frameIndex: number,
  cols: number
): HTMLCanvasElement {
  return extractFrameToCanvas(
    source,
    frameIndex,
    cols,
    ANIMATION_FRAME_SIZE,
    ANIMATION_FRAME_SIZE
  );
}
