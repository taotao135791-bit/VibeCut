/**
 * AsymmetricLayout — Premium giant text + glassmorphism info panel.
 * V3: Added glass panel on right, vignette, noise texture, glow accents.
 * Based on premium-frontend-ui: "massive contrast, glassmorphism, depth"
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { ease, clamp } from './gsap-utils';
import { computePhase, FONT } from '../pro-toolkit/utils';

let _asymGrainId = 0;

export const AsymmetricLayout: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || 'BIG\nIDEA';
  const lines = text.split('\n');
  const mainColor = (params.color as string) || '#ffffff';
  const accentColor = (params.accent_color as string) || '#4ce0d2';
  const bgColor = (params.bg_color as string) || '#06060f';
  const fontSize = (params.font_size as number) || 200;
  const labelText = (params.label as string) || '';

  const { opacity: envelope } = computePhase(frame, durationFrames, 1.0, 1.0, 0.08, 0.06);

  const mainProgress = ease(clamp(0, 1, frame / 18), 'elastic.out(1, 0.5)');
  const sideProgress = ease(clamp(0, 1, (frame - 12) / 15), 'power3.out');
  const lineHeight = clamp(0, 1, (frame - 15) / 25) * 500;

  const grainFilterId = React.useMemo(() => `asym-grain-${++_asymGrainId}`, []);

  return (
    <div style={{ position: 'absolute', inset: 0, background: bgColor, opacity: envelope, overflow: 'hidden' }}>
      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Left: GIANT text */}
      <div style={{
        position: 'absolute', left: '5%', top: '50%',
        transform: `translateY(-50%) translateX(${(1 - mainProgress) * -40}px)`,
        opacity: mainProgress,
        maxWidth: '65%',
        overflow: 'hidden',
      }}>
        {lines.slice(0, 2).map((line, i) => (
          <div key={i} style={{
            fontSize: Math.min(fontSize, i === 0 ? fontSize : fontSize * 0.85),
            fontWeight: 900, color: i === 0 ? mainColor : accentColor,
            lineHeight: 0.9, letterSpacing: -6,
            fontFamily: FONT.display,
            marginLeft: i * 30,
            textShadow: i === 0 ? `0 0 40px rgba(255,255,255,0.08)` : `0 0 30px ${accentColor}20`,
          }}>
            {line}
          </div>
        ))}
      </div>

      {/* Right: glass info panel */}
      <div style={{
        position: 'absolute', right: '5%', top: '10%', width: 220,
        opacity: sideProgress,
        transform: `translateY(${(1 - sideProgress) * 15}px)`,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '24px 28px',
        }}>
          <div style={{ fontSize: 11, color: '#666', letterSpacing: 3, marginBottom: 12, fontFamily: FONT.mono }}>
            {labelText || 'MOONSHOT AI'}
          </div>
          <div style={{ width: 35, height: 2, background: accentColor, marginBottom: 16, boxShadow: `0 0 12px ${accentColor}40` }} />
          <div style={{ fontSize: 13, color: '#888', lineHeight: 1.8, fontFamily: FONT.display }}>
            {lines.slice(2).join('\n') || 'K2.6 Launch\n2026'}
          </div>
        </div>
      </div>

      {/* Vertical accent line (glowing) */}
      <div style={{
        position: 'absolute', right: '18%', top: '8%',
        width: 1, height: lineHeight,
        background: `linear-gradient(180deg, ${accentColor}60, transparent)`,
        boxShadow: `0 0 15px ${accentColor}30`,
      }} />

      {/* Corner number decoration */}
      <div style={{
        position: 'absolute', right: '5%', bottom: '8%',
        fontSize: 90, fontWeight: 100, color: '#1a1a2a',
        fontFamily: FONT.display,
        opacity: sideProgress,
      }}>
        {(params.corner_number as string) || '01'}
      </div>

      {/* Noise grain overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: 0.03,
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
    </div>
  );
};
