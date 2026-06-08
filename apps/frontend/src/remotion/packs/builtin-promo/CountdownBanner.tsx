/**
 * Countdown banner — discount badge + countdown text.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { clipComponentBoxStyle, computePhase, computeMotionTransform, glassSurface, promoTextSize } from './utils';

export const CountdownBanner: React.FC<PackComponentProps> = ({ clip, progress }) => {
  const params = clip.effect_params ?? {};
  const intensity = params.intensity ?? 0.8;
  const accent = params.accent_color ?? '#8B5CF6';
  const motion = params.motion_preset ?? 'pop';
  const darkPreset = params.preset_id !== 'clean_price_card';
  const text = clip.subtitle_text || 'June 4 00:00 - June 12 00:00 (UTC+0)\nCountdown: 05D 12H 00M';
  const shellText = darkPreset ? '#f8fafc' : '#0f172a';

  const { enter, baseOpacity } = computePhase(progress, intensity, clip.video_style?.opacity ?? 1);
  const motionTransform = computeMotionTransform(motion, enter, progress, intensity);
  const boxStyle = clipComponentBoxStyle(clip, baseOpacity);

  const [headline, subline] = text.split('\n');

  return (
    <div
      style={{
        ...boxStyle,
        ...glassSurface(accent, darkPreset),
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        alignItems: 'center',
        gap: 18,
        padding: '18px 24px',
        borderRadius: 22,
        color: shellText,
        transform: motionTransform,
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${accent}, #E11D48)`,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          fontWeight: 900,
        }}
      >
        57
      </div>
      <div>
        <div style={{ fontSize: promoTextSize(headline, 22, 15), fontWeight: 900, lineHeight: 1.05 }}>{headline}</div>
        {subline && <div style={{ marginTop: 5, fontSize: promoTextSize(subline, 18, 13), fontWeight: 750, opacity: 0.86 }}>{subline}</div>}
      </div>
    </div>
  );
};
