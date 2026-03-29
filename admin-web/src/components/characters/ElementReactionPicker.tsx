import { useEffect, useRef, useState } from 'react';
import { ELEMENT_OPTIONS, type ElementOption } from './characterDetailUtils';

const HEIGHT = 52;
const CLOSED_W = 128;
/** 7 icon × 40px + gaps + padding — không có nút X */
const OPEN_W = 340;

const ELEMENT_ACCENT: Record<ElementOption, string> = {
  anemo: '#74C2A3',
  cryo: '#9FD4E6',
  dendro: '#A6C938',
  electro: '#B794F6',
  geo: '#FAB632',
  hydro: '#4FC3F7',
  pyro: '#FF7A64',
};

const ELEMENT_BG: Record<ElementOption, string> = {
  anemo: '#E8F8F2',
  cryo: '#E8F6FC',
  dendro: '#F4F8E8',
  electro: '#F3EDFC',
  geo: '#FFF8E8',
  hydro: '#E8F7FE',
  pyro: '#FFF0EC',
};

function normalizeSelected(raw: string): ElementOption | 'none' {
  const s = (raw || '').toLowerCase();
  if (s === 'none' || !s) return 'none';
  return (ELEMENT_OPTIONS as readonly string[]).includes(s) ? (s as ElementOption) : 'none';
}

export interface ElementReactionPickerProps {
  selectedElement: string;
  onSelect: (element: string) => void;
}

export function ElementReactionPicker({
  selectedElement,
  onSelect,
}: ElementReactionPickerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const current = normalizeSelected(selectedElement);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const root = wrapRef.current;
      if (!root || root.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isOpen]);

  const handlePick = (id: ElementOption) => {
    onSelect(id);
  };

  const closedLabel =
    current === 'none' ? 'Không' : current.charAt(0).toUpperCase() + current.slice(1);

  return (
    <div className="flex w-full justify-center py-1">
      <div
        ref={wrapRef}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          height: HEIGHT,
          width: isOpen ? OPEN_W : CLOSED_W,
          transition: 'width 0.35s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 999,
            background: '#fff',
            boxShadow: '0 2px 14px rgba(0,0,0,0.13)',
            zIndex: 0,
          }}
        />

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            position: 'relative',
            zIndex: 1,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: '100%',
            border: 'none',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 700,
            borderRadius: 999,
            background: 'transparent',
            color: current !== 'none' ? ELEMENT_ACCENT[current] : '#65676B',
            width: isOpen ? 0 : CLOSED_W,
            opacity: isOpen ? 0 : 1,
            padding: isOpen ? 0 : '0 18px',
            overflow: 'hidden',
            transition: 'width 0.25s ease, opacity 0.18s ease, padding 0.25s ease',
          }}
        >
          <span style={{ fontSize: 20, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
            {current === 'none' ? (
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-gray-400"
                aria-hidden
              >
                <svg className="h-3.5 w-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </span>
            ) : (
              <img
                src={`/assets/images/element/${current}.webp`}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover"
                draggable={false}
              />
            )}
          </span>
          <span style={{ whiteSpace: 'nowrap' }}>{closedLabel}</span>
        </button>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '0 12px',
            zIndex: 1,
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        >
          {ELEMENT_OPTIONS.map((el, i) => {
            const accent = ELEMENT_ACCENT[el];
            const bg = ELEMENT_BG[el];
            const isHover = hovered === el;
            const isSel = current === el;
            return (
              <div
                key={el}
                role="button"
                tabIndex={0}
                onClick={() => handlePick(el)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePick(el);
                  }
                }}
                onMouseEnter={() => setHovered(el)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transform: (() => {
                    if (!isOpen) return 'scale(0.4) translateY(8px)';
                    if (isHover) return 'scale(1.45) translateY(-7px)';
                    if (isSel) return 'scale(1.2)';
                    return 'scale(1)';
                  })(),
                  opacity: isOpen ? 1 : 0,
                  transition: `
                    opacity   0.22s ease                           ${isOpen ? i * 38 : 0}ms,
                    transform 0.26s cubic-bezier(.34,1.56,.64,1)  ${isOpen ? i * 38 : 0}ms
                  `,
                  zIndex: isHover ? 10 : 1,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -30,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.72)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 20,
                    padding: '2px 8px',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    opacity: isHover ? 1 : 0,
                    transition: 'opacity 0.15s',
                    zIndex: 20,
                  }}
                >
                  {el.charAt(0).toUpperCase() + el.slice(1)}
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none',
                    background: isHover || isSel ? bg : '#F0F2F5',
                    border: isSel ? `2.5px solid ${accent}` : '2.5px solid transparent',
                    boxShadow: isHover ? `0 0 0 3px ${accent}33` : 'none',
                    transition: 'background 0.15s, border 0.15s, box-shadow 0.15s',
                  }}
                >
                  <img
                    src={`/assets/images/element/${el}.webp`}
                    alt={el}
                    className="h-[22px] w-[22px] object-contain"
                    draggable={false}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
