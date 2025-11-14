import { Room, type RoomSchema } from "$lib/model/room.server";
import type { Vec2 } from "$lib/network/prims";
import { cachedWritable, subscribe, type CachedWritable } from "$lib/util/stores";
import initSqlJs, { type Database, type SqlJsStatic, type Statement } from 'sql.js';
import fs from "fs";

export class RoomManager {
  static instance(): RoomManager {
    return instance;
  }

  private SQL: SqlJsStatic = undefined!;
  private database: CachedWritable<Database> = cachedWritable(undefined!);

  constructor() {
    this.database.subscribe((db) => {
      if (db === undefined) return;
      fs.writeFileSync("database.db", db.export());
    });

    if (import.meta.hot) {
      this.SQL = import.meta.hot.data.sql;
    }

    if (!this.SQL) {
      initSqlJs().then(v => {
        this.SQL = v;
        if (import.meta.hot) import.meta.hot.data.sql = v;
        this.setupDatabase();
      });
    } else this.setupDatabase();
  }

  private setupDatabase() {
    let database;
    if (fs.existsSync("database.db")) {
      console.log("existing database");
      database = (new this.SQL.Database(fs.readFileSync("database.db")));
    } else {
      console.log("new database");
      database = (new this.SQL.Database());
      database.run(`CREATE TABLE rooms(name char primary key, json char)`);
    }

    let rooms = database.exec("SELECT name, json FROM rooms");
    // console.log(rooms);
    this.database.set(database);
    if (rooms[0]) for (const [name, jsonString] of rooms[0].values) {
      const json = JSON.parse(jsonString as string) as RoomSchema;
      
      this.rooms.set(name as string, new Room(name as string, json.size, this.database, json))
    }
  }

  private rooms: Map<string, Room> = new Map;

  // todo: create room id and return that instead
  public createRoom(roomName: string, size: Vec2, roomCreator: string): { roomId: string, moderatorPassword: string } | undefined {
    if (this.rooms.has(roomName)) return undefined;
    const room = new Room(roomName, size, this.database);

    room.moderators.update(mods => {
      mods.add(roomCreator);
      return mods;
    });

    this.rooms.set(roomName, room);


    return { roomId: room.id, moderatorPassword: room.moderatorPassword };
  }

  public getRoom(roomName: string): Room | undefined {
    return this.rooms.get(roomName);
  }

  public updateRoomDb() {

  }
}

const instance = new RoomManager;
