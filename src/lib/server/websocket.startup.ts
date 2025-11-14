import { WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Duplex } from "stream";

export const handleUpgrade = (req: IncomingMessage, sock: Duplex, head: Buffer) => {
  wss.handleUpgrade(req, sock, head, (ws, req) => {
    wss.emit("connection", ws, req)
  });
};


export const createServer = () => {
  if ("wss" in globalThis) return;
  
  const wss = new WebSocketServer({
    noServer: true,
  });

  (globalThis as any).wss = wss;
}
