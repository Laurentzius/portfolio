import * as THREE from 'three';

export class Lighting {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.unlockPulseUntil = 0;
    this.initLights();
    this.initEnvironment();
  }

  initLights() {
    // 1. Soft Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(ambientLight);

    // 2. Key Light (Top-Right-Front): Primary light casting soft shadows
    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.keyLight.position.set(5.5, 8.5, 4.5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 25;
    const d = 4.5;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0003;
    this.keyLight.shadow.radius = 4; // Soft shadows
    this.scene.add(this.keyLight);

    // 3. Fill Light (Left-Front-Bottom): Neutral bounce to fill shadows without tinting chrome blue
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.75);
    fillLight.position.set(-6, -2, 5);
    this.scene.add(fillLight);

    // 4. Primary Rim Light (Back-Left-Top): Outlines rounded edges
    this.rimLight1 = new THREE.DirectionalLight(0xffffff, 3.2);
    this.rimLight1.position.set(-5, 6, -6);
    this.rimLight1.lookAt(0, 0, 0);
    this.scene.add(this.rimLight1);

    // 5. Secondary Rim Light (Back-Right-Top): Balances rim highlights
    this.rimLight2 = new THREE.DirectionalLight(0xfff8fa, 2.0);
    this.rimLight2.position.set(5, 5, -6);
    this.rimLight2.lookAt(0, 0, 0);
    this.scene.add(this.rimLight2);

    // 6. Overhead Spotlight: Creates top face focus
    const spotLight = new THREE.SpotLight(0xffffff, 2.5, 16, Math.PI / 5, 0.6, 1);
    spotLight.position.set(0, 9, 0);
    spotLight.target.position.set(0, 0, 0);
    this.scene.add(spotLight);

    // 6b. Neutral front glint: restores readable white highlights on the chrome cube
    // without using the blue environment map as the main light source.
    this.cubeGlint = new THREE.SpotLight(0xf6fbff, 4.8, 14, Math.PI / 7, 0.72, 1);
    this.cubeGlint.position.set(-3.2, 3.6, 5.8);
    this.cubeGlint.target.position.set(0.0, 0.35, 0.0);
    this.scene.add(this.cubeGlint);
    this.scene.add(this.cubeGlint.target);

    this.unlockPulseLight = new THREE.PointLight(0xffffff, 0, 7);
    this.unlockPulseLight.position.set(0, 0.35, 0);
    this.scene.add(this.unlockPulseLight);

    // 7. Floor Bounce Light
    const bounceLight = new THREE.DirectionalLight(0xffffff, 0.5);
    bounceLight.position.set(0, -6, 0);
    this.scene.add(bounceLight);

    // 8. Wall & Button Illuminator: Direct light from front-left to keep the white wall and button bright and crisp
    const wallLight = new THREE.DirectionalLight(0xffffff, 1.2);
    wallLight.position.set(-4.0, 3.0, 3.0);
    wallLight.target.position.set(-3.0, 0.7, -4.5);
    this.scene.add(wallLight);
    this.scene.add(wallLight.target);
  }

  createSoftboxTexture(width, height, aspectFalloff) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(width, height);
    const data = image.data;

    for (let y = 0; y < height; y++) {
      const ny = (y / (height - 1)) * 2 - 1;
      for (let x = 0; x < width; x++) {
        const nx = (x / (width - 1)) * 2 - 1;
        const distance = Math.sqrt(nx * nx * aspectFalloff.x + ny * ny * aspectFalloff.y);
        const intensity = Math.max(0, 1 - distance);
        const alpha = Math.pow(intensity, 2.2) * 255;
        const index = (y * width + x) * 4;

        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 255;
        data[index + 3] = alpha;
      }
    }

    ctx.putImageData(image, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    return texture;
  }

  createSoftboxMaterial(width, height, aspectFalloff) {
    const texture = this.createSoftboxTexture(width, height, aspectFalloff);
    if (!this.texturesToDispose) {
      this.texturesToDispose = [];
    }
    this.texturesToDispose.push(texture);

    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  }

  initEnvironment() {
    this.studioLightsGroup = new THREE.Group();

    // Soft gradient panels used only by the cube camera. Hard-edged planes read as faceted polygons in chrome.
    const stripGeo = new THREE.PlaneGeometry(1.5, 6);
    const squareGeo = new THREE.PlaneGeometry(4, 4);
    const stripMat = this.createSoftboxMaterial(128, 512, { x: 3.5, y: 0.55 });
    const squareMat = this.createSoftboxMaterial(256, 256, { x: 1.0, y: 1.0 });

    // Top softbox
    const lightTop = new THREE.Mesh(squareGeo, squareMat);
    lightTop.position.set(0, 5.5, 0);
    lightTop.rotation.x = Math.PI / 2;
    this.studioLightsGroup.add(lightTop);

    // Right-front vertical strip
    const stripRF = new THREE.Mesh(stripGeo, stripMat);
    stripRF.position.set(4, 2, 4);
    stripRF.lookAt(0, 0, 0);
    this.studioLightsGroup.add(stripRF);

    // Left-back vertical strip
    const stripLB = new THREE.Mesh(stripGeo, stripMat);
    stripLB.position.set(-4, 2, -4);
    stripLB.lookAt(0, 0, 0);
    this.studioLightsGroup.add(stripLB);

    // Top-left horizontal strip
    const stripTL = new THREE.Mesh(stripGeo, stripMat);
    stripTL.position.set(-4, 5, 2);
    stripTL.rotation.z = Math.PI / 4;
    stripTL.lookAt(0, 0, 0);
    this.studioLightsGroup.add(stripTL);

    this.studioLightsGroup.visible = false; // Hide from main render pass
    this.scene.add(this.studioLightsGroup);

    // Dynamic cubemap updates every frame; keep it lighter so reflections stay smooth during twists.
    this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    
    // Far = 50.0 to capture the background atmosphere cylinder (radius 22 and 26)
    this.cubeCamera = new THREE.CubeCamera(0.1, 50.0, this.cubeRenderTarget);
    this.scene.add(this.cubeCamera);

    // Assign the dynamic CubeTexture as the scene environment
    this.scene.environment = this.cubeRenderTarget.texture;

    this.geometriesToDispose = [stripGeo, squareGeo];
    this.materialsToDispose = [stripMat, squareMat];
  }

  setSectionAccent(sectionId) {
    const accents = {
      welcome: 0xffffff,
      about: 0xffead0,
      skills: 0xdffcff,
      experience: 0xffd6f7,
      contact: 0xfff0d8,
    };
    const color = accents[sectionId] ?? accents.welcome;
    if (this.cubeGlint) this.cubeGlint.color.setHex(color);
    if (this.rimLight1) this.rimLight1.color.setHex(color);
  }

  triggerUnlockPulse() {
    this.unlockPulseUntil = performance.now() + 1100;
  }


  updateLightEffects(now) {
    if (this.unlockPulseLight) {
      const remaining = Math.max(0, this.unlockPulseUntil - now);
      const t = remaining / 1100;
      this.unlockPulseLight.intensity = t > 0 ? Math.sin(t * Math.PI) * 3.8 : 0;
    }
  }

  update(experience) {
    if (!this.cubeCamera || !this.renderer) return;

    const now = performance.now();
    this.updateLightEffects(now);

    // 1. Hide objects we don't want in the reflection
    const rubiksGroups = [
      experience.rubiksCube?.cubeGroup,
      experience.rubiksCube?.rotationGroup,
    ].filter(Boolean);
    const glassGroup = experience.glassBoard?.group;
    const looseCubies = experience.looseCubies;

    const rubiksVisibilities = [];
    rubiksGroups.forEach((group, i) => {
      rubiksVisibilities[i] = group.visible;
      group.visible = false;
    });

    let wasGlassVisible = false;
    if (glassGroup) {
      wasGlassVisible = glassGroup.visible;
      glassGroup.visible = false;
    }

    const looseVisibilities = [];
    if (looseCubies) {
      looseCubies.forEach((cubie, i) => {
        looseVisibilities[i] = cubie.group.visible;
        cubie.group.visible = false;
      });
    }

    // 2. Render only the continuous atmosphere into the reflection map.
    // Discrete studio panels create segmented highlights across separate Rubik's Cube tiles.
    this.cubeCamera.update(this.renderer, this.scene);

    // 3. Keep studio reflection helpers hidden from the main camera too.
    rubiksGroups.forEach((group, i) => {
      group.visible = rubiksVisibilities[i];
    });
    if (glassGroup) {
      glassGroup.visible = wasGlassVisible;
    }
    if (looseCubies) {
      looseCubies.forEach((cubie, i) => {
        cubie.group.visible = looseVisibilities[i];
      });
    }
  }

  destroy() {
    if (this.cubeRenderTarget) {
      this.cubeRenderTarget.dispose();
    }
    if (this.geometriesToDispose) {
      this.geometriesToDispose.forEach(g => g.dispose());
    }
    if (this.texturesToDispose) {
      this.texturesToDispose.forEach(t => t.dispose());
    }
    if (this.materialsToDispose) {
      this.materialsToDispose.forEach(m => m.dispose());
    }
  }
}
