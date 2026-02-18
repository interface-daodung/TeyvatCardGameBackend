interface ElementIconProps {
  element: string;
  /** Size: 'sm' (card thumb), 'md' (detail) */
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = { sm: 'w-5 h-5', md: 'w-7 h-7' };
const iconSizes = { sm: 'w-3 h-3', md: 'w-4 h-4' };

export function ElementIcon({ element, size = 'sm', className = '' }: ElementIconProps) {
  const isNone = element === 'none' || !element;

  if (isNone) {
    return (
      <span
        className={`${sizeClasses[size]} rounded-full border border-white/60 bg-black/40 flex items-center justify-center p-0.5 ${className}`}
      >
        <svg className={`${iconSizes[size]} text-white/80`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </span>
    );
  }

  return (
    <img
      src={`/assets/images/element/${element}.webp`}
      alt={element}
      className={`${sizeClasses[size]} rounded-full border border-white/60 bg-black/40 p-0.5 ${className}`}
    />
  );
}
