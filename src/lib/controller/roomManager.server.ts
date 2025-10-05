import { Room } from "$lib/controller/room.server";
import type { Vec2 } from "$lib/useful/prims";

export class RoomManager {
  static instance(): RoomManager {
    return instance;
  }

  private rooms: Map<string, Room> = new Map;

  constructor() {
    this.rooms.set("testRoom", new Room("testRoom", { x: 32, y: 32 }));
  }

  // todo: create room id and return that instead
  public createRoom(roomName: string, size: Vec2): string | undefined {
    if (this.rooms.has(roomName)) return undefined;
    this.rooms.set(roomName, new Room(roomName, size));
    return roomName;
  }

  public getRoom(roomName: string): Room | undefined {
    return this.rooms.get(roomName);
  }
}

export const instance = new RoomManager();
