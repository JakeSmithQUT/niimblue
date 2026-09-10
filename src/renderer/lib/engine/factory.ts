import {
  type SceneNode,
  type TextNode,
  type RectNode,
  type LineNode,
  type EllipseNode,
  type ImageNode,
  type QrNode,
  type BarcodeNode,
  type ArUcoNode,
  type NodeKind,
  nextId,
} from "./types";

const base = <K extends NodeKind>(kind: K, w: number, h: number, name: string) => ({
  id: nextId(),
  kind,
  x: 0,
  y: 0,
  width: w,
  height: h,
  rotation: 0,
  locked: false,
  visible: true,
  name,
});

export const createText = (text = "Text"): TextNode => ({
  ...base("text", 120, 40, "Text"),
  text,
  fontFamily: "Noto Sans",
  fontSize: 24,
  fontWeight: 400,
  italic: false,
  align: "center",
  lineHeight: 1,
  fill: "#000000",
  autoShrink: false,
});

export const createRect = (): RectNode => ({
  ...base("rect", 64, 64, "Rectangle"),
  fill: "transparent",
  stroke: "#000000",
  strokeWidth: 3,
  cornerRadius: 0,
});

export const createEllipse = (): EllipseNode => ({
  ...base("ellipse", 64, 64, "Ellipse"),
  fill: "transparent",
  stroke: "#000000",
  strokeWidth: 3,
});

export const createLine = (): LineNode => ({
  ...base("line", 100, 0, "Line"),
  stroke: "#000000",
  strokeWidth: 3,
});

export const createImage = (src: string, w: number, h: number): ImageNode => ({
  ...base("image", w, h, "Image"),
  src,
});

export const createQr = (text = "https://niim.blue"): QrNode => ({
  ...base("qrcode", 80, 80, "QR code"),
  text,
  ecc: "M",
});

export const createBarcode = (text = "123456789012"): BarcodeNode => ({
  ...base("barcode", 160, 56, "Barcode"),
  text,
  encoding: "CODE128",
});

export const createArUco = (markerId = 5): ArUcoNode => ({
  ...base("aruco", 64, 64, "ArUco"),
  markerId,
  size: 5,
});

export const createNode = (kind: NodeKind): SceneNode => {
  switch (kind) {
    case "text":
      return createText();
    case "rect":
      return createRect();
    case "ellipse":
      return createEllipse();
    case "line":
      return createLine();
    case "qrcode":
      return createQr();
    case "barcode":
      return createBarcode();
    case "aruco":
      return createArUco();
    default:
      throw new Error(`No factory for ${kind}`);
  }
};
