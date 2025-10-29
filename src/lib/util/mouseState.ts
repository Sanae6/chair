import type { Vec2 } from "$lib/network/prims";

// Position: The current mouse position
// FirstPos: The mouse position when drawing started. When not drawing undefined
// PreviousPos: The mouse position before the most recent movement
// Drawing: Whether the cursor is drawing currently
export type MouseState = { 
    position: Vec2, 
    firstPos: Vec2, 
    previousPos: Vec2, 
    drawing: boolean
}