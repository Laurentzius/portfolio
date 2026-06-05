import * as THREE from 'three';



export class InteractionManager {
  constructor(experience) {
    this.exp = experience;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.mousePrevious = new THREE.Vector2();

    this.isInteractingWithCube = false;
    this.isInteractingWithButton = false;
    this.isInteractingWithLoose = false;
    
    this.hoveredButton = null;
    this.activeLooseCubie = null;

    // Click tracking states
    this.pointerDownTime = 0;
    this.pointerDownPosition = new THREE.Vector2();

    this.bindEvents();
  }

  bindEvents() {
    this.onMouseDownHandler = this.onPointerDown.bind(this);
    this.onMouseMoveHandler = this.onPointerMove.bind(this);
    this.onMouseUpHandler = this.onPointerUp.bind(this);
    this.onWheelHandler = this.onWheel.bind(this);

    this.exp.canvas.addEventListener('pointerdown', this.onMouseDownHandler);
    window.addEventListener('pointermove', this.onMouseMoveHandler);
    window.addEventListener('pointerup', this.onMouseUpHandler);
    window.addEventListener('wheel', this.onWheelHandler, { passive: false });
  }


  destroy() {
    this.exp.canvas.removeEventListener('pointerdown', this.onMouseDownHandler);
    window.removeEventListener('pointermove', this.onMouseMoveHandler);
    window.removeEventListener('pointerup', this.onMouseUpHandler);
    window.removeEventListener('wheel', this.onWheelHandler);
  }

  updateMouseCoords(e) {
    const rect = this.exp.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onPointerDown(e) {
    this.updateMouseCoords(e);

    // Track starting timestamp and position for click separation
    this.pointerDownTime = performance.now();
    this.pointerDownPosition.set(e.clientX, e.clientY);

    // Initialize Audio context on first user click
    if (this.exp.audioEngine) {
      this.exp.audioEngine.init();
      this.exp.audioEngine.resume();
    }

    this.raycaster.setFromCamera(this.mouse, this.exp.camera);


    // 1. Raycast against loose cubies
    if (this.exp.looseCubies && this.exp.looseCubies.length > 0) {
      const groupsToRaycast = this.exp.looseCubies.map(cubie => cubie.group);
      const looseIntersects = this.raycaster.intersectObjects(groupsToRaycast, true);
      const looseHit = looseIntersects.find(intersect => intersect.object.userData.isLooseCubie);
      if (looseHit) {
        const cubieInstance = looseHit.object.userData.parentClass;
        if (cubieInstance && !cubieInstance.isAttracting) {
          this.activeLooseCubie = cubieInstance;
          this.isInteractingWithLoose = true;
          this.activeLooseCubie.startDrag(looseHit.point);
          this.exp.repair.startDrag(this.activeLooseCubie);
          this.mousePrevious.copy(this.mouse);
          this.exp.controls.enabled = false; // Stop camera rotation
          return;
        }
      }
    }

    // 2. Raycast against Rubik's Cube tiles
    if (this.exp.rubiksCube) {
      this.exp.rubiksCube.onPointerDown(e);
      if (this.exp.rubiksCube.isDragging) {
        this.isInteractingWithCube = true;
        return;
      }
    }
  }

  onPointerMove(e) {
    this.updateMouseCoords(e);
    
    // Update the raycaster immediately so all branches use current projection coordinates
    this.raycaster.setFromCamera(this.mouse, this.exp.camera);

    if (this.isInteractingWithCube && this.exp.rubiksCube) {
      this.exp.rubiksCube.onPointerMove(e);
      this.exp.canvas.style.cursor = 'grabbing';
      return;
    }

    // 2. If currently dragging a loose cubie, route drag to active LooseCubie
    if (this.isInteractingWithLoose && this.activeLooseCubie) {
      this.activeLooseCubie.onDrag(this.raycaster);
      this.mousePrevious.copy(this.mouse);
      this.exp.canvas.style.cursor = 'grabbing';
      return;
    }

    // 3. Otherwise handle hover states (cursor pointer/grab)

    // Set cursor styling
    let isHoveringInteractable = false;

    if (this.exp.rubiksCube) {
      const intersects = this.raycaster.intersectObjects(this.exp.rubiksCube.cubeGroup.children, true);
      const tileHit = intersects.find(intersect => intersect.object.userData.isTile);
      if (tileHit) isHoveringInteractable = true;
    }

    if (!isHoveringInteractable && this.exp.looseCubies && this.exp.looseCubies.length > 0) {
      const groupsToRaycast = this.exp.looseCubies.map(cubie => cubie.group);
      const intersects = this.raycaster.intersectObjects(groupsToRaycast, true);
      const looseHit = intersects.find(intersect => intersect.object.userData.isLooseCubie);
      if (looseHit) isHoveringInteractable = true;
    }

    this.exp.canvas.style.cursor = isHoveringInteractable ? 'grab' : 'default';
  }

  onPointerUp(e) {
    // 1. Calculate duration and pixel distance to verify if click was intended (click vs drag separation)
    const duration = performance.now() - this.pointerDownTime;
    const distance = this.pointerDownPosition.distanceTo(new THREE.Vector2(e.clientX, e.clientY));

    const isQuickClick = duration < 250 && distance < 15;

    if (isQuickClick) {
      this.updateMouseCoords(e);
      this.raycaster.setFromCamera(this.mouse, this.exp.camera);


      // A. Check loose cubies hit for case projects navigation
      if (this.exp.looseCubies && this.exp.looseCubies.length > 0) {
        const groupsToRaycast = this.exp.looseCubies.map(cubie => cubie.group);
        const looseIntersects = this.raycaster.intersectObjects(groupsToRaycast, true);
        const looseHit = looseIntersects.find(intersect => intersect.object.userData.isLooseCubie);
        if (looseHit) {
          const cubieInstance = looseHit.object.userData.parentClass;
          if (cubieInstance && cubieInstance.projectId && !cubieInstance.isAttracting) {
            this.exp.navigateTo(cubieInstance.projectId);
            this.resetInteractionFlags();
            return;
          }
        }
      }

    }

    // 2. Normal release routing if it was a drag gesture
    if (this.isInteractingWithCube && this.exp.rubiksCube) {
      this.exp.rubiksCube.onPointerUp(e);
      this.isInteractingWithCube = false;
    }

    if (this.isInteractingWithLoose && this.activeLooseCubie) {
      const loose = this.activeLooseCubie;
      this.exp.repair.release(loose);
      this.isInteractingWithLoose = false;
      this.activeLooseCubie = null;
    }

    if (this.isInteractingWithButton) {
      this.isInteractingWithButton = false;
    }

    // Always re-enable controls on pointer up
    this.exp.controls.enabled = true;
  }

  resetInteractionFlags() {
    if (this.isInteractingWithCube && this.exp.rubiksCube) {
      this.exp.rubiksCube.onPointerUp();
    }
    if (this.isInteractingWithLoose && this.exp.repair) {
      this.exp.repair.cancelDrag();
    }
    this.isInteractingWithCube = false;
    this.isInteractingWithLoose = false;
    this.isInteractingWithButton = false;
    this.activeLooseCubie = null;
    this.exp.controls.enabled = true;
  }

  onWheel(e) {
    if (this.isInteractingWithLoose && this.activeLooseCubie) {
      e.preventDefault();
      this.activeLooseCubie.handleWheel(e.deltaY);
      this.activeLooseCubie.onDrag(this.raycaster);
    }
  }
}
