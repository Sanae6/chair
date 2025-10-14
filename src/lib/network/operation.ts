import type { Color, Vec2 } from "./prims";
import type { ToolSettings } from "../controller/tool";

export type Operation = { // Required fields for all operations
  settings: ToolSettings,
  position: Vec2,
} & ({ // Required fields for specific types
  type: "eraser",
} | {
  type: "pencil",
  color: Color,
} | {
  type: "rect",
  position2: Vec2,
  color: Color,
});
