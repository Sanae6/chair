import type { Operation } from "./operation";

export type Packet =
  | ConnectPacket
  | OperationPacket
  | SyncPacket;

export type ConnectPacket = {
  type: "connect",
  room: string,
  name: string,
};

export type OperationPacket = {
  type: "operation",
  operation: Operation,
}

export type SyncPacket = {
  type: "sync",
  url: string,
};
