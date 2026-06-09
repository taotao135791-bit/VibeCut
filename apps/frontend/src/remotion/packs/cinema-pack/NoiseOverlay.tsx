/**
 * NoiseOverlay — Film grain / noise texture overlay.
 * Removes digital sterility. Adds photographic warmth and cinematic atmosphere.
 * Based on premium-frontend-ui skill: "Atmospheric Filters: noise overlays at 0.02-0.05 opacity"
 *
 * Uses SVG feTurbulence for deterministic, frame-independent grain.
 * Optionally animates grain seed for subtle movement.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase } from '../pro-toolkit/utils';

let _grainIdCounter = 0;

export const NoiseOverlay: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const intensity = (params.intensity as number) ?? 0.04; // 0.02-0.08 range
  const animate = (params.animate as boolean) ?? true;
  const blendMode = (params.blend_mode as string) || 'overlay'; // overlay | soft-light | multiply

  const { opacity } = computePhase(frame, durationFrames, 1.0, 1.0, 0.05, 0.05);

  // Stable unique ID per instance
  const grainId = React.useMemo(() => `noise-grain-${++_grainIdCounter}`, []);

  // Animate grain by shifting seed slightly per frame
  const seed = animate ? Math.floor(frame / 3) : 0;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      opacity: opacity * intensity / 0.04, // normalize so intensity=0.04 = full opacity
      pointerEvents: 'none',
      mixBlendMode: blendMode as any,
      zIndex: 9999, // always on top
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <filter id={grainId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="4"
            stitchTiles="stitch"
            seed={seed}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grainId})`} opacity="1" />
      </svg>
    </div>
  );
};
