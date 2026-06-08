/**
 * CTA badge — call-to-action button-style pill.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { clipComponentBoxStyle, computePhase, computeMotionTransform, glassSurface, promoTextSize } from './utils';

export const CtaBadge: React.FC<PackComponentProps> = ({ clip, progress }) => {
  const params = clip.effect_params ?? {};
  const intensity = params.intensity ?? 0.8;
  const accent = params.accent_color ?? '#8B5CF6';
  const motion = params.motion_preset ?? 'pop';
  const text = clip.subtitle_text || 'Pay less. Create more with Lovart.';

  const { enter, baseOpacity } = computePhase(progress, intensity, clip.video_style?.opacity ?? 1);
  const motionTransform = computeMotionTransform(motion, enter, progress, intensity);
  const boxStyle = clipComponentBoxStyle(clip, baseOpacity);

  return (
    <div
      style={{
        ...boxStyle,
        ...glassSurface(accent, true),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 28px',
        borderRadius: 999,
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: promoTextSize(text, 26, 16),
        fontWeight: 900,
        transform: motionTransform,
        whiteSpace: 'pre-wrap',
        textAlign: 'center',
        textShadow: '0 4px 18px rgba(0,0,0,0.42)',
      }}
    >
      {text}
    </div>
  );
};
