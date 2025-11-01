import type { ConnectedPacket, Packet } from "$lib/network/packets";

export class Connection {
  // connection factory
  static async connect(user: string, room: string): Promise<[Connection, ConnectedPacket]> {
    const connection = new Connection(new WebSocket("/"), user, room);
    console.log("opening")
    const packet = await connection.waitOpen();
    console.log("open")
    return [connection, packet];
  }

  private handlers: Map<string, (packet: any) => void> = new Map;

  constructor(private socket: WebSocket, username: string, room: string) {
    socket.binaryType = "arraybuffer";
    socket.addEventListener("open", () => {
      this.send({
        type: "connect",
        room,
        name: username,
      });

    });

    socket.addEventListener("message", (event) => {
      this.handleMessage(JSON.parse(event.data));
    });

    socket.addEventListener("close", () => {
      this.handlers.get("close")?.({});
    });

    if (import.meta.hot) {
      const close = () => {
        import.meta.hot?.off("vite:beforeUpdate", close);
        socket.close(1000);
      };
      import.meta.hot.on("vite:beforeUpdate", close);
    }
  }

  public send(message: Packet) {
    this.socket.send(JSON.stringify(message));
  }

  public setHandler<T extends Packet["type"], P extends Packet & { type: T }>(type: T | "close" | never, handler: (packet: P) => void) {
    this.handlers.set(type, handler);
  }

  private handleMessage(message: Packet) {
    console.log("got a packet", message);

    const handler = this.handlers.get(message.type);
    if (handler) handler(message);
  }

  private async waitOpen(): Promise<ConnectedPacket> {
    return await new Promise(res =>
      this.setHandler("connected", (packet) => res(packet))
    );
  }
}
