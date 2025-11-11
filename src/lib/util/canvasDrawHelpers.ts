import type { BrushShape } from "$lib/controller/tool";
import type { Color, Vec2 } from "$lib/network/prims";
import { type CanvasRenderingContext2D as SkiaCanvasRenderingContext2D, ImageData as SkiaImageData } from "skia-canvas";

/*************************
IMAGEDATA HELPER FUNCTIONS
*************************/

function getPixelColor(imageData: ImageData | SkiaImageData, x: number, y: number): Color {
    const pixelIndex = 4*(y*imageData.width+x);
    return {
        r: imageData.data[pixelIndex],
        g: imageData.data[pixelIndex+1],
        b: imageData.data[pixelIndex+2],
        a: imageData.data[pixelIndex+3],
    };
}

function testPixelIsColor(imageData: ImageData | SkiaImageData, x: number, y: number, color: Color): boolean {
    const pixelIndex = 4*(y*imageData.width+x);
    return (imageData.data[pixelIndex] == color.r &&
            imageData.data[pixelIndex+1] == color.g &&
            imageData.data[pixelIndex+2] == color.b &&
            imageData.data[pixelIndex+3] == color.a);
}

function putPixel(imageData: ImageData | SkiaImageData, x: number, y: number, color: Color) {
    const pixelIndex = 4*(y*imageData.width+x);
    imageData.data[pixelIndex] = color.r;
    imageData.data[pixelIndex+1] = color.g;
    imageData.data[pixelIndex+2] = color.b;
    imageData.data[pixelIndex+3] = color.a;
}

function putRect(imageData: ImageData | SkiaImageData, x: number, y: number, width: number, height: number, color: Color) {
    for (let y0 = y; y0 < y+height; y0++) 
        for (let x0 = x; x0 < x+width; x0++)
            putPixel(imageData, x0, y0, color);
}

/****************
DRAWING FUNCTIONS
*****************/

export function drawPoint(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, point: Vec2, brushSize: number, brushShape: BrushShape, color: Color) {
    const offset = Math.floor(brushSize / 2);
    switch(brushShape) {
        case "Square": {
            drawFilledRect(context, {x: point.x - offset, y: point.y - offset}, {x: brushSize, y: brushSize}, color);     
        } break;
        case "Circle": {
            drawFilledEllipse(context, {x: point.x - offset, y: point.y - offset}, {x: brushSize, y: brushSize}, color);            
        } break;
    }
}

// Implements Bresenham's Line algorithm: https://en.wikipedia.org/wiki/Bresenham's_line_algorithm
export function drawLine(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, lineStart: Vec2, lineEnd: Vec2, brushSize: number, brushShape: BrushShape, color: Color) {
    if (Math.abs(lineEnd.y - lineStart.y) < Math.abs(lineEnd.x - lineStart.x)) {
        if (lineStart.x > lineEnd.x) {
            drawLineLow(context, lineEnd, lineStart, brushSize, brushShape, color);
        } else {
            drawLineLow(context, lineStart, lineEnd, brushSize, brushShape, color);
        }
    } else {
        if (lineStart.y > lineEnd.y) {
            drawLineHigh(context, lineEnd, lineStart, brushSize, brushShape, color);
        } else {
            drawLineHigh(context, lineStart, lineEnd, brushSize, brushShape, color);
        }
    }
}

// Draws line with slopes between -1 and 1
function drawLineLow(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, lineStart: Vec2, lineEnd: Vec2, brushSize: number, brushShape: BrushShape, color: Color) {
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
        drawPoint(context, {x: x, y: y}, brushSize, brushShape, color);
        if (D >= 0) {
            y = y + yi;
            D = D + 2*(dy-dx);
        } else {
            D = D + 2*dy;
        }
    }
}

// Draws line with slopes greater than 1 or less than -1
function drawLineHigh(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, lineStart: Vec2, lineEnd: Vec2, brushSize: number, brushShape: BrushShape, color: Color) {
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
        drawPoint(context, {x: x, y: y}, brushSize, brushShape, color);
        if (D > 0) {
            x = x + xi;
            D = D + 2*(dx-dy);
        } else {
            D = D + 2*dx;
        }
    }
}

// Adapted from https://zingl.github.io/bresenham.html, https://zingl.github.io/bresenham.js
export function drawEmptyEllipse(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, start: Vec2, size: Vec2, color: Color) {
    const imageData = context.getImageData(start.x, start.y, size.x, size.y);

    let x0 = 0;
    let y0 = 0;
    let x1 = size.x-1;
    let y1 = size.y-1;

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
        putPixel(imageData, x1, y0, color);
        putPixel(imageData, x0, y0, color);
        putPixel(imageData, x0, y1, color);
        putPixel(imageData, x1, y1, color);
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
        putPixel(imageData, x0-1, y0, color);
        putPixel(imageData, x1+1, y0++, color);
        putPixel(imageData, x0-1, y1, color);
        putPixel(imageData, x1+1, y1--, color);
    }

    // @ts-ignore
    context.putImageData(imageData, start.x, start.y);
}

// Also adapted from https://zingl.github.io/bresenham.html, https://zingl.github.io/bresenham.js
export function drawFilledEllipse(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, start: Vec2, size: Vec2, color: Color) {
    const imageData = context.getImageData(start.x, start.y, size.x, size.y);

    let x0 = 0;
    let y0 = 0;
    let x1 = size.x-1;
    let y1 = size.y-1;

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
        putRect(imageData, x0, y0, x1-x0+1, 1, color);
        putRect(imageData, x0, y1, x1-x0+1, 1, color);
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
        putRect(imageData, x0-1, y0++, x1-x0+3, 1, color);
        putRect(imageData, x0-1, y1--, x1-x0+3, 1, color);
    }

    // @ts-ignore
    context.putImageData(imageData, start.x, start.y);
}

export function drawEmptyRect(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, start: Vec2, size: Vec2, color: Color) {
    const imageData = context.getImageData(start.x, start.y, size.x, size.y);
    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            if (x==0 || x==imageData.width-1 || y==0 || y==imageData.height-1) putPixel(imageData, x, y, color);
        }
    }
    // @ts-ignore
    context.putImageData(imageData, start.x, start.y);
}

export function drawFilledRect(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, start: Vec2, size: Vec2, color: Color) {
    if (color.a == 255) { // Can use normal fill rect without transparency
        context.fillStyle = `rgb(${color.r} ${color.g} ${color.b} / ${color.a}%)`;
        context.fillRect(start.x, start.y, size.x, size.y);
    } else {
        const imageData = context.createImageData(size.x, size.y);
        putRect(imageData, 0, 0, size.x, size.y, color);
        // @ts-ignore
        context.putImageData(imageData, start.x, start.y);
    }
}

export function fill(context: SkiaCanvasRenderingContext2D | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, position: Vec2, color: Color) {
    let imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    let targetColor = getPixelColor(imageData, position.x, position.y);
    // Colour picker can output fractional values for color, if thats fixed the math.rounds can be removed
    if (targetColor.r == Math.round(color.r) && targetColor.b == Math.round(color.b) && targetColor.g == Math.round(color.g) && targetColor.a == color.a) return;

    putPixel(imageData, position.x, position.y, color);
    let points: Array<Vec2> = [position];
    const directions: Array<Vec2> = [{x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1}];

    while(points.length > 0) {
        // @ts-ignore
        let currentPoint: Vec2 = points.pop();
        for (const direction of directions) {
            let testPoint = {x: currentPoint.x+direction.x, y: currentPoint.y+direction.y};
            if (testPoint.x < 0 || testPoint.x >= context.canvas.width || testPoint.y < 0 || testPoint.y >= context.canvas.height) continue;
            if (testPixelIsColor(imageData, testPoint.x, testPoint.y, targetColor)) {
                putPixel(imageData, testPoint.x, testPoint.y, color);
                points.push(testPoint);
            }
        }
    }

    // @ts-ignore
    context.putImageData(imageData, 0, 0);
}