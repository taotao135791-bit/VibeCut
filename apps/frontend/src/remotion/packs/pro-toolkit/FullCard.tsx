/**
 * FullCard — full-screen OPAQUE information card.
 * Completely covers the video (z-index guaranteed on top).
 * Two presets:
 *   "impact" — opening hook: huge headline + accent badge + subtitle
 *   "minimal" — closing card: serif text, pure black, extreme whitespace
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { spring, clamp, colors, FONT } from './utils';

export const FullCard: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const intensity = (params.intensity as number) ?? 1.0;
  const preset = (params.preset_id as string) ?? 'impact';
  const { primary, accent, bg, text } = colors(params);
  const content = clip.subtitle_text || '57% Off';
  const motion = (params.motion_preset as string) ?? 'spring';

  // Fade envelope — very fast enter (3 frames), standard exit
  const enterFrames = Math.max(3, Math.round(durationFrames * 0.04));
  const exitFrames = Math.max(4, Math.round(durationFrames * 0.1));
  const enterProgress = clamp(frame / enterFrames, 0, 1);
  const exitProgress = clamp((durationFrames - frame) / exitFrames, 0, 1);
  const envelope = enterProgress * exitProgress * intensity;

  const lines = content.split('\n').filter(Boolean);
  const headline = lines[0] || '';
  const badge = lines[1] || '';
  const subtitle = lines.slice(2).join(' · ') || '';

  if (preset === 'minimal') {
    return _renderMinimal(headline, lines.slice(1).join('\n'), envelope, frame, durationFrames, text, bg, accent);
  }
  return _renderImpact(headline, badge, subtitle, envelope, frame, durationFrames, motion, primary, accent, bg, text);
};

/** Full-screen div replacing AbsoluteFill for reliable SSR */
const Full: React.FC<{style?: React.CSSProperties; children?: React.ReactNode}> = ({style, children}) => (
  <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', ...style}}>{children}</div>
);

/** Impact preset: bold headline + colored badge + subtitle */
function _renderImpact(
  headline: string, badge: string, subtitle: string,
  envelope: number, frame: number, durationFrames: number, motion: string,
  primary: string, accent: string, bg: string, text: string,
) {
  const scaleEnter = motion === 'spring'
    ? spring(clamp(frame / 12, 0, 1), 0.55)
    : clamp(frame / 8, 0, 1);
  const scale = 0.82 + 0.18 * scaleEnter;

  const headlineSize = Math.min(160, Math.max(60, 1100 / Math.max(headline.length, 1)));
  const badgeSize = Math.min(90, Math.max(36, 600 / Math.max(badge.length, 1)));

  return (
    <Full style={{ backgroundColor: '#000', opacity: envelope, zIndex: 100 }}>
      {/* Solid opaque black background — guaranteed to cover video */}
      <div style={{ position: 'absolute', inset: 0, background: bg || '#000000' }} />
      {/* Subtle accent atmosphere */}
      <div style={{
        position: 'absolute', left: '20%', top: '30%', width: '60%', height: '40%',
        background: `radial-gradient(ellipse, ${primary}08 0%, transparent 70%)`,
        filter: 'blur(80px)',
      }} />
      {/* Content container */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        transform: `scale(${scale})`,
        padding: '60px',
        gap: 0,
      }}>
        {/* Headline */}
        <div style={{
          fontSize: headlineSize,
          fontWeight: 950,
          fontFamily: FONT.display,
          color: text,
          lineHeight: 1.0,
          letterSpacing: -2,
          textAlign: 'center',
          marginBottom: badge ? 28 : 0,
          opacity: clamp(frame / 6, 0, 1),
          transform: `translateY(${(1 - clamp(frame / 8, 0, 1)) * 15}px)`,
        }}>
          {headline}
        </div>
        {/* Badge — accent colored block */}
        {badge && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px 40px',
            borderRadius: 16,
            background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
            boxShadow: `0 20px 60px ${accent}50, 0 0 0 1px rgba(255,255,255,0.2) inset`,
            opacity: clamp((frame - 4) / 6, 0, 1),
            transform: `scale(${0.85 + 0.15 * clamp((frame - 4) / 8, 0, 1)})`,
          }}>
            <span style={{
              fontSize: badgeSize,
              fontWeight: 950,
              fontFamily: FONT.display,
              color: '#000000',
              lineHeight: 1.0,
              letterSpacing: -1,
            }}>
              {badge}
            </span>
          </div>
        )}
        {/* Subtitle */}
        {subtitle && (
          <div style={{
            marginTop: 24,
            fontSize: Math.min(28, Math.max(16, 400 / Math.max(subtitle.length, 1))),
            fontWeight: 600,
            fontFamily: FONT.body,
            color: `${text}aa`,
            letterSpacing: 1,
            textAlign: 'center',
            opacity: clamp((frame - 8) / 8, 0, 1),
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </Full>
  );
}

/** Minimal preset: serif text, pure black, large whitespace — elegant closing */
function _renderMinimal(
  headline: string, subtext: string,
  envelope: number, frame: number, durationFrames: number,
  text: string, bg: string, accent: string,
) {
  const headlineSize = Math.min(72, Math.max(32, 900 / Math.max(headline.length, 1)));
  const fadeIn = clamp(frame / 15, 0, 1);

  return (
    <Full style={{ backgroundColor: '#000', opacity: envelope, zIndex: 100 }}>
      <div style={{ position: 'absolute', inset: 0, background: bg || '#000000' }} />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px',
        gap: 20,
        opacity: fadeIn,
      }}>
        <div style={{
          fontSize: headlineSize,
          fontWeight: 400,
          fontFamily: "'Georgia', 'Times New Roman', serif",
          color: text,
          lineHeight: 1.3,
          textAlign: 'center',
          letterSpacing: 0.5,
        }}>
          {headline}
        </div>
        {subtext && (
          <div style={{
            marginTop: 16,
            fontSize: 20,
            fontWeight: 600,
            fontFamily: FONT.body,
            color: `${text}88`,
            textAlign: 'center',
            letterSpacing: 1,
          }}>
            {subtext}
          </div>
        )}
        {/* Accent line */}
        <div style={{
          marginTop: 20,
          width: 60,
          height: 2,
          background: `${accent}80`,
          opacity: clamp((frame - 10) / 10, 0, 1),
        }} />
      </div>
    </Full>
  );
}
