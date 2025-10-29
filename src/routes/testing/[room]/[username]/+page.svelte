<script lang="ts">
  import { Connection } from "$lib/controller/connection.client";
  import { transformFromTranslation, transformFromScaling, composeTransforms, type Color, type Transform2D, type Vec2 } from "$lib/network/prims";
  import { onMount } from "svelte";
  import type { PageProps } from "./$types";
  import { Surface } from "$lib/model/surface";
  import type { Operation } from "$lib/network/operation";
  import { tools, type Tool } from "$lib/controller/tool";
  import background from "$lib/assets/background.png";
  import { applyInverseTransform } from "$lib/network/prims";
  import type { MouseState } from "$lib/util/mouseState";

  let surfaceCanvas: OffscreenCanvas;
  let backgroundCanvas: OffscreenCanvas;
  let toolPreviewCanvas: OffscreenCanvas;
  let displayCanvas: HTMLCanvasElement;
  let connection: Connection;
  let surface: Surface;

  let displayTransform2D: Transform2D = transformFromScaling(16, 16);

  let { data }: PageProps = $props();

  onMount(async () => {
    let displayCtxOptional: CanvasRenderingContext2D | null = displayCanvas.getContext("2d");
    if (displayCtxOptional == null) return;
    let displayCtx: CanvasRenderingContext2D = displayCtxOptional;
    displayCtx.imageSmoothingEnabled = false;

    connection = await Connection.connect(data.username, data.room);
    surfaceCanvas = new OffscreenCanvas(32, 32);
    toolPreviewCanvas = new OffscreenCanvas(32, 32);
    backgroundCanvas = new OffscreenCanvas(32, 32);
    surface = new Surface({ x: 32, y: 32 }, surfaceCanvas.getContext("2d")!);
    surface.clear();
    surface.subscribeDraw(refreshDisplayCanvas);
    drawBackgroundCanvas();
    refreshDisplayCanvas();
    connection.setHandler("sync", (packet) => {
      console.log("received sync", packet);
      surface.handleSync(packet.url);
    });
  });

  let mouseState: MouseState = {
    position: {x: -1, y: -1},
    firstPos: { x: -1, y: -1 },
    previousPos: { x: -1, y: -1 },
    drawing: false,
  };

  let currentTool: Tool = $state(tools[0]);

  function handleOperation(operation: Operation) {
    surface.handleOperation(operation);
    connection.send({
      type: "operation",
      operation,
    });
  }

  function draw(event: MouseEvent) {
    // todo: replace with actual variable that controls colour
    let color: Color = "cornflowerblue";

    if (currentTool.generateOperation != undefined) {
      handleOperation(currentTool.generateOperation(mouseState, color));
    }
  }

  function refreshDisplayCanvas() {
    let displayCtxOptional: CanvasRenderingContext2D | null = displayCanvas.getContext("2d");
    if (displayCtxOptional == null) return;
    let displayCtx: CanvasRenderingContext2D = displayCtxOptional;

    displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    displayCtx.save();
    displayCtx.setTransform(displayTransform2D);
    displayCtx.drawImage(backgroundCanvas, 0, 0);
    displayCtx.drawImage(surfaceCanvas, 0, 0);
    displayCtx.drawImage(toolPreviewCanvas, 0, 0);
    // Draws terrible looking gridlines between pixels for debugging
    // for(let i = 0; i < 32; i++) {
    //   displayCtx.lineWidth = 1/displayScale;
    //   displayCtx.beginPath();
    //   displayCtx.moveTo(i, 0);
    //   displayCtx.lineTo(i, 32);
    //   displayCtx.stroke();
    //   displayCtx.beginPath();
    //   displayCtx.moveTo(0, i);
    //   displayCtx.lineTo(32, i);
    //   displayCtx.stroke();
    // }
    displayCtx.restore();
  }

  function drawBackgroundCanvas() {
    let backgroundCtxOptional: OffscreenCanvasRenderingContext2D | null = backgroundCanvas.getContext("2d");
    if (backgroundCtxOptional == null) return;
    let backgroundCtx: OffscreenCanvasRenderingContext2D = backgroundCtxOptional;
    
    backgroundCtx.fillRect(0, 0, 32, 32);
    const color1: Color = "#777777";
    const color2: Color = "#bbbbbb";
    const gridTileWidth: number = 4;
    for (let y = 0; y < Math.floor(32/gridTileWidth); y++) {
      for (let x = 0; x < Math.floor(32/gridTileWidth); x++) {
        backgroundCtx.fillStyle = (x+y)%2==0 ? color1 : color2;
        backgroundCtx.fillRect(x*gridTileWidth, y*gridTileWidth, gridTileWidth, gridTileWidth);
      }
    }
  }

  function clearToolPreview() {
    let toolPreviewCtxOptional: OffscreenCanvasRenderingContext2D | null = toolPreviewCanvas.getContext("2d");
    if (toolPreviewCtxOptional == null) return;
    let toolPreviewCtx: OffscreenCanvasRenderingContext2D = toolPreviewCtxOptional;

    toolPreviewCtx.clearRect(0, 0, 32, 32);
    refreshDisplayCanvas();
  }

  function refreshToolPreviewCanvas() {
    if (currentTool.drawPreview != undefined) {
      let toolPreviewCtxOptional: OffscreenCanvasRenderingContext2D | null = toolPreviewCanvas.getContext("2d");
      if (toolPreviewCtxOptional == null) return;
      let toolPreviewCtx: OffscreenCanvasRenderingContext2D = toolPreviewCtxOptional;
      
      // todo: replace with actual variable that controls colour
      let color: Color = "cornflowerblue";
      toolPreviewCtx.clearRect(0, 0, 32, 32);
      currentTool.drawPreview(toolPreviewCtx, mouseState, color);
      refreshDisplayCanvas();
    }
  }

  function clientToDisplayCanvasCoords(clientPos: Vec2): Vec2 {
    const rect = displayCanvas.getClientRects()[0];
    return {
      x: (clientPos.x - rect.left) / (rect.width / displayCanvas.width),
      y: (clientPos.y - rect.top) / (rect.height / displayCanvas.height),
    };
  }

  function clientToSurfaceCoords(clientPos: Vec2): Vec2 {
    const displayCanvasCoords = clientToDisplayCanvasCoords(clientPos);
    const unroundedCoords = applyInverseTransform(displayTransform2D, displayCanvasCoords);
    return {
      x: Math.floor(unroundedCoords.x),
      y: Math.floor(unroundedCoords.y),
    };
  }

  function mouseDown(event: MouseEvent) {
    if ((event.buttons & 1) != 1) return;

    mouseState.drawing = true;
    mouseState.firstPos = clientToSurfaceCoords({x: event.clientX, y: event.clientY});

    if (currentTool.applicationType == "click_drag" || currentTool.applicationType == "single_click") {
      draw(event);
    }
  }

  function mouseUp(event: MouseEvent) {
    if (mouseState.drawing && currentTool.applicationType == "click_release") {
      draw(event);
    }

    mouseState.drawing = false;
  }

  function mouseMove(event: MouseEvent) {
    mouseState.position = clientToSurfaceCoords({x: event.clientX, y: event.clientY});
    mouseState.previousPos = clientToSurfaceCoords({x: event.clientX-event.movementX, y: event.clientY-event.movementY});

    refreshToolPreviewCanvas();

    if ((event.buttons & 1) == 1 && currentTool.applicationType == "click_drag" && mouseState.drawing ) {
      if (mouseState.position.x != mouseState.previousPos.x || mouseState.position.y != mouseState.previousPos.y) {
        draw(event);
      }
    } else if ((event.buttons & 4) == 4 || (event.buttons & 1) == 1 && currentTool.applicationType == "pan") {
      const rect = displayCanvas.getClientRects()[0];
      // Mouse movement transformed to be relative to displayCanvas size
      let movement: Vec2 = {x: event.movementX*(displayCanvas.width/rect.width), y: event.movementY*(displayCanvas.height/rect.height)};

      displayTransform2D = composeTransforms(transformFromTranslation(movement.x, movement.y), displayTransform2D);
      refreshDisplayCanvas();
    };
  }

  function mouseLeave(event: MouseEvent) {
    mouseState.drawing = false;
    clearToolPreview();
  }

  function wheel(event: WheelEvent) {
    let mousePos = clientToDisplayCanvasCoords({x: event.clientX, y: event.clientY});
    let scaleFactor = 1-Math.sign(event.deltaY)*0.1;
    displayTransform2D = composeTransforms(transformFromTranslation(-mousePos.x, -mousePos.y), displayTransform2D);
    displayTransform2D = composeTransforms(transformFromScaling(scaleFactor, scaleFactor), displayTransform2D);
    displayTransform2D = composeTransforms(transformFromTranslation(mousePos.x, mousePos.y), displayTransform2D);
    refreshDisplayCanvas();
  }
</script>

<link href='https://fonts.googleapis.com/css?family=VT323' rel='stylesheet' type='text/css'>

<div class="background">
    <img src = {background} alt = "whoops"/>
</div>
<div class = "drawingSpace">
  <div class = "overlay">
    <div class = "flex justify-center content-center h-full w-full">
      <canvas
        bind:this={displayCanvas}
        width="512"
        height="512"
        onmousedown={mouseDown}
        onmouseup={mouseUp}
        onmousemove={mouseMove}
        onmouseleave={mouseLeave}
        onwheel={wheel}
        oncontextmenu={(e) => {e.preventDefault()}}
      ></canvas>
      <div class="flex flex-col gap-2 p-1">
        {#each tools as tool}
        <button onclick={() => currentTool = tool} class="pixelButton">
            <p>{tool.displayName}</p>
          </button>
        {/each}
      </div>
      <div class="flex flex-col gap-2 p-1">
        <div>
          {#if currentTool.applicableSettings.has("brushSize")}
            <div class="pixel"><p>Brush Size</p></div>
          <button onclick={() => currentTool.settings.brushSize += 1} class="pixelButton">
              <p>+</p>
            </button>
            <div class="pixel"><p>{currentTool.settings.brushSize}</p></div>
          <button onclick={() => currentTool.settings.brushSize = Math.max(1, currentTool.settings.brushSize - 1)} class="pixelButton">
              <p>-</p>
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  canvas {
    outline: auto 20px cornflowerblue;
    width: 74.7%;
    height:100%;
    image-rendering: pixelated;
  }

  .background {
    position:absolute;
    image-rendering:pixelated;
    width: 100%;
    height: 100%;
  }

  .background img{
    width:100%;
    height:100%;
    object-fit: fill;
    object-position: center;
  }

  .overlay {
    position: relative;
  }

  .drawingSpace::before {
    content: "";
    display: block;
    position: absolute;
    top: 10px;
    bottom: 10px;
    left: -10px;
    right: -10px;
    background: linear-gradient(to right, #6E6E6E 50%, #404040 50%);
    z-index: -1;
  }

  .drawingSpace::after {
    content: "";
    display: block;
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: -6px;
    right: -6px;
    background: #4F4F4F;
    border-style:solid;
    border-width:4px;
    border-color:#6E6E6E #404040 #404040 #6E6E6E;
    z-index: -1;
  }

  .drawingSpace {
    position: fixed;
    object-position: center;
    padding: 12px 12px 12px 16px;
    height: 100%;
    width: 66%;
    margin-left: 17%;
    margin-right: 17%;
    object-fit: fill;
    background:linear-gradient(to bottom, #6E6E6E 50%, #404040 50%);
    z-index: 2;
  }

  .pixelButton {
    position: relative;
    display: inline-block;
    vertical-align: top;
    text-transform: uppercase;

    cursor: pointer;

    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .pixelButton:active {
    top: 2px;
  }

  .pixelButton {
    position: relative;
    display: grid;
    margin: 10px;
    place-items:center;
  }

  .pixelButton p{
    font-family: 'VT323';
    text-transform: uppercase;
    font-size: 20px;
    color: rgb(224, 224, 224);
  }

  .pixelButton::before {
    content: "";
    display: block;
    position: absolute;
    top: 10px;
    bottom: 10px;
    left: -10px;
    right: -10px;
    background: linear-gradient(to right, #6E6E6E 50%, #404040 50%);
    z-index: -1;
  }

  .pixelButton::after {
    content: "";
    display: block;
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: -6px;
    right: -6px;
    background: #575757;
    border-style:solid;
    border-width:4px;
    border-color:#6E6E6E #404040 #404040 #6E6E6E;
    z-index: -1;
  }

  .pixelButton {
    padding: 10px 10px;
    position: relative;
    background:linear-gradient(to bottom, #6E6E6E 50%, #404040 50%);
    width: auto;
    z-index: 2;
  }

  .pixel {
    position: relative;
    display: grid;
    margin: 10px;
    place-items:center;
  }

  .pixel p{
    font-family: 'VT323';
    text-transform: uppercase;
    font-size: 20px;
    color: rgb(224, 224, 224);
  }

  .pixel::before {
    content: "";
    display: block;
    position: absolute;
    top: 10px;
    bottom: 10px;
    left: -10px;
    right: -10px;
    background: linear-gradient(to right, #6E6E6E 50%, #404040 50%);
    z-index: -1;
  }

  .pixel::after {
    content: "";
    display: block;
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: -6px;
    right: -6px;
    background: #575757;
    border-style:solid;
    border-width:4px;
    border-color:#6E6E6E #404040 #404040 #6E6E6E;
    z-index: -1;
  }

  .pixel{
    padding: 10px 10px;
    position: relative;
    background:linear-gradient(to bottom, #6E6E6E 50%, #404040 50%);
    width: auto;
    z-index: 2;
  }
</style>
