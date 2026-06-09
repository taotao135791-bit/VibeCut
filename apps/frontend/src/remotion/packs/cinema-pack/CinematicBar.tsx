/**
 * CinematicBar — Letterbox / pillar bars for cinematic framing.
 * Adds black bars top+bottom (16:9→2.39:1) or left+right.
 * Instantly makes any content feel like a film, not a web page.
 * 
 * Also adds subtle vignette darkening at edges.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { ease, clamp } from './gsap-utils';
import { computePhase } from '../pro-toolkit/utils';

export const CinematicBar: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const barHeight = (params.intensity as number) ?? 10; // % of screen height per bar
  const color = (params.color as string) || '#000000';
  const showVignette = (params.animate as boolean) ?? true;
  const direction = (params.direction as string) || 'horizontal'; // horizontal | vertical

  const { opacity } = computePhase(frame, durationFrames, 1.0, 1.0, 0.08, 0.08);

  // Entrance: bars slide in from edges
  const enterProgress = ease(clamp(0, 1, frame / 20), 'power3.out');

  return (
    <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none', zIndex: 9000 }}>
      {direction === 'horizontal' ? (
        <>
          {/* Top bar */}
          <div style={{
            position: 'absolute',
            left: 0, right: 0, top: 0,
            height: `${barHeight}%`,
            background: color,
            transform: `translateY(-${(1 - enterProgress) * 100}%)`,
          }} />
          {/* Bottom bar */}
          <div style={{
            position: 'absolute',
            left: 0, right: 0, bottom: 0,
            height: `${barHeight}%`,
            background: color,
            transform: `translateY(${(1 - enterProgress) * 100}%)`,
          }} />
        </>
      ) : (
        <>
          {/* Left bar */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0, left: 0,
            width: `${barHeight}%`,
            background: color,
            transform: `translateX(-${(1 - enterProgress) * 100}%)`,
          }} />
          {/* Right bar */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0, right: 0,
            width: `${barHeight}%`,
            background: color,
            transform: `translateX(${(1 - enterProgress) * 100}%)`,
          }} />
        </>
      )}

      {/* Vignette overlay */}
      {showVignette && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.4) 100%)',
          opacity: enterProgress,
        }} />
      )}
    </div>
  );
};
