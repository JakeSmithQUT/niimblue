type EAN13BitPattern = { A: string; B: string; C: string };
const ean13_bp: Record<string, EAN13BitPattern> = {
  "0": { A: "0001101", B: "0100111", C: "1110010" },
  "1": { A: "0011001", B: "0110011", C: "1100110" },
  "2": { A: "0010011", B: "0011011", C: "1101100" },
  "3": { A: "0111101", B: "0100001", C: "1000010" },
  "4": { A: "0100011", B: "0011101", C: "1011100" },
  "5": { A: "0110001", B: "0111001", C: "1001110" },
  "6": { A: "0101111", B: "0000101", C: "1010000" },
  "7": { A: "0111011", B: "0010001", C: "1000100" },
  "8": { A: "0110111", B: "0001001", C: "1001000" },
  "9": { A: "0001011", B: "0010111", C: "1110100" },
};

const ean13_table_switch_mask: Record<string, string> = {
  "0": "AAAAAA",
  "1": "AABABB",
  "2": "AABBAB",
  "3": "AABBBA",
  "4": "ABAABB",
  "5": "ABBAAB",
  "6": "ABBBAA",
  "7": "ABABAB",
  "8": "ABABBA",
  "9": "ABBABA",
};

export const ean13 = (data: string): { text: string; bandcode: string } => {
  if (data.length > 13) throw new Error("Data too long for EAN13");
  if (data.length < 12) data = data.padEnd(12, "0");
  if (/^\d+$/.test(data) === false) throw new Error("Invalid character in EAN13");

  let checksum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(data[i], 10);
    checksum += (i % 2 === 0 ? 1 : 3) * digit;
  }
  checksum = (10 - (checksum % 10)) % 10;
  if (data.length === 12) data += checksum.toString();
  else if (data.length === 13 && data[12] !== checksum.toString())
    throw new Error("Invalid checksum in EAN13");

  const result: string[] = [];
  result.push("101");
  const tableSwitch = ean13_table_switch_mask[data[0]];
  for (let i = 1; i < 7; i++) {
    const digit = data[i];
    const tab = tableSwitch[i - 1] as keyof EAN13BitPattern;
    result.push(ean13_bp[digit][tab]);
  }
  result.push("01010");
  for (let i = 7; i < 13; i++) {
    const digit = data[i];
    result.push(ean13_bp[digit].C);
  }
  result.push("101");

  return { text: data, bandcode: result.join("") };
};

const code128_bp: { ascii: number; code: string }[] = [
  { ascii: 32, code: "11011001100" },
  { ascii: 33, code: "11001101100" },
  { ascii: 34, code: "11001100110" },
  { ascii: 35, code: "10010011000" },
  { ascii: 36, code: "10010000110" },
  { ascii: 37, code: "10001001100" },
  { ascii: 38, code: "10011001000" },
  { ascii: 39, code: "10011000100" },
  { ascii: 40, code: "10001100100" },
  { ascii: 41, code: "11001000000" },
  { ascii: 42, code: "11001000100" },
  { ascii: 43, code: "11000100100" },
  { ascii: 44, code: "10110011100" },
  { ascii: 45, code: "10011011100" },
  { ascii: 46, code: "10011001110" },
  { ascii: 47, code: "10111001100" },
  { ascii: 48, code: "10011101100" },
  { ascii: 49, code: "10011100110" },
  { ascii: 50, code: "11001110010" },
  { ascii: 51, code: "11001011100" },
  { ascii: 52, code: "11001001110" },
  { ascii: 53, code: "11011100100" },
  { ascii: 54, code: "11001110100" },
  { ascii: 55, code: "11101101110" },
  { ascii: 56, code: "11101001100" },
  { ascii: 57, code: "11100101100" },
  { ascii: 58, code: "11100100110" },
  { ascii: 59, code: "11101100100" },
  { ascii: 60, code: "11100110100" },
  { ascii: 61, code: "11100110010" },
  { ascii: 62, code: "11011011000" },
  { ascii: 63, code: "11011000110" },
  { ascii: 64, code: "11000110110" },
  { ascii: 65, code: "10100011000" },
  { ascii: 66, code: "10001011000" },
  { ascii: 67, code: "10001000110" },
  { ascii: 68, code: "10110001000" },
  { ascii: 69, code: "10001101000" },
  { ascii: 70, code: "10001100010" },
  { ascii: 71, code: "11010001000" },
  { ascii: 72, code: "11000101000" },
  { ascii: 73, code: "11000100010" },
  { ascii: 74, code: "10110111000" },
  { ascii: 75, code: "10110001110" },
  { ascii: 76, code: "10001101110" },
  { ascii: 77, code: "10111011000" },
  { ascii: 78, code: "10111000110" },
  { ascii: 79, code: "10001110110" },
  { ascii: 80, code: "11101110110" },
  { ascii: 81, code: "11010001110" },
  { ascii: 82, code: "11000101110" },
  { ascii: 83, code: "11011101000" },
  { ascii: 84, code: "11011100010" },
  { ascii: 85, code: "11011101110" },
  { ascii: 86, code: "11101011000" },
  { ascii: 87, code: "11101000110" },
  { ascii: 88, code: "11100010110" },
  { ascii: 89, code: "11101101000" },
  { ascii: 90, code: "11101100010" },
  { ascii: 91, code: "11100011010" },
  { ascii: 92, code: "11101111010" },
  { ascii: 93, code: "11001000010" },
  { ascii: 94, code: "11110001010" },
  { ascii: 95, code: "10100110000" },
  { ascii: 96, code: "10100001100" },
  { ascii: 97, code: "10010110000" },
  { ascii: 98, code: "10010000110" },
  { ascii: 99, code: "10000101100" },
  { ascii: 100, code: "10000100110" },
  { ascii: 101, code: "10110010000" },
  { ascii: 102, code: "10110000100" },
  { ascii: 103, code: "10011010000" },
  { ascii: 104, code: "10011000010" },
  { ascii: 105, code: "10000110100" },
  { ascii: 106, code: "10000110010" },
  { ascii: 107, code: "11000010010" },
  { ascii: 108, code: "11001010000" },
  { ascii: 109, code: "11110111010" },
  { ascii: 110, code: "11000010100" },
  { ascii: 111, code: "10001111010" },
  { ascii: 112, code: "10100111100" },
  { ascii: 113, code: "10010111100" },
  { ascii: 114, code: "10010011110" },
  { ascii: 115, code: "10111100100" },
  { ascii: 116, code: "10011110100" },
  { ascii: 117, code: "10011110010" },
  { ascii: 118, code: "11110100100" },
  { ascii: 119, code: "11110010100" },
  { ascii: 120, code: "11110010010" },
  { ascii: 121, code: "11011011110" },
  { ascii: 122, code: "11011110110" },
  { ascii: 123, code: "11110110110" },
  { ascii: 124, code: "10101111000" },
  { ascii: 125, code: "10100011110" },
  { ascii: 126, code: "10001011110" },
  { ascii: 200, code: "10111101000" },
  { ascii: 201, code: "10111100010" },
  { ascii: 202, code: "11110101000" },
  { ascii: 203, code: "11110100010" },
  { ascii: 204, code: "10111011110" },
  { ascii: 205, code: "10111101110" },
  { ascii: 206, code: "11101011110" },
  { ascii: 207, code: "11110101110" },
  { ascii: 208, code: "11010000100" },
  { ascii: 209, code: "11010010000" },
  { ascii: 210, code: "11010011100" },
  { ascii: 211, code: "1100011101011" },
];

const code128_ascii_to_id = code128_bp.reduce(
  (acc, { ascii }, idx) => {
    acc[ascii] = idx;
    return acc;
  },
  {} as Record<number, number>,
);

export const code128b = (data: string): string => {
  if (data.length > 229) throw new Error("Data too long for Code128B");

  const result: string[] = [];
  result.push(code128_bp[104].code);
  let checksum = 104;
  for (let i = 0; i < data.length; i++) {
    const id = code128_ascii_to_id[data.charCodeAt(i)];
    if (id === undefined) throw new Error("Invalid character in Code128B");
    result.push(code128_bp[id].code);
    checksum += (i + 1) * id;
  }
  result.push(code128_bp[checksum % 103].code);
  result.push(code128_bp[106].code);

  return result.join("");
};

export type BarcodeCoding = "EAN13" | "CODE128B";

const EAN13_LONG_BAR_INDEXES: Set<number> = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);

const equalSpacingFillText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  printWidth: number,
): void => {
  const widths: number[] = [];
  for (let i = 0; i < text.length; i++) {
    widths.push(ctx.measureText(text.charAt(i)).width);
  }
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const spacing = text.length > 1 ? (printWidth - totalWidth) / (text.length - 1) : 0;
  let offset = 0;
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text.charAt(i), x + offset, y);
    offset += widths[i] + spacing;
  }
};

export const drawBarcode = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  encoding: BarcodeCoding,
  printText: boolean,
  scaleFactor: number,
  fontSize: number,
  fontFamily: string,
): void => {
  let bandcode = "";
  let displayText = "";
  let error = false;

  try {
    if (encoding === "EAN13") {
      const result = ean13(text);
      displayText = result.text;
      bandcode = result.bandcode;
    } else {
      displayText = text;
      bandcode = code128b(text);
    }
  } catch (e) {
    console.error(e);
    error = true;
  }

  if (error || bandcode === "") {
    drawBarcodeError(ctx, width, height);
    return;
  }

  ctx.save();
  ctx.translate(-width / 2, -height / 2);
  ctx.translate(0.5, 0.5);

  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = "bottom";

  const longBarHeight = height;
  let shortBarHeight = height;
  const letterWidth = Math.ceil(ctx.measureText("0").width);
  const barcodeStartPos = encoding === "EAN13" ? letterWidth : 0;

  if (printText) {
    shortBarHeight -= fontSize * 1.2;
  } else if (encoding === "EAN13") {
    shortBarHeight -= 8;
  }

  let blackStartPosition = -1;
  let blackCount = 0;
  let isLongBar = false;

  for (let i = 0; i < bandcode.length; i++) {
    const isBlack = bandcode[i] === "1";
    const xPos = barcodeStartPos + i * scaleFactor;

    if (isBlack) {
      blackCount++;
      if (blackStartPosition === -1) blackStartPosition = xPos;
      if (encoding === "EAN13" && EAN13_LONG_BAR_INDEXES.has(i)) isLongBar = true;
      if (blackStartPosition !== -1 && i === bandcode.length - 1) {
        ctx.fillRect(
          blackStartPosition,
          0,
          scaleFactor * blackCount,
          isLongBar ? longBarHeight : shortBarHeight,
        );
      }
    } else {
      ctx.fillRect(blackStartPosition, 0, scaleFactor * blackCount, isLongBar ? longBarHeight : shortBarHeight);
      blackStartPosition = -1;
      blackCount = 0;
      isLongBar = false;
    }
  }

  if (printText) {
    if (encoding === "EAN13") {
      const parts = [displayText[0], displayText.slice(1, 7), displayText.slice(7, 13), ">"];
      const midPartWidth = 40;
      const longBars1End = 4;
      const longBars2End = 50;

      ctx.fillText(parts[0], 0, height);
      equalSpacingFillText(ctx, parts[1], letterWidth + longBars1End * scaleFactor, height, midPartWidth * scaleFactor);
      equalSpacingFillText(ctx, parts[2], letterWidth + longBars2End * scaleFactor, height, midPartWidth * scaleFactor);
      ctx.fillText(parts[3], width - letterWidth, height);
    } else {
      equalSpacingFillText(ctx, displayText, barcodeStartPos, height, width);
    }
  }

  ctx.restore();
};

const drawBarcodeError = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  ctx.save();
  ctx.fillStyle = "black";
  ctx.translate(-width / 2, -height / 2);
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "16px sans-serif";
  ctx.fillText("ERR", 0, 0);
  ctx.restore();
};
