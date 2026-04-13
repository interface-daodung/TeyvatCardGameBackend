import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/button';
import { type ThemeColors } from '../../services/themeService';
import { scaleInModal, fadeInOverlay } from '../animations/motionPresets';
import { ThemePreview } from './ThemePreview';
import { generateWarmColors } from './themeColorUtils';

export function ThemeFormModal({
  initialName,
  initialColors,
  colorKeys,
  onClose,
  onSave,
  saveLoading,
}: {
  initialName: string;
  initialColors: ThemeColors;
  colorKeys: (keyof ThemeColors)[];
  onClose: () => void;
  onSave: (name: string, colors: ThemeColors) => Promise<void>;
  saveLoading: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [colors, setColors] = useState<ThemeColors>(initialColors);
  const [error, setError] = useState<string | null>(null);
  const [accentWarm2, accentWarm3] = generateWarmColors(colors.accent);

  const setColor = (key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Tên theme không được để trống.');

    const hex = /^#[0-9A-Fa-f]{6}$/;
    for (const k of colorKeys) {
      if (!hex.test(colors[k])) return setError(`Màu "${k}" phải là mã hex (vd: #95245b).`);
    }

    try {
      await onSave(name.trim(), colors);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <motion.div className="absolute inset-0 bg-black/50 cursor-pointer" aria-hidden variants={fadeInOverlay} initial="hidden" animate="visible" onClick={onClose} />
      <motion.div
        className="bg-white rounded-xl shadow-xl max-w-6xl w-full h-[92vh] overflow-hidden relative z-10"
        onClick={(e) => e.stopPropagation()}
        variants={scaleInModal}
        initial="hidden"
        animate="visible"
      >
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <div className="z-10 border-b border-slate-200 px-6 py-4" style={{ backgroundImage: `linear-gradient(120deg, ${colors.accent}, ${accentWarm2}, ${accentWarm3})` }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">{initialName ? 'Chỉnh sửa theme' : 'Thêm theme mới'}</h2>
                <p className="text-sm text-white/90 mt-1">Tinh chỉnh bảng màu và xem preview trực tiếp trong lúc chỉnh sửa.</p>
              </div>
              <button type="button" onClick={onClose} className="w-8 h-8 rounded-md border border-white/50 text-white hover:bg-white/15" title="Đóng popup" aria-label="Đóng popup">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-full">
              <div className="space-y-5 min-w-0">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    Tên theme
                    <FontAwesomeIcon icon={faCircleInfo} className="text-slate-400 text-xs cursor-help" title="Tên duy nhất cho bộ màu, ví dụ: default, dark, light." />
                  </label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800" placeholder="vd: default, dark, light" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="block text-sm font-medium text-slate-700">Màu sắc</span>
                    <FontAwesomeIcon icon={faCircleInfo} className="text-slate-400 text-xs cursor-help" title="Bạn có thể nhập mã hex hoặc chọn trực tiếp bằng color picker." />
                  </div>
                  <div className="space-y-2">
                    {colorKeys.map((key) => (
                      <div key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5">
                        <input type="color" value={colors[key]} onChange={(e) => setColor(key, e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent appearance-none" title={`Chọn màu ${key}`} />
                        <input type="text" value={colors[key]} onChange={(e) => setColor(key, e.target.value)} className="flex-1 rounded-md px-3 py-1.5 text-sm font-mono bg-transparent" placeholder="#000000" title={`Nhập mã hex cho ${key}`} />
                        <span className="text-slate-500 text-sm w-24 capitalize">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {error && <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
              </div>

              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-slate-700">Preview trực tiếp</h3>
                  <FontAwesomeIcon icon={faCircleInfo} className="text-slate-400 text-xs cursor-help" title="Preview này cập nhật ngay khi bạn thay đổi màu trong form." />
                </div>
                <ThemePreview colors={colors} />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-3 bg-white">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={saveLoading}>
                {saveLoading ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
