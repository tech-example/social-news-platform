import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { getNotifications, getUnreadNotificationCount } from "@/server/dal/notifications";
import { createUserClient } from "@/server/supabase";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const [unreadCount, { notifications, nextCursor }] = await Promise.all([
      getUnreadNotificationCount(session.user.id),
      getNotifications(session.user.id, limit, cursor),
    ]);

    return NextResponse.json({
      unreadCount,
      notifications,
      nextCursor,
    });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const notificationId = body?.id;

    const supabase = await createUserClient();
    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", session.user.id);

    if (notificationId) {
      query = query.eq("id", notificationId);
    } else {
      query = query.is("read_at", null);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notifications mark read error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
