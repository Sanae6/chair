import type { Vec2 } from "$lib/network/prims";

// Position: The current mouse position
// FirstPos: The mouse position when drawing started. When not drawing undefined
// PreviousPos: The mouse position before the most recent movement
// Drawing: Whether the cursor is drawing currently
// PreviouslyDrawing: Was the mouse drawing in the last event
// Panning: Whether the cursor is panning using Button3 currently
// Button1/3: Is button 1/3 held currently
// Ctrl/Alt/Shift Modifier: Whether alt/ctrl/shift is pressed
export type PointerState = { 
    position: Vec2, 
    firstPos: Vec2, 
    previousPos: Vec2, 
    drawing: boolean,
    previouslyDrawing: boolean,
    panning: boolean,
    button1: boolean,
    button3: boolean,
    ctrlModifier: boolean,
    altModifier: boolean,
    shiftModifier: boolean,
}