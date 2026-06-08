/**
 * Watermark — subtle corner brand mark. Non-intrusive, always readable.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, colors, FONT } from './utils';

export const Watermark: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const intensity = (params.intensity as number) ?? 0.5;
  const { text } = colors(params);
  const content = clip.subtitle_text || 'Brand';
  const anchor = (params.layout_anchor as string) ?? 'bottom_right';

  const { opacity } = computePhase(frame, durationFrames, intensity, clip.video_style?.opacity ?? 1, 0.2, 0.2);

  // Position based on anchor
  const posStyle: React.CSSProperties = {};
  if (anchor.includes('top')) posStyle.top = 20;
  else posStyle.bottom = 20;
  if (anchor.includes('left')) posStyle.left = 24;
  else posStyle.right = 24;

  return (
    <div style={{
      position: 'absolute',
      ...posStyle,
      opacity,
      fontFamily: FONT.display,
      fontSize: 14,
      fontWeight: 700,
      color: `${text}88`,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      pointerEvents: 'none',
    }}>
      {content}
    </div>
  );
};
