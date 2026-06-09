/**
 * SplitReveal — Premium left/right split with glassmorphism text panels.
 * V2: Added frosted glass on text containers, glow accent, stronger contrast.
 * Based on premium-frontend-ui: "backdrop-filter: blur, ultra-thin borders"
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { ease, clamp } from './gsap-utils';

export const SplitReveal: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || 'LEFT\nRIGHT';
  const lines = text.split('\n');
  const leftText = lines[0] || '';
  const rightText = lines[1] || '';
  const leftColor = (params.color as string) || '#0a0a14';
  const rightColor = (params.accent_color as string) || '#f0f0f0';
  const accentColor = (params.label as string) || '#4ce0d2';
  const fontSize = (params.font_size as number) || 100;

  const leftProgress = ease(clamp(0, 1, frame / 20), 'power3.out');
  const rightProgress = ease(clamp(0, 1, (frame - 8) / 20), 'power3.out');

  // Exit
  const exitStart = durationFrames - 15;
  const exitProgress = frame > exitStart ? ease(clamp(0, 1, (frame - exitStart) / 15), 'power2.in') : 0;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Left half: dark */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: '50%', height: '100%',
        background: leftColor,
        clipPath: `inset(0 ${(1 - leftProgress) * 100}% 0 0)`,
      }}>
        <div style={{
          position: 'absolute', left: '8%', top: '50%', transform: 'translateY(-50%)',
          maxWidth: '80%',
        }}>
          {/* Frosted glass panel behind text */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '32px 40px',
          }}>
            <div style={{ fontSize, fontWeight: 200, color: '#ffffff', lineHeight: 0.95, letterSpacing: -3, fontFamily: "'Epilogue', sans-serif" }}>
              {leftText}
            </div>
          </div>
        </div>
      </div>

      {/* Right half: light */}
      <div style={{
        position: 'absolute', right: 0, top: 0, width: '50%', height: '100%',
        background: rightColor,
        clipPath: `inset(0 0 0 ${(1 - rightProgress) * 100}%)`,
      }}>
        <div style={{
          position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)',
          textAlign: 'right', maxWidth: '80%',
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.03)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 16,
            padding: '32px 40px',
          }}>
            <div style={{ fontSize, fontWeight: 800, color: leftColor, lineHeight: 0.95, letterSpacing: -3, fontFamily: "'Epilogue', sans-serif" }}>
              {rightText}
            </div>
          </div>
        </div>
      </div>

      {/* Center accent line (glowing) */}
      <div style={{
        position: 'absolute', left: '50%', top: 0, width: 3, height: '100%',
        background: `linear-gradient(180deg, transparent, ${accentColor}80, ${accentColor}, ${accentColor}80, transparent)`,
        transform: 'translateX(-50%)',
        opacity: Math.min(leftProgress, rightProgress) * (1 - exitProgress),
        boxShadow: `0 0 20px ${accentColor}40, 0 0 40px ${accentColor}20`,
      }} />
    </div>
  );
};
