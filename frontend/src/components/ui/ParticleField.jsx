import React, { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 180;

export default function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    const mouse = { x: -9999, y: -9999 };
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      size: Math.random() * 1.7 + 0.4,
    }));

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const moveMouse = (event) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(0, 212, 170, 0.55)';
      context.strokeStyle = 'rgba(0, 212, 170, 0.08)';

      particles.forEach((particle, index) => {
        let px = particle.x * width;
        let py = particle.y * height;
        const dx = mouse.x - px;
        const dy = mouse.y - py;
        const distance = Math.hypot(dx, dy);

        if (distance < 180) {
          particle.vx += (dx / Math.max(distance, 1)) * 0.008;
          particle.vy += (dy / Math.max(distance, 1)) * 0.008;
        }

        particle.x += particle.vx / width;
        particle.y += particle.vy / height;
        particle.vx *= 0.992;
        particle.vy *= 0.992;

        if (particle.x < 0 || particle.x > 1) particle.vx *= -1;
        if (particle.y < 0 || particle.y > 1) particle.vy *= -1;
        particle.x = Math.min(1, Math.max(0, particle.x));
        particle.y = Math.min(1, Math.max(0, particle.y));

        px = particle.x * width;
        py = particle.y * height;

        context.beginPath();
        context.arc(px, py, particle.size, 0, Math.PI * 2);
        context.fill();

        for (let j = index + 1; j < Math.min(index + 6, particles.length); j += 1) {
          const next = particles[j];
          const nx = next.x * width;
          const ny = next.y * height;
          const gap = Math.hypot(px - nx, py - ny);
          if (gap < 92) {
            context.globalAlpha = (92 - gap) / 92;
            context.beginPath();
            context.moveTo(px, py);
            context.lineTo(nx, ny);
            context.stroke();
            context.globalAlpha = 1;
          }
        }
      });

      animationFrame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', moveMouse);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', moveMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="nmed-particle-field" aria-hidden="true" />;
}
