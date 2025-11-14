import {createServer} from "http";
import {handler} from "./build/handler.js";
import { createServer as createWsServer, handleUpgrade } from "./src/lib/server/websocket.startup.ts";

const srv = createServer();

srv.on("request", handler);

createWsServer();
srv.on("upgrade", handleUpgrade);

srv.listen(5173);
