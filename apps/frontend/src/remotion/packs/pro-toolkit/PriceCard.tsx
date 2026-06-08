/**
 * PriceCard — price display with strikethrough original and highlighted current price.
 * Includes discount badge corner flag.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, motionTransform, boxPosition, glass, colors, FONT, breathe } from './utils';

export const PriceCard: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const intensity = (params.intensity as number) ?? 0.92;
  const motion = (params.motion_preset as string) ?? 'spring';
  const { primary, accent, text } = colors(params);
  const content = clip.subtitle_text || '$39/mo\n$90/mo';

  const { enter, opacity, springEnter } = computePhase(frame, durationFrames, intensity, clip.video_style?.opacity ?? 1);
  const transform = motionTransform(motion, enter, springEnter, frame);
  const box = boxPosition(clip, opacity);
  const scale = breathe(frame, 0.005);

  // Parse: first line = current price, second = original (strikethrough)
  const lines = content.split('\n').filter(Boolean);
  const currentPrice = lines[0] || '$39';
  const originalPrice = lines[1] || '';
  const discount = lines[2] || ''; // optional "57% OFF"

  return (
    <div style={{
      ...box,
      ...glass(primary, 'dark'),
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '16px 20px',
      borderRadius: 18,
      transform: [transform, `scale(${scale})`].filter(Boolean).join(' '),
      fontFamily: FONT.display,
      overflow: 'hidden',
      position: 'absolute',
      left: (box as any).left,
      top: (box as any).top,
      width: (box as any).width,
      height: (box as any).height,
      opacity: (box as any).opacity,
    }}>
      {/* Discount badge */}
      {discount && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          padding: '4px 10px',
          borderRadius: '0 16px 0 10px',
          background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
          fontSize: 11,
          fontWeight: 900,
          color: '#000',
          letterSpacing: 0.5,
        }}>
          {discount}
        </div>
      )}
      {/* Original price (strikethrough) */}
      {originalPrice && (
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: `${text}66`,
          textDecoration: 'line-through',
          textDecorationColor: `${accent}88`,
        }}>
          {originalPrice}
        </div>
      )}
      {/* Current price */}
      <div style={{
        fontSize: Math.min(48, Math.max(28, 200 / currentPrice.length)),
        fontWeight: 950,
        color: text,
        lineHeight: 1.0,
        textShadow: `0 2px 16px ${primary}40`,
      }}>
        {currentPrice}
      </div>
    </div>
  );
};
