import * as THREE from "three";
import {
  EffectComposer,
  GLTFLoader,
  OrbitControls,
  RenderPass,
  ShaderPass,
} from "three/examples/jsm/Addons.js";
import {
  DitherShader,
  fillPallette,
  DEFAULT_PALETTE,
  MAX_PALLETTE_SIZE,
} from "./shader/dither-shader.js";
import { Pane } from "tweakpane";
import { rgbToHTMLColor } from "./utils";
import { DEV_MODE, LIGHT_INTENSITY } from "./constants";
import gsap from "gsap";
import "./style.css";
import Meyda from "meyda";

let isIpodZone = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.01,
  2000,
);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: DEV_MODE ? THREE.MOUSE.PAN : undefined,
};
controls.enableZoom = DEV_MODE;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
/* ***********************************************************************************

  Lights

*********************************************************************************** */
function createSpotLight(
  intensity,
  position,
  targetPosition,
  angle,
  helperColor,
) {
  const spotLight = new THREE.SpotLight(0xffffff, intensity, 0);
  spotLight.angle = angle;
  spotLight.position.set(position.x, position.y, position.z);
  spotLight.target.position.set(
    targetPosition.x,
    targetPosition.y,
    targetPosition.z,
  );
  scene.add(spotLight);
  const spotlightHelper = new THREE.SpotLightHelper(spotLight, helperColor);
  if (DEV_MODE) scene.add(spotlightHelper);

  return { light: spotLight, spotlightHelper };
}

const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);

const { light: spotlight1 } = createSpotLight(
  LIGHT_INTENSITY,
  new THREE.Vector3(-0.5, 2.7, 4.24),
  new THREE.Vector3(5, 0.8, 4.28),
  Math.PI / 6.7,
  "red",
);

const { light: spotlight2 } = createSpotLight(
  LIGHT_INTENSITY,
  new THREE.Vector3(2.8, 1.7, 3.24),
  new THREE.Vector3(3.2, -0.9, -2.2),
  Math.PI / 8,
  "blue",
);

const { light: spotlight3 } = createSpotLight(
  LIGHT_INTENSITY,
  new THREE.Vector3(1.7, 1.7, 5.26),
  new THREE.Vector3(-0.9, -23.1, 60),
  Math.PI / 8,
  "orange",
);

const { light: spotlight4 } = createSpotLight(
  LIGHT_INTENSITY,
  new THREE.Vector3(-2.9, 1.7, 5.26),
  new THREE.Vector3(1.2, -17, 60),
  Math.PI / 5,
  "cyan",
);

const { light: spotlight5 } = createSpotLight(
  LIGHT_INTENSITY,
  new THREE.Vector3(0.2, 1.7, 3.2),
  new THREE.Vector3(0.3, 0.2, 0.0),
  Math.PI / 8,
  "green",
);

const { light: spotlight6 } = createSpotLight(
  LIGHT_INTENSITY,
  new THREE.Vector3(-1.9, 1.7, 3.2),
  new THREE.Vector3(-2.2, 0.2, 0.0),
  Math.PI / 8,
  "indigo",
);

const { light: spotlight7 } = createSpotLight(
  LIGHT_INTENSITY,
  new THREE.Vector3(-2.0, 2.8, 4.3),
  new THREE.Vector3(-34.0, -50.8, 4.9),
  Math.PI / 8,
  "violet",
);
/* ***********************************************************************************

  Model Loading

*********************************************************************************** */
const loadingScreen = document.querySelector(".loading");
const manager = new THREE.LoadingManager();
const loader = new GLTFLoader(manager);

manager.onProgress = (_, loaded, total) => {
  const progressBar = document.querySelector(".progressBar");
  gsap.to(progressBar, {
    width: ((loaded / total) * 100).toFixed(2) + "%",
    duration: 0.3,
  });
};
manager.onLoad = () => {
  gsap.to(loadingScreen, {
    opacity: 0,
    duration: 1,
    ease: "power3.inOut",
    onComplete: () => {
      loadingScreen.style.display = "none";
    },
  });
};

loader.load(
  "art_museum_vr.glb",
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    camera.position.set(-0.31, -0.932, 4.355);
    controls.target.set(0.345, -0.897, 4.36);
    controls.update();
  },
  undefined,
  (error) => {
    console.error(error);
  },
);

loader.load(
  "julius_casar.glb",
  (gltf) => {
    const model = gltf.scene;
    model.position.set(-4, -1.63, 4.7);
    model.rotation.set(0, Math.PI / 2, 0);
    scene.add(model);
  },
  undefined,
  (error) => {
    console.error(error);
  },
);
loader.load(
  "ipod.glb",
  (gltf) => {
    const model = gltf.scene;
    model.scale.set(0.07, 0.07, 0.07);
    model.position.set(-4.5, -0.6, 6.1);
    model.rotation.set(0, Math.PI / 2, 0);
    scene.add(model);
  },
  undefined,
  (error) => {
    console.error(error);
  },
);
/* ***********************************************************************************

 Apply Post Processing

*********************************************************************************** */
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const ditherPass = new ShaderPass(DitherShader);
composer.addPass(ditherPass);

/* ***********************************************************************************

Meyda Audio Analyser Setup

*********************************************************************************** */
const audioContext = new AudioContext();
const audioElement = document.querySelector("#bgm");
const source = audioContext.createMediaElementSource(audioElement);
source.connect(audioContext.destination);

const analyzer = Meyda.createMeydaAnalyzer({
  audioContext: audioContext,
  source: source,
  bufferSize: 512,
  featureExtractors: ["rms"],
  callback: (features) => {
    const rms = features.rms;

    ambientLight.intensity = THREE.MathUtils.lerp(
      ambientLight.intensity,
      rms * 7,
      0.5,
    );
    spotlight1.intensity = THREE.MathUtils.lerp(
      spotlight1.intensity,
      rms * 90,
      0.5,
    );
    spotlight2.intensity = THREE.MathUtils.lerp(
      spotlight2.intensity,
      rms * 90,
      0.5,
    );
    spotlight3.intensity = THREE.MathUtils.lerp(
      spotlight3.intensity,
      rms * 90,
      0.5,
    );
    spotlight4.intensity = THREE.MathUtils.lerp(
      spotlight4.intensity,
      rms * 90,
      0.5,
    );
    spotlight5.intensity = THREE.MathUtils.lerp(
      spotlight5.intensity,
      rms * 90,
      0.5,
    );
    spotlight6.intensity = THREE.MathUtils.lerp(
      spotlight6.intensity,
      rms * 90,
      0.5,
    );
    spotlight7.intensity = THREE.MathUtils.lerp(
      spotlight7.intensity,
      rms * 90,
      0.5,
    );
  },
});

audioElement.addEventListener("play", () => {
  analyzer.start();
  audioContext.resume();
});

/* ***********************************************************************************

 Render Loop

*********************************************************************************** */
let clock = new THREE.Clock();
let delta = 0;
let interval = 1 / 60;

renderer.setAnimationLoop(animate);

function animate() {
  delta += clock.getDelta();
  if (delta > interval) {
    controls.update();
    composer.render();

    delta = delta % interval;
  }
}
/* ***********************************************************************************

  Area trigger event logic

*********************************************************************************** */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const artworkTriggers = [];

function moveToArtwork(cameraPos, targetPos, quad = "") {
  gsap.to(camera.position, {
    x: cameraPos.x,
    y: cameraPos.y,
    z: cameraPos.z,
    duration: 1.5,
    ease: "power3.inOut",
    onUpdate: () => controls.update(),
    onComplete: () => {
      if (quad.userData.areaName === "ipod" && !isIpodZone) {
        isIpodZone = true;
      }
      camera.updateProjectionMatrix();
    },
  });

  gsap.to(controls.target, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: 1.5,
    ease: "power3.inOut",
  });
}

function addArtworkTrigger(
  x,
  y,
  z,
  width,
  height,
  rotationY,
  areaName,
  depth = 0.1,
) {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: DEV_MODE ? 0.5 : 0.0,
    side: THREE.DoubleSide,
  });

  const trigger = new THREE.Mesh(geo, mat);
  trigger.position.set(x, y, z);
  trigger.rotation.y = rotationY;
  trigger.userData.areaName = areaName;

  scene.add(trigger);
  artworkTriggers.push(trigger);

  return trigger;
}

const areaTrigger = addArtworkTrigger(3, -0.1, 0.1, 2.4, 1.4, 0, "Taco");
const portrait2Trigger = addArtworkTrigger(
  0.3,
  0,
  0.1,
  2.4,
  1.35,
  0,
  "portrait 2",
);
const portrait3Trigger = addArtworkTrigger(
  -2.2,
  0,
  0.1,
  2.4,
  1.35,
  0,
  "portrait 3",
);
const portrait4Trigger = addArtworkTrigger(
  4.9,
  0,
  4.3,
  5,
  3.0,
  Math.PI / -2,
  "big front picture",
);
const portrait5Trigger = addArtworkTrigger(
  1.5,
  0,
  8.4,
  1.5,
  3.0,
  Math.PI,
  "vertical portrait",
);
const portrait6Trigger = addArtworkTrigger(
  -2.45,
  0,
  8.4,
  4.5,
  2.4,
  Math.PI,
  "second big portrait",
);
const statueTrigger = addArtworkTrigger(
  -4,
  -0.8,
  4.3,
  1,
  1.6,
  Math.PI / 2,
  "statue",
  1.2,
);
const ipod = addArtworkTrigger(
  -4.8,
  0.3,
  2.7,
  1.5,
  1.6,
  Math.PI / 2,
  "ipod",
  1.2,
);

/* ***********************************************************************************

  Event Listeners

*********************************************************************************** */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.updateProjectionMatrix();
});

window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// zoom on the point x2 when z is pressed
window.addEventListener("keydown", (e) => {
  if (e.key === "z" || e.key === "Z") {
    gsap.to(camera, {
      fov: 30,
      duration: 0.5,
      ease: "power3.inOut",
      onUpdate: () => {
        controls.update();
        camera.updateProjectionMatrix();
      },
    });
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "p" || e.key === "P") {
    console.log("--- CAMERA SETTINGS ---");
    console.log("Position:", camera.position);
    console.log("Target (Controls):", controls.target);

    navigator.clipboard.writeText(
      `camera.position.set(${camera.position.x}, ${camera.position.y}, ${camera.position.z}); controls.target.set(${controls.target.x}, ${controls.target.y}, ${controls.target.z});`,
    );
  }

  if (e.key === "e" || e.key === "E") {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(artworkTriggers);

    if (intersects.length > 0) {
      const quad = intersects[0].object;
      console.log(intersects[0].object.userData.areaName);

      let offset = new THREE.Vector3(0, 0, 1.5);

      if (quad.userData.areaName === "big front picture")
        offset = new THREE.Vector3(0, 0, 2.9);

      if (quad.userData.areaName === "second big portrait")
        offset = new THREE.Vector3(0, 0, 2.5);

      if (quad.userData.areaName === "ipod" && isIpodZone) {
        if (audioContext.state === "running") {
          audioContext.suspend();
          audioElement.pause();
          return;
        }
        audioElement.play();
      }

      offset.applyQuaternion(quad.quaternion);

      const newCameraPos = new THREE.Vector3().copy(quad.position).add(offset);

      moveToArtwork(newCameraPos, quad.position, quad);
    }
  }

  if (e.key === "r" || e.key === "R") {
    if (isIpodZone) isIpodZone = false;
    // Reset camera position
    gsap.to(camera.position, {
      x: -0.31,
      y: -0.932,
      z: 4.355,
      duration: 1.5,
      ease: "power3.inOut",
      onUpdate: () => controls.update(),
    });

    gsap.to(controls.target, {
      x: 0.345,
      y: -0.897,
      z: 4.36,
      duration: 1.5,
      ease: "power3.inOut",
    });
  }

  if (e.key === "z" || e.key === "Z") {
    gsap.to(camera, {
      fov: 50,
      duration: 0.5,
      ease: "power3.inOut",
      onUpdate: () => {
        controls.update();
        camera.updateProjectionMatrix();
      },
    });
  }

  if (e.key === "q" || e.key === "Q") {
    if (composer.passes.includes(ditherPass)) {
      composer.removePass(ditherPass);
    } else {
      composer.addPass(ditherPass);
    }
  }

  if (e.key === "w" || e.key === "W") {
    pane.hidden = !pane.hidden;
  }
});

/* ***********************************************************************************

  Tweakpane

*********************************************************************************** */
let configPaletteColors = {};
DEFAULT_PALETTE.forEach((color, index) => {
  configPaletteColors[`color${index + 1}`] = rgbToHTMLColor(
    color.r * 255,
    color.g * 255,
    color.b * 255,
  );
});

let config = {
  postProcessSettings: {
    width: 8,
    height: 8,
    noiseScale: ditherPass.uniforms.noiseScale.value,
    palette: {
      ...configPaletteColors,
    },
  },
};

const pane = new Pane();

const shaderToggler = pane.addFolder({
  title: "Post Process Toggle",
  expanded: true,
});
shaderToggler.addButton({ title: "Enable Dither Shader" }).on("click", () => {
  composer.addPass(ditherPass);
});
shaderToggler.addButton({ title: "Disable Dither Shader" }).on("click", () => {
  composer.removePass(ditherPass);
});

const shaderFolder = pane.addFolder({
  title: "Matrix Size",
  expanded: true,
});
shaderFolder
  .addBinding(config.postProcessSettings, "width", {
    min: 1,
    max: 8,
    step: 1,
  })
  .on("change", (ev) => {
    ditherPass.uniforms.matrixWidth.value = ev.value;
  });
shaderFolder
  .addBinding(config.postProcessSettings, "height", {
    min: 1,
    max: 8,
    step: 1,
  })
  .on("change", (ev) => {
    ditherPass.uniforms.matrixHeight.value = ev.value;
  });
shaderFolder
  .addBinding(config.postProcessSettings, "noiseScale", {
    min: 0.0,
    max: 1.0,
    step: 0.1,
  })
  .on("change", (ev) => {
    ditherPass.uniforms.noiseScale.value = ev.value;
  });

const paletteFolder = pane.addFolder({
  title: "Palette",
  expanded: true,
});
paletteFolder.addButton({ title: "Add Color" }).on("click", () => {
  const currentPalette = { ...config.postProcessSettings.palette };
  const currentLength = Object.keys(currentPalette).length;
  if (currentLength < MAX_PALLETTE_SIZE) {
    const newColorKey = `color${currentLength + 1}`;
    currentPalette[newColorKey] = "#ffffff";
    config.postProcessSettings.palette = { ...currentPalette };

    paletteFolder.refresh();

    paletteFolder
      .addBinding(config.postProcessSettings.palette, newColorKey)
      .on("change", (ev) => {
        const color = new THREE.Color(ev.value).convertLinearToSRGB();
        ditherPass.uniforms.palette.value[currentLength] = color;
        ditherPass.uniforms.paletteSize.value = currentLength + 1;
      });
  }
});
Object.keys(config.postProcessSettings.palette).forEach((key, index) => {
  paletteFolder
    .addBinding(config.postProcessSettings.palette, key)
    .on("change", (ev) => {
      const color = new THREE.Color(ev.value);
      ditherPass.uniforms.palette.value[index] = color;
    });
});

const presetFolder = pane.addFolder({
  title: "Presets",
  expanded: true,
});

presetFolder.addButton({ title: "Black & White" }).on("click", () => {
  const presetColors = {
    color1: "#000000",
    color2: "#ffffff",
  };
  config.postProcessSettings.palette = presetColors;
  removeAllColorBindings();
  createColorBindings({ ...presetColors });

  ditherPass.uniforms.palette.value = fillPallette([
    new THREE.Color(0x000000),
    new THREE.Color(0xffffff),
  ]);
  ditherPass.uniforms.paletteSize.value = 2;
  ditherPass.uniforms.matrixWidth.value = 8;
  ditherPass.uniforms.matrixHeight.value = 8;
  ditherPass.uniforms.noiseScale.value = 0.5;
  config.postProcessSettings.width = 8;
  config.postProcessSettings.height = 8;
  config.postProcessSettings.noiseScale = 0.5;
  shaderFolder.refresh();
});

presetFolder.addButton({ title: "Vaporwave" }).on("click", () => {
  const presetColors = {
    color1: "#ff71ce",
    color2: "#01cdfe",
    color3: "#073444",
    color4: "#b967ff",
    color5: "#fffb96",
  };
  config.postProcessSettings.palette = presetColors;

  removeAllColorBindings();
  createColorBindings({ ...presetColors });

  ditherPass.uniforms.palette.value = fillPallette([
    new THREE.Color(0xff71ce),
    new THREE.Color(0x01cdfe),
    new THREE.Color(0x073444),
    new THREE.Color(0xb967ff),
    new THREE.Color(0xfffb96),
  ]);
  ditherPass.uniforms.paletteSize.value = 5;
  ditherPass.uniforms.matrixWidth.value = 1;
  ditherPass.uniforms.matrixHeight.value = 4;
  ditherPass.uniforms.noiseScale.value = 0.6;
  config.postProcessSettings.width = 1;
  config.postProcessSettings.height = 4;
  config.postProcessSettings.noiseScale = 0.6;
  shaderFolder.refresh();
});

presetFolder.addButton({ title: "ZX SPECTRUM" }).on("click", () => {
  const presetColors = {
    color1: "#000000",
    color2: "#0000ff",
    color3: "#ff0000",
    color4: "#ff00ff",
    color5: "#00ff00",
    color6: "#00ffff",
    color7: "#ffff00",
    color8: "#ffffff",
    color9: "#0000d7",
    color10: "#d70000",
    color11: "#d700d7",
    color12: "#00d700",
    color13: "#00d7d7",
    color14: "#d7d700",
    color15: "#d7d7d7",
  };
  config.postProcessSettings.palette = presetColors;

  removeAllColorBindings();
  createColorBindings({ ...presetColors });

  ditherPass.uniforms.palette.value = fillPallette(
    Object.values(presetColors).map((hex) => new THREE.Color(hex)),
  );
  ditherPass.uniforms.paletteSize.value = 15;
  ditherPass.uniforms.matrixWidth.value = 4;
  ditherPass.uniforms.matrixHeight.value = 4;
  config.postProcessSettings.width = 4;
  config.postProcessSettings.height = 4;
  shaderFolder.refresh();
});

function removeAllColorBindings() {
  paletteFolder.children.forEach((child) => {
    if (child.title === "Add Color") return;
    child.dispose();
  });
}

function createColorBindings(paletteColors) {
  Object.keys(paletteColors).forEach((key, index) => {
    paletteFolder
      .addBinding(config.postProcessSettings.palette, key)
      .on("change", (ev) => {
        const color = new THREE.Color(ev.value);
        ditherPass.uniforms.palette.value[index] = color;
      });
  });
}
