/**
 * GlitchText — Premium chromatic aberration + scanlines + position jitter.
 * V2: Added CRT scanlines, stronger RGB split, data-corruption aesthetic.
 * Based on premium-frontend-ui: "Cyber / Technical: glowing neon accents, rapid staggered reveals"
 *
 * Creates a "signal interference" feel that signals tech/digital products.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, FONT } from '../pro-toolkit/utils';
import { ease, clamp } from './gsap-utils';

export const GlitchText: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || 'GLITCH';
  const color = (params.color as string) || '#ffffff';
  const fontSize = (params.font_size as number) || 120;
  const fontFamily = (params.font_family as string) || FONT.display;
  const glitchIntensity = (params.intensity as number) ?? 1.0;
  const showScanlines = (params.show_scanlines as boolean) ?? true;

  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;

  const { opacity: envelope } = computePhase(frame, durationFrames, 1.0, vs?.opacity ?? 1, 0.05, 0.05);

  // Glitch intensity decays over time (heavy at start, settles)
  const decayProgress = clamp(0, 1, frame / (durationFrames * 0.3));
  const currentIntensity = glitchIntensity * (1 - ease(decayProgress, 'power3.out'));

  // Pseudo-random jitter (deterministic per frame for Remotion)
  // impeccable: keep jitter small enough to never leave safe area
  const jitterX = Math.sin(frame * 7.3) * 6 * currentIntensity;
  const jitterY = Math.cos(frame * 5.7) * 3 * currentIntensity;

  // RGB split offsets (constrained to prevent overflow)
  const splitR = { x: -3 * currentIntensity - 1, y: 1 * currentIntensity };
  const splitB = { x: 3 * currentIntensity + 1, y: -1 * currentIntensity };

  // Flicker (random opacity drops)
  const flicker = Math.sin(frame * 13.7) > 0.7 ? 0.7 : 1.0;

  // Horizontal slice displacement (constrained)
  const sliceOffset = Math.sin(frame * 19.3) > 0.85 ? Math.cos(frame * 23.1) * 15 * currentIntensity : 0;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${(posX * 100).toFixed(1)}%`,
    top: `${(posY * 100).toFixed(1)}%`,
    fontSize,
    fontFamily,
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    textAlign: 'center',
    letterSpacing: -2,
    willChange: 'transform',
    maxWidth: '90%',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: envelope * flicker, overflow: 'hidden' }}>
      {/* Scanlines overlay */}
      {showScanlines && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
          pointerEvents: 'none',
          zIndex: 10,
        }} />
      )}

      {/* Red channel */}
      <div style={{
        ...baseStyle,
        color: '#ff003c',
        opacity: 0.75,
        transform: `translate(calc(-50% + ${splitR.x + jitterX + sliceOffset}px), calc(-50% + ${splitR.y + jitterY}px))`,
        mixBlendMode: 'screen',
      }}>
        {text}
      </div>
      {/* Blue channel */}
      <div style={{
        ...baseStyle,
        color: '#00e5ff',
        opacity: 0.75,
        transform: `translate(calc(-50% + ${splitB.x + jitterX}px), calc(-50% + ${splitB.y + jitterY}px))`,
        mixBlendMode: 'screen',
      }}>
        {text}
      </div>
      {/* Main (white) channel */}
      <div style={{
        ...baseStyle,
        color,
        transform: `translate(calc(-50% + ${jitterX * 0.3}px), calc(-50% + ${jitterY * 0.3}px))`,
        textShadow: `0 0 ${8 * currentIntensity}px rgba(255,255,255,0.3)`,
      }}>
        {text}
      </div>

      {/* Occasional horizontal slice flash */}
      {Math.sin(frame * 11.3) > 0.9 && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          top: `${40 + Math.sin(frame * 17) * 20}%`,
          height: 3,
          background: color,
          opacity: 0.3 * currentIntensity,
          transform: `translateX(${sliceOffset * 2}px)`,
        }} />
      )}
    </div>
  );
};
