import type { Variants, Transition } from 'framer-motion';

const defaultEase: Transition['ease'] = 'easeOut';
const modalSpring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 22,
  mass: 0.9,
};

export const fadeInText: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: defaultEase },
  },
};

export const fadeInCard: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, ease: defaultEase },
  },
};

export const fadeSlideCard: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (customIndex: number | undefined = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: defaultEase,
      delay: customIndex * 0.06,
    },
  }),
};

export const slideUpItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (customIndex: number | undefined = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: defaultEase,
      delay: customIndex * 0.05,
    },
  }),
};

export const scaleInModal: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...modalSpring,
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: {
      ...modalSpring,
      duration: 0.22,
    },
  },
};

/** Modal/dialog: fade + trượt nhẹ, không scale — shadow/bo góc không bị lệch khi animate. */
export const fadeSlideUpModal: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: defaultEase },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
};

export const fadeInOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: defaultEase },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: defaultEase },
  },
};

export const zoomInPopup: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...modalSpring,
      duration: 0.26,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: {
      ...modalSpring,
      duration: 0.2,
    },
  },
};

export const flipVerticalCard: Variants = {
  initial: { rotateX: 0 },
  hovered: {
    rotateX: 180,
    transition: {
      duration: 0.6,
      ease: defaultEase,
    },
  },
};

const drawerSpring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 32,
  mass: 0.88,
};

/** Panel phụ trượt từ phải (sidebar lịch sử, drawer). */
export const slideInDrawerRight: Variants = {
  hidden: { opacity: 0, x: 28 },
  visible: {
    opacity: 1,
    x: 0,
    transition: drawerSpring,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.24, ease: 'easeIn' },
  },
};

/** Drawer nhân vật: trượt translateX từ phải; ease chung. */
const characterDrawerSlideEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Đổi nhân vật (mode="wait"): exit + enter = 0.5s → mỗi pha 0.25s. */
const characterDrawerSlideDuration = 0.25;

/** Ease chung (Framer) cho item strip khi đổi layout — khớp vỏ CSS ~500ms. */
export const characterDrawerLayoutEase = characterDrawerSlideEase;

export const slideInCharacterDrawer: Variants = {
  hidden: { opacity: 0, x: '100%' },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      x: { duration: characterDrawerSlideDuration, ease: characterDrawerSlideEase },
      opacity: { duration: 0.2, ease: characterDrawerSlideEase },
    },
  },
  /** Đổi thẻ: trượt ra phải rồi drawer mới vào (AnimatePresence mode="wait"). */
  exit: {
    x: '100%',
    opacity: 1,
    transition: {
      x: { duration: characterDrawerSlideDuration, ease: characterDrawerSlideEase },
    },
  },
};

/** Strip / layout trang Characters khi mở drawer (mượt hơn equipment mặc định). */
export const charactersLayoutEase = [0.25, 0.1, 0.25, 1] as const;
export const charactersLayoutDuration = 0.55;

/** Đồng bộ CSS transition vỏ layout (flex) với drawer — ~500ms. */
export const charactersDrawerShellDurationClass = 'duration-[500ms]';
export const charactersDrawerShellEaseClass = 'ease-[cubic-bezier(0.22,1,0.36,1)]';

/** Đồng bộ với chuyển lưới → strip trên trang Equipment */
export const equipmentLayoutEase = [0.32, 0.72, 0, 1] as const;
export const equipmentLayoutDuration = 0.48;

/** Transition Y cho vỏ drawer (mở/đóng lần đầu); đổi item không unmount wrapper → không replay. */
export const equipmentDrawerShellYTransition: Transition = {
  y: {
    duration: equipmentLayoutDuration,
    ease: equipmentLayoutEase,
  },
};

/** FAB neo đáy (portal) khi mở Equipment edit — cùng hệ số với strip, không dùng curve drawer Characters. */
export const equipmentDockFabTransition: Transition = {
  duration: 0.36,
  ease: equipmentLayoutEase,
};

const managerAssetsEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const managerAssetsPreviewDuration = 0.4;
const managerAssetsPreviewExitDuration = 0.36;

/**
 * Image preview (Manager Assets): thu hẹp maxWidth → 0 rồi unmount;
 * khi hiện lại: maxWidth mở dần (AnimatePresence enter).
 */
export const managerAssetsPreviewPanel: Variants = {
  hidden: { maxWidth: 0, opacity: 0 },
  visible: {
    maxWidth: 4800,
    opacity: 1,
    transition: { duration: managerAssetsPreviewDuration, ease: managerAssetsEase },
  },
  exit: {
    maxWidth: 0,
    opacity: 0,
    transition: { duration: managerAssetsPreviewExitDuration, ease: 'easeIn' },
  },
};

/** Layout flex row (preview + cây): co giãn cột không giật (Manager Assets). */
export const managerAssetsTreeRowLayoutTransition: Transition = {
  layout: { duration: 0.38, ease: managerAssetsEase },
};

