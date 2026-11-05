import {Box3, Matrix4, Ray, Vector3} from './vendor/three.module.js';
import {spatialIndex} from './layout.js';

const boomLength = 2.8;
const cameraClearance = .18;

// The station batches walls, ceilings and stair slopes into large meshes. Index
// their individual panels so a ceiling on another level never blocks this view.
function addStationPanels(mesh, add) {
  const positions = mesh.geometry.getAttribute('position');
  const corners = Array.from({length: 4}, () => new Vector3());
  const sample = new Vector3();
  for (let i = 0; i < positions.count; i += 6) {
    const [a, b, c, d] = corners;
    for (const [j, offset] of [0, 1, 2, 5].entries()) {
      corners[j].fromBufferAttribute(positions, i + offset).applyMatrix4(mesh.matrixWorld);
    }
    // A thin strip follows each sloping panel without filling the stairwell.
    const sloped = a.y !== d.y && a.z !== d.z;
    const slices = sloped ? Math.ceil(Math.abs(d.z - a.z) / .35) : 1;
    for (let j = 0; j < slices; j++) {
      const box = new Box3();
      for (const t of [j / slices, (j + 1) / slices]) {
        box.expandByPoint(sample.lerpVectors(a, d, t));
        box.expandByPoint(sample.lerpVectors(b, c, t));
      }
      add(box);
    }
  }
}

function stationBlockers(scene) {
  const boxes = [], localMatrix = new Matrix4(), worldMatrix = new Matrix4();
  const add = box => boxes.push(box.expandByScalar(cameraClearance));
  scene.updateMatrixWorld(true);
  scene.traverseVisible(mesh => {
    if (!mesh.isMesh || mesh.material.depthWrite === false) return;
    if (mesh.userData.stationQuads) {
      addStationPanels(mesh, add);
      return;
    }
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (mesh.isInstancedMesh) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, localMatrix);
        worldMatrix.multiplyMatrices(mesh.matrixWorld, localMatrix);
        add(geometry.boundingBox.clone().applyMatrix4(worldMatrix));
      }
    } else {
      add(geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
    }
  });
  return spatialIndex(boxes, b => ({x0:b.min.x, x1:b.max.x, z0:b.min.z, z1:b.max.z}), boomLength + 1);
}

export function createShoulderCamera(scene, camera) {
  const nearby = stationBlockers(scene);
  const ray = new Ray(), hit = new Vector3(), aim = new Vector3();
  let arm = 0;
  // Look yaw stays aligned with movement and the minimap. On narrow screens a
  // smaller sideways offset leaves space for both the character and the route.
  return function follow(x, groundY, z, yaw, pitch, dt, snap = false) {
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const shoulder = Math.min(.58, camera.aspect * .65);
    const elevation = Math.max(.10, Math.min(.89, .34 - pitch * .65));
    const back = boomLength * Math.cos(elevation);
    ray.origin.set(x, groundY + 1.46, z);
    ray.direction.set(sin * back + cos * shoulder, boomLength * Math.sin(elevation), cos * back - sin * shoulder);
    const fullArm = ray.direction.length();
    ray.direction.multiplyScalar(1 / fullArm);
    let allowed = fullArm;
    const top = ray.origin.y + ray.direction.y * fullArm;
    for (const box of nearby(x, z)) {
      if (box.max.y < ray.origin.y || box.min.y > top) continue;
      if (box.containsPoint(ray.origin)) { allowed = 0; break; }
      if (ray.intersectBox(box, hit)) allowed = Math.min(allowed, Math.max(0, hit.distanceTo(ray.origin) - .015));
    }
    // Retract on this frame; ease back out after clearing the obstruction.
    arm = snap ? allowed : Math.min(allowed, arm + (allowed - arm) * (1 - Math.exp(-dt * 7)));
    ray.at(arm, camera.position);
    const shoulderAtEye = shoulder * arm / fullArm;
    const ahead = 2.3;
    aim.set(x - sin * ahead + cos * shoulderAtEye,
      groundY + 1.16 + ahead * Math.tan(pitch), z - cos * ahead - sin * shoulderAtEye);
    camera.lookAt(aim);
    return arm > .68;
  };
}
