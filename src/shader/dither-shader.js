import * as THREE from "three";
/* ***********************************************************************************

  Shader constants and utility functions

*********************************************************************************** */
export const MAX_PALLETTE_SIZE = 15;
export const DEFAULT_PALETTE = [
  new THREE.Color(0x000000),
  new THREE.Color(0xffffff),
];
export const fillPallette = (palletteArray) => {
  if (palletteArray.length < MAX_PALLETTE_SIZE) {
    return palletteArray
      .concat(
        new Array(MAX_PALLETTE_SIZE - palletteArray.length).fill(
          new THREE.Color(0x000000),
        ),
      )
      .map((color) => new THREE.Color(color).convertLinearToSRGB());
  }
  if (palletteArray.length > MAX_PALLETTE_SIZE) {
    return palletteArray
      .slice(0, MAX_PALLETTE_SIZE)
      .map((color) => new THREE.Color(color).convertLinearToSRGB());
  }
  return palletteArray.map((color) =>
    new THREE.Color(color).convertLinearToSRGB(),
  );
};
/* ***********************************************************************************

  Ordered Dithering shader with customizable Bayer matrix size and color palette.

*********************************************************************************** */
export const DitherShader = {
  name: "DitherShader",

  uniforms: {
    tDiffuse: { value: null },
    matrixWidth: { value: 8 },
    matrixHeight: { value: 8 },
    resolution: { value: { x: window.innerWidth, y: window.innerHeight } },
    paletteSize: { value: MAX_PALLETTE_SIZE },
    palette: { value: fillPallette(DEFAULT_PALETTE) },
    ditherOffset: { value: 0.5 },
    noiseScale: { value: 0.5 },
    time: { value: 0.0 },
    jitterSpeed: { value: 8.0 },
    jitterFrequency: { value: 20.0 },
    jitterIntensity: { value: 0.1 },
  },

  vertexShader: /* glsl */ `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

  fragmentShader: /* glsl */ `

		uniform sampler2D tDiffuse;
		uniform int matrixWidth;
		uniform int matrixHeight;
		uniform vec2 resolution;
		uniform int paletteSize;
		uniform vec3 palette[${MAX_PALLETTE_SIZE}];
		uniform float ditherOffset;
		uniform float noiseScale;
		uniform float time;
		uniform float jitterSpeed;
		uniform float jitterFrequency;
		uniform float jitterIntensity;

		varying vec2 vUv;

		float getBayerValue(int x, int y, int size) {
			// 2x2 Bayer matrix
			if (size == 2) {
				if (x == 0 && y == 0) return 0.0 / 4.0;
				if (x == 1 && y == 0) return 2.0 / 4.0;
				if (x == 0 && y == 1) return 3.0 / 4.0;
				if (x == 1 && y == 1) return 1.0 / 4.0;
			}
			// 3x3 Bayer matrix
			else if (size == 3) {
				if (x == 0 && y == 0) return 0.0 / 9.0;
				if (x == 1 && y == 0) return 7.0 / 9.0;
				if (x == 2 && y == 0) return 3.0 / 9.0;
				if (x == 0 && y == 1) return 6.0 / 9.0;
				if (x == 1 && y == 1) return 5.0 / 9.0;
				if (x == 2 && y == 1) return 2.0 / 9.0;
				if (x == 0 && y == 2) return 4.0 / 9.0;
				if (x == 1 && y == 2) return 1.0 / 9.0;
				if (x == 2 && y == 2) return 8.0 / 9.0;
			}
			// 4x4 Bayer matrix
			else if (size == 4) {
				if (x == 0 && y == 0) return 0.0 / 16.0;
				if (x == 1 && y == 0) return 8.0 / 16.0;
				if (x == 2 && y == 0) return 2.0 / 16.0;
				if (x == 3 && y == 0) return 10.0 / 16.0;
				if (x == 0 && y == 1) return 12.0 / 16.0;
				if (x == 1 && y == 1) return 4.0 / 16.0;
				if (x == 2 && y == 1) return 14.0 / 16.0;
				if (x == 3 && y == 1) return 6.0 / 16.0;
				if (x == 0 && y == 2) return 3.0 / 16.0;
				if (x == 1 && y == 2) return 11.0 / 16.0;
				if (x == 2 && y == 2) return 1.0 / 16.0;
				if (x == 3 && y == 2) return 9.0 / 16.0;
				if (x == 0 && y == 3) return 15.0 / 16.0;
				if (x == 1 && y == 3) return 7.0 / 16.0;
				if (x == 2 && y == 3) return 13.0 / 16.0;
				if (x == 3 && y == 3) return 5.0 / 16.0;
			}
			// 8x8 Bayer matrix
			else if (size == 8) {
				int bayer8x8[64];
				bayer8x8[0] = 0; bayer8x8[1] = 32; bayer8x8[2] = 8; bayer8x8[3] = 40; bayer8x8[4] = 2; bayer8x8[5] = 34; bayer8x8[6] = 10; bayer8x8[7] = 42;
				bayer8x8[8] = 48; bayer8x8[9] = 16; bayer8x8[10] = 56; bayer8x8[11] = 24; bayer8x8[12] = 50; bayer8x8[13] = 18; bayer8x8[14] = 58; bayer8x8[15] = 26;
				bayer8x8[16] = 12; bayer8x8[17] = 44; bayer8x8[18] = 4; bayer8x8[19] = 36; bayer8x8[20] = 14; bayer8x8[21] = 46; bayer8x8[22] = 6; bayer8x8[23] = 38;
				bayer8x8[24] = 60; bayer8x8[25] = 28; bayer8x8[26] = 52; bayer8x8[27] = 20; bayer8x8[28] = 62; bayer8x8[29] = 30; bayer8x8[30] = 54; bayer8x8[31] = 22;
				bayer8x8[32] = 3; bayer8x8[33] = 35; bayer8x8[34] = 11; bayer8x8[35] = 43; bayer8x8[36] = 1; bayer8x8[37] = 33; bayer8x8[38] = 9; bayer8x8[39] = 41;
				bayer8x8[40] = 51; bayer8x8[41] = 19; bayer8x8[42] = 59; bayer8x8[43] = 27; bayer8x8[44] = 49; bayer8x8[45] = 17; bayer8x8[46] = 57; bayer8x8[47] = 25;
				bayer8x8[48] = 15; bayer8x8[49] = 47; bayer8x8[50] = 7; bayer8x8[51] = 39; bayer8x8[52] = 13; bayer8x8[53] = 45; bayer8x8[54] = 5; bayer8x8[55] = 37;
				bayer8x8[56] = 63; bayer8x8[57] = 31; bayer8x8[58] = 55; bayer8x8[59] = 23; bayer8x8[60] = 61; bayer8x8[61] = 29; bayer8x8[62] = 53; bayer8x8[63] = 21;
				
				int index = y * 8 + x;
				return float(bayer8x8[index]) / 64.0;
			}
			
			return 0.5;
		}


		vec3 findClosestColor(vec3 color) {
			vec3 closest = palette[0];
			float minDist = distance(color, palette[0]);
			
			for (int i = 1; i < paletteSize; i++) {
				float dist = distance(color, palette[i]);
				if (dist < minDist) {
					minDist = dist;
					closest = palette[i];
				}
			}
			
			return closest;
		}

		void main() {
			vec4 texel = texture2D(tDiffuse, vUv);
			vec2 pixelPos = vUv * resolution;
			
			int x = int(mod(pixelPos.x, float(matrixWidth)));
			int y = int(mod(pixelPos.y, float(matrixHeight)));
			int maxSize = max(matrixWidth, matrixHeight);
			
			float threshold = getBayerValue(x, y, maxSize);
			
			float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
			float noiseWave = sin(time * jitterSpeed + (vUv.x + vUv.y) * jitterFrequency);

			float jitter = noiseWave * jitterIntensity * luma;
			float animatedThreshold = threshold;

			if(time > 0.0) animatedThreshold = threshold + jitter;
			
			vec3 colorWithDither = texel.rgb + (animatedThreshold - ditherOffset) * noiseScale;
			vec3 ditherColor = findClosestColor(colorWithDither);
			
			gl_FragColor = vec4(ditherColor, texel.a);
		}`,
};
