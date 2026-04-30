import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export type SpriteFramePreviewPanelProps = {
  /** Dòng mô tả phía trên (vd. Spritesheet); animations có thể bỏ qua. */
  caption?: ReactNode;
  /** Gộp thêm class cho vỏ (vd. `mt-0` khi nằm trong tab). */
  className?: string;
  playing: boolean;
  /** Chỉ bật/tắt phát — không đổi frame (Pause dừng tại frame hiện tại). */
  onTogglePlay: () => void;
  /** Dừng và đưa frame về Start. */
  onReset: () => void;
  currentFrame: number;
  totalFrames: number;
  startFrame: number;
  endFrame: number;
  frameRate: number;
  onStartFrameChange: (value: number) => void;
  onEndFrameChange: (value: number) => void;
  onFrameRateChange: (value: number) => void;
  /** Nội dung trong khung viền (thường là wrapper tối + canvas). */
  canvas: ReactNode;
};

export function SpriteFramePreviewPanel({
  caption,
  className,
  playing,
  onTogglePlay,
  onReset,
  currentFrame,
  totalFrames,
  startFrame,
  endFrame,
  frameRate,
  onStartFrameChange,
  onEndFrameChange,
  onFrameRateChange,
  canvas,
}: SpriteFramePreviewPanelProps) {
  return (
    <div
      className={cn(
        'mt-3 flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-muted p-3',
        className
      )}
    >
      <div className="min-h-0 shrink-0 space-y-3">
        {caption}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onTogglePlay}>
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            Reset
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Current frame: <span className="font-semibold text-foreground">{currentFrame}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            Total frames: <span className="font-semibold text-foreground">{totalFrames || '—'}</span>
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="space-y-1 text-[11px] text-muted-foreground">
            <span>Start</span>
            <input
              type="number"
              min={0}
              value={startFrame}
              onChange={(e) => onStartFrameChange(Number(e.target.value))}
              className="block w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">
            <span>End</span>
            <input
              type="number"
              min={0}
              value={endFrame}
              onChange={(e) => onEndFrameChange(Number(e.target.value))}
              className="block w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">
            <span>FrameRate</span>
            <input
              type="number"
              min={1}
              value={frameRate}
              onChange={(e) => onFrameRateChange(Number(e.target.value))}
              className="block w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-2">
          {canvas}
        </div>
      </div>
    </div>
  );
}
