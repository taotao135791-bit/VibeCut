/**
 * TypewriterText -- characters appear one-by-one with blinking cursor.
 * Classic terminal/code reveal. Uses GSAP easing for cursor blink timing.
 * Cursor blinks after text is fully typed.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, FONT } from '../pro-toolkit/utils';
import { clamp, ease } from './gsap-utils';

export const TypewriterText: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || 'Hello, World.';
  const color = (params.color as string) || '#ffffff';
  const cursorColor = (params.accent_color as string) || '#14b8a6';
  const fontSize = (params.font_size as number) || 80;
  const fontFamily = (params.font_family as string) || FONT.mono;
  const typingSpeed = (params.typing_speed as number) || 2; // frames per character

  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;

  const { opacity: envelope } = computePhase(frame, durationFrames, 1.0, vs?.opacity ?? 1, 0.05, 0.08);

  // How many chars are visible at this frame
  const totalTypingFrames = text.length * typingSpeed;
  const charsRevealed = Math.min(text.length, Math.floor(frame / typingSpeed));
  const isTypingDone = charsRevealed >= text.length;

  // Cursor blink (after typing is done)
  const cursorVisible = isTypingDone
    ? Math.floor((frame - totalTypingFrames) / 15) % 2 === 0 // blink every 15 frames
    : true; // always visible while typing

  const visibleText = text.slice(0, charsRevealed);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${(posX * 100).toFixed(1)}%`,
        top: `${(posY * 100).toFixed(1)}%`,
        transform: 'translate(-50%, -50%)',
        opacity: envelope,
        fontSize,
        fontFamily,
        fontWeight: 400,
        color,
        lineHeight: 1.2,
        whiteSpace: 'pre',
        textAlign: 'center',
      }}
    >
      {visibleText}
      <span style={{
        color: cursorColor,
        opacity: cursorVisible ? 1 : 0,
        fontWeight: 300,
      }}>
        |
      </span>
    </div>
  );
};
