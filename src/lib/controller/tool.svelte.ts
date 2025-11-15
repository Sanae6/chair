import { drawEmptyEllipse, drawEmptyRect, drawLine, drawPoint } from "$lib/util/canvasDrawHelpers";
import type { PointerState } from "$lib/util/pointerState";
import type { Operation } from "../network/operation";
import type { Color, Vec2 } from "../network/prims";

import brush from "$lib/assets/brush.png";
import circle from "$lib/assets/circ.png";
import dropper from "$lib/assets/dropper.png";
import eraser from "$lib/assets/eraser.png";
import line from "$lib/assets/line.png";
import pan from "$lib/assets/pan.png";
import rectangle from "$lib/assets/rect.png";
import fill from "$lib/assets/fill.png";

export type BrushShape = "Square" | "Circle";

export type ToolSettings = {
    brushSize: number,
    brushShape: BrushShape,
    isFilled: boolean,
};

type ToolType = "pencil" | "eraser" | "line" | "rect" | "ellipse" | "fill" | "eyedropper" | "pan";

export abstract class Tool {
    public settings: ToolSettings

    constructor(
        public displayName: String,
        public imgLink: string,
        settings: ToolSettings,
        public applicableSettings: Set<keyof ToolSettings>,
        public applicationType: "single_click" | "click_drag" | "click_release" | "pan" | "eyedropper"
    ) {
        this.settings = $state(settings);
    }

    generateOperation?(pointerState: PointerState, color: Color): Operation
    drawPreview?(context: OffscreenCanvasRenderingContext2D, pointerState: PointerState, color: Color): void
};

const defaultToolSettings: ToolSettings = {
    brushSize: 1,
    brushShape: "Square",
    isFilled: true,
}

class BrushTool extends Tool {
    constructor(displayName: String, imgLink: string, private erase: boolean) {
        super(
            displayName,
            imgLink,
            {... defaultToolSettings},
            new Set(["brushSize", "brushShape"]),
            "click_drag");
    }

    generateOperation(pointerState: PointerState, color: Color): Operation {
        let settings = this.settings;
        if (this.erase) color = {r: 0, g: 0, b:0, a: 0};
        if (pointerState.previouslyDrawing) {
            return {settings, position: pointerState.position, previousPosition: pointerState.previousPos, color, type: "pencil"};
        } else {
            return {settings, position: pointerState.position, color, type: "pencil"};
        }
    }

    drawPreview(context: OffscreenCanvasRenderingContext2D, pointerState: PointerState, color: Color): void {
        if (this.erase) color = {r: 72, g: 72, b: 72, a: 100};
        drawPoint(context, pointerState.position, this.settings.brushSize, this.settings.brushShape, color);
    }
}

class LineTool extends Tool {
    constructor() {
        super(
            "Line",
            line,
            {... defaultToolSettings},
            new Set(["brushSize", "brushShape"]),
            "click_release");
    }

    private calculateLineStart(p1: Vec2, p2: Vec2, useP1AsCenter: boolean): Vec2 {
        if (useP1AsCenter) {
            return {x: p1.x-(p2.x-p1.x), y: p1.y-(p2.y-p1.y)};
        } else {
            return p1;
        }
        
    }

    generateOperation(pointerState: PointerState, color: Color): Operation {
        let settings = this.settings;
        let lineStart = this.calculateLineStart(pointerState.firstPos, pointerState.position, pointerState.ctrlModifier);
        return {settings, position: lineStart, position2: pointerState.position, color: color, type: "line"};
    }

    drawPreview(context: OffscreenCanvasRenderingContext2D, pointerState: PointerState, color: Color): void {
        if (pointerState.drawing) {
            let lineStart = this.calculateLineStart(pointerState.firstPos, pointerState.position, pointerState.ctrlModifier);
            drawLine(context, lineStart, pointerState.position, this.settings.brushSize, this.settings.brushShape, color);
        } else {
            drawPoint(context, pointerState.position, this.settings.brushSize, this.settings.brushShape, color);
        }
    }
}

class ShapeTool extends Tool {
    constructor(private shape: "rect" | "ellipse") {
        super(
            shape == "rect" ? "Rect" : "Ellipse",
            shape == "rect" ? rectangle : circle,
            {... defaultToolSettings},
            new Set(["isFilled"]),
            "click_release");
    }

    private pointsToRect(p1: Vec2, p2: Vec2, forceDiagonalSymmetry: boolean, useP1AsCenter: boolean): {pos: Vec2, size: Vec2} {
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

    generateOperation(pointerState: PointerState, color: Color): Operation {
        const rect = this.pointsToRect(pointerState.firstPos, pointerState.position, pointerState.shiftModifier, pointerState.ctrlModifier);
        let settings = this.settings;
        return {settings, position: rect.pos, size: rect.size, color: color, type: this.shape};
    }

    drawPreview(context: OffscreenCanvasRenderingContext2D, pointerState: PointerState, color: Color): void {
        if (pointerState.drawing) {
            const rect = this.pointsToRect(pointerState.firstPos, pointerState.position, pointerState.shiftModifier, pointerState.ctrlModifier);
            if (this.shape == "rect") {
                drawEmptyRect(context, rect.pos, rect.size, color);
            } else {
                drawEmptyEllipse(context, rect.pos, rect.size, color);
            }
        } else {
            drawPoint(context, pointerState.position, 1, "Square", color);
        }
    }
}

class FillTool extends Tool {
    constructor() {
        super(
            "Fill",
            fill,
            {... defaultToolSettings},
            new Set(),
            "single_click");
    }

    generateOperation(pointerState: PointerState, color: Color): Operation {
        let settings = this.settings;
        return {settings, position: pointerState.position, color: color, type: "fill"};
    }

    drawPreview(context: OffscreenCanvasRenderingContext2D, pointerState: PointerState, color: Color): void {
        if (!pointerState.drawing) drawPoint(context, pointerState.position, 1, "Square", color);
    }
}

class EyedropperTool extends Tool {
    constructor() {
        super(
            "Eyedropper",
            dropper,
            {... defaultToolSettings},
            new Set(),
            "eyedropper");
    }
}

class PanTool extends Tool {
    constructor() {
        super(
            "Pan",
            pan,
            {... defaultToolSettings},
            new Set(),
            "pan");
    }
}

export function createTool(toolType: ToolType): Tool {
    switch (toolType) {
        case "pencil":
            return new BrushTool("Pencil", brush, false);
        case "eraser":
            return new BrushTool("Eraser", eraser , true);
        case "line":
            return new LineTool();
        case "rect":
            return new ShapeTool("rect");
        case "ellipse":
            return new ShapeTool("ellipse");
        case "fill":
            return new FillTool();
        case "eyedropper":
            return new EyedropperTool();
        case "pan":
            return new PanTool();
    }
}

export const tools: Tool[] = [
    createTool("pencil"),
    createTool("eraser"),
    createTool("line"),
    createTool("rect"),
    createTool("ellipse"),
    createTool("fill"),
    createTool("eyedropper"),
    createTool("pan"),
]