"use client";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { updateProfileAction } from "@/server/actions/profile";
import { useToast } from "@/components/ui/toast";
import { ImagePlus, LoaderCircle, CircleAlert } from "lucide-react";
import { LIMITS } from "@/lib/constants";

import { compressImage } from "@/lib/compress-image";

export function EditProfileDialog({ open, onClose, profile, onProfileUpdated }) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { addToast } = useToast();

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg("");
    try {
      // Compress image client-side before upload
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
        setErrorMsg(data.error || "Failed to upload avatar.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsPending(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.set("displayName", displayName.trim());
      formData.set("bio", bio.trim());
      formData.set("avatarUrl", avatarUrl);

      const res = await updateProfileAction(null, formData);
      if (res?.ok) {
        addToast("Profile updated successfully.");
        if (onProfileUpdated) {
          onProfileUpdated({
            display_name: displayName.trim(),
            bio: bio.trim(),
            avatar_url: avatarUrl,
          });
        }
        onClose();
      } else {
        setErrorMsg(res?.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error updating profile.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 rounded-lg bg-[var(--surface)] border border-[var(--danger)] text-xs text-[var(--danger)]"
          >
            <CircleAlert size={16} strokeWidth={2} aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Avatar Section */}
        <div className="flex items-center gap-4 pb-3 border-b border-[var(--line)]">
          <Avatar
            src={avatarUrl}
            name={displayName || profile.username}
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
                disabled={isUploading || isPending}
                className="sr-only"
              />
            </label>
            <span className="text-[10px] text-[var(--ink-muted)]">Max 2MB. WebP, PNG, JPEG.</span>
          </div>
        </div>

        {/* Display Name Input */}
        <div className="space-y-1">
          <label htmlFor="edit-display-name" className="text-xs font-semibold text-[var(--ink)]">
            Display Name
          </label>
          <Input
            id="edit-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={LIMITS.DISPLAY_NAME_MAX}
            placeholder="Your name"
            required
          />
        </div>

        {/* Bio Input */}
        <div className="space-y-1">
          <label htmlFor="edit-bio" className="text-xs font-semibold text-[var(--ink)]">
            Bio
          </label>
          <textarea
            id="edit-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={LIMITS.BIO_MAX}
            placeholder="Tell the community about yourself..."
            className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
          />
          <div className="flex justify-end text-[10px] text-[var(--ink-muted)] tabular-nums">
            {bio.length} / {LIMITS.BIO_MAX}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--line)]">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || isUploading}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
