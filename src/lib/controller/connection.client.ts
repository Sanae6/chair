import type { Packet } from "$lib/useful/packets";

export class Connection {
  // connection factory
  static async connect(room: string): Promise<Connection> {
    const connection = new Connection(new WebSocket("/"), room);
    connection.waitOpen();
    return connection;
  }

  private handlers: Map<string, (packet: any) => void> = new Map;
  private isOpen: boolean = false;
  private openFunc: (() => void) | undefined;
  constructor(private socket: WebSocket, room: string) {
    socket.binaryType = "arraybuffer";
    socket.addEventListener("open", () => {
      this.send({
        type: "connect",
        room,
        name: "Aubrey",
      })
    });

    socket.addEventListener("message", (event) => {
      const data = event.data as ArrayBuffer;
      this.handleMessage(JSON.parse(new TextDecoder().decode(data)));
    })
  }

  public send(message: Packet) {
    this.socket.send(JSON.stringify(message));
  }

  private handleMessage(message: object) {
    this.isOpen = true;
    if (this.openFunc) this.openFunc();
    this.openFunc = undefined;

    message
  }

  private async waitOpen() {
    if (this.isOpen) return true;

    await new Promise(res => this.openFunc = res as any);
  }


}
