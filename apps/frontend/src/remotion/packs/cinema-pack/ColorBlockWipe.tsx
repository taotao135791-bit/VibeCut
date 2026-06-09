/**
 * ColorBlockWipe — Premium full-screen transition with gradient + light streak.
 * V2: Added gradient fill instead of flat color, light streak at wipe edge,
 * and subtle glow. Creates a "premium broadcast" transition feel.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { ease, clamp } from './gsap-utils';

export const ColorBlockWipe: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const color = (params.color as string) || '#4ce0d2';
  const direction = (params.direction as string) || 'right'; // right | down | diagonal

  // Wipe in (first 40%), hold (20%), wipe out (last 40%)
  const wipeInEnd = Math.round(durationFrames * 0.4);
  const holdEnd = Math.round(durationFrames * 0.6);

  let clipPathValue: string;

  if (frame < wipeInEnd) {
    const p = ease(clamp(0, 1, frame / wipeInEnd), 'power3.inOut');
    if (direction === 'down') clipPathValue = `inset(0 0 ${(1 - p) * 100}% 0)`;
    else if (direction === 'diagonal') clipPathValue = `polygon(0 0, ${p * 100}% 0, ${p * 80}% 100%, 0 100%)`;
    else clipPathValue = `inset(0 ${(1 - p) * 100}% 0 0)`;
  } else if (frame < holdEnd) {
    clipPathValue = direction === 'diagonal' ? 'polygon(0 0, 100% 0, 80% 100%, 0 100%)' : 'inset(0)';
  } else {
    const p = ease(clamp(0, 1, (frame - holdEnd) / (durationFrames - holdEnd)), 'power3.inOut');
    if (direction === 'down') clipPathValue = `inset(${p * 100}% 0 0 0)`;
    else if (direction === 'diagonal') clipPathValue = `polygon(${p * 100}% 0, 100% 0, ${80 + p * 20}% 100%, ${p * 100}% 100%)`;
    else clipPathValue = `inset(0 0 0 ${p * 100}%)`;
  }

  // Calculate wipe edge position for light streak
  let edgeX = 50;
  if (frame < wipeInEnd) {
    edgeX = ease(clamp(0, 1, frame / wipeInEnd), 'power3.inOut') * 100;
  } else if (frame >= holdEnd) {
    edgeX = 100 - ease(clamp(0, 1, (frame - holdEnd) / (durationFrames - holdEnd)), 'power3.inOut') * 100;
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      clipPath: clipPathValue,
      overflow: 'hidden',
    }}>
      {/* Gradient fill instead of flat color */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, ${color}, ${color}dd 50%, ${color}bb)`,
      }} />

      {/* Light streak at wipe edge */}
      {direction === 'right' && (
        <div style={{
          position: 'absolute',
          left: `${edgeX}%`, top: 0, bottom: 0,
          width: 80,
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 60%, transparent)`,
          transform: 'translateX(-50%)',
        }} />
      )}

      {/* Subtle noise texture on wipe */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: 0.06,
        mixBlendMode: 'overlay',
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />
    </div>
  );
};
