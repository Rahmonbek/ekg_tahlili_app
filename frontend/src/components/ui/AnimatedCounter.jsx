import React, { useEffect, useState } from 'react';
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion';

export default function AnimatedCounter({ value, suffix = '', precision = 0 }) {
  const ref = React.useRef(null);
  const inView = useInView(ref, { amount: 0.4, once: false });
  const count = useMotionValue(value);
  const formatValue = (latest) => Number(latest).toLocaleString('en-US', {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  });
  const rounded = useTransform(count, formatValue);
  const [display, setDisplay] = useState(formatValue(value));

  useEffect(() => rounded.on('change', setDisplay), [rounded]);

  useEffect(() => {
    if (!inView) {
      count.set(value);
      return undefined;
    }
    count.set(0);
    const controls = animate(count, value, { duration: 2, ease: 'easeOut' });
    return controls.stop;
  }, [count, inView, precision, value]);

  return (
    <motion.strong ref={ref} className="nmed-counter">
      {display}{suffix}
    </motion.strong>
  );
}
