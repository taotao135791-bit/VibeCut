/**
 * LiquidGlassCard — Apple Liquid Glass approximation for video.
 * Inspired by taste-skill Appendix C: "Liquid Glass Web Approximation"
 * 
 * Multi-layer glass effect: backdrop-blur + inner border highlights +
 * inner shadow refractions + radial highlight for physical edge.
 * More premium than basic GlassPanel — this is the "expensive" version.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { ease, clamp } from './gsap-utils';
import { computePhase, FONT } from '../pro-toolkit/utils';

export const LiquidGlassCard: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || '';
  const subtext = (params.label as string) || '';
  const color = (params.color as string) || '#ffffff';
  const accentColor = (params.accent_color as string) || '#4ce0d2';
  const fontSize = (params.font_size as number) || 52;
  const blurAmount = (params.intensity as number) ?? 24;

  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;

  const { opacity: envelope } = computePhase(frame, durationFrames, 1.0, vs?.opacity ?? 1, 0.1, 0.08);

  // Entrance
  const enterProgress = ease(clamp(0, 1, frame / 22), 'power3.out');
  const scale = 0.9 + 0.1 * enterProgress;
  const enterOpacity = enterProgress;

  // Gentle float
  const floatY = Math.sin(frame * 0.02) * 2;

  // Inner highlight animation (light sweeps across the glass)
  const highlightAngle = 135 + Math.sin(frame * 0.015) * 20;

  return (
    <div style={{
      position: 'absolute',
      left: `${(posX * 100).toFixed(1)}%`,
      top: `${(posY * 100).toFixed(1)}%`,
      transform: `translate(-50%, -50%) scale(${scale}) translateY(${floatY}px)`,
      opacity: envelope * enterOpacity,
    }}>
      {/* The liquid glass container */}
      <div style={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        borderRadius: 28,
        // Multi-layer background (Appendix C approach)
        background: `
          linear-gradient(${highlightAngle}deg, rgba(255,255,255,0.25), rgba(255,255,255,0.06)),
          rgba(255,255,255,0.08)
        `,
        backdropFilter: `blur(${blurAmount}px) saturate(180%) contrast(1.05)`,
        WebkitBackdropFilter: `blur(${blurAmount}px) saturate(180%) contrast(1.05)`,
        border: '1px solid rgba(255,255,255,0.28)',
        // Multi-layer box shadow for physical depth
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,0.45)',
          'inset 0 -1px 0 rgba(255,255,255,0.1)',
          '0 18px 60px rgba(0,0,0,0.2)',
          `0 0 40px ${accentColor}08`,
        ].join(', '),
        padding: '44px 56px',
        minWidth: 360,
        maxWidth: '75vw',
      }}>
        {/* Top refraction highlight (::before equivalent) */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: -1,
          borderRadius: 'inherit',
          background: `
            radial-gradient(circle at 20% 0%, rgba(255,255,255,0.5), transparent 34%),
            linear-gradient(90deg, rgba(255,255,255,0.15), transparent 42%, rgba(255,255,255,0.1))
          `,
          pointerEvents: 'none',
        }} />

        {/* Inner border ring (::after equivalent) */}
        <div style={{
          position: 'absolute', inset: 1,
          borderRadius: 'inherit',
          border: '1px solid rgba(255,255,255,0.12)',
          pointerEvents: 'none',
        }} />

        {/* Content */}
        {text && (
          <div style={{
            fontSize,
            fontWeight: 700,
            color,
            lineHeight: 1.15,
            letterSpacing: -1,
            fontFamily: FONT.display,
            marginBottom: subtext ? 14 : 0,
            textShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            {text}
          </div>
        )}

        {subtext && (
          <div style={{
            fontSize: 16,
            fontWeight: 400,
            color: `${color}88`,
            lineHeight: 1.6,
            letterSpacing: 0.2,
            fontFamily: FONT.display,
          }}>
            {subtext}
          </div>
        )}

        {/* Accent dot indicator */}
        <div style={{
          position: 'absolute',
          top: 20, right: 24,
          width: 8, height: 8,
          borderRadius: '50%',
          background: accentColor,
          boxShadow: `0 0 12px ${accentColor}60`,
          opacity: 0.5 + 0.3 * Math.sin(frame * 0.05),
        }} />
      </div>
    </div>
  );
};
