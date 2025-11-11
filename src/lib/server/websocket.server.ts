import { RoomManager } from "$lib/controller/roomManager.server";
import { User } from "$lib/model/user.server";
import type { ConnectPacket, Packet } from "$lib/network/packets";
import type { PluginOption, ViteDevServer } from "vite"
import WebSocket, { WebSocketServer } from "ws";

export class Server {
  private wss: WebSocketServer;
  constructor(server: ViteDevServer) {
    const wss = this.wss = new WebSocketServer({
      server: server.httpServer as any,
    });
    wss.on("connection", this.handleConnection);

    if (import.meta.hot) {
      import.meta.hot.accept((newWss) => {
        this.wss.clients.forEach(client => client.close(1000));
        wss.removeAllListeners("connection");
        console.log(newWss!.Server.prototype.handleConnection)
        wss.on("connection", newWss!.Server.prototype.handleConnection);
      });
    }
  }

  handleConnection(socket: WebSocket) {
    console.log("connected")
    socket.binaryType = "arraybuffer";
    let user: User | undefined = undefined;
    socket.on("message", (data, isBinary) => {
      if (isBinary) {
        socket.close(1007, "received unexpected binary message")
        console.warn("closed for binary message");
        return;
      }

      const INVALID_DATA = 1003;
      const packet: Packet = JSON.parse(new TextDecoder().decode(data as ArrayBuffer));

      if (user == undefined && packet.type != "connect") {
        socket.close(INVALID_DATA, "new connection didn't send a connect packet");
        console.warn("closed for no connect");
        return
      }

      if (user == undefined) {
        let connect: ConnectPacket = packet as any;
        const room = RoomManager.instance().getRoom(connect.room);
        if (room == undefined) {
          socket.close(INVALID_DATA, "room does not exist");
          console.warn("closed for no room");
          return;
        }
        user = new User(connect.name, room, socket);
        return;
      }

      console.log('for user', user.name, packet);
      console.log();
      switch (packet.type) {
        case "operation":
          user.room.handleOperation(packet, user);
          break;
        case "moderator":
          user.room.handleModerator(packet, user);
          break;
        case "palette":
          user.room.handlePalette(packet);
          break;
      }
    });

    socket.on("close", (code, reason) => {
      console.log("closed", code, reason.toString("utf-8"));

      if (user == undefined) return;

      user.room.users.update((users) => {
        if (users.get(user!.name) == user)
          users.delete(user!.name);

        return users;
      })
    });
  }
}
