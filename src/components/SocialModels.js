import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const SOCIAL_MODELS = Object.freeze([
  {
    id: 'github',
    label: 'GitHub',
    path: '/models/github.glb',
    position: new THREE.Vector3(1.25, 2.32, -1.28),
    rotation: new THREE.Euler(0.24, -0.36, -0.08),
  },
  {
    id: 'discord',
    label: 'Discord',
    path: '/models/discord.glb',
    position: new THREE.Vector3(0.75, 2.9, -0.13),
    rotation: new THREE.Euler(0.12, -0.16, 0.04),
  },
  {
    id: 'telegram',
    label: 'Telegram',
    path: '/models/telegram.glb',
    position: new THREE.Vector3(-0.06, 2.9, 0.75),
    rotation: new THREE.Euler(0.12, 0.16, -0.04),
  },
  {
    id: 'email',
    label: 'Email',
    path: '/models/email.glb',
    position: new THREE.Vector3(-1.15, 2.32, 1.38),
    rotation: new THREE.Euler(0.24, 0.36, 0.08),
  },
]);

export class SocialModels {
  constructor(parent) {
    this.parent = parent;
    this.loader = new GLTFLoader();
    this.group = new THREE.Group();
    this.group.name = 'SocialModels';
    this.items = [];
    this.disposables = [];
    this.visible = false;
    this.raycastTargets = [];
    this.group.visible = false;

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
      error => {
        console.warn(`Could not load ${config.label} model`, error);
      }
    );
  }

  addModel(config, model) {
    const root = new THREE.Group();
    root.name = `${config.label}SocialModel`;
    root.position.copy(config.position);
    root.rotation.copy(config.rotation);
    root.userData.socialConfig = config;
    root.add(model);

    this.normalizeModel(model);
    const materials = this.applyMaterials(model);
    this.markInteractive(model, root);
    const hitTarget = this.createHitTarget(root);
    this.group.add(root);
    this.raycastTargets.push(hitTarget);
    this.items.push({ root, model, hitTarget, materials, config });
  }

  normalizeModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z);

    if (maxAxis > 0) {
      model.scale.multiplyScalar(1.0 / maxAxis);
    }

    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
  }


  applyMaterials(model) {
    const modelMaterials = [];
    model.traverse(child => {
      if (!child.isMesh || !child.material) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const cloned = materials.map(() => {
        const next = new THREE.MeshPhysicalMaterial({
          color: 0x6f6f6f,
          emissive: 0x080808,
          emissiveIntensity: 0.18,
          roughness: 0.045,
          metalness: 0.84,
          clearcoat: 1.0,
          clearcoatRoughness: 0.025,
          transmission: 0.0,
          ior: 1.8,
          specularIntensity: 1.0,
          envMapIntensity: 1.75,
        });
        modelMaterials.push(next);
        this.disposables.push(next);
        return next;
      });

      child.material = Array.isArray(child.material) ? cloned : cloned[0];
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return modelMaterials;
  }


  createHitTarget(root) {
    const geometry = new THREE.SphereGeometry(1.0, 12, 8);
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const hitTarget = new THREE.Mesh(geometry, material);
    hitTarget.userData.isSocialModel = true;
    hitTarget.userData.socialRoot = root;
    root.add(hitTarget);
    this.disposables.push(geometry, material);
    return hitTarget;
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
    this.items.forEach(item => {
      const isHovered = item.root === root;
      item.materials.forEach(material => {
        material.color.setHex(isHovered ? 0xffffff : 0x6f6f6f);
        material.emissive.setHex(isHovered ? 0xffffff : 0x080808);
        material.emissiveIntensity = isHovered ? 3.2 : 0.18;
        material.needsUpdate = true;
      });
    });
  }

  setVisible(visible) {
    this.visible = visible;
    this.group.visible = visible;
    if (!visible) this.setHover(null);
  }

  open() {}

  update() {}

  destroy() {
    this.parent.remove(this.group);
    this.group.traverse(child => {
      if (child.isMesh && child.geometry) child.geometry.dispose();
    });
    this.disposables.forEach(disposable => disposable.dispose());
    this.items.length = 0;
  }
}
