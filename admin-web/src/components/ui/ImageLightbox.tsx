import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export type LightboxImage = {
  src: string;
  alt?: string;
};

export function ImageLightbox({
  open,
  onClose,
  dialogLabel = 'Ảnh phóng to',
}: {
  open: LightboxImage | null;
  onClose: () => void;
  dialogLabel?: string;
}) {
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
  }, [open, onClose]);

  if (typeof document === 'undefined' || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
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
      <img
        src={open.src}
        alt={open.alt ?? ''}
        className="max-h-[min(100dvh,100vh)] max-w-full object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
