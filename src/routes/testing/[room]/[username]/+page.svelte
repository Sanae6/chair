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

<div class="flex justify-center content-center h-full w-full">
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
    <button onclick={() => currentTool = tool} class="border-2 border-solid p-1">
      {tool.displayName}
    </button>
  {/each}
  </div>
  <div class="flex flex-col gap-2 p-1">
  {#if currentTool.applicableSettings.has("brushSize")}
  <button onclick={() => currentTool.settings.brushSize += 1} class="border-2 border-solid p-1">
    Increase Brush Size
  </button>
  {currentTool.settings.brushSize}
  <button onclick={() => currentTool.settings.brushSize = Math.max(1, currentTool.settings.brushSize - 1)} class="border-2 border-solid p-1">
    Decrease Brush Size
  </button>
  {/if}
  </div>

</div>

<style>
  canvas {
    outline: auto 20px cornflowerblue;
    width: 50%;
    image-rendering: pixelated;
  }
</style>
