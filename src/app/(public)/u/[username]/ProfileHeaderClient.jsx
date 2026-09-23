"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "./FollowButton";
import { EditProfileDialog } from "./EditProfileDialog";
import { ProfileDetailsDialog } from "./ProfileDetailsDialog";
import { formatCompactNumber } from "@/lib/format";
import { Settings, Info, UserCheck, Shield, ShieldCheck } from "lucide-react";

export function ProfileHeaderClient({ initialProfile, viewerId }) {
  const [profile, setProfile] = useState(initialProfile);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const isViewer = profile.isViewer || viewerId === profile.id;

  const handleProfileUpdated = (updatedFields) => {
    setProfile((prev) => ({
      ...prev,
      ...updatedFields,
    }));
  };


  const getRoleBadge = (role) => {
    if (role === "admin") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
          <Shield size={11} strokeWidth={2} /> Admin
        </span>
      );
    }
    if (role === "moderator") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          <ShieldCheck size={11} strokeWidth={2} /> Mod
        </span>
      );
    }
    return null;
  };

  return (
    <section className="bg-[var(--bg)] border border-[var(--line)] rounded-2xl p-5 sm:p-8 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
        {/* Avatar */}
        <div className="shrink-0 relative group">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name || profile.username}
            size={110}
            className="w-24 h-24 sm:w-32 sm:h-32 ring-2 ring-[var(--line)] shadow-xs"
          />
        </div>

        {/* Profile Info */}
        <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left gap-3.5 min-w-0 w-full">
          {/* Top Row: Username + Badges + Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 w-full">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)] truncate">
              {profile.username}
            </h1>
            {getRoleBadge(profile.role)}

            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              {isViewer ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setEditOpen(true)}
                    className="text-xs h-8 px-3.5 gap-1.5 font-semibold"
                  >
                    <span>Edit Profile</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDetailsOpen(true)}
                    className="text-xs h-8 px-2.5 gap-1"
                    title="View My Profile Info"
                  >
                    <Info size={14} />
                    <span className="hidden sm:inline">Info</span>
                  </Button>
                </>
              ) : viewerId ? (
                <>
                  <FollowButton
                    targetUserId={profile.id}
                    initialFollowing={profile.isFollowing}
                    onToggle={(newFollowing) => {
                      setProfile((prev) => ({
                        ...prev,
                        isFollowing: newFollowing,
                        followers_count: Math.max(0, (prev.followers_count || 0) + (newFollowing ? 1 : -1)),
                      }));
                    }}
                  />
                  <Button

                    variant="ghost"
                    onClick={() => setDetailsOpen(true)}
                    className="text-xs h-8 px-2 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                    title="Profile Details"
                  >
                    <Info size={15} />
                  </Button>
                </>
              ) : (
                <Link href="/sign-in">
                  <Button variant="primary" className="text-xs h-8 px-4 font-semibold">
                    Follow
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Counts Row */}
          <div className="flex items-center justify-center sm:justify-start gap-6 sm:gap-8 text-sm text-[var(--ink)] py-0.5">
            <div>
              <strong className="tabular-nums font-bold">{formatCompactNumber(profile.posts_count || 0)}</strong>{" "}
              <span className="text-[var(--ink-muted)]">posts</span>
            </div>
            <div>
              <strong className="tabular-nums font-bold">{formatCompactNumber(profile.followers_count || 0)}</strong>{" "}
              <span className="text-[var(--ink-muted)]">followers</span>
            </div>
            <div>
              <strong className="tabular-nums font-bold">{formatCompactNumber(profile.following_count || 0)}</strong>{" "}
              <span className="text-[var(--ink-muted)]">following</span>
            </div>
          </div>

          {/* Display Name & Bio */}
          <div className="text-sm text-[var(--ink)] space-y-1 max-w-lg">
            <p className="font-bold text-sm text-[var(--ink)]">{profile.display_name}</p>
            {profile.bio && (
              <p className="text-xs sm:text-sm text-[var(--ink-muted)] whitespace-pre-wrap leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog Popup */}
      <EditProfileDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Profile Details Dialog Popup */}
      <ProfileDetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        profile={profile}
        isViewer={isViewer}
        onOpenEdit={() => setEditOpen(true)}
      />
    </section>
  );
}
