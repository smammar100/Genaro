// Geist (variable) weight tokens for `fontVariationSettings`, the same pair
// as --fw-regular / --fw-semibold in app/globals.css. Semibold is the heaviest
// weight until bold is approved (call 2026-10-25). Geist has no optical-size
// axis, so a label that turns semibold is a little wider than its regular.
export const fontWeights = {
  normal: "'wght' 400",
  semibold: "'wght' 550",
} as const;
