import { drawEmptyEllipse, drawEmptyRect, drawLine, drawPoint } from "$lib/util/canvasDrawHelpers";
import type { PointerState } from "$lib/util/pointerState";
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
    isFilled: boolean,
};

export type Tool = {
    displayName: String,
    imgLink: string,
    settings: ToolSettings,
    applicableSettings: Set<keyof ToolSettings>
    applicationType: "single_click" | "click_drag" | "click_release" | "pan",
    generateOperation?(pointerState: PointerState, color: Color): Operation,
    drawPreview?(context: OffscreenCanvasRenderingContext2D, pointerState: PointerState, color: Color): void,
};

export const defaultToolSettings: ToolSettings = {
    brushSize: 1,
    brushShape: "Square",
    isFilled: true,
}

// Helper function for shape tools below
function pointsToRect(p1: Vec2, p2: Vec2, forceDiagonalSymmetry: boolean, useP1AsCenter: boolean): {pos: Vec2, size: Vec2} {
    if (forceDiagonalSymmetry) {
        const width = Math.min(Math.abs(p1.x-p2.x), Math.abs(p1.y-p2.y));
        p2 = {x: p1.x + width*Math.sign(p2.x-p1.x), y: p1.y + width*Math.sign(p2.y-p1.y)};
    }
    if (useP1AsCenter) {
        p1 = {x: p1.x-(p2.x-p1.x), y: p1.y-(p2.y-p1.y) };
    }
    
    const topLeftCorner = {x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y)};
    const bottomRightCorner = {x: Math.max(p1.x, p2.x), y: Math.max(p1.y, p2.y)};

    return {
        pos: topLeftCorner,
        size: {x: bottomRightCorner.x - topLeftCorner.x+1, y: bottomRightCorner.y - topLeftCorner.y+1},
    };
}

export const tools: Array<Tool>= [
    {
        displayName: "Pencil",
        imgLink: brush,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["brushSize", "brushShape"]),
        applicationType: "click_drag",
        generateOperation(pointerState: PointerState, color: Color) {
            let settings = this.settings;
            if (pointerState.previouslyDrawing) {
                return {settings, position: pointerState.position, previousPosition: pointerState.previousPos, color, type: "pencil"};
            } else {
                return {settings, position: pointerState.position, color, type: "pencil"};
            }
        },
        drawPreview(context: OffscreenCanvasRenderingContext2D, pointerState: PointerState, color: Color) {
            drawPoint(context, pointerState.position, this.settings.brushSize, this.settings.brushShape, color);
        }
    },
    {
        displayName: "Eraser",
        imgLink: eraser,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["brushSize", "brushShape"]),
        applicationType: "click_drag",
        generateOperation(pointerState: PointerState, color: Color) {
            let settings = this.settings;
            if (pointerState.previouslyDrawing) {
                return {settings, position: pointerState.position, previousPosition: pointerState.previousPos, color: {r: 0, g: 0, b:0, a: 0}, type: "pencil"};
            } else {
                return {settings, position: pointerState.position, color: {r: 0, g: 0, b:0, a: 0}, type: "pencil"};
            }
        },
        drawPreview(context: OffscreenCanvasRenderingContext2D, pointerState: PointerState, color: Color) {
            drawPoint(context, pointerState.position, this.settings.brushSize, this.settings.brushShape, {r: 72, g: 72, b: 72, a: 100});
        }
    },
    {
        displayName: "Line",
        imgLink: line,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["brushSize", "brushShape"]),
        applicationType: "click_release",
        generateOperation(pointerState: PointerState, color: Color) {
            let settings = this.settings;
            return {settings, position: pointerState.firstPos, position2: pointerState.position, color: color, type: "line"};
        },
        drawPreview(context: OffscreenCanvasRenderingContext2D, pointerState: PointerState, color: Color) {
            if (pointerState.drawing) {
                drawLine(context, pointerState.firstPos, pointerState.position, this.settings.brushSize, this.settings.brushShape, color);
            } else {
                drawPoint(context, pointerState.position, this.settings.brushSize, this.settings.brushShape, color);
            }
        }
    },
    {
        displayName: "Rect",
        imgLink:rectangle,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["isFilled"]),
        applicationType: "click_release",
        generateOperation(pointerState: PointerState, color: Color) {
            const rect = pointsToRect(pointerState.firstPos, pointerState.position, pointerState.shiftModifier, pointerState.ctrlModifier);
            let settings = this.settings;
            return {settings, position: rect.pos, size: rect.size, color: color, type: "rect"};
        },
        drawPreview(context: OffscreenCanvasRenderingContext2D, pointerState: PointerState, color: Color) {
            if (pointerState.drawing) {
                const rect = pointsToRect(pointerState.firstPos, pointerState.position, pointerState.shiftModifier, pointerState.ctrlModifier);
                drawEmptyRect(context, rect.pos, rect.size, color);
            } else {
                drawPoint(context, pointerState.position, 1, "Square", color);
            }
        }
    },
    {
        displayName: "Ellipse",
        imgLink: circle,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["isFilled"]),
        applicationType: "click_release",
        generateOperation(pointerState: PointerState, color: Color) {
            const rect = pointsToRect(pointerState.firstPos, pointerState.position, pointerState.shiftModifier, pointerState.ctrlModifier);
            let settings = this.settings;
            return {settings, position: rect.pos, size: rect.size, color: color, type: "ellipse"};
        },
        drawPreview(context: OffscreenCanvasRenderingContext2D, pointerState: PointerState, color: Color) {
            if (pointerState.drawing) {
                const rect = pointsToRect(pointerState.firstPos, pointerState.position, pointerState.shiftModifier, pointerState.ctrlModifier);
                drawEmptyEllipse(context, rect.pos, rect.size, color);
            } else {
                drawPoint(context, pointerState.position, 1, "Square", color);
            }
        }
    },
    {
        displayName: "Pan",
        imgLink: pan,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(),
        applicationType: "pan",
    },
]
