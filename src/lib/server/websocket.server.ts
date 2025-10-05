import type { PluginOption, ViteDevServer } from "vite"
import { WebSocketServer } from "ws";

export class Server {
  constructor(server: ViteDevServer) {
    const wss = new WebSocketServer({
      server: server.httpServer as any,
    });
    wss.on("connection", socket => {
      console.log("connected")
      socket.binaryType = "arraybuffer";
      socket.on("message", (data, isBinary) => {
        if (isBinary) {
          console.error("received binary message");
          return;
        }

        const json = JSON.parse(new TextDecoder().decode(data as ArrayBuffer));
        console.log(json);
      })
    });
  }
  
}

export const websocketServer: PluginOption = {
  name: "Websocket Server",
  configureServer: server => {
    new Server(server);
  }
}
