import { RoomManager } from '$lib/controller/roomManager.server.js';
import { error, json } from '@sveltejs/kit';

export function POST({ url }) {
  const room = url.searchParams.get("name");
  if (!room) return error(400, { message: "must provide a name" });
  const creator = url.searchParams.get("creatorName");
  if (!creator) return error(400, { message: "must provide a creatorName" });
  const width = url.searchParams.get("width");
  if (!width) return error(400, { message: "must provide a positive width" });
  const height = url.searchParams.get("height");
  if (!height) return error(400, { message: "must provide a positive height" });

  const size = { x: 0, y: 0 };
  try { size.x = parseInt(width) } catch { return error(400, { message: "width must be an integer" }) }
  try { size.y = parseInt(height) } catch { return error(400, { message: "height must be an integer" }) }
  if (size.x <= 0 || size.y <= 0) return error(400, { message: "width and height must be positive integers" });

  const tryRoom = RoomManager.instance().getRoom(room);
  if (tryRoom && tryRoom.moderators.value.has(creator) && tryRoom.size.x == size.x && tryRoom.size.y == size.y) {
    // almost certainly meant to rejoin the same room... providing this as an easy way to get back into a room that's already created
    return json({ roomId: tryRoom.id, moderatorPassword: tryRoom.moderatorPassword }, { status: 200 });
  }

  const roomInfo = RoomManager.instance().createRoom(room, size, creator);

  if (!roomInfo)
    return error(418, { message: "room already exists" });

  return json(roomInfo, { status: 201 })
}
