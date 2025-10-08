<script lang="ts">
  import { Connection } from "$lib/controller/connection.client";
  import type { Vec2 } from "$lib/network/prims";
  import { onMount } from "svelte";
  import type { PageProps } from "./$types";
  import { Surface } from "$lib/model/surface";
  import type { Operation } from "$lib/packets/operation";

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

  let lastPos = { x: -1, y: -1 };

  function handleOperation(operation: Operation) {
    surface.handleOperation(operation);
    connection.send({
      type: "operation",
      operation,
    });
  }

  let drawing = false;
  function draw(event: PointerEvent) {
    const rect = canvas.getClientRects()[0];
    // console.log(rect.left, canvas.offsetLeft, event.clientX);
    const position = {
      x: Math.floor((event.clientX - rect.left) / (rect.width / canvas.width)),
      y: Math.floor((event.clientY - rect.top) / (rect.height / canvas.height)),
    };
    if (position.x == lastPos.x && position.y == lastPos.y) return;
    lastPos = position;
    console.log(event.type, position);
    handleOperation({
      type: "pencil",
      position,
      diameter: 1,
      color: "cornflowerblue",
    });
  }

  function pointerDown(event: PointerEvent) {
    drawing = true;
    draw(event);
  }

  function pointerUp(_event: PointerEvent) {
    drawing = false;
    lastPos = { x: -1, y: -1 };
  }

  function pointerMove(event: PointerEvent) {
    if (!drawing) return;
    draw(event);
  }
</script>

<div class="flex justify-center content-center h-full w-full">
  <canvas
    bind:this={canvas}
    width="32"
    height="32"
    onpointerdown={pointerDown}
    onpointerup={pointerUp}
    onpointermove={pointerMove}
  ></canvas>
</div>

<style>
  canvas {
    outline: auto 20px cornflowerblue;
    width: 50%;
    image-rendering: pixelated;
  }
</style>
