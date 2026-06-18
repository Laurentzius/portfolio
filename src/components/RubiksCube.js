import * as THREE from 'three';
import { CUBIE_VISUAL, createCubieBody, createCubieGeometries, createCubieMaterials, createCubieTile } from './CubieVisuals.js';

const GAP_GLOW = Object.freeze({
  gapCenters: Object.freeze([-0.5, 0.5]),
  cubeExtent: 1 + CUBIE_VISUAL.size / 2,
  faceSpan: 2 + CUBIE_VISUAL.size,
  stripWidth: 0.22,
  surfaceOffset: 0.012,
});

const DRAG_ROTATION_SENSITIVITY = 0.78;
const DRAG_FOLLOW_SPEED = 7.0;

export class RubiksCube {
  constructor(experience, onMoveCallback) {
    this.exp = experience;
    this.scene = experience.scene;
    this.camera = experience.camera;
    this.domElement = experience.canvas;
    this.audioEngine = experience.audioEngine;
    this.onMoveCallback = onMoveCallback;
    this.clickRaycaster = new THREE.Raycaster();

    this.visualGroup = new THREE.Group();
    this.scene.add(this.visualGroup);

    this.cubeGroup = new THREE.Group();
    this.visualGroup.add(this.cubeGroup);

    this.cubies = [];
    this.tiles = [];

    // Puzzle Lock state
    this.isLocked = true;

    // Rotation & Interaction states
    this.isDragging = false;
    this.dragStarted = false;
    this.clickedCubie = null;
    this.clickedTile = null;
    this.clickedNormal = new THREE.Vector3();
    this.mouseStart = new THREE.Vector2();
    this.mouseCurrent = new THREE.Vector2();
    this.mouseDragStart = new THREE.Vector2();
    this._dragScratch = new THREE.Vector2();
    
    // Slice rotation state
    this.activeRotationAxis = null; // THREE.Vector3
    this.activeSliceCoord = 0;      // -1, 0, or 1
    this.rotationGroup = new THREE.Group();
    this.visualGroup.add(this.rotationGroup);
    
    this.isAnimating = false;
    this.animationQueue = [];
    this.moveHistory = [];
    this.idleStartedAt = performance.now();
    
    // Snapping state
    this.isSnapping = false;
    this.snapAxis = null;
    this.snapTargetAngle = 0;
    this.snapCurrentAngle = 0;

    this.gapGlowGroup = null;
    this.gapGlowMaterials = [];
    this.gapGlowColor = new THREE.Color();
    this.gapGlowTexture = null;
    this.gapGlowIntensity = 0.0;

    // Materials
    this.initMaterials();
    
    // Create the geometry and cubes
    this.buildCube();
    this.buildGapGlow();
  }

  initMaterials() {
    const materials = createCubieMaterials();
    this.bodyMaterial = materials.bodyMaterial;
    this.tileMaterial = materials.tileMaterial;
  }

  buildCube() {
    const { bodyGeometry, tileGeometry } = createCubieGeometries();

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // Skip the inner-most core cubie as it is never visible
          if (x === 0 && y === 0 && z === 0) continue;

          // Skip missing pieces for the interactive repair puzzle
          if (x === -1 && y === 1 && z === 1) continue; // Corner slot
          if (x === 0 && y === 1 && z === 1) continue;  // Edge slot
          if (x === 0 && y === 0 && z === 1) continue;  // Center slot

          const cubie = new THREE.Group();
          cubie.position.set(x * 1.0, y * 1.0, z * 1.0);
          
          cubie.add(createCubieBody(bodyGeometry, this.bodyMaterial, {}));

          if (x === 1) this.addTile(cubie, tileGeometry, 'R');
          if (x === -1) this.addTile(cubie, tileGeometry, 'L');
          if (y === 1) this.addTile(cubie, tileGeometry, 'U');
          if (y === -1) this.addTile(cubie, tileGeometry, 'D');
          if (z === 1) this.addTile(cubie, tileGeometry, 'F');
          if (z === -1) this.addTile(cubie, tileGeometry, 'B');

          // Save cubie data
          cubie.userData = { initialPos: new THREE.Vector3(x, y, z) };
          this.cubeGroup.add(cubie);
          this.cubies.push(cubie);
        }
      }
    }

  }

  createGapGlowTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    gradient.addColorStop(0.36, 'rgba(255, 255, 255, 0.18)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.64, 'rgba(255, 255, 255, 0.18)');
    gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  createGapGlowMaterial(baseOpacity) {
    const material = new THREE.MeshBasicMaterial({
      map: this.gapGlowTexture,
      color: 0x7df9ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    material.userData.baseOpacity = baseOpacity;
    this.gapGlowMaterials.push(material);
    return material;
  }

  getFaceBasis(normal) {
    const helper = Math.abs(normal.y) > 0.9
      ? new THREE.Vector3(0, 0, 1)
      : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(helper, normal).normalize();
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();
    return { u, v };
  }

  setGapPlaneTransform(mesh, localX, localY, localZ, position) {
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(localX, localY, localZ);
    mesh.quaternion.setFromRotationMatrix(matrix);
    mesh.position.copy(position);
  }

  addInternalGapPlane(group, normal, offset) {
    const geometry = new THREE.PlaneGeometry(GAP_GLOW.faceSpan, GAP_GLOW.faceSpan);
    const mesh = new THREE.Mesh(geometry, this.createGapGlowMaterial(0.018));
    const { u, v } = this.getFaceBasis(normal);
    const position = normal.clone().multiplyScalar(offset);
    this.setGapPlaneTransform(mesh, u, v, normal, position);
    mesh.renderOrder = 1;
    group.add(mesh);
  }

  addSurfaceGapStrip(group, normal, offset, axis) {
    const geometry = new THREE.PlaneGeometry(GAP_GLOW.stripWidth, GAP_GLOW.faceSpan);
    const mesh = new THREE.Mesh(geometry, this.createGapGlowMaterial(0.075));
    const { u, v } = this.getFaceBasis(normal);
    const base = normal.clone().multiplyScalar(GAP_GLOW.cubeExtent + GAP_GLOW.surfaceOffset);

    if (axis === 'u') {
      this.setGapPlaneTransform(mesh, u, v, normal, base.add(u.clone().multiplyScalar(offset)));
    } else {
      this.setGapPlaneTransform(mesh, v, u.clone().multiplyScalar(-1), normal, base.add(v.clone().multiplyScalar(offset)));
    }
    mesh.renderOrder = 8;
    group.add(mesh);
  }

  buildGapGlow() {
    this.gapGlowGroup = new THREE.Group();
    this.gapGlowGroup.name = 'cube-gap-glow';
    this.gapGlowTexture = this.createGapGlowTexture();

    const axes = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
    ];
    for (const normal of axes) {
      for (const offset of GAP_GLOW.gapCenters) {
        this.addInternalGapPlane(this.gapGlowGroup, normal, offset);
      }
    }

    const faces = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];
    for (const normal of faces) {
      for (const offset of GAP_GLOW.gapCenters) {
        this.addSurfaceGapStrip(this.gapGlowGroup, normal, offset, 'u');
        this.addSurfaceGapStrip(this.gapGlowGroup, normal, offset, 'v');
      }
    }

    this.cubeGroup.add(this.gapGlowGroup);
  }

  updateGapGlow(activeMotion) {
    if (!this.gapGlowMaterials.length) return;

    const targetIntensity = this.isLocked || activeMotion ? 0.0 : 1.0;
    const fadeSpeed = targetIntensity > this.gapGlowIntensity ? 0.035 : 0.18;
    this.gapGlowIntensity = THREE.MathUtils.lerp(this.gapGlowIntensity, targetIntensity, fadeSpeed);

    const colors = this.exp.atmosphere?.current?.colors;
    if (colors) {
      this.gapGlowColor.copy(colors[0]).lerp(colors[1], 0.55);
    } else {
      this.gapGlowColor.set(0x7df9ff);
    }
    for (const material of this.gapGlowMaterials) {
      material.color.copy(this.gapGlowColor);
      material.opacity = material.userData.baseOpacity * this.gapGlowIntensity;
    }
  }

  addTile(parent, geometry, faceName) {
    const tileMesh = createCubieTile(geometry, this.tileMaterial.clone(), faceName, {
      isTile: true,
      faceName: faceName,
    });
    parent.add(tileMesh);
    this.tiles.push(tileMesh);
  }

  getMousePosition(e, target) {
    const rect = this.domElement.getBoundingClientRect();
    const out = target || new THREE.Vector2();
    out.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    return out;
  }

  onPointerDown(e) {
    if (this.isLocked) {
      const mouse = this.getMousePosition(e);
      const raycaster = this.clickRaycaster;
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.cubeGroup.children, true);
      const tileIntersect = intersects.find(intersect => intersect.object.userData.isTile);
      if (tileIntersect && this.exp.repairNarrative) {
        this.exp.repairNarrative.pulseLocked();
      }
      return;
    }
    if (this.isSnapping) {
      this.setRotationGroupAngle(this.snapTargetAngle);
      
      const axisStr = this.getAxisString(this.snapAxis);
      const axisSign = Math.sign(this.snapAxis[axisStr.toLowerCase()]);
      const quarterTurns = Math.round((this.snapTargetAngle * axisSign) / (Math.PI / 2));
      
      if (quarterTurns % 4 !== 0) {
        this.recordMove(axisStr, this.activeSliceCoord, quarterTurns);
        if (this.onMoveCallback) this.onMoveCallback();
      }

      this.finalizeSliceRotation(true);
    }

    if (this.isAnimating || this.animationQueue.length > 0) return;

    this.getMousePosition(e, this.mouseStart);
    this.mouseCurrent.copy(this.mouseStart);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.mouseStart, this.camera);
    
    // Only raycast against our tiles to avoid dragging the black inner body
    const intersects = raycaster.intersectObjects(this.cubeGroup.children, true);
    
    const tileIntersect = intersects.find(intersect => intersect.object.userData.isTile);

    if (tileIntersect) {
      this.isDragging = true;
      this.dragStarted = false;
      this.clickedTile = tileIntersect.object;
      this.clickedCubie = this.clickedTile.parent;
      
      // Get normal in world coords
      const localNormal = new THREE.Vector3(0, 0, 1);
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(this.clickedTile.matrixWorld);
      this.clickedNormal.copy(localNormal).applyMatrix3(normalMatrix).normalize();
      
      this.clickedNormal.set(
        Math.round(this.clickedNormal.x),
        Math.round(this.clickedNormal.y),
        Math.round(this.clickedNormal.z)
      );

      // Tell experience to lock OrbitControls
      if (this.exp.controls) this.exp.controls.enabled = false;
    }
  }

  onPointerMove(e) {
    if (this.isLocked) return;
    if (!this.isDragging) return;

    this.getMousePosition(e, this.mouseCurrent);
    const dragVector = this._dragScratch.copy(this.mouseCurrent).sub(this.mouseStart);
    
    if (!this.dragStarted) {
      const rect = this.domElement.getBoundingClientRect();
      const dragPixels = new THREE.Vector2(
        dragVector.x * rect.width * 0.5,
        dragVector.y * rect.height * 0.5
      );
      if (dragPixels.length() > 25) {
        this.selectSliceRotation(dragVector);
      }
    } else {
      this.updateSliceRotation();
    }
  }

  selectSliceRotation(dragVector) {
    const normal = this.clickedNormal;
    const possibleAxes = [];
    
    if (Math.abs(normal.x) < 0.5) possibleAxes.push(new THREE.Vector3(1, 0, 0));
    if (Math.abs(normal.y) < 0.5) possibleAxes.push(new THREE.Vector3(0, 1, 0));
    if (Math.abs(normal.z) < 0.5) possibleAxes.push(new THREE.Vector3(0, 0, 1));
    
    if (possibleAxes.length !== 2) return;

    const axisU = possibleAxes[0];
    const axisV = possibleAxes[1];
    const centerWorld = this.clickedCubie.getWorldPosition(new THREE.Vector3());
    const axisUWorld = axisU.clone().transformDirection(this.visualGroup.matrixWorld);
    const axisVWorld = axisV.clone().transformDirection(this.visualGroup.matrixWorld);
    
    const screenCenter = this.projectWorldToScreen(centerWorld);
    const screenU_NDC = this.projectWorldToScreen(centerWorld.clone().add(axisUWorld)).sub(screenCenter);
    const screenV_NDC = this.projectWorldToScreen(centerWorld.clone().add(axisVWorld)).sub(screenCenter);

    const rect = this.domElement.getBoundingClientRect();
    const aspect = rect.width / rect.height;

    const screenU_px = new THREE.Vector2(screenU_NDC.x * aspect, screenU_NDC.y).normalize();
    const screenV_px = new THREE.Vector2(screenV_NDC.x * aspect, screenV_NDC.y).normalize();
    const drag_px = new THREE.Vector2(dragVector.x * aspect, dragVector.y);
    const dragDir_px = drag_px.clone().normalize();

    const dotU = dragDir_px.dot(screenU_px);
    const dotV = dragDir_px.dot(screenV_px);

    let winningAxis3D;
    if (Math.abs(dotU) > Math.abs(dotV)) {
      winningAxis3D = axisU;
      this.winningScreenAxisPx = screenU_px;
    } else {
      winningAxis3D = axisV;
      this.winningScreenAxisPx = screenV_px;
    }

    this.activeRotationAxis = new THREE.Vector3().crossVectors(normal, winningAxis3D).normalize();
    this.activeRotationAxis.set(
      Math.round(this.activeRotationAxis.x),
      Math.round(this.activeRotationAxis.y),
      Math.round(this.activeRotationAxis.z)
    );

    const pos = this.clickedCubie.position;
    if (Math.abs(this.activeRotationAxis.x) > 0.5) {
      this.activeSliceCoord = Math.round(pos.x);
    } else if (Math.abs(this.activeRotationAxis.y) > 0.5) {
      this.activeSliceCoord = Math.round(pos.y);
    } else {
      this.activeSliceCoord = Math.round(pos.z);
    }

    this.groupSliceCubies();
    this.mouseDragStart.copy(this.mouseCurrent);
    this.dragTargetAngle = 0;
    this.dragCurrentAngle = 0;
    this.dragStarted = true;
  }

  groupSliceCubies() {
    this.rotationGroup.position.set(0, 0, 0);
    this.rotationGroup.rotation.set(0, 0, 0);
    this.rotationGroup.updateMatrixWorld();

    const targetCoords = this.activeSliceCoord;
    const axis = this.activeRotationAxis;

    const sliceCubies = this.cubies.filter(cubie => {
      const pos = cubie.position;
      if (Math.abs(axis.x) > 0.5) return Math.round(pos.x) === targetCoords;
      if (Math.abs(axis.y) > 0.5) return Math.round(pos.y) === targetCoords;
      return Math.round(pos.z) === targetCoords;
    });

    sliceCubies.forEach(cubie => {
      this.rotationGroup.attach(cubie);
    });
  }

  updateSliceRotation() {
    const rect = this.domElement.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    
    const dragVector = this._dragScratch.set(
      (this.mouseCurrent.x - this.mouseDragStart.x) * aspect,
      (this.mouseCurrent.y - this.mouseDragStart.y)
    );
    
    const projection = dragVector.dot(this.winningScreenAxisPx);
    this.dragTargetAngle = projection * Math.PI * DRAG_ROTATION_SENSITIVITY;
  }

  setRotationGroupAngle(angle) {
    if (this.activeRotationAxis) {
      this.rotationGroup.setRotationFromAxisAngle(this.activeRotationAxis, angle);
    }
  }

  onPointerUp() {
    if (!this.isDragging) return;

    this.isDragging = false;

    if (this.dragStarted) {
      const step = Math.PI / 2;
      const targetAngle = Math.round(this.dragCurrentAngle / step) * step;

      this.isSnapping = true;
      this.snapAxis = this.activeRotationAxis.clone();
      this.snapTargetAngle = targetAngle;
      this.snapStartAngle = this.dragCurrentAngle;
      this.snapCurrentAngle = this.dragCurrentAngle;
      this.snapStartTime = performance.now();
      this.snapDuration = 250;
    } else {
      if (this.exp.controls) this.exp.controls.enabled = true;
      this.resetDragState();
    }
  }

  resetDragState() {
    this.clickedCubie = null;
    this.clickedTile = null;
    this.activeRotationAxis = null;
    this.mouseDragStart.set(0, 0);
    this.dragStarted = false;
  }

  projectWorldToScreen(worldPos) {
    const pos = worldPos.clone().project(this.camera);
    return new THREE.Vector2(pos.x, pos.y);
  }

  update(dt = 1 / 60) {
    const activeMotion = (this.isDragging && this.dragStarted) || this.isSnapping || this.isAnimating || this.animationQueue.length > 0;
    const t = (performance.now() - this.idleStartedAt) * 0.001;

    const targetX = Math.sin(t * 0.32) * 0.008;
    const targetY = Math.sin(t * 0.45) * 0.018;
    const rotationLerp = Math.min(1, 4.2 * dt);

    this.visualGroup.rotation.x = THREE.MathUtils.lerp(this.visualGroup.rotation.x, targetX, rotationLerp);
    this.visualGroup.rotation.y = THREE.MathUtils.lerp(this.visualGroup.rotation.y, targetY, rotationLerp);
    this.updateGapGlow(activeMotion);

    // 1. Process drag inertia
    if (this.isDragging && this.dragStarted) {
      this.dragCurrentAngle = THREE.MathUtils.lerp(this.dragCurrentAngle, this.dragTargetAngle, Math.min(1, DRAG_FOLLOW_SPEED * dt));
      this.setRotationGroupAngle(this.dragCurrentAngle);
    }

    // 2. Process snap animations
    if (this.isSnapping) {
      const elapsed = performance.now() - this.snapStartTime;
      const progress = Math.min(elapsed / this.snapDuration, 1.0);
      
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      
      this.snapCurrentAngle = THREE.MathUtils.lerp(this.snapStartAngle, this.snapTargetAngle, ease);
      this.setRotationGroupAngle(this.snapCurrentAngle);

      if (progress >= 1.0) {
        this.setRotationGroupAngle(this.snapTargetAngle);
        
        const axisStr = this.getAxisString(this.snapAxis);
        const axisSign = Math.sign(this.snapAxis[axisStr.toLowerCase()]);
        const quarterTurns = Math.round((this.snapTargetAngle * axisSign) / (Math.PI / 2));
        
        if (quarterTurns % 4 !== 0) {
          this.recordMove(axisStr, this.activeSliceCoord, quarterTurns);
          if (this.onMoveCallback) this.onMoveCallback();
        }

        this.finalizeSliceRotation(true);
      }
    }

    // 3. Process automated queue animations
    if (!this.isAnimating && !this.isSnapping && this.animationQueue.length > 0) {
      const nextMove = this.animationQueue.shift();
      this.animateMove(nextMove);
    }
  }

  finalizeSliceRotation(isManual = false) {
    const tempArray = [...this.rotationGroup.children];
    tempArray.forEach(cubie => {
      this.cubeGroup.attach(cubie);
      
      cubie.position.set(
        Math.round(cubie.position.x),
        Math.round(cubie.position.y),
        Math.round(cubie.position.z)
      );

      this.roundQuaternion(cubie.quaternion);
    });

    this.isSnapping = false;
    this.resetDragState();
    
    // Play sound from central AudioEngine
    if (this.audioEngine) {
      this.audioEngine.playCubeClack();
    }

    // Release OrbitControls
    if (this.exp.controls) this.exp.controls.enabled = true;

    // Trigger state check when layer snaps or finishes twist
    if (isManual && this.exp.onCubeStateChanged) {
      this.exp.onCubeStateChanged();
    }
    if (this.exp.updateLogosProjection) {
      this.exp.updateLogosProjection();
    }
  }

  roundQuaternion(q) {
    const matrix = new THREE.Matrix4().makeRotationFromQuaternion(q);
    const x = new THREE.Vector3(1, 0, 0).applyMatrix4(matrix).normalize();

    const y = new THREE.Vector3(0, 1, 0).applyMatrix4(matrix).normalize();
    const z = new THREE.Vector3(0, 0, 1).applyMatrix4(matrix).normalize();
    
    const rx = new THREE.Vector3(Math.round(x.x), Math.round(x.y), Math.round(x.z)).normalize();
    const ry = new THREE.Vector3(Math.round(y.x), Math.round(y.y), Math.round(y.z)).normalize();
    const rz = rx.clone().cross(ry).normalize();
    const ryOrtho = rz.clone().cross(rx).normalize();
    
    const roundedMatrix = new THREE.Matrix4().makeBasis(rx, ryOrtho, rz);
    q.setFromRotationMatrix(roundedMatrix);
  }

  getAxisString(axis) {
    if (Math.abs(axis.x) > 0.5) return 'X';
    if (Math.abs(axis.y) > 0.5) return 'Y';
    return 'Z';
  }

  recordMove(axis, slice, quarterTurns) {
    let turns = quarterTurns % 4;
    if (turns > 2) turns -= 4;
    if (turns < -2) turns += 4;
    if (turns === 0) return;

    this.moveHistory.push({ axis, slice, turns });
  }

  shuffle(steps = 15) {
    if (this.isLocked) return;
    if (this.isAnimating || this.isSnapping || this.isDragging) return;
    
    const axes = ['X', 'Y', 'Z'];
    const slices = [-1, 0, 1];
    const turns = [-1, 1];

    for (let i = 0; i < steps; i++) {
      const axis = axes[Math.floor(Math.random() * axes.length)];
      const slice = slices[Math.floor(Math.random() * slices.length)];
      const turn = turns[Math.floor(Math.random() * turns.length)];
      
      this.animationQueue.push({ axis, slice, turns: turn, duration: 150 });
    }
  }

  turnRandomSlice() {
    if (this.isLocked) return;
    if (this.isAnimating || this.isSnapping || this.isDragging || this.animationQueue.length > 0) return;
    
    const axes = ['X', 'Y', 'Z'];
    const slices = [-1, 0, 1];
    const turns = [-1, 1];

    const axis = axes[Math.floor(Math.random() * axes.length)];
    const slice = slices[Math.floor(Math.random() * slices.length)];
    const turn = turns[Math.floor(Math.random() * turns.length)];

    // snappy 250ms random layer twist, recorded in history
    this.animationQueue.push({ axis, slice, turns: turn, duration: 250, recordInHistory: true });
  }

  animateMove(move) {
    this.isAnimating = true;
    this.activeSliceCoord = move.slice;
    
    if (move.axis === 'X') this.activeRotationAxis = new THREE.Vector3(1, 0, 0);
    else if (move.axis === 'Y') this.activeRotationAxis = new THREE.Vector3(0, 1, 0);
    else this.activeRotationAxis = new THREE.Vector3(0, 0, 1);

    this.groupSliceCubies();

    const startAngle = 0;
    const targetAngle = move.turns * (Math.PI / 2);
    const duration = move.duration || 300;
    const startTime = performance.now();

    const animateStep = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const currentAngle = THREE.MathUtils.lerp(startAngle, targetAngle, ease);
      this.setRotationGroupAngle(currentAngle);

      if (progress < 1.0) {
        this.animateFrameId = requestAnimationFrame(animateStep);
      } else {
        this.setRotationGroupAngle(targetAngle);
        
        if (move.recordInHistory) {
          this.recordMove(move.axis, move.slice, move.turns);
        }
        
        this.finalizeSliceRotation(false);
        this.isAnimating = false;
      }
    };

    this.animateFrameId = requestAnimationFrame(animateStep);
  }

  destroy() {
    cancelAnimationFrame(this.animateFrameId);
    if (this.gapGlowGroup) {
      this.cubeGroup.remove(this.gapGlowGroup);
      this.gapGlowGroup.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
      });
      this.gapGlowGroup = null;
    }
    for (const material of this.gapGlowMaterials) {
      material.dispose();
    }
    this.gapGlowMaterials.length = 0;
    if (this.gapGlowTexture) {
      this.gapGlowTexture.dispose();
      this.gapGlowTexture = null;
    }

    this.cubies.forEach(cubie => {
      this.cubeGroup.remove(cubie);
      cubie.traverse(child => {
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
    });
    this.cubies.length = 0;

    if (this.bodyMaterial) this.bodyMaterial.dispose();
    if (this.tileMaterial) this.tileMaterial.dispose();
    this.scene.remove(this.visualGroup);
  }
}
