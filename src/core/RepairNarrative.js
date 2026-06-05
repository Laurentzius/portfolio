import * as THREE from 'three';
import { CUBIE_FACE_DEFINITIONS, CUBIE_VISUAL } from '../components/CubieVisuals.js';

const SLOT_DEFS = Object.freeze([
  Object.freeze({ position: [-1, 1, 1], faces: Object.freeze(['L', 'U', 'F']) }),
  Object.freeze({ position: [0, 1, 1], faces: Object.freeze(['U', 'F']) }),
  Object.freeze({ position: [0, 0, 1], faces: Object.freeze(['F']) }),
]);

const slotKey = position => `${Math.round(position.x)},${Math.round(position.y)},${Math.round(position.z)}`;

export class RepairNarrative {
  constructor(scene, rubiksCube, glassBoard) {
    this.scene = scene;
    this.rubiksCube = rubiksCube;
    this.glassBoard = glassBoard;
    this.repairedCount = 0;
    this.activeLoose = null;
    this.lockPulse = 0;
    this.sealFlashes = [];

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.slotsByKey = new Map();
    this.slots = SLOT_DEFS.map(def => this.createSlot(def));
    this.setProgress(0);
    this.hideAll(true);
  }

  createSlot(def) {
    const slotGroup = new THREE.Group();
    slotGroup.position.fromArray(def.position);

    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBIE_VISUAL.size, CUBIE_VISUAL.size, CUBIE_VISUAL.size)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    );
    slotGroup.add(frame);

    const faces = def.faces.map(faceName => this.createGhostFace(faceName));
    faces.forEach(face => slotGroup.add(face));

    this.rubiksCube.cubeGroup.add(slotGroup);

    const slot = {
      group: slotGroup,
      frame,
      faces,
      key: def.position.join(','),
      repaired: false,
      opacity: 0,
      targetOpacity: 0,
      magnet: 0,
    };
    this.slotsByKey.set(slot.key, slot);
    return slot;
  }

  createGhostFace(faceName) {
    const face = CUBIE_FACE_DEFINITIONS[faceName];
    const tile = new THREE.Mesh(
      new THREE.PlaneGeometry(CUBIE_VISUAL.tileWidth, CUBIE_VISUAL.tileHeight),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    tile.position.fromArray(face.position);
    tile.rotation.fromArray(face.rotation);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(CUBIE_VISUAL.tileWidth, CUBIE_VISUAL.tileHeight)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    );
    tile.add(outline);
    return tile;
  }

  showFor(loose) {
    this.hideAll(false);
    this.activeLoose = loose;
    if (!loose || !loose.targetPos) return;

    const slot = this.slotsByKey.get(slotKey(loose.targetPos));
    if (slot && !slot.repaired) {
      slot.group.visible = true;
      slot.targetOpacity = 1;
    }
  }

  hideAll(immediate = false) {
    this.activeLoose = null;
    this.slots.forEach(slot => {
      slot.targetOpacity = 0;
      slot.magnet = 0;
      if (immediate) {
        slot.opacity = 0;
        slot.group.visible = false;
        this.applySlotOpacity(slot, 0, 0, 0);
      }
    });
  }

  pulseLocked() {
    this.lockPulse = 1;
    this.slots.forEach(slot => {
      if (!slot.repaired) {
        slot.group.visible = true;
        slot.targetOpacity = Math.max(slot.targetOpacity, 0.45);
      }
    });
    if (this.glassBoard) {
      this.glassBoard.showLockedHint();
    }
  }

  markRepaired(targetPos, repairedCount) {
    const slot = this.slotsByKey.get(slotKey(targetPos));
    if (slot) {
      slot.repaired = true;
      slot.targetOpacity = 0;
      this.createSealFlash(slot.group.position);
    }
    this.setProgress(repairedCount);
  }

  createSealFlash(position) {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    const flash = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBIE_VISUAL.size * 1.06, CUBIE_VISUAL.size * 1.06, CUBIE_VISUAL.size * 1.06)),
      material
    );
    flash.position.copy(position);
    flash.userData.life = 1;
    this.rubiksCube.cubeGroup.add(flash);
    this.sealFlashes.push(flash);
  }

  setProgress(repairedCount) {
    this.repairedCount = repairedCount;
    if (this.glassBoard) {
      this.glassBoard.setRepairProgress(repairedCount, this.slots.length);
    }
  }

  updateDragFeedback(dt) {
    if (!this.activeLoose || !this.activeLoose.targetPos) return;

    const slot = this.slotsByKey.get(slotKey(this.activeLoose.targetPos));
    if (!slot || slot.repaired) return;

    const distance = this.activeLoose.group.position.distanceTo(this.activeLoose.targetPos);
    const magnet = THREE.MathUtils.clamp(1 - (distance - 0.55) / 1.35, 0, 1);
    slot.magnet = THREE.MathUtils.lerp(slot.magnet, magnet, Math.min(dt * 12, 1));

    if (slot.magnet > 0.08) {
      this.activeLoose.group.position.lerp(this.activeLoose.targetPos, slot.magnet * 0.035);
    }
  }

  applySlotOpacity(slot, opacity, pulse = 0, magnet = 0) {
    const lockBoost = this.lockPulse * 0.35;
    slot.frame.material.color.setRGB(1, 1 - lockBoost, 1 - lockBoost);
    slot.frame.material.opacity = opacity * (0.20 + pulse * 0.08 + magnet * 0.34 + lockBoost * 0.45);
    slot.faces.forEach(face => {
      face.material.opacity = opacity * (0.06 + pulse * 0.04 + magnet * 0.18);
      face.children[0].material.opacity = opacity * (0.24 + pulse * 0.10 + magnet * 0.28 + lockBoost * 0.25);
      face.children[0].material.color.copy(slot.frame.material.color);
    });
  }

  updateSealFlashes(dt) {
    for (let i = this.sealFlashes.length - 1; i >= 0; i--) {
      const flash = this.sealFlashes[i];
      flash.userData.life -= dt * 3.6;
      const life = Math.max(flash.userData.life, 0);
      flash.material.opacity = life * 0.8;
      const scale = 1 + (1 - life) * 0.16;
      flash.scale.setScalar(scale);
      if (life <= 0) {
        this.rubiksCube.cubeGroup.remove(flash);
        flash.geometry.dispose();
        flash.material.dispose();
        this.sealFlashes.splice(i, 1);
      }
    }
  }

  update(dt = 0.016) {
    const elapsed = performance.now() * 0.001;
    const fadeStep = Math.min(dt * 10.0, 1.0);

    this.updateDragFeedback(dt);
    this.lockPulse = Math.max(0, this.lockPulse - dt * 2.6);

    this.slots.forEach((slot, index) => {
      if (!slot.group.visible && slot.targetOpacity <= 0 && slot.opacity <= 0) return;

      if (slot.targetOpacity > 0) {
        slot.group.visible = true;
      }

      slot.opacity = THREE.MathUtils.lerp(slot.opacity, slot.targetOpacity, fadeStep);
      if (slot.opacity < 0.01 && slot.targetOpacity === 0) {
        slot.opacity = 0;
        slot.group.visible = false;
      }

      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.8 + index * 0.9);
      const magnetScale = 1 + slot.magnet * 0.045;
      slot.group.scale.setScalar(magnetScale);
      this.applySlotOpacity(slot, slot.opacity, pulse, slot.magnet);
    });

    this.updateSealFlashes(dt);
    if (this.lockPulse === 0 && !this.activeLoose) {
      this.slots.forEach(slot => {
        if (!slot.repaired) slot.targetOpacity = 0;
      });
    }

  }
}
