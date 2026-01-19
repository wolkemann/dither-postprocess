import * as THREE from "three";
import { MAX_PALLETTE_SIZE } from "./shader/dither-shader";

export const colorToVec3 = (color) => {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  return new THREE.Vector3(r, g, b);
};

export const rgbToHTMLColor = (r, g, b) => {
  r = Math.floor(r);
  g = Math.floor(g);
  b = Math.floor(b);
  return (
    "#" +
    ("0" + r.toString(16)).slice(-2) +
    ("0" + g.toString(16)).slice(-2) +
    ("0" + b.toString(16)).slice(-2)
  );
};

export const fillPallette = (palletteArray) => {
  if (palletteArray.length < MAX_PALLETTE_SIZE) {
    return palletteArray.concat(
      new Array(MAX_PALLETTE_SIZE - palletteArray.length).fill(
        new THREE.Color(0x000000),
      ),
    );
  }
  if (palletteArray.length > MAX_PALLETTE_SIZE) {
    return palletteArray.slice(0, MAX_PALLETTE_SIZE);
  }
  return palletteArray;
};

export const createProgressScreenHTML = () => {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "loading";

  const loadingText = document.createElement("span");
  loadingText.innerText = "LOADING";
  loadingDiv.appendChild(loadingText);

  const progressBar = document.createElement("div");
  progressBar.className = "progressBar";
  loadingDiv.appendChild(progressBar);

  document.body.appendChild(loadingDiv);

  return document.querySelector(".loading");
};
