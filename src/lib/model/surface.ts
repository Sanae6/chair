import type { Operation } from "$lib/useful/operation";
import type { Vec2 } from "$lib/useful/prims";
import { type CanvasRenderingContext2D as SkiaCanvasRenderingContext2D, Image as SkiaImage } from "skia-canvas";

const IS_BROWSER = "window" in globalThis;
export class Surface {
  constructor(public size: Vec2, private context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D) {
    this.clear();
  }

  clear() {
    this.context.fillStyle = "#FFFFFF";
    this.context.fillRect(0, 0, this.size.x, this.size.y);
    console.debug("cleared canvas");
  }

  handleSync(imageDataUrl: string) {
    const image = new (IS_BROWSER ? Image : SkiaImage)();
    image.src = imageDataUrl;
    image.onload = () => {
      // @ts-ignore
      this.context.drawImage(image, 0, 0);
    };
  }

  handleOperation(operation: Operation) {
    console.log("performing", operation.type);
    switch (operation.type) {
      case "pencil":
        this.context.fillStyle = operation.color;
        const offset = Math.floor(operation.diameter / 2);
        this.context.fillRect(
          operation.position.x - offset,
          operation.position.y - offset,
          operation.diameter,
          operation.diameter,
        );
        break;
    }
  }
}
