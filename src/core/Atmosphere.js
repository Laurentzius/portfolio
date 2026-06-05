import * as THREE from 'three';

const THEMES = Object.freeze({
  welcome: {
    colors: [new THREE.Color('#a6c8ff'), new THREE.Color('#5227ff'), new THREE.Color('#ff9ffc')],
    background: new THREE.Color('#050201'),
    glowColor: new THREE.Color('#381b00'),
    glowIntensity: 0.95,
    speed: 0.58,
  },
  about: {
    colors: [new THREE.Color('#ffd6a5'), new THREE.Color('#fdffb6'), new THREE.Color('#a6c8ff')],
    background: new THREE.Color('#050201'),
    glowColor: new THREE.Color('#381b00'),
    glowIntensity: 0.95,
    speed: 0.58,
  },
  skills: {
    colors: [new THREE.Color('#7df9ff'), new THREE.Color('#5227ff'), new THREE.Color('#a6c8ff')],
    background: new THREE.Color('#050201'),
    glowColor: new THREE.Color('#381b00'),
    glowIntensity: 0.95,
    speed: 0.58,
  },
  experience: {
    colors: [new THREE.Color('#ff9ffc'), new THREE.Color('#8f7cff'), new THREE.Color('#ffffff')],
    background: new THREE.Color('#050201'),
    glowColor: new THREE.Color('#381b00'),
    glowIntensity: 0.95,
    speed: 0.58,
  },
  contact: {
    colors: [new THREE.Color('#ffb86b'), new THREE.Color('#ff9ffc'), new THREE.Color('#ffffff')],
    background: new THREE.Color('#050201'),
    glowColor: new THREE.Color('#381b00'),
    glowIntensity: 0.95,
    speed: 0.58,
  },
});

const DEFAULT_THEME = THEMES.welcome;

export class Atmosphere {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.time = 0;
    this.streaksTarget = 0.0;
    this.streaksIntensity = 0.0;

    this.current = this.cloneTheme(DEFAULT_THEME);
    this.target = this.cloneTheme(DEFAULT_THEME);

    this.initShowroom();
  }

  cloneTheme(theme) {
    return {
      colors: theme.colors.map(c => c.clone()),
      background: theme.background.clone(),
      glowColor: theme.glowColor.clone(),
      glowIntensity: theme.glowIntensity,
      speed: theme.speed,
    };
  }

  createCycloramaGeometry(radiusFloor, cornerRadius) {
    const radiusWall = radiusFloor + cornerRadius;
    const width = 2 * Math.PI * radiusWall;
    const length = 56;
    const segmentsX = 240;
    const segmentsY = 180;
    const geo = new THREE.PlaneGeometry(width, length, segmentsX, segmentsY);
    const pos = geo.attributes.position;
    // Y-split where corner curve begins
    const curveStart = -10;
    const curveEnd = curveStart + cornerRadius * (Math.PI / 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const flatY = pos.getY(i);
      let newY = 0;
      let r = 0;
      if (flatY < curveStart) {
        // Floor part: flat horizontal plane, pulled lower to -11.45
        newY = -11.45;
        const t = (flatY - (-28)) / (curveStart - (-28)); // 0 to 1
        r = radiusFloor * t;
      } else if (flatY >= curveStart && flatY <= curveEnd) {
        // Smooth curved transition starting from -11.45
        const t = (flatY - curveStart) / (curveEnd - curveStart); // 0 to 1
        const angle = t * (Math.PI / 2); // 0 to 90 degrees
        newY = -11.45 + cornerRadius * (1 - Math.cos(angle));
        r = radiusFloor + cornerRadius * Math.sin(angle);
      } else {
        // Vertical wall part
        const excess = flatY - curveEnd;
        newY = -11.45 + cornerRadius + excess;
        r = radiusWall;
      }
      // Convert polar coordinates (r, theta) into 3D (X, Z)
      const theta = (x / (width / 2)) * Math.PI;
      const newX = r * Math.sin(theta);
      const newZ = r * Math.cos(theta);
      pos.setXYZ(i, newX, newY, newZ);
    }
    geo.computeVertexNormals();
    return geo;
  }
  initShowroom() {
    // We create two nested cyclorama meshes to introduce true 3D depth and parallax for the Lightfall streaks.
    // 1. Background layer: contains wider and medium streaks (Stream 2 and 3)
    const geoBg = this.createCycloramaGeometry(10.0, 16.0); // radiusWall = 26.0
    // 2. Foreground layer: contains narrow streaks (Stream 1) close to the scene, transparent background
    const geoFg = this.createCycloramaGeometry(8.0, 14.0); // radiusWall = 22.0
    const getUniforms = () => ({
      uTime: { value: 0 },
      uSpeed: { value: this.current.speed },
      uBgColor: { value: new THREE.Color().copy(this.current.background) },
      uGlowColor: { value: new THREE.Color().copy(this.current.glowColor) },
      uGlowIntensity: { value: this.current.glowIntensity },
      uColor1: { value: new THREE.Color().copy(this.current.colors[0]) },
      uColor2: { value: new THREE.Color().copy(this.current.colors[1]) },
      uColor3: { value: new THREE.Color().copy(this.current.colors[2]) },
      uStreaksIntensity: { value: 0.0 },
    });
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;
    // Background shader material (Ambient Glow + Stream 2 + Stream 3)
    this.materialBg = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      toneMapped: false,
      uniforms: getUniforms(),
      vertexShader,
      fragmentShader: `
        uniform float uTime;
        uniform float uSpeed;
        uniform vec3 uBgColor;
        uniform vec3 uGlowColor;
        uniform float uGlowIntensity;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform float uStreaksIntensity;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        float hash(float n) {
          return fract(sin(n) * 43758.5453);
        }
        void main() {
          vec2 centerDist = vUv - vec2(0.5);
          float radialGlow = 1.0 - smoothstep(0.0, 0.76, length(centerDist));
          vec3 ambientGlow = uBgColor + uGlowColor * radialGlow * uGlowIntensity * 0.38;
          float speedMultiplier = uTime * uSpeed * 0.46;
          // Stream 2: Medium-width glowing trails (starfall segments)
          float freq2 = 140.0;
          float coordX2 = vUv.x * freq2;
          float colIndex2 = floor(coordX2);
          float active2 = step(0.50, hash(colIndex2 + 42.0)); // 50% density
          float colSpeed2 = 1.2 + 0.4 * hash(colIndex2 + 5.0);
          float colOffset2 = hash(colIndex2 + 19.0) * 20.0;
          float val2 = vUv.y + speedMultiplier * colSpeed2 + colOffset2;
          float periodScale2 = 0.2;
          float maxVal2 = 1.0 / periodScale2; // 5.0
          float progress2 = fract(val2 * periodScale2) * maxVal2;
          float streakLength2 = 2.5;
          float activeStreak2 = max(0.0, progress2 - (maxVal2 - streakLength2));
          float streakValue2 = pow(activeStreak2 / streakLength2, 5.0);
          float dx2 = abs(fract(coordX2) - 0.5);
          float pxWidth2 = fwidth(coordX2);
          float hWidth2 = max(0.06, 0.8 * pxWidth2);
          float edge2 = pxWidth2 * 1.2;
          float glowProfile2 = smoothstep(hWidth2 + edge2, hWidth2 - edge2, dx2);
          float streak2 = streakValue2 * glowProfile2 * active2;
          vec3 col2 = mix(uColor2, uColor3, hash(colIndex2 + 12.0));
          // Stream 3: Wider, soft background trails (starfall segments)
          float freq3 = 80.0;
          float coordX3 = vUv.x * freq3;
          float colIndex3 = floor(coordX3);
          float active3 = step(0.60, hash(colIndex3 + 99.0)); // 40% density
          float colSpeed3 = 0.8 + 0.3 * hash(colIndex3 + 31.0);
          float colOffset3 = hash(colIndex3 + 57.0) * 25.0;
          float val3 = vUv.y + speedMultiplier * colSpeed3 + colOffset3;
          float periodScale3 = 0.25;
          float maxVal3 = 1.0 / periodScale3; // 4.0
          float progress3 = fract(val3 * periodScale3) * maxVal3;
          float streakLength3 = 3.0;
          float activeStreak3 = max(0.0, progress3 - (maxVal3 - streakLength3));
          float streakValue3 = pow(activeStreak3 / streakLength3, 3.0);
          float dx3 = abs(fract(coordX3) - 0.5);
          float pxWidth3 = fwidth(coordX3);
          float hWidth3 = max(0.08, 0.8 * pxWidth3);
          float edge3 = pxWidth3 * 1.2;
          float glowProfile3 = smoothstep(hWidth3 + edge3, hWidth3 - edge3, dx3);
          float streak3 = streakValue3 * glowProfile3 * active3;
          vec3 col3 = mix(uColor3, uColor1, hash(colIndex3 + 5.0));
          vec3 streakColor = col2 * streak2 * 2.0 + col3 * streak3 * 1.3;
          float fade = smoothstep(0.12, 0.45, vUv.y);
          vec3 finalColor = ambientGlow + streakColor * fade * 1.5 * uStreaksIntensity;
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    // Foreground shader material (Stream 1 only, transparent background)
    this.materialFg = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      toneMapped: false,
      transparent: true,
      depthWrite: false, // Prevents depth occlusion issues between transparent layers
      uniforms: getUniforms(),
      vertexShader,
      fragmentShader: `
        uniform float uTime;
        uniform float uSpeed;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uStreaksIntensity;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        float hash(float n) {
          return fract(sin(n) * 43758.5453);
        }
        void main() {
          float speedMultiplier = uTime * uSpeed * 0.46;
          // Stream 1: Narrow, elegant streaks (starfall segments)
          float freq1 = 220.0;
          float coordX1 = vUv.x * freq1;
          float colIndex1 = floor(coordX1);
          float active1 = step(0.40, hash(colIndex1 + 1.0)); // 60% density
          float colSpeed1 = 1.8 + 0.6 * hash(colIndex1 + 13.0);
          float colOffset1 = hash(colIndex1 + 27.0) * 15.0;
          float val1 = vUv.y + speedMultiplier * colSpeed1 + colOffset1;
          float periodScale1 = 0.15;
          float maxVal1 = 1.0 / periodScale1; // 6.666
          float progress1 = fract(val1 * periodScale1) * maxVal1;
          float streakLength1 = 2.0;
          float activeStreak1 = max(0.0, progress1 - (maxVal1 - streakLength1));
          float streakValue1 = pow(activeStreak1 / streakLength1, 8.0);
          float dx1 = abs(fract(coordX1) - 0.5);
          float pxWidth1 = fwidth(coordX1);
          float hWidth1 = max(0.04, 0.8 * pxWidth1);
          float edge1 = pxWidth1 * 1.2;
          float glowProfile1 = smoothstep(hWidth1 + edge1, hWidth1 - edge1, dx1);
          float streak1 = streakValue1 * glowProfile1 * active1;
          vec3 col1 = mix(uColor1, uColor2, hash(colIndex1 + 7.0));
          float fade = smoothstep(0.12, 0.45, vUv.y);
          float alpha = streak1 * fade * uStreaksIntensity;
          gl_FragColor = vec4(col1 * 2.8, alpha);
        }
      `
    });
    this.meshBg = new THREE.Mesh(geoBg, this.materialBg);
    this.meshBg.position.set(0, 0, 0);
    this.meshBg.receiveShadow = true;
    this.scene.add(this.meshBg);
    this.meshFg = new THREE.Mesh(geoFg, this.materialFg);
    this.meshFg.position.set(0, 0, 0);
    this.meshFg.receiveShadow = true;
    this.scene.add(this.meshFg);
  }

  setSection(sectionId) {
    this.target = this.cloneTheme(THEMES[sectionId] ?? DEFAULT_THEME);
  }

  restore() {
    this.streaksTarget = 1.0;
  }

  update(dt) {
    this.time += dt;

    const blend = 1 - Math.pow(0.0001, dt);
    this.current.speed = THREE.MathUtils.lerp(this.current.speed, this.target.speed, blend);
    this.current.glowIntensity = THREE.MathUtils.lerp(this.current.glowIntensity, this.target.glowIntensity, blend);
    this.current.background.lerp(this.target.background, blend);
    this.current.glowColor.lerp(this.target.glowColor, blend);

    for (let i = 0; i < 3; i++) {
      this.current.colors[i].lerp(this.target.colors[i], blend);
    }

    if (this.streaksIntensity < this.streaksTarget) {
      this.streaksIntensity += dt * 0.25; // Fades in slowly over 4 seconds
      if (this.streaksIntensity > this.streaksTarget) {
        this.streaksIntensity = this.streaksTarget;
      }
    } else if (this.streaksIntensity > this.streaksTarget) {
      this.streaksIntensity -= dt * 0.25;
      if (this.streaksIntensity < this.streaksTarget) {
        this.streaksIntensity = this.streaksTarget;
      }
    }

    const updateMaterial = (material) => {
      if (!material) return;
      const u = material.uniforms;
      u.uTime.value = this.time;
      u.uSpeed.value = this.current.speed;
      if (u.uBgColor) u.uBgColor.value.copy(this.current.background);
      if (u.uGlowColor) u.uGlowColor.value.copy(this.current.glowColor);
      if (u.uGlowIntensity) u.uGlowIntensity.value = this.current.glowIntensity;
      u.uColor1.value.copy(this.current.colors[0]);
      u.uColor2.value.copy(this.current.colors[1]);
      if (u.uColor3) u.uColor3.value.copy(this.current.colors[2]);
      u.uStreaksIntensity.value = this.streaksIntensity;
    };
    updateMaterial(this.materialBg);
    updateMaterial(this.materialFg);
  }
  destroy() {
    if (this.meshBg) {
      this.scene.remove(this.meshBg);
      this.meshBg.geometry.dispose();
    }
    if (this.materialBg) {
      this.materialBg.dispose();
    }
    if (this.meshFg) {
      this.scene.remove(this.meshFg);
      this.meshFg.geometry.dispose();
    }
    if (this.materialFg) {
      this.materialFg.dispose();
    }
  }
}
