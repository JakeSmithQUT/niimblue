export type NodeKind =
  | "text"
  | "rect"
  | "line"
  | "ellipse"
  | "image"
  | "qrcode"
  | "barcode"
  | "aruco";

export type Align = "left" | "center" | "right";

export type BaseNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  visible: boolean;
  name: string;
};

export type TextNode = BaseNode & {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  align: Align;
  lineHeight: number;
  fill: string;
  autoShrink: boolean;
};

export type RectNode = BaseNode & {
  kind: "rect";
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
};

export type LineNode = BaseNode & {
  kind: "line";
  stroke: string;
  strokeWidth: number;
};

export type EllipseNode = BaseNode & {
  kind: "ellipse";
  fill: string;
  stroke: string;
  strokeWidth: number;
};

export type ImageNode = BaseNode & {
  kind: "image";
  src: string;
};

export type QrNode = BaseNode & {
  kind: "qrcode";
  text: string;
  ecc: "L" | "M" | "Q" | "H";
};

export type BarcodeNode = BaseNode & {
  kind: "barcode";
  text: string;
  encoding: string;
};

export type ArUcoNode = BaseNode & {
  kind: "aruco";
  markerId: number;
  size: number;
};

export type SceneNode =
  | TextNode
  | RectNode
  | LineNode
  | EllipseNode
  | ImageNode
  | QrNode
  | BarcodeNode
  | ArUcoNode;

export type NodeKindFor<T extends SceneNode> = T["kind"];

export const NODE_DEFAULTS = {
  rotation: 0,
  locked: false,
  visible: true,
} as const;

let idCounter = 1;
export const nextId = (prefix = "n") => `${prefix}_${idCounter++}_${Date.now().toString(36)}`;

export const kindLabel: Record<NodeKind, string> = {
  text: "Text",
  rect: "Rectangle",
  line: "Line",
  ellipse: "Ellipse",
  image: "Image",
  qrcode: "QR code",
  barcode: "Barcode",
  aruco: "ArUco",
};
