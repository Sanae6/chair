import { RoomManager } from '$lib/controller/roomManager.server.js';
import { error, json } from '@sveltejs/kit';

export async function GET({ url }) {
  const joinCode = url.searchParams.get("joinCode");
  if (!joinCode) return error(400, { message: "must provide a join code" });

  let room = RoomManager.instance().getRoom(joinCode);

  if (!room) return error(404, { message: "that room does not exist" });

  return json({}, { status: 200 });
}
