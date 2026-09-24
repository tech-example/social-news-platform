export const USER_ROLES = ["user", "moderator", "admin"];

export const REPORT_TARGET_TYPES = ["user", "post", "comment"];

export const REPORT_STATUSES = [
  "pending",
  "in_review",
  "escalated",
  "resolved_actioned",
  "resolved_dismissed",
];

export const POST_STATUSES = ["published", "hidden", "removed"];

export const NOTIFICATION_TYPES = [
  "like",
  "comment",
  "follow",
  "share",
  "report_update",
  "moderation",
];

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "misinformation",
  "hate",
  "violence",
  "sexual",
  "other",
];

export const ROLE_RANK = {
  guest: 0,
  user: 1,
  moderator: 2,
  admin: 3,
};

export const ALLOW_EMOJI_IN_USER_CONTENT = false;

export const LIMITS = {
  POST_TITLE_MAX: 140,
  POST_BODY_MIN: 1,
  POST_BODY_MAX: 5000,
  POST_MAX_TAGS: 10,
  TAG_NAME_MIN: 2,
  TAG_NAME_MAX: 40,
  COMMENT_BODY_MIN: 1,
  COMMENT_BODY_MAX: 1000,
  SHARE_NOTE_MAX: 280,
  PROFILE_DISPLAY_NAME_MIN: 1,
  PROFILE_DISPLAY_NAME_MAX: 60,
  PROFILE_USERNAME_MIN: 3,
  PROFILE_USERNAME_MAX: 30,
  PROFILE_BIO_MAX: 300,
  REPORT_DETAILS_MAX: 1000,
  MAX_UPLOAD_IMAGE_BYTES: 5 * 1024 * 1024, // 5 MB
};

export const PAGINATION = {
  FEED_DEFAULT: 10,
  COMMENTS_DEFAULT: 20,
  NOTIFICATIONS_DEFAULT: 20,
  REPORTS_DEFAULT: 15,
  USERS_DEFAULT: 20,
};

export const SKELETON_SIZES = {
  AVATAR: {
    XS: 20,
    SM: 24,
    MD: 36,
    LG: 40,
    XL: 44,
    PROFILE_MOBILE: 96,
    PROFILE_DESKTOP: 128,
  },
  POST_CARD: {
    MAX_WIDTH: 470,
    MEDIA_MAX_HEIGHT: 420,
    ESTIMATED_HEIGHT: 550,
  },
  GRID_ITEM: {
    ESTIMATED_HEIGHT: 280,
  },
  STAT_CARD: {
    ESTIMATED_HEIGHT: 132,
  },
  CHART: {
    DEFAULT_HEIGHT: 280,
    ADMIN_HEIGHT: 300,
  },
  TABLE: {
    ROW_HEIGHT: 52,
    DEFAULT_ROWS: 6,
    DEFAULT_COLS: 4,
  },
  SIDEBAR: {
    WIDTH: 300,
  },
  POST_DETAIL: {
    CONTAINER_MAX_WIDTH: 935,
    SIDEBAR_WIDTH: 380,
    SIDEBAR_HEIGHT: 550,
  },
};
