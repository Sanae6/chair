<script lang="ts">
  import { Connection } from "$lib/controller/connection.client";
  import {
    transformFromTranslation,
    transformFromScaling,
    composeTransforms,
    type Color,
    type Transform2D,
    type Vec2,
  } from "$lib/network/prims";
  import { onMount } from "svelte";
  import type { PageProps } from "./$types";
  import { Surface } from "$lib/model/surface";
  import type { Operation } from "$lib/network/operation";
  import { createTool, type Tool } from "$lib/controller/tool.svelte";
  import background from "$lib/assets/background.png";
  import box from "$lib/assets/box.png";
  import circle from "$lib/assets/circ.png";
  import crown from "$lib/assets/crown.png";
  import download from "$lib/assets/download.png";
  import rectangle from "$lib/assets/rect.png";
  import x from "$lib/assets/x.png";
  import { applyInverseTransform } from "$lib/network/prims";
  import type { PointerState } from "$lib/util/pointerState";
  import { localStore } from "$lib/util/stores";
  import { goto } from "$app/navigation";
  import { drawFilledRect } from "$lib/util/canvasDrawHelpers";
  import ColourPicker from "$lib/components/colourPicker.svelte";

  let surfaceCanvas: OffscreenCanvas;
  let backgroundCanvas: OffscreenCanvas;
  let toolPreviewCanvas: OffscreenCanvas;
  let displayCanvas: HTMLCanvasElement;
  let connection: Connection;
  let surface: Surface;
  let canvasSize: Vec2;

  let displayTransform2D: Transform2D;

  let { data }: PageProps = $props();

  let moderatorPassword = localStore(`${data.room}.password`, "");
  let userList: { username: string; moderator: boolean }[] = $state([]);

  onMount(async () => {
    let displayCtxOptional: CanvasRenderingContext2D | null =
      displayCanvas.getContext("2d");
    if (displayCtxOptional == null) return;
    let displayCtx: CanvasRenderingContext2D = displayCtxOptional;
    displayCtx.imageSmoothingEnabled = false;

    connection = await Connection.connect(data.username, data.room);
    connection.setHandler("sync", (packet) => {
      console.log("received sync", packet);
      surface.handleSync(packet.url);
    });
    connection.setHandler("userList", (packet) => {
      console.log("received userList", packet);
      userList = packet.users;
    });
    connection.setHandler("promoted", (packet) => {
      moderatorPassword.set(packet.password);
    });
    let kickedFirst = false;
    connection.setHandler("kicked", () => {
      kickedFirst = true;
      alert("you were kicked from the room!");
      goto("/", { invalidateAll: true });
    });
    connection.setHandler("close", (packet) => {
      console.log("closed");
      if (kickedFirst) return;
      alert(packet.reason?.length == 0 ? "connection closed" : packet.reason);
      goto("/", { invalidateAll: true });
    });
    connection.setHandler("palette", (packet) => {
      if (packet.data.type == "sync") {
        palette = packet.data.colors;
      }
    });

    const connectedPacket = await connection.connect();
    canvasSize = connectedPacket.size;
    if (canvasSize.x > canvasSize.y) {
      // This condition needs to be changed if the display canvas isn't square
      displayTransform2D = transformFromScaling(
        512 / canvasSize.x,
        512 / canvasSize.x,
      );
      // Offset to center canvas
      displayTransform2D = composeTransforms(
        displayTransform2D,
        transformFromTranslation(0, (canvasSize.x - canvasSize.y) / 2),
      );
    } else {
      displayTransform2D = transformFromScaling(
        512 / canvasSize.y,
        512 / canvasSize.y,
      );
      displayTransform2D = composeTransforms(
        displayTransform2D,
        transformFromTranslation((canvasSize.y - canvasSize.x) / 2, 0),
      );
    }
    console.log(canvasSize);
    surfaceCanvas = new OffscreenCanvas(canvasSize.x, canvasSize.y);
    toolPreviewCanvas = new OffscreenCanvas(canvasSize.x, canvasSize.y);
    backgroundCanvas = new OffscreenCanvas(canvasSize.x, canvasSize.y);
    surface = new Surface(canvasSize, surfaceCanvas.getContext("2d")!);
    surface.clear();
    surface.subscribeDraw(refreshDisplayCanvas);
    drawBackgroundCanvas();
    refreshDisplayCanvas();
  });

  let pointerState: PointerState = {
    position: { x: -1, y: -1 },
    firstPos: { x: -1, y: -1 },
    previousPos: { x: -1, y: -1 },
    drawing: false,
    previouslyDrawing: false,
    panning: false,
    button1: false,
    button3: false,
    ctrlModifier: false,
    altModifier: false,
    shiftModifier: false,
  };

  let tools: Array<Tool> = [
    createTool("pencil"),
    createTool("eraser"),
    createTool("line"),
    createTool("rect"),
    createTool("ellipse"),
    createTool("fill"),
    createTool("eyedropper"),
    createTool("pan"),
  ];
  let currentTool: Tool = $state(tools[0]);
  let foregroundColor: Color = $state({ r: 100, g: 149, b: 237, a: 255 });
  let palette: Color[] = $state([]);

  function handleOperation(operation: Operation) {
    surface.handleOperation(operation);
    connection.send({
      type: "operation",
      operation,
    });
  }

  function draw() {
    if (currentTool.generateOperation != undefined) {
      handleOperation(
        currentTool.generateOperation(pointerState, foregroundColor),
      );
    }
  }

  function refreshDisplayCanvas() {
    let displayCtxOptional: CanvasRenderingContext2D | null =
      displayCanvas.getContext("2d");
    if (displayCtxOptional == null) return;
    let displayCtx: CanvasRenderingContext2D = displayCtxOptional;

    displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    displayCtx.save();
    displayCtx.setTransform(displayTransform2D);
    displayCtx.drawImage(backgroundCanvas, 0, 0);
    displayCtx.drawImage(surfaceCanvas, 0, 0);
    displayCtx.drawImage(toolPreviewCanvas, 0, 0);
    // Draws somewhat terrible looking gridlines between pixels for debugging
    // displayCtx.lineWidth = 0.2;
    // for(let i = 0; i < canvasSize.x; i++) {
    //   displayCtx.beginPath();
    //   displayCtx.moveTo(i, 0);
    //   displayCtx.lineTo(i, canvasSize.y);
    //   displayCtx.stroke();
    // }
    // for(let i = 0; i < canvasSize.y; i++) {
    //   displayCtx.beginPath();
    //   displayCtx.moveTo(0, i);
    //   displayCtx.lineTo(canvasSize.x, i);
    //   displayCtx.stroke();
    // }
    displayCtx.restore();
  }

  function drawBackgroundCanvas() {
    let backgroundCtxOptional: OffscreenCanvasRenderingContext2D | null =
      backgroundCanvas.getContext("2d");
    if (backgroundCtxOptional == null) return;
    let backgroundCtx: OffscreenCanvasRenderingContext2D =
      backgroundCtxOptional;

    backgroundCtx.fillRect(0, 0, canvasSize.x, canvasSize.y);
    const color1: Color = { r: 120, b: 120, g: 120, a: 255 };
    const color2: Color = { r: 190, b: 190, g: 190, a: 255 };
    const gridTileWidth: number = 4;
    for (let y = 0; y < Math.ceil(canvasSize.y / gridTileWidth); y++) {
      for (let x = 0; x < Math.ceil(canvasSize.x / gridTileWidth); x++) {
        let color = (x + y) % 2 == 0 ? color1 : color2;
        drawFilledRect(
          backgroundCtx,
          { x: x * gridTileWidth, y: y * gridTileWidth },
          { x: gridTileWidth, y: gridTileWidth },
          color,
        );
      }
    }
  }

  function clearToolPreview() {
    let toolPreviewCtxOptional: OffscreenCanvasRenderingContext2D | null =
      toolPreviewCanvas.getContext("2d");
    if (toolPreviewCtxOptional == null) return;
    let toolPreviewCtx: OffscreenCanvasRenderingContext2D =
      toolPreviewCtxOptional;

    toolPreviewCtx.clearRect(0, 0, canvasSize.x, canvasSize.y);
    refreshDisplayCanvas();
  }

  function refreshToolPreviewCanvas() {
    if (currentTool.drawPreview != undefined) {
      let toolPreviewCtxOptional: OffscreenCanvasRenderingContext2D | null =
        toolPreviewCanvas.getContext("2d");
      if (toolPreviewCtxOptional == null) return;
      let toolPreviewCtx: OffscreenCanvasRenderingContext2D =
        toolPreviewCtxOptional;

      toolPreviewCtx.clearRect(0, 0, canvasSize.x, canvasSize.y);
      currentTool.drawPreview(toolPreviewCtx, pointerState, foregroundColor);
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
    const unroundedCoords = applyInverseTransform(
      displayTransform2D,
      displayCanvasCoords,
    );
    return {
      x: Math.floor(unroundedCoords.x),
      y: Math.floor(unroundedCoords.y),
    };
  }

  function pointerDown(event: PointerEvent) {
    displayCanvas.setPointerCapture(event.pointerId);
    handlePointerEvent(event);
  }

  function pointerUp(event: PointerEvent) {
    displayCanvas.releasePointerCapture(event.pointerId);
    handlePointerEvent(event);
  }

  function pointerLeave(event: PointerEvent) {
    clearToolPreview();
  }

  function handlePointerEvent(event: PointerEvent) {
    // Update properties of pointerState
    pointerState.previousPos = pointerState.position;
    pointerState.position = clientToSurfaceCoords({
      x: event.clientX,
      y: event.clientY,
    });

    let previousButton1 = pointerState.button1;
    pointerState.button1 = (event.buttons & 1) == 1;
    pointerState.previouslyDrawing = pointerState.drawing;
    if (
      previousButton1 == false &&
      pointerState.button1 == true &&
      event.type != "pointerenter"
    ) {
      pointerState.firstPos = pointerState.position;
      pointerState.drawing = true;
    } else if (previousButton1 == true && pointerState.button1 == false) {
      pointerState.drawing = false;
    }

    let previousButton3 = pointerState.button3;
    pointerState.button3 = (event.buttons & 4) == 4;
    if (
      previousButton3 == false &&
      pointerState.button3 == true &&
      event.type != "pointerenter"
    ) {
      pointerState.panning = true;
    } else if (previousButton3 == true && pointerState.button3 == false) {
      pointerState.panning = false;
    }

    const modifiersChanged = pointerState.ctrlModifier != event.ctrlKey || pointerState.altModifier != event.altKey || pointerState.shiftModifier != event.shiftKey;
    pointerState.ctrlModifier = event.ctrlKey;
    pointerState.altModifier = event.altKey;
    pointerState.shiftModifier = event.shiftKey;

    // Redraw tool preview
    const pointerMoved =
      pointerState.position.x != pointerState.previousPos.x ||
      pointerState.position.y != pointerState.previousPos.y;
    if (pointerMoved || modifiersChanged) refreshToolPreviewCanvas();

    // Handle tool usage
    switch (currentTool.applicationType) {
      case "click_drag":
        {
          if (
            pointerState.drawing &&
            (pointerMoved || !pointerState.previouslyDrawing)
          ) {
            draw();
          }
        }
        break;
      case "click_release":
        {
          if (!pointerState.drawing && pointerState.previouslyDrawing) {
            draw();
          }
        }
        break;
      case "single_click":
        {
          if (pointerState.drawing && !pointerState.previouslyDrawing) {
            draw();
          }
        }
        break;
      case "eyedropper":
        {
          if (pointerState.drawing) {
            // @ts-ignore
            let imageData: ImageData = surfaceCanvas
              .getContext("2d")
              ?.getImageData(
                pointerState.position.x,
                pointerState.position.y,
                1,
                1,
              );
            let newColor = {
              r: imageData.data[0],
              g: imageData.data[1],
              b: imageData.data[2],
              a: imageData.data[3],
            };
            if (newColor.a == 255) foregroundColor = newColor;
          }
        }
        break;
    }

    // Pan canvas
    if (
      pointerState.panning ||
      (pointerState.drawing && currentTool.applicationType == "pan")
    ) {
      const rect = displayCanvas.getClientRects()[0];
      // Pointer movement transformed to be relative to displayCanvas size
      let movement: Vec2 = {
        x: event.movementX * (displayCanvas.width / rect.width),
        y: event.movementY * (displayCanvas.height / rect.height),
      };

      displayTransform2D = composeTransforms(
        transformFromTranslation(movement.x, movement.y),
        displayTransform2D,
      );
      refreshDisplayCanvas();
    }
  }

  function wheel(event: WheelEvent) {
    let mousePos = clientToDisplayCanvasCoords({
      x: event.clientX,
      y: event.clientY,
    });
    let scaleFactor = 1 - Math.sign(event.deltaY) * 0.1;
    displayTransform2D = composeTransforms(
      transformFromTranslation(-mousePos.x, -mousePos.y),
      displayTransform2D,
    );
    displayTransform2D = composeTransforms(
      transformFromScaling(scaleFactor, scaleFactor),
      displayTransform2D,
    );
    displayTransform2D = composeTransforms(
      transformFromTranslation(mousePos.x, mousePos.y),
      displayTransform2D,
    );
    refreshDisplayCanvas();
  }

  // currently unused
  function promoteUser(username: string) {
    connection.send({
      type: "moderator",
      password: moderatorPassword.value,
      data: {
        type: "promote",
        username,
      },
    });
  }

  function kickUser(username: string) {
    connection.send({
      type: "moderator",
      password: moderatorPassword.value,
      data: {
        type: "kick",
        username,
      },
    });
  }

  function showIf(condition: boolean): string {
    return condition ? "#ffff" : "#fff0";
  }

  function downloadCanvas() {
    surfaceCanvas.convertToBlob().then((blob) => {
      let link = document.createElement("a");
      link.download = `${data.room}_exported.png`;
      link.href = window.URL.createObjectURL(blob);
      link.click();
      link.remove();
    });
  }

  function addPaletteColor() {
    palette.push(foregroundColor);
    connection.send({
      type: "palette",
      data: {
        type: "add",
        color: foregroundColor,
      },
    });
  }

  function removePaletteColor(index: number) {
    connection.send({
      type: "palette",
      data: {
        type: "remove",
        index,
      },
    });
  }
  function updateForegroundColor(newColor: Color) {
    foregroundColor = newColor;
  }

  function paletteHasColor(color: Color) {
    return (
      palette.find(
        (c) =>
          color.r == c.r && color.g == c.g && color.b == c.b && color.a == c.a,
      ) != undefined
    );
  }
</script>

<svelte:head>
  <link
    href="https://fonts.googleapis.com/css?family=VT323"
    rel="stylesheet"
    type="text/css"
  />
</svelte:head>

<div class="background">
  <img src={background} alt="whoops" />
</div>
<div class="drawingSpaceContainer">
  <div class="drawingSpace userListSpace">
    <div class="pixel"><p>JOIN CODE: {data.room}</p></div>
    {#each userList as user}
      {#if user.username == data.username}
        <div class="pixelUser flex flex-row">
          <div style="width:16px; min-width:16px">
            {#if user.moderator}
              <img src={crown} alt="Crown" />
            {/if}
          </div>
          <div class="grow overflow-hidden w-[8%]"><p>{user.username}</p></div>
          {#if user.username != data.username && moderatorPassword.value != ""}
            <button
              onclick={() => kickUser(user.username)}
              style="width:16px; min-width:16px"
            >
              <img src={x} alt="Circle" />
            </button>
          {/if}
        </div>
      {:else}
        <div class="pixel flex flex-row">
          <div style="width:16px; min-width:16px">
            {#if user.moderator}
              <img src={crown} alt="Crown" />
            {/if}
          </div>
          <div class="grow overflow-hidden w-[8%]"><p>{user.username}</p></div>
          {#if user.username != data.username && moderatorPassword.value != ""}
            <button
              onclick={() => kickUser(user.username)}
              style="width:16px; min-width:16px"
            >
              <img src={x} alt="Circle" />
            </button>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
  <div class="drawingSpace canvasSpace">
    <div class="flex flex-col p-2">
      <div class="pixel">
        <ColourPicker bind:color={foregroundColor}></ColourPicker>
      </div>
      <div class="pixel flex flex-col min-h-0 grow">
        <p class="text-xl">COLOUR PALETTE</p>
        <div class="pixelGrid w-[196px] grow">
          {#each palette as color, i}
            <button
              aria-label="rgb({color.r} {color.g} {color.b})"
              class="palette"
              style:background="rgb({color.r}
              {color.g}
              {color.b})"
              onclick={() => updateForegroundColor(color)}
              onpointerdown={(e) => {
                if (e.button == 2) removePaletteColor(i);
              }}
              oncontextmenu={(e) => {
                e.preventDefault();
              }}
            ></button>
          {/each}
        </div>
        <button
          class="pixelButton w-full"
          disabled={paletteHasColor(foregroundColor)}
          onclick={() => addPaletteColor()}><p>+</p></button
        >
      </div>
    </div>
    <canvas
      bind:this={displayCanvas}
      width="512"
      height="512"
      onpointerdown={pointerDown}
      onpointerup={pointerUp}
      onpointermove={handlePointerEvent}
      onpointerenter={handlePointerEvent}
      onpointerleave={pointerLeave}
      onwheel={wheel}
      oncontextmenu={(e) => {
        e.preventDefault();
      }}
    ></canvas>
    <div class="flex flex-col justify-between p-2 pt-3 w-[4vw] min-w-[60px]">
      <div class="flex flex-col gap-2">
        {#each tools as tool}
          <label class="pixelButton">
            <input type="radio" value={tool} bind:group={currentTool} hidden />
            <img src={tool.imgLink} alt="{tool.displayName} image" />
          </label>
        {/each}
      </div>
      <button class="pixelButton" onclick={downloadCanvas}>
        <img src={download} alt="Download" />
      </button>
    </div>
    <div class="flex flex-col gap-2 p-1 w-[5vw] min-w-[100px]">
      {#if currentTool.applicableSettings.has("brushSize")}
        <div class="pixel grid">
          <p class="w-full text-center text-xl">SIZE</p>
          <button
            onclick={() => (currentTool.settings.brushSize += 1)}
            class="pixelButton"
          >
            <p>+</p>
          </button>
          <div class="pixel"><p>{currentTool.settings.brushSize}</p></div>
          <button
            onclick={() =>
              (currentTool.settings.brushSize = Math.max(
                1,
                currentTool.settings.brushSize - 1,
              ))}
            class="pixelButton"
          >
            <p>-</p>
          </button>
        </div>
      {/if}
      {#if currentTool.applicableSettings.has("brushShape")}
        <div class="pixel grid">
          <p class="w-full text-center text-xl">SHAPE</p>
          <label class="pixelButton">
            <input
              type="radio"
              value={"Square"}
              bind:group={currentTool.settings.brushShape}
              hidden
            />
            <img src={rectangle} alt="Rectangle" />
          </label>
          <label class="pixelButton">
            <input
              type="radio"
              value={"Circle"}
              bind:group={currentTool.settings.brushShape}
              hidden
            />
            <img src={circle} alt="Circle" />
          </label>
        </div>
      {/if}
      {#if currentTool.applicableSettings.has("isFilled")}
        <div class="pixel grid">
          <p class="w-full text-center text-xl">FILLED</p>
          <label class="pixelButton">
            <input
              type="radio"
              value={true}
              bind:group={currentTool.settings.isFilled}
              hidden
            />
            <img src={box} alt="Box" />
          </label>
          <label class="pixelButton">
            <input
              type="radio"
              value={false}
              bind:group={currentTool.settings.isFilled}
              hidden
            />
            <img src={rectangle} alt="Rectangle" />
          </label>
        </div>
      {/if}
    </div>
  </div>
  <div class="drawingSpaceContainerSpacer"></div>
</div>

<style>
  .background {
    position: absolute;
    image-rendering: pixelated;
    width: 100%;
    height: 100%;
  }

  .background img {
    width: 100%;
    height: 100%;
    object-fit: fill;
    object-position: center;
  }

  .drawingSpaceContainer {
    position: absolute;
    display: flex;
    height: 100%;
    width: 100%;
    padding: 1rem 2rem;
    gap: 3%;
    justify-content: space-around;
  }

  canvas {
    border-style: solid;
    margin: 1rem;
    border-width: 4px;
    border-color: #6e6e6e #404040 #404040 #6e6e6e;
    image-rendering: pixelated;
  }

  .drawingSpace::before {
    content: "";
    display: block;
    position: absolute;
    top: 10px;
    bottom: 10px;
    left: -10px;
    right: -10px;
    background: linear-gradient(to right, #6e6e6e 50%, #404040 50%);
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
    background: #4f4f4f;
    border-style: solid;
    border-width: 4px;
    border-color: #6e6e6e #404040 #404040 #6e6e6e;
    z-index: -1;
  }

  .drawingSpace {
    position: relative;
    padding: 12px 12px 12px 16px;
    background: linear-gradient(to bottom, #6e6e6e 50%, #404040 50%);
    z-index: 2;
  }

  .pixelButton {
    position: relative;
    display: inline-block;
    vertical-align: top;

    cursor: pointer;

    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;

    font-family: "VT323";
    font-size: 15px;
    color: rgb(224, 224, 224);

    padding: 10px 10px;
    position: relative;
    background: linear-gradient(to bottom, #6e6e6e 50%, #404040 50%);
    z-index: 2;
  }

  .pixelButton:disabled p {
    color: rgb(138, 138, 138);
  }

  .pixelButton:active {
    top: 2px;
  }

  .pixelButton:has(input:checked) {
    padding: 10px 10px;
    position: relative;
    background: linear-gradient(to bottom, #a18965 50%, #503f26 50%);
    z-index: 2;
  }

  .pixelButton:has(input:checked)::before {
    content: "";
    display: block;
    position: absolute;
    top: 10px;
    bottom: 10px;
    left: -10px;
    right: -10px;
    background: linear-gradient(to right, #a18965 50%, #503f26 50%);
    z-index: -1;
  }

  .pixelButton:has(input:checked)::after {
    content: "";
    display: block;
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: -6px;
    right: -6px;
    background: #806947;
    border-style: solid;
    border-width: 4px;
    border-color: #a18965 #503f26 #503f26 #a18965;
    z-index: -1;
  }

  .pixelButton {
    position: relative;
    display: grid;
    margin: 4px;
    place-items: center;
  }

  .pixelButton::before {
    content: "";
    display: block;
    position: absolute;
    top: 10px;
    bottom: 10px;
    left: -10px;
    right: -10px;
    background: linear-gradient(to right, #6e6e6e 50%, #404040 50%);
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
    border-style: solid;
    border-width: 4px;
    border-color: #6e6e6e #404040 #404040 #6e6e6e;
    z-index: -1;
  }

  .pixel {
    position: relative;
    margin: 10px;
    place-items: center;

    font-family: "VT323";
    color: rgb(224, 224, 224);

    padding: 10px 10px;
    position: relative;
    background: linear-gradient(to bottom, #6e6e6e 50%, #404040 50%);
    z-index: 2;
  }

  .pixel::before {
    content: "";
    display: block;
    position: absolute;
    top: 10px;
    bottom: 10px;
    left: -10px;
    right: -10px;
    background: linear-gradient(to right, #6e6e6e 50%, #404040 50%);
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
    border-style: solid;
    border-width: 4px;
    border-color: #6e6e6e #404040 #404040 #6e6e6e;
    z-index: -1;
  }

  .pixelUser {
    position: relative;
    margin: 10px;
    place-items: center;
  }

  .pixelUser p {
    font-family: "VT323";
    font-size: 15px;
    color: rgb(224, 224, 224);
  }

  .pixelUser::before {
    content: "";
    display: block;
    position: absolute;
    top: 10px;
    bottom: 10px;
    left: -10px;
    right: -10px;
    background: linear-gradient(to right, #a18965 50%, #503f26 50%);
    z-index: -1;
  }

  .pixelUser::after {
    content: "";
    display: block;
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: -6px;
    right: -6px;
    background: #806947;
    border-style: solid;
    border-width: 4px;
    border-color: #a18965 #503f26 #503f26 #a18965;
    z-index: -1;
  }

  .pixelUser {
    padding: 10px 10px;
    position: relative;
    background: linear-gradient(to bottom, #a18965 50%, #503f26 50%);
    width: auto;
    z-index: 2;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: fill;
    object-position: center;
    image-rendering: pixelated;
  }

  .userListSpace {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    width: 10%;
  }

  .canvasSpace {
    display: flex;
    flex-direction: row;
    max-width: 90%;
  }

  .drawingSpaceContainerSpacer {
    width: 8%;
  }

  .palette:active {
    top: 2px;
  }

  .palette {
    content: "";
    display: block;
    border-style: solid;
    border-width: 4px;
    border-color: #6e6e6e #404040 #404040 #6e6e6e;
    position: relative;
    width: 28px;
    height: 28px;
  }

  .pixelGrid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(auto-fit, 28px);
    overflow: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .pixelGrid::-webkit-scrollbar {
    display: none;
  }
</style>
