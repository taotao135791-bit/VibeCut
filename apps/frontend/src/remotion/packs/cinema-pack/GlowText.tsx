/**
 * GlowText — Text with layered glow / aura effect.
 * Creates text-shadow layering for neon/luxury feel.
 * Based on frontend-design skill: "dramatic shadows, decorative borders"
 *
 * The glow pulses subtly, creating a "breathing" light effect.
 * Multi-layer text-shadow: tight white → colored mid → wide color → ultra-wide ambient.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { ease, clamp, staggerDelays, EASE_HEADLINE_ENTER } from './gsap-utils';
import { computePhase, FONT } from '../pro-toolkit/utils';

export const GlowText: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || 'GLOW';
  const color = (params.color as string) || '#ffffff';
  const glowColor = (params.accent_color as string) || '#4ce0d2';
  const fontSize = (params.font_size as number) || 140;
  const fontFamily = (params.font_family as string) || FONT.display;
  const glowIntensity = (params.intensity as number) ?? 1.0; // 0.5-2.0
  const staggerMs = (params.stagger_ms as number) || 60;
  const staggerFrom = (params.stagger_from as string) || 'center';

  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;

  const { opacity: envelope } = computePhase(frame, durationFrames, 1.0, vs?.opacity ?? 1, 0.08, 0.06);

  // Per-character stagger
  const fps = 30;
  const staggerFrames = Math.max(1, Math.round((staggerMs / 1000) * fps));
  const chars = text.split('');
  const delays = staggerDelays({
    count: chars.length,
    each: staggerFrames,
    from: staggerFrom as any,
  });

  // Glow pulse (subtle breathing)
  const glowPulse = 0.85 + 0.15 * Math.sin(frame * 0.06);
  const gI = glowIntensity * glowPulse;

  // Multi-layer text-shadow for glow effect
  // impeccable dark-glow: restrained, purposeful — not every pixel glowing
  const textShadow = [
    `0 0 ${3 * gI}px rgba(255,255,255,0.6)`,         // tight white core
    `0 0 ${10 * gI}px ${glowColor}60`,                // colored mid
    `0 0 ${24 * gI}px ${glowColor}30`,                // wide color (capped)
  ].join(', ');

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
    <div style={{
      position: 'absolute',
      left: `${(posX * 100).toFixed(1)}%`,
      top: `${(posY * 100).toFixed(1)}%`,
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'center',
      opacity: envelope,
      maxWidth: '88%',
    }}>
      {chars.map((ch, i) => {
        const charDelay = delays[i] || 0;
        const localFrame = Math.max(0, frame - charDelay);
        const rawProgress = clamp(0, 1, localFrame / 16);
        // impeccable: use power4.out for position, elastic only for scale
        const posProgress = ease(rawProgress, 'power4.out');
        const scaleProgress = ease(rawProgress, EASE_HEADLINE_ENTER);

        const yOffset = (1 - posProgress) * 25;
        const charOpacity = clamp(0, 1, rawProgress * 3);
        const charScale = 0.6 + 0.4 * scaleProgress;

        // Per-character glow: restrained per impeccable dark-glow rule
        const charGlow = charOpacity * gI;
        const charShadow = [
          `0 0 ${3 * charGlow}px rgba(255,255,255,0.6)`,
          `0 0 ${10 * charGlow}px ${glowColor}50`,
          `0 0 ${20 * charGlow}px ${glowColor}20`,
        ].join(', ');

        return (
          <span key={i} style={{
            display: 'inline-block',
            fontSize,
            fontFamily,
            fontWeight: 700,
            color,
            opacity: charOpacity,
            transform: `translateY(${yOffset}px) scale(${charScale})`,
            transformOrigin: 'center bottom',
            textShadow: charShadow,
            whiteSpace: 'pre',
            lineHeight: 1.05,
            letterSpacing: -2,
            willChange: 'transform, opacity',
          }}>
            {ch}
          </span>
        );
      })}
    </div>
    </div>
  );
};
