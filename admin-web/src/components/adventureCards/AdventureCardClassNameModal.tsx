import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ClassNamePickerPanel } from './ClassNamePickerPanel';
import { fadeInOverlay, scaleInModal } from '../animations/motionPresets';
import type { AdventureCard } from '../../services/gameDataService';

interface AdventureCardClassNameModalProps {
  open: boolean;
  form: Partial<AdventureCard>;
  editCard: AdventureCard;
  onClose: () => void;
  onSelectClassName: (className: string) => void;
}

export function AdventureCardClassNameModal({
  open,
  form,
  editCard,
  onClose,
  onSelectClassName,
}: AdventureCardClassNameModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        variants={fadeInOverlay}
        initial="hidden"
        animate="visible"
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={scaleInModal}
        initial="hidden"
        animate="visible"
      >
        <ClassNamePickerPanel
          title="Select class name"
          currentValue={form.className ?? editCard.className ?? ''}
          onSelect={(className) => {
            onSelectClassName(className);
          }}
          onClose={onClose}
        />
      </motion.div>
    </div>,
    document.body
  );
}
