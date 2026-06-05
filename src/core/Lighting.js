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
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    
    // Dark studio walls for specular contrast
    const bgGeo = new THREE.SphereGeometry(6, 32, 16);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x1c1c1c,
      side: THREE.BackSide
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    envScene.add(bgMesh);

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
    envScene.add(lightTop);

    // Right-front vertical strip
    const stripRF = new THREE.Mesh(stripGeo, lightMat);
    stripRF.position.set(4, 2, 4);
    stripRF.lookAt(0, 0, 0);
    envScene.add(stripRF);

    // Left-back vertical strip
    const stripLB = new THREE.Mesh(stripGeo, lightMat);
    stripLB.position.set(-4, 2, -4);
    stripLB.lookAt(0, 0, 0);
    envScene.add(stripLB);

    // Top-left horizontal strip
    const stripTL = new THREE.Mesh(stripGeo, lightMat);
    stripTL.position.set(-4, 5, 2);
    stripTL.rotation.z = Math.PI / 4;
    stripTL.lookAt(0, 0, 0);
    envScene.add(stripTL);

    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    
    const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRenderTarget);
    cubeCamera.update(this.renderer, envScene);

    const envMap = pmremGenerator.fromCubemap(cubeRenderTarget.texture).texture;
    
    // Set to scene
    this.scene.environment = envMap;

    // Dispose temporary resources
    cubeRenderTarget.dispose();
    pmremGenerator.dispose();
    bgGeo.dispose();
    bgMat.dispose();
    stripGeo.dispose();
    squareGeo.dispose();
    lightMat.dispose();
  }
}
