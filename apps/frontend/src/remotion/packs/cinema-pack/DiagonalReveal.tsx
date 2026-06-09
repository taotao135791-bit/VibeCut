/**
 * DiagonalReveal — Diagonal clip-path layout with asymmetric text positioning.
 * Breaks the grid with a dramatic diagonal slice. Text appears on either side.
 * Based on frontend-design skill: "Diagonal flow. Grid-breaking elements."
 *
 * The diagonal line animates from corner, revealing two distinct zones.
 * Each zone has its own color scheme and typography weight.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { ease, clamp, EASE_HEADLINE_ENTER } from './gsap-utils';
import { computePhase, FONT } from '../pro-toolkit/utils';

export const DiagonalReveal: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || 'BREAK\nTHE GRID';
  const lines = text.split('\n');
  const topText = lines[0] || '';
  const bottomText = lines[1] || '';
  const topColor = (params.color as string) || '#ffffff';
  const bottomColor = (params.accent_color as string) || '#4ce0d2';
  const bgColor = (params.bg_color as string) || '#0a0a14';
  const fontSize = (params.font_size as number) || 100;
  const label = (params.label as string) || '';

  const { opacity: envelope } = computePhase(frame, durationFrames, 1.0, 1.0, 0.08, 0.08);

  // Diagonal wipe progress
  const wipeProgress = ease(clamp(0, 1, frame / 22), 'power3.out');

  // Text entrance (staggered after wipe)
  const textProgress = ease(clamp(0, 1, (frame - 10) / 18), EASE_HEADLINE_ENTER);
  const bottomTextProgress = ease(clamp(0, 1, (frame - 16) / 18), 'power3.out');

  return (
    <div style={{ position: 'absolute', inset: 0, background: bgColor, opacity: envelope, overflow: 'hidden' }}>
      {/* Upper zone (dark) — revealed by diagonal clip */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: `polygon(0 0, ${60 + wipeProgress * 40}% 0, ${10 + wipeProgress * 30}% 100%, 0 100%)`,
        background: bgColor,
      }}>
        {/* Top text — upper-left, bold */}
        <div style={{
          position: 'absolute',
          left: '8%', top: '30%',
          transform: `translateX(${(1 - textProgress) * -60}px)`,
          opacity: textProgress,
        }}>
          <div style={{
            fontSize,
            fontWeight: 900,
            color: topColor,
            lineHeight: 0.95,
            letterSpacing: -3,
            fontFamily: FONT.display,
            textShadow: '0 0 40px rgba(255,255,255,0.15)',
          }}>
            {topText}
          </div>
          {/* Label / tag */}
          {label && (
            <div style={{
              marginTop: 16,
              fontSize: 13,
              fontWeight: 500,
              color: bottomColor,
              letterSpacing: 4,
              textTransform: 'uppercase',
              fontFamily: FONT.mono,
              opacity: bottomTextProgress,
            }}>
              {label}
            </div>
          )}
        </div>
      </div>

      {/* Lower zone (accent color) — revealed from bottom-right */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: `polygon(${60 + wipeProgress * 40}% 0, 100% 0, 100% 100%, ${10 + wipeProgress * 30}% 100%)`,
        background: `linear-gradient(135deg, ${bgColor}, ${bottomColor}20)`,
      }}>
        {/* Bottom text — lower-right, lighter weight */}
        <div style={{
          position: 'absolute',
          right: '8%', bottom: '25%',
          textAlign: 'right',
          transform: `translateX(${(1 - bottomTextProgress) * 60}px)`,
          opacity: bottomTextProgress,
        }}>
          <div style={{
            fontSize: fontSize * 0.6,
            fontWeight: 300,
            color: `${topColor}cc`,
            lineHeight: 1.3,
            letterSpacing: 1,
            fontFamily: FONT.display,
          }}>
            {bottomText}
          </div>
        </div>
      </div>

      {/* Diagonal accent line (glowing) */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: `polygon(${59 + wipeProgress * 40}% 0, ${61 + wipeProgress * 40}% 0, ${11 + wipeProgress * 30}% 100%, ${9 + wipeProgress * 30}% 100%)`,
        background: `linear-gradient(180deg, ${bottomColor}80, ${bottomColor}30)`,
        opacity: wipeProgress,
      }} />

      {/* Subtle corner accent dot */}
      <div style={{
        position: 'absolute',
        right: '6%', top: '6%',
        width: 6, height: 6,
        borderRadius: '50%',
        background: bottomColor,
        opacity: bottomTextProgress,
        boxShadow: `0 0 12px ${bottomColor}60`,
      }} />
    </div>
  );
};
