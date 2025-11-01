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
  async function createRoom() {
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
      if (res.status !== 201) {
        console.error("failed...", res.statusText);
        return;
      }
      let json = await res.json();
      const { roomId, moderatorPassword } = json;
      console.log(json);
      localStorage.setItem(`${roomId}.password`, moderatorPassword);
      goto(`/testing/${roomId}/${username.value}`);
    } catch (e) {
      console.error(e);
    }

    requesting = false;
  }

  // function joinRoom() {
  //   goto(`/testing/${roomId}`)
  // }
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
    <!-- temporary trash ui -->
    <div class="pixelButton buttons">
      <label for="username">Username: </label>
      <input type="text" id="username" bind:value={$username} />
      <label for="roomName">Room name: </label>
      <input type="text" id="roomName" bind:value={roomName} />
      <label for="width">Width: </label>
      <input type="text" id="width" bind:value={$width} />
      <label for="height">Height: </label>
      <input type="text" id="height" bind:value={$height} />
      <label for="joinCode">Join Code: </label>
      <input type="text" id="joinCode" bind:value={joinCode} />
    </div>
    <div class="buttons">
      <button
        type="button"
        class="pixelButton"
        disabled={requesting || $username.length == 0 || roomName.length == 0}
        onclick={createRoom}
      >
        <p>Create Room</p>
      </button>
      <button class="pixelButton">
        <p>Join Room</p>
      </button>
    </div>
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
    grid-template-rows: 2fr 1fr 1fr 2fr;
    gap: 20px;
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
    font-size: clamp(2rem, 3vw, 100rem);
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
</style>
