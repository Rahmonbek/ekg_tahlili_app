export const easeOutExpo = [0.25, 0.46, 0.45, 0.94];

export const fadeUpVariants = {
  hidden: { y: 60, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: easeOutExpo } },
};

export const blurVariants = {
  hidden: { y: 40, opacity: 0, filter: 'blur(12px)' },
  visible: { y: 0, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease: easeOutExpo } },
};

export const scaleVariants = {
  hidden: { scale: 0.85, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.6, ease: easeOutExpo } },
};

export const slideRightVariants = {
  hidden: { x: -80, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.7, ease: easeOutExpo } },
};

export const slideLeftVariants = {
  hidden: { x: 80, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.7, ease: easeOutExpo } },
};

export const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
