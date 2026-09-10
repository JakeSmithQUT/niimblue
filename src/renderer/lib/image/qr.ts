import QRCodeFactory from "qrcode-generator";
import { Utils } from "@mmote/niimbluelib";

const toUTF8Array = (str: string): number[] => {
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f),
      );
    }
  }
  return utf8;
};

QRCodeFactory.stringToBytes = (str: string): number[] => {
  if (str.startsWith("hex:")) {
    const input = str.slice(4).replaceAll(" ", "").toLowerCase();
    if (input.length % 2 !== 0 || !/^[a-f0-9]+$/.test(input)) {
      throw new Error("Invalid hex input");
    }
    return Array.from(Utils.hexToBuf(input));
  }
  return toUTF8Array(str);
};

export type QrEcc = "L" | "M" | "Q" | "H";

export const drawQrCode = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  ecc: QrEcc,
): void => {
  if (!text) {
    drawError(ctx, width, height);
    return;
  }

  let qr: ReturnType<typeof QRCodeFactory>;
  try {
    qr = QRCodeFactory(0, ecc);
    qr.addData(text, "Byte");
    qr.make();
  } catch (e) {
    console.error(e);
    drawError(ctx, width, height);
    return;
  }

  const moduleCount = qr.getModuleCount();
  const qrScale = Math.floor(width / moduleCount);
  let qrWidth = qrScale * moduleCount;
  qrWidth -= qrWidth % 2;

  if (qrScale < 1 || qrWidth > width) {
    drawError(ctx, width, height);
    return;
  }

  ctx.save();
  ctx.translate(-qrWidth / 2, -qrWidth / 2);
  ctx.translate(-0.5, -0.5);
  qr.renderTo2dContext(ctx, qrScale);
  ctx.restore();
};

export const drawError = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  ctx.save();
  ctx.fillStyle = "black";
  ctx.translate(-width / 2, -height / 2);
  ctx.translate(-0.5, -0.5);
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "16px sans-serif";
  ctx.fillText("ERR", 0, 0);
  ctx.restore();
};
