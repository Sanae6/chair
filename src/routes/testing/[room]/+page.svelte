<script lang="ts">
  import { Connection } from "$lib/controller/connection.client";
    import type { Vec2 } from "$lib/useful/prims";
  import { onMount } from "svelte";

  let canvas: HTMLCanvasElement;
  let connection: Connection;

  let { room } = $props();

  onMount(async () => {
    connection = await Connection.connect(room);
  });

  let drawing = false;
  function draw(event: PointerEvent) {
    const rect = canvas.getClientRects()[0];
    console.log(rect.left, canvas.offsetLeft, event.clientX);
    const position = {
      x: Math.floor((event.clientX - rect.left) / (rect.width / canvas.width)),
      y: Math.floor((event.clientY - rect.top) / (rect.height / canvas.height)),
    }
    console.log(event.type, position);
    connection.send({
      type: "operation",
      operation: {
        type: "pencil",
        position,
        diameter: 1,
        color: "#F00F0F"
      }
    })
  }
  function pointerDown(event: PointerEvent) {
    drawing = true;
    draw(event);
  }
  function pointerUp(event: PointerEvent) {
    drawing = false;
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
  }
</style>
