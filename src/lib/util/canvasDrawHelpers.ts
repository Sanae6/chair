import type { BrushShape } from "$lib/controller/tool";
import type { Color, Vec2 } from "$lib/network/prims";
import { type CanvasRenderingContext2D as SkiaCanvasRenderingContext2D, Image as SkiaImage } from "skia-canvas";

export function drawPoint(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, point: Vec2, brushSize: number, brushShape: BrushShape) {
    switch(brushShape) {
        case "Square": {
            const offset = Math.floor(brushSize / 2);
            context.fillRect(
                point.x - offset,
                point.y - offset,
                brushSize,
                brushSize,
            );
        } break;
        case "Circle": {
            const offset = Math.floor(brushSize / 2);
            drawFilledEllipse(context, {x: point.x - offset, y: point.y - offset}, {x: brushSize, y: brushSize});            
        } break;
    }
}

// Implements Bresenham's Line algorithm: https://en.wikipedia.org/wiki/Bresenham's_line_algorithm
export function drawLine(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, lineStart: Vec2, lineEnd: Vec2, brushSize: number, brushShape: BrushShape) {
    if (Math.abs(lineEnd.y - lineStart.y) < Math.abs(lineEnd.x - lineStart.x)) {
        if (lineStart.x > lineEnd.x) {
            drawLineLow(context, lineEnd, lineStart, brushSize, brushShape);
        } else {
            drawLineLow(context, lineStart, lineEnd, brushSize, brushShape);
        }
    } else {
        if (lineStart.y > lineEnd.y) {
            drawLineHigh(context, lineEnd, lineStart, brushSize, brushShape);
        } else {
            drawLineHigh(context, lineStart, lineEnd, brushSize, brushShape);
        }
    }
}

// Draws line with slopes between -1 and 1
function drawLineLow(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, lineStart: Vec2, lineEnd: Vec2, brushSize: number, brushShape: BrushShape) {
    let dx = lineEnd.x - lineStart.x;
    let dy = lineEnd.y - lineStart.y;
    let yi = 1;
    if (dy<0) {
        yi = -1;
        dy = -dy;
    }
    let D = 2*dy - dx;
    
    let y = lineStart.y;
    for (let x = lineStart.x; x<=lineEnd.x; x++) {
        drawPoint(context, {x: x, y: y}, brushSize, brushShape);
        if (D >= 0) {
            y = y + yi;
            D = D + 2*(dy-dx);
        } else {
            D = D + 2*dy;
        }
    }
}

// Draws line with slopes greater than 1 or less than -1
function drawLineHigh(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, lineStart: Vec2, lineEnd: Vec2, brushSize: number, brushShape: BrushShape) {
    let dx = lineEnd.x - lineStart.x;
    let dy = lineEnd.y - lineStart.y;
    let xi = 1;
    if (dx<0) {
        xi = -1;
        dx = -dx;
    }
    let D = 2*dx - dy;
    
    let x = lineStart.x;
    for (let y = lineStart.y; y<=lineEnd.y; y++) {
        drawPoint(context, {x: x, y: y}, brushSize, brushShape);
        if (D > 0) {
            x = x + xi;
            D = D + 2*(dx-dy);
        } else {
            D = D + 2*dx;
        }
    }
}

// Adapted from https://zingl.github.io/bresenham.html, https://zingl.github.io/bresenham.js
export function drawEmptyEllipse(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, start: Vec2, size: Vec2) {
    let x0 = start.x;
    let y0 = start.y;
    let x1 = start.x+size.x-1;
    let y1 = start.y+size.y-1;

    // Diameters
    let a = Math.abs(x1-x0);
    let b = Math.abs(y1-y0);
    let b1 = b&1;
    // Error increment
    var dx = 4*(1.0-a)*b*b, dy = 4*(b1+1)*a*a;
    // Error of 1.step
    var err = dx+dy+b1*a*a, e2;

    // Swapping when reversed
    if (x0 > x1) {
        x0 = x1;
        x1 += a;
    }
    if (y0 > y1) y0 = y1;

    y0 += (b+1)>>1;
    y1 = y0-b1;
    a = 8*a*a;
    b1 = 8*b*b;
    
    // The actual drawing
    do {                                                 
        context.fillRect(x1, y0, 1, 1);
        context.fillRect(x0, y0, 1, 1);
        context.fillRect(x0, y1, 1, 1);
        context.fillRect(x1, y1, 1, 1);
        e2 = 2*err;
        if (e2 <= dy) { // Y Step
            y0++; y1--;
            dy += a;
            err += dy;
        }
        if (e2 >= dx || 2*err > dy) { // X Step
            x0++;
            x1--;
            dx += b1;
            err += dx;
        }
    } while (x0 <= x1);

    // The above stops too early when a<=1, this finishes the tip of those ellipses
    while (y0-y1 <= b) {
        context.fillRect(x0-1, y0, 1, 1);
        context.fillRect(x1+1, y0++, 1, 1);
        context.fillRect(x0-1, y1, 1, 1);
        context.fillRect(x1+1, y1--, 1, 1);
    }
}

// Also adapted from https://zingl.github.io/bresenham.html, https://zingl.github.io/bresenham.js
export function drawFilledEllipse(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, start: Vec2, size: Vec2) {
    let x0 = start.x;
    let y0 = start.y;
    let x1 = start.x+size.x-1;
    let y1 = start.y+size.y-1;

    // Diameters
    let a = Math.abs(x1-x0);
    let b = Math.abs(y1-y0);
    let b1 = b&1;
    // Error increment
    var dx = 4*(1.0-a)*b*b, dy = 4*(b1+1)*a*a;
    // Error of 1.step
    var err = dx+dy+b1*a*a, e2;

    // Swapping when reversed
    if (x0 > x1) {
        x0 = x1;
        x1 += a;
    }
    if (y0 > y1) y0 = y1;

    y0 += (b+1)>>1;
    y1 = y0-b1;
    a = 8*a*a;
    b1 = 8*b*b;
    
    // The actual drawing
    do {                                                 
        //context.fillRect(x1, y0, 1, 1);
        context.fillRect(x0, y0, x1-x0+1, 1);
        context.fillRect(x0, y1, x1-x0+1, 1);
        //context.fillRect(x1, y1, 1, 1);
        e2 = 2*err;
        if (e2 <= dy) { // Y Step
            y0++; y1--;
            dy += a;
            err += dy;
        }
        if (e2 >= dx || 2*err > dy) { // X Step
            x0++;
            x1--;
            dx += b1;
            err += dx;
        }
    } while (x0 <= x1);

    // The above stops too early when a<=1, this finishes the tip of those ellipses
    while (y0-y1 <= b) {
        context.fillRect(x0-1, y0++, x1-x0+3, 1);
        context.fillRect(x0-1, y1--, x1-x0+3, 1);
    }
}

export function drawEmptyRect(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, start: Vec2, size: Vec2) {
    context.fillRect(start.x, start.y, size.x, 1);
    context.fillRect(start.x, start.y+size.y-1, size.x, 1);
    context.fillRect(start.x, start.y, 1, size.y);
    context.fillRect(start.x+size.x-1, start.y, 1, size.y);
}

export function drawFilledRect(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, start: Vec2, size: Vec2) {
    context.fillRect(start.x, start.y, size.x, size.y);
}