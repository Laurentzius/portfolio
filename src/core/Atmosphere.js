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

  initShowroom() {
    // 1. Curved Cyclorama Dome Geometry (enclosing the 3D scene)
    // We bend a flat grid into a curved studio background (Floor + Smooth Curve + Cylinder Wall)
    // Radius floor: 8, corner radius: 14 (softer rounding), cylinder wall radius: 22.
    // We bring the wall closer to the camera (radius 22) to make the lightfall streaks prominent,
    // while increasing the corner radius to 14 to make the transition from wall to floor extremely soft and gentle.
    const radiusFloor = 8.0;
    const cornerRadius = 14.0;
    const radiusWall = radiusFloor + cornerRadius; // 22.0

    const width = 2 * Math.PI * radiusWall; // Approx 263.8
    const length = 56;
    const segmentsX = 240;
    const segmentsY = 180;

    const geo = new THREE.PlaneGeometry(width, length, segmentsX, segmentsY);
    const pos = geo.attributes.position;

    // Y-split where corner curve begins
    // Plane runs along Y from -28 to 28
    const curveStart = -10;
    const curveEnd = curveStart + cornerRadius * (Math.PI / 2); // Transition arc length

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const flatY = pos.getY(i);

      let newY = 0;
      let r = 0;

      if (flatY < curveStart) {
        // Floor part: flat horizontal plane, pulled even lower to -11.45
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

    // 2. Custom ShaderMaterial to animate streaming lightfall streaks along the surface
    this.material = new THREE.ShaderMaterial({
      side: THREE.BackSide, // Visible from inside the cylinder
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: this.current.speed },
        uBgColor: { value: this.current.background },
        uGlowColor: { value: this.current.glowColor },
        uGlowIntensity: { value: this.current.glowIntensity },
        uColor1: { value: this.current.colors[0] },
        uColor2: { value: this.current.colors[1] },
        uColor3: { value: this.current.colors[2] },
        uStreaksIntensity: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
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

        // Custom pseudo-random generator
        float hash(float n) {
          return fract(sin(n) * 43758.5453);
        }

        // Noise functions for organic glowing streaks
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float n = i.x + i.y * 57.0;
          return mix(
            mix(hash(n), hash(n + 1.0), f.x),
            mix(hash(n + 57.0), hash(n + 58.0), f.x),
            f.y
          );
        }

        void main() {
          // Base showroom ambient glow in the center
          vec2 centerDist = vUv - vec2(0.5);
          float radialGlow = 1.0 - smoothstep(0.0, 0.76, length(centerDist));
          vec3 ambientGlow = uBgColor + uGlowColor * radialGlow * uGlowIntensity * 0.38;

          // Balanced speed multiplier for the lightfall (faster than 0.16, but slower than 0.95)
          float speedMultiplier = uTime * uSpeed * 0.46;

          // We combine three layers of vertical streaks (frequencies increased to make them thinner)

          // --- Stream 1: Narrow, elegant streaks ---
          float freq1 = 220.0;
          float coordX1 = vUv.x * freq1;
          float colIndex1 = floor(coordX1);
          float active1 = step(0.55, hash(colIndex1 + 1.0)); // 45% density (more lines)
          
          float flow1 = vUv.y + speedMultiplier * 1.5;
          float offset1 = hash(colIndex1) * 20.0;
          float n1 = noise(vec2(colIndex1, flow1 * 0.6 + offset1));
          float streakValue1 = smoothstep(0.68, 0.92, n1) * n1;
          
          // Anti-aliased glow profile: width scales with screen-space derivatives (fwidth)
          // to prevent pixel-shimmering and aliasing on distant or angled parts.
          float dx1 = abs(fract(coordX1) - 0.5);
          float pxWidth1 = fwidth(coordX1);
          float hWidth1 = max(0.04, 0.8 * pxWidth1);
          float edge1 = pxWidth1 * 1.2;
          float glowProfile1 = smoothstep(hWidth1 + edge1, hWidth1 - edge1, dx1);
          
          float streak1 = streakValue1 * glowProfile1 * active1;
          vec3 col1 = mix(uColor1, uColor2, hash(colIndex1));

          // --- Stream 2: Medium-width glowing trails ---
          float freq2 = 150.0;
          float coordX2 = vUv.x * freq2;
          float colIndex2 = floor(coordX2);
          float active2 = step(0.62, hash(colIndex2 + 42.0)); // 38% density
          
          float flow2 = vUv.y + speedMultiplier * 1.0;
          float offset2 = hash(colIndex2 + 20.0) * 30.0;
          float n2 = noise(vec2(colIndex2, flow2 * 0.4 + offset2));
          float streakValue2 = smoothstep(0.65, 0.88, n2) * n2;
          
          float dx2 = abs(fract(coordX2) - 0.5);
          float pxWidth2 = fwidth(coordX2);
          float hWidth2 = max(0.06, 0.8 * pxWidth2);
          float edge2 = pxWidth2 * 1.2;
          float glowProfile2 = smoothstep(hWidth2 + edge2, hWidth2 - edge2, dx2);
          
          float streak2 = streakValue2 * glowProfile2 * active2;
          vec3 col2 = mix(uColor2, uColor3, hash(colIndex2 + 12.0));

          // --- Stream 3: Wider, soft background trails ---
          float freq3 = 95.0;
          float coordX3 = vUv.x * freq3;
          float colIndex3 = floor(coordX3);
          float active3 = step(0.70, hash(colIndex3 + 99.0)); // 30% density
          
          float flow3 = vUv.y + speedMultiplier * 0.7;
          float offset3 = hash(colIndex3 + 40.0) * 15.0;
          float n3 = noise(vec2(colIndex3, flow3 * 0.25 + offset3));
          float streakValue3 = smoothstep(0.60, 0.85, n3) * n3;
          
          float dx3 = abs(fract(coordX3) - 0.5);
          float pxWidth3 = fwidth(coordX3);
          float hWidth3 = max(0.08, 0.8 * pxWidth3);
          float edge3 = pxWidth3 * 1.2;
          float glowProfile3 = smoothstep(hWidth3 + edge3, hWidth3 - edge3, dx3);
          
          float streak3 = streakValue3 * glowProfile3 * active3;
          vec3 col3 = mix(uColor3, uColor1, hash(colIndex3 + 5.0));

          // Compute final streak color overlays with adjusted balance
          vec3 streakColor = vec3(0.0);
          streakColor += col1 * streak1 * 2.5;
          streakColor += col2 * streak2 * 1.8;
          streakColor += col3 * streak3 * 1.2;

          // Fade out streaks toward the center of the floor (vUv.y -> 0)
          float fade = smoothstep(0.12, 0.45, vUv.y);

          vec3 finalColor = ambientGlow + streakColor * fade * 1.5 * uStreaksIntensity;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.set(0, 0, 0);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
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

    if (this.material) {
      const u = this.material.uniforms;
      u.uTime.value = this.time;
      u.uSpeed.value = this.current.speed;
      u.uBgColor.value.copy(this.current.background);
      u.uGlowColor.value.copy(this.current.glowColor);
      u.uGlowIntensity.value = this.current.glowIntensity;
      u.uColor1.value.copy(this.current.colors[0]);
      u.uColor2.value.copy(this.current.colors[1]);
      u.uColor3.value.copy(this.current.colors[2]);
      u.uStreaksIntensity.value = this.streaksIntensity;
    }
  }

  destroy() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
  }
}
