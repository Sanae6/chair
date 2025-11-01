import type { Operation } from "./operation";
import type { Vec2 } from "./prims";

export type Packet =
  | ConnectPacket
  | ConnectedPacket
  | UserListPacket
  | OperationPacket
  | SyncPacket
  | ModeratorPacket
  | PromotedPacket
  | KickedPacket;

export type ConnectPacket = {
  type: "connect",
  room: string,
  name: string,
};

export type ConnectedPacket = {
  type: "connected",
  size: Vec2,
}

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
