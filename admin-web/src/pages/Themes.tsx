import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent } from '../components/ui/card';
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
import { fadeSlideCard } from '../components/animations/motionPresets';
import { ThemePreview } from '../components/themes/ThemePreview';
import { ThemePaletteCard } from '../components/themes/ThemePaletteCard';
import { ThemeFormModal } from '../components/themes/ThemeFormModal';

const COLOR_KEYS: (keyof ThemeColors)[] = ['primary', 'secondary', 'accent', 'neutral', 'background', 'surface', 'text'];

function getDefaultPreviewColors(themes: Theme[]): ThemeColors {
  const defaultTheme = themes.find((theme) => theme.name.toLowerCase() === 'default');
  if (defaultTheme) return defaultTheme.colors;
  if (themes.length > 0) return themes[0].colors;
  return defaultThemeColors();
}

function getPreviewThemeId(themes: Theme[]): string {
  const defaultTheme = themes.find((theme) => theme.name.toLowerCase() === 'default');
  if (defaultTheme) return defaultTheme._id;
  if (themes.length > 0) return themes[0]._id;
  return 'default';
}

export default function Themes() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [previewColors, setPreviewColors] = useState<ThemeColors>(defaultThemeColors());
  const [previewThemeId, setPreviewThemeId] = useState<string>('default');
  const [saveLoading, setSaveLoading] = useState(false);

  const setPreviewByTheme = useCallback((theme: Theme) => {
    setPreviewThemeId(theme._id);
    setPreviewColors(theme.colors);
  }, []);

  const syncPreviewByList = useCallback(
    (list: Theme[]) => {
      if (list.length === 0) {
        setPreviewThemeId('default');
        setPreviewColors(defaultThemeColors());
        return;
      }
      const current = list.find((theme) => theme._id === previewThemeId);
      if (current) {
        setPreviewColors(current.colors);
        return;
      }
      setPreviewThemeId(getPreviewThemeId(list));
      setPreviewColors(getDefaultPreviewColors(list));
    },
    [previewThemeId]
  );

  const fetchThemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getThemes();
      setThemes(list);
      syncPreviewByList(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách theme.');
    } finally {
      setLoading(false);
    }
  }, [syncPreviewByList]);

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
      if (editingTheme) await updateTheme(editingTheme._id, { name, colors });
      else await createTheme({ name, colors });

      await fetchThemes();
      setModalOpen(false);
      setEditingTheme(null);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (theme: Theme) => {
    if (theme.name.toLowerCase() === 'default') {
      setError('Theme "default" không thể xóa, chỉ có thể chỉnh sửa.');
      return;
    }
    if (!window.confirm(`Xóa theme "${theme.name}"?`)) return;

    try {
      await deleteTheme(theme._id);
      await fetchThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại.');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Themes" description="Chỉnh sửa và kiểm tra các bộ màu (lưu trong DB, collection themes)" />
        <Button type="button" onClick={openCreate}>
          Thêm theme
        </Button>
      </div>

      {error && (
        <motion.div className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm" variants={fadeSlideCard} initial="hidden" animate="visible">
          {error}
        </motion.div>
      )}

      {loading ? (
        <div className="text-slate-500">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-700">Danh sách theme</h3>
            {themes.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">Chưa có theme. Bấm &quot;Thêm theme&quot; để tạo.</CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {themes.map((theme) => {
                  const isDefault = theme.name.toLowerCase() === 'default';
                  const isPreviewing = previewThemeId === theme._id;
                  return (
                    <ThemePaletteCard
                      key={theme._id}
                      theme={theme}
                      colorKeys={COLOR_KEYS}
                      isDefault={isDefault}
                      isPreviewing={isPreviewing}
                      onPreview={() => setPreviewByTheme(theme)}
                      onEdit={() => openEdit(theme)}
                      onDelete={() => handleDelete(theme)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-700">Xem trước bộ màu</h3>
            <ThemePreview colors={previewColors} />
          </div>
        </div>
      )}

      {modalOpen && (
        <ThemeFormModal
          initialName={editingTheme?.name ?? ''}
          initialColors={editingTheme?.colors ?? defaultThemeColors()}
          colorKeys={COLOR_KEYS}
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
