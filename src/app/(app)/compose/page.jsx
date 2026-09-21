import { PostComposer } from "@/components/feed/PostComposer";
import { requireRole } from "@/server/auth";

export const metadata = {
  title: "Create New Post - SocialNews",
};

export default async function ComposePage() {
  await requireRole("user");

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6">
      <PostComposer />
    </div>
  );
}
