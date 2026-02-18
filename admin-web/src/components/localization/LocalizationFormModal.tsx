import { createPortal } from 'react-dom';
import { Button } from '../ui/button';

interface LocalizationFormModalProps {
  open: boolean;
  isEditing: boolean;
  formKey: string;
  formEn: string;
  formVi: string;
  formJa: string;
  onKeyChange: (v: string) => void;
  onEnChange: (v: string) => void;
  onViChange: (v: string) => void;
  onJaChange: (v: string) => void;
  onSuggestTranslation: () => Promise<void>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitLoading: boolean;
  translateLoading: boolean;
  error: string | null;
}

export function LocalizationFormModal({
  open,
  isEditing,
  formKey,
  formEn,
  formVi,
  formJa,
  onKeyChange,
  onEnChange,
  onViChange,
  onJaChange,
  onSuggestTranslation,
  onSubmit,
  onClose,
  submitLoading,
  translateLoading,
  error,
}: LocalizationFormModalProps) {
  if (!open) return null;

  const content = (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 min-h-screen w-full z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 top-0 left-0 right-0 bottom-0 min-h-full w-full bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-card overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Sửa localization' : 'Thêm localization'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-blue-500 rounded transition-colors text-xl leading-none"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div>
            <label htmlFor="localization-form-key" className="block text-sm font-medium mb-1 cursor-pointer">
              Key
            </label>
            <input
              id="localization-form-key"
              type="text"
              value={formKey}
              onChange={(e) => onKeyChange(e.target.value)}
              disabled={isEditing}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
              placeholder="e.g. menu.play"
            />
          </div>
          <div>
            <label htmlFor="localization-form-en" className="block text-sm font-medium mb-1 cursor-pointer">
              🇬🇧 English
            </label>
            <input
              id="localization-form-en"
              type="text"
              value={formEn}
              onChange={(e) => onEnChange(e.target.value)}
              className="w-full rounded border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
              placeholder="English translation"
            />
          </div>
          <div>
            <label htmlFor="localization-form-vi" className="block text-sm font-medium mb-1 cursor-pointer">
              🇻🇳 Vietnamese
            </label>
            <input
              id="localization-form-vi"
              type="text"
              value={formVi}
              onChange={(e) => onViChange(e.target.value)}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              placeholder="Vietnamese translation"
            />
          </div>
          <div>
            <label htmlFor="localization-form-ja" className="block text-sm font-medium mb-1 cursor-pointer">
              🇯🇵 Japanese
            </label>
            <input
              id="localization-form-ja"
              type="text"
              value={formJa}
              onChange={(e) => onJaChange(e.target.value)}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              placeholder="Japanese translation"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onSuggestTranslation}
            disabled={translateLoading || !formEn.trim()}
            className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 text-sm"
          >
            {translateLoading ? 'Đang dịch...' : 'Gợi ý dịch máy'}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitLoading}>
              {submitLoading ? 'Đang xử lý...' : isEditing ? 'Lưu' : 'Thêm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
