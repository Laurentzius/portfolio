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

  React.useEffect(() => {
    const handleRestored = () => {
      setIsRestored(true);
    };
    window.addEventListener('cube-restored', handleRestored);

    // Initial check (in case it is already restored when HUD mounts)
    if (window.experience?.repair?.repairedCount === 3) {
      setIsRestored(true);
    }

    return () => {
      window.removeEventListener('cube-restored', handleRestored);
    };
  }, []);

  return (
    <div className={`hud-container ${isRestored ? 'hud-container--visible' : 'hud-container--hidden'}`}>
      <TargetCursor targetSelector=".cursor-target" spinDuration={2} hoverDuration={0.2} isRestored={isRestored} />

      <header className="header-hud">
        <div className="branding">HAKON / PORTFOLIO</div>
        <div className="subtitle">SPATIAL 3D EXPERIENCE</div>
      </header>

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
