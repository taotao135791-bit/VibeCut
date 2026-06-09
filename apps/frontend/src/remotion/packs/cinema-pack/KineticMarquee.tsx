/**
 * KineticMarquee — Endless horizontal text band, scrolling perpetually.
 * Inspired by taste-skill "Kinetic Marquee - Endless text bands reversing on scroll."
 *
 * Creates a visual rhythm/energy layer. Text scrolls left continuously.
 * Uses large mono/display type + accent separators for editorial feel.
 * Deterministic: position = f(frame), no Math.random.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, FONT } from '../pro-toolkit/utils';
import { clamp } from './gsap-utils';

export const KineticMarquee: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || 'KIMI K2.6';
  const color = (params.color as string) || '#ffffff';
  const accentColor = (params.accent_color as string) || '#4ce0d2';
  const fontSize = (params.font_size as number) || 80;
  const fontFamily = (params.font_family as string) || FONT.display;
  const speed = (params.intensity as number) ?? 3; // px per frame
  const direction = (params.direction as string) || 'left'; // left | right
  const yPosition = (params.pos_y as number) ?? 0.5; // vertical position 0-1
  const separatorChar = (params.label as string) || ' \u2022 '; // bullet separator
  const showSecondRow = (params.show_second_row as boolean) ?? false;

  const { opacity: envelope } = computePhase(frame, durationFrames, 1.0, 1.0, 0.08, 0.08);

  // Build repeated text strip (long enough to fill + scroll)
  const separator = separatorChar;
  const fullText = Array(8).fill(`${text}${separator}`).join('');

  // Calculate scroll offset
  const dirMul = direction === 'right' ? 1 : -1;
  const offset = (frame * speed * dirMul) % (fullText.length * fontSize * 0.5); // rough character width

  // Entrance: fade + slight Y offset
  const enterProgress = clamp(0, 1, frame / 12);
  const enterY = (1 - enterProgress) * 20;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: envelope, overflow: 'hidden' }}>
      {/* Main marquee row */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        top: `${(yPosition * 100).toFixed(1)}%`,
        transform: `translateY(-50%) translateY(${enterY}px)`,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'inline-block',
          transform: `translateX(${offset}px)`,
          fontSize,
          fontFamily,
          fontWeight: 800,
          color,
          letterSpacing: -2,
          lineHeight: 1,
          opacity: enterProgress,
        }}>
          {fullText.split(separator).map((word, i) => (
            <span key={i}>
              <span>{word}</span>
              {i < fullText.split(separator).length - 1 && (
                <span style={{ color: accentColor, margin: '0 20px', opacity: 0.6 }}>
                  {separator.trim()}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Optional second row (reversed direction, lighter) */}
      {showSecondRow && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          top: `${((yPosition + 0.08) * 100).toFixed(1)}%`,
          transform: 'translateY(-50%)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'inline-block',
            transform: `translateX(${-offset * 0.7}px)`,
            fontSize: fontSize * 0.6,
            fontFamily: FONT.mono,
            fontWeight: 400,
            color: `${color}40`,
            letterSpacing: 2,
            lineHeight: 1,
            opacity: enterProgress * 0.5,
          }}>
            {fullText}
          </div>
        </div>
      )}

      {/* Fade edges (left/right gradient masks) */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '10%',
        background: 'linear-gradient(90deg, rgba(6,6,15,0.9), transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '10%',
        background: 'linear-gradient(270deg, rgba(6,6,15,0.9), transparent)',
        pointerEvents: 'none',
      }} />
    </div>
  );
};
