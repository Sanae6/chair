import { Room } from "$lib/controller/room.server";
import type { Vec2 } from "$lib/network/prims";

export class RoomManager {
  static instance(): RoomManager {
    return instance;
  }

  private rooms: Map<string, Room> = new Map;

  constructor() {
    // this.rooms.set("test", new Room("test", { x: 32, y: 32 }, "ourbie"));
  }

  // todo: create room id and return that instead
  public createRoom(roomName: string, size: Vec2, roomCreator: string): { roomId: string, moderatorPassword: string } | undefined {
    if (this.rooms.has(roomName)) return undefined;
    const room = new Room(roomName, size, roomCreator);
    this.rooms.set(roomName, room);
    return { roomId: room.id, moderatorPassword: room.moderatorPassword };
  }

  public getRoom(roomName: string): Room | undefined {
    return this.rooms.get(roomName);
  }
}

export const instance = new RoomManager();
