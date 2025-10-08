import type { Vec2 } from "$lib/network/prims";
import { Canvas } from "skia-canvas";
import { Surface } from "../model/surface";
import { cachedWritable, subscribe, type CachedWritable } from "$lib/util/stores";
import type { User } from "../model/user.server";
import type { Operation } from "$lib/network/operation";
import type { OperationPacket, Packet } from "$lib/network/packets";

export type UserOperation = {
  username: string,
  operation: Operation
};

export class Room {
  private canvas: Canvas;
  private surface: CachedWritable<Surface>;
  private changes: CachedWritable<UserOperation[]> = cachedWritable([]);
  public users: CachedWritable<Map<string, User>> = cachedWritable(new Map);

  constructor(private id: string, size: Vec2) {
    // todo: add the ability to load from filesystem
    this.canvas = new Canvas(size.x, size.y);
    this.surface = cachedWritable(new Surface(size, this.canvas.getContext("2d")));

    // if the users list or the surface changes, sync changes to the user
    subscribe([this.surface, this.users], ([_surface, _users]) => {
      console.log("broadcasting surface");
      this.broadcast({
        type: "sync",
        url: this.canvas.toDataURL("png")
      })
    });

    this.changes.subscribe(changes => {
      this.surface.update(surface => {
        console.log("applying changes to surface");
        surface.clear();
        for (let change of changes)
          surface.handleOperation(change.operation);

        return surface;
      })
    });
  }

  public broadcast(packet: Packet, fromUser?: string) {
    this.users.value.forEach(user => {
      if (user.name == fromUser) return;
      user.send(packet);
    });
  }

  public handleOperation(packet: OperationPacket, user: User) {
    this.changes.update(changes => {
      changes.push({ username: user.name, operation: packet.operation });
      return changes;
    })
  }
}
