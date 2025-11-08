import { drawEmptyEllipse, drawEmptyRect, drawLine, drawPoint } from "$lib/util/canvasDrawHelpers";
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
    isFilled: boolean,
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
    {
        displayName: "Line",
        imgLink: line,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["brushSize", "brushShape"]),
        applicationType: "click_release",
        generateOperation(mouseState: MouseState, color: Color) {
            let settings = this.settings;
            return {settings, position: mouseState.firstPos, position2: mouseState.position, color: color, type: "line"};
        },
        drawPreview(context: OffscreenCanvasRenderingContext2D, mouseState: MouseState, color: Color) {
            context.fillStyle = color;
            if (mouseState.drawing) {
                drawLine(context, mouseState.firstPos, mouseState.position, this.settings.brushSize, this.settings.brushShape);
            } else {
                drawPoint(context, mouseState.position, this.settings.brushSize, this.settings.brushShape);
            }
        }
    },
    {
        displayName: "Rect",
        imgLink:rectangle,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["isFilled"]),
        applicationType: "click_release",
        generateOperation(mouseState: MouseState, color: Color) {
            const rect = pointsToRect(mouseState.firstPos, mouseState.position, mouseState.shiftModifier, mouseState.ctrlModifier);
            let settings = this.settings;
            return {settings, position: rect.pos, size: rect.size, color: color, type: "rect"};
        },
        drawPreview(context: OffscreenCanvasRenderingContext2D, mouseState: MouseState, color: Color) {
            context.fillStyle = color;
            if (mouseState.drawing) {
                const rect = pointsToRect(mouseState.firstPos, mouseState.position, mouseState.shiftModifier, mouseState.ctrlModifier);
                drawEmptyRect(context, rect.pos, rect.size);
            } else {
                drawPoint(context, mouseState.position, 1, "Square");
            }
        }
    },
    {
        displayName: "Ellipse",
        imgLink: circle,
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["isFilled"]),
        applicationType: "click_release",
        generateOperation(mouseState: MouseState, color: Color) {
            const rect = pointsToRect(mouseState.firstPos, mouseState.position, mouseState.shiftModifier, mouseState.ctrlModifier);
            let settings = this.settings;
            return {settings, position: rect.pos, size: rect.size, color: color, type: "ellipse"};
        },
        drawPreview(context: OffscreenCanvasRenderingContext2D, mouseState: MouseState, color: Color) {
            context.fillStyle = color;
            if (mouseState.drawing) {
                const rect = pointsToRect(mouseState.firstPos, mouseState.position, mouseState.shiftModifier, mouseState.ctrlModifier);
                drawEmptyEllipse(context, rect.pos, rect.size);
            } else {
                drawPoint(context, mouseState.position, 1, "Square");
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
