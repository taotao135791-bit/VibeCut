/**
 * ScrambleReveal — GSAP ScrambleText-inspired component.
 * Text starts as random characters and progressively reveals the real text.
 * Uses GSAP easing for the reveal timing. Feels like decryption / data processing.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, FONT } from '../pro-toolkit/utils';
import { ease, scrambleText, clamp, EASE_COUNTER } from './gsap-utils';

export const ScrambleReveal: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || 'LOADING...';
  const color = (params.color as string) || '#ffffff';
  const accentColor = (params.accent_color as string) || '#14b8a6';
  const fontSize = (params.font_size as number) || 100;
  const fontFamily = (params.font_family as string) || FONT.mono;
  const revealDuration = (params.reveal_duration as number) || 0.4; // fraction of clip duration

  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;

  const { opacity: envelopeOpacity } = computePhase(
    frame, durationFrames, 1.0, vs?.opacity ?? 1, 0.08, 0.06
  );

  // Reveal progress: 0 (fully scrambled) → 1 (fully revealed)
  const revealFrames = Math.round(durationFrames * revealDuration);
  const rawReveal = clamp(0, 1, frame / revealFrames);
  const easedReveal = ease(rawReveal, EASE_COUNTER); // power4.out = fast start, slow end

  const displayText = scrambleText(text, easedReveal);
  const isFullyRevealed = easedReveal >= 0.99;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${(posX * 100).toFixed(1)}%`,
        top: `${(posY * 100).toFixed(1)}%`,
        transform: 'translate(-50%, -50%)',
        opacity: envelopeOpacity,
        fontSize,
        fontFamily,
        fontWeight: 500,
        color: isFullyRevealed ? accentColor : color,
        letterSpacing: 2,
        lineHeight: 1.1,
        textAlign: 'center',
        whiteSpace: 'pre',
      }}
    >
      {displayText}
    </div>
  );
};
