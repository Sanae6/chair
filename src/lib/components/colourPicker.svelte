<script lang="ts">
    import type { Color } from "$lib/network/prims";
    import { onMount, untrack } from "svelte";
    import { createTextChangeRange } from "typescript";

    interface Props {
        color: Color,
    }
    let {
        color = $bindable(),
    }: Props = $props();

    let pickerSquareCanvas: HTMLCanvasElement;
    let pickerSliderCanvas: HTMLCanvasElement;

    type HSVColor = {h: number, s: number , v: number}

    function hsvToRgb(hsvColor: HSVColor): Color {
        let h = hsvColor.h;
        let s = hsvColor.s/100.0;
        let v = hsvColor.v/100.0;

        let chroma = v*s;
        h=h/60.0;
        let x = chroma*(1-Math.abs((h%2)-1));

        let output: Color = {r: 0, b: 0, g: 0, a: 255}

        if (h<1) {
            output.r = chroma;
            output.g = x;
            output.b = 0;
        } else if (h<2) {
            output.r = x;
            output.g = chroma;
            output.b = 0;
        } else if (h<3) {
            output.r = 0;
            output.g = chroma;
            output.b = x;
        } else if (h<4) {
            output.r = 0;
            output.g = x;
            output.b = chroma;
        } else if (h<5) {
            output.r = x;
            output.g = 0;
            output.b = chroma;
        } else if (h<=6) {
            output.r = chroma;
            output.g = 0;
            output.b = x;
        }
        let m = v - chroma;
        output.r += m;
        output.g += m;
        output.b += m;
        output.r *= 255;
        output.g *= 255;
        output.b *= 255;


        return output;
    }

    // js % operator is remainder, not a modulo
    function mod(n: number, m: number): number {
        return ((n % m) + m) % m;
    }

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
        let hsvColor = rgbToHsv(color);
        let newColor = hsvToRgb({h: hsvColor.h, s: x*100/pickerSquareCanvas.width, v: (pickerSquareCanvas.height-y)*100/pickerSquareCanvas.height});
        return newColor;
    }

    function pickerSliderCanvasCoordsToColor(x: number, maxSV: boolean): Color {
        let hsvColor = rgbToHsv(color);
        if (maxSV) {
            return hsvToRgb({h: x*359/pickerSliderCanvas.width, s: 100, v: 100});
        } else {
            return hsvToRgb({h: x*359/pickerSliderCanvas.width, s: hsvColor.s, v: hsvColor.v});
        }
    }

    function redrawPickerSquare() {
        // Draw colour square
        let ctxOptional: CanvasRenderingContext2D | null = pickerSquareCanvas.getContext("2d");
        if (ctxOptional == null) return;
        let ctx: CanvasRenderingContext2D = ctxOptional;
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

        // Draw current colour marker
        const hsvColor = rgbToHsv(color);
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
        const hsvColor = rgbToHsv(color);
        const x = hsvColor.h*pickerSliderCanvas.width/359;
        ctx.strokeStyle = "#000000FF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(x-3, (pickerSliderCanvas.height/2)-3, 6, 6);
        ctx.stroke();
    }

    onMount(()=> {
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
        // if ((event.buttons&1)==0) return;
        setColorFromSquarePointerEvent(event);

        pickerSquareCanvas.onpointermove = pickerSquarePointerMove;
        pickerSquareCanvas.setPointerCapture(event.pointerId);
    }
    function pickerSquarePointerUp(event: PointerEvent) {
        // if ((event.buttons&1)==0) return;
        pickerSquareCanvas.onpointermove = null;
        pickerSquareCanvas.releasePointerCapture(event.pointerId);
    }
    function pickerSquarePointerMove(event: PointerEvent) {
        setColorFromSquarePointerEvent(event);
    }


    function pickerSliderPointerDown(event: PointerEvent) {
        // if ((event.buttons&1)==0) return;
        setColorFromSliderPointerEvent(event);

        pickerSliderCanvas.onpointermove = pickerSliderPointerMove;
        pickerSliderCanvas.setPointerCapture(event.pointerId);
    }
    function pickerSliderPointerUp(event: PointerEvent) {
        // if ((event.buttons&1)==0) return;
        pickerSliderCanvas.onpointermove = null;
        pickerSliderCanvas.releasePointerCapture(event.pointerId);
    }
    function pickerSliderPointerMove(event: PointerEvent) {
        setColorFromSliderPointerEvent(event);
    }

    function setColorChannelByString(newVal: string, channel: "r"|"g"|"b"|"h"|"s"|"v") {
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
                let hsvColor = rgbToHsv(color);
                hsvColor.h = newNum;
                color = hsvToRgb(hsvColor);
            } break;
            case "s": {
                newNum = Math.max(0, Math.min(newNum, 100));
                let hsvColor = rgbToHsv(color);
                hsvColor.s = newNum;
                color = hsvToRgb(hsvColor);
            } break;
            case "v": {
                newNum = Math.max(0, Math.min(newNum, 100));
                let hsvColor = rgbToHsv(color);
                hsvColor.v = newNum;
                color = hsvToRgb(hsvColor);
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
            <input class="color-input" type="text" id="r" bind:value={()=> Math.round(color.r), (v)=>{setColorChannelByString(v, "r")}}/>
        </div>
        <div class="shrink flex min-w-0">
            <label for="g">G:</label>
            <input class="color-input" type="text" id="g" bind:value={()=> Math.round(color.g), (v)=>{setColorChannelByString(v, "g")}}/>
        </div>
        <div class="shrink flex min-w-0">
            <label for="b">B:</label>
            <input class="color-input" type="text" id="b" bind:value={()=> Math.round(color.b), (v)=>{setColorChannelByString(v, "b")}}/>        
        </div>
    </div>
    <div class="color-input-list">
        <div class="shrink flex min-w-0">
            <label for="h">H:</label>
            <input class="color-input" type="text" id="h" bind:value={()=> Math.round(rgbToHsv(color).h), (v)=>{setColorChannelByString(v, "h")}}/>
        </div>
        <div class="shrink flex min-w-0">
            <label for="s">S:</label>
            <input class="color-input" type="text" id="s" bind:value={()=> Math.round(rgbToHsv(color).s), (v)=>{setColorChannelByString(v, "s")}}/>
        </div>
        <div class="shrink flex min-w-0">
            <label for="v">V:</label>
            <input class="color-input" type="text" id="v" bind:value={()=> Math.round(rgbToHsv(color).v), (v)=>{setColorChannelByString(v, "v")}}/>
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
    font-size: clamp(0.75rem, 3vw, 2rem);
    color: rgb(224, 224, 224);
    font-family: "VT323";
    text-transform: uppercase;
    margin: 4px 1px;
  }

  .color-input {
    background-color: #2e2e2e;
    border-radius: 5px;
    padding-left: 8px;
    min-width: 0px;
  }
</style>