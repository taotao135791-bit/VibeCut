/**
 * ShapeBurst — Premium exploding geometric shapes with glow trails.
 * V2: Added glow trails on shapes, stronger flash, bokeh-like blur on small shapes.
 * Based on premium-frontend-ui: "dimensional hover states, tactile feedback"
 */

import React from 'react';
import { spring, useVideoConfig } from 'remotion';
import type { PackComponentProps } from '../types';
import { computePhase } from '../pro-toolkit/utils';
import { clamp } from './gsap-utils';

export const ShapeBurst: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const { fps } = useVideoConfig();
  const params = clip.effect_params ?? {};
  const colors = [
    (params.color as string) || '#4ce0d2',
    (params.accent_color as string) || '#a78bfa',
    '#fbbf24', '#ff6b6b',
  ];
  const count = (params.particle_count as number) || 18;
  const bgColor = (params.bg_color as string) || '';

  const { opacity: envelope } = computePhase(frame, durationFrames, 1.0, 1.0, 0.03, 0.15);

  // Spring-driven explosion
  const explodeProgress = spring({ frame: frame - 5, fps, config: { damping: 18, stiffness: 80 } });

  const shapes = React.useMemo(() =>
    Array.from({ length: count }).map((_, i) => ({
      angle: (i / count) * Math.PI * 2 + (i * 0.618) * 0.4,
      distance: 120 + (Math.sin(i * 2.7) + 1) * 120, // wider spread
      size: 15 + (Math.cos(i * 1.9) + 1) * 18,
      rotation: i * 47,
      color: colors[i % colors.length],
      isCircle: i % 3 !== 0,
      glowSize: 10 + (Math.sin(i * 3.1) + 1) * 8,
    }))
  , [count]);

  // Fade out shapes at end
  const fadeOut = clamp(0, 1, (durationFrames - frame) / 20);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: envelope, overflow: 'hidden', background: bgColor || undefined }}>
      {/* Flash at start (stronger) */}
      {frame > 3 && frame < 12 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 50%, #ffffff, ${colors[0]})`,
          opacity: clamp(0, 1, (12 - frame) / 9) * 0.4,
        }} />
      )}

      {/* Shapes with glow */}
      {shapes.map((s, i) => {
        const x = Math.cos(s.angle) * s.distance * explodeProgress;
        const y = Math.sin(s.angle) * s.distance * explodeProgress;
        const rot = s.rotation * explodeProgress;
        return (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: s.size, height: s.size,
            background: s.color, borderRadius: s.isCircle ? '50%' : '20%',
            transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}deg) scale(${explodeProgress})`,
            opacity: fadeOut * 0.85,
            boxShadow: `0 0 ${s.glowSize}px ${s.color}60, 0 0 ${s.glowSize * 3}px ${s.color}20`,
            filter: s.size < 20 ? `blur(${1 * (1 - explodeProgress)}px)` : undefined,
          }} />
        );
      })}

      {/* Center residual glow */}
      {explodeProgress > 0.1 && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 80, height: 80,
          background: `radial-gradient(circle, ${colors[0]}30, transparent 70%)`,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: (1 - explodeProgress) * 0.6,
          boxShadow: `0 0 60px ${colors[0]}20`,
        }} />
      )}
    </div>
  );
};
