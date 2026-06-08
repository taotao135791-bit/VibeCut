/**
 * Price badge / Reaction sticker component.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { clipComponentBoxStyle, computePhase, computeMotionTransform, glassSurface, promoTextSize } from './utils';

export const PriceBadge: React.FC<PackComponentProps> = ({ clip, progress }) => {
  const params = clip.effect_params ?? {};
  const intensity = params.intensity ?? 0.8;
  const accent = params.accent_color ?? '#8B5CF6';
  const motion = params.motion_preset ?? 'pop';
  const darkPreset = params.preset_id !== 'clean_price_card';
  const text = clip.subtitle_text || '57% OFF';
  const isReaction = params.component_type === 'reaction_sticker';

  const { enter, baseOpacity } = computePhase(progress, intensity, clip.video_style?.opacity ?? 1);
  const motionTransform = computeMotionTransform(motion, enter, progress, intensity);
  const boxStyle = clipComponentBoxStyle(clip, baseOpacity);

  const [headline, ...support] = text.split('\n');
  const headlineSize = promoTextSize(headline, isReaction ? 48 : 64, 28);

  return (
    <div
      style={{
        ...boxStyle,
        ...(isReaction ? {} : glassSurface(accent, darkPreset)),
        display: 'grid',
        alignContent: 'center',
        gap: 10,
        padding: isReaction ? '18px 24px' : '20px 26px',
        borderRadius: isReaction ? 24 : 30,
        background: isReaction
          ? `linear-gradient(135deg, #F59E0B, ${accent} 55%, #E11D48)`
          : undefined,
        color: '#fff',
        boxShadow: isReaction
          ? `0 24px 80px rgba(0,0,0,0.42), 0 0 0 2px rgba(255,255,255,0.18) inset, 0 0 36px ${accent}44`
          : undefined,
        transform: motionTransform,
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontSize: headlineSize, lineHeight: 0.92, fontWeight: 950, textAlign: 'center', textShadow: '0 8px 24px rgba(0,0,0,0.34)' }}>
        {headline}
      </div>
      {support.length > 0 && (
        <div style={{ fontSize: promoTextSize(support.join(' '), 22, 14), lineHeight: 1.15, fontWeight: 780, textAlign: 'center', opacity: 0.92 }}>
          {support.join('\n')}
        </div>
      )}
    </div>
  );
};

/** Alias for reaction_sticker — same component, different styling via component_type. */
export const ReactionSticker = PriceBadge;
