import type { Operation } from "./operation";
import type { Color, Vec2 } from "./prims";

export type Packet =
  | ConnectPacket
  | ConnectedPacket
  | PingPacket
  | UserListPacket
  | OperationPacket
  | SyncPacket
  | ModeratorPacket
  | PromotedPacket
  | KickedPacket
  | PalettePacket;

export type ConnectPacket = {
  type: "connect",
  room: string,
  name: string,
};

export type ConnectedPacket = {
  type: "connected",
  size: Vec2,
}

export type PingPacket = {
  type: "ping"
};

export type UserListPacket = {
  type: "userList",
  users: { username: string, moderator: boolean }[]
};

export type OperationPacket = {
  type: "operation",
  operation: Operation,
}

export type SyncPacket = {
  type: "sync",
  url: string,
};

export type ModeratorPacket = {
  type: "moderator",
  password: string
  data: {
    type: "promote",
    username: string,
  } | {
    type: "kick",
    username: string
  }
}

export type PromotedPacket = {
  type: "promoted",
  password: string,
};

export type KickedPacket = {
  type: "kicked"
}

export type PalettePacket = {
  type: "palette"
  data: {
    type: "add",
    color: Color
  } | {
    type: "sync",
    colors: Color[],
  } | {
    type: "remove",
    index: number,
  }
}
