import { createPortal } from 'react-dom';
import { Button } from '../ui/button';
import type { EditLang } from '../LangDropdown';

const LANG_OPTIONS: EditLang[] = ['en', 'vi', 'ja'];
const LANG_LABELS: Record<EditLang, string> = { en: 'English', vi: 'Vietnamese', ja: 'Japanese' };

interface I18nDescriptionModalProps {
  open: boolean;
  title: string;
  editLang: EditLang;
  getValue: (lang: EditLang) => string;
  onChange: (lang: EditLang, value: string) => void;
  onTranslate: () => Promise<void>;
  onSave: () => void;
  onClose: () => void;
  translateLoading: boolean;
  error: string | null;
}

export function I18nDescriptionModal({
  open,
  title,
  editLang,
  getValue,
  onChange,
  onTranslate,
  onSave,
  onClose,
  translateLoading,
  error,
}: I18nDescriptionModalProps) {
  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card overflow-hidden shadow-xl border border-border flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-blue-500 rounded transition-colors text-xl leading-none"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        <div className="p-6 flex-1 overflow-auto space-y-4">
          {([editLang, ...LANG_OPTIONS.filter((l) => l !== editLang)] as EditLang[]).map((lang) => (
            <div key={lang}>
              <label className="block text-sm font-medium mb-1 cursor-pointer">
                {lang}
                {lang === editLang && (
                  <span className="ml-2 text-xs text-blue-600 font-normal">(gb)</span>
                )}
              </label>
              <textarea
                value={getValue(lang)}
                onChange={(e) => onChange(lang, e.target.value)}
                className={`w-full rounded border px-3 py-2 text-sm min-h-[80px] resize-y ${
                  lang === editLang
                    ? 'border-blue-200 bg-blue-50/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-200'
                    : 'border-slate-200'
                }`}
                placeholder={LANG_LABELS[lang]}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={onTranslate}
            disabled={translateLoading || !getValue(editLang).trim()}
            className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 text-sm"
          >
            {translateLoading ? 'Đang dịch...' : 'Gợi ý dịch máy'}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="p-4 border-t border-border">
          <Button onClick={onSave} className="w-full bg-blue-600 hover:bg-blue-700">
            Lưu
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
