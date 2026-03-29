import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type LightboxImage = {
  src: string;
  alt?: string;
};

/** Nội dung tùy chỉnh (vd. canvas Phaser) thay cho thẻ img. */
export type LightboxCustom = {
  type: 'custom';
  label: string;
  children: ReactNode;
};

export type ImageLightboxOpen = LightboxImage | LightboxCustom;

function isLightboxCustom(open: ImageLightboxOpen): open is LightboxCustom {
  return 'type' in open && open.type === 'custom';
}

export function ImageLightbox({
  open,
  onClose,
  dialogLabel = 'Ảnh phóng to',
  /** Ảnh nhỏ (vd. icon item): phóng to gần full viewport; không dùng cho ảnh lớn (card/character) vì dễ tràn màn hình. */
  smallAssetLightbox = false,
}: {
  open: ImageLightboxOpen | null;
  onClose: () => void;
  dialogLabel?: string;
  smallAssetLightbox?: boolean;
}) {
  const openKey = open
    ? isLightboxCustom(open)
      ? `custom:${open.label}`
      : `img:${open.src}`
    : null;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [openKey, onClose]);

  if (typeof document === 'undefined' || !open) return null;

  const ariaLabel = isLightboxCustom(open) ? open.label : dialogLabel;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white transition-colors hover:bg-white/20"
        aria-label="Đóng"
      >
        ✕
      </button>
      {isLightboxCustom(open) ? (
        <div
          className="flex max-h-[min(100dvh,100vh)] max-w-full flex-col items-center justify-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {open.children}
        </div>
      ) : (
        <img
          src={open.src}
          alt={open.alt ?? ''}
          className={
            smallAssetLightbox
              ? 'h-auto max-h-[min(92dvh,92vh)] w-[min(92vw,960px)] max-w-full object-contain shadow-2xl'
              : 'max-h-[min(100dvh,100vh)] max-w-full object-contain shadow-2xl'
          }
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>,
    document.body
  );
}
