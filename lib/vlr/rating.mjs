import model from "./rating-model.json" with { type: "json" };
import { ratingFeatures } from "./rating-features.mjs";

export const RATING_VERSION = model.version;
export const RATING_VALIDATION = model.calibration;

/**
 * Calibrated aggregate-stat estimate, NOT the official event-by-event VLR 2.0.
 * Unrounded / unclamped so series can weight actual contributions by rounds.
 * @param {Parameters<typeof ratingFeatures>[0]} stats
 */
export function rawRating(stats) {
  const features = ratingFeatures(stats);
  return model.intercept + Object.entries(model.coefficients).reduce((sum, [key, weight]) => sum + weight * features[key], 0);
}

/** @param {Parameters<typeof ratingFeatures>[0]} stats */
export function estimateRating(stats) {
  return Math.round(Math.max(0, rawRating(stats)) * 100) / 100;
}
