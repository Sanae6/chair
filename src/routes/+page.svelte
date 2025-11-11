<script lang="ts">
  import { goto } from "$app/navigation";
  import background from "$lib/assets/background.png";
  import Title from "$lib/assets/title.png";
  import { localStore } from "$lib/util/stores";

  let username = localStore("username", "");
  let roomName = $state("");
  let width = localStore("lastWidth", 64, parseInt);
  let height = localStore("lastHeight", 64, parseInt);
  let joinCode = $state("");

  let requesting = $state(false);
  let lastError: string | undefined = $state(undefined);

  async function createRoom() {
    if (requesting) return false;

    requesting = true;

    try {
      const url = new URL("/api/createRoom", location.href);
      url.search = new URLSearchParams({
        name: roomName,
        creatorName: username.value,
        width: width.value.toString(),
        height: height.value.toString(),
      }).toString();
      console.log(url);

      const res = await fetch(url, {
        method: "POST",
      });
      let json = await res.json();
      if (res.status !== 201) {
        lastError = json.message;
      } else {
        const { roomId, moderatorPassword } = json;
        console.log(json);
        localStorage.setItem(`${roomId}.password`, moderatorPassword);
        goto(`/testing/${roomId}/${username.value}`);
      }
    } catch (e) {
      console.error(e);
    }

    requesting = false;
  }

  async function joinRoom() {
    if (requesting) return false;

    requesting = true;
    try {
      const url = new URL("/api/joinRoom", location.href);
      url.search = new URLSearchParams({ joinCode }).toString();
      const res = await fetch(url, { method: "GET" });
      if (res.status !== 200) {
        const json = await res.json();
        lastError = json.message;
      } else goto(`/testing/${joinCode}/${username.value}`);
    } catch (e) {
      console.error(e);
    }
    requesting = false;
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
  <img src={background} alt="background" />
</div>

<div class="overlay">
  <div class="side"></div>
  <div class="center">
    <div></div>
    <div class="title">
      <img src={Title} alt="Pixel Pals Title" />
    </div>
    <div class="pixel">
      <label for="username">USERNAME:</label>
      <input type="text" id="username" bind:value={$username} maxlength="12"/>
    </div>
    <div class="buttons">
      <div class="pixel">
        <label for="roomName">ROOM NAME:</label>
        <input type="text" id="roomName" bind:value={roomName} />
        <label for="width">W:</label>
        <input type="text" id="width" bind:value={$width} />
        <label for="height">H:</label>
        <input type="text" id="height" bind:value={$height} />
      </div>
      <button
        type="button"
        class="pixelButton"
        disabled={requesting ||
          $username.length == 0 ||
          roomName.length == 0 ||
          $width <= 0 ||
          $height <= 0}
        onclick={createRoom}
      >
        <p>CREATE ROOM</p>
      </button>
    </div>
    <div class="buttons">
      <div class="pixel">
        <label for="joinCode">JOIN CODE:</label>
        <input type="text" id="joinCode" bind:value={joinCode} />
      </div>
      <button
        type="button"
        class="pixelButton"
        disabled={requesting || $username.length == 0 || joinCode.length == 0}
        onclick={joinRoom}
      >
        <p>JOIN ROOM</p>
      </button>
    </div>
    {#if lastError}
    <div id="error-message"  class="pixel">
        <p>{lastError.toUpperCase()}</p>
    </div>
    {/if}
    <div></div>
  </div>
  <div class="side"></div>
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

  .overlay {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 3fr 1fr;
    grid-template-rows: 100%;
    gap: 20px;
  }

  .side {
    height: 100vh;
  }

  .center {
    height: 100vh;
    display: grid;
    grid-template-rows: 2fr 1fr 1fr 1fr 1fr 1fr 2fr;
    gap: 5px;
  }

  .title {
    image-rendering: pixelated;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .title img {
    width: 100%;
    object-fit: fill;
    object-position: center;
  }

  .buttons {
    display: grid;
    grid-template-columns: auto auto;
    gap: 20px;
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
    font-size: clamp(2rem, 3vw, 100rem);
    color: rgb(224, 224, 224);
  }

  .pixelButton:disabled > p {
    color: rgb(100, 100, 100);
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
    display: flex;
    white-space: nowrap;
    gap: 1rem;
    margin: 10px;
    place-items: center;
    text-align: center;
  }

  .pixel label {
    font-family: "VT323";
    font-size: clamp(1rem, 3vw, 2rem);
    color: rgb(224, 224, 224);
  }

  .pixel input {
    font-family: "VT323";
    font-size: 20px;
    color: rgb(224, 224, 224);
    width: 100%;
    background-color: #2e2e2e;
    padding: 8px 10px;
    border-radius: 5px;
  }

  .pixel p {
    font-family: "VT323";
    font-size: clamp(1rem, 3vw, 2rem);
    color: rgb(255, 123, 0);
    text-align: center;
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
