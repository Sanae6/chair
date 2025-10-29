import type { MouseState } from "$lib/util/mouseState";
import type { Operation } from "../network/operation";
import type { Color, Vec2 } from "../network/prims";

export type ToolSettings = {
    brushSize: number,
};

export type Tool = {
    displayName: String,
    settings: ToolSettings,
    applicableSettings: Set<keyof ToolSettings>
    applicationType: "single_click" | "click_drag" | "click_release" | "pan",
    generateOperation?(mouseState: MouseState, color: Color): Operation,
    drawPreview?(context: OffscreenCanvasRenderingContext2D, mouseState: MouseState, color: Color): void,
};

export const defaultToolSettings: ToolSettings = {
    brushSize: 1
}

export const tools: Array<Tool>= [
    {
        displayName: "Pencil",
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["brushSize"]),
        applicationType: "click_drag",
        generateOperation(mouseState: MouseState, color: Color) {
            let settings = this.settings
            return {settings, position: mouseState.position, color, type: "pencil"}
        },
        drawPreview(context: OffscreenCanvasRenderingContext2D, mouseState: MouseState, color: Color) {
            context.fillStyle = color;
            context.fillRect(mouseState.position.x, mouseState.position.y, 1, 1);
        }
    },
    {
        displayName: "Eraser",
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["brushSize"]),
        applicationType: "click_drag",
        generateOperation(mouseState: MouseState, color: Color) {
            let settings = this.settings
            return {settings, position: mouseState.position, type: "eraser"}
        }
    },
    {
        displayName: "Rect",
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
                context.fillRect(topLeftCorner.x, topLeftCorner.y, bottomRightCorner.x-topLeftCorner.x, bottomRightCorner.y-topLeftCorner.y);
            } else {
                context.fillRect(mouseState.position.x, mouseState.position.y, 1, 1);
            }
        }

    },
    {
        displayName: "Pan",
        settings: {... defaultToolSettings},
        applicableSettings: new Set(),
        applicationType: "pan",
    },
]
