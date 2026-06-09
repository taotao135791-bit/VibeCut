/**
 * TextMaskReveal — Massive type as transparent window to gradient/video below.
 * Inspired by taste-skill "Text Mask Reveal — Massive type as transparent window to video."
 * The text is cut out as a mask — gradient/color shines through the letterforms.
 *
 * Creates a "poster-like" editorial moment. The text IS the design.
 * Uses CSS mix-blend-mode and background-clip: text for the cutout effect.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { ease, clamp, EASE_HEADLINE_ENTER } from './gsap-utils';
import { computePhase, FONT } from '../pro-toolkit/utils';

export const TextMaskReveal: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || 'MASK';
  const bgColor = (params.bg_color as string) || '#ffffff';
  const gradientColor1 = (params.color as string) || '#4ce0d2';
  const gradientColor2 = (params.accent_color as string) || '#a78bfa';
  const fontSize = (params.font_size as number) || 300;
  const fontFamily = (params.font_family as string) || FONT.display;
  const label = (params.label as string) || '';

  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;

  const { opacity: envelope } = computePhase(frame, durationFrames, 1.0, 1.0, 0.1, 0.08);

  // Entrance: scale from 0.85 + slide up
  const enterProgress = ease(clamp(0, 1, frame / 20), EASE_HEADLINE_ENTER);
  const scale = 0.85 + 0.15 * enterProgress;
  const yOffset = (1 - enterProgress) * 30;

  // Gradient rotation animation (slow continuous spin)
  const gradientAngle = frame * 1.2;

  // Mask reveal: clip expands from center
  const revealProgress = ease(clamp(0, 1, frame / 25), 'power3.out');

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: envelope, overflow: 'hidden' }}>
      {/* White/bg fill */}
      <div style={{ position: 'absolute', inset: 0, background: bgColor }} />

      {/* Text mask layer: gradient text using reliable approach */}
      <div style={{
        position: 'absolute',
        left: `${(posX * 100).toFixed(1)}%`,
        top: `${(posY * 100).toFixed(1)}%`,
        transform: `translate(-50%, -50%) scale(${scale}) translateY(${yOffset}px)`,
        fontSize,
        fontFamily,
        fontWeight: 900,
        lineHeight: 0.85,
        letterSpacing: -8,
        textAlign: 'center',
        whiteSpace: 'pre',
        // Use mix-blend-mode approach (more reliable in Remotion)
        color: bgColor,
        mixBlendMode: 'multiply',
        clipPath: `inset(${(1 - revealProgress) * 50}% ${(1 - revealProgress) * 15}%)`,
      }}>
        {text}
      </div>

      {/* Gradient layer behind text (visible where text is NOT) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2}, ${gradientColor1})`,
        mixBlendMode: 'screen',
        opacity: revealProgress * 0.9,
        pointerEvents: 'none',
      }} />

      {/* Subtle label below (small caps) */}
      {label && (
        <div style={{
          position: 'absolute',
          left: `${(posX * 100).toFixed(1)}%`,
          bottom: '12%',
          transform: 'translateX(-50%)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: 4,
          color: gradientColor1,
          textTransform: 'uppercase',
          fontFamily: FONT.mono,
          opacity: ease(clamp(0, 1, (frame - 20) / 15), 'power3.out'),
        }}>
          {label}
        </div>
      )}

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, transparent 50%, ${bgColor} 100%)`,
        opacity: 0.3,
        pointerEvents: 'none',
      }} />
    </div>
  );
};
