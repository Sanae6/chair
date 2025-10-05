import { RoomManager } from '$lib/controller/roomManager.server.js';
import { json } from '@sveltejs/kit';

export function POST({ url }) {
  const room = url.searchParams.get("name");
  if (!room) throw new Error("must provide a name");
  const width = url.searchParams.get("width");
  if (!width) throw new Error("must provide a width");
  const height = url.searchParams.get("height");
  if (!height) throw new Error("must provide a height");
  const size = { x: 0, y: 0 };
  try { size.x = parseInt(width) } catch { throw new Error("width must be an integer") }
  try { size.y = parseInt(height) } catch { throw new Error("height must be an integer") }

  RoomManager.instance().createRoom(room, size);

  return json({}, { status: 200 })
}
