import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function TargetCursor({
  targetSelector = '.cursor-target',
  spinDuration = 2,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
  parallaxOn = true,
  isRestored = false,
}) {
  const cursorRef = useRef(null);
  const cornersRef = useRef([]);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    if (!isRestored) {
      document.body.style.cursor = 'default';
      gsap.set(cursor, { opacity: 0, display: 'none' });
      return;
    }

    // When restored:
    gsap.set(cursor, { display: 'block' });
    gsap.fromTo(cursor, { opacity: 0 }, { opacity: 1, duration: 1.5, ease: 'power2.out' });

    const targets = [...document.querySelectorAll(targetSelector)];
    const corners = cornersRef.current.filter(Boolean);
    const previousCursor = document.body.style.cursor;
    let activeTarget = null;

    if (hideDefaultCursor) {
      document.body.style.cursor = 'none';
      targets.forEach(target => {
        target.dataset.previousCursor = target.style.cursor;
        target.style.cursor = 'none';
      });
    }
    const spin = gsap.to(cursor, {
      rotate: 360,
      duration: spinDuration,
      repeat: -1,
      ease: 'none',
    });

    const moveCursor = (event) => {
      if (activeTarget) return;
      gsap.to(cursor, {
        x: event.clientX,
        y: event.clientY,
        duration: 0.12,
        ease: 'power3.out',
      });
    };

    const lockToTarget = (target) => {
      activeTarget = target;
      const rect = target.getBoundingClientRect();
      spin.pause();
      gsap.to(cursor, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width + 18,
        height: rect.height + 18,
        rotate: 0,
        duration: hoverDuration,
        ease: 'power3.out',
      });
      gsap.to(corners, {
        opacity: 1,
        duration: hoverDuration,
        ease: 'power2.out',
      });
    };

    const unlockTarget = () => {
      activeTarget = null;
      spin.resume();
      gsap.to(cursor, {
        width: 34,
        height: 34,
        duration: hoverDuration,
        ease: 'power3.out',
      });
    };

    const parallax = (event) => {
      if (!parallaxOn || !activeTarget) return;
      const rect = activeTarget.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      gsap.to(corners, {
        x: x * 5,
        y: y * 5,
        duration: 0.18,
        ease: 'power2.out',
      });
    };

    const resetParallax = () => {
      gsap.to(corners, { x: 0, y: 0, duration: 0.18, ease: 'power2.out' });
    };

    const cleanups = targets.map(target => {
      const enter = () => lockToTarget(target);
      const leave = () => {
        unlockTarget();
        resetParallax();
      };
      target.addEventListener('mouseenter', enter);
      target.addEventListener('mousemove', parallax);
      target.addEventListener('mouseleave', leave);
      return () => {
        target.removeEventListener('mouseenter', enter);
        target.removeEventListener('mousemove', parallax);
        target.removeEventListener('mouseleave', leave);
        if (hideDefaultCursor) {
          target.style.cursor = target.dataset.previousCursor || '';
          delete target.dataset.previousCursor;
        }
      };
    });

    window.addEventListener('mousemove', moveCursor);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      cleanups.forEach(cleanup => cleanup());
      spin.kill();
      gsap.killTweensOf([cursor, ...corners]);
      if (hideDefaultCursor) {
        document.body.style.cursor = previousCursor;
      }
    };
  }, [targetSelector, spinDuration, hideDefaultCursor, hoverDuration, parallaxOn, isRestored]);

  return (
    <div className="target-cursor" ref={cursorRef} aria-hidden="true">
      {['tl', 'tr', 'br', 'bl'].map((corner, index) => (
        <span
          className={`target-cursor__corner target-cursor__corner--${corner}`}
          key={corner}
          ref={node => { cornersRef.current[index] = node; }}
        />
      ))}
    </div>
  );
}
