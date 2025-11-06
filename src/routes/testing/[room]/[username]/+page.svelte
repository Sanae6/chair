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
  import { tools, type Tool } from "$lib/controller/tool";
  import background from "$lib/assets/background.png";
  import { applyInverseTransform } from "$lib/network/prims";
  import type { MouseState } from "$lib/util/mouseState";
  import { localStore } from "$lib/util/stores";
  import { goto } from "$app/navigation";

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

    let [newConnection, connectedPacket] = await Connection.connect(
      data.username,
      data.room,
    );
    connection = newConnection;
    canvasSize = connectedPacket.size;
    if (canvasSize.x > canvasSize.y) { // This condition needs to be changed if the display canvas isn't square
      displayTransform2D = transformFromScaling(512/canvasSize.x, 512/canvasSize.x);
      // Offset to center canvas
      displayTransform2D = composeTransforms(displayTransform2D, transformFromTranslation(0, (canvasSize.x-canvasSize.y)/2));
    } else {
      displayTransform2D = transformFromScaling(512/canvasSize.y, 512/canvasSize.y);
      displayTransform2D = composeTransforms(displayTransform2D, transformFromTranslation((canvasSize.y-canvasSize.x)/2, 0));
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
      goto("/");
    });
    connection.setHandler("close", () => {
      if (kickedFirst) return;
      alert("connection closed!");
      goto("/");
    })
  });

  let mouseState: MouseState = {
    position: { x: -1, y: -1 },
    firstPos: { x: -1, y: -1 },
    previousPos: { x: -1, y: -1 },
    drawing: false,
    previouslyDrawing: false
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
    const color1: Color = "#777777";
    const color2: Color = "#bbbbbb";
    const gridTileWidth: number = 4;
    for (let y = 0; y < Math.ceil(canvasSize.y / gridTileWidth); y++) {
      for (let x = 0; x < Math.ceil(canvasSize.x / gridTileWidth); x++) {
        backgroundCtx.fillStyle = (x + y) % 2 == 0 ? color1 : color2;
        backgroundCtx.fillRect(
          x * gridTileWidth,
          y * gridTileWidth,
          gridTileWidth,
          gridTileWidth,
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

      // todo: replace with actual variable that controls colour
      let color: Color = "cornflowerblue";
      toolPreviewCtx.clearRect(0, 0, canvasSize.x, canvasSize.y);
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
    const unroundedCoords = applyInverseTransform(
      displayTransform2D,
      displayCanvasCoords,
    );
    return {
      x: Math.floor(unroundedCoords.x),
      y: Math.floor(unroundedCoords.y),
    };
  }

  function mouseDown(event: MouseEvent) {
    if ((event.buttons & 1) != 1) return;

    mouseState.previouslyDrawing = mouseState.drawing;
    mouseState.drawing = true;
    mouseState.firstPos = clientToSurfaceCoords({
      x: event.clientX,
      y: event.clientY,
    });

    if (
      currentTool.applicationType == "click_drag" ||
      currentTool.applicationType == "single_click"
    ) {
      draw(event);
    }
  }

  function mouseUp(event: MouseEvent) {
    if (mouseState.drawing && currentTool.applicationType == "click_release") {
      draw(event);
    }

    mouseState.previouslyDrawing = mouseState.drawing;
    mouseState.drawing = false;
  }

  function mouseMove(event: MouseEvent) {
    mouseState.position = clientToSurfaceCoords({
      x: event.clientX,
      y: event.clientY,
    });
    mouseState.previousPos = clientToSurfaceCoords({
      x: event.clientX - event.movementX,
      y: event.clientY - event.movementY,
    });

    refreshToolPreviewCanvas();

    mouseState.previouslyDrawing = mouseState.drawing;

    if (
      (event.buttons & 1) == 1 &&
      currentTool.applicationType == "click_drag" &&
      mouseState.drawing
    ) {
      if (
        mouseState.position.x != mouseState.previousPos.x ||
        mouseState.position.y != mouseState.previousPos.y
      ) {
        draw(event);
      }
    } else if (
      (event.buttons & 4) == 4 ||
      ((event.buttons & 1) == 1 && currentTool.applicationType == "pan")
    ) {
      const rect = displayCanvas.getClientRects()[0];
      // Mouse movement transformed to be relative to displayCanvas size
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

  function mouseLeave(event: MouseEvent) {
    mouseState.previouslyDrawing = false;
    mouseState.drawing = false;
    clearToolPreview();
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
<div class="drawingSpace">
  <div class="overlay">
    <div class="flex justify-center content-around h-full w-full">
      <div class="flex flex-col p-2">
        <div>Join code: {data.room}</div>
        {#each userList as user}
          <div class="flex flex-row">
            <button
              onclick={() => kickUser(user.username)}
              style:color={showIf(user.username != data.username &&
                moderatorPassword.value != "")}>🦶</button
            >
            <div style:color={showIf(user.moderator)}>👑</div>
            <div>{user.username}</div>
          </div>
        {/each}
      </div>
      <canvas
        bind:this={displayCanvas}
        width="512"
        height="512"
        onmousedown={mouseDown}
        onmouseup={mouseUp}
        onmousemove={mouseMove}
        onmouseleave={mouseLeave}
        onwheel={wheel}
        oncontextmenu={(e) => {
          e.preventDefault();
        }}
      ></canvas>
      <div class="flex flex-col gap-2 p-2">
        {#each tools as tool}
          <button onclick={() => (currentTool = tool)} class="pixelButton">
            <p>{tool.displayName}</p>
          </button>
        {/each}
      </div>
      <div class="flex flex-col gap-2 p-1">
        <div>
          {#if currentTool.applicableSettings.has("brushSize")}
            <div class="pixel"><p>Brush Size</p></div>
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
    height: 100%;
    image-rendering: pixelated;
  }

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
    position: fixed;
    object-position: center;
    padding: 12px 12px 12px 16px;
    height: 100%;
    width: 66%;
    margin-left: 17%;
    margin-right: 17%;
    object-fit: fill;
    background: linear-gradient(to bottom, #6e6e6e 50%, #404040 50%);
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
    place-items: center;
  }

  .pixelButton p {
    font-family: "VT323";
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

  .pixelButton {
    padding: 10px 10px;
    position: relative;
    background: linear-gradient(to bottom, #6e6e6e 50%, #404040 50%);
    width: auto;
    z-index: 2;
  }

  .pixel {
    position: relative;
    display: grid;
    margin: 10px;
    place-items: center;
  }

  .pixel p {
    font-family: "VT323";
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

  .pixel {
    padding: 10px 10px;
    position: relative;
    background: linear-gradient(to bottom, #6e6e6e 50%, #404040 50%);
    width: auto;
    z-index: 2;
  }
</style>
