const easingStandard = Object.freeze([0.22, 1, 0.36, 1])
const easingExit = Object.freeze([0.4, 0, 1, 1])

export const motionTokens = Object.freeze({
  durations: Object.freeze({
    micro: 0.12,
    fast: 0.2,
    base: 0.48,
    slow: 0.72,
  }),
  easings: Object.freeze({
    standard: easingStandard,
    exit: easingExit,
  }),
  distances: Object.freeze({
    reveal: 16,
    page: 12,
  }),
  stagger: Object.freeze({
    fast: 0.035,
    base: 0.07,
    slow: 0.11,
    initialDelay: 0.08,
  }),
})
