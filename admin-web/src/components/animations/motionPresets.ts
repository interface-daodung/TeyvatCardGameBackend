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

