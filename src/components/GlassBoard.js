import * as THREE from 'three';

const BADGE_WIDTH = 1.72;
const BADGE_HEIGHT = 0.86;

export class GlassBoard {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.generateMipmaps = true;

    this.isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.opacity = 1.0;
    this.targetOpacity = 1.0;
    this.currentSection = 'welcome';
    this.transitionSpeed = 8.0;
    this.repairProgress = { repaired: 0, total: 3 };
    this.lockedHintUntil = 0;
    this.lockedHintRendered = false;

    this.cameraForward = new THREE.Vector3();
    this.cameraRight = new THREE.Vector3();
    this.cameraUp = new THREE.Vector3();
    this.badgePosition = new THREE.Vector3();
    this.basePosition = new THREE.Vector3(1.45, 0.72, -4.35);
    this.floatTime = Math.random() * 10;
    this.cursorTarget = new THREE.Vector2();
    this.cursorCurrent = new THREE.Vector2();
    this.floatOffset = new THREE.Vector3();
    this.pointerHandler = this.onPointerMove.bind(this);
    window.addEventListener('pointermove', this.pointerHandler, { passive: true });

    this.portfolioData = {
      welcome: {
        eyebrow: '00 / PORTFOLIO',
        title: 'HAKON',
        subtitle: 'CREATIVE WEBGL ENGINEER',
        body: 'Spatial interfaces, real-time 3D, tactile frontend systems.',
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
        body: '[EMAIL] hello@hakon.dev\\n[TELEGRAM] @hakon_dev\\n[GITHUB] github.com/hakon-dev',
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

    this.initMesh();
    this.redrawCanvas();
  }

  initMesh() {
    this.group = new THREE.Group();

    // 1. Text overlay material
    this.textMaterial = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });

    this.textMesh = new THREE.Mesh(new THREE.PlaneGeometry(BADGE_WIDTH, BADGE_HEIGHT), this.textMaterial);
    this.textMesh.renderOrder = 12;
    this.group.add(this.textMesh);

    // 2. Glassmorphism backplate
    // MeshPhysicalMaterial creates a premium frosted glass effect with transmission and roughness
    const paddingX = 0.08;
    const paddingY = 0.06;
    const glassGeometry = new THREE.PlaneGeometry(BADGE_WIDTH + paddingX, BADGE_HEIGHT + paddingY);
    
    const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Fallback to transparent MeshStandardMaterial on mobile to avoid the heavy transmission/refraction pass
      this.glassMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0b0e17'),
        transparent: true,
        opacity: 0.88,
        roughness: 0.45,
        metalness: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });
    } else {
      this.glassMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#0b0e17'), // Dark slate background matching the design theme
        transparent: true,
        opacity: 0.78,
        transmission: 0.45, // Refractive transparency
        roughness: 0.45, // Diffuses specular highlights, making them soft and wide
        metalness: 0.0, // Non-metallic
        clearcoat: 0.25, // Significantly reduced glossy clearcoat reflection
        clearcoatRoughness: 0.6, // Blurry clearcoat highlights
        specularIntensity: 0.2, // Low standard specular reflection intensity
        ior: 1.5,
        thickness: 0.03,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });
    }

    this.glassMesh = new THREE.Mesh(glassGeometry, this.glassMaterial);
    this.glassMesh.position.z = -0.005; // Slightly behind text
    this.glassMesh.renderOrder = 10;
    this.group.add(this.glassMesh);

    // 3. Fine semi-transparent white border
    const edges = new THREE.EdgesGeometry(glassGeometry);
    this.borderMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      depthTest: false,
    });
    this.borderLine = new THREE.LineSegments(edges, this.borderMaterial);
    this.borderLine.position.z = -0.004; // In front of glass, behind text
    this.borderLine.renderOrder = 11;
    this.group.add(this.borderLine);

    this.group.position.copy(this.basePosition);
    this.group.renderOrder = 10;
    this.group.visible = false;
    this.group.scale.set(0, 0, 0);
    this.targetScale = 0.0;

    this.scene.add(this.camera);
    this.camera.add(this.group);
  }

  setWelcomeBody(body) {
    this.portfolioData.welcome.body = body;
    if (this.currentSection === 'welcome') {
      this.redrawCanvas();
    }
  }

  setSuppressed(suppressed) {
    this.suppressed = suppressed;
    if (this.isMobile) {
      this.targetScale = 0.0;
      this.group.visible = false;
      return;
    }
    if (suppressed) {
      this.targetScale = 0.0;
      this.group.visible = false;
    } else if (this.targetScale > 0.0) {
      this.group.visible = true;
    }
  }

  show() {
    if (this.suppressed) return;
    if (this.isMobile) {
      this.group.visible = false;
      this.targetScale = 0.0;
      return;
    }
    this.group.visible = true;
    this.targetScale = 1.0;
  }

  setRepairProgress(repaired, total) {
    this.repairProgress.repaired = repaired;
    this.repairProgress.total = total;
  }

  showLockedHint() {
    this.lockedHintUntil = performance.now() + 1200;
    this.lockedHintRendered = true;
    if (this.currentSection === 'welcome') {
      this.redrawCanvas();
    }
  }

  updateContent(sectionId) {
    if (!this.portfolioData[sectionId]) return;
    if (this.currentSection === sectionId) return;

    this.targetOpacity = 0.0;
    this.pendingSection = sectionId;
  }
  redrawCanvas() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
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
          footer: data.footer
        }
      }
    }));

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    const left = 52;
    const right = w - 52;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, 56);
    ctx.lineTo(left, h - 62);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
    ctx.font = '700 22px Outfit, sans-serif';
    ctx.fillText(data.eyebrow, left + 28, 72);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 58px Outfit, sans-serif';
    ctx.fillText(data.title, left + 28, 142);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + 28, 172);
    ctx.lineTo(right, 172);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
    ctx.font = '700 24px Outfit, sans-serif';
    ctx.fillText(data.subtitle, left + 28, 218);


    ctx.restore();
    this.texture.needsUpdate = true;
  }

  drawLockedHint(ctx, x, y, width) {
    if (performance.now() > this.lockedHintUntil) return;

    ctx.save();
    ctx.fillStyle = 'rgba(180, 32, 32, 0.78)';
    ctx.font = '700 20px Outfit, sans-serif';
    ctx.fillText('RESTORE MISSING CUBIES FIRST', x, y + 26, width);
    ctx.restore();
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
    const paragraphs = text.split('\\n');
    let currentY = y;
    let lines = 0;

    for (let p = 0; p < paragraphs.length; p++) {
      const words = paragraphs[p].split(' ');
      let line = '';

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && i > 0) {
          ctx.fillText(line.trim(), x, currentY);
          lines += 1;
          if (lines >= maxLines) return currentY + lineHeight;
          line = words[i] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }

      if (line && lines < maxLines) {
        ctx.fillText(line.trim(), x, currentY);
        lines += 1;
        currentY += lineHeight;
      }
      if (lines >= maxLines) return currentY;
    }

    return currentY;
  }

  onPointerMove(event) {
    this.cursorTarget.set(
      (event.clientX / window.innerWidth - 0.5) * 2,
      -(event.clientY / window.innerHeight - 0.5) * 2
    );
  }

  update(dt) {
    if (this.isMobile) {
      this.group.visible = false;
      this.group.scale.set(0, 0, 0);
      return;
    }
    if (this.lockedHintRendered && performance.now() > this.lockedHintUntil) {
      this.lockedHintRendered = false;
      if (this.currentSection === 'welcome') {
        this.redrawCanvas();
      }
    }

    if (Math.abs(this.opacity - this.targetOpacity) > 0.01) {
      this.opacity = THREE.MathUtils.lerp(this.opacity, this.targetOpacity, this.transitionSpeed * dt);
      this.textMaterial.opacity = this.opacity;
      if (this.glassMaterial) this.glassMaterial.opacity = 0.78 * this.opacity;
      if (this.borderMaterial) this.borderMaterial.opacity = 0.22 * this.opacity;

      if (this.opacity < 0.05 && this.targetOpacity === 0.0) {
        this.currentSection = this.pendingSection;
        this.redrawCanvas();
        this.targetOpacity = 1.0;
      }
    } else {
      this.opacity = this.targetOpacity;
      this.textMaterial.opacity = this.opacity;
      if (this.glassMaterial) this.glassMaterial.opacity = 0.78 * this.opacity;
      if (this.borderMaterial) this.borderMaterial.opacity = 0.22 * this.opacity;
    }

    if (this.targetScale !== undefined) {
      const currentScale = this.group.scale.x;
      if (Math.abs(currentScale - this.targetScale) > 0.005) {
        const nextScale = THREE.MathUtils.lerp(currentScale, this.targetScale, 6.0 * dt);
        this.group.scale.set(nextScale, nextScale, nextScale);
      } else {
        this.group.scale.set(this.targetScale, this.targetScale, this.targetScale);
      }
    }


    this.floatTime += dt;
    this.cursorCurrent.lerp(this.cursorTarget, Math.min(dt * 3.5, 1));
    this.floatOffset.set(
      this.cursorCurrent.x * 0.045 + Math.sin(this.floatTime * 0.72) * 0.012,
      this.cursorCurrent.y * 0.032 + Math.sin(this.floatTime * 0.93 + 1.4) * 0.009,
      Math.sin(this.floatTime * 0.58 + 0.7) * 0.006
    );
    this.group.position.copy(this.basePosition).add(this.floatOffset);
  }

  destroy() {
    window.removeEventListener('pointermove', this.pointerHandler);
  }
}
