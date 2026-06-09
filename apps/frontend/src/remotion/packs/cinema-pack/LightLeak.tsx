/**
 * LightLeak — Anamorphic light streak / lens flare overlay.
 * Adds professional cinematography feel — like light hitting the lens.
 * Based on premium-frontend-ui: "Lighting & Glass: frosted-glass depth"
 *
 * Horizontal streak that sweeps across or pulses in place.
 * Creates "expensive" look — signals production value.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { ease, clamp } from './gsap-utils';
import { computePhase } from '../pro-toolkit/utils';

export const LightLeak: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const color = (params.color as string) || '#4ce0d2';
  const intensity = (params.intensity as number) ?? 0.3; // 0.1-0.6
  const mode = (params.direction as string) || 'sweep'; // sweep | pulse | flare

  const { opacity } = computePhase(frame, durationFrames, 1.0, 1.0, 0.05, 0.1);

  if (mode === 'sweep') {
    // Horizontal light sweep from left to right
    const sweepProgress = ease(clamp(0, 1, frame / (durationFrames * 0.6)), 'power2.inOut');
    const streakX = -30 + sweepProgress * 160; // -30% to 130%

    return (
      <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Main horizontal streak */}
        <div style={{
          position: 'absolute',
          left: `${streakX}%`, top: 0, bottom: 0,
          width: '25%',
          background: `linear-gradient(90deg, transparent, ${color}${Math.round(intensity * 40).toString(16).padStart(2, '0')} 20%, ${color}${Math.round(intensity * 80).toString(16).padStart(2, '0')} 50%, ${color}${Math.round(intensity * 40).toString(16).padStart(2, '0')} 80%, transparent)`,
          transform: 'skewX(-5deg)',
          mixBlendMode: 'screen',
        }} />
        {/* Wider ambient glow */}
        <div style={{
          position: 'absolute',
          left: `${streakX - 10}%`, top: '20%', bottom: '20%',
          width: '45%',
          background: `radial-gradient(ellipse at center, ${color}${Math.round(intensity * 20).toString(16).padStart(2, '0')}, transparent 70%)`,
          mixBlendMode: 'screen',
        }} />
      </div>
    );
  }

  if (mode === 'pulse') {
    // Pulsing center glow
    const pulsePhase = Math.sin(frame * 0.04);
    const pulseIntensity = intensity * (0.6 + 0.4 * pulsePhase);

    return (
      <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute',
          left: '30%', top: '10%', width: '40%', height: '80%',
          background: `radial-gradient(ellipse at center, ${color}${Math.round(pulseIntensity * 60).toString(16).padStart(2, '0')}, transparent 60%)`,
          mixBlendMode: 'screen',
        }} />
      </div>
    );
  }

  // mode === 'flare' — Anamorphic lens flare (horizontal line through center)
  const flareProgress = ease(clamp(0, 1, frame / 15), 'power3.out');
  const flareWidth = 100 * flareProgress;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      {/* Main flare line */}
      <div style={{
        position: 'absolute',
        left: `${50 - flareWidth / 2}%`, top: '48%',
        width: `${flareWidth}%`, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}80 30%, #ffffff60 50%, ${color}80 70%, transparent)`,
        mixBlendMode: 'screen',
        opacity: flareProgress,
      }} />
      {/* Wider glow behind */}
      <div style={{
        position: 'absolute',
        left: `${50 - flareWidth / 3}%`, top: '45%',
        width: `${flareWidth * 0.66}%`, height: '10%',
        background: `radial-gradient(ellipse at center, ${color}30, transparent 70%)`,
        mixBlendMode: 'screen',
        opacity: flareProgress * 0.6,
      }} />
      {/* Central bright spot */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '48%',
        width: 120, height: 120,
        background: `radial-gradient(circle, #ffffff30, ${color}20 40%, transparent 70%)`,
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        mixBlendMode: 'screen',
        opacity: flareProgress * 0.8,
      }} />
    </div>
  );
};
