/**
 * PerspectiveGrid — Premium 3D scrolling grid background with depth.
 * V2: Added vignette, stronger horizon glow, scanlines, breathing animation.
 * Based on premium-frontend-ui: "Cyber / Technical: dark mode dominance, neon accents"
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase } from '../pro-toolkit/utils';

export const PerspectiveGrid: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const gridColor = (params.accent_color as string) || '#4ce0d2';
  const bgColor = (params.color as string) || '#050510';
  const speed = (params.intensity as number) ?? 2;

  const { opacity } = computePhase(frame, durationFrames, 1.0, 1.0, 0.08, 0.08);
  const scrollZ = frame * speed;

  // Breathing glow
  const glowPulse = 0.8 + 0.2 * Math.sin(frame * 0.04);

  return (
    <div style={{ position: 'absolute', inset: 0, background: bgColor, perspective: 600, overflow: 'hidden', opacity }}>
      {/* Grid plane */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 3000, height: 3000,
        transform: `translate(-50%, -50%) rotateX(72deg) translateZ(${scrollZ % 120}px)`,
        transformStyle: 'preserve-3d',
        backgroundImage: `
          linear-gradient(${gridColor}25 1px, transparent 1px),
          linear-gradient(90deg, ${gridColor}25 1px, transparent 1px)
        `,
        backgroundSize: '120px 120px',
      }} />

      {/* Horizon line (brighter) */}
      <div style={{
        position: 'absolute', left: 0, top: '48%', width: '100%', height: 1,
        background: `linear-gradient(90deg, transparent, ${gridColor}${Math.round(glowPulse * 96).toString(16).padStart(2, '0')}, transparent)`,
      }} />

      {/* Central glow (larger, pulsing) */}
      <div style={{
        position: 'absolute', left: '50%', top: '44%', width: 200, height: 200,
        background: `radial-gradient(circle, ${gridColor}${Math.round(glowPulse * 64).toString(16).padStart(2, '0')}, transparent 70%)`,
        borderRadius: '50%', transform: 'translate(-50%, -50%)',
        boxShadow: `0 0 120px ${gridColor}${Math.round(glowPulse * 48).toString(16).padStart(2, '0')}`,
      }} />

      {/* Scanline overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 6px)',
        pointerEvents: 'none',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
};
