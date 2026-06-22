import { isMobile } from '../utils/device.js';
import { t_, onLocaleChange } from '../utils/i18n.js';

export class GlassBoard {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.isMobile = isMobile;
    this.currentSection = 'welcome';
    this.repairProgress = { repaired: 0, total: 3 };
    this.welcomeBodyKey = null; // 'compromised' | 'restored' | null

    this.portfolioData = this._buildPortfolioData();
    this._localeCleanup = onLocaleChange(() => {
      this.portfolioData = this._buildPortfolioData();
      if (this.welcomeBodyKey) {
        this.portfolioData.welcome.body = t_(`navIntro.${this.welcomeBodyKey}`);
      }
      this.redrawCanvas();
    });

    // Dummy group property to prevent errors if external code references it
    this.group = {
      visible: false,
      scale: {
        set: () => {},
        x: 0,
        y: 0,
        z: 0
      },
      position: {
        copy: () => ({
          add: () => {}
        })
      }
    };

    this.redrawCanvas();
  }

  _buildPortfolioData() {
    return {
      welcome:    { ...t_('portfolio.welcome') },
      about:      { ...t_('portfolio.about') },
      skills:     { ...t_('portfolio.skills') },
      experience: { ...t_('portfolio.experience') },
      contact:    { ...t_('portfolio.contact') },
      voxel:      { ...t_('portfolio.voxel') },
      shader:     { ...t_('portfolio.shader') },
      audio:      { ...t_('portfolio.audio') },
    };
  }

  setWelcomeBody(body, key) {
    this.portfolioData.welcome.body = body;
    this.welcomeBodyKey = key || null;
    if (this.currentSection === 'welcome') {
      this.redrawCanvas();
    }
  }

  setSuppressed(suppressed) {
    this.suppressed = suppressed;
  }

  show() {
    // No-op visually
  }

  setRepairProgress(repaired, total) {
    this.repairProgress.repaired = repaired;
    this.repairProgress.total = total;
    this.redrawCanvas();
  }

  showLockedHint() {
    window.dispatchEvent(new CustomEvent('portfolio:locked-hint'));
  }

  updateContent(sectionId) {
    if (!this.portfolioData[sectionId]) return;
    this.currentSection = sectionId;
    this.redrawCanvas();
  }

  redrawCanvas() {
    const data = this.portfolioData[this.currentSection];
    if (!data) return;

    // Dispatch a custom event to notify HTML/React HUD of the updated section data
    window.dispatchEvent(new CustomEvent('portfolio:section-data', {
      detail: {
        sectionId: this.currentSection,
        data: {
          eyebrow: data.eyebrow,
          title: data.title,
          subtitle: data.subtitle,
          body: data.body,
          footer: data.footer,
          repairProgress: this.repairProgress
        }
      }
    }));
  }

  update(dt) {
    // No-op
  }

  destroy() {
    this._localeCleanup?.();
  }
}
