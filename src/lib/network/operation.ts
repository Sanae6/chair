import type { Color, Vec2 } from "./prims";
import type { ToolSettings } from "../controller/tool";

export type Operation =
  | { type: "wholeImage", url: string }
  | (
    { // Required fields for all operations
      settings: ToolSettings,
      position: Vec2,
    } & ({ // Required fields for specific types
      type: "eraser",
    } | {
      type: "pencil",
      previousPosition?: Vec2,
      color: Color,
    } | {
      type: "rect",
      size: Vec2,
      color: Color,
    } | {
      type: "ellipse",
      size: Vec2,
      color: Color,
    } | {
      type: "line",
      position2: Vec2,
      color: Color,
    })
  );
