import { t_ } from '../utils/i18n.js';

const FACE_TO_SECTION = Object.freeze({
  F: 'welcome',
  U: 'about',
  R: 'skills',
  B: 'experience',
  L: 'contact',
  D: 'welcome',
});

export class PortfolioNavigation {
  constructor(glassBoard, audioEngine) {
    this.glassBoard = glassBoard;
    this.audioEngine = audioEngine;
  }

  showSection(sectionId) {
    if (this.glassBoard) {
      this.glassBoard.show();
      this.glassBoard.updateContent(sectionId);
    }

    if (this.audioEngine) {
      this.audioEngine.playNavTick();
    }
  }

  showFace(faceName) {
    const sectionId = FACE_TO_SECTION[faceName];
    if (sectionId) {
      this.showSection(sectionId);
    }
  }

  showCubeState(cubies) {
    const state = this.getCubeStateSection(cubies);
    if (state) {
      this.showSection(state);
    }
  }

  showCompromisedIntro() {
    if (this.glassBoard) {
      this.glassBoard.setWelcomeBody(t_('navIntro.compromised'), 'compromised');
    }
  }

  showRestoredIntro() {
    if (this.glassBoard) {
      this.glassBoard.setWelcomeBody(t_('navIntro.restored'), 'restored');
      this.glassBoard.show();
    }
    this.showSection('welcome');
  }


  getCubeStateSection(cubies) {
    let misplacedCount = 0;
    const misplacedX = new Set();
    const misplacedY = new Set();
    const misplacedZ = new Set();

    cubies.forEach(cubie => {
      const x = Math.round(cubie.position.x);
      const y = Math.round(cubie.position.y);
      const z = Math.round(cubie.position.z);
      const init = cubie.userData.initialPos;

      if (x !== init.x || y !== init.y || z !== init.z) {
        misplacedCount++;
        misplacedX.add(init.x);
        misplacedY.add(init.y);
        misplacedZ.add(init.z);
      }
    });

    if (misplacedCount === 0) return 'welcome';

    if (misplacedCount <= 9) {
      if (misplacedY.size === 1) return 'about';
      if (misplacedX.size === 1) return 'skills';
      if (misplacedZ.size === 1) return 'experience';
      return 'about';
    }

    return null;
  }
}
