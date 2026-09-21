import { z } from "zod";
import { LIMITS, REPORT_REASONS, ALLOW_EMOJI_IN_USER_CONTENT, USER_ROLES } from "@/lib/constants";

// Helper to check for emoji if not allowed
const emojiRegex = /\p{Extended_Pictographic}/u;

function noEmoji(val) {
  if (ALLOW_EMOJI_IN_USER_CONTENT) return true;
  return !emojiRegex.test(val);
}

export const postSchema = z.object({
  title: z
    .string()
    .trim()
    .max(LIMITS.POST_TITLE_MAX, `Title must be ${LIMITS.POST_TITLE_MAX} characters or fewer`)
    .optional()
    .nullable(),
  body: z
    .string()
    .trim()
    .min(LIMITS.POST_BODY_MIN, "Body cannot be empty")
    .max(LIMITS.POST_BODY_MAX, `Body must be ${LIMITS.POST_BODY_MAX} characters or fewer`)
    .refine(noEmoji, {
      message: "Emoji are not supported. Remove them and try again.",
    }),
  imageUrl: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(LIMITS.TAG_NAME_MIN)
        .max(LIMITS.TAG_NAME_MAX)
        .regex(/^[a-z0-9_-]+$/i, "Tags can only contain alphanumeric characters, underscores, and dashes")
    )
    .max(LIMITS.POST_MAX_TAGS, `Maximum ${LIMITS.POST_MAX_TAGS} tags allowed`)
    .default([]),
});

export const commentSchema = z.object({
  postId: z.string().uuid("Invalid post ID"),
  parentId: z.string().uuid("Invalid parent comment ID").optional().nullable(),
  body: z
    .string()
    .trim()
    .min(LIMITS.COMMENT_BODY_MIN, "Comment cannot be empty")
    .max(LIMITS.COMMENT_BODY_MAX, `Comment must be ${LIMITS.COMMENT_BODY_MAX} characters or fewer`)
    .refine(noEmoji, {
      message: "Emoji are not supported. Remove them and try again.",
    }),
});

export const shareSchema = z.object({
  postId: z.string().uuid("Invalid post ID"),
  note: z
    .string()
    .trim()
    .max(LIMITS.SHARE_NOTE_MAX, `Note must be ${LIMITS.SHARE_NOTE_MAX} characters or fewer`)
    .refine(noEmoji, {
      message: "Emoji are not supported. Remove them and try again.",
    })
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const reportSchema = z.object({
  targetType: z.enum(["user", "post", "comment"]),
  targetId: z.string().uuid("Invalid target ID"),
  reason: z.enum(REPORT_REASONS),
  details: z
    .string()
    .trim()
    .max(LIMITS.REPORT_DETAILS_MAX, `Details must be ${LIMITS.REPORT_DETAILS_MAX} characters or fewer`)
    .refine(noEmoji, {
      message: "Emoji are not supported. Remove them and try again.",
    })
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(LIMITS.PROFILE_DISPLAY_NAME_MIN, "Display name is required")
    .max(LIMITS.PROFILE_DISPLAY_NAME_MAX, `Display name must be ${LIMITS.PROFILE_DISPLAY_NAME_MAX} characters or fewer`),
  bio: z
    .string()
    .trim()
    .max(LIMITS.PROFILE_BIO_MAX, `Bio must be ${LIMITS.PROFILE_BIO_MAX} characters or fewer`)
    .refine(noEmoji, {
      message: "Emoji are not supported. Remove them and try again.",
    })
    .optional()
    .nullable()
    .or(z.literal("")),
  avatarUrl: z
    .string()
    .trim()
    .url("Invalid avatar URL")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    username: z
      .string()
      .trim()
      .min(LIMITS.PROFILE_USERNAME_MIN, `Username must be at least ${LIMITS.PROFILE_USERNAME_MIN} characters`)
      .max(LIMITS.PROFILE_USERNAME_MAX, `Username must be ${LIMITS.PROFILE_USERNAME_MAX} characters or fewer`)
      .regex(/^[a-z0-9_.]+$/i, "Username can only contain letters, numbers, periods, and underscores"),
    displayName: z
      .string()
      .trim()
      .min(LIMITS.PROFILE_DISPLAY_NAME_MIN, "Display name is required")
      .max(LIMITS.PROFILE_DISPLAY_NAME_MAX, `Display name must be ${LIMITS.PROFILE_DISPLAY_NAME_MAX} characters or fewer`),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const roleUpdateSchema = z.object({
  targetUserId: z.string().uuid("Invalid user ID"),
  role: z.enum(USER_ROLES),
});

export const suspendUserSchema = z.object({
  targetUserId: z.string().uuid("Invalid user ID"),
  isSuspended: z.boolean(),
  reason: z.string().trim().max(500).optional().nullable(),
});
