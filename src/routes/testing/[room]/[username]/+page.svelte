<script lang="ts">
  import { Connection } from "$lib/controller/connection.client";
  import type { Color, Vec2 } from "$lib/network/prims";
  import { onMount } from "svelte";
  import type { PageProps } from "./$types";
  import { Surface } from "$lib/model/surface";
  import type { Operation } from "$lib/network/operation";
  import { defaultToolSettings, tools, type Tool } from "$lib/controller/tool";
  import { preventDefault } from "svelte/legacy";
    import { toEditorSettings } from "typescript";
  import background from '$lib/assets/background.png';

  let canvas: HTMLCanvasElement;
  let connection: Connection;
  let surface: Surface;

  let { data }: PageProps = $props();

  onMount(async () => {
    connection = await Connection.connect(data.username, data.room, canvas);
    surface = new Surface({ x: 32, y: 32 }, canvas.getContext("2d")!);
    surface.clear();
    connection.setHandler("sync", (packet) => {
      console.log("received sync", packet);
      surface.handleSync(packet.url);
    });
  });

  let firstPos = { x: -1, y: -1 };
  let previousPos = { x: -1, y: -1 };
  let currentTool: Tool = $state(tools[0]);

  function handleOperation(operation: Operation) {
    surface.handleOperation(operation);
    connection.send({
      type: "operation",
      operation,
    });
  }

  let drawing = false;
  function draw(event: MouseEvent) {
    const rect = canvas.getClientRects()[0];
    
    const position = clientToCanvasCoords({x: event.clientX, y: event.clientY});
    if (position.x == previousPos.x && position.y == previousPos.y) return;
    previousPos = position;

    // todo: replace with actual variable that controls colour
    let color: Color = "cornflowerblue";
    
    if (currentTool.generateOperation != undefined) {
      handleOperation(currentTool.generateOperation(firstPos, position, color));
    }
    if (currentTool.clientOperation != undefined) {
      currentTool.clientOperation();
    }
  }

  function clientToCanvasCoords(clientPos: Vec2): Vec2 {
    const rect = canvas.getClientRects()[0];
    return {
      x: Math.floor((clientPos.x - rect.left) / (rect.width / canvas.width)),
      y: Math.floor((clientPos.y - rect.top) / (rect.height / canvas.height)),
    };
  }

  function mouseDown(event: MouseEvent) {
    if ((event.buttons & 1) != 1) return;
    drawing = true;

    firstPos = clientToCanvasCoords({x: event.clientX, y: event.clientY});
    if (currentTool.applicationType == "click_drag" || currentTool.applicationType == "single_click") {
      draw(event);
    }
  }

  function mouseUp(event: MouseEvent) {
    if (drawing && currentTool.applicationType == "click_release") {
      draw(event);
    }

    drawing = false;
    firstPos = { x: -1, y: -1 };
    previousPos = { x: -1, y: -1 };
  }

  function mouseMove(event: MouseEvent) {
    if ((event.buttons & 1) != 1 || !drawing) return;
    if (currentTool.applicationType == "click_drag") {
      draw(event);
    }
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
        bind:this={canvas}
        width="32"
        height="32"
        onmousedown={mouseDown}
        onmouseup={mouseUp}
        onmousemove={mouseMove}
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
