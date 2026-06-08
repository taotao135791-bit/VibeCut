/**
 * CountdownBlock — countdown timer with flip-card or pulse mode.
 * Shows urgency with animated time segments.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, motionTransform, boxPosition, glass, colors, FONT, clamp } from './utils';

export const CountdownBlock: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const intensity = (params.intensity as number) ?? 0.9;
  const motion = (params.motion_preset as string) ?? 'slide';
  const { primary, accent, text } = colors(params);
  const content = clip.subtitle_text || '05D | 12H | 00M';

  const { enter, opacity, springEnter } = computePhase(frame, durationFrames, intensity, clip.video_style?.opacity ?? 1);
  const transform = motionTransform(motion, enter, springEnter, frame);
  const box = boxPosition(clip, opacity);

  // Parse tiles from text (supports "05D | 12H | 00M" or "05D 12H 00M" or "05D:12H:00M")
  const tiles = content.split(/\s*[|:·]\s*|\s{2,}/).filter(Boolean);

  // Per-tile stagger
  const tileStagger = 3; // frames

  return (
    <div style={{
      ...box,
      ...glass(primary, 'dark'),
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: '14px 18px',
      borderRadius: 14,
      transform,
      fontFamily: FONT.mono,
      overflow: 'hidden',
    }}>
      {/* Label */}
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: accent,
        letterSpacing: 3,
        textTransform: 'uppercase',
        opacity: 0.6 + Math.sin(frame * 0.08) * 0.4,
      }}>
        ENDS IN
      </div>
      {/* Tiles */}
      <div style={{ display: 'flex', gap: 6 }}>
        {tiles.map((tile, i) => {
          const tileProgress = clamp((frame - i * tileStagger) / 10, 0, 1);
          const tileScale = 0.8 + 0.2 * tileProgress;
          return (
            <div
              key={i}
              style={{
                minWidth: 52,
                height: 44,
                borderRadius: 8,
                background: `${primary}18`,
                border: `1px solid ${primary}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 900,
                color: text,
                textShadow: `0 0 6px ${primary}40`,
                transform: `scale(${tileScale})`,
                opacity: tileProgress,
                padding: '0 8px',
              }}
            >
              {tile}
            </div>
          );
        })}
      </div>
    </div>
  );
};
