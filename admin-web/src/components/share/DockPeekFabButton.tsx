import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import {
  dockPeekFabButtonBaseClassName,
  dockPeekFabToneClassName,
  type DockPeekFabTone,
} from './dockPeekFabClasses';

export interface DockPeekFabButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone: DockPeekFabTone;
}

/**
 * Nút FAB dọc “peek” từ cạnh dưới (dùng trong {@link BottomDockFabShell}).
 */
export const DockPeekFabButton = forwardRef<HTMLButtonElement, DockPeekFabButtonProps>(
  function DockPeekFabButton({ tone, className, type = 'button', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          dockPeekFabButtonBaseClassName,
          dockPeekFabToneClassName[tone],
          className
        )}
        {...rest}
      />
    );
  }
);
