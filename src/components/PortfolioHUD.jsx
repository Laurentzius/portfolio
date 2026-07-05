import { checkIsMobileLayout } from '../utils/device.js';
import React from 'react';
import { gsap } from 'gsap';
import TargetCursor from './TargetCursor.jsx';
import { getLocale, toggleLocale, onLocaleChange, initStoredLocale, t_ } from '../utils/i18n.js';

const NAV_IDS = ['welcome', 'about', 'skills', 'experience', 'contact'];

export default function PortfolioHUD() {
  const [isRestored, setIsRestored] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [sectionData, setSectionData] = React.useState(null);
  const [locale, setLocaleState] = React.useState(getLocale);
  const containerRef = React.useRef(null);

  // Subscribe to locale changes
  React.useEffect(() => { initStoredLocale(); return onLocaleChange(setLocaleState); }, []);

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

    return () => {
      window.removeEventListener('cube-restored', handleRestored);
      window.removeEventListener('portfolio:section-data', handleSectionData);
    };
  }, []);

  const shouldShowCard = isMobile && sectionData && sectionData.sectionId !== 'contact';

  React.useEffect(() => {
    if (!isRestored) return;

    const ctx = gsap.context(() => {
      gsap.fromTo('.branding',
        { opacity: 0, y: -25 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.1 }
      );
      gsap.fromTo('.subtitle',
        { opacity: 0, y: -25 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.25 }
      );

      gsap.fromTo('.portfolio-nav button',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', delay: 0.4 }
      );

      if (shouldShowCard) {
        gsap.fromTo('.mobile-portfolio-card',
          { opacity: 0, scale: 0.9, y: 15 },
          { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.6 }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [isRestored]);

  const getMinimalText = () => {
    if (!sectionData) return '';
    const sectionId = sectionData.sectionId;
    if (sectionId === 'welcome') {
      return isRestored ? t_('hud.restored') : t_('hud.compromised');
    }
    const maps = {
      about: t_('hud.about'),
      skills: t_('hud.skills'),
      experience: t_('hud.experience'),
    };
    return maps[sectionId] || `${sectionData.data.title} — ${sectionData.data.subtitle}`;
  };

  const navLabels = t_('nav');

  return (
    <>
      <div ref={containerRef} className={`hud-container ${isRestored ? 'hud-container--visible' : 'hud-container--hidden'}`}>
      {!isMobile && <TargetCursor targetSelector=".cursor-target" spinDuration={2} hoverDuration={0.2} isRestored={isRestored} />}

      <header className="header-hud">
        <div className="branding">{t_('branding')}</div>
        <div className="subtitle">{t_('subtitle')}</div>
      </header>

      {shouldShowCard && (
        <div className="mobile-portfolio-card">
          {getMinimalText()}
        </div>
      )}

      <nav className="portfolio-nav" aria-label="Portfolio sections">
        {NAV_IDS.map((id) => (
          <button type="button" className="cursor-target" data-section={id} key={id}>
            <span className="nav-label-text">{navLabels[id] || id.toUpperCase()}</span>
          </button>
        ))}
      </nav>

      {isRestored && (
        <button
          type="button"
          className="lang-toggle cursor-target"
          onClick={toggleLocale}
          aria-label={locale === 'en' ? 'Switch to Russian' : 'Переключить на английский'}
        >
          {t_('langLabel')}
        </button>
      )}
    </div>
    </>
  );
}
