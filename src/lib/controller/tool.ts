import type { Operation } from "../network/operation";
import type { Color, Vec2 } from "../network/prims";

export type ToolSettings = {
    brushSize: number,
};

export type Tool = {
    displayName: String,
    settings: ToolSettings,
    applicableSettings: Set<keyof ToolSettings>
    applicationType: "single_click" | "click_drag" | "click_release",
    generateOperation?(startPosition: Vec2, endPosition: Vec2, color: Color): Operation,
    clientOperation?(): void,
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
        generateOperation(startPosition: Vec2, endPosition: Vec2, color: Color) {
            let settings = this.settings
            return {settings, position: endPosition, color, type: "pencil"}
        }
    },
    {
        displayName: "Eraser",
        settings: {... defaultToolSettings},
        applicableSettings: new Set(["brushSize"]),
        applicationType: "click_drag",
        generateOperation(startPosition: Vec2, endPosition: Vec2, color: Color) {
            let settings = this.settings
            return {settings, position: endPosition, type: "eraser"}
        }
    },
    {
        displayName: "Rect",
        settings: {... defaultToolSettings},
        applicableSettings: new Set(),
        applicationType: "click_release",
        generateOperation(startPosition: Vec2, endPosition: Vec2, color: Color) {
            let settings = this.settings
            return {settings, position: startPosition, position2: endPosition, color: color, type: "rect"}
        }
    },
    {
        displayName: "ClientTest",
        settings: {... defaultToolSettings},
        applicableSettings: new Set(),
        applicationType: "single_click",
        clientOperation: () => {
            console.log("this runs on the client?????? wow!")
        }
    }
]
