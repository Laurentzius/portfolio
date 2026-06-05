import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const CUBIE_VISUAL = Object.freeze({
  size: 0.96,
  radius: 0.52,
  bevelSize: 0.06,
  tileWidth: 0.80,
  tileHeight: 0.80,
  tileThickness: 0.04,
  tileOffset: 0.48,
});

export const CUBIE_FACE_DEFINITIONS = Object.freeze({
  R: Object.freeze({ position: [CUBIE_VISUAL.tileOffset, 0, 0], rotation: [0, Math.PI / 2, 0] }),
  L: Object.freeze({ position: [-CUBIE_VISUAL.tileOffset, 0, 0], rotation: [0, -Math.PI / 2, 0] }),
  U: Object.freeze({ position: [0, CUBIE_VISUAL.tileOffset, 0], rotation: [-Math.PI / 2, 0, 0] }),
  D: Object.freeze({ position: [0, -CUBIE_VISUAL.tileOffset, 0], rotation: [Math.PI / 2, 0, 0] }),
  F: Object.freeze({ position: [0, 0, CUBIE_VISUAL.tileOffset], rotation: [0, 0, 0] }),
  B: Object.freeze({ position: [0, 0, -CUBIE_VISUAL.tileOffset], rotation: [0, Math.PI, 0] }),
});

export const LOOSE_CUBIE_FACES = Object.freeze({
  corner: Object.freeze(['U', 'R', 'F']),
  edge: Object.freeze(['U', 'F']),
  center: Object.freeze(['F']),
});

export function createCubieMaterials() {
  return {
    bodyMaterial: new THREE.MeshPhysicalMaterial({
      color: 0x2d2d2d,
      metalness: 0.82,
      roughness: 0.38,
      clearcoat: 0.18,
      clearcoatRoughness: 0.25,
      envMapIntensity: 0.85,
    }),
    tileMaterial: new THREE.MeshPhysicalMaterial({
      color: 0x454545,
      roughness: 0.035,
      metalness: 0.82,
      clearcoat: 1.0,
      clearcoatRoughness: 0.018,
      transmission: 0.0,
      ior: 1.8,
      specularIntensity: 1.0,
      envMapIntensity: 1.45,
    }),
  };
}

export function createCubieGeometries() {
  return {
    bodyGeometry: new RoundedBoxGeometry(
      CUBIE_VISUAL.size,
      CUBIE_VISUAL.size,
      CUBIE_VISUAL.size,
      16,
      CUBIE_VISUAL.bevelSize
    ),
    tileGeometry: new RoundedBoxGeometry(
      CUBIE_VISUAL.tileWidth,
      CUBIE_VISUAL.tileHeight,
      CUBIE_VISUAL.tileThickness,
      16,
      0.02
    ),
  };
}

export function createCubieBody(geometry, material, userData) {
  const bodyMesh = new THREE.Mesh(geometry, material);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyMesh.userData = userData;
  return bodyMesh;
}

export function createCubieTile(geometry, material, faceName, userData) {
  const face = CUBIE_FACE_DEFINITIONS[faceName];
  const tileMesh = new THREE.Mesh(geometry, material);
  tileMesh.position.fromArray(face.position);
  tileMesh.rotation.fromArray(face.rotation);
  tileMesh.castShadow = true;
  tileMesh.receiveShadow = true;
  tileMesh.userData = userData;
  return tileMesh;
}

export function faceNameFromLocalOffset(offset) {
  if (Math.abs(offset.x) > 0.3) return offset.x > 0 ? 'R' : 'L';
  if (Math.abs(offset.y) > 0.3) return offset.y > 0 ? 'U' : 'D';
  if (Math.abs(offset.z) > 0.3) return offset.z > 0 ? 'F' : 'B';
  return 'F';
}
