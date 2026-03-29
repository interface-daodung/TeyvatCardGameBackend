import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export type DockFabMotionGroupProps = HTMLMotionProps<'div'> & {
  'aria-label'?: string;
};

/**
 * `motion.div` role="group" cho cụm FAB neo đáy; giữ `pointer-events-auto` mặc định.
 */
export function DockFabMotionGroup({
  className,
  children,
  'aria-label': ariaLabel,
  ...rest
}: DockFabMotionGroupProps) {
  return (
    <motion.div
      role="group"
      aria-label={ariaLabel}
      className={cn('pointer-events-auto', className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
