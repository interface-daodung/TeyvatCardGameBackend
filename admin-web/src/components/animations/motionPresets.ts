import type { Variants, Transition } from 'framer-motion';

const defaultEase: Transition['ease'] = 'easeOut';

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
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: defaultEase },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.2, ease: defaultEase },
  },
};

export const fadeInOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: defaultEase },
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
    transition: { duration: 0.22, ease: defaultEase },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: { duration: 0.18, ease: defaultEase },
  },
};

