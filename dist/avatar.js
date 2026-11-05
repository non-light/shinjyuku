import {AnimationClip, AnimationMixer, Group, QuaternionKeyframeTrack} from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

const files = new Map([
  ['red', 'block-person.glb'],
  ['blue', 'block-person-blue.glb'],
  ['yellow', 'block-person-yellow.glb'],
  ['green', 'block-person-green.glb']
]);
const clothingParts = ['Torso', 'LeftArm', 'RightArm'];

export async function createAvatar(scene, initialColor = 'red') {
  const loader = new GLTFLoader();
  function loadModel(color) {
    const filename = files.get(color);
    if (!filename) throw new Error('Unknown avatar color: ' + color);
    const url = new URL('./assets/characters/' + filename, import.meta.url);
    return loader.loadAsync(url.href);
  }

  const model = await loadModel(initialColor);
  const group = new Group();
  group.add(model.scene);
  const mixer = new AnimationMixer(model.scene);
  const actions = {};
  for (const clip of model.animations) actions[clip.name] = mixer.clipAction(clip);
  const seatTracks = ['LeftLeg', 'RightLeg', 'LeftArm', 'RightArm'].map(name => {
    const angle = name.endsWith('Leg') ? -1.46 : -.25;
    return new QuaternionKeyframeTrack(name + '.quaternion', [0], [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)]);
  });
  actions.Sit = mixer.clipAction(new AnimationClip('Sit', 1, seatTracks));
  let action = actions.Idle.play();

  // The original four GLBs share one rig. Only the torso and sleeves differ.
  const clothing = clothingParts.map(name => model.scene.getObjectByName(name));
  const palettes = new Map([[initialColor, Promise.resolve(clothing.map(mesh => mesh.geometry.getAttribute('color')))]]);
  let latestSelection = 0;

  async function setColor(color) {
    const selection = ++latestSelection;
    let palette = palettes.get(color);
    try {
      if (!palette) {
        palette = loadModel(color).then(skin =>
          clothingParts.map(name => skin.scene.getObjectByName(name).geometry.getAttribute('color'))
        );
        palettes.set(color, palette);
      }
      const attributes = await palette;
      if (selection !== latestSelection) return false;
      clothing.forEach((mesh, index) => mesh.geometry.setAttribute('color', attributes[index]));
      return true;
    } catch (error) {
      if (palettes.get(color) === palette) palettes.delete(color);
      if (selection !== latestSelection) return false;
      throw error;
    }
  }

  function update(dt, gait, pace = 1) {
    const next = actions[gait] || actions.Idle;
    if (action !== next) {
      next.reset().play();
      action.crossFadeTo(next, 0.14, false);
      action = next;
    }
    action.timeScale = pace;
    mixer.update(dt);
  }

  scene.add(group);
  return {group, setColor, update};
}
