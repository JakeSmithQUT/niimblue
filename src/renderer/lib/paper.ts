import type { PrintDirection } from "./label";
import { LabelType, type PrinterModelMeta } from "@mmote/niimbluelib";

export type PaperFamily =
  | "d-series"
  | "b1-b21"
  | "b31-b4"
  | "n1";

export type PaperTemplate = {
  title: string;
  family: PaperFamily;
  widthMm: number;
  heightMm?: number;
  dpmm: number;
  printDirection: PrintDirection;
  labelType: LabelType;
  continuous?: boolean;
  shape?: "rect" | "rounded" | "circle";
};

export const PAPER_TEMPLATES: PaperTemplate[] = [
  {
    title: "D 12x40mm",
    family: "d-series",
    widthMm: 12,
    heightMm: 40,
    dpmm: 8,
    printDirection: "left",
    labelType: LabelType.WithGaps,
  },
  {
    title: "D 15x50mm",
    family: "d-series",
    widthMm: 15,
    heightMm: 50,
    dpmm: 8,
    printDirection: "left",
    labelType: LabelType.WithGaps,
  },
  {
    title: "D 12x75mm",
    family: "d-series",
    widthMm: 12,
    heightMm: 75,
    dpmm: 8,
    printDirection: "left",
    labelType: LabelType.WithGaps,
  },
  {
    title: "D 12x40mm round",
    family: "d-series",
    widthMm: 12,
    heightMm: 40,
    dpmm: 8,
    printDirection: "left",
    shape: "rounded",
    labelType: LabelType.WithGaps,
  },
  {
    title: "D continuous 15mm",
    family: "d-series",
    widthMm: 15,
    dpmm: 8,
    printDirection: "left",
    continuous: true,
    labelType: LabelType.Continuous,
  },
  {
    title: "B 40x20mm",
    family: "b1-b21",
    widthMm: 40,
    heightMm: 20,
    dpmm: 8,
    printDirection: "top",
    labelType: LabelType.WithGaps,
  },
  {
    title: "B 40x30mm",
    family: "b1-b21",
    widthMm: 40,
    heightMm: 30,
    dpmm: 8,
    printDirection: "top",
    labelType: LabelType.WithGaps,
  },
  {
    title: "B 50x30mm",
    family: "b1-b21",
    widthMm: 50,
    heightMm: 30,
    dpmm: 8,
    printDirection: "top",
    labelType: LabelType.WithGaps,
  },
  {
    title: "B 40x60mm",
    family: "b1-b21",
    widthMm: 40,
    heightMm: 60,
    dpmm: 8,
    printDirection: "top",
    labelType: LabelType.WithGaps,
  },
  {
    title: "B 50x80mm",
    family: "b1-b21",
    widthMm: 50,
    heightMm: 80,
    dpmm: 8,
    printDirection: "top",
    labelType: LabelType.WithGaps,
  },
  {
    title: "B 40x30mm 300dpi",
    family: "b1-b21",
    widthMm: 40,
    heightMm: 30,
    dpmm: 11.81,
    printDirection: "top",
    labelType: LabelType.WithGaps,
  },
  {
    title: "B continuous 40mm",
    family: "b1-b21",
    widthMm: 40,
    dpmm: 8,
    printDirection: "top",
    continuous: true,
    labelType: LabelType.Continuous,
  },
  {
    title: "B continuous 50mm",
    family: "b1-b21",
    widthMm: 50,
    dpmm: 8,
    printDirection: "top",
    continuous: true,
    labelType: LabelType.Continuous,
  },
  {
    title: "B31 70x100mm",
    family: "b31-b4",
    widthMm: 70,
    heightMm: 100,
    dpmm: 8,
    printDirection: "top",
    labelType: LabelType.WithGaps,
  },
  {
    title: "B31 continuous 70mm",
    family: "b31-b4",
    widthMm: 70,
    dpmm: 8,
    printDirection: "top",
    continuous: true,
    labelType: LabelType.Continuous,
  },
  {
    title: "N1 PET 50x80mm",
    family: "n1",
    widthMm: 50,
    heightMm: 80,
    dpmm: 8,
    printDirection: "top",
    labelType: LabelType.Transparent,
  },
  {
    title: "N1 PET continuous 50mm",
    family: "n1",
    widthMm: 50,
    dpmm: 8,
    printDirection: "top",
    continuous: true,
    labelType: LabelType.Transparent,
  },
];

export const PAPER_FAMILIES: { id: PaperFamily; label: string }[] = [
  { id: "d-series", label: "D11 / D110 / D101 / H1S" },
  { id: "b1-b21", label: "B1 / B21 / B3S" },
  { id: "b31-b4", label: "B31 / B4" },
  { id: "n1", label: "N1" },
];

export const paperFitsPrinter = (template: PaperTemplate, meta: PrinterModelMeta): boolean => {
  if (template.printDirection !== meta.printDirection) return false;
  if (!meta.paperTypes.includes(template.labelType)) return false;
  const widthPx = Math.round(template.widthMm * template.dpmm);
  if (widthPx > meta.printheadPixels) return false;
  return true;
};

export const filterTemplatesForPrinter = (
  templates: PaperTemplate[],
  meta: PrinterModelMeta | undefined,
): PaperTemplate[] => {
  if (!meta) return templates;
  return templates.filter((t) => paperFitsPrinter(t, meta));
};
