import { drawPoint } from "$lib/util/canvasDrawHelpers";
import type { MouseState } from "$lib/util/mouseState";
import type { Operation } from "../network/operation";
import type { Color, Vec2 } from "../network/prims";

import brush from "$lib/assets/brush.png";
import circle from "$lib/assets/circ.png";
import droper from "$lib/assets/droper.png";
import eraser from "$lib/assets/eraser.png";
import line from "$lib/assets/line.png";
import pan from "$lib/assets/pan.png";
import rectangle from "$lib/assets/rect.png";

export type BrushShape = "Square" | "Circle";

export type ToolSettings = {
    brushSize: number,
    brushShape: BrushShape,
};

export type Tool = {
    displayName: String,
    imgLink: string,
    settings: ToolSettings,
    applicableSettings: Set<keyof ToolSettings>
    applicationType: "single_click" | "click_drag" | "click_release" | "pan",
    generateOperation?(mouseState: MouseState, color: Color): Operation,
    drawPreview?(context: OffscreenCanvasRenderingContext2D, mouseState: MouseState, color: Color): void,
};

export const defaultToolSettings: ToolSettings = {
    brushSize: 1,
    brushShape: "Square",
}

export const tools: Array<Tool>= [
    {
        displayName: "Pencil",
        imgLink: brush,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["brushSize", "brushShape"]),
        applicationType: "click_drag",
        generateOperation(mouseState: MouseState, color: Color) {
            let settings = this.settings;
            if (mouseState.previouslyDrawing) {
                return {settings, position: mouseState.position, previousPosition: mouseState.previousPos, color, type: "pencil"};
            } else {
                return {settings, position: mouseState.position, color, type: "pencil"};
            }
        },
        drawPreview(context: OffscreenCanvasRenderingContext2D, mouseState: MouseState, color: Color) {
            context.fillStyle = color;
            drawPoint(context, mouseState.position, this.settings.brushSize, this.settings.brushShape);
        }
    },
    {
        displayName: "Eraser",
        imgLink: eraser,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["brushSize", "brushShape"]),
        applicationType: "click_drag",
        generateOperation(mouseState: MouseState, color: Color) {
            let settings = this.settings
            return {settings, position: mouseState.position, type: "eraser"}
        }
    },
    // {
    //     displayName: "Line",
    //     imgLink: line,
    //     settings: {... defaultToolSettings},
    //     applicableSettings: new Set(["brushSize", "brushShape"]),
    //     applicationType: "click_release",
    //     generateOperation(mouseState: MouseState, color: Color) {
    //         let settings = this.settings
    //         return {settings, position: mouseState.firstPos, position2: mouseState.position, color: color, type: "rect"}
    //     },
    //     drawPreview(context: OffscreenCanvasRenderingContext2D, mouseState: MouseState, color: Color) {
    //         context.fillStyle = color;
    //         if (mouseState.drawing) {
    //             drawLine(context, mouseState.firstPos, mouseState.position, this.settings.brushSize, this.settings.brushShape);
    //         } else {
    //             context.fillRect(mouseState.position.x, mouseState.position.y, 1, 1);
    //         }
    //     }

    // },
    {
        displayName: "Rect",
        imgLink:rectangle,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(),
        applicationType: "click_release",
        generateOperation(mouseState: MouseState, color: Color) {
            let settings = this.settings
            return {settings, position: mouseState.firstPos, position2: mouseState.position, color: color, type: "rect"}
        },
        drawPreview(context: OffscreenCanvasRenderingContext2D, mouseState: MouseState, color: Color) {
            context.fillStyle = color;
            if (mouseState.drawing) {
                const topLeftCorner = {x: Math.min(mouseState.firstPos.x, mouseState.position.x), y: Math.min(mouseState.firstPos.y, mouseState.position.y)}
                const bottomRightCorner = {x: Math.max(mouseState.firstPos.x, mouseState.position.x), y: Math.max(mouseState.firstPos.y, mouseState.position.y)}
                //drawEmptyRect(context, topLeftCorner, {x: bottomRightCorner.x - topLeftCorner.x+1, y: bottomRightCorner.y - topLeftCorner.y+1});
            } else {
                context.fillRect(mouseState.position.x, mouseState.position.y, 1, 1);
            }
        }

    },
    // {
    //     displayName: "Ellipse",
    //     imgLink: circle,
    //     settings: {... defaultToolSettings},
    //     applicableSettings: new Set(),
    //     applicationType: "click_release",
    //     generateOperation(mouseState: MouseState, color: Color) {
    //         let settings = this.settings
    //         return {settings, position: mouseState.firstPos, position2: mouseState.position, color: color, type: "rect"}
    //     },
    //     drawPreview(context: OffscreenCanvasRenderingContext2D, mouseState: MouseState, color: Color) {
    //         context.fillStyle = color;
    //         if (mouseState.drawing) {
    //             const topLeftCorner = {x: Math.min(mouseState.firstPos.x, mouseState.position.x), y: Math.min(mouseState.firstPos.y, mouseState.position.y)}
    //             const bottomRightCorner = {x: Math.max(mouseState.firstPos.x, mouseState.position.x), y: Math.max(mouseState.firstPos.y, mouseState.position.y)}
    //             drawEmptyEllipse(context, topLeftCorner, {x: bottomRightCorner.x - topLeftCorner.x+1, y: bottomRightCorner.y - topLeftCorner.y+1});
    //         } else {
    //             context.fillRect(mouseState.position.x, mouseState.position.y, 1, 1);
    //         }
    //     }

    // },
    {
        displayName: "Pan",
        imgLink: pan,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(),
        applicationType: "pan",
    },
]
