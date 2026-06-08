/**
 * FloatingTag — versatile floating label for prices, discounts, status info.
 * Auto-contrast backdrop ensures readability on any video frame.
 * Supports glass and solid modes.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, motionTransform, boxPosition, glass, contrastBackdrop, colors, FONT, adaptiveSize, breathe } from './utils';

export const FloatingTag: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const intensity = (params.intensity as number) ?? 0.95;
  const motion = (params.motion_preset as string) ?? 'spring';
  const mode = (params.preset_id as string) === 'solid' ? 'solid' : 'glass';
  const { primary, accent, text } = colors(params);
  const content = clip.subtitle_text || 'Sale';

  const { enter, opacity, springEnter } = computePhase(frame, durationFrames, intensity, clip.video_style?.opacity ?? 1);
  const transform = motionTransform(motion, enter, springEnter, frame);
  const box = boxPosition(clip, opacity);
  const lines = content.split('\n');
  const headline = lines[0];
  const subline = lines.slice(1).join('\n');

  const headSize = adaptiveSize(headline, 42, 18);
  const scale = breathe(frame);

  const surface: React.CSSProperties = mode === 'solid'
    ? { ...contrastBackdrop('rgba(0,0,0,0.72)', 16), border: `1.5px solid ${primary}50` }
    : glass(primary, 'dark');

  return (
    <div style={{
      ...box,
      ...surface,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      padding: '12px 20px',
      transform: [transform, `scale(${scale})`].filter(Boolean).join(' '),
      fontFamily: FONT.display,
      overflow: 'hidden',
    }}>
      {/* Accent indicator dot */}
      <div style={{
        position: 'absolute',
        top: 8,
        left: 12,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: accent,
        boxShadow: `0 0 8px ${accent}`,
      }} />
      {/* Headline */}
      <div style={{
        fontSize: headSize,
        fontWeight: 850,
        color: text,
        lineHeight: 1.05,
        textAlign: 'center',
        textShadow: `0 2px 12px rgba(0,0,0,0.3)`,
      }}>
        {headline}
      </div>
      {/* Subline */}
      {subline && (
        <div style={{
          fontSize: Math.max(12, headSize * 0.5),
          fontWeight: 600,
          color: `${text}bb`,
          lineHeight: 1.2,
          textAlign: 'center',
        }}>
          {subline}
        </div>
      )}
    </div>
  );
};
