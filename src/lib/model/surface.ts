import type { Operation } from "$lib/network/operation";
import type { Vec2 } from "$lib/network/prims";
import { type CanvasRenderingContext2D as SkiaCanvasRenderingContext2D, Image as SkiaImage } from "skia-canvas";

const IS_BROWSER = "window" in globalThis;
export class Surface {
  #drawSubscriptions: Array<() => void> = []

  constructor(public size: Vec2, private context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
    this.clear();
  }

  clear() {
    this.context.fillStyle = "#FFFFFF";
    this.context.fillRect(0, 0, this.size.x, this.size.y);
    this.notifyDraw();
    console.debug("cleared canvas");
  }

  handleSync(imageDataUrl: string) {
    const image = new (IS_BROWSER ? Image : SkiaImage)();
    image.src = imageDataUrl;
    image.onload = () => {
      // @ts-ignore
      this.context.drawImage(image, 0, 0);
      this.notifyDraw();
    };
  }

  handleOperation(operation: Operation) {
    console.log("performing", operation.type);
    switch (operation.type) {
      case "pencil": {
        this.context.fillStyle = operation.color;
        const offset = Math.floor(operation.settings.brushSize / 2);
        this.context.fillRect(
          operation.position.x - offset,
          operation.position.y - offset,
          operation.settings.brushSize,
          operation.settings.brushSize,
        );
      }  break;
      case "eraser": {
        const offset = Math.floor(operation.settings.brushSize / 2);
        this.context.clearRect(
          operation.position.x - offset,
          operation.position.y - offset,
          operation.settings.brushSize,
          operation.settings.brushSize,
        );
      }  break;
      case "rect": {
        this.context.fillStyle = operation.color;
        this.context.fillRect(
          operation.position.x,
          operation.position.y,
          operation.position2.x-operation.position.x,
          operation.position2.y-operation.position.y,
        );
      }  break;
    }
    this.notifyDraw();
  }

  subscribeDraw(run: () => void) {
    this.#drawSubscriptions.push(run);
  }

  notifyDraw() {
    for (const drawCallback of this.#drawSubscriptions) {
      drawCallback();
    }
  }
}
