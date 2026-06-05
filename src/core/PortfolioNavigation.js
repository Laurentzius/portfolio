const FACE_TO_SECTION = Object.freeze({
  F: 'welcome',
  U: 'about',
  R: 'skills',
  B: 'experience',
  L: 'contact',
  D: 'welcome',
});

const COMPROMISED_WELCOME = "SYSTEM STATUS: DATABASE COMPROMISED / CUBE FRAGMENTED\n\nPlease drag the three floating pieces back into their slots on the main cube to restore database integrity and unlock navigation.";

const RESTORED_WELCOME = "Welcome to my spatial workshop. I combine WebGL, 3D physics, and SOLID architecture to build immersive digital art and high-performance interactive interfaces.\n\nUse the mouse to explore the room. Click on the central tiles of the Rubik's Cube faces or play with the scattered pieces on the floor to navigate the portfolio pages.";

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
    this.showSection(state);
  }

  showCompromisedIntro() {
    if (this.glassBoard) {
      this.glassBoard.setWelcomeBody(COMPROMISED_WELCOME);
    }
  }

  showRestoredIntro() {
    if (this.glassBoard) {
      this.glassBoard.setWelcomeBody(RESTORED_WELCOME);
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

    if (misplacedCount <= 14) return 'voxel';
    if (misplacedCount <= 20) return 'shader';
    return 'contact';
  }
}
