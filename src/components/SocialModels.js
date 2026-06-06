import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const SOCIAL_MODELS = Object.freeze([
  {
    id: 'email',
    label: 'Email',
    path: '/models/github.glb', // envelope asset
    glowColor: new THREE.Color('#ffb86b'),
    position: new THREE.Vector3(1.5, 2.5, -1.4),
    rotation: new THREE.Euler(0.15, -2.1, -0.05),
    floatPhase: 0,
  },
  {
    id: 'discord',
    label: 'Discord',
    path: '/models/discord.glb',
    glowColor: new THREE.Color('#7c8aff'),
    position: new THREE.Vector3(0.6, 3.2, -0.3),
    rotation: new THREE.Euler(0.08, -2.1, 0.03),
    floatPhase: Math.PI * 0.5,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    path: '/models/telegram.glb',
    glowColor: new THREE.Color('#4fc3f7'),
    position: new THREE.Vector3(-0.3, 3.1, 0.85),
    rotation: new THREE.Euler(0.08, 0.14, -0.03),
    floatPhase: Math.PI,
  },
  {
    id: 'github',
    label: 'GitHub',
    path: '/models/email.glb', // octocat asset
    glowColor: new THREE.Color('#a0d0ff'),
    position: new THREE.Vector3(-1.4, 2.4, 1.6),
    rotation: new THREE.Euler(0.15, 0.3, 0.05),
    floatPhase: Math.PI * 1.5,
  },
]);

// Float animation
const FLOAT_BOB_AMPLITUDE = 0.06;
const FLOAT_BOB_SPEED = 1.2;
const FLOAT_TILT_AMPLITUDE = 0.04;
const FLOAT_TILT_SPEED = 0.7;

// Hover animation
const HOVER_LERP_SPEED = 6.0;
const BASE_EMISSIVE_INTENSITY = 0.0; // Totally dark base (no glow)
const HOVER_EMISSIVE_INTENSITY = 2.2; // Vibrant glow on hover
const HOVER_SCALE = 1.16;
const HOVER_LIGHT_INTENSITY = 10.0;
const HOVER_LIGHT_DISTANCE = 4.5;

// Group fade
const GROUP_FADE_SPEED = 3.0;

const _baseColor = new THREE.Color(0x111111); // Very dark chrome base color to blend into the composition
const _tmpColor = new THREE.Color();

export class SocialModels {
  constructor(parent) {
    this.parent = parent;
    this.loader = new GLTFLoader();
    this.group = new THREE.Group();
    this.group.name = 'SocialModels';
    this.items = [];
    this.disposables = [];
    this.visible = false;
    this.groupOpacity = 0;
    this.raycastTargets = [];
    this.group.visible = false;
    this.elapsed = 0;

    this.parent.add(this.group);
    this.loadAll();
  }

  loadAll() {
    SOCIAL_MODELS.forEach(config => this.loadModel(config));
  }

  loadModel(config) {
    this.loader.load(
      config.path,
      gltf => this.addModel(config, gltf.scene),
      undefined,
      error => console.warn(`Could not load ${config.label} model`, error),
    );
  }

  addModel(config, model) {
    const root = new THREE.Group();
    root.name = `${config.label}SocialModel`;
    root.position.copy(config.position);
    root.rotation.copy(config.rotation);
    root.userData.socialConfig = config;
    root.userData.baseY = config.position.y;
    root.userData.baseRotY = config.rotation.y;
    root.userData.baseRotZ = config.rotation.z;
    root.add(model);

    this.normalizeModel(model);
    const materials = this.applyMaterials(model, config);
    this.markInteractive(model, root);
    const hitTarget = this.createHitTarget(root);

    // Per-model point light for hover
    const pointLight = new THREE.PointLight(config.glowColor, 0, HOVER_LIGHT_DISTANCE);
    root.add(pointLight);

    this.group.add(root);
    this.raycastTargets.push(hitTarget);
    this.items.push({
      root, model, hitTarget, materials, config, pointLight,
      hoverT: 0,
      isHovered: false,
    });
  }

  normalizeModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z);
    if (maxAxis > 0) model.scale.multiplyScalar(1.0 / maxAxis);

    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
  }

  applyMaterials(model, config) {
    const out = [];
    model.traverse(child => {
      if (!child.isMesh || !child.material) return;
      const src = Array.isArray(child.material) ? child.material : [child.material];
      const cloned = src.map(() => {
        // High metalness StandardMaterial matches Rubik's cube body chrome texture,
        // but lets emissive shine beautifully on top without clearcoat shading bugs.
        const mat = new THREE.MeshStandardMaterial({
          color: 0x111111,
          emissive: config.glowColor.clone(),
          emissiveIntensity: 0.0,
          roughness: 0.1,
          metalness: 0.95,
          envMapIntensity: 4.0,
          toneMapped: true,
        });
        out.push(mat);
        this.disposables.push(mat);
        return mat;
      });
      child.material = Array.isArray(child.material) ? cloned : cloned[0];
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return out;
  }

  createHitTarget(root) {
    const geo = new THREE.SphereGeometry(1.0, 12, 8);
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.isSocialModel = true;
    mesh.userData.socialRoot = root;
    root.add(mesh);
    this.disposables.push(geo, mat);
    return mesh;
  }

  hitTest(raycaster) {
    if (!this.visible || this.raycastTargets.length === 0) return null;
    return raycaster.intersectObjects(this.raycastTargets, false)[0] ?? null;
  }

  markInteractive(model, root) {
    model.traverse(child => {
      if (!child.isMesh) return;
      child.userData.isSocialModel = true;
      child.userData.parentClass = this;
      child.userData.socialRoot = root;
    });
  }

  setHover(root) {
    for (const item of this.items) {
      item.isHovered = item.root === root;
    }
  }

  setVisible(visible) {
    this.visible = visible;
    if (visible) this.group.visible = true;
    if (!visible) this.setHover(null);
  }

  update(dt) {
    // Smooth group fade in/out
    const target = this.visible ? 1 : 0;
    this.groupOpacity += (target - this.groupOpacity) * Math.min(1, GROUP_FADE_SPEED * dt);

    if (this.groupOpacity < 0.001) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    this.elapsed += dt;

    for (const item of this.items) {
      const { config, root } = item;
      const phase = config.floatPhase;

      // --- Floating bob & tilt ---
      const bobY = Math.sin(this.elapsed * FLOAT_BOB_SPEED + phase) * FLOAT_BOB_AMPLITUDE;
      const tiltY = Math.sin(this.elapsed * FLOAT_TILT_SPEED + phase * 0.7) * FLOAT_TILT_AMPLITUDE;
      const tiltZ = Math.cos(this.elapsed * FLOAT_TILT_SPEED * 0.8 + phase) * FLOAT_TILT_AMPLITUDE * 0.5;

      root.position.y = root.userData.baseY + bobY;
      root.rotation.y = root.userData.baseRotY + tiltY;
      root.rotation.z = root.userData.baseRotZ + tiltZ;

      // --- Smooth hover transition ---
      const hoverTarget = item.isHovered ? 1 : 0;
      item.hoverT += (hoverTarget - item.hoverT) * Math.min(1, HOVER_LERP_SPEED * dt);
      const t = item.hoverT;
      const op = this.groupOpacity;

      // Scale: base → pop
      root.scale.setScalar((1.0 + (HOVER_SCALE - 1.0) * t) * op);

      // Material: color tints, emissive intensity ramps up
      const ei = t * HOVER_EMISSIVE_INTENSITY;
      _tmpColor.copy(_baseColor).lerp(config.glowColor, t * 0.15);

      for (const mat of item.materials) {
        mat.color.copy(_tmpColor);
        mat.emissive.copy(config.glowColor);
        mat.emissiveIntensity = ei * op;
      }

      // Point light
      item.pointLight.intensity = t * HOVER_LIGHT_INTENSITY * op;
    }
  }

  destroy() {
    this.parent.remove(this.group);
    this.group.traverse(child => {
      if (child.isMesh && child.geometry) child.geometry.dispose();
    });
    this.disposables.forEach(d => d.dispose());
    this.items.length = 0;
  }
}
