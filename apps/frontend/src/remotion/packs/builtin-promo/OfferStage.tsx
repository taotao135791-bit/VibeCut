/**
 * Full-page promotional stage — offer_stage / pricing_stage / proof_stage.
 * Displays headline, discount badge, countdown tiles, pricing tiers, model rates, and CTA.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { PackComponentProps } from '../types';
import { clamp01, glassSurface } from './utils';

export const OfferStage: React.FC<PackComponentProps> = ({ clip, frame, durationFrames, progress }) => {
  const params = clip.effect_params ?? {};
  const intensity = params.intensity ?? 0.8;
  const motion = params.motion_preset ?? 'pop';
  const text = clip.subtitle_text || 'Lowest Price of the Year\n57% Off\nJune 4 00:00 - June 12 00:00 (UTC+0)\nPay less. Create more with Lovart.';
  const accent = params.accent_color ?? '#8B5CF6';

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const headline = lines[0] ?? 'Lowest Price of the Year';
  const offer = lines[1] ?? '57% Off';
  const windowLine = lines.find((l) => l.includes('June')) ?? 'June 4 00:00 - June 12 00:00 (UTC+0)';
  const ctaLine = lines.find((l) => l.toLowerCase().includes('lovart')) ?? 'Pay less. Create more with Lovart.';
  const modelLines = lines.filter((l) => l.includes('from $'));
  const [mainHeadline, supportHeadline] = headline.split('·').map((l) => l.trim());
  const tierLines = modelLines.filter((l) => l.includes('/mo'));
  const rateLines = modelLines.filter((l) => !l.includes('/mo'));
  const countdownTiles = ['05D', '12H', '00M'];

  const isPricing = params.component_type === 'pricing_stage';
  const isProof = params.component_type === 'proof_stage';

  const stageFadeFrames = Math.min(16, Math.max(6, Math.round(durationFrames * 0.08)));
  const stageEnter = clamp01(frame / stageFadeFrames);
  const stageExit = clamp01((durationFrames - frame) / stageFadeFrames);
  const stageOpacity = stageEnter * stageExit * intensity * (clip.video_style?.opacity ?? 1);
  const stageTransform =
    motion === 'slide'
      ? `translateY(${(1 - stageEnter) * -18}px)`
      : motion === 'pulse'
        ? `scale(${1 + Math.sin(progress * Math.PI * 2) * 0.025 * intensity})`
        : motion === 'none'
          ? undefined
          : `scale(${0.94 + 0.06 * stageEnter})`;

  return (
    <AbsoluteFill
      style={{
        opacity: stageOpacity,
        pointerEvents: 'none',
        color: '#F8FAFC',
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'linear-gradient(132deg, rgba(0,0,0,0.96) 0%, rgba(15,15,35,0.94) 48%, rgba(30,27,75,0.98) 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Grid background */}
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 92px), repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 72px)', opacity: 0.36 }} />
      {/* Watermark */}
      <div style={{ position: 'absolute', right: -42, top: 58, transform: 'rotate(-8deg)', fontSize: 158, lineHeight: 0.82, fontWeight: 950, color: 'rgba(255,255,255,0.055)' }}>
        2026<br />LOWEST
      </div>
      {/* Frame border */}
      <div style={{ position: 'absolute', inset: 44, borderRadius: 30, border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 0 0 1px rgba(139,92,246,0.32) inset, 0 34px 110px rgba(0,0,0,0.52)' }} />
      {/* Header */}
      <div style={{ position: 'absolute', left: 78, top: 66, right: 78, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 19, fontWeight: 950, color: '#F59E0B' }}>LOVART 2026 CONFIRMED LOWEST PRICE WINDOW</div>
        <div style={{ padding: '10px 16px', borderRadius: 999, background: 'rgba(225,29,72,0.18)', border: '1px solid rgba(225,29,72,0.52)', fontSize: 16, fontWeight: 900, color: '#F8FAFC' }}>LIMITED TIME</div>
      </div>
      {/* Left content */}
      <div style={{ position: 'absolute', left: 78, top: isPricing ? 126 : 136, width: isPricing ? '48%' : '54%', transform: stageTransform }}>
        <div style={{ fontSize: isPricing ? 60 : 78, lineHeight: 0.91, fontWeight: 950 }}>{mainHeadline}</div>
        {supportHeadline && <div style={{ marginTop: 10, fontSize: 30, fontWeight: 900, color: '#F59E0B' }}>{supportHeadline}</div>}
        <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'baseline', padding: '22px 34px', borderRadius: 22, background: 'linear-gradient(135deg, #F59E0B, #E11D48)', boxShadow: '0 30px 90px rgba(225,29,72,0.42), 0 0 0 1px rgba(255,255,255,0.32) inset' }}>
          <span style={{ fontSize: isPricing ? 92 : 118, lineHeight: 0.82, fontWeight: 950 }}>{offer}</span>
        </div>
        <div style={{ marginTop: 22, fontSize: 27, lineHeight: 1.12, fontWeight: 820, color: 'rgba(248,250,252,0.88)' }}>{windowLine}</div>
        <div style={{ marginTop: 22, display: 'flex', gap: 12 }}>
          {countdownTiles.map((tile) => (
            <div key={tile} style={{ width: 110, height: 70, borderRadius: 16, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 950, color: '#F8FAFC' }}>{tile}</div>
          ))}
        </div>
      </div>
      {/* Right content */}
      <div style={{ position: 'absolute', right: 78, top: isPricing ? 134 : 148, width: isProof ? '40%' : '35%', display: 'grid', gap: 12, transform: motion === 'slide' ? `translateX(${(1 - stageEnter) * 36}px)` : stageTransform }}>
        {(tierLines.length > 0 ? tierLines : ['Pro from $39/mo', 'Ultimate from $99/mo']).slice(0, 2).map((row, idx) => {
          const [name, rate] = row.split(' from ');
          return (
            <div key={idx} style={{ ...glassSurface(idx === 1 ? '#E11D48' : accent, idx !== 1), borderRadius: 18, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 950, color: idx === 1 ? '#0F0F23' : '#F8FAFC' }}>{name}</span>
              <span style={{ fontSize: 24, fontWeight: 950, color: '#F59E0B' }}>{rate ? `from ${rate}` : ''}</span>
            </div>
          );
        })}
        <div style={{ marginTop: 8, padding: '18px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.075)', border: '1px solid rgba(255,255,255,0.16)', display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 950, color: '#F59E0B' }}>MODEL RATE UNLOCKS</div>
          {(rateLines.length > 0 ? rateLines : ['Seedance 2.0 from $0.018/sec', 'Nano Banana 2 from $0.018/img', 'GPT Image 2 from $0.003/img']).slice(0, 3).map((row, idx) => {
            const [name, rate] = row.split(' from ');
            return (
              <div key={row} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingTop: idx === 0 ? 0 : 10, borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.12)' }}>
                <span style={{ fontSize: 20, fontWeight: 850, color: '#F8FAFC' }}>{name}</span>
                <span style={{ fontSize: 19, fontWeight: 950, color: '#F59E0B' }}>{rate ? `from ${rate}` : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
      {/* CTA bar */}
      <div style={{ position: 'absolute', left: 78, right: 78, bottom: 62, height: 76, borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', boxShadow: '0 24px 80px rgba(0,0,0,0.38)' }}>
        <span style={{ fontSize: 27, fontWeight: 860 }}>{ctaLine}</span>
        <span style={{ fontSize: 20, fontWeight: 950, color: '#F59E0B' }}>SHOP THE WINDOW</span>
      </div>
    </AbsoluteFill>
  );
};
