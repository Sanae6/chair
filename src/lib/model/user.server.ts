import type { Packet } from "$lib/network/packets";
import type { WebSocket } from "ws";
import type { Room } from "./room.server";

export class User {
  private interval: NodeJS.Timeout;
  constructor(
    public name: string,
    public room: Room,
    private socket: WebSocket
  ) {
    console.log("user ctor");
    this.send({
      type: "connected",
      size: room.size
    });

    room.users.update(users => {
      users.set(name, this);
      return users;
    });

    this.interval = setInterval(() => this.send({ type: "ping" }), 5000);
  }

  public kick() {
    this.send({ type: "kicked" })
    this.socket.close(1000)
  }

  public send(packet: Packet) {
    this.socket.send(JSON.stringify(packet));
  }

  public closed() {
    clearInterval(this.interval);
  }
}
