/**
 * Shared utilities for pack components.
 */

import type { Clip, VideoStyle } from '@mrdv2/shared';
import React from 'react';

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function promoTextSize(text: string, base: number, min: number): number {
  const longest = text.split(/\s|\n/).reduce((max, part) => Math.max(max, part.length), 0);
  const lines = text.split('\n').length;
  const penalty = Math.max(0, longest - 12) * 1.8 + Math.max(0, lines - 1) * 4;
  return Math.max(min, base - penalty);
}

export function glassSurface(accent: string, dark = true): React.CSSProperties {
  return {
    background: dark
      ? `linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04)), linear-gradient(135deg, rgba(15,15,35,0.9), rgba(30,27,75,0.76))`
      : `linear-gradient(135deg, rgba(255,255,255,0.98), rgba(245,242,255,0.9))`,
    border: `1.5px solid rgba(255,255,255,0.24)`,
    boxShadow: `0 28px 90px rgba(0,0,0,0.44), 0 0 0 1px ${accent}55 inset, 0 0 42px ${accent}24`,
    backdropFilter: 'blur(18px) saturate(1.24)',
  };
}

export function clipComponentBoxStyle(clip: Clip, opacity: number): React.CSSProperties {
  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;
  const width = vs?.width ?? 0.32;
  const height = vs?.height ?? 0.16;

  return {
    position: 'absolute',
    left: `${((posX - width / 2) * 100).toFixed(2)}%`,
    top: `${((posY - height / 2) * 100).toFixed(2)}%`,
    width: `${(width * 100).toFixed(2)}%`,
    height: `${(height * 100).toFixed(2)}%`,
    opacity,
  };
}

/** Compute standard enter/exit/phase/opacity from PackComponentProps-equivalent values. */
export function computePhase(progress: number, intensity: number, clipOpacity: number) {
  const enter = clamp01(progress / 0.18);
  const exit = clamp01((1 - progress) / 0.18);
  const phase = enter * exit;
  const baseOpacity = phase * intensity * clipOpacity;
  return { enter, exit, phase, baseOpacity };
}

export function computeMotionTransform(motion: string | undefined, enter: number, progress: number, intensity: number): string | undefined {
  if (motion === 'slide') return `translateY(${(1 - enter) * -18}px)`;
  if (motion === 'pulse') return `scale(${1 + Math.sin(progress * Math.PI * 2) * 0.025 * intensity})`;
  if (motion === 'none') return undefined;
  return `scale(${0.94 + 0.06 * enter})`; // default: pop
}
