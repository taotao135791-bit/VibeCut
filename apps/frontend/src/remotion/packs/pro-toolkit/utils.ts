/**
 * Pro-toolkit design system — brand-agnostic production-grade utilities.
 *
 * All colors come from effect_params at runtime. Nothing is hardcoded.
 * This module provides: easing, typography, layout, contrast, and motion primitives.
 */

import type { Clip } from '@mrdv2/shared';
import React from 'react';

// ── Easing ─────────────────────────────────────────────────────────

/** Spring easing — overshoot then settle. t in [0,1] */
export function spring(t: number, damping = 0.7): number {
  if (t >= 1) return 1;
  const omega = 2 * Math.PI * 1.2;
  return 1 - Math.exp(-damping * 8 * t) * Math.cos(omega * t);
}

/** Smooth ease-out cubic. */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Smooth ease-in-out. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Enter/Exit with configurable easing ────────────────────────────

export interface PhaseResult {
  enter: number;       // 0→1 during entry
  exit: number;        // 1→0 during exit
  phase: number;       // enter * exit (visibility envelope)
  opacity: number;     // phase * intensity * clip opacity
  springEnter: number; // spring-eased enter (overshoots)
}

export function computePhase(
  frame: number,
  durationFrames: number,
  intensity: number,
  clipOpacity: number,
  enterDuration = 0.15,
  exitDuration = 0.12,
): PhaseResult {
  const progress = durationFrames <= 1 ? 1 : clamp(frame / (durationFrames - 1), 0, 1);
  const enterRaw = clamp(progress / enterDuration, 0, 1);
  const exitRaw = clamp((1 - progress) / exitDuration, 0, 1);
  const enter = easeOut(enterRaw);
  const exit = easeOut(exitRaw);
  const phase = enter * exit;
  return {
    enter,
    exit,
    phase,
    opacity: phase * intensity * clipOpacity,
    springEnter: spring(enterRaw),
  };
}

// ── Motion presets ─────────────────────────────────────────────────

export function motionTransform(
  preset: string | undefined,
  enter: number,
  springEnter: number,
  frame: number,
): string | undefined {
  switch (preset) {
    case 'spring':
      return `scale(${0.6 + 0.4 * springEnter})`;
    case 'slide':
      return `translateY(${(1 - enter) * -24}px)`;
    case 'slide-up':
      return `translateY(${(1 - enter) * 24}px)`;
    case 'pop':
      return `scale(${0.88 + 0.12 * enter})`;
    case 'pulse':
      return `scale(${1 + Math.sin(frame * 0.08) * 0.015})`;
    case 'none':
      return undefined;
    default:
      return `scale(${0.88 + 0.12 * enter})`;
  }
}

// ── Typography ─────────────────────────────────────────────────────

/** Adaptive font size — shrinks for long text, never below min. */
export function adaptiveSize(text: string, base: number, min: number, containerWidthPx = 600): number {
  const charCount = text.length;
  const lines = text.split('\n').length;
  // Reduce by ~1px per 2 characters over 20, and per extra line
  const penalty = Math.max(0, charCount - 20) * 0.5 + Math.max(0, lines - 1) * 6;
  return Math.max(min, base - penalty);
}

export const FONT = {
  display: "'Inter', 'SF Pro Display', system-ui, sans-serif",
  body: "'Inter', 'SF Pro Text', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

// ── Layout helpers ─────────────────────────────────────────────────

export function boxPosition(clip: Clip, opacityOverride?: number): React.CSSProperties {
  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;
  const w = vs?.width ?? 0.3;
  const h = vs?.height ?? 0.12;
  return {
    position: 'absolute',
    left: `${((posX - w / 2) * 100).toFixed(2)}%`,
    top: `${((posY - h / 2) * 100).toFixed(2)}%`,
    width: `${(w * 100).toFixed(2)}%`,
    height: `${(h * 100).toFixed(2)}%`,
    opacity: opacityOverride ?? 1,
  };
}

// ── Contrast & readability ─────────────────────────────────────────

/** Generates a subtle dark backdrop behind text for readability on any video. */
export function contrastBackdrop(bg: string, radius = 12): React.CSSProperties {
  return {
    background: bg || 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(12px) saturate(1.2)',
    borderRadius: radius,
  };
}

/** Glass morphism surface — works on both light and dark contexts. */
export function glass(primary: string, mode: 'dark' | 'light' = 'dark'): React.CSSProperties {
  if (mode === 'light') {
    return {
      background: 'rgba(255,255,255,0.88)',
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: `0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px ${primary}22 inset`,
      backdropFilter: 'blur(16px) saturate(1.3)',
    };
  }
  return {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: `0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px ${primary}44 inset, 0 0 32px ${primary}18`,
    backdropFilter: 'blur(16px) saturate(1.3)',
  };
}

// ── Color helpers ──────────────────────────────────────────────────

/** Read color params with sensible defaults (agent passes everything). */
export function colors(params: Record<string, unknown>) {
  return {
    primary: (params.color as string) || '#6366f1',
    accent: (params.accent_color as string) || '#f59e0b',
    bg: (params.bg_color as string) || 'rgba(0,0,0,0.7)',
    text: (params.text_color as string) || '#ffffff',
  };
}

// ── Idle micro-animation (breathing) ───────────────────────────────

export function breathe(frame: number, amplitude = 0.008): number {
  return 1 + Math.sin(frame * 0.06) * amplitude;
}
