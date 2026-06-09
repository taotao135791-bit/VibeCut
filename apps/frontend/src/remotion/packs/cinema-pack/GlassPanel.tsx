/**
 * GlassPanel — Frosted glass card with backdrop-filter blur.
 * Premium depth layer inspired by premium-frontend-ui:
 * "backdrop-filter: blur(x) combined with ultra-thin, semi-transparent borders"
 *
 * Creates a floating glass card that can contain text or serve as a
 * visual anchor. The glass effect adds immediate perceived quality.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { ease, clamp } from './gsap-utils';
import { computePhase } from '../pro-toolkit/utils';

export const GlassPanel: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || '';
  const subtext = (params.label as string) || '';
  const color = (params.color as string) || '#ffffff';
  const accentColor = (params.accent_color as string) || '#4ce0d2';
  const blurAmount = (params.intensity as number) ?? 20; // px blur
  const fontSize = (params.font_size as number) || 48;
  const subFontSize = (params.font_size2 as number) || 16;
  const borderRadius = (params.border_radius as number) ?? 24;
  const borderColor = (params.border_color as string) || 'rgba(255,255,255,0.12)';
  const bgColor = (params.bg_color as string) || 'rgba(255,255,255,0.06)';

  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;

  const { opacity: envelope } = computePhase(frame, durationFrames, 1.0, vs?.opacity ?? 1, 0.1, 0.08);

  // Entrance: scale up from 0.92 + fade
  const enterProgress = ease(clamp(0, 1, frame / 18), 'power3.out');
  const scale = 0.92 + 0.08 * enterProgress;
  const enterOpacity = enterProgress;

  // Subtle float (continuous gentle bob)
  const floatY = Math.sin(frame * 0.025) * 3;

  return (
    <div style={{
      position: 'absolute',
      left: `${(posX * 100).toFixed(1)}%`,
      top: `${(posY * 100).toFixed(1)}%`,
      transform: `translate(-50%, -50%) scale(${scale}) translateY(${floatY}px)`,
      opacity: envelope * enterOpacity,
    }}>
      {/* Glass card */}
      <div style={{
        background: bgColor,
        backdropFilter: `blur(${blurAmount}px)`,
        WebkitBackdropFilter: `blur(${blurAmount}px)`,
        border: `1px solid ${borderColor}`,
        borderRadius,
        padding: '40px 52px',
        minWidth: 320,
        maxWidth: '70vw',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute',
          top: 0, left: '10%', right: '10%', height: 1,
          background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
        }} />

        {/* Main text */}
        {text && (
          <div style={{
            fontSize,
            fontWeight: 700,
            color,
            lineHeight: 1.2,
            letterSpacing: -0.5,
            marginBottom: subtext ? 12 : 0,
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          }}>
            {text}
          </div>
        )}

        {/* Subtext */}
        {subtext && (
          <div style={{
            fontSize: subFontSize,
            fontWeight: 400,
            color: `${color}99`,
            lineHeight: 1.6,
            letterSpacing: 0.3,
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          }}>
            {subtext}
          </div>
        )}

        {/* Inner glow at bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: '20%', right: '20%', height: 60,
          background: `radial-gradient(ellipse at bottom, ${accentColor}15, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
};
