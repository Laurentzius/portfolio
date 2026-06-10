import { isMobile } from '../utils/device.js';

export class GlassBoard {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.isMobile = isMobile;
    this.currentSection = 'welcome';
    this.repairProgress = { repaired: 0, total: 3 };

    this.portfolioData = {
      welcome: {
        eyebrow: '00 / PORTFOLIO',
        title: 'HAKON',
        subtitle: 'FULLSTACK / AI FIRST ENGINEER',
        body: '',
        footer: 'CLICK A FACE OR PICK A SECTION'
      },
      about: {
        eyebrow: '01 / ABOUT',
        title: 'TACTILE WEB',
        subtitle: 'DESIGNING INTERACTIONS',
        body: 'Frontend developer focused on creative coding, WebGL, physics-driven UI, and premium motion.',
        footer: 'CUBE FACE: TOP'
      },
      skills: {
        eyebrow: '02 / STACK',
        title: 'GRAPHICS + UI',
        subtitle: 'THREE.JS / REACT / ASTRO',
        body: 'WebGL, GLSL, Three.js, React, TypeScript, audio systems, procedural animation.',
        footer: 'CUBE FACE: RIGHT'
      },
      experience: {
        eyebrow: '03 / WORK',
        title: 'CASE ORBIT',
        subtitle: 'VOXEL / SHADER / AUDIO',
        body: '[01] Voxel terrain engine\\n[02] GLSL raymarch playground\\n[03] Spatial synth interface',
        footer: 'WORK CAROUSEL / CAMERA ORBIT'
      },
      contact: {
        eyebrow: '04 / CONTACT',
        title: 'SIGNAL MODE',
        subtitle: 'TRANSMISSION CHANNELS',
        body: '',
        footer: 'READY TO RECEIVE'
      },
      voxel: {
        eyebrow: 'CASE / VOXEL',
        title: 'VOXEL ENGINE',
        subtitle: 'REAL-TIME BROWSER ENGINE',
        body: 'Chunk terrain, dynamic occlusion culling, custom physics, 60 FPS WebGL rendering.',
        footer: 'FLOOR PIECE / CORNER'
      },
      shader: {
        eyebrow: 'CASE / SHADER',
        title: 'RAYMARCHER',
        subtitle: 'SDF RENDERER PLAYGROUND',
        body: 'Morphing metallic fields, soft shadows, and ambient occlusion in custom GLSL.',
        footer: 'FLOOR PIECE / EDGE'
      },
      audio: {
        eyebrow: 'CASE / AUDIO',
        title: 'SPATIAL SYNTH',
        subtitle: 'WEB AUDIO API',
        body: 'FM synthesis, LFOs, and gain envelopes driven by canvas interactions.',
        footer: 'FLOOR PIECE / CENTER'
      }
    };

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

  setWelcomeBody(body) {
    this.portfolioData.welcome.body = body;
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
    // No-op
  }
}
