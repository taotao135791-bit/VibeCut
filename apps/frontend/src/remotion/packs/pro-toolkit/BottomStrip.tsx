/**
 * BottomStrip — full-width bottom overlay bar.
 * Like a live broadcast lower-third: left main copy + right secondary info.
 * Semi-transparent dark backdrop with blur for readability on any video frame.
 */

import React from 'react';
import { useVideoConfig } from 'remotion';
import type { PackComponentProps } from '../types';
import { computePhase, colors, FONT, clamp } from './utils';

/** Parse countdown text like "05D 12H 00M" into initial seconds */
function parseCountdown(text: string): number | null {
  const match = text.match(/(\d+)\s*[Dd].*?(\d+)\s*[Hh].*?(\d+)\s*[Mm]/);
  if (!match) return null;
  return parseInt(match[1]) * 86400 + parseInt(match[2]) * 3600 + parseInt(match[3]) * 60;
}

export const BottomStrip: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const intensity = (params.intensity as number) ?? 0.92;
  const { primary, accent, text } = colors(params);
  const content = clip.subtitle_text || 'Promo info here';
  const { fps } = useVideoConfig();

  const { enter, opacity } = computePhase(frame, durationFrames, intensity, clip.video_style?.opacity ?? 1, 0.1, 0.08);

  // Parse: first line = main text (left), second line = countdown/secondary (right)
  const lines = content.split('\n').filter(Boolean);
  const mainText = lines[0] || '';
  const secondaryRaw = lines.slice(1).join(' ') || '';

  // Check if secondary contains countdown data
  const initialSec = parseCountdown(secondaryRaw);
  let countdownTiles: string[] | null = null;
  if (initialSec !== null) {
    const elapsed = frame / fps;
    const remaining = Math.max(0, initialSec - elapsed);
    const dd = String(Math.floor(remaining / 86400)).padStart(2, '0');
    const hh = String(Math.floor((remaining % 86400) / 3600)).padStart(2, '0');
    const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
    const ss = String(Math.floor(remaining % 60)).padStart(2, '0');
    countdownTiles = [`${dd}D`, `${hh}H`, `${mm}M`, `${ss}S`];
  }

  // Slide up from bottom
  const slideY = (1 - enter) * 100;
  // Scan line animation
  const scanX = ((frame * 2) % 130) - 15;

  // Position: full width at bottom
  const vs = clip.video_style;
  const bottom = vs?.position_y != null ? `${((1 - vs.position_y) * 100).toFixed(1)}%` : '0%';
  const height = vs?.height != null ? `${(vs.height * 100).toFixed(1)}%` : '9%';

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom,
      height,
      opacity,
      transform: `translateY(${slideY}%)`,
      background: 'rgba(0,0,0,0.82)',
      backdropFilter: 'blur(12px) saturate(1.2)',
      borderTop: `1px solid ${primary}40`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      overflow: 'hidden',
      fontFamily: FONT.display,
    }}>
      {/* Top scan line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 1,
        background: `linear-gradient(90deg, transparent ${scanX - 10}%, ${primary}80 ${scanX}%, transparent ${scanX + 10}%)`,
      }} />
      {/* Left: LED + main text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 1 }}>
        {/* Pulsing indicator */}
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: accent,
          boxShadow: `0 0 10px ${accent}, 0 0 20px ${accent}50`,
          opacity: 0.65 + Math.sin(frame * 0.1) * 0.35,
        }} />
        <span style={{
          fontSize: clamp(mainText.length > 30 ? 16 : 20, 14, 24),
          fontWeight: 800,
          color: text,
          letterSpacing: 0.3,
        }}>
          {mainText}
        </span>
      </div>
      {/* Right: countdown or secondary text */}
      {(countdownTiles || secondaryRaw) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 1,
        }}>
          {countdownTiles ? (
            // Dynamic countdown tiles
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {countdownTiles.map((seg: string, i: number) => (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ color: `${text}60`, fontSize: 14, fontWeight: 700 }}>:</span>}
                  <div style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: `${primary}20`,
                    border: `1px solid ${primary}40`,
                    fontFamily: FONT.mono,
                    fontSize: 14,
                    fontWeight: 900,
                    color: text,
                    letterSpacing: 1,
                  }}>{seg}</div>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: `${text}cc`,
              letterSpacing: 0.5,
            }}>
              {secondaryRaw}
            </span>
          )}
          <div style={{
            padding: '3px 10px',
            borderRadius: 4,
            background: `${accent}25`,
            border: `1px solid ${accent}50`,
            fontSize: 10,
            fontWeight: 800,
            color: accent,
            letterSpacing: 2,
          }}>
            LIVE
          </div>
        </div>
      )}
    </div>
  );
};
