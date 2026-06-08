/**
 * SplashReveal — fullscreen hook opener.
 * High-impact reveal with line-by-line stagger animation.
 * Used for the first 1.5-3 seconds to grab attention.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { PackComponentProps } from '../types';
import { computePhase, spring, clamp, colors, FONT, breathe, easeOut } from './utils';

export const SplashReveal: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const intensity = (params.intensity as number) ?? 1.0;
  const { primary, accent, bg, text } = colors(params);
  const content = clip.subtitle_text || '57% OFF';
  const lines = content.split('\n').filter(Boolean);
  const motion = (params.motion_preset as string) ?? 'spring';

  // Overall envelope
  const { opacity } = computePhase(frame, durationFrames, intensity, clip.video_style?.opacity ?? 1, 0.08, 0.15);

  // Per-line stagger: each line enters 4 frames after the previous
  const staggerDelay = 5; // frames between each line start
  const lineDuration = 12; // frames for each line to fully enter

  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
      {/* Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(145deg, ${bg} 0%, rgba(0,0,0,0.97) 100%)`,
      }} />
      {/* Subtle grid texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 80px), repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 80px)',
        opacity: 0.5,
      }} />
      {/* Accent glow */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: '60%',
        height: '40%',
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(ellipse, ${accent}12 0%, transparent 70%)`,
        filter: 'blur(40px)',
      }} />
      {/* Content */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) scale(${breathe(frame, 0.004)})`,
        textAlign: 'center',
        width: '80%',
      }}>
        {lines.map((line, i) => {
          const lineProgress = clamp((frame - i * staggerDelay) / lineDuration, 0, 1);
          const lineEnter = motion === 'spring' ? spring(lineProgress, 0.65) : easeOut(lineProgress);
          const lineOpacity = clamp(lineProgress / 0.3, 0, 1);
          const isFirstLine = i === 0;
          const fontSize = isFirstLine
            ? Math.min(120, Math.max(48, 900 / Math.max(line.length, 1)))
            : Math.min(36, Math.max(18, 500 / Math.max(line.length, 1)));

          return (
            <div
              key={i}
              style={{
                opacity: lineOpacity,
                transform: `translateY(${(1 - lineEnter) * 30}px) scale(${0.9 + 0.1 * lineEnter})`,
                marginBottom: isFirstLine ? 20 : 8,
                fontSize,
                fontWeight: isFirstLine ? 900 : 600,
                fontFamily: FONT.display,
                color: isFirstLine ? text : `${text}cc`,
                lineHeight: 1.0,
                letterSpacing: isFirstLine ? -1 : 0.5,
                textShadow: isFirstLine
                  ? `0 4px 30px ${accent}40, 0 0 80px ${primary}20`
                  : 'none',
              }}
            >
              {line}
            </div>
          );
        })}
        {/* Accent underline */}
        <div style={{
          marginTop: 24,
          height: 3,
          width: 120,
          margin: '24px auto 0',
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: clamp((frame - lines.length * staggerDelay) / 10, 0, 1),
          boxShadow: `0 0 16px ${accent}60`,
        }} />
      </div>
    </AbsoluteFill>
  );
};
