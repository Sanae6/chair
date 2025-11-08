import type { Vec2 } from "$lib/network/prims";
import { Canvas } from "skia-canvas";
import { Surface } from "./surface";
import { cachedWritable, subscribe, type CachedWritable } from "$lib/util/stores";
import type { User } from "./user.server";
import type { Operation } from "$lib/network/operation";
import type { ModeratorPacket, OperationPacket, Packet } from "$lib/network/packets";

export type UserOperation = {
  username: string,
  operation: Operation
};

export class Room {
  private canvas: Canvas;
  private surface: CachedWritable<Surface>;
  private changes: CachedWritable<UserOperation[]> = cachedWritable([]);
  public moderatorPassword: string = Date.now().toString(); // good enough lol
  public users: CachedWritable<Map<string, User>> = cachedWritable(new Map);
  public moderators: CachedWritable<Set<string>> = cachedWritable(new Set);

  constructor(public id: string, public size: Vec2, creator: string) {
    this.moderators.update(mods => mods.add(creator));
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
      });

      if (changes.length >= 50) {
        this.changes.set([{
          username: changes.at(-1)!.username,
          operation: {
            type: "wholeImage",
            url: this.canvas.toDataURL("png")
          }
        }]);
      }
    });

    subscribe([this.moderators, this.users], ([moderators, users]) => {
      this.broadcast({
        type: "userList",
        users: users.keys()
          .map(username => ({ username, moderator: moderators.has(username) }))
          .toArray()
      })
    })
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

  public handleModerator(packet: ModeratorPacket, user: User) {
    console.log("piss", packet);
    if (packet.password !== this.moderatorPassword)
      return;

    switch (packet.data.type) {
      case "promote": {
        if (user.name !== packet.data.username)
          this.promoteUser(packet.data.username);
        break;
      }
      case "kick": {
        if (user.name !== packet.data.username)
          this.kickUser(packet.data.username);
        break;
      }
    }
  }


  public promoteUser(newModerator: string) {
    this.moderators.value.add(newModerator);
    this.users.value.get(newModerator)?.send({
      type: "promoted",
      password: this.moderatorPassword,
    })
  }

  public kickUser(username: string) {
    console.log("kicking user", username);

    this.users.value.get(username)?.kick();
  }
}
