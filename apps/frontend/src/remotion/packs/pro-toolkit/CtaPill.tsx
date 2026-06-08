/**
 * CtaPill — call-to-action button with gradient shine sweep animation.
 * Spring-scale entrance, subtle idle breathing.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, boxPosition, colors, FONT, spring, clamp } from './utils';

export const CtaPill: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const intensity = (params.intensity as number) ?? 0.95;
  const { primary, accent, text } = colors(params);
  const content = clip.subtitle_text || 'Get Started';

  const { enter, opacity } = computePhase(frame, durationFrames, intensity, clip.video_style?.opacity ?? 1, 0.12, 0.1);
  const box = boxPosition(clip, opacity);

  // Spring scale entrance
  const scaleEnter = spring(clamp(enter / 1, 0, 1), 0.6);
  const scale = 0.5 + 0.5 * scaleEnter;

  // Shine sweep: repeats every ~90 frames
  const shineCycle = 90;
  const shineProgress = (frame % shineCycle) / shineCycle;
  const shineX = -20 + shineProgress * 140; // percentage across

  // Idle breathing
  const idleScale = 1 + Math.sin(frame * 0.05) * 0.006;

  return (
    <div style={{
      ...box,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `scale(${scale * idleScale})`,
    }}>
      <div style={{
        padding: '14px 36px',
        borderRadius: 999,
        background: `linear-gradient(135deg, ${primary}, ${accent})`,
        boxShadow: `0 12px 40px ${primary}50, 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)`,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONT.display,
        fontSize: Math.min(24, Math.max(14, 300 / content.length)),
        fontWeight: 850,
        color: text,
        letterSpacing: 1,
        textAlign: 'center',
        textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap',
      }}>
        {/* Shine sweep */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: `${shineX}%`,
          width: '20%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
          transform: 'skewX(-20deg)',
          pointerEvents: 'none',
        }} />
        {content}
      </div>
    </div>
  );
};
