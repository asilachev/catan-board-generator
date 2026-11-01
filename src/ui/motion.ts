/**
 * Motion helpers (docs/design.md → Motion). Movement only when it means something, and then short and smooth.
 *
 * Under reduced motion, and where `matchMedia` doesn't exist (tests), exits and delayed steps
 * happen at once; the CSS also cuts every animation to a single instant frame.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Length of exit animations (sheets, dialogs, toasts, collapsing notes), in ms. */
export const EXIT_MS = 180
