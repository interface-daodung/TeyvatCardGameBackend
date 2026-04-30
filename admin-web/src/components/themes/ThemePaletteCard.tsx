import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faPenToSquare, faTrash, faCopy } from '@fortawesome/free-solid-svg-icons';
import { Card, CardHeader, CardContent } from '../ui/card';
import { type Theme, type ThemeColors } from '../../services/themeService';

type ColorKey = keyof ThemeColors;

export function ThemePaletteCard({
  theme,
  colorKeys,
  isDefault,
  isPreviewing,
  onPreview,
  onEdit,
  onDelete,
}: {
  theme: Theme;
  colorKeys: ColorKey[];
  isDefault: boolean;
  isPreviewing: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copiedKey, setCopiedKey] = useState<ColorKey | null>(null);
  const colors = colorKeys.map((key) => ({ key, value: theme.colors[key] }));

  const copyHex = async (value: string, key: ColorKey) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1200);
    } catch {
      setCopiedKey(null);
    }
  };

  return (
    <Card className={isPreviewing ? 'border-primary shadow-md ring-2 ring-primary/30 bg-white' : 'border border-slate-200 bg-white'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.colors.primary }} aria-hidden />
            <span className="text-[15px] font-medium text-slate-800">{theme.name}</span>
            {isDefault && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                default
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={onPreview} className="w-8 h-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100" title="Preview" aria-label="Preview">
              <FontAwesomeIcon icon={faEye} />
            </button>
            <button type="button" onClick={onEdit} className="w-8 h-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100" title="Edit" aria-label="Edit">
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isDefault}
              className="w-8 h-8 rounded-md border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isDefault ? 'Default theme cannot be deleted' : 'Delete'}
              aria-label={isDefault ? 'Default theme cannot be deleted' : 'Delete'}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex h-9 rounded-md overflow-hidden gap-0.5 mb-4 border-2 border-transparent hover:border-black">
          {colors.map(({ key, value }) => (
            <div key={`bar-${key}`} className="flex-1 hover:flex-[1.6] transition-all duration-200" style={{ backgroundColor: value }} title={`${key}: ${value}`} />
          ))}
        </div>

        {isPreviewing && (
          <div className="grid grid-cols-1 gap-1.5">
            {colors.map(({ key, value }) => (
              <div key={key} className="group flex items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 hover:border-slate-300">
                <div className="w-7 h-7 rounded-md border border-black/10 shrink-0" style={{ backgroundColor: value }} title={`${key}: ${value}`} />
                <span className="text-[13px] text-slate-500 flex-1 capitalize">{key}</span>
                <span className="text-[13px] font-mono text-slate-800">{value}</span>
                <span className={`text-[11px] text-emerald-600 ${copiedKey === key ? 'inline' : 'hidden'}`}>copied</span>
                <button
                  type="button"
                  onClick={() => copyHex(value, key)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                  title={`Copy ${key}`}
                  aria-label={`Copy ${key}`}
                >
                  <FontAwesomeIcon icon={faCopy} className="text-[11px]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
