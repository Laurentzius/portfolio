import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

/**
 * Magnet component creates a magnetic pull effect towards the mouse cursor.
 * It attaches mouse move listeners to the closest parent button (or itself)
 * and animates the child element using GSAP.
 */
export default function Magnet({ children, strength = 0.3, range = 50 }) {
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const trigger = el.closest('button') || el;

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      // Calculate distance to ensure it's within range
      const distance = Math.hypot(dx, dy);

      if (distance < range) {
        gsap.to(el, {
          x: dx * strength,
          y: dy * strength,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      } else {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1.1, 0.4)',
        overwrite: 'auto',
      });
    };

    trigger.addEventListener('mousemove', handleMouseMove);
    trigger.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      trigger.removeEventListener('mousemove', handleMouseMove);
      trigger.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength, range]);

  return (
    <span ref={elementRef} className="magnet-wrapper" style={{ display: 'inline-block' }}>
      {children}
    </span>
  );
}
