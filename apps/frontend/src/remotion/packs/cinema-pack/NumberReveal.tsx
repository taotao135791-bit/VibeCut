/**
 * NumberReveal — Premium animated counter with glow + scale drama.
 * V2: Added glow on landing, bigger scale contrast, text-shadow.
 * Based on premium-frontend-ui: "massive contrast in scale"
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { easeOut, clamp, computePhase, FONT } from '../pro-toolkit/utils';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return n.toLocaleString('en-US');
  if (n >= 1_000) return n.toLocaleString('en-US');
  return String(n);
}

function parseTarget(text: string): { prefix: string; number: number; suffix: string } {
  const match = text.match(/^([^0-9]*)([0-9,]+)(.*)$/);
  if (match) {
    const num = parseInt(match[2].replace(/,/g, ''), 10);
    return { prefix: match[1], number: num, suffix: match[3] };
  }
  return { prefix: '', number: 0, suffix: text };
}

export const NumberReveal: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || '1,000,000';
  const color = (params.color as string) || '#ffffff';
  const accentColor = (params.accent_color as string) || '#4ce0d2';
  const fontSize = (params.font_size as number) || 180; // bigger default
  const fontFamily = (params.font_family as string) || FONT.display;
  const showGlow = (params.show_glow as boolean) ?? true;

  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;

  const { opacity: envelopeOpacity } = computePhase(
    frame, durationFrames, 1.0, vs?.opacity ?? 1, 0.15, 0.08
  );

  const { prefix, number: target, suffix } = parseTarget(text);

  // Counter animation: easeOut over first 40% of duration
  const counterDuration = Math.round(durationFrames * 0.4);
  const counterProgress = clamp(frame / counterDuration, 0, 1);
  const easedProgress = easeOut(counterProgress);
  const currentValue = Math.round(target * easedProgress);
  const displayText = `${prefix}${formatNumber(currentValue)}${suffix}`;
  const isLanded = counterProgress >= 1;

  // Scale animation: starts at 0.85, springs to 1.0
  const scaleProgress = clamp(frame / 15, 0, 1);
  const scale = 0.85 + 0.15 * easeOut(scaleProgress);

  // Glow effect when number lands
  const glowIntensity = isLanded ? 1.0 : 0.3;
  const textShadow = showGlow ? [
    `0 0 ${8 * glowIntensity}px rgba(255,255,255,0.5)`,
    `0 0 ${25 * glowIntensity}px ${accentColor}50`,
    `0 0 ${50 * glowIntensity}px ${accentColor}25`,
  ].join(', ') : 'none';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
    <div
      style={{
        position: 'absolute',
        left: `${(posX * 100).toFixed(1)}%`,
        top: `${(posY * 100).toFixed(1)}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity: envelopeOpacity,
        fontSize,
        fontFamily,
        fontWeight: 700,
        color: isLanded ? accentColor : color,
        letterSpacing: -4,
        lineHeight: 1,
        textAlign: 'center',
        textShadow,
        willChange: 'transform',
        maxWidth: '90%',
      }}
    >
      {displayText}
    </div>
    </div>
  );
};
