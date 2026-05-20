import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const largeX = useSpring(cursorX, { damping: 25, stiffness: 700 });
  const largeY = useSpring(cursorY, { damping: 25, stiffness: 700 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    const move = (event) => {
      cursorX.set(event.clientX);
      cursorY.set(event.clientY);
    };
    const enter = (event) => {
      if (event.target.closest('a, button, .nmed-hover-target')) setActive(true);
    };
    const leave = (event) => {
      if (event.target.closest('a, button, .nmed-hover-target')) setActive(false);
    };

    window.addEventListener('mousemove', move);
    document.addEventListener('mouseover', enter);
    document.addEventListener('mouseout', leave);

    return () => {
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', enter);
      document.removeEventListener('mouseout', leave);
    };
  }, [cursorX, cursorY]);

  return (
    <>
      <motion.div className="nmed-cursor-dot" style={{ x: cursorX, y: cursorY }} />
      <motion.div
        className="nmed-cursor-ring"
        animate={{ scale: active ? 2.4 : 1, opacity: active ? 0.75 : 0.42 }}
        style={{ x: largeX, y: largeY }}
      />
    </>
  );
}
