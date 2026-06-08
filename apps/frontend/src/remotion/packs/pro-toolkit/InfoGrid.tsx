/**
 * InfoGrid — compact multi-row information grid.
 * Perfect for model pricing tables, feature lists, spec comparisons.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, motionTransform, boxPosition, glass, colors, FONT, clamp } from './utils';

export const InfoGrid: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const intensity = (params.intensity as number) ?? 0.9;
  const motion = (params.motion_preset as string) ?? 'slide';
  const { primary, accent, text } = colors(params);
  const content = clip.subtitle_text || 'Model A from $0.01/img\nModel B from $0.02/sec';

  const { enter, opacity, springEnter } = computePhase(frame, durationFrames, intensity, clip.video_style?.opacity ?? 1);
  const transform = motionTransform(motion, enter, springEnter, frame);
  const box = boxPosition(clip, opacity);

  const rows = content.split('\n').filter(Boolean);
  const rowStagger = 3; // frames between rows

  return (
    <div style={{
      ...box,
      ...glass(primary, 'dark'),
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 16px',
      borderRadius: 14,
      gap: 6,
      transform,
      fontFamily: FONT.body,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        fontSize: 11,
        fontWeight: 800,
        color: accent,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 4,
      }}>
        PRICING
      </div>
      {/* Rows */}
      {rows.map((row, i) => {
        const rowProgress = clamp((frame - i * rowStagger - 5) / 8, 0, 1);
        const parts = row.split(/\s+from\s+|\s{2,}|\t/);
        const label = parts[0] || row;
        const value = parts[1] || '';

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '7px 10px',
              borderRadius: 8,
              background: `${primary}10`,
              border: `1px solid ${primary}20`,
              opacity: rowProgress,
              transform: `translateX(${(1 - rowProgress) * 12}px)`,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: text }}>{label}</span>
            {value && (
              <span style={{ fontSize: 13, fontWeight: 800, color: accent, whiteSpace: 'nowrap' }}>
                {value.startsWith('from') ? value : `from ${value}`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
