export const ALLOW_EMOJI_IN_USER_CONTENT = false;

export const ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  COMPOSE: '/compose',
  NOTIFICATIONS: '/notifications',
  PROFILE: (username) => `/u/${username}`,
  POST: (id) => `/p/${id}`,
  TAG: (tag) => `/t/${tag}`,
  ADMIN: '/admin',
  MODERATION: '/moderation',
  LOGIN: '/login',
  SIGNUP: '/signup',
};

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
};
