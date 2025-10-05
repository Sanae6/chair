import type { Color, Vec2 } from "./prims";

export type Operation = Pencil;

export type Pencil = {
  type: "pencil",
  position: Vec2,
  diameter: number,
  color: Color,
};
