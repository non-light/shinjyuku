import assert from 'node:assert/strict';
import {test} from 'node:test';
import {BoxGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, PerspectiveCamera, Scene, Vector3} from '../dist/vendor/three.module.js';
import {createShoulderCamera} from '../dist/shoulder-camera.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6);

test('the camera stays above the player’s right shoulder across headings and phone orientations', () => {
  for (const aspect of [320/568, 390/844, 844/390]) {
    const camera = new PerspectiveCamera(64, aspect, .08, 180);
    const follow = createShoulderCamera(new Scene(), camera);
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      assert.ok(follow(0, -10, 0, yaw, -.035, 1/60, true));
      camera.updateMatrixWorld();
      const behind = camera.position.x * Math.sin(yaw) + camera.position.z * Math.cos(yaw);
      const right = camera.position.x * Math.cos(yaw) - camera.position.z * Math.sin(yaw);
      assert.ok(behind > 2 && right > 0 && camera.position.y > -10 + 1.82);
      const head = new Vector3(0, -10 + 1.82, 0).project(camera);
      const feet = new Vector3(0, -10, 0).project(camera);
      assert.ok(head.x < 0 && head.x > -.85 && head.y < 1 && feet.y > -1);
    }
  }
});

test('a nearby column retracts the camera immediately and clears smoothly after turning', () => {
  const scene = new Scene();
  const mesh = new InstancedMesh(new BoxGeometry(.8, 3.8, .4), new MeshBasicMaterial(), 2);
  mesh.setMatrixAt(0, new Matrix4().makeTranslation(.2, 1.9, 1.4));
  mesh.setMatrixAt(1, new Matrix4().makeTranslation(-2, -4, -2));
  scene.add(mesh);
  const camera = new PerspectiveCamera(64, 1, .08, 180);
  const follow = createShoulderCamera(scene, camera);
  follow(0, 0, 0, Math.PI, -.035, 1/60, true);
  const armFromPlayer = () => camera.position.distanceTo(new Vector3(0, 1.46, 0));
  const open = armFromPlayer();
  follow(0, 0, 0, 0, -.035, 1/60);
  assert.ok(camera.position.z < 1.05);
  const short = armFromPlayer();
  follow(0, 0, 0, Math.PI, -.035, 1/60);
  assert.ok(armFromPlayer() > short && armFromPlayer() < open);
  follow(0, -15, 0, 0, -.035, 0, true);
  close(camera.position.z, 2.8 * Math.cos(.34 + .035 * .65));
  assert.ok(camera.position.y < -12);
});
