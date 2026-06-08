/**
 * TransitionFlash — full-screen transition between segments.
 * Brand-colored flash wipe for scene transitions.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { PackComponentProps } from '../types';
import { colors, clamp } from './utils';

export const TransitionFlash: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const { primary, accent } = colors(params);
  const intensity = (params.intensity as number) ?? 0.7;

  const progress = durationFrames <= 1 ? 1 : clamp(frame / (durationFrames - 1), 0, 1);
  // Flash curve: rapid rise, slow fall
  const flash = Math.pow(1 - Math.abs(progress * 2 - 1), 1.5) * intensity;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, ${primary}${Math.round(flash * 200).toString(16).padStart(2, '0')}, ${accent}${Math.round(flash * 120).toString(16).padStart(2, '0')})`,
        opacity: flash,
      }} />
    </AbsoluteFill>
  );
};
