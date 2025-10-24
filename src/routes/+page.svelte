<script lang="ts">
  import background from '$lib/assets/background.png';
  import Title from '$lib/assets/title.png';
</script>

<link href='https://fonts.googleapis.com/css?family=VT323' rel='stylesheet' type='text/css'>

<div class="background">  
    <img src = {background} alt = "background"/>
</div>

<div class="overlay">
  <div class="side"></div>
  <div class="center">
    <div></div>
    <div class="title">
      <img src = {Title} alt = "Pixel Pals Title"/>
    </div>
    <div class="buttons">
      <button class="pixelButton">
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
    display:grid;
    grid-template-columns: 1fr 3fr 1fr;
    grid-template-rows: 100%;
    gap: 20px;
  }
  
  .side{
    height:100vh;
  }

  .center{
    height:100vh;
    display:grid;
    grid-template-rows:2fr 1fr 1fr 2fr;
    gap: 20px;
  }

  .title{
    image-rendering:pixelated;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .title img{
    width:100%;
    object-fit: fill;
    object-position: center;
  }

  .buttons{
    display:grid;
    grid-template-columns:auto auto;
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
    place-items:center;
  }

  .pixelButton p{
    font-family: 'VT323';
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

</style>