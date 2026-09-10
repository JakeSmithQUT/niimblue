import { z } from "zod";
import type { SceneNode } from "./engine/types";
import type { LabelProps } from "./label";

export type LabelFile = {
  version: 1;
  title: string;
  label: LabelProps;
  nodes: SceneNode[];
  thumbnail?: string;
  timestamp: number;
};

export const serializeLabel = (title: string, label: LabelProps, nodes: SceneNode[]): string => {
  const data: LabelFile = {
    version: 1,
    title,
    label,
    nodes,
    timestamp: Date.now(),
  };
  return JSON.stringify(data, null, 2);
};

export const parseLabel = (raw: string): LabelFile | undefined => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1) return undefined;
    return parsed as LabelFile;
  } catch {
    return undefined;
  }
};

export const LabelFileSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  label: z.object({
    printDirection: z.enum(["left", "top"]),
    size: z.object({ width: z.number(), height: z.number() }),
    dpmm: z.number(),
  }),
  nodes: z.array(z.record(z.string(), z.unknown())),
  thumbnail: z.string().optional(),
  timestamp: z.number(),
});
