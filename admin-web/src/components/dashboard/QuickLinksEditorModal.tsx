import { Button } from '../ui/button';
import type { NavItem } from '../layout/Sidebar';

interface QuickLinksEditorModalProps {
  open: boolean;
  onClose: () => void;
  allNavItems: NavItem[];
  selectedPaths: string[];
  maxSelection?: number;
  onChangeSelectedPaths: (next: string[]) => void;
  onSave: (next: string[]) => void;
}

export function QuickLinksEditorModal({
  open,
  onClose,
  allNavItems,
  selectedPaths,
  maxSelection = 6,
  onChangeSelectedPaths,
  onSave,
}: QuickLinksEditorModalProps) {
  if (!open) return null;

  const handleTogglePath = (path: string) => {
    const isChecked = selectedPaths.includes(path);
    if (isChecked) {
      onChangeSelectedPaths(selectedPaths.filter((p) => p !== path));
      return;
    }
    if (selectedPaths.length >= maxSelection) return;
    onChangeSelectedPaths([...selectedPaths, path]);
  };

  const handleSave = () => {
    const next = selectedPaths.slice(0, maxSelection);
    onSave(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span>🔗</span>
            <span>Tùy chỉnh Quick Links</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Chọn tối đa {maxSelection} link để hiển thị trong danh sách Quick Links.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
            {allNavItems.map((item) => {
              const checked = selectedPaths.includes(item.path);
              const disabled = !checked && selectedPaths.length >= maxSelection;
              return (
                <label
                  key={item.path}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                    checked
                      ? 'border-indigo-500 bg-indigo-50 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => handleTogglePath(item.path)}
                  />
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
          >
            Lưu Quick Links
          </Button>
        </div>
      </div>
    </div>
  );
}

