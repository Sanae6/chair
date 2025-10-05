import { Room } from "$lib/model/room.server";
import type { Vec2 } from "$lib/useful/prims";

export class RoomManager {
  static instance(): RoomManager {
    return instance;
  }

  private rooms: Map<string, Room> = new Map;

  // todo: create room id and return that instead
  public createRoom(roomName: string, size: Vec2): string {
    this.rooms.set(roomName, new Room(roomName, size));
    return roomName;
  }
}

export const instance = new RoomManager();
