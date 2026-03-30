import { cn } from '../../lib/utils';

type TabPanelLoadingProps = {
  show: boolean;
  className?: string;
  label?: string;
};

/** Lớp phủ loading cho nội dung tab (parent cần `relative`). */
export function TabPanelLoading({ show, className, label }: TabPanelLoadingProps) {
  if (!show) return null;
  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/85 backdrop-blur-[2px]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
    </div>
  );
}
