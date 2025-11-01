import { RoomManager } from '$lib/controller/roomManager.server.js';
import { json } from '@sveltejs/kit';

export function POST({ url }) {
  const room = url.searchParams.get("name");
  if (!room) throw new Error("must provide a name");
  const creator = url.searchParams.get("creatorName");
  if (!creator) throw new Error("must provide a creatorName");
  const width = url.searchParams.get("width");
  if (!width) throw new Error("must provide a width");
  const height = url.searchParams.get("height");
  if (!height) throw new Error("must provide a height");

  const size = { x: 0, y: 0 };
  try { size.x = parseInt(width) } catch { throw new Error("width must be an integer") }
  try { size.y = parseInt(height) } catch { throw new Error("height must be an integer") }

  const roomInfo = RoomManager.instance().createRoom(room, size, creator);

  if (!roomInfo)
    return json({ error: "room already exists" }, { status: 418 })

  return json(roomInfo, { status: 201 })
}
