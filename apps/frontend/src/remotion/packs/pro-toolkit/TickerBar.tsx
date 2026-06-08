/**
 * TickerBar — live-style information bar with scanning LED and text.
 * Place at top or bottom of the frame. Great for persistent promo info.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, boxPosition, colors, FONT } from './utils';

export const TickerBar: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const intensity = (params.intensity as number) ?? 0.92;
  const { primary, accent, text } = colors(params);
  const content = clip.subtitle_text || 'LIVE OFFER';

  const { enter, opacity } = computePhase(frame, durationFrames, intensity, clip.video_style?.opacity ?? 1, 0.1, 0.08);
  const box = boxPosition(clip, opacity);

  // Scanning light animation
  const scanPos = ((frame * 2.5) % 120) - 10; // percentage

  return (
    <div style={{
      ...box,
      background: 'rgba(0,0,0,0.78)',
      backdropFilter: 'blur(10px)',
      borderTop: `1px solid ${primary}40`,
      borderBottom: `1px solid ${primary}40`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      overflow: 'hidden',
      transform: `translateY(${(1 - enter) * -100}%)`,
      fontFamily: FONT.body,
    }}>
      {/* Scan line */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        background: `linear-gradient(90deg, transparent ${scanPos - 8}%, ${primary}15 ${scanPos}%, transparent ${scanPos + 8}%)`,
        pointerEvents: 'none',
      }} />
      {/* Left: LED + text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
        {/* Pulsing LED */}
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: accent,
          boxShadow: `0 0 10px ${accent}, 0 0 20px ${accent}60`,
          opacity: 0.7 + Math.sin(frame * 0.12) * 0.3,
        }} />
        <span style={{
          fontSize: 18,
          fontWeight: 750,
          color: text,
          letterSpacing: 0.5,
        }}>
          {content}
        </span>
      </div>
      {/* Right: LIVE badge */}
      <div style={{
        padding: '4px 12px',
        borderRadius: 4,
        background: `${accent}20`,
        border: `1px solid ${accent}60`,
        fontSize: 11,
        fontWeight: 800,
        color: accent,
        letterSpacing: 2,
        zIndex: 1,
      }}>
        LIVE
      </div>
    </div>
  );
};
