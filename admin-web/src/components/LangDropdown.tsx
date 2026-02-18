import { Button } from './ui/button';

export type EditLang = 'en' | 'vi' | 'ja';

const LANG_OPTIONS: EditLang[] = ['en', 'vi', 'ja'];

interface LangDropdownProps {
  value: EditLang;
  onChange: (lang: EditLang) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export function LangDropdown({ value, onChange, open, onOpenChange, className }: LangDropdownProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onOpenChange(!open)}
        onBlur={() => setTimeout(() => onOpenChange(false), 150)}
        className="min-w-[4rem]"
      >
        {value}
        <span className="ml-1">{open ? '▲' : '▼'}</span>
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-md shadow-lg py-1 min-w-[4rem]">
          {LANG_OPTIONS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                onChange(lang);
                onOpenChange(false);
              }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-muted ${value === lang ? 'bg-muted font-medium' : ''}`}
            >
              {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
