import {
  SPRITESHEET_FRAME_HEIGHT,
  SPRITESHEET_FRAME_WIDTH,
} from '../characters/characterDetailUtils';

export { SPRITESHEET_FRAME_WIDTH, SPRITESHEET_FRAME_HEIGHT };

export function countSpritesheetFrames(imgW: number, imgH: number): {
  cols: number;
  rows: number;
  total: number;
} {
  const cols = Math.floor(imgW / SPRITESHEET_FRAME_WIDTH);
  const rows = Math.floor(imgH / SPRITESHEET_FRAME_HEIGHT);
  return { cols, rows, total: cols * rows };
}

/** Cắt frame theo thứ tự giống ManagerAssets / server (hàng ngang trước). */
export function extractFrameToCanvas(
  source: CanvasImageSource,
  frameIndex: number,
  cols: number,
  fw: number,
  fh: number
): HTMLCanvasElement {
  const col = frameIndex % cols;
  const row = Math.floor(frameIndex / cols);
  const canvas = document.createElement('canvas');
  canvas.width = fw;
  canvas.height = fh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(source, col * fw, row * fh, fw, fh, 0, 0, fw, fh);
  return canvas;
}
