import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { getAdminClient } from "@/server/admin-client";
import { LIMITS } from "@/lib/constants";

export async function POST(request) {
  try {
    const session = await requireRole("user");

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Supported formats: JPEG, PNG, WebP, GIF." },
          { status: 400 }
        );
      }

      if (file.size > LIMITS.MAX_UPLOAD_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 5 MB." },
          { status: 400 }
        );
      }

      const adminSupabase = getAdminClient();
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());

      // Upload to media bucket
      const { error: uploadError } = await adminSupabase.storage
        .from("media")
        .upload(filename, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json({ error: "Failed to upload file to storage." }, { status: 500 });
      }

      const { data: publicData } = adminSupabase.storage
        .from("media")
        .getPublicUrl(filename);

      return NextResponse.json({ url: publicData.publicUrl });
    }

    // JSON request for signed upload URL
    const body = await request.json();
    const { filename, fileType, fileSize } = body || {};

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (fileSize && fileSize > LIMITS.MAX_UPLOAD_IMAGE_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const adminSupabase = getAdminClient();
    const path = `${session.user.id}/${Date.now()}-${filename}`;

    const { data, error } = await adminSupabase.storage
      .from("media")
      .createSignedUploadUrl(path);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
    });
  } catch (error) {
    console.error("Upload URL error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process upload request." },
      { status: 500 }
    );
  }
}
