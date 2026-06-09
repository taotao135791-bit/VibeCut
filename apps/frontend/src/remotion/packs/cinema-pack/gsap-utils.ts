/**
 * cinema-pack/gsap-utils.ts
 * GSAP-powered frame-level utilities for Remotion components.
 *
 * We use GSAP's easing math + utility functions as a CALCULATION engine,
 * NOT as a DOM-mutation runtime. Remotion calls useCurrentFrame() each frame,
 * and we feed that into GSAP's math to get professional-grade easing curves.
 *
 * Key GSAP advantages over hand-written easing:
 *   - Elastic / Back / Bounce physics (impossible to match manually)
 *   - "from: center" stagger distribution
 *   - gsap.utils.interpolate for multi-value interpolation
 *   - CustomEase for bespoke curves
 */

import { gsap } from 'gsap';

// ── Easing wrappers (frame-based) ──────────────────────────────────
// Convert a 0-1 progress to eased 0-1 value using GSAP's built-in eases.

const easeCache = new Map<string, gsap.EaseFunction>();

function getEase(name: string): gsap.EaseFunction {
  if (!easeCache.has(name)) {
    easeCache.set(name, gsap.parseEase(name));
  }
  return easeCache.get(name)!;
}

/**
 * Apply GSAP easing to a linear progress value.
 * @param progress 0-1 linear progress
 * @param easeName GSAP ease string e.g. "elastic.out(1, 0.3)", "back.out(1.7)", "power4.out"
 * @returns eased 0-1 value
 */
export function ease(progress: number, easeName: string = 'power3.out'): number {
  const p = gsap.utils.clamp(0, 1, progress);
  return getEase(easeName)(p);
}

// ── Stagger calculation ────────────────────────────────────────────

export interface StaggerConfig {
  /** Total number of items */
  count: number;
  /** Delay between each item in frames */
  each: number;
  /** Start from: 'start' | 'center' | 'end' | 'edges' | number (index) */
  from?: 'start' | 'center' | 'end' | 'edges' | number;
}

/**
 * Calculate stagger delay (in frames) for each item.
 * Mimics GSAP's stagger.from distribution.
 * @returns Array of frame delays for each index
 */
export function staggerDelays(config: StaggerConfig): number[] {
  const { count, each, from = 'start' } = config;
  const delays: number[] = [];

  let distances: number[];
  if (from === 'center') {
    const center = (count - 1) / 2;
    distances = Array.from({ length: count }, (_, i) => Math.abs(i - center));
  } else if (from === 'end') {
    distances = Array.from({ length: count }, (_, i) => count - 1 - i);
  } else if (from === 'edges') {
    const center = (count - 1) / 2;
    distances = Array.from({ length: count }, (_, i) => center - Math.abs(i - center));
  } else if (typeof from === 'number') {
    distances = Array.from({ length: count }, (_, i) => Math.abs(i - from));
  } else {
    // 'start' (default)
    distances = Array.from({ length: count }, (_, i) => i);
  }

  const maxDist = Math.max(...distances);
  for (let i = 0; i < count; i++) {
    delays.push(Math.round((distances[i] / Math.max(maxDist, 1)) * (count - 1) * each));
  }
  return delays;
}

// ── Interpolation utilities ────────────────────────────────────────

/**
 * Map a value from one range to another (GSAP's mapRange).
 */
export function mapRange(
  inMin: number, inMax: number,
  outMin: number, outMax: number,
  value: number,
): number {
  return gsap.utils.mapRange(inMin, inMax, outMin, outMax, value);
}

/**
 * Clamp a value between min and max.
 */
export function clamp(min: number, max: number, value: number): number {
  return gsap.utils.clamp(min, max, value);
}

/**
 * Snap to nearest increment.
 */
export function snap(increment: number, value: number): number {
  return gsap.utils.snap(increment, value);
}

// ── Scramble text utility ──────────────────────────────────────────

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';

/**
 * Generate a scrambled version of text where some characters are revealed.
 * @param target The final text
 * @param progress 0-1 (0 = fully scrambled, 1 = fully revealed)
 * @param chars Character set for scrambled characters
 * @returns Partially revealed text
 */
export function scrambleText(
  target: string,
  progress: number,
  chars: string = SCRAMBLE_CHARS,
): string {
  const revealCount = Math.floor(target.length * gsap.utils.clamp(0, 1, progress));
  let result = '';
  for (let i = 0; i < target.length; i++) {
    if (i < revealCount) {
      result += target[i];
    } else if (target[i] === ' ') {
      result += ' ';
    } else {
      // Use a deterministic-ish scramble based on frame position
      const idx = (i * 7 + Math.floor(progress * 100)) % chars.length;
      result += chars[idx];
    }
  }
  return result;
}

// ── Pre-built animation curves (commonly used combos) ──────────────

/** Headline enter: elastic overshoot with quick settle */
export const EASE_HEADLINE_ENTER = 'elastic.out(1, 0.4)';

/** Sub-text enter: smooth power ease */
export const EASE_SUBTITLE_ENTER = 'power3.out';

/** Number counter: fast start, slow end (deceleration) */
export const EASE_COUNTER = 'power4.out';

/** Scale-in: back ease with slight overshoot */
export const EASE_SCALE_IN = 'back.out(1.4)';

/** Gentle fade */
export const EASE_FADE = 'power2.inOut';
