import type { Color, Vec2 } from "./prims";
import type { ToolSettings } from "../controller/tool";

export type Operation = {
  type: "wholeImage", 
  url: string
} | {
  type: "pencil",
  settings: ToolSettings,
  position: Vec2,
  previousPosition?: Vec2,
  color: Color,
} | {
  type: "rect" | "ellipse",
  settings: ToolSettings,
  position: Vec2,
  size: Vec2,
  color: Color,
} | {
  type: "line",
  settings: ToolSettings,
  position: Vec2,
  position2: Vec2,
  color: Color,
}