import { cn } from '../../lib/utils';

type AssetLoadingOverlayProps = {
  show: boolean;
  label?: string;
  subLabel?: string;
  className?: string;
  variant?: 'panel' | 'modal';
};

const variantClassMap: Record<NonNullable<AssetLoadingOverlayProps['variant']>, string> = {
  panel: 'absolute inset-0 z-10 rounded-xl bg-background/85 backdrop-blur-[2px]',
  modal: 'absolute inset-0 z-[100] bg-card/95 backdrop-blur-sm',
};

/** Loading overlay dùng chung cho panel và toàn modal. */
export function AssetLoadingOverlay({
  show,
  label,
  subLabel,
  className,
  variant = 'panel',
}: AssetLoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        variantClassMap[variant],
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-primary border-t-transparent',
          variant === 'modal' ? 'h-10 w-10' : 'h-8 w-8'
        )}
        aria-hidden
      />
      {label ? <p className="text-sm font-medium text-foreground">{label}</p> : null}
      {subLabel ? <p className="text-xs text-muted-foreground">{subLabel}</p> : null}
    </div>
  );
}
