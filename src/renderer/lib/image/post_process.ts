import { createDiffuser, rgbToGray } from "./dither";

export const floydSteinberg = createDiffuser(16, [
  [0, 0, 7],
  [3, 5, 1],
]);

export const jarvisJudiceNinke = createDiffuser(48, [
  [0, 0, 0, 7, 5],
  [3, 5, 7, 5, 3],
  [1, 3, 5, 3, 1],
]);

export const stucki = createDiffuser(42, [
  [0, 0, 0, 8, 4],
  [2, 4, 8, 4, 2],
  [1, 2, 4, 2, 1],
]);

export const burkes = createDiffuser(32, [
  [0, 0, 0, 8, 4],
  [2, 4, 8, 4, 2],
]);

export const sierra3 = createDiffuser(32, [
  [0, 0, 0, 5, 3],
  [2, 4, 5, 4, 2],
  [0, 2, 3, 2, 0],
]);

export const falseFloyd = createDiffuser(8, [
  [0, 0, 3],
  [0, 3, 2],
]);

export const atkinson = createDiffuser(
  8,
  [
    [0, 0, 0, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  { normalize: false },
);

export const threshold = (image: ImageData, thresholdValue: number): ImageData => {
  for (let i = 0; i < image.data.length; i += 4) {
    const luminance = rgbToGray(image.data[i], image.data[i + 1], image.data[i + 2]);
    const value = luminance < thresholdValue ? 0 : 255;
    image.data.fill(value, i, i + 3);
  }
  return image;
};

const BAYER_MATRICES = {
  2: [
    [0, 2],
    [3, 1],
  ],
  4: [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ],
  8: [
    [0, 48, 12, 60, 3, 51, 15, 63],
    [32, 16, 44, 28, 35, 19, 47, 31],
    [8, 56, 4, 52, 11, 59, 7, 55],
    [40, 24, 36, 20, 43, 27, 39, 23],
    [2, 50, 14, 62, 1, 49, 13, 61],
    [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58, 6, 54, 9, 57, 5, 53],
    [42, 26, 38, 22, 41, 25, 37, 21],
  ],
};

export const bayer = (image: ImageData, patternSize: 2 | 4 | 8 = 4): ImageData => {
  const matrix = BAYER_MATRICES[patternSize];
  const scale = patternSize * patternSize;
  const { width, height, data } = image;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const gray = rgbToGray(data[i], data[i + 1], data[i + 2]);
      const thresholdValue = ((matrix[y % patternSize][x % patternSize] + 0.5) / scale) * 255;
      const value = gray > thresholdValue ? 255 : 0;

      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
  }

  return image;
};

export const invert = (image: ImageData): ImageData => {
  for (let i = 0; i < image.data.length; i += 4) {
    const black = image.data[i] + image.data[i + 1] + image.data[i + 2] === 0;
    image.data.fill(black ? 255 : 0, i, i + 3);
  }
  return image;
};

export const mirror = (image: ImageData): ImageData => {
  const { width, height, data } = image;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < Math.floor(width / 2); x++) {
      const oppositeX = width - 1 - x;
      const left = (y * width + x) * 4;
      const right = (y * width + oppositeX) * 4;
      for (let c = 0; c < 4; c++) {
        const temp = data[left + c];
        data[left + c] = data[right + c];
        data[right + c] = temp;
      }
    }
  }
  return image;
};

export const copyImageData = (iData: ImageData): ImageData =>
  new ImageData(new Uint8ClampedArray(iData.data), iData.width, iData.height);

export type PostProcessType =
  | "threshold"
  | "atkinson"
  | "bayer2"
  | "bayer4"
  | "bayer8"
  | "floyd_steinberg"
  | "jjn"
  | "stucki";

export type PostProcessOptions = {
  type?: PostProcessType;
  invert: boolean;
  mirror: boolean;
  threshold: number;
  strength: number;
  serpentine: boolean;
};

export const applyPostProcess = (image: ImageData, opts: PostProcessOptions): ImageData => {
  let iData = copyImageData(image);

  switch (opts.type) {
    case "threshold":
      iData = threshold(iData, opts.threshold);
      break;
    case "atkinson":
      iData = atkinson(iData, { threshold: opts.threshold, strength: opts.strength, serpentine: opts.serpentine });
      break;
    case "bayer2":
      iData = bayer(iData, 2);
      break;
    case "bayer4":
      iData = bayer(iData, 4);
      break;
    case "bayer8":
      iData = bayer(iData, 8);
      break;
    case "floyd_steinberg":
      iData = floydSteinberg(iData, { threshold: opts.threshold, strength: opts.strength, serpentine: opts.serpentine });
      break;
    case "jjn":
      iData = jarvisJudiceNinke(iData, { threshold: opts.threshold, strength: opts.strength, serpentine: opts.serpentine });
      break;
    case "stucki":
      iData = stucki(iData, { threshold: opts.threshold, strength: opts.strength, serpentine: opts.serpentine });
      break;
  }

  if (opts.invert) iData = invert(iData);
  if (opts.mirror) iData = mirror(iData);

  return iData;
};
