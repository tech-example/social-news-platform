"use client";
import { useState, useActionState } from "react";
import { updateProfileAction } from "@/server/actions/profile";
import { signOutAction } from "@/server/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { LogOut, CircleAlert, CircleCheck, ImagePlus, LoaderCircle } from "lucide-react";
import { LIMITS } from "@/lib/constants";

import { compressImage } from "@/lib/compress-image";

export function SettingsForm({ session }) {
  const profile = session.profile;
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [isUploading, setIsUploading] = useState(false);
  const { addToast } = useToast();

  const [state, formAction, isPending] = useActionState(updateProfileAction, null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file: compressedFile } = await compressImage(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        quality: 0.85,
      });

      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await fetch("/api/upload-url", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setAvatarUrl(data.url);
        addToast("Avatar image uploaded.");
      } else {
        addToast(data.error || "Failed to upload avatar.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Upload failed.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Form */}
      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-6 shadow-xs">
        <h2 className="text-base font-semibold text-[var(--ink)] mb-4">Edit Profile</h2>

        {state?.error && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-[var(--surface)] border border-[var(--danger)] text-xs text-[var(--danger)]"
          >
            <CircleAlert size={16} strokeWidth={2} aria-hidden="true" />
            <span>{state.error}</span>
          </div>
        )}

        {state?.ok && (
          <div
            role="status"
            className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-[var(--surface)] border border-[var(--success)] text-xs text-[var(--success)]"
          >
            <CircleCheck size={16} strokeWidth={2} aria-hidden="true" />
            <span>{state.message || "Profile updated."}</span>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="avatarUrl" value={avatarUrl} />

          {/* Avatar Section */}
          <div className="flex items-center gap-4 pb-4 border-b border-[var(--line)]">
            <Avatar
              src={avatarUrl}
              name={profile.display_name || profile.username}
              size={64}
              className="ring-2 ring-[var(--line)]"
            />
            <div className="flex flex-col gap-1.5">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-strong)] text-xs font-semibold text-[var(--ink)] cursor-pointer transition-colors">
                {isUploading ? (
                  <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <ImagePlus size={14} strokeWidth={1.75} aria-hidden="true" />
                )}
                <span>{isUploading ? "Uploading..." : "Change photo"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                  className="sr-only"
                />
              </label>
              <span className="text-[11px] text-[var(--ink-muted)]">Max file size: 5 MB</span>
            </div>
          </div>

          {/* Username (read-only) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              Username
            </label>
            <Input value={profile.username} disabled className="opacity-60 bg-[var(--surface)]" />
            <span className="text-[11px] text-[var(--ink-muted)]">Usernames cannot be changed.</span>
          </div>

          {/* Display Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="displayName" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              Display Name *
            </label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={profile.display_name}
              maxLength={LIMITS.PROFILE_DISPLAY_NAME_MAX}
              required
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1">
            <label htmlFor="bio" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              defaultValue={profile.bio || ""}
              maxLength={LIMITS.PROFILE_BIO_MAX}
              placeholder="Tell others about yourself..."
              className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={isPending || isUploading}>
              {isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </div>

      {/* Account Info & Sign Out */}
      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-[var(--ink)]">Account Details</h2>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-semibold text-[var(--ink-muted)] block">Email</span>
            <span className="text-[var(--ink)]">{session.user.email}</span>
          </div>
          <div>
            <span className="font-semibold text-[var(--ink-muted)] block">Role</span>
            <span className="text-[var(--ink)] capitalize font-semibold">{profile.role}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--line)]">
          <form action={signOutAction}>
            <Button variant="danger" type="submit" className="w-full sm:w-auto">
              <LogOut size={16} strokeWidth={1.75} aria-hidden="true" className="mr-2" />
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
