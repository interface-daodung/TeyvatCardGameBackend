import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faLayerGroup, faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import { type ThemeColors } from '../../services/themeService';
import { generateWarmColors } from './themeColorUtils';

export function ThemePreview({ colors }: { colors: ThemeColors }) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [warmColor2, warmColor3] = generateWarmColors(colors.accent);

  return (
    <div
      className="rounded-xl overflow-hidden border shadow-lg"
      style={{ backgroundColor: colors.background, color: colors.text, borderColor: colors.secondary }}
    >
      <div className="border-b p-3 flex items-center justify-between" style={{ borderColor: colors.secondary }}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FontAwesomeIcon icon={faPalette} />
          Preview giao diện
        </div>
        <button
          type="button"
          className="w-7 h-7 rounded border text-xs"
          style={{ borderColor: colors.secondary, color: colors.text, backgroundColor: colors.surface }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <div className="p-4 space-y-4" style={{ backgroundColor: colors.background }}>
        <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: colors.secondary, backgroundColor: colors.surface }}>
          <div
            className="gradient-text leading-none mb-2 pb-2"
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              backgroundImage: `linear-gradient(to bottom, ${colors.accent}, ${warmColor2}, ${warmColor3})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            TEYVAT CARD GAME
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              onMouseEnter={() => setHoveredAction('primary')}
              onMouseLeave={() => setHoveredAction(null)}
              style={{ backgroundColor: colors.primary, color: hoveredAction === 'primary' ? colors.neutral : colors.text }}
            >
              Nút chính
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded text-sm font-medium border transition-colors"
              onMouseEnter={() => setHoveredAction('secondary')}
              onMouseLeave={() => setHoveredAction(null)}
              style={{
                borderColor: colors.secondary,
                color: hoveredAction === 'secondary' ? colors.neutral : colors.text,
                backgroundColor: colors.surface,
              }}
            >
              Nút phụ
            </button>
          </div>
        </div>

        <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: colors.secondary, backgroundColor: colors.surface }}>
          <div className="flex items-center gap-2 text-sm font-medium">
            <FontAwesomeIcon icon={faLayerGroup} />
            Khung kiểu tranh
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['Chi tiết', 'Khung viền', 'Nội dung'].map((label) => (
              <div
                key={label}
                className="rounded-md border p-2 text-xs text-center"
                style={{ borderColor: colors.secondary, backgroundColor: colors.surface, color: colors.text }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-3" style={{ borderColor: colors.secondary, backgroundColor: colors.surface }}>
          <div className="flex items-start gap-2 text-sm">
            <FontAwesomeIcon icon={faCircleInfo} style={{ color: colors.primary }} className="mt-0.5" />
            <div>
              <div className="font-medium">Popup mô phỏng</div>
              <p style={{ color: hoveredAction ? colors.neutral : colors.text }}>
                Đây là ví dụ popup khi nhấn thao tác trong giao diện.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
