// Heuristic for "create a widget" requests. Used by the generate-text route
// (to auto-enable widget mode server-side) and by the chat UI (to show the
// widget generation skeleton) — keep both in sync via this single helper.
export const looksLikeWidgetRequest = (text: unknown): boolean =>
  typeof text === 'string' &&
  /(виджет|widget)/i.test(text) &&
  /(созда|сдела|напиш|сгенерир|построй|обнови|измени|доработ|generate|create|make|build|update|change)/i.test(text);
