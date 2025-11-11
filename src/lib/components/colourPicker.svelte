<script lang="ts">
    import type { Color } from "$lib/network/prims";
    import { onMount } from "svelte";

    interface Props {
        color: Color,
    }
    let {
        color = $bindable(),
    }: Props = $props();

    let hsvColor = $derived(rgbToHsv(color));

    let pickerSquareBkgCanvas: OffscreenCanvas;
    let pickerSquareCanvas: HTMLCanvasElement;
    let pickerSliderCanvas: HTMLCanvasElement;

    type HSVColor = {h: number, s: number , v: number}

    // The colour convertion functions are called often enough that there is lag
    // from the amount of color objects generated. Instead of returning a new
    // color object this method outputs by modifying an already created one
    // If you wish to have a lasting copy of the output use {... hsvToRgbOutput}
    let hsvToRgbOutput: Color = {r: 0, b: 0, g: 0, a: 255};
    function hsvToRgb(hsvColor: HSVColor): void {
        hsvToRgbNumericInput(hsvColor.h, hsvColor.s, hsvColor.v);
    }
    function hsvToRgbNumericInput(h: number, s: number, v: number): void {
        s = s/100.0;
        v = v/100.0;

        let chroma = v*s;
        h=h/60.0;
        let x = chroma*(1-Math.abs((h%2)-1));

        if (h<1) {
            hsvToRgbOutput.r = chroma;
            hsvToRgbOutput.g = x;
            hsvToRgbOutput.b = 0;
        } else if (h<2) {
            hsvToRgbOutput.r = x;
            hsvToRgbOutput.g = chroma;
            hsvToRgbOutput.b = 0;
        } else if (h<3) {
            hsvToRgbOutput.r = 0;
            hsvToRgbOutput.g = chroma;
            hsvToRgbOutput.b = x;
        } else if (h<4) {
            hsvToRgbOutput.r = 0;
            hsvToRgbOutput.g = x;
            hsvToRgbOutput.b = chroma;
        } else if (h<5) {
            hsvToRgbOutput.r = x;
            hsvToRgbOutput.g = 0;
            hsvToRgbOutput.b = chroma;
        } else if (h<=6) {
            hsvToRgbOutput.r = chroma;
            hsvToRgbOutput.g = 0;
            hsvToRgbOutput.b = x;
        }
        let m = v - chroma;
        hsvToRgbOutput.r += m;
        hsvToRgbOutput.g += m;
        hsvToRgbOutput.b += m;
        hsvToRgbOutput.r *= 255;
        hsvToRgbOutput.g *= 255;
        hsvToRgbOutput.b *= 255;
    }


    // js % operator is remainder, not a modulo
    function mod(n: number, m: number): number {
        return ((n % m) + m) % m;
    }

    // The colour convertion functions are called often enough that there is lag
    // from the amount of color objects generated. Instead of returning a new
    // color object this method outputs by modifying an already created one
    // If you wish to have a lasting copy of the output use {... rgbToHsvOutput}
    function rgbToHsv(color: Color): HSVColor {
        let r = color.r/255;
        let g = color.g/255;
        let b = color.b/255;

        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let chroma = max-min;

        let output: HSVColor = {h: 0, s: 0, v: 0}
        if (chroma==0) {
            output.h = 0;
        } else if (max==r) {
            output.h = 60 * (mod((g-b)/chroma, 6));
        } else if (max==g) {
            output.h = 60 * (((b-r)/chroma)+2);
        } else if (max==b) {
            output.h = 60 * (((r-g)/chroma)+4);
        }
        output.s = max==0 ? 0 : chroma/max;
        output.v = max;
        
        output.s *= 100;
        output.v *= 100;

        return output;
    }

    function pickerSquareCanvasCoordsToColor(x: number, y: number): Color {
        hsvToRgbNumericInput(hsvColor.h, x*100/pickerSquareCanvas.width, (pickerSquareCanvas.height-y)*100/pickerSquareCanvas.height);
        return hsvToRgbOutput;
    }

    function pickerSliderCanvasCoordsToColor(x: number, maxSV: boolean): Color {
        if (maxSV) {
            hsvToRgbNumericInput(x*359/pickerSliderCanvas.width, 100, 100);
        } else {
            hsvToRgbNumericInput(x*359/pickerSliderCanvas.width, hsvColor.s, hsvColor.v);
        }
        return hsvToRgbOutput;
    }

    function redrawPickerSquareBkg() {
        let ctxOptional: OffscreenCanvasRenderingContext2D | null = pickerSquareBkgCanvas.getContext("2d");
        if (ctxOptional == null) return;
        let ctx: OffscreenCanvasRenderingContext2D = ctxOptional;

        let imageData = ctx.getImageData(0, 0, pickerSquareCanvas.width, pickerSquareCanvas.height);
        for (let y = 0; y < pickerSquareCanvas.height; y++) {
            for (let x = 0; x < pickerSquareCanvas.width; x++) {
                let pixelColor = pickerSquareCanvasCoordsToColor(x, y);
                let pixelIdx = 4*(y*pickerSquareCanvas.width + x);
                imageData.data[pixelIdx] = pixelColor.r;
                imageData.data[pixelIdx+1] = pixelColor.g;
                imageData.data[pixelIdx+2] = pixelColor.b;
                imageData.data[pixelIdx+3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    function redrawPickerSquare() {
        // const startTime = performance.now();

        // Draw colour square
        let ctxOptional: CanvasRenderingContext2D | null = pickerSquareCanvas.getContext("2d");
        if (ctxOptional == null) return;
        let ctx: CanvasRenderingContext2D = ctxOptional;
        let bkgCtxOptional: OffscreenCanvasRenderingContext2D | null = pickerSquareBkgCanvas.getContext("2d");
        if (bkgCtxOptional == null) return;
        let bkgCtx: OffscreenCanvasRenderingContext2D = bkgCtxOptional;

        redrawPickerSquareBkg();
        const bkgImdateDate = bkgCtx.getImageData(0, 0, pickerSquareBkgCanvas.width, pickerSquareBkgCanvas.height);
        ctx.putImageData(bkgImdateDate, 0, 0);

        // Draw current colour marker
        const x = hsvColor.s*pickerSquareCanvas.width/100;
        const y = pickerSquareCanvas.height - hsvColor.v*pickerSquareCanvas.width/100;
        ctx.strokeStyle = hsvColor.v > 50 ? "#000000FF" : "#FFFFFFFF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(x-3, y-3, 6, 6);
        ctx.stroke();
    }

    function redrawPickerSlider() {
        // Draw colour slider
        let ctxOptional: CanvasRenderingContext2D | null = pickerSliderCanvas.getContext("2d");
        if (ctxOptional == null) return;
        let ctx: CanvasRenderingContext2D = ctxOptional;
        let imageData = ctx.getImageData(0, 0, pickerSliderCanvas.width, pickerSliderCanvas.height);

        for (let y = 0; y < pickerSliderCanvas.height; y++) {
            for (let x = 0; x < pickerSliderCanvas.width; x++) {
                let pixelColor = pickerSliderCanvasCoordsToColor(x, true);
                let pixelIdx = 4*(y*pickerSliderCanvas.width + x);
                imageData.data[pixelIdx] = pixelColor.r;
                imageData.data[pixelIdx+1] = pixelColor.g;
                imageData.data[pixelIdx+2] = pixelColor.b;
                imageData.data[pixelIdx+3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Draw current hue marker
        const x = hsvColor.h*pickerSliderCanvas.width/359;
        ctx.strokeStyle = "#000000FF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(x-3, (pickerSliderCanvas.height/2)-3, 6, 6);
        ctx.stroke();
    }

    onMount(()=> {
        pickerSquareBkgCanvas = new OffscreenCanvas(pickerSquareCanvas.width, pickerSquareCanvas.height);

        redrawPickerSquare();
        redrawPickerSlider();
    })

    $effect(() => {
        redrawPickerSquare();
        redrawPickerSlider();
    })

    function setColorFromSquarePointerEvent(event: PointerEvent) {
        const rect = pickerSquareCanvas.getClientRects()[0];
        let x = (event.clientX - rect.left) / (rect.width / pickerSquareCanvas.width);
        let y = (event.clientY - rect.top) / (rect.height / pickerSquareCanvas.height);
        x = Math.max(0, Math.min(x, pickerSquareCanvas.width));
        y = Math.max(0, Math.min(y, pickerSquareCanvas.height));

        color = pickerSquareCanvasCoordsToColor(x, y);

    }

    function setColorFromSliderPointerEvent(event: PointerEvent) {
        const rect = pickerSliderCanvas.getClientRects()[0];
        let x = (event.clientX - rect.left) / (rect.width / pickerSliderCanvas.width);
        x = Math.max(0, Math.min(x, pickerSliderCanvas.width));

        color = pickerSliderCanvasCoordsToColor(x, false);

    }


    function pickerSquarePointerDown(event: PointerEvent) {
        setColorFromSquarePointerEvent(event);

        pickerSquareCanvas.onpointermove = pickerSquarePointerMove;
        pickerSquareCanvas.setPointerCapture(event.pointerId);
    }
    function pickerSquarePointerUp(event: PointerEvent) {
        pickerSquareCanvas.onpointermove = null;
        pickerSquareCanvas.releasePointerCapture(event.pointerId);
    }
    function pickerSquarePointerMove(event: PointerEvent) {
        setColorFromSquarePointerEvent(event);
    }


    function pickerSliderPointerDown(event: PointerEvent) {
        setColorFromSliderPointerEvent(event);

        pickerSliderCanvas.onpointermove = pickerSliderPointerMove;
        pickerSliderCanvas.setPointerCapture(event.pointerId);
    }
    function pickerSliderPointerUp(event: PointerEvent) {
        pickerSliderCanvas.onpointermove = null;
        pickerSliderCanvas.releasePointerCapture(event.pointerId);
    }
    function pickerSliderPointerMove(event: PointerEvent) {
        setColorFromSliderPointerEvent(event);
    }

    function getColorChannelAsString(channel: "r"|"g"|"b"|"h"|"s"|"v"): string {
        switch(channel) { 
            case "r": {
                return Math.round(color.r).toString();
            }
            case "g": {
                return Math.round(color.g).toString();
            }
            case "b": {
                return Math.round(color.b).toString();
            }
            case "h": {
                return Math.round(hsvColor.h).toString();
            }
            case "s": {
                return Math.round(hsvColor.s).toString();
            }
            case "v": {
                return Math.round(hsvColor.v).toString();
            }
        }
    }

    function setColorChannelByString(channel: "r"|"g"|"b"|"h"|"s"|"v", newVal: string) {
        newVal = newVal.replaceAll(/\D/g, "");
        if (newVal == "") newVal = "0";
        let newNum: number = parseInt(newVal);

        switch(channel) { 
            case "r": {
                newNum = Math.max(0, Math.min(newNum, 255));
                color.r = newNum;
            } break;
            case "g": {
                newNum = Math.max(0, Math.min(newNum, 255));
                color.g = newNum;
            } break;
            case "b": {
                newNum = Math.max(0, Math.min(newNum, 255));
                color.b = newNum;
            } break;
            case "h": {
                newNum = Math.max(0, Math.min(newNum, 360));
                let hsvColorCopy: HSVColor = {... hsvColor};
                hsvColorCopy.h = newNum;
                hsvToRgb(hsvColorCopy);
                color = {... hsvToRgbOutput};
            } break;
            case "s": {
                newNum = Math.max(0, Math.min(newNum, 100));
                let hsvColorCopy: HSVColor = {... hsvColor};
                hsvColorCopy.s = newNum;
                hsvToRgb(hsvColorCopy);
                color = {... hsvToRgbOutput};
            } break;
            case "v": {
                newNum = Math.max(0, Math.min(newNum, 100));
                let hsvColorCopy: HSVColor = {... hsvColor};
                hsvColorCopy.v = newNum;
                hsvToRgb(hsvColorCopy);
                color = {... hsvToRgbOutput};
            } break;
        }
    }

</script>

<div class="w-[256px]">
    <canvas width=256 height=256 bind:this={pickerSquareCanvas} onpointerdown={pickerSquarePointerDown} onpointerup={pickerSquarePointerUp}></canvas>
    <canvas width=256 height=32 bind:this={pickerSliderCanvas} onpointerdown={pickerSliderPointerDown} onpointerup={pickerSliderPointerUp}></canvas>
    <div class="color-input-list">
        <div class="shrink flex min-w-0">
            <label for="r">R:</label>
            <input class="color-input" type="text" id="r" bind:value={()=>getColorChannelAsString("r"), v=>setColorChannelByString("r", v)}/>
        </div>
        <div class="shrink flex min-w-0">
            <label for="g">G:</label>
            <input class="color-input" type="text" id="g" bind:value={()=>getColorChannelAsString("g"), v=>setColorChannelByString("g", v)}/>
        </div>
        <div class="shrink flex min-w-0">
            <label for="b">B:</label>
            <input class="color-input" type="text" id="b" bind:value={()=>getColorChannelAsString("b"), v=>setColorChannelByString("b", v)}/>        
        </div>
    </div>
    <div class="color-input-list">
        <div class="shrink flex min-w-0">
            <label for="h">H:</label>
            <input class="color-input" type="text" id="h" bind:value={()=>getColorChannelAsString("h"), v=>setColorChannelByString("h", v)}/>
        </div>
        <div class="shrink flex min-w-0">
            <label for="s">S:</label>
            <input class="color-input" type="text" id="s" bind:value={()=>getColorChannelAsString("s"), v=>setColorChannelByString("s", v)}/>
        </div>
        <div class="shrink flex min-w-0">
            <label for="v">V:</label>
            <input class="color-input" type="text" id="v" bind:value={()=>getColorChannelAsString("v"), v=>setColorChannelByString("v", v)}/>
        </div>
    </div>
</div>

<svelte:head>
  <link
    href="https://fonts.googleapis.com/css?family=VT323"
    rel="stylesheet"
    type="text/css"
  />
</svelte:head>

<style>
    .color-input-list {
    position: relative;
    display: flex;
    gap: 5px;
    white-space: nowrap;
    place-items: center;
    font-size: 2rem;
    color: rgb(224, 224, 224);
    font-family: "VT323";
    margin: 4px 1px;
  }

  .color-input {
    background-color: #2e2e2e;
    border-radius: 5px;
    padding-left: 8px;
    min-width: 0px;
  }
</style>