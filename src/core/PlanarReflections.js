import * as THREE from 'three';

const REFLECTIONS = Object.freeze({
  right: Object.freeze({ normal: new THREE.Vector3(1, 0, 0), point: new THREE.Vector3(1.48, 0, 0) }),
  left: Object.freeze({ normal: new THREE.Vector3(-1, 0, 0), point: new THREE.Vector3(-1.48, 0, 0) }),
  top: Object.freeze({ normal: new THREE.Vector3(0, 1, 0), point: new THREE.Vector3(0, 1.48, 0) }),
  bottom: Object.freeze({ normal: new THREE.Vector3(0, -1, 0), point: new THREE.Vector3(0, -1.48, 0) }),
  front: Object.freeze({ normal: new THREE.Vector3(0, 0, 1), point: new THREE.Vector3(0, 0, 1.48) }),
  back: Object.freeze({ normal: new THREE.Vector3(0, 0, -1), point: new THREE.Vector3(0, 0, -1.48) }),
});

const _target = new THREE.Vector3();
const _reflectedTarget = new THREE.Vector3();
const _reflectedPosition = new THREE.Vector3();
const _pointToPlane = new THREE.Vector3();
const _cameraToPlane = new THREE.Vector3();
const _plane = new THREE.Plane();
const _clipPlane = new THREE.Vector4();
const _q = new THREE.Vector4();
const _projectionMatrix = new THREE.Matrix4();
const _textureMatrix = new THREE.Matrix4();
const _biasMatrix = new THREE.Matrix4().set(
  0.5, 0.0, 0.0, 0.5,
  0.0, 0.5, 0.0, 0.5,
  0.0, 0.0, 0.5, 0.5,
  0.0, 0.0, 0.0, 1.0
);

function reflectPoint(out, point, planePoint, planeNormal) {
  _pointToPlane.subVectors(point, planePoint);
  return out.copy(point).addScaledVector(planeNormal, -2 * _pointToPlane.dot(planeNormal));
}

export class PlanarReflections {
  constructor(scene, renderer, camera) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    this.isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.renderedPlanes = 0;
    this.resolution = this.isMobile ? 768 : 1536;
    this.reflectionCamera = new THREE.PerspectiveCamera(camera.fov, camera.aspect, camera.near, camera.far);
    this.targets = {
      right: this.createTarget(),
      left: this.createTarget(),
      top: this.createTarget(),
      bottom: this.createTarget(),
      front: this.createTarget(),
      back: this.createTarget(),
    };
    this.uniforms = {
      uPlanarReflectionRight: { value: this.targets.right.texture },
      uPlanarReflectionLeft: { value: this.targets.left.texture },
      uPlanarReflectionTop: { value: this.targets.top.texture },
      uPlanarReflectionBottom: { value: this.targets.bottom.texture },
      uPlanarReflectionFront: { value: this.targets.front.texture },
      uPlanarReflectionBack: { value: this.targets.back.texture },
      uPlanarReflectionMatrixRight: { value: new THREE.Matrix4() },
      uPlanarReflectionMatrixLeft: { value: new THREE.Matrix4() },
      uPlanarReflectionMatrixTop: { value: new THREE.Matrix4() },
      uPlanarReflectionMatrixBottom: { value: new THREE.Matrix4() },
      uPlanarReflectionMatrixFront: { value: new THREE.Matrix4() },
      uPlanarReflectionMatrixBack: { value: new THREE.Matrix4() },
      uPlanarReflectionStrength: { value: 0.42 },
    };
  }

  createTarget() {
    const target = new THREE.WebGLRenderTarget(this.resolution, this.resolution, {
      samples: this.isMobile ? 0 : 4,
      type: THREE.HalfFloatType,
      colorSpace: THREE.SRGBColorSpace,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    target.texture.name = 'planar-mirror-reflection';
    return target;
  }

  update(experience) {
    const hidden = [];
    this.hide(experience.rubiksCube?.visualGroup, hidden);
    this.hide(experience.socialModels?.group, hidden);
    if (experience.looseCubies) {
      for (const cubie of experience.looseCubies) {
        this.hide(cubie.group ?? cubie.mesh ?? cubie, hidden);
      }
    }

    const studioLights = experience.lighting?.studioLightsGroup;
    const wasStudioVisible = studioLights?.visible;
    if (studioLights) studioLights.visible = true;

    const previousTarget = this.renderer.getRenderTarget();
    const previousXr = this.renderer.xr.enabled;
    const previousShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;
    this.renderer.xr.enabled = false;
    this.renderer.shadowMap.autoUpdate = false;

    this.camera.getWorldDirection(_target).add(this.camera.position);
    this.renderedPlanes = 0;
    for (const name in REFLECTIONS) {
      const plane = REFLECTIONS[name];
      _cameraToPlane.subVectors(plane.point, this.camera.position);
      if (_cameraToPlane.dot(plane.normal) > 0) {
        this.renderedPlanes += 1;
        this.renderPlane(name, plane);
      }
    }

    this.renderer.setRenderTarget(previousTarget);
    this.renderer.xr.enabled = previousXr;
    this.renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
    if (studioLights) studioLights.visible = wasStudioVisible;
    for (let i = 0; i < hidden.length; i++) hidden[i].visible = true;
  }

  renderPlane(name, plane) {
    reflectPoint(_reflectedPosition, this.camera.position, plane.point, plane.normal);
    reflectPoint(_reflectedTarget, _target, plane.point, plane.normal);

    this.reflectionCamera.copy(this.camera, false);
    this.reflectionCamera.position.copy(_reflectedPosition);
    this.reflectionCamera.up.copy(this.camera.up).reflect(plane.normal);
    this.reflectionCamera.lookAt(_reflectedTarget);
    this.reflectionCamera.updateMatrixWorld();
    this.reflectionCamera.projectionMatrix.copy(this.camera.projectionMatrix);
    _plane.setFromNormalAndCoplanarPoint(plane.normal, plane.point);
    _plane.applyMatrix4(this.reflectionCamera.matrixWorldInverse);
    _clipPlane.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);
    _q.x = (Math.sign(_clipPlane.x) + this.reflectionCamera.projectionMatrix.elements[8]) / this.reflectionCamera.projectionMatrix.elements[0];
    _q.y = (Math.sign(_clipPlane.y) + this.reflectionCamera.projectionMatrix.elements[9]) / this.reflectionCamera.projectionMatrix.elements[5];
    _q.z = -1.0;
    _q.w = (1.0 + this.reflectionCamera.projectionMatrix.elements[10]) / this.reflectionCamera.projectionMatrix.elements[14];
    _clipPlane.multiplyScalar(2.0 / _clipPlane.dot(_q));
    this.reflectionCamera.projectionMatrix.elements[2] = _clipPlane.x;
    this.reflectionCamera.projectionMatrix.elements[6] = _clipPlane.y;
    this.reflectionCamera.projectionMatrix.elements[10] = _clipPlane.z + 1.0 - 0.003;
    this.reflectionCamera.projectionMatrix.elements[14] = _clipPlane.w;

    _projectionMatrix.multiplyMatrices(this.reflectionCamera.projectionMatrix, this.reflectionCamera.matrixWorldInverse);
    _textureMatrix.multiplyMatrices(_biasMatrix, _projectionMatrix);
    this.uniforms[`uPlanarReflectionMatrix${this.capitalize(name)}`].value.copy(_textureMatrix);

    this.renderer.setRenderTarget(this.targets[name]);
    this.renderer.clear();
    this.renderer.render(this.scene, this.reflectionCamera);
  }

  hide(object, hidden) {
    if (!object || object.visible === false) return;
    object.visible = false;
    hidden.push(object);
  }

  capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  dispose() {
    for (const name in this.targets) {
      this.targets[name].dispose();
    }
  }
}
