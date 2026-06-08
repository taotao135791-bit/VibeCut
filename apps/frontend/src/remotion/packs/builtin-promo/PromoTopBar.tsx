/**
 * Promo top bar — glass-morphism pill with "LIVE DEAL" indicator.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { clipComponentBoxStyle, computePhase, computeMotionTransform, glassSurface, promoTextSize } from './utils';

export const PromoTopBar: React.FC<PackComponentProps> = ({ clip, progress }) => {
  const params = clip.effect_params ?? {};
  const intensity = params.intensity ?? 0.8;
  const accent = params.accent_color ?? '#8B5CF6';
  const motion = params.motion_preset ?? 'pop';
  const text = clip.subtitle_text || 'Lowest Price of the Year: 57% Off!';

  const { enter, baseOpacity } = computePhase(progress, intensity, clip.video_style?.opacity ?? 1);
  const motionTransform = computeMotionTransform(motion, enter, progress, intensity);
  const boxStyle = clipComponentBoxStyle(clip, baseOpacity);
  const barText = promoTextSize(text, 31, 19);

  return (
    <div
      style={{
        ...boxStyle,
        ...glassSurface(accent, true),
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 18,
        padding: '12px 22px',
        borderRadius: 999,
        color: '#fff',
        transform: motionTransform,
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ width: 12, height: 12, borderRadius: 999, background: '#F59E0B', boxShadow: '0 0 22px #F59E0B' }} />
      <div style={{ width: '100%', color: '#fff', fontSize: barText, fontWeight: 900, lineHeight: 1.04, textAlign: 'center', whiteSpace: 'pre-wrap', textShadow: '0 3px 16px rgba(0,0,0,0.42)' }}>
        {text}
      </div>
      <div style={{ fontSize: 15, fontWeight: 900, color: '#F59E0B', letterSpacing: 0 }}>LIVE DEAL</div>
    </div>
  );
};
