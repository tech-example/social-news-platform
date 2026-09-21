"use client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/format";
import { formatCompactNumber } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { Shield, ShieldCheck, User, Calendar, Link as LinkIcon, Edit3 } from "lucide-react";

export function ProfileDetailsDialog({ open, onClose, profile, isViewer, onOpenEdit }) {
  const { addToast } = useToast();

  const handleCopyProfileLink = () => {
    const url = `${window.location.origin}/u/${profile.username}`;
    navigator.clipboard.writeText(url).then(
      () => addToast("Profile link copied to clipboard."),
      () => addToast("Failed to copy link.", "error")
    );
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <Shield size={12} strokeWidth={2} /> Admin
          </span>
        );
      case "moderator":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <ShieldCheck size={12} strokeWidth={2} /> Moderator
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-strong)] text-[var(--ink-muted)]">
            <User size={12} strokeWidth={2} /> Member
          </span>
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Profile Details">
      <div className="flex flex-col gap-5">
        {/* Header Info */}
        <div className="flex items-center gap-4">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name || profile.username}
            size={68}
            className="ring-2 ring-[var(--line)]"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--ink)] truncate">
                {profile.display_name}
              </h3>
              {getRoleBadge(profile.role)}
            </div>
            <p className="text-xs text-[var(--ink-muted)]">@{profile.username}</p>
            {profile.created_at && (
              <p className="flex items-center gap-1 text-[11px] text-[var(--ink-muted)] mt-1">
                <Calendar size={12} />
                <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center p-3 bg-[var(--surface)] border border-[var(--line)] rounded-xl">
          <div>
            <div className="text-base font-bold text-[var(--ink)] tabular-nums">
              {formatCompactNumber(profile.posts_count || 0)}
            </div>
            <div className="text-[11px] text-[var(--ink-muted)]">Posts</div>
          </div>
          <div>
            <div className="text-base font-bold text-[var(--ink)] tabular-nums">
              {formatCompactNumber(profile.followers_count || 0)}
            </div>
            <div className="text-[11px] text-[var(--ink-muted)]">Followers</div>
          </div>
          <div>
            <div className="text-base font-bold text-[var(--ink)] tabular-nums">
              {formatCompactNumber(profile.following_count || 0)}
            </div>
            <div className="text-[11px] text-[var(--ink-muted)]">Following</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
          <Button
            variant="outline"
            onClick={handleCopyProfileLink}
            className="text-xs h-9 px-3 gap-1.5"
          >
            <LinkIcon size={14} />
            <span>Copy Link</span>
          </Button>

          {isViewer && (
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                if (onOpenEdit) onOpenEdit();
              }}
              className="text-xs h-9 px-3 gap-1.5"
            >
              <Edit3 size={14} />
              <span>Edit Profile</span>
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
