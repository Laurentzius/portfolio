import * as THREE from 'three';
import { CUBIE_VISUAL } from '../components/CubieVisuals.js';

export const LOOSE_CUBIE_PHYSICS = Object.freeze({
  radius: CUBIE_VISUAL.radius,
  mainCubieRadius: CUBIE_VISUAL.tileOffset,
  restitution: 0.45,
  looseRestitution: 0.35,
  friction: 0.90,
  floorY: -2.25,
  gravity: 14.0,
  wallFrontZ: -4.35,
  wallMinX: -7.2,
  wallMaxX: 1.2,
  wallMinY: -2.25,
  wallMaxY: 3.75,
  roomLimitX: 28.0,
  roomLimitZ: 28.0,
  roomLimitY: 32.0,
});

const cubeMin = new THREE.Vector3(-1.5, -1.5, -1.5);
const cubeMax = new THREE.Vector3(1.5, 1.5, 1.5);
const tempClamped = new THREE.Vector3();
const tempDiff = new THREE.Vector3();
const tempNormal = new THREE.Vector3();
const tempImpulse = new THREE.Vector3();

export class LooseCubiePhysics {
  constructor(config = LOOSE_CUBIE_PHYSICS) {
    this.config = config;
    this.tempWorldPos = new THREE.Vector3();
  }

  updateCubie(cubie, dt) {
    if (cubie.isAttracting) return cubie.updateAttraction(dt);

    if (!cubie.isDragging) {
      cubie.velocity.y -= this.config.gravity * dt;
      cubie.velocity.multiplyScalar(1 - 0.5 * dt);
      cubie.group.position.addScaledVector(cubie.velocity, dt);

      if (cubie.angularVelocity.lengthSq() > 0.0001) {
        const speed = cubie.angularVelocity.length();
        tempNormal.copy(cubie.angularVelocity).normalize();
        cubie.group.rotateOnWorldAxis(tempNormal, speed * dt);
        cubie.angularVelocity.multiplyScalar(1 - 1.5 * dt);
      } else {
        cubie.angularVelocity.set(0, 0, 0);
      }
    }

    this.resolveBoundaries(cubie);
  }

  resolveRubiksCubeCollisions(rubiksCube, looseCubies, dt) {
    if (!rubiksCube || !rubiksCube.cubies || rubiksCube.cubies.length === 0) return;
    if (!looseCubies || looseCubies.length === 0 || dt <= 0.0001) return;

    const minDist = this.config.mainCubieRadius + this.config.radius;

    rubiksCube.cubies.forEach(cubie => {
      cubie.getWorldPosition(this.tempWorldPos);

      if (!cubie.userData.prevWorldPos) {
        cubie.userData.prevWorldPos = this.tempWorldPos.clone();
        cubie.userData.velocity = new THREE.Vector3(0, 0, 0);
      } else {
        cubie.userData.velocity.subVectors(this.tempWorldPos, cubie.userData.prevWorldPos).multiplyScalar(1.0 / dt);
        cubie.userData.prevWorldPos.copy(this.tempWorldPos);
      }
    });

    looseCubies.forEach(loose => {
      const loosePos = loose.group.position;

      rubiksCube.cubies.forEach(cubie => {
        tempDiff.subVectors(loosePos, cubie.userData.prevWorldPos);
        const dist = tempDiff.length();

        if (dist < minDist) {
          if (dist === 0) {
            tempNormal.set(0, 1, 0);
          } else {
            tempNormal.copy(tempDiff).multiplyScalar(1 / dist);
          }

          loose.group.position.addScaledVector(tempNormal, minDist - dist);

          if (!loose.isDragging) {
            tempImpulse.subVectors(loose.velocity, cubie.userData.velocity);
            const velAlongNormal = tempImpulse.dot(tempNormal);

            if (velAlongNormal < 0) {
              const impulse = -(1 + this.config.restitution) * velAlongNormal;
              loose.velocity.addScaledVector(tempNormal, impulse);

              tempImpulse.crossVectors(tempNormal, cubie.userData.velocity).normalize();
              if (tempImpulse.lengthSq() > 0.5) {
                const spinStrength = cubie.userData.velocity.length() * 2.0;
                loose.angularVelocity.addScaledVector(tempImpulse, Math.min(spinStrength, 15.0));
              }
            }
          }
        }
      });
    });
  }

  resolveLooseCubieCollisions(looseCubies) {
    if (!looseCubies || looseCubies.length < 2) return;

    const minDist = this.config.radius * 2.0;

    for (let i = 0; i < looseCubies.length; i++) {
      for (let j = i + 1; j < looseCubies.length; j++) {
        const c1 = looseCubies[i];
        const c2 = looseCubies[j];

        tempDiff.subVectors(c2.group.position, c1.group.position);
        const dist = tempDiff.length();

        if (dist < minDist) {
          if (dist === 0) {
            tempNormal.set(0, 1, 0);
          } else {
            tempNormal.copy(tempDiff).multiplyScalar(1 / dist);
          }

          const overlap = minDist - dist;

          if (c1.isDragging && !c2.isDragging) {
            c2.group.position.addScaledVector(tempNormal, overlap);
            c2.velocity.addScaledVector(tempNormal, overlap * 8.0);
          } else if (!c1.isDragging && c2.isDragging) {
            c1.group.position.addScaledVector(tempNormal, -overlap);
            c1.velocity.addScaledVector(tempNormal, -overlap * 8.0);
          } else if (!c1.isDragging && !c2.isDragging) {
            c1.group.position.addScaledVector(tempNormal, -overlap * 0.5);
            c2.group.position.addScaledVector(tempNormal, overlap * 0.5);

            tempImpulse.subVectors(c2.velocity, c1.velocity);
            const velAlongNormal = tempImpulse.dot(tempNormal);

            if (velAlongNormal < 0) {
              const impulseMagnitude = -(1 + this.config.looseRestitution) * velAlongNormal * 0.5;
              tempImpulse.copy(tempNormal).multiplyScalar(impulseMagnitude);
              c1.velocity.sub(tempImpulse);
              c2.velocity.add(tempImpulse);
            }
          }
        }
      }
    }
  }

  resolveBoundaries(cubie) {
    const { group, velocity, angularVelocity, radius } = cubie;
    const cfg = this.config;

    if (group.position.y - radius < cfg.floorY) {
      group.position.y = cfg.floorY + radius;
      if (velocity.y < 0) {
        velocity.y = -velocity.y * cubie.restitution;
        if (Math.abs(velocity.y) < 0.25) velocity.y = 0;
      }
      velocity.x *= cubie.friction;
      velocity.z *= cubie.friction;
      angularVelocity.multiplyScalar(0.92);
    }

    if (group.position.z - radius < cfg.wallFrontZ &&
        group.position.x > cfg.wallMinX && group.position.x < cfg.wallMaxX &&
        group.position.y > cfg.wallMinY && group.position.y < cfg.wallMaxY) {
      group.position.z = cfg.wallFrontZ + radius;
      if (velocity.z < 0) {
        velocity.z = -velocity.z * cubie.restitution;
        if (Math.abs(velocity.z) < 0.25) velocity.z = 0;
      }
      velocity.x *= cubie.friction;
      velocity.y *= cubie.friction;
    }

    tempClamped.set(
      Math.max(cubeMin.x, Math.min(group.position.x, cubeMax.x)),
      Math.max(cubeMin.y, Math.min(group.position.y, cubeMax.y)),
      Math.max(cubeMin.z, Math.min(group.position.z, cubeMax.z))
    );
    tempDiff.subVectors(group.position, tempClamped);
    const distSq = tempDiff.lengthSq();
    const rSq = radius * radius;

    if (distSq < rSq) {
      let dist = Math.sqrt(distSq);
      if (dist < 0.0001) {
        tempNormal.set(0, 1, 0);
        dist = 0.0001;
      } else {
        tempNormal.copy(tempDiff).multiplyScalar(1 / dist);
      }

      group.position.addScaledVector(tempNormal, radius - dist);

      const velAlongNormal = velocity.dot(tempNormal);
      if (velAlongNormal < 0) {
        velocity.addScaledVector(tempNormal, -(1 + cubie.restitution) * velAlongNormal);
      }

      velocity.multiplyScalar(0.95);
      angularVelocity.multiplyScalar(0.95);
    }

    if (Math.abs(group.position.x) > cfg.roomLimitX) {
      group.position.x = Math.sign(group.position.x) * cfg.roomLimitX;
      velocity.x = -velocity.x * cubie.restitution;
    }
    if (group.position.z > cfg.roomLimitZ) {
      group.position.z = cfg.roomLimitZ;
      velocity.z = -velocity.z * cubie.restitution;
    }
    if (group.position.z < -cfg.roomLimitZ) {
      group.position.z = -cfg.roomLimitZ;
      velocity.z = -velocity.z * cubie.restitution;
    }
    if (group.position.y > cfg.roomLimitY) {
      group.position.y = cfg.roomLimitY;
      velocity.y = -velocity.y * cubie.restitution;
    }
  }
}
