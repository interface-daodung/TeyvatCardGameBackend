import { useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { scaleInModal, fadeInOverlay } from '../animations/motionPresets';
import { ImageEditModal } from './UploadedImageEditModalBody';

export type UploadedImageEditModalProps = {
  filePath: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function UploadedImageEditModal({ filePath, onClose, onSuccess }: UploadedImageEditModalProps) {
  const closeAttemptRef = useRef<() => void>(() => {});
  const registerCloseAttempt = useCallback((fn: () => void) => {
    closeAttemptRef.current = fn;
  }, []);

  const modal = (
    <div
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 min-h-screen min-w-screen w-full h-full z-[9999] flex items-center justify-center p-4"
      onClick={() => closeAttemptRef.current()}
    >
      <motion.div
        className="absolute inset-0 bg-black/50 cursor-pointer"
        aria-hidden
        variants={fadeInOverlay}
        initial="hidden"
        animate="visible"
        onClick={() => closeAttemptRef.current()}
      />
      <motion.div
        variants={scaleInModal}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-6xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="w-full max-h-[min(96vh,900px)] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Chi tiết ảnh</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => closeAttemptRef.current()}>
              ✕
            </Button>
          </CardHeader>
          <CardContent className="p-5">
            <ImageEditModal
              filePath={filePath}
              onClose={onClose}
              onSuccess={onSuccess}
              registerCloseAttempt={registerCloseAttempt}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  return createPortal(modal, document.body);
}
