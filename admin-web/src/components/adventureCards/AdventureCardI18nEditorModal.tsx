import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { I18nEditorPanel } from '../i18n/I18nEditorPanel';
import { fadeInOverlay, scaleInModal } from '../animations/motionPresets';
import type { EditLang } from '../LangDropdown';

interface AdventureCardI18nEditorModalProps {
  open: boolean;
  field: 'name' | 'description' | null;
  title: string;
  editLang: EditLang;
  getFormI18n: (lang: EditLang) => string;
  setFormI18n: (lang: EditLang, val: string) => void;
  onTranslate: () => Promise<void>;
  onSave: () => void | Promise<void>;
  onClose: () => void;
  translateLoading: boolean;
  error: string | null;
}

export function AdventureCardI18nEditorModal({
  open,
  field,
  title,
  editLang,
  getFormI18n,
  setFormI18n,
  onTranslate,
  onSave,
  onClose,
  translateLoading,
  error,
}: AdventureCardI18nEditorModalProps) {
  if (!open || !field || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
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
        <I18nEditorPanel
          title={title}
          fieldType={field === 'name' ? 'name' : 'description'}
          editLang={editLang}
          getValue={getFormI18n}
          onChange={setFormI18n}
          onTranslate={onTranslate}
          onSave={() => void onSave()}
          onClose={onClose}
          translateLoading={translateLoading}
          error={error}
        />
      </motion.div>
    </div>,
    document.body
  );
}
