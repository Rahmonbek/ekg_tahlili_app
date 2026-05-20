import React from 'react';
import { motion, useInView } from 'framer-motion';

export default function Reveal({ as = 'div', className = '', variants, children, amount = 0.15, ...props }) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { amount, once: false });
  const Component = motion[as] || motion.div;

  return (
    <Component
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      {...props}
    >
      {children}
    </Component>
  );
}
