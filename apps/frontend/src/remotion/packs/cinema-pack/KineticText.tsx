/**
 * KineticText — GSAP-powered per-character animation.
 * V2: Added text-shadow glow, bigger default sizes, letterSpacing for drama.
 * Uses GSAP's elastic/back easing + "from: center" stagger distribution.
 * Based on premium-frontend-ui: "massive contrast in scale, fluid typography scales"
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase, FONT } from '../pro-toolkit/utils';
import {
  ease, staggerDelays, clamp,
  EASE_HEADLINE_ENTER, EASE_SUBTITLE_ENTER, EASE_SCALE_IN,
} from './gsap-utils';

export const KineticText: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const text = clip.subtitle_text || 'Hello World';
  const color = (params.color as string) || '#ffffff';
  const glowColor = (params.accent_color as string) || color;
  const fontSize = (params.font_size as number) || 140; // up from 120
  const fontFamily = (params.font_family as string) || FONT.display;
  const staggerMs = (params.stagger_ms as number) || 50;
  const motionPreset = (params.motion_preset as string) || 'spring';
  const staggerFrom = (params.stagger_from as string) || 'start';
  const showGlow = (params.show_glow as boolean) ?? false; // impeccable dark-glow: OFF by default, only enable deliberately

  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;

  // Envelope (overall fade in/out)
  const { opacity: envelopeOpacity } = computePhase(
    frame, durationFrames, 1.0, vs?.opacity ?? 1, 0.12, 0.06
  );

  // Per-character animation with GSAP easing
  const fps = 30;
  const staggerFrames = Math.max(1, Math.round((staggerMs / 1000) * fps));
  const chars = text.split('');

  // GSAP-style stagger delays (supports from: center/edges/end)
  const delays = staggerDelays({
    count: chars.length,
    each: staggerFrames,
    from: staggerFrom as any,
  });

  // Pick easing based on preset
  const easeName = motionPreset === 'spring'
    ? EASE_HEADLINE_ENTER      // elastic.out(1, 0.4)
    : motionPreset === 'slide-up'
      ? EASE_SUBTITLE_ENTER    // power3.out
      : motionPreset === 'back'
        ? EASE_SCALE_IN        // back.out(1.4)
        : 'power2.out';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
    <div
      style={{
        position: 'absolute',
        left: `${(posX * 100).toFixed(1)}%`,
        top: `${(posY * 100).toFixed(1)}%`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        opacity: envelopeOpacity,
        maxWidth: '88%',
        flexWrap: 'wrap',
      }}
    >
      {chars.map((ch, i) => {
        const charDelay = delays[i] || 0;
        const localFrame = Math.max(0, frame - charDelay);
        const enterDuration = 14;

        const rawProgress = clamp(0, 1, localFrame / enterDuration);
        const easedProgress = ease(rawProgress, easeName);

        // Motion values derived from GSAP easing
        let yOffset: number;
        let scaleVal: number;
        let charOpacity: number;

        if (motionPreset === 'spring') {
          // impeccable: no elastic on POSITION. Use power4.out for Y, elastic only for scale overshoot
          const posEased = ease(rawProgress, 'power4.out');
          yOffset = (1 - posEased) * 40;
          scaleVal = 0.5 + 0.5 * easedProgress; // elastic on scale IS allowed (overshoot)
          charOpacity = clamp(0, 1, rawProgress * 3);
        } else if (motionPreset === 'slide-up') {
          yOffset = (1 - easedProgress) * 24;
          scaleVal = 1;
          charOpacity = ease(clamp(0, 1, rawProgress * 2), 'power2.out');
        } else if (motionPreset === 'back') {
          yOffset = 0;
          scaleVal = ease(rawProgress, EASE_SCALE_IN);
          charOpacity = clamp(0, 1, rawProgress * 2.5);
        } else {
          yOffset = 0;
          scaleVal = 1;
          charOpacity = easedProgress;
        }

        // Per-character glow shadow (only when glow enabled and char visible)
        const charGlowIntensity = charOpacity * 0.6;
        const charShadow = showGlow ? [
          `0 0 ${6 * charGlowIntensity}px rgba(255,255,255,0.4)`,
          `0 0 ${20 * charGlowIntensity}px ${glowColor}30`,
          `0 0 ${40 * charGlowIntensity}px ${glowColor}15`,
        ].join(', ') : 'none';

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontSize,
              fontFamily,
              fontWeight: 700,
              color,
              opacity: charOpacity,
              transform: `translateY(${yOffset}px) scale(${scaleVal})`,
              transformOrigin: 'center bottom',
              whiteSpace: 'pre',
              lineHeight: 1.05,
              letterSpacing: -3,
              textShadow: charShadow,
              willChange: 'transform, opacity',
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
    </div>
  );
};
