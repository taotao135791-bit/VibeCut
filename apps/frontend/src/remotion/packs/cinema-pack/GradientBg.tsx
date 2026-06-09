/**
 * GradientBg — Premium atmospheric gradient background.
 * V2: mesh gradient + vignette + noise grain + light bloom.
 * Based on premium-frontend-ui: "gradient meshes, noise textures, dramatic shadows"
 *
 * Creates a rich, layered atmosphere that never feels flat.
 * Multi-source radial gradients drift independently for organic movement.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { clamp, computePhase } from '../pro-toolkit/utils';

let _grainId = 0;

export const GradientBg: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const color1 = (params.color as string) || '#06060f';
  const color2 = (params.accent_color as string) || '#4ce0d2';
  const intensity = (params.intensity as number) ?? 0.2;
  const showGrain = (params.show_grain as boolean) ?? true;
  const showVignette = (params.show_vignette as boolean) ?? true;

  const { opacity } = computePhase(frame, durationFrames, 1.0, 1.0, 0.1, 0.1);

  // Breathing: scale oscillates slowly
  const breathCycle = Math.sin(frame * 0.025) * 0.06;
  const scale = 1.0 + breathCycle;

  // Independent drift for each gradient source
  const drift1X = 35 + Math.sin(frame * 0.012) * 8;
  const drift1Y = 40 + Math.cos(frame * 0.01) * 6;
  const drift2X = 70 + Math.cos(frame * 0.015) * 7;
  const drift2Y = 60 + Math.sin(frame * 0.013) * 5;
  const drift3X = 50 + Math.sin(frame * 0.018) * 10;
  const drift3Y = 30 + Math.cos(frame * 0.02) * 8;

  // Grain filter ID
  const grainFilterId = React.useMemo(() => `gbg-grain-${++_grainId}`, []);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity, overflow: 'hidden' }}>
      {/* Base fill */}
      <div style={{ position: 'absolute', inset: 0, background: color1 }} />

      {/* Primary radial glow (main accent) */}
      <div style={{
        position: 'absolute', inset: '-30%',
        background: `radial-gradient(ellipse at ${drift1X}% ${drift1Y}%, ${color2}${Math.round(intensity * 255).toString(16).padStart(2, '0')} 0%, transparent 55%)`,
        transform: `scale(${scale})`,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }} />

      {/* Secondary glow (offset, weaker) */}
      <div style={{
        position: 'absolute', inset: '-20%',
        background: `radial-gradient(ellipse at ${drift2X}% ${drift2Y}%, ${color2}${Math.round(intensity * 128).toString(16).padStart(2, '0')} 0%, transparent 45%)`,
        transform: `scale(${1 + breathCycle * 0.4})`,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }} />

      {/* Third glow (warm accent, center-upper) */}
      <div style={{
        position: 'absolute', inset: '-15%',
        background: `radial-gradient(ellipse at ${drift3X}% ${drift3Y}%, rgba(255,255,255,${intensity * 0.06}) 0%, transparent 50%)`,
        transform: `scale(${1 + breathCycle * 0.3})`,
        pointerEvents: 'none',
      }} />

      {/* Mesh gradient overlay (subtle color variation) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `conic-gradient(from ${frame * 0.3}deg at 50% 50%, transparent 0%, ${color2}08 25%, transparent 50%, ${color2}05 75%, transparent 100%)`,
        pointerEvents: 'none',
      }} />

      {/* Vignette */}
      {showVignette && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Film grain noise texture */}
      {showGrain && (
        <div style={{
          position: 'absolute', inset: 0,
          opacity: 0.035,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
        }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <filter id={grainFilterId}>
              <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" stitchTiles="stitch" seed={Math.floor(frame / 3)} />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#${grainFilterId})`} opacity="1" />
          </svg>
        </div>
      )}
    </div>
  );
};
