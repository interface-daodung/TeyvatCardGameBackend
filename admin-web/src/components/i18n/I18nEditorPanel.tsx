import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export type EditLang = 'en' | 'vi' | 'ja';

const LANG_OPTIONS: EditLang[] = ['en', 'vi', 'ja'];

interface I18nEditorPanelProps {
  title: string;
  /** 'name' = single line input, 'description' = textarea */
  fieldType: 'name' | 'description';
  editLang: EditLang;
  getValue: (lang: EditLang) => string;
  onChange: (lang: EditLang, value: string) => void;
  onTranslate: () => Promise<void>;
  onSave: () => void;
  onClose: () => void;
  translateLoading: boolean;
  /** Đang gửi lưu i18n (API) */
  saveLoading?: boolean;
  error: string | null;
  /** sidebar = cột phụ (mặc định); inline = khối mở rộng trong form */
  variant?: 'sidebar' | 'inline';
}

export function I18nEditorPanel({
  title,
  fieldType,
  editLang,
  getValue,
  onChange,
  onTranslate,
  onSave,
  onClose,
  translateLoading,
  saveLoading = false,
  error,
  variant = 'sidebar',
}: I18nEditorPanelProps) {
  const isInline = variant === 'inline';

  const inputClass = (lang: EditLang) =>
    lang === editLang
      ? isInline
        ? 'border-primary/40 bg-primary/5 focus:border-primary/50 focus:ring-1 focus:ring-primary/20'
        : 'border-blue-200 bg-blue-50/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-200'
      : 'border-slate-200';

  return (
    <div
      className={cn(
        'w-full rounded-lg bg-card overflow-hidden border border-border flex flex-col',
        isInline ? 'shadow-sm' : 'max-w-md flex-shrink-0 shadow-xl',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between shrink-0',
          isInline
            ? 'px-4 py-2.5 bg-muted/80 border-b border-border text-foreground'
            : 'px-6 py-4 bg-blue-600 text-white',
        )}
      >
        <h3 className={cn('font-semibold', isInline ? 'text-sm' : 'text-lg')}>{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'p-1 rounded transition-colors text-xl leading-none',
            isInline ? 'hover:bg-muted text-muted-foreground hover:text-foreground' : 'hover:bg-blue-500',
          )}
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>
      <div className={cn('flex-1 overflow-auto', isInline ? 'p-4' : 'p-6')}>
        <div className="space-y-4">
          {LANG_OPTIONS.map((lang) => (
            <div key={lang}>
              <label className="block text-sm font-medium mb-1">
                {lang.toUpperCase()}
                {lang === editLang && (
                  <span
                    className={cn(
                      'ml-1 text-xs font-normal',
                      isInline ? 'text-muted-foreground' : 'text-blue-200',
                    )}
                  >
                    (base)
                  </span>
                )}
              </label>
              {fieldType === 'description' ? (
                <textarea
                  value={getValue(lang)}
                  onChange={(e) => onChange(lang, e.target.value)}
                  className={`w-full rounded border px-3 py-2 text-sm min-h-[80px] resize-y ${inputClass(lang)}`}
                  placeholder={lang.toUpperCase()}
                />
              ) : (
                <input
                  type="text"
                  value={getValue(lang)}
                  onChange={(e) => onChange(lang, e.target.value)}
                  className={`w-full rounded border px-3 py-2 text-sm ${inputClass(lang)}`}
                  placeholder={lang.toUpperCase()}
                />
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={onTranslate}
            disabled={translateLoading || !getValue(editLang).trim()}
            className={cn(
              'text-sm',
              isInline
                ? ''
                : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400',
            )}
          >
            {translateLoading ? 'Đang dịch...' : 'Gợi ý dịch máy'}
          </Button>
          {error && (
            <p className={cn('text-sm', isInline ? 'text-destructive' : 'text-red-200')}>{error}</p>
          )}
        </div>
      </div>
      <div className={cn('border-t border-border', isInline ? 'p-3' : 'p-4')}>
        <Button
          onClick={onSave}
          disabled={translateLoading || saveLoading}
          className={cn('w-full', !isInline && 'bg-blue-600 hover:bg-blue-700')}
        >
          {saveLoading ? 'Đang lưu...' : 'Lưu i18n'}
        </Button>
      </div>
    </div>
  );
}
