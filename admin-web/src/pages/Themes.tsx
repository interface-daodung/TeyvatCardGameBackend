import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  getThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  defaultThemeColors,
  type Theme,
  type ThemeColors,
} from '../services/themeService';

const COLOR_KEYS: (keyof ThemeColors)[] = [
  'primary',
  'secondary',
  'accent',
  'neutral',
  'background',
  'surface',
  'text',
];

function ThemePreview({ colors }: { colors: ThemeColors }) {
  return (
    <div
      className="rounded-lg overflow-hidden border border-slate-200 shadow-lg"
      style={{
        backgroundColor: colors.background,
        color: colors.text,
      }}
    >
      <div
        className="p-4"
        style={{ backgroundColor: colors.surface }}
      >
        <h3 className="font-semibold mb-2" style={{ color: colors.text }}>
          Xem trước theme
        </h3>
        <p className="text-sm mb-3" style={{ color: colors.neutral }}>
          Màu chữ neutral, nút primary và accent.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded text-sm font-medium text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Primary
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded text-sm font-medium"
            style={{ backgroundColor: colors.secondary, color: colors.text }}
          >
            Secondary
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded text-sm font-medium"
            style={{ backgroundColor: colors.accent, color: colors.background }}
          >
            Accent
          </button>
        </div>
      </div>
    </div>
  );
}

function ThemeFormModal({
  initialName,
  initialColors,
  onClose,
  onSave,
  saveLoading,
}: {
  initialName: string;
  initialColors: ThemeColors;
  onClose: () => void;
  onSave: (name: string, colors: ThemeColors) => Promise<void>;
  saveLoading: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [colors, setColors] = useState<ThemeColors>(initialColors);
  const [error, setError] = useState<string | null>(null);

  const setColor = (key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên theme không được để trống.');
      return;
    }
    const hex = /^#[0-9A-Fa-f]{6}$/;
    for (const k of COLOR_KEYS) {
      if (!hex.test(colors[k])) {
        setError(`Màu "${k}" phải là mã hex (vd: #95245b).`);
        return;
      }
    }
    try {
      await onSave(name.trim(), colors);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại.');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">
            {initialName ? 'Chỉnh sửa theme' : 'Thêm theme mới'}
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên theme</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800"
              placeholder="vd: default, dark, light"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">Màu sắc</span>
            {COLOR_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono"
                  placeholder="#000000"
                />
                <span className="text-slate-500 text-sm w-24 capitalize">{key}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={saveLoading}>
              {saveLoading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function Themes() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [previewColors, setPreviewColors] = useState<ThemeColors | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchThemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getThemes();
      setThemes(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách theme.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const openCreate = () => {
    setEditingTheme(null);
    setModalOpen(true);
  };

  const openEdit = (theme: Theme) => {
    setEditingTheme(theme);
    setModalOpen(true);
  };

  const handleSave = async (name: string, colors: ThemeColors) => {
    setSaveLoading(true);
    try {
      if (editingTheme) {
        await updateTheme(editingTheme._id, { name, colors });
      } else {
        await createTheme({ name, colors });
      }
      await fetchThemes();
      setModalOpen(false);
      setEditingTheme(null);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (theme: Theme) => {
    if (!window.confirm(`Xóa theme "${theme.name}"?`)) return;
    try {
      await deleteTheme(theme._id);
      await fetchThemes();
      if (previewColors && themes.find((t) => t._id === theme._id)?.colors === previewColors) {
        setPreviewColors(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại.');
    }
  };

  const modalInitialName = editingTheme?.name ?? '';
  const modalInitialColors = editingTheme?.colors ?? defaultThemeColors();

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Themes"
          description="Chỉnh sửa và kiểm tra các bộ màu (lưu trong DB, collection themes)"
        />
        <Button onClick={openCreate}>Thêm theme</Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-700">Danh sách theme</h3>
            {themes.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  Chưa có theme. Bấm &quot;Thêm theme&quot; để tạo.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {themes.map((theme) => (
                  <Card key={theme._id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{theme.name}</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewColors(theme.colors)}
                          >
                            Xem trước
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(theme)}>
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(theme)}
                          >
                            Xóa
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1">
                        {COLOR_KEYS.map((key) => (
                          <div
                            key={key}
                            className="w-8 h-8 rounded border border-slate-200"
                            style={{ backgroundColor: theme.colors[key] }}
                            title={`${key}: ${theme.colors[key]}`}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-700">Xem trước bộ màu</h3>
            {previewColors ? (
              <ThemePreview colors={previewColors} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  Chọn &quot;Xem trước&quot; trên một theme để hiển thị tại đây.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <ThemeFormModal
          initialName={modalInitialName}
          initialColors={modalInitialColors}
          onClose={() => {
            setModalOpen(false);
            setEditingTheme(null);
          }}
          onSave={handleSave}
          saveLoading={saveLoading}
        />
      )}
    </div>
  );
}
