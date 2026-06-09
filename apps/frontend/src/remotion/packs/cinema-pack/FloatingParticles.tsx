/**
 * FloatingParticles — Premium bokeh / atmospheric particle system.
 * V2: Added bokeh mode (large soft glowing circles), blur-based depth.
 * Based on premium-frontend-ui: "Depth: subtle floating elements for scale"
 *
 * Creates dreamy, out-of-focus light circles that drift through the scene.
 * In bokeh mode, particles are large (20-80px), soft-blurred, and have
 * radial gradient fill instead of solid color — like camera lens bokeh.
 */

import React from 'react';
import type { PackComponentProps } from '../types';
import { computePhase } from '../pro-toolkit/utils';
import { clamp } from './gsap-utils';

interface Particle {
  x: number; y: number; size: number; speed: number; phase: number;
  opacity: number; depth: number; // depth: 0=near(foreground), 1=far(background)
}

function generateParticles(count: number, seed: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const s = seed + i * 137.508; // golden angle
    particles.push({
      x: ((Math.sin(s * 1.1) + 1) / 2),
      y: ((Math.cos(s * 0.7) + 1) / 2),
      size: 3 + (Math.sin(s * 2.3) + 1) * 4,  // base 3-11px
      speed: 0.3 + (Math.cos(s * 3.1) + 1) * 0.5,
      phase: s % (Math.PI * 2),
      opacity: 0.15 + (Math.sin(s * 4.7) + 1) * 0.2,
      depth: (Math.sin(s * 0.9) + 1) / 2, // 0-1
    });
  }
  return particles;
}

export const FloatingParticles: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const params = clip.effect_params ?? {};
  const color = (params.color as string) || '#ffffff';
  const count = (params.particle_count as number) || 30;
  const seed = (params.seed as number) || 42;
  const mode = (params.direction as string) || 'dust'; // dust | bokeh
  const accentColor = (params.accent_color as string) || color;

  const { opacity: envelope } = computePhase(frame, durationFrames, 1.0, 1.0, 0.15, 0.1);

  const baseParticles = React.useMemo(() => generateParticles(count, seed), [count, seed]);

  // In bokeh mode, transform particles: larger, fewer active, more blur
  const particles = mode === 'bokeh'
    ? baseParticles.map((p, i) => ({
        ...p,
        size: 20 + p.depth * 60,              // 20-80px
        opacity: 0.06 + p.depth * 0.12,       // 0.06-0.18 (very subtle)
      }))
    : baseParticles;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: envelope, pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        // Drift motion (deterministic per frame)
        const t = frame * 0.01 * p.speed;
        const dx = Math.sin(t + p.phase) * (mode === 'bokeh' ? 50 : 30);
        const dy = Math.cos(t * 0.7 + p.phase) * (mode === 'bokeh' ? 30 : 20) - frame * 0.1 * p.speed;

        const x = p.x * 1920 + dx;
        const y = (p.y * 1080 + dy) % 1080;

        // Pulse opacity
        const pulseOpacity = p.opacity * (0.7 + 0.3 * Math.sin(frame * 0.04 + p.phase));

        // Alternate colors for bokeh variety
        const pColor = mode === 'bokeh' && i % 3 === 0 ? accentColor : color;

        if (mode === 'bokeh') {
          // Bokeh: large radial gradient circle with blur
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x, top: y < 0 ? y + 1080 : y,
                width: p.size, height: p.size,
                borderRadius: '50%',
                background: `radial-gradient(circle at 40% 40%, ${pColor}50, ${pColor}20 50%, transparent 70%)`,
                opacity: pulseOpacity,
                filter: `blur(${3 + p.depth * 8}px)`,
                transform: `translate(-50%, -50%)`,
              }}
            />
          );
        }

        // Dust mode: small solid dots
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x, top: y < 0 ? y + 1080 : y,
              width: p.size, height: p.size,
              borderRadius: '50%',
              background: pColor,
              opacity: pulseOpacity,
              filter: p.size > 5 ? 'blur(1px)' : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
