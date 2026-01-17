import * as THREE from "three";
import {
  EffectComposer,
  GLTFLoader,
  OrbitControls,
  RenderPass,
  ShaderPass,
} from "three/examples/jsm/Addons.js";
import { DEFAULT_PALETTE, DitherShader } from "./shader/dither-shader";
import { Pane } from "tweakpane";
import { fillPallette, rgbToHTMLColor } from "./utils";

import "./style.css";

const loader = new GLTFLoader();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshToonMaterial({ color: 0x00ffff });
const cube = new THREE.Mesh(geometry, material);

cube.rotation.y = 2;

loader.load(
  "car/car.glb",
  (gltf) => {
    const model = gltf.scene;

    model.scale.set(140, 140, 140);
    model.position.set(0, -0.5, 0);
    model.rotation.set(0.2, -0.3, 0);
    scene.add(model);
  },
  undefined,
  (error) => {
    console.error(error);
  },
);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const ditherPass = new ShaderPass(DitherShader);
camera.position.z = 6;

const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(4.7, 7.7, 6.6);
pointLight.intensity = 72;
pointLight.decay = 0.3;
pointLight.distance = 20;
scene.add(pointLight);
const sphereSize = 1;
const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
scene.add(pointLightHelper);

renderer.setAnimationLoop(animate);

let clock = new THREE.Clock();
let delta = 0;
let interval = 1 / 30;

function animate() {
  requestAnimationFrame(animate);
  delta += clock.getDelta();

  if (delta > interval) {
    composer.render();

    delta = delta % interval;
  }
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.updateProjectionMatrix();
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
  pointLight: {
    position: { x: 4.7, y: 7.7, z: 6.6 },
    distance: 20,
    intensity: 72,
    decay: 0.3,
  },
  postProcessSettings: {
    width: 8,
    height: 8,
    noiseScale: 0.1,
    palette: {
      ...configPaletteColors,
    },
  },
};

const pane = new Pane();

const lightFolder = pane.addFolder({ title: "PointLight", expanded: true });
lightFolder
  .addBinding(config.pointLight, "position", {
    min: 0.0,
    max: 99,
    step: 0.1,
  })
  .on("change", (ev) => {
    pointLight.position.set(ev.value.x, ev.value.y, ev.value.z);
  });
lightFolder
  .addBinding(config.pointLight, "distance", {
    min: -20,
    max: 20,
    step: 0.1,
  })
  .on("change", (ev) => {
    pointLight.distance = ev.value;
  });
lightFolder
  .addBinding(config.pointLight, "intensity", {
    min: 0,
    max: 200,
    step: 1,
  })
  .on("change", (ev) => {
    pointLight.intensity = ev.value;
  });
lightFolder
  .addBinding(config.pointLight, "decay", {
    min: 0,
    max: 5,
    step: 0.1,
  })
  .on("change", (ev) => {
    pointLight.decay = ev.value;
  });

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
  if (currentLength < 8) {
    const newColorKey = `color${currentLength + 1}`;
    currentPalette[newColorKey] = "#ffffff";
    config.postProcessSettings.palette = { ...currentPalette };

    paletteFolder.refresh();

    paletteFolder
      .addBinding(config.postProcessSettings.palette, newColorKey)
      .on("change", (ev) => {
        const color = new THREE.Color(ev.value);
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
  config.postProcessSettings.width = 8;
  config.postProcessSettings.height = 8;
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
  ditherPass.uniforms.matrixWidth.value = 4;
  ditherPass.uniforms.matrixHeight.value = 1;
  config.postProcessSettings.width = 4;
  config.postProcessSettings.height = 1;
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
