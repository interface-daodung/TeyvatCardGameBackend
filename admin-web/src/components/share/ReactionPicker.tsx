import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

const HEIGHT = 64;
const DEFAULT_CLOSED_W = 156;
const ICON_SIZE = 56;
const GAP = 6;
const PADDING_H = 14;
const STAGGER_MS = 38;

/** Chiều rộng thanh mở: padding + N icon + khe giữa các icon. */
export function reactionPickerOpenWidth(itemCount: number): number {
  if (itemCount <= 0) return DEFAULT_CLOSED_W;
  return PADDING_H * 2 + itemCount * ICON_SIZE + Math.max(0, itemCount - 1) * GAP;
}

export type ReactionPickerItem = {
  id: string;
  label: string;
  /** Viền / hover — hex 6 ký tự (vd. #4FC3F7) để ghép shadow 33 */
  accentColor: string;
  bgColor: string;
  /** Icon trong vòng trên thanh mở */
  icon: ReactNode;
  /** Icon nút đóng (mặc định dùng `icon`) — thường ảnh lớn hơn */
  closedIcon?: ReactNode;
};

function ReactionPickerIconRow({
  items,
  selectedId,
  onSelect,
  expanded,
}: {
  items: ReactionPickerItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  expanded: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: GAP,
        padding: `0 ${PADDING_H}px`,
        zIndex: 1,
        pointerEvents: expanded ? 'auto' : 'none',
      }}
    >
      {items.map((item, i) => {
        const { id, label, accentColor, bgColor, icon } = item;
        const isHover = hovered === id;
        const isSel = selectedId === id;
        return (
          <div
            key={id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(id);
              }
            }}
            onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: 'relative',
              cursor: 'pointer',
              flexShrink: 0,
              transform: (() => {
                if (!expanded) return 'scale(0.4) translateY(8px)';
                if (isHover) return 'scale(1.45) translateY(-7px)';
                if (isSel) return 'scale(1.2)';
                return 'scale(1)';
              })(),
              opacity: expanded ? 1 : 0,
              transition: `
                    opacity   0.22s ease                           ${expanded ? i * STAGGER_MS : 0}ms,
                    transform 0.26s cubic-bezier(.34,1.56,.64,1)  ${expanded ? i * STAGGER_MS : 0}ms
                  `,
              zIndex: isHover ? 10 : 1,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -38,
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
              {label}
            </div>
            <div
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                background: isHover || isSel ? bgColor : '#F0F2F5',
                border: isSel ? `2.5px solid ${accentColor}` : '2.5px solid transparent',
                boxShadow: isHover ? `0 0 0 3px ${accentColor}33` : 'none',
                transition: 'background 0.15s, border 0.15s, box-shadow 0.15s',
              }}
            >
              {icon}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Viên pill + hàng icon (luôn “mở”) — dùng trong menu hoặc layout tùy chỉnh. */
export type ReactionPickerRailProps = {
  items: ReactionPickerItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
  style?: CSSProperties;
  openWidth?: number;
};

export function ReactionPickerRail({ items, selectedId, onSelect, className, style, openWidth: openW }: ReactionPickerRailProps) {
  const w = openW ?? reactionPickerOpenWidth(items.length);
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        height: HEIGHT,
        width: w,
        ...style,
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
      <ReactionPickerIconRow items={items} selectedId={selectedId} onSelect={onSelect} expanded />
    </div>
  );
}

/** Trigger giống select: mở panel chỉ có hàng icon; không nút đóng — chọn hoặc click ra ngoài. */
export type ReactionPickerMenuProps = {
  items: ReactionPickerItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  placeholder: string;
  /** className cho nút mở (mặc định giống select cũ) */
  triggerClassName?: string;
  /** id cho trigger (a11y) */
  triggerId?: string;
  /** Label ẩn cho combobox */
  'aria-label'?: string;
};

const DEFAULT_TRIGGER_CLASS =
  'relative w-full appearance-none pl-3 pr-9 py-2.5 text-sm font-medium border border-input rounded-lg bg-background shadow-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer ' +
  'hover:border-muted-foreground/30 flex items-center gap-2 text-left';

export function ReactionPickerMenu({
  items,
  selectedId,
  onSelect,
  placeholder,
  triggerClassName,
  triggerId,
  'aria-label': ariaLabel,
}: ReactionPickerMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = selectedId ? items.find((it) => it.id === selectedId) : undefined;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root || root.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const handlePick = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={triggerClassName ?? DEFAULT_TRIGGER_CLASS}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1 flex items-center gap-2">
          {selected ? (
            <>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md [&_img]:h-full [&_img]:w-full [&_img]:object-contain">
                {selected.closedIcon ?? selected.icon}
              </span>
              <span className="capitalize truncate text-foreground">{selected.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">
          ▼
        </span>
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 z-[100] mt-2 flex justify-center px-0"
          role="listbox"
          aria-labelledby={triggerId}
        >
          <ReactionPickerRail items={items} selectedId={selectedId} onSelect={handlePick} />
        </div>
      )}
    </div>
  );
}

export type ReactionPickerProps = {
  items: ReactionPickerItem[];
  /** null = trạng thái “trống” (hiển thị emptyLabel + emptyClosedIcon) */
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyLabel?: string;
  emptyClosedIcon?: ReactNode;
  /** Màu chữ nút đóng khi chưa chọn (mặc định xám) */
  emptyAccentColor?: string;
  closedWidth?: number;
  /** Mặc định tính theo số item */
  openWidth?: number;
  className?: string;
};

export function ReactionPicker({
  items,
  selectedId,
  onSelect,
  emptyLabel = '—',
  emptyClosedIcon,
  emptyAccentColor = '#65676B',
  closedWidth = DEFAULT_CLOSED_W,
  openWidth: openWidthProp,
  className,
}: ReactionPickerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openWidth = openWidthProp ?? reactionPickerOpenWidth(items.length);

  const selected = selectedId ? items.find((it) => it.id === selectedId) : undefined;

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

  const closedLabel = selected ? selected.label : emptyLabel;
  const closedColor = selected ? selected.accentColor : emptyAccentColor;

  return (
    <div className={className ?? 'flex w-full justify-center py-1'}>
      <div
        ref={wrapRef}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          height: HEIGHT,
          width: isOpen ? openWidth : closedWidth,
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
            color: closedColor,
            width: isOpen ? 0 : closedWidth,
            opacity: isOpen ? 0 : 1,
            padding: isOpen ? 0 : '0 18px',
            overflow: 'hidden',
            transition: 'width 0.25s ease, opacity 0.18s ease, padding 0.25s ease',
          }}
        >
          <span style={{ fontSize: 20, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
            {selected ? (
              selected.closedIcon ?? selected.icon
            ) : (
              emptyClosedIcon ?? (
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gray-400"
                  aria-hidden
                >
                  <svg className="h-[18px] w-[18px] text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </span>
              )
            )}
          </span>
          <span style={{ whiteSpace: 'nowrap' }}>{closedLabel}</span>
        </button>

        <ReactionPickerIconRow items={items} selectedId={selectedId} onSelect={onSelect} expanded={isOpen} />
      </div>
    </div>
  );
}
