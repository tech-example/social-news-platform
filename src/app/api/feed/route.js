import { NextResponse } from "next/server";
import { getFeedPosts } from "@/server/dal/posts";
import { getSession } from "@/server/auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const filter = searchParams.get("filter") || "latest";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 30);

    const session = await getSession();
    const viewerId = session?.user?.id || null;

    const { posts, nextCursor } = await getFeedPosts({
      cursor,
      limit,
      viewerId,
      filter,
    });

    return NextResponse.json({ posts, nextCursor });
  } catch (error) {
    console.error("Feed API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
