import * as THREE from 'three';

export class Lighting {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

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

    // 3. Fill Light (Left-Front-Bottom): Soft cool bounce to fill shadows
    const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.8);
    fillLight.position.set(-6, -2, 5);
    this.scene.add(fillLight);

    // 4. Primary Rim Light (Back-Left-Top): Outlines rounded edges
    const rimLight1 = new THREE.DirectionalLight(0xffffff, 3.2);
    rimLight1.position.set(-5, 6, -6);
    rimLight1.lookAt(0, 0, 0);
    this.scene.add(rimLight1);

    // 5. Secondary Rim Light (Back-Right-Top): Balances rim highlights
    const rimLight2 = new THREE.DirectionalLight(0xfff8fa, 2.0);
    rimLight2.position.set(5, 5, -6);
    rimLight2.lookAt(0, 0, 0);
    this.scene.add(rimLight2);

    // 6. Overhead Spotlight: Creates top face focus
    const spotLight = new THREE.SpotLight(0xffffff, 2.5, 16, Math.PI / 5, 0.6, 1);
    spotLight.position.set(0, 9, 0);
    spotLight.target.position.set(0, 0, 0);
    this.scene.add(spotLight);

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

  initEnvironment() {
    this.studioLightsGroup = new THREE.Group();

    // Emissive panels (strip lights)
    const stripGeo = new THREE.PlaneGeometry(1.5, 6);
    const squareGeo = new THREE.PlaneGeometry(4, 4);
    const lightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });

    // Top softbox
    const lightTop = new THREE.Mesh(squareGeo, lightMat);
    lightTop.position.set(0, 5.5, 0);
    lightTop.rotation.x = Math.PI / 2;
    this.studioLightsGroup.add(lightTop);

    // Right-front vertical strip
    const stripRF = new THREE.Mesh(stripGeo, lightMat);
    stripRF.position.set(4, 2, 4);
    stripRF.lookAt(0, 0, 0);
    this.studioLightsGroup.add(stripRF);

    // Left-back vertical strip
    const stripLB = new THREE.Mesh(stripGeo, lightMat);
    stripLB.position.set(-4, 2, -4);
    stripLB.lookAt(0, 0, 0);
    this.studioLightsGroup.add(stripLB);

    // Top-left horizontal strip
    const stripTL = new THREE.Mesh(stripGeo, lightMat);
    stripTL.position.set(-4, 5, 2);
    stripTL.rotation.z = Math.PI / 4;
    stripTL.lookAt(0, 0, 0);
    this.studioLightsGroup.add(stripTL);

    this.studioLightsGroup.visible = false; // Hide from main render pass
    this.scene.add(this.studioLightsGroup);

    // Use 128 resolution for great performance and smooth reflections
    this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
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
    this.materialsToDispose = [lightMat];
  }

  update(experience) {
    if (!this.cubeCamera || !this.renderer) return;

    // 1. Hide objects we don't want in the reflection
    const rubiksGroup = experience.rubiksCube?.group;
    const glassGroup = experience.glassBoard?.group;
    const looseCubies = experience.looseCubies;

    let wasRubiksVisible = false;
    if (rubiksGroup) {
      wasRubiksVisible = rubiksGroup.visible;
      rubiksGroup.visible = false;
    }

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

    // 2. Show studio lights for the cube camera render
    if (this.studioLightsGroup) {
      this.studioLightsGroup.visible = true;
    }

    // 3. Render the environment scene (captures atmosphere + studio lights)
    this.cubeCamera.update(this.renderer, this.scene);

    // 4. Restore visibilities for the main camera render
    if (this.studioLightsGroup) {
      this.studioLightsGroup.visible = false;
    }
    if (rubiksGroup) {
      rubiksGroup.visible = wasRubiksVisible;
    }
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
    if (this.materialsToDispose) {
      this.materialsToDispose.forEach(m => m.dispose());
    }
  }
}
