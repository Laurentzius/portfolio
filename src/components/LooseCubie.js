import * as THREE from 'three';
import { createCubieBody, createCubieGeometries, createCubieMaterials, createCubieTile, CUBIE_VISUAL, LOOSE_CUBIE_FACES } from './CubieVisuals.js';

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

    const intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      const viewDir = new THREE.Vector3();
      this.camera.getWorldDirection(viewDir);

      const targetPosition = intersection.clone()
        .add(this.grabOffset)
        .addScaledVector(viewDir, this.dragDistanceOffset);

      // Lerp position to make it feel heavy/smooth
      const nextPos = this.group.position.clone().lerp(targetPosition, 0.25);
      const posDelta = nextPos.clone().sub(this.group.position);

      // Estimate real-time velocity for throwing (60 FPS scale factor)
      this.velocity.copy(posDelta).multiplyScalar(60);

      // Rotate physical piece while dragging to feel like it rolls/spins in-hand
      const cameraDir = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDir);
      const rotAxis = new THREE.Vector3().crossVectors(posDelta, cameraDir).normalize();
      const rotAngle = posDelta.length() * 2.2;
      
      if (rotAngle > 0.0001 && rotAxis.lengthSq() > 0.5) {
        this.group.rotateOnWorldAxis(rotAxis, rotAngle);
        this.angularVelocity.copy(rotAxis).multiplyScalar(rotAngle * 60);
      }

      this.group.position.copy(nextPos);
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
}
