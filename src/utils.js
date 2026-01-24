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
