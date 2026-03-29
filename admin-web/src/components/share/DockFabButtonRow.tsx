import { cn } from '../../lib/utils';
import { dockFabButtonRowClassName } from './dockPeekFabClasses';

export interface DockFabButtonRowProps {
  children: React.ReactNode;
  className?: string;
}

export function DockFabButtonRow({ children, className }: DockFabButtonRowProps) {
  return (
    <div className={cn(dockFabButtonRowClassName, className)}>{children}</div>
  );
}
