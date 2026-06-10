import { checkIsMobileLayout } from '../utils/device.js';
import React from 'react';
import { gsap } from 'gsap';
import TargetCursor from './TargetCursor.jsx';

const NAV_SECTIONS = [
  { id: 'welcome', label: 'HOME' },
  { id: 'about', label: 'ABOUT' },
  { id: 'skills', label: 'SKILLS' },
  { id: 'experience', label: 'WORK' },
  { id: 'contact', label: 'CONTACT' },
];

export default function PortfolioHUD() {
  const [isRestored, setIsRestored] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [lockedHintActive, setLockedHintActive] = React.useState(false);
  const [sectionData, setSectionData] = React.useState(null);
  const containerRef = React.useRef(null);
  React.useEffect(() => {
    const handleRestored = () => {
      setIsRestored(true);
      document.body.classList.add('cube-is-restored');
    };
    window.addEventListener('cube-restored', handleRestored);

    const handleSectionData = (e) => {
      setSectionData(e.detail);
    };
    window.addEventListener('portfolio:section-data', handleSectionData);

    const checkMobile = () => {
      setIsMobile(checkIsMobileLayout());
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Initial check (in case it is already restored when HUD mounts)
    if (window.experience?.repair?.repairedCount === 3) {
      setIsRestored(true);
      document.body.classList.add('cube-is-restored');
    }
    let hintTimeout = null;
    const handleLockedHint = () => {
      setLockedHintActive(true);
      if (hintTimeout) clearTimeout(hintTimeout);
      hintTimeout = setTimeout(() => {
        setLockedHintActive(false);
      }, 1200);
    };
    window.addEventListener('portfolio:locked-hint', handleLockedHint);

    return () => {
      window.removeEventListener('cube-restored', handleRestored);
      window.removeEventListener('portfolio:section-data', handleSectionData);
      window.removeEventListener('portfolio:locked-hint', handleLockedHint);
      window.removeEventListener('resize', checkMobile);
      if (hintTimeout) clearTimeout(hintTimeout);
    };
  }, []);

  const shouldShowCard = isMobile && sectionData && sectionData.sectionId !== 'contact';

  React.useEffect(() => {
    if (!isRestored) return;

    const ctx = gsap.context(() => {
      // 1. Animate header-hud
      gsap.fromTo('.branding',
        { opacity: 0, y: -25 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.1 }
      );
      gsap.fromTo('.subtitle',
        { opacity: 0, y: -25 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.25 }
      );

      // 2. Animate navigation buttons
      gsap.fromTo('.portfolio-nav button',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', delay: 0.4 }
      );

      // 3. Animate mobile portfolio card if it is rendered
      if (shouldShowCard) {
        gsap.fromTo('.mobile-portfolio-card',
          { opacity: 0, scale: 0.9, y: 15 },
          { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.6 }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [isRestored, shouldShowCard]);

  const getMinimalText = () => {
    if (!sectionData) return '';
    const sectionId = sectionData.sectionId;
    if (sectionId === 'welcome') {
      return isRestored
        ? "HAKON — Fullstack / AI First Engineer"
        : "Database Compromised — Tap pieces to restore";
    }
    // Map section IDs to minimal one-liners
    const maps = {
      about: "ABOUT — Designing tactile interactions",
      skills: "STACK — WebGL, React, Astro",
      experience: "WORK — Voxel, Shader, Audio Projects",
    };
    return maps[sectionId] || `${sectionData.data.title} — ${sectionData.data.subtitle}`;
  };

  return (
    <>
      <div className={`locked-hint-toast ${lockedHintActive ? 'locked-hint-toast--visible' : ''}`}>
        RESTORE MISSING CUBIES FIRST
      </div>
      <div ref={containerRef} className={`hud-container ${isRestored ? 'hud-container--visible' : 'hud-container--hidden'}`}>
      <TargetCursor targetSelector=".cursor-target" spinDuration={2} hoverDuration={0.2} isRestored={isRestored} />

      <header className="header-hud">
        <div className="branding">XAKON.DEV // CORE</div>
        <div className="subtitle">SYSTEM // ONLINE</div>
      </header>

      {shouldShowCard && (
        <div className="mobile-portfolio-card">
          {getMinimalText()}
        </div>
      )}

      <nav className="portfolio-nav" aria-label="Portfolio sections">
        {NAV_SECTIONS.map(({ id, label }) => (
          <button type="button" className="cursor-target" data-section={id} key={id}>
            <span className="nav-label-text">{label}</span>
          </button>
        ))}
      </nav>
    </div>
    </>
  );
}

