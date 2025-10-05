import type { Packet } from "$lib/useful/packets";
import type { WebSocket } from "ws";
import type { Room } from "../controller/room.server";

export class User {
  constructor(
    public name: string,
    public room: Room,
    private socket: WebSocket
  ) {
    room.users.update(users => {
      users.set(name, this);
      return users;   
    })
  }

  public send(packet: Packet) {
    this.socket.send(JSON.stringify(packet));
  }
}
