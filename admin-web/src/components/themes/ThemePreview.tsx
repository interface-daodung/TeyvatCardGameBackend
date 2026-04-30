import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import { type ThemeColors, type ThemeAssets, mergeThemeAssets } from '../../services/themeService';
import { generateWarmColors } from './themeColorUtils';

export function ThemePreview({ colors, assets }: { colors: ThemeColors; assets?: ThemeAssets }) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [warmColor2, warmColor3] = generateWarmColors(colors.accent);
  const resolvedAssets = mergeThemeAssets(assets);
  const surfaceWithOpacity = `${colors.surface}80`;
  const previewIcons = [
    { key: 'compass', label: 'Compass', src: resolvedAssets.icons.compass },
    { key: 'equip', label: 'Equip', src: resolvedAssets.icons.equip },
    { key: 'library', label: 'Library', src: resolvedAssets.icons.library },
  ] as const;

  return (
    <div
      className="rounded-xl overflow-hidden border shadow-lg"
      style={{
        backgroundColor: colors.background,
        color: colors.text,
        borderColor: colors.secondary,
      }}
    >
      <div className="border-b p-3 flex items-center justify-between" style={{ borderColor: colors.secondary }}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FontAwesomeIcon icon={faPalette} />
          UI preview
        </div>
        <button
          type="button"
          className="w-7 h-7 rounded border text-xs"
          style={{ borderColor: colors.secondary, color: colors.text, backgroundColor: colors.surface }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <div
        className="p-4 space-y-4 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${resolvedAssets.background})`,
          backgroundColor: colors.background,
        }}
      >
        <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: colors.secondary, backgroundColor: surfaceWithOpacity }}>
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
              Primary button
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
              Secondary button
            </button>
          </div>
        </div>

        <div className="rounded-lg border p-3" style={{ borderColor: colors.secondary, backgroundColor: surfaceWithOpacity }}>
          <div className="flex items-start gap-2 text-sm">
            <FontAwesomeIcon icon={faCircleInfo} style={{ color: colors.primary }} className="mt-0.5" />
            <div>
              <div className="font-medium">Mock popup</div>
              <p style={{ color: hoveredAction ? colors.neutral : colors.text }}>
                This is an example popup shown when clicking an action in the UI.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3" style={{ borderColor: colors.secondary, backgroundColor: surfaceWithOpacity }}>
          <div className="text-sm font-medium mb-2">Asset icon preview</div>
          <div className="flex items-center gap-2">
            {previewIcons.map((icon) => (
              <img
                key={icon.key}
                src={icon.src}
                alt={icon.label}
                title={icon.label}
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/assets/images/ui/library.webp';
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
