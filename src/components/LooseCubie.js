import * as THREE from 'three';
import { createCubieBody, createCubieGeometries, createCubieMaterials, createCubieTile, CUBIE_VISUAL, LOOSE_CUBIE_FACES } from './CubieVisuals.js';
// ponytail: module-scoped scratch for onDrag — only one loose cubie drags at a time
const _dragIntersection = new THREE.Vector3();
const _dragViewDir = new THREE.Vector3();
const _dragTargetPos = new THREE.Vector3();
const _dragNextPos = new THREE.Vector3();
const _dragPosDelta = new THREE.Vector3();
const _dragRotAxis = new THREE.Vector3();

export class LooseCubie {
  constructor(scene, camera, type = 'corner', initialPos, initialRot) {
    this.scene = scene;
    this.camera = camera;
    this.type = type; // 'corner', 'edge', or 'center'

    this.group = new THREE.Group();
    this.group.position.copy(initialPos);
    if (initialRot) {
      this.group.rotation.copy(initialRot);
    }
    this.scene.add(this.group);

    // Physics / Inertia states
    this.isDragging = false;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.angularVelocity = new THREE.Vector3(0, 0, 0);
    
    this.grabOffset = new THREE.Vector3();
    this.dragPlane = new THREE.Plane();
    
    this.restitution = 0.45; // Bounciness
    this.friction = 0.90;    // Floor sliding friction
    this.radius = CUBIE_VISUAL.radius;

    this.initMesh();
  }

  initMesh() {
    const { bodyMaterial, tileMaterial } = createCubieMaterials();
    const { bodyGeometry, tileGeometry } = createCubieGeometries();

    this.bodyMaterial = bodyMaterial;
    this.tileMaterial = tileMaterial;
    this.bodyGeometry = bodyGeometry;
    this.tileGeometry = tileGeometry;
    this.bodyMesh = createCubieBody(bodyGeometry, this.bodyMaterial, { isLooseCubie: true, parentClass: this });
    this.group.add(this.bodyMesh);

    const faces = LOOSE_CUBIE_FACES[this.type] || LOOSE_CUBIE_FACES.center;
    faces.forEach(faceName => this.addTile(tileGeometry, faceName));
  }

  addTile(geometry, faceName) {
    const tileMesh = createCubieTile(geometry, this.tileMaterial.clone(), faceName, { isLooseCubie: true, parentClass: this, faceName: faceName });
    this.group.add(tileMesh);
  }

  startDrag(intersectionPoint) {
    this.isDragging = true;
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.dragDistanceOffset = 0;

    // Grab offset allows dragging from the clicked point instead of snapping center
    this.grabOffset.copy(this.group.position).sub(intersectionPoint);

    // Create a drag plane perpendicular to camera direction passing through click point
    const planeNormal = new THREE.Vector3();
    this.camera.getWorldDirection(planeNormal);
    planeNormal.negate(); // Plane normal points back at camera
    this.dragPlane.setFromNormalAndCoplanarPoint(planeNormal, intersectionPoint);
  }

  onDrag(raycaster) {
    if (!this.isDragging) return;

    if (raycaster.ray.intersectPlane(this.dragPlane, _dragIntersection)) {
      this.camera.getWorldDirection(_dragViewDir);

      _dragTargetPos.copy(_dragIntersection)
        .add(this.grabOffset)
        .addScaledVector(_dragViewDir, this.dragDistanceOffset);

      // Lerp position to make it feel heavy/smooth
      _dragNextPos.copy(this.group.position).lerp(_dragTargetPos, 0.25);
      _dragPosDelta.copy(_dragNextPos).sub(this.group.position);

      // Estimate real-time velocity for throwing (60 FPS scale factor)
      this.velocity.copy(_dragPosDelta).multiplyScalar(60);

      // Rotate physical piece while dragging to feel like it rolls/spins in-hand
      _dragRotAxis.crossVectors(_dragPosDelta, _dragViewDir).normalize();
      const rotAngle = _dragPosDelta.length() * 2.2;
      
      if (rotAngle > 0.0001 && _dragRotAxis.lengthSq() > 0.5) {
        this.group.rotateOnWorldAxis(_dragRotAxis, rotAngle);
        this.angularVelocity.copy(_dragRotAxis).multiplyScalar(rotAngle * 60);
      }

      this.group.position.copy(_dragNextPos);
    }
  }

  handleWheel(deltaY) {
    if (!this.isDragging) return;
    // Scroll up (negative deltaY) pushes away; scroll down (positive deltaY) pulls closer
    const speed = -deltaY * 0.004;
    this.dragDistanceOffset += speed;
    
    // Clamp depth offset to prevent item going behind camera or too far away
    this.dragDistanceOffset = Math.max(-10, Math.min(this.dragDistanceOffset, 6));
  }

  endDrag() {
    this.isDragging = false;
    this.angularVelocity.multiplyScalar(0.75); // Slightly dampen angular velocity on throw release
  }

  startAttraction(repair) {
    this.isDragging = false;
    this.isAttracting = true;
    this.repair = repair;

    this.attractStartPos = this.group.position.clone();
    this.attractStartRot = this.group.quaternion.clone();

    this.attractTargetPos = this.targetPos.clone();

    const targetEuler = new THREE.Euler(0, 0, 0);
    if (this.type === 'corner') {
      targetEuler.set(0, -Math.PI / 2, 0);
    }
    this.attractTargetRot = new THREE.Quaternion().setFromEuler(targetEuler);

    this.attractProgress = 0;
    this.attractDuration = 0.35; // 350ms feel snappy but smooth
  }

  updateAttraction(dt) {
    if (this.isAttracting) {
      this.attractProgress += dt / this.attractDuration;
      const t = Math.min(this.attractProgress, 1.0);

      // Smooth ease-out cubic interpolation
      const ease = 1 - Math.pow(1 - t, 3);

      // Lerp position
      this.group.position.lerpVectors(this.attractStartPos, this.attractTargetPos, ease);

      // Slerp rotation
      this.group.quaternion.slerpQuaternions(this.attractStartRot, this.attractTargetRot, ease);

      if (t >= 1.0) {
        this.isAttracting = false;
        this.repair.snap(this, this.targetPos);
      }
      return;
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    if (this.bodyGeometry) this.bodyGeometry.dispose();
    if (this.tileGeometry) this.tileGeometry.dispose();
    if (this.bodyMaterial) this.bodyMaterial.dispose();
    if (this.tileMaterial) this.tileMaterial.dispose();
  }
}
