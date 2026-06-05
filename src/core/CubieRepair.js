import * as THREE from 'three';
import { faceNameFromLocalOffset } from '../components/CubieVisuals.js';

const REPAIR_SNAP_DISTANCE = 1.5;

export class CubieRepair {
  constructor({ rubiksCube, looseCubies, controls, navigation, audioEngine, repairNarrative }) {
    this.rubiksCube = rubiksCube;
    this.looseCubies = looseCubies;
    this.controls = controls;
    this.navigation = navigation;
    this.audioEngine = audioEngine;
    this.repairNarrative = repairNarrative;
    this.repairedCount = 0;
    this.tempWorldPos = new THREE.Vector3();
    this.tempOffset = new THREE.Vector3();
  }
  startDrag(loose) {
    if (this.repairNarrative) {
      this.repairNarrative.showFor(loose);
    }
  }

  cancelDrag() {
    if (this.repairNarrative) {
      this.repairNarrative.hideAll();
    }
  }


  release(loose) {
    const targetPos = loose.targetPos;
    if (!targetPos) {
      loose.endDrag();
      this.cancelDrag();
      return;
    }

    if (loose.group.position.distanceTo(targetPos) < REPAIR_SNAP_DISTANCE) {
      this.cancelDrag();
      loose.startAttraction(this);
    } else {
      loose.endDrag();
      this.cancelDrag();
    }
  }

  snap(loose, targetPos) {
    if (this.audioEngine) {
      this.audioEngine.playAttach();
    }

    if (loose.isDragging) {
      loose.endDrag();
      this.controls.enabled = true;
    }

    loose.group.position.copy(targetPos);
    if (loose.type === 'corner') {
      loose.group.rotation.set(0, -Math.PI / 2, 0);
    } else {
      loose.group.rotation.set(0, 0, 0);
    }
    loose.group.updateMatrixWorld();

    this.rubiksCube.cubeGroup.attach(loose.group);
    this.promoteLooseCubieMeshes(loose, targetPos);

    loose.group.userData = { initialPos: targetPos.clone() };
    this.rubiksCube.cubies.push(loose.group);

    const index = this.looseCubies.indexOf(loose);
    if (index !== -1) {
      this.looseCubies.splice(index, 1);
    }

    this.repairedCount++;
    if (this.repairNarrative) {
      this.repairNarrative.markRepaired(targetPos, this.repairedCount);
    }

    if (this.repairedCount === 3) {
      this.rubiksCube.isLocked = false;
      this.navigation.showRestoredIntro();
      window.dispatchEvent(new CustomEvent('cube-restored'));
    }
  }

  promoteLooseCubieMeshes(loose, targetPos) {
    loose.group.traverse(child => {
      if (!child.isMesh) return;

      child.userData.isLooseCubie = false;
      if (child === loose.bodyMesh) return;

      child.userData.isTile = true;
      child.getWorldPosition(this.tempWorldPos);
      this.tempOffset.copy(this.tempWorldPos).sub(targetPos);
      child.userData.faceName = faceNameFromLocalOffset(this.tempOffset);
      this.rubiksCube.tiles.push(child);
    });
  }
}
