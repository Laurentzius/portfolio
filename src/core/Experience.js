import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioEngine } from '../components/AudioEngine.js';
import { Lighting } from './Lighting.js';
import { Atmosphere } from './Atmosphere.js';
import { RubiksCube } from '../components/RubiksCube.js';
import { LooseCubie } from '../components/LooseCubie.js';
import { GlassBoard } from '../components/GlassBoard.js';
import { SocialModels } from '../components/SocialModels.js';
import { InteractionManager } from '../utils/InteractionManager.js';
import { PortfolioNavigation } from './PortfolioNavigation.js';
import { LooseCubiePhysics } from './LooseCubiePhysics.js';
import { CubieRepair } from './CubieRepair.js';
import { RepairNarrative } from './RepairNarrative.js';


const SECTION_CAMERA_POSES = Object.freeze({
  welcome: { position: new THREE.Vector3(-6.4, 2.2, 7.6), target: new THREE.Vector3(1.0, 0.2, 0.0) },
  about: { position: new THREE.Vector3(-3.8, 4.8, 4.8), target: new THREE.Vector3(0.8, 0.1, 0.0) },
  skills: { position: new THREE.Vector3(7.5, 2.2, 3.8), target: new THREE.Vector3(0.5, 0.2, -1.0) },
  experience: { position: new THREE.Vector3(3.2, 1.15, -9.4), target: new THREE.Vector3(-0.9, -0.05, -0.35) },
  contact: { position: new THREE.Vector3(-5.8, 5.6, -5.2), target: new THREE.Vector3(0.2, 0.35, 0.25) },
});

export class Experience {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found.`);
    }
    this.currentSection = 'welcome';
    this.logosIntensity = 0.0;
    this.logoTextures = null;
    this.initCore();
    this.initSystems();
    this.startLoop();
    this.bindPortfolioNav();
  }

  initCore() {
    this.isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    
    const initialPose = SECTION_CAMERA_POSES.welcome;
    if (this.isMobile) {
      const dir = new THREE.Vector3().subVectors(initialPose.position, initialPose.target);
      this.camera.position.copy(initialPose.target).addScaledVector(dir, 1.35);
    } else {
      this.camera.position.copy(initialPose.position);
    }

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true, // Transparent canvas so the CSS gradient background shows through
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Get and log GPU debug info to identify if software rendering is used
    try {
      const gl = this.renderer.getContext();
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const gpuName = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown (Hardware acceleration might be disabled)';
      console.log(`[Experience] WebGL context initialized. GPU Renderer: ${gpuName}`);
    } catch (e) {
      console.warn('[Experience] Failed to query GPU info:', e);
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 2.0 : 3.0));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinematic tones
    this.renderer.toneMappingExposure = 1.05;

    // Camera Controls - manual rotation is disabled to prevent free camera rotation
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableRotate = false; // Disable free rotation
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 15;
    this.controls.minDistance = 3.5;
    this.controls.enablePan = false; // Stay centered on the cube
    this.controls.target.set(1.0, 0.2, 0.0); // Midpoint between cube and board
    if (this.isMobile) {
      this.controls.enableZoom = false; // Disable zoom on mobile
    }
  }

  initSystems() {
    // 1. Audio Engine
    this.audioEngine = new AudioEngine();

    // 2. Lighting & Environment
    this.lighting = new Lighting(this.scene, this.renderer);
    this.atmosphere = new Atmosphere(this.scene, this.camera);

    // 3. Rubik's Cube
    this.rubiksCube = new RubiksCube(this, null);

    // 4. Interactive Loose Cubies scattered on the floor (Y = -1.77 to rest on Y = -2.25)
    this.looseCubies = [
      new LooseCubie(
        this.scene,
        this.camera,
        'corner',
        new THREE.Vector3(-2.2, -1.77, 2.2),
        new THREE.Euler(0.2, 0.5, -0.1)
      ),
      new LooseCubie(
        this.scene,
        this.camera,
        'edge',
        new THREE.Vector3(2.2, -1.77, 2.2),
        new THREE.Euler(-0.3, -0.2, 0.4)
      ),
      new LooseCubie(
        this.scene,
        this.camera,
        'center',
        new THREE.Vector3(0.0, -1.77, 3.2),
        new THREE.Euler(0.1, -0.7, 0.2)
      )
    ];

    // Link loose cubies to specific portfolio project cards and targets
    this.looseCubies[0].projectId = 'voxel';
    this.looseCubies[0].targetPos = new THREE.Vector3(-1, 1, 1);
    
    this.looseCubies[1].projectId = 'shader';
    this.looseCubies[1].targetPos = new THREE.Vector3(0, 1, 1);
    
    this.looseCubies[2].projectId = 'audio';
    this.looseCubies[2].targetPos = new THREE.Vector3(0, 0, 1);

    // 5. Floating Glassmorphic UI Portfolio Board
    this.glassBoard = new GlassBoard(this.scene, this.camera);
    this.navigation = new PortfolioNavigation(this.glassBoard, this.audioEngine);
    this.physics = new LooseCubiePhysics();
    this.repairNarrative = new RepairNarrative(this.scene, this.rubiksCube, this.glassBoard);
    this.socialModels = new SocialModels(this.scene);
    this.repair = new CubieRepair({
      rubiksCube: this.rubiksCube,
      looseCubies: this.looseCubies,
      controls: this.controls,
      navigation: this.navigation,
      audioEngine: this.audioEngine,
      repairNarrative: this.repairNarrative,
    });
    this.navigation.showCompromisedIntro();

    // Listen for cube restoration to fade in glowing lines
    this.onCubeRestored = () => {
      if (this.atmosphere) {
        this.atmosphere.restore();
      }
      if (this.lighting) {
        this.lighting.triggerUnlockPulse();
      }
      if (this.audioEngine) {
        this.audioEngine.playUnlock();
      }
    };
    window.addEventListener('cube-restored', this.onCubeRestored);

    // 6. Interaction Coordinator (routes click and drag inputs)
    this.interactionManager = new InteractionManager(this);
    // Load logo SVGs and apply them to the cube tiles
    this.loadLogos();

    // Handle resize
    this.resizeHandler = this.onResize.bind(this);
    window.addEventListener('resize', this.resizeHandler);
    this.visibilityHandler = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }


  bindPortfolioNav() {
    this.navButtons = [...document.querySelectorAll('.portfolio-nav button[data-section]')];
    this.onPortfolioNavClick = (event) => {
      const button = event.target.closest('button[data-section]');
      if (!button) return;
      this.navigateTo(button.dataset.section);
    };
    this.onPortfolioNavigate = (event) => {
      if (event.detail?.sectionId) {
        this.navigateTo(event.detail.sectionId);
      }
    };

    const nav = document.querySelector('.portfolio-nav');
    if (nav) {
      nav.addEventListener('click', this.onPortfolioNavClick);
    }
    window.addEventListener('portfolio:navigate', this.onPortfolioNavigate);
    this.portfolioNav = nav;
    this.setActiveNavButton('welcome');
  }

  setActiveNavButton(sectionId) {
    if (!this.navButtons) return;
    this.navButtons.forEach(button => {
      button.classList.toggle('is-active', button.dataset.section === sectionId);
    });
  }

  navigateTo(sectionId) {
    if (this.currentSection === sectionId) return;
    this.currentSection = sectionId;

    if (this.glassBoard) {
      this.glassBoard.setSuppressed(sectionId === 'contact');
    }
    this.navigation.showSection(sectionId);
    if (this.lighting) {
      this.lighting.setSectionAccent(sectionId);
    }
    if (this.atmosphere) {
      this.atmosphere.setSection(sectionId);
    }
    if (this.socialModels) {
      this.socialModels.setVisible(sectionId === 'contact');
    }
    const isSkills = sectionId === 'skills';
    gsap.to(this, {
      logosIntensity: isSkills ? 4.0 : 0.0,
      duration: 0.8,
      overwrite: 'auto'
    });
    if (sectionId === 'skills') {
      this.startSkillsShuffleTimer();
    } else {
      this.stopSkillsShuffleTimer();
    }
    if (SECTION_CAMERA_POSES[sectionId]) {
      this.animateCameraToSection(sectionId);
      this.setActiveNavButton(sectionId);
    }
  }

  animateCameraToSection(sectionId) {
    const pose = SECTION_CAMERA_POSES[sectionId];
    if (!pose) return;

    let targetPosition = pose.position;
    if (this.isMobile) {
      // Zoom out on mobile by scaling distance from target
      const dir = new THREE.Vector3().subVectors(pose.position, pose.target);
      targetPosition = pose.target.clone().addScaledVector(dir, 1.35);
    }

    this.cameraAnimation = {
      startedAt: performance.now(),
      duration: 760,
      fromPosition: this.camera.position.clone(),
      toPosition: targetPosition,
      fromTarget: this.controls.target.clone(),
      toTarget: pose.target,
    };
  }

  updateCameraAnimation() {
    if (!this.cameraAnimation) return;

    const elapsed = performance.now() - this.cameraAnimation.startedAt;
    const progress = Math.min(elapsed / this.cameraAnimation.duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const arcLift = Math.sin(progress * Math.PI) * 0.42;

    const currentTarget = new THREE.Vector3().lerpVectors(
      this.cameraAnimation.fromTarget,
      this.cameraAnimation.toTarget,
      eased
    );
    currentTarget.y += arcLift;

    const fromOffset = new THREE.Vector3().subVectors(this.cameraAnimation.fromPosition, this.cameraAnimation.fromTarget);
    const toOffset = new THREE.Vector3().subVectors(this.cameraAnimation.toPosition, this.cameraAnimation.toTarget);
    const radiusStart = fromOffset.length();
    const radiusEnd = toOffset.length();
    const currentRadius = THREE.MathUtils.lerp(radiusStart, radiusEnd, eased);
    const phiStart = Math.acos(Math.max(-1, Math.min(1, fromOffset.y / radiusStart)));
    const phiEnd = Math.acos(Math.max(-1, Math.min(1, toOffset.y / radiusEnd)));
    const currentPhi = THREE.MathUtils.lerp(phiStart, phiEnd, eased);
    const thetaStart = Math.atan2(fromOffset.x, fromOffset.z);
    const thetaEnd = Math.atan2(toOffset.x, toOffset.z);

    let dTheta = thetaEnd - thetaStart;
    while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
    while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
    const currentTheta = thetaStart + dTheta * eased;
    const sinPhi = Math.sin(currentPhi);
    const currentOffset = new THREE.Vector3(
      currentRadius * sinPhi * Math.sin(currentTheta),
      currentRadius * Math.cos(currentPhi),
      currentRadius * sinPhi * Math.cos(currentTheta)
    );
    this.camera.position.copy(currentTarget).add(currentOffset);
    this.controls.target.copy(currentTarget);

    if (progress === 1) {
      this.cameraAnimation = null;
    }
  }


  onCubeStateChanged() {
    if (!this.rubiksCube || !this.rubiksCube.cubies) return;
    this.navigation.showCubeState(this.rubiksCube.cubies);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  startLoop() {
    let lastTime = performance.now();

    const tick = () => {
      const currentTime = performance.now();
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      this.updateCameraAnimation();

      // Smooth orbit camera
      this.controls.update();

      // Update cube rotation snapping / queue animations
      if (this.rubiksCube) {
        this.rubiksCube.update();
      }
      this.updateLogosProjection();

      // Update loose cubies rotation & inertia with dt
      if (this.looseCubies) {
        this.looseCubies.forEach(cubie => this.physics.updateCubie(cubie, dt));
        this.physics.resolveRubiksCubeCollisions(this.rubiksCube, this.looseCubies, dt);
        this.physics.resolveLooseCubieCollisions(this.looseCubies);
      }

      // Update glass board text transitions
      if (this.glassBoard) {
        this.glassBoard.update(dt);
      }

      if (this.repairNarrative) {
        this.repairNarrative.update(dt);
      }

      if (this.socialModels) {
        this.socialModels.update(dt);
      }

      if (this.atmosphere) {
        this.atmosphere.update(dt);
      }

      // Render scene
      if (this.lighting && this.lighting.update) {
        this.lighting.update(this);
      }
      this.renderer.render(this.scene, this.camera);

      // Loop
      this.frameId = requestAnimationFrame(tick);
    };

    tick();
  }

  async loadLogos() {
    const logos = [
      'codex', 'claudecode', 'gemini', 'astro',
      'next', 'react', 'svelte', 'python',
      'ts', 'elixir', 'go', 'postgres'
    ];
    const BRAND_COLORS = {
      codex: '#10a37f', // OpenAI Green
      claudecode: '#d97757',
      gemini: '#8e75b2',
      astro: '#bc52ee',
      next: '#ffffff',
      react: '#61dafb',
      svelte: '#ff3e00',
      python: '#3776ab',
      ts: '#3178c6',
      elixir: '#4b275f',
      go: '#00add8',
      postgres: '#4169e1'
    };
    const textures = {};
    for (const logo of logos) {
      try {
        const res = await fetch(`/icons/${logo}.svg`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const svgText = await res.text();
        let processedSvg = svgText;
        const brandColor = BRAND_COLORS[logo] || '#ffffff';
        // Ensure root <svg> has width and height attributes so browser drawImage works reliably
        if (!processedSvg.match(/<svg[^>]*\bwidth\b/)) {
          processedSvg = processedSvg.replace('<svg', '<svg width="256" height="256"');
        }
        // Add fill color to the root <svg> tag if it doesn't have one, or override it.
        if (processedSvg.includes('currentColor')) {
          processedSvg = processedSvg.replace(/currentColor/g, brandColor);
        }
        // Remove any existing fill="..." on the root <svg> tag so we can set our brand color
        processedSvg = processedSvg.replace(/<svg([^>]*)fill="[^"]*"/g, '<svg$1');
        // Inject our brand fill
        processedSvg = processedSvg.replace('<svg', `<svg fill="${brandColor}"`);
        // Override explicit inner fill to brand color
        processedSvg = processedSvg.replace(/fill="#000000"/g, `fill="${brandColor}"`);
        processedSvg = processedSvg.replace(/fill="#000"/g, `fill="${brandColor}"`);
        processedSvg = processedSvg.replace(/fill="black"/g, `fill="${brandColor}"`);
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 256);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const img = new Image();
        const svgBlob = new Blob([processedSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
          const padding = 32;
          const size = 256 - padding * 2;
          ctx.drawImage(img, padding, padding, size, size);
          texture.needsUpdate = true;
          URL.revokeObjectURL(url);
        };
        img.src = url;
        textures[logo] = texture;
      } catch (err) {
        console.error(`Failed to load logo SVG for ${logo}:`, err);
      }
    }
    this.logoTextures = textures;
  }
  updateLogosProjection() {
    if (!this.rubiksCube) return;
    const allTiles = [];
    allTiles.push(...this.rubiksCube.tiles);
    this.looseCubies.forEach(loose => {
      loose.group.traverse(child => {
        if (child.isMesh && child !== loose.bodyMesh) {
          allTiles.push(child);
        }
      });
    });
    const rightLogos = [
      'react', 'svelte', 'astro',
      'ts', 'codex', 'claudecode',
      'python', 'go', 'postgres'
    ];
    allTiles.forEach(tile => {
      const cubie = tile.parent;
      if (!cubie) return;
      const worldPos = new THREE.Vector3();
      tile.getWorldPosition(worldPos);
      const localPos = worldPos.clone();
      this.rubiksCube.cubeGroup.worldToLocal(localPos);
      // Check if the tile is on the RIGHT face of the Rubik's cube
      const isOnRightFace = localPos.x > 1.2 &&
                            Math.abs(localPos.y) < 1.6 &&
                            Math.abs(localPos.z) < 1.6;
      if (isOnRightFace) {
        // Grid on Right face: Row is Y (Top to Bottom), Col is Z (Front to Back)
        const col = 1 - Math.round(localPos.z); // Z ≈ 1 -> 0, Z ≈ 0 -> 1, Z ≈ -1 -> 2
        const row = 1 - Math.round(localPos.y); // Y ≈ 1 -> 0, Y ≈ 0 -> 1, Y ≈ -1 -> 2
        if (col >= 0 && col <= 2 && row >= 0 && row <= 2) {
          const gridIndex = row * 3 + col;
          const logoName = rightLogos[gridIndex];
          const texture = this.logoTextures ? this.logoTextures[logoName] : null;
          if (tile.material) {
            tile.material.map = null;
            if (texture) {
              tile.material.emissiveMap = texture;
              tile.material.emissive.set('#ffffff');
              tile.material.emissiveIntensity = this.logosIntensity || 0.0;
              // Rotate the texture to keep the logo upright in world space (project to YZ plane)
              const tileLocalY = new THREE.Vector3(0, 1, 0).applyQuaternion(tile.quaternion);
              const tileWorldY = tileLocalY.clone().applyQuaternion(cubie.quaternion);
              const angle = Math.atan2(tileWorldY.z, tileWorldY.y);
              texture.center.set(0.5, 0.5);
              texture.rotation = -angle;
            } else {
              tile.material.emissiveMap = null;
              tile.material.emissiveIntensity = 0.0;
            }
            tile.material.needsUpdate = true;
          }
        }
      } else {
        // Clear emissive map for tiles not on the right face
        if (tile.material) {
          tile.material.map = null;
          tile.material.emissiveMap = null;
          tile.material.emissiveIntensity = 0.0;
          tile.material.needsUpdate = true;
        }
      }
    });
  }
  onVisibilityChange() {
    if (document.hidden) {
      this.stopSkillsShuffleTimer();
      return;
    }
    if (this.currentSection === 'skills') {
      this.startSkillsShuffleTimer();
    }
  }

  startSkillsShuffleTimer() {
    this.stopSkillsShuffleTimer();
    if (document.hidden) return;
    this.skillsShuffleTimer = setInterval(() => {
      if (
        this.currentSection === 'skills'
        && this.rubiksCube
        && !this.rubiksCube.isLocked
        && !this.rubiksCube.isAnimating
        && !this.rubiksCube.isSnapping
        && this.rubiksCube.animationQueue.length === 0
      ) {
        const minMoves = 1;
        const maxMoves = 3;
        const numMoves = Math.floor(Math.random() * (maxMoves - minMoves + 1)) + minMoves;
        const axes = ['X', 'Y', 'Z'];
        const slices = [-1, 0, 1];
        const turns = [-1, 1];
        for (let i = 0; i < numMoves; i++) {
          const axis = axes[Math.floor(Math.random() * axes.length)];
          const slice = slices[Math.floor(Math.random() * slices.length)];
          const turn = turns[Math.floor(Math.random() * turns.length)];
          this.rubiksCube.animationQueue.push({
            axis,
            slice,
            turns: turn,
            duration: 350,
            recordInHistory: true
          });
        }
      }
    }, 6000);
  }
  stopSkillsShuffleTimer() {
    if (this.skillsShuffleTimer) {
      clearInterval(this.skillsShuffleTimer);
      this.skillsShuffleTimer = null;
    }
  }
  destroy() {
    this.stopSkillsShuffleTimer();
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('cube-restored', this.onCubeRestored);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    window.removeEventListener('portfolio:navigate', this.onPortfolioNavigate);
    if (this.portfolioNav) {
      this.portfolioNav.removeEventListener('click', this.onPortfolioNavClick);
    }

    if (this.interactionManager) {
      this.interactionManager.destroy();
    }
    if (this.rubiksCube) {
      // If we added destroy callbacks later
    }
    if (this.atmosphere) {
      this.atmosphere.destroy();
    }
    if (this.socialModels) {
      this.socialModels.destroy();
    }
    if (this.lighting && this.lighting.destroy) {
      this.lighting.destroy();
    }
    this.renderer.dispose();
  }
}
