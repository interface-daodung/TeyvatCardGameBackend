import { cn } from '../../lib/utils';
import { bottomDockFabShellClassName } from './dockPeekFabClasses';

export interface BottomDockFabShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Vỏ neo đáy viewport cho FAB (pointer-events-none); bọc nội dung pointer-events-auto bên trong.
 */
export function BottomDockFabShell({ children, className }: BottomDockFabShellProps) {
  return (
    <div className={cn(bottomDockFabShellClassName, className)}>{children}</div>
  );
}
