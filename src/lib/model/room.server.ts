import type { Vec2 } from "$lib/useful/prims";
import { Canvas } from "skia-canvas";
import { Surface } from "./surface";

export class Room {
  canvas: Canvas;
  surface: Surface;

  constructor(private id: string, size: Vec2) {
    this.canvas = new Canvas(size.x, size.y);
    this.surface = new Surface(size, this.canvas.getContext());
  }

  getDataUrl() {
    return this.canvas.toDataURL("png", 100);
  }
}
