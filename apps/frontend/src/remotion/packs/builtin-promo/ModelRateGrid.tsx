/**
 * Model rate grid — displays AI model pricing in a glass card.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { clipComponentBoxStyle, computePhase, computeMotionTransform, glassSurface } from './utils';

export const ModelRateGrid: React.FC<PackComponentProps> = ({ clip, progress }) => {
  const params = clip.effect_params ?? {};
  const intensity = params.intensity ?? 0.8;
  const accent = params.accent_color ?? '#8B5CF6';
  const motion = params.motion_preset ?? 'pop';
  const darkPreset = params.preset_id !== 'clean_price_card';
  const text = clip.subtitle_text || 'Seedance 2.0 from $0.018/sec\nNano Banana 2 from $0.018/img\nGPT Image 2 from $0.003/img';
  const shellText = darkPreset ? '#f8fafc' : '#0f172a';

  const { enter, baseOpacity } = computePhase(progress, intensity, clip.video_style?.opacity ?? 1);
  const motionTransform = computeMotionTransform(motion, enter, progress, intensity);
  const boxStyle = clipComponentBoxStyle(clip, baseOpacity);

  const rows = text.split('\n').filter(Boolean);

  return (
    <div
      style={{
        ...boxStyle,
        ...glassSurface(accent, darkPreset),
        padding: '18px 20px',
        borderRadius: 22,
        color: shellText,
        transform: motionTransform,
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 10, color: accent }}>
        Top AI model rates
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((row, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              padding: '8px 10px',
              borderRadius: 12,
              background: params.preset_id === 'clean_price_card' ? '#f5f2ff' : 'rgba(255,255,255,0.10)',
              fontSize: 16,
              fontWeight: 800,
              lineHeight: 1.15,
            }}
          >
            <span>{row.split(' from ')[0]}</span>
            <span style={{ color: accent }}>{row.includes(' from ') ? `from ${row.split(' from ')[1]}` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
