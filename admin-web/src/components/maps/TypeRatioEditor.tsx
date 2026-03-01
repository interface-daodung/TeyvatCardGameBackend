import { useState } from 'react';
import type { MapTypeRatios } from '../../services/gameDataService';
import {
    TYPE_RATIO_KEYS,
    TYPE_RATIO_ICONS,
    getRatioInputColorClass,
    sumTypeRatios,
    getFreeRatio,
} from './mapUtils';

interface TypeRatioEditorProps {
    typeRatios: MapTypeRatios;
    onChange: (key: keyof MapTypeRatios, value: number) => void;
}

/**
 * Editor for map type ratios with emoji icons, colored inputs, and a read-only "free" indicator.
 * Ensures total never exceeds 100.
 */
export function TypeRatioEditor({ typeRatios, onChange }: TypeRatioEditorProps) {
    const [tooltipKey, setTooltipKey] = useState<keyof MapTypeRatios | 'free' | null>(null);

    const freeRatio = getFreeRatio(typeRatios);
    const canSave = freeRatio === 0;

    const handleChange = (key: keyof MapTypeRatios, rawValue: number) => {
        const sumOthers = sumTypeRatios(typeRatios) - (typeRatios[key] ?? 0);
        const maxAllowed = 100 - sumOthers;
        const value = Math.min(maxAllowed, Math.max(0, rawValue));
        onChange(key, value);
    };

    return (
        <div>
            <label className="block text-sm font-medium mb-2">Type ratios (%)</label>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                {TYPE_RATIO_KEYS.map((key) => (
                    <div
                        key={key}
                        className="flex items-center gap-1.5 shrink-0 relative"
                        onMouseEnter={() => setTooltipKey(key)}
                        onMouseLeave={() => setTooltipKey(null)}
                    >
                        {tooltipKey === key && (
                            <span className="absolute bottom-full left-1/2 -translate-x-14 mb-1 px-2 py-0.5 text-xs font-medium text-white bg-slate-800 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                                {key}
                            </span>
                        )}
                        <span className="text-lg leading-none cursor-help" aria-label={key}>
                            {TYPE_RATIO_ICONS[key]}
                        </span>
                        <input
                            id={`tr-${key}`}
                            type="number"
                            min={0}
                            max={100}
                            value={typeRatios[key] ?? 0}
                            onChange={(e) => handleChange(key, parseInt(e.target.value, 10) || 0)}
                            className={`w-[3.25rem] rounded border px-1.5 py-1 text-sm text-center tabular-nums transition-colors ${getRatioInputColorClass(typeRatios[key] ?? 0)}`}
                            aria-label={key}
                        />
                    </div>
                ))}
                {/* Free ratio: read-only, total always 100 */}
                <div
                    className="flex items-center gap-1.5 shrink-0 relative"
                    onMouseEnter={() => setTooltipKey('free')}
                    onMouseLeave={() => setTooltipKey(null)}
                >
                    {tooltipKey === 'free' && (
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 text-xs font-medium text-white bg-slate-800 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                            free
                        </span>
                    )}
                    <span className="text-lg leading-none cursor-help" aria-label="free">
                        🆓
                    </span>
                    <div
                        role="textbox"
                        aria-label="free ratio"
                        aria-readonly="true"
                        className="w-[3.25rem] rounded border border-slate-300 px-1.5 py-1 text-sm text-center tabular-nums bg-slate-100 text-slate-700 select-none cursor-default pointer-events-none"
                    >
                        {freeRatio}
                    </div>
                </div>
            </div>
            {!canSave && (
                <p className="text-xs text-amber-600 mt-1">
                    Tổng phải bằng 100. Giảm tỉ lệ các loại hoặc tăng đến khi free = 0 để lưu.
                </p>
            )}
        </div>
    );
}
