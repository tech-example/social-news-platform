import { NextResponse } from "next/server";
import { createPostAction } from "@/server/actions/posts";
import { AuthError } from "@/server/auth";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const result = await createPostAction(formData);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError || err.code === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Please sign in to publish a post." }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to create post." }, { status: 500 });
  }
}
