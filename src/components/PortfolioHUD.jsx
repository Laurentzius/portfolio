import React from 'react';
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
  const [sectionData, setSectionData] = React.useState(null);

  React.useEffect(() => {
    const handleRestored = () => {
      setIsRestored(true);
    };
    window.addEventListener('cube-restored', handleRestored);

    const handleSectionData = (e) => {
      setSectionData(e.detail);
    };
    window.addEventListener('portfolio:section-data', handleSectionData);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Initial check (in case it is already restored when HUD mounts)
    if (window.experience?.repair?.repairedCount === 3) {
      setIsRestored(true);
    }

    return () => {
      window.removeEventListener('cube-restored', handleRestored);
      window.removeEventListener('portfolio:section-data', handleSectionData);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const shouldShowCard = isMobile && sectionData && sectionData.sectionId !== 'contact';

  return (
    <div className={`hud-container ${isRestored ? 'hud-container--visible' : 'hud-container--hidden'}`}>
      <TargetCursor targetSelector=".cursor-target" spinDuration={2} hoverDuration={0.2} isRestored={isRestored} />

      <header className="header-hud">
        <div className="branding">HAKON / PORTFOLIO</div>
        <div className="subtitle">SPATIAL 3D EXPERIENCE</div>
      </header>

      {shouldShowCard && (
        <div className="mobile-portfolio-card">
          <div className="mobile-eyebrow">{sectionData.data.eyebrow}</div>
          <h2 className="mobile-title">{sectionData.data.title}</h2>
          <div className="mobile-subtitle">{sectionData.data.subtitle}</div>
          <div className="mobile-body-divider" />
          <p className="mobile-body">
            {(sectionData.data.body || '').replace(/\\n/g, '\n')}
          </p>
          <div className="mobile-footer">{sectionData.data.footer}</div>
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
  );
}
