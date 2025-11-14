import type { ConnectedPacket, Packet } from "$lib/network/packets";

type Handler = Packet | { type: "close", reason: string | undefined };

export class Connection {
  // connection factory
  static async connect(user: string, room: string): Promise<Connection> {
    return new Connection(new WebSocket("/"), user, room);
  }

  private handlers: Map<string, (packet: any) => void> = new Map;
  private interval: number;

  constructor(private socket: WebSocket, private username: string, private room: string) {
    socket.binaryType = "arraybuffer";

    // @ts-ignore
    this.interval = setInterval(() => this.send({ type: "ping" }), 5000)

    socket.addEventListener("message", (event) => {
      this.handlePacket(JSON.parse(event.data));
    });

    socket.addEventListener("close", (event) => {
      clearInterval(this.interval);
      console.log(event.reason);
      this.handlers.get("close")?.({ type: "close", reason: event.reason });
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

  public setHandler<T extends Handler["type"], H extends Handler & { type: T }>(type: T | never, handler: (packet: H) => void) {
    this.handlers.set(type, handler);
  }

  private handlePacket(packet: Packet) {
    console.log("got a packet", packet);

    const handler = this.handlers.get(packet.type);
    if (handler) handler(packet);
  }

  public async connect(): Promise<ConnectedPacket> {
    const promise = new Promise<ConnectedPacket>(res =>
      this.setHandler("connected", (packet) => res(packet))
    );
    this.socket.addEventListener("open", () => {
      this.send({
        type: "connect",
        room: this.room,
        name: this.username,
      });
    });
    return await promise;
  }
}
