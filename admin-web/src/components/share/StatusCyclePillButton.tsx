import { cn } from '../../lib/utils';

export interface StatusCyclePillButtonProps<T extends string> {
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
  getPillClassName: (value: T) => string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Nút pill tròn (giống AdventureCard status): click / Enter / Space để xoay vòng các giá trị trong `options`.
 */
export function StatusCyclePillButton<T extends string>({
  value,
  options,
  onChange,
  getPillClassName,
  className,
  'aria-label': ariaLabel,
}: StatusCyclePillButtonProps<T>) {
  const cycle = () => {
    const index = options.indexOf(value);
    const safeIndex = index === -1 ? 0 : index;
    const next = options[(safeIndex + 1) % options.length];
    onChange(next);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex cursor-pointer items-center rounded-full border border-transparent px-3.5 py-1 text-sm font-semibold transition-colors select-none',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        getPillClassName(value),
        className
      )}
      onClick={cycle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cycle();
        }
      }}
    >
      {value}
    </div>
  );
}
