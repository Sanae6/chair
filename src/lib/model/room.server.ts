import type { Color, Vec2 } from "$lib/network/prims";
import { Canvas } from "skia-canvas";
import { Surface } from "./surface";
import { cachedWritable, subscribe, type CachedWritable } from "$lib/util/stores";
import type { User } from "./user.server";
import type { Operation } from "$lib/network/operation";
import type { ModeratorPacket, OperationPacket, Packet, PalettePacket } from "$lib/network/packets";
import type { Database } from "sql.js";

export type UserOperation = {
  username: string,
  operation: Operation
};

export type RoomSchema = {
  image: string,
  size: Vec2,
  moderators: string[],
  palette: Color[],
  moderatorPassword: string;
};

export class Room {
  private canvas: Canvas;
  private surface: CachedWritable<Surface>;
  private changes: CachedWritable<UserOperation[]> = cachedWritable([]);
  public palette: CachedWritable<Color[]> = cachedWritable([]);
  public moderatorPassword: string = Date.now().toString(); // good enough lol
  public users: CachedWritable<Map<string, User>> = cachedWritable(new Map);
  public moderators: CachedWritable<Set<string>> = cachedWritable(new Set);

  constructor(public id: string, public size: Vec2, database: CachedWritable<Database>, json?: RoomSchema) {
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
      const start = performance.now();
      this.surface.update(surface => {
        console.log("applying changes to surface");
        surface.clear();
        for (let change of changes)
          surface.handleOperation(change.operation);

        return surface;
      });
      console.log("surface timing", performance.now() - start);

      if (changes.length >= 50) {
        this.changes.set([
          {
            username: changes.at(-1)!.username,
            operation: {
              type: "wholeImage",
              url: this.canvas.toDataURL("png")
            }
          }
        ]);
      }
    });

    subscribe([this.moderators, this.users], ([moderators, users]) => {
      this.broadcast({
        type: "userList",
        users: users.keys()
          .map(username => ({ username, moderator: moderators.has(username) }))
          .toArray()
      })
    });

    subscribe([this.palette, this.users], ([palette, _]) => {
      this.broadcast({
        type: "palette",
        data: {
          type: "sync",
          colors: palette
        }
      });
    });

    if (json) {
      this.moderators.set(new Set(json.moderators));
      this.palette.set(json.palette);
      this.moderatorPassword = json.moderatorPassword;

      this.changes.set([
        {
          username: "",
          operation: {
            type: "wholeImage",
            url: json.image
          }
        }
      ]);
    }

    subscribe([this.surface, this.palette, this.moderators], ([_surface, palette, moderators]) => {
      database.update(db => {
        if (db === undefined) return db;
        try {
          db.run("INSERT INTO rooms VALUES (?1, ?2) ON CONFLICT DO UPDATE SET json = excluded.json;",
            [id, JSON.stringify({
              size,
              image: this.canvas.toDataURL("png"),
              moderatorPassword: this.moderatorPassword,
              moderators: [...moderators],
              palette
            } as RoomSchema)]);
        } catch (error) {
          console.error(error);
          // throw "sad";
        }
        return db;
      });
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
    if (packet.password !== this.moderatorPassword || !this.moderators.value.has(user.name))
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
    this.moderators.update(moderator => {
      moderator.add(newModerator);
      return moderator;
    });
    this.users.update(users => {

      users.get(newModerator)?.send({
        type: "promoted",
        password: this.moderatorPassword,
      });
      return users;
    })
  }

  public kickUser(username: string) {
    console.log("kicking user", username);

    this.users.value.get(username)?.kick();
  }

  public handlePalette(packet: PalettePacket) {
    switch (packet.data.type) {
      case "add": {
        const color = packet.data.color;
        this.palette.update((palette) => {
          palette.push(color);
          return palette
        })
      } break;
      case "remove": {
        const index = packet.data.index;
        this.palette.update((palette) => {
          try { palette.splice(index, 1); } catch (e) {
            console.error("user sent an invalid palette index", e);
          }
          return palette
        });
      } break;
    }
  }
}
