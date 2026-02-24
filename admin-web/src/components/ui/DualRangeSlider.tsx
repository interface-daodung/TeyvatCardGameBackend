import { useEffect, useRef } from 'react';
import noUiSlider from 'nouislider';
import 'nouislider/dist/nouislider.css';

interface DualRangeSliderProps {
  min: number;
  max: number;
  start: [number, number];
  step?: number;
  onChange: (values: [number, number]) => void;
  label?: string;
}

export function DualRangeSlider({
  min,
  max,
  start,
  step = 1,
  onChange,
  label,
}: DualRangeSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (sliderRef.current && !sliderInstanceRef.current) {
      sliderInstanceRef.current = noUiSlider.create(sliderRef.current, {
        start,
        connect: true,
        step,
        range: {
          min,
          max,
        },
        format: {
          to: (value) => Math.round(value),
          from: (value) => Math.round(parseFloat(value)),
        },
      });

      sliderInstanceRef.current.on('change', (values: any) => {
        onChange([parseInt(values[0]), parseInt(values[1])]);
      });
    }

    return () => {
      if (sliderInstanceRef.current) {
        sliderInstanceRef.current.destroy();
        sliderInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (sliderInstanceRef.current) {
      sliderInstanceRef.current.set(start);
    }
  }, [start]);

  return (
    <div className="space-y-6 py-2">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-medium text-muted-foreground">{label}</label>
          <span className="text-xs font-mono bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
            {start[0]} - {start[1]}
          </span>
        </div>
      )}
      <div className="px-2">
        <div ref={sliderRef} className="nouislider-custom" />
      </div>
      <style>{`
        .nouislider-custom {
          height: 6px;
          border: none;
          background: #e2e8f0;
          box-shadow: none;
        }
        .nouislider-custom .noUi-connect {
          background: #ef4444; /* red-500 to match theme */
        }
        .nouislider-custom .noUi-handle {
          width: 18px;
          height: 18px;
          right: -9px;
          top: -6px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #ef4444;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          cursor: pointer;
        }
        .nouislider-custom .noUi-handle:before,
        .nouislider-custom .noUi-handle:after {
          display: none;
        }
      `}</style>
    </div>
  );
}
