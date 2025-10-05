import type { Packet } from "$lib/useful/packets";

export class Connection {
  // connection factory
  static async connect(user: string, room: string, canvas: HTMLCanvasElement): Promise<Connection> {
    const connection = new Connection(new WebSocket("/"), user, room);
    console.log("opening")
    connection.waitOpen();
    console.log("open")
    return connection;
  }

  private handlers: Map<string, (packet: any) => void> = new Map;
  private isConnected: boolean = false;
  private onConnected: (() => void) | undefined;

  constructor(private socket: WebSocket, username: string, room: string) {
    socket.binaryType = "arraybuffer";
    socket.addEventListener("open", () => {
      this.send({
        type: "connect",
        room,
        name: username,
      })
    });

    socket.addEventListener("message", (event) => {
      this.handleMessage(JSON.parse(event.data));
    })

    if (import.meta.hot)
      import.meta.hot.dispose(() => {
        socket.close(1000);
      });
  }

  public send(message: Packet) {
    this.socket.send(JSON.stringify(message));
  }

  public setHandler<T extends Packet["type"], P extends Packet & { type: T }>(type: T | never, handler: (packet: P) => void) {
    this.handlers.set(type, handler);
  }

  private handleMessage(message: Packet) {
    this.isConnected = true;
    if (this.onConnected) this.onConnected();
    this.onConnected = undefined;

    const handler = this.handlers.get(message.type);
    if (handler) handler(message);
  }

  private async waitOpen() {
    if (this.isConnected) return true;

    await new Promise(res => this.onConnected = res as any);
  }
}
