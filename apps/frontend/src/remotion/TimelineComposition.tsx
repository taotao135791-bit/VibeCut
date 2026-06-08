import { AbsoluteFill, Sequence, Video, OffthreadVideo, Audio, Img, useVideoConfig, useCurrentFrame } from 'remotion';
import type { TimelineProject, Clip as ClipType, VideoStyle, SubtitleStyle } from '@mrdv2/shared';
import { resolveSubtitleStyle, DEFAULT_SUBTITLE_STYLE, resolveCssFontFamily } from '@mrdv2/shared';
import { resolveMediaUrl, getMediaType } from '../lib/timelineAdapter';
import { parseSrt, type SrtEntry } from '../lib/srtParser';
import { useEffect, useState, useMemo } from 'react';
import { EditableText } from './EditableText';
import { useAppStore } from '../stores/appStore';
import { parseAssOverrides } from '../lib/assOverrides';
import { packRegistry } from './packs/registry';

/** Build CSS properties from a fully resolved SubtitleStyle. */
function subtitleStyleToCss(s: Required<SubtitleStyle>): React.CSSProperties {
  const bg = s.background;
  const hasBg = bg && bg !== 'transparent';
  return {
    position: 'absolute',
    left: `${(s.position_x * 100).toFixed(1)}%`,
    top: `${(s.position_y * 100).toFixed(1)}%`,
    transform: 'translate(-50%, -50%)',
    width: 'max-content',
    maxWidth: '90%',
    fontFamily: resolveCssFontFamily(s.font_family),
    fontSize: s.font_size,
    color: s.color,
    backgroundColor: bg,
    textAlign: s.text_align as React.CSSProperties['textAlign'],
    fontWeight: s.bold ? 'bold' : 'normal',
    fontStyle: s.italic ? 'italic' : 'normal',
    padding: hasBg ? s.padding : undefined,
    borderRadius: hasBg ? s.border_radius : undefined,
    whiteSpace: 'pre-wrap',
    opacity: s.opacity,
    letterSpacing: s.letter_spacing !== 0 ? s.letter_spacing : undefined,
    WebkitTextStroke: s.outline_width > 0 ? `${s.outline_width}px ${s.outline_color}` : undefined,
    textShadow: s.shadow !== 'none' ? s.shadow : undefined,
  };
}

/** Resolve a clip's subtitle style using presets from the store. */
function useResolvedStyle(clip: ClipType): Required<SubtitleStyle> {
  const presets = useAppStore((s) => s.subtitlePresets);
  const presetName = clip.subtitle_style_ref ?? 'default';
  const preset = presets[presetName] ?? DEFAULT_SUBTITLE_STYLE;
  return resolveSubtitleStyle(preset, clip.subtitle_style);
}

/** Renders a single SRT-backed subtitle clip, fetching & parsing the .srt file.
 *  In SSR mode, clip._srt_content is pre-populated by the backend so no fetch is needed. */
const SrtSubtitleClip: React.FC<{
  clip: ClipType;
  timeline: TimelineProject;
  fps: number;
}> = ({ clip, timeline, fps }) => {
  const frame = useCurrentFrame();
  const resolved = useResolvedStyle(clip);
  const [entries, setEntries] = useState<SrtEntry[]>([]);

  const inlineSrt = (clip as any)._srt_content as string | undefined;
  const mediaUrl = clip.media_id ? resolveMediaUrl(clip.media_id, timeline) : '';

  useEffect(() => {
    if (inlineSrt) {
      setEntries(parseSrt(inlineSrt));
      return;
    }
    if (!mediaUrl) return;
    fetch(mediaUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch SRT: ${r.status}`);
        return r.text();
      })
      .then((text) => setEntries(parseSrt(text)))
      .catch((err) => console.warn('SRT fetch error:', err));
  }, [mediaUrl, inlineSrt]);

  const sourceTime = (clip.source_in_sec ?? 0) + (frame / fps) * (clip.speed ?? 1);
  const active = entries.find((e) => sourceTime >= e.startSec && sourceTime < e.endSec);
  const renderedText = useMemo(() => active ? parseAssOverrides(active.text) : null, [active?.text]);
  if (!active) return null;

  return (
    <AbsoluteFill>
      <div style={subtitleStyleToCss(resolved)}>
        {renderedText}
      </div>
    </AbsoluteFill>
  );
};

/** Renders a single inline subtitle clip with resolved preset + override style. */
const InlineSubtitleClip: React.FC<{
  clip: ClipType;
  isSSR: boolean;
}> = ({ clip, isSSR }) => {
  const resolved = useResolvedStyle(clip);
  const textCss = subtitleStyleToCss(resolved);
  const renderedText = useMemo(() => parseAssOverrides(clip.subtitle_text!), [clip.subtitle_text]);

  return (
    <AbsoluteFill>
      {isSSR ? (
        <div style={textCss}>{renderedText}</div>
      ) : (
        <EditableText
          clipId={clip.id}
          field="subtitle_text"
          text={clip.subtitle_text!}
          style={textCss}
        />
      )}
    </AbsoluteFill>
  );
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function promoTextSize(text: string, base: number, min: number): number {
  const longest = text.split(/\s|\n/).reduce((max, part) => Math.max(max, part.length), 0);
  const lines = text.split('\n').length;
  const penalty = Math.max(0, longest - 12) * 1.8 + Math.max(0, lines - 1) * 4;
  return Math.max(min, base - penalty);
}

function glassSurface(accent: string, dark = true): React.CSSProperties {
  return {
    background: dark
      ? `linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04)), linear-gradient(135deg, rgba(15,15,35,0.9), rgba(30,27,75,0.76))`
      : `linear-gradient(135deg, rgba(255,255,255,0.98), rgba(245,242,255,0.9))`,
    border: `1.5px solid rgba(255,255,255,0.24)`,
    boxShadow: `0 28px 90px rgba(0,0,0,0.44), 0 0 0 1px ${accent}55 inset, 0 0 42px ${accent}24`,
    backdropFilter: 'blur(18px) saturate(1.24)',
  };
}

function clipComponentBoxStyle(clip: ClipType, opacity: number): React.CSSProperties {
  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;
  const width = vs?.width ?? 0.32;
  const height = vs?.height ?? 0.16;

  return {
    position: 'absolute',
    left: `${((posX - width / 2) * 100).toFixed(2)}%`,
    top: `${((posY - height / 2) * 100).toFixed(2)}%`,
    width: `${(width * 100).toFixed(2)}%`,
    height: `${(height * 100).toFixed(2)}%`,
    opacity,
  };
}

const EffectClipRenderer: React.FC<{
  clip: ClipType;
  durationFrames: number;
  isSSR: boolean;
}> = ({ clip, durationFrames, isSSR }) => {
  const frame = useCurrentFrame();
  const progress = durationFrames <= 1 ? 1 : clamp01(frame / (durationFrames - 1));
  const params = clip.effect_params ?? {};
  const intensity = params.intensity ?? 0.8;
  const color = params.color ?? '#0f172a';
  const accent = params.accent_color ?? '#38bdf8';
  const enter = clamp01(progress / 0.18);
  const exit = clamp01((1 - progress) / 0.18);
  const phase = enter * exit;
  const baseOpacity = phase * intensity * (clip.video_style?.opacity ?? 1);
  const kind = clip.effect_kind ?? 'callout';

  if (kind === 'flash') {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: color,
          opacity: Math.pow(1 - progress, 2) * intensity,
          pointerEvents: 'none',
        }}
      />
    );
  }

  if (kind === 'cinematic_bars') {
    const barHeight = 86;
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: barHeight,
            backgroundColor: '#020617',
            transform: `translateY(${(-1 + phase) * barHeight}px)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: barHeight,
            backgroundColor: '#020617',
            transform: `translateY(${(1 - phase) * barHeight}px)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (kind === 'speed_lines') {
    const direction = params.direction ?? 'right';
    const signed = direction === 'left' || direction === 'up' ? -1 : 1;
    return (
      <AbsoluteFill
        style={{
          opacity: baseOpacity,
          pointerEvents: 'none',
          background: `repeating-linear-gradient(112deg, transparent 0 22px, ${accent} 23px 26px, transparent 27px 52px)`,
          mixBlendMode: 'screen',
          transform: `translateX(${signed * (progress * 90 - 45)}px)`,
          filter: 'blur(0.5px)',
        }}
      />
    );
  }

  if (kind === 'spotlight') {
    const vs = clip.video_style;
    const x = ((vs?.position_x ?? 0.5) * 100).toFixed(1);
    const y = ((vs?.position_y ?? 0.5) * 100).toFixed(1);
    return (
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity: baseOpacity,
          background: `radial-gradient(circle at ${x}% ${y}%, transparent 0 16%, rgba(255,255,255,0.2) 17%, rgba(0,0,0,0.72) 42%)`,
        }}
      />
    );
  }

  const text = clip.subtitle_text || params.label || (kind === 'sticker_text' ? '高能片段' : '重点来了');
  const boxStyle = clipComponentBoxStyle(clip, baseOpacity);
  const componentType = params.component_type;
  const motion = params.motion_preset ?? 'pop';
  const motionTransform =
    motion === 'slide'
      ? `translateY(${(1 - enter) * -18}px)`
      : motion === 'pulse'
        ? `scale(${1 + Math.sin(progress * Math.PI * 2) * 0.025 * intensity})`
        : motion === 'none'
          ? undefined
          : `scale(${0.94 + 0.06 * enter})`;

  // ── Pack Registry Lookup ─────────────────────────────────────
  // INLINE FullCard for reliability (bypasses pack registry for fullscreen cards)
  if (componentType === 'FullCard' || componentType === 'SplashReveal') {
    const preset = (params.preset_id as string) ?? 'impact';
    const { primary: fc_primary, accent: fc_accent, bg: fc_bg, text: fc_text } = {
      primary: color, accent, bg: color, text: '#ffffff'
    };
    const fc_bg_color = (params.bg_color as string) || fc_bg || '#000';
    const fc_lines = (clip.subtitle_text || 'Info').split('\n').filter(Boolean);
    const fc_headline = fc_lines[0] || '';
    const fc_badge = fc_lines[1] || '';
    const fc_subtitle = fc_lines.slice(2).join(' \u00b7 ');
    const enterF = Math.min(3, Math.max(1, Math.round(durationFrames * 0.04)));
    const exitF = Math.max(4, Math.round(durationFrames * 0.1));
    const fc_enter = clamp01(frame / enterF);
    const fc_exit = clamp01((durationFrames - frame) / exitF);
    const fc_envelope = fc_enter * fc_exit * intensity;

    if (preset === 'minimal') {
      const headSz = Math.min(72, Math.max(32, 900 / Math.max(fc_headline.length, 1)));
      return (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000', opacity: fc_envelope, zIndex: 100 }}>
          <div style={{ position: 'absolute', inset: 0, background: fc_bg_color }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 20, opacity: clamp01(frame / 15) }}>
            <div style={{ fontSize: headSz, fontWeight: 400, fontFamily: "'Georgia', serif", color: '#fff', lineHeight: 1.3, textAlign: 'center' }}>{fc_headline}</div>
            {fc_badge && <div style={{ fontSize: 20, fontWeight: 600, color: '#ffffff88', textAlign: 'center' }}>{fc_badge}</div>}
            {fc_subtitle && <div style={{ fontSize: 18, fontWeight: 600, color: '#ffffff66', textAlign: 'center' }}>{fc_subtitle}</div>}
          </div>
        </div>
      );
    }
    // Impact preset
    const headSz = Math.min(160, Math.max(60, 1100 / Math.max(fc_headline.length, 1)));
    const badgeSz = Math.min(90, Math.max(36, 600 / Math.max(fc_badge.length || 1, 1)));
    const scaleE = 0.82 + 0.18 * clamp01(frame / 12);
    return (
      <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000', opacity: fc_envelope, zIndex: 100 }}>
        <div style={{ position: 'absolute', inset: 0, background: fc_bg_color }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${scaleE})`, padding: 60, gap: 0 }}>
          <div style={{ fontSize: headSz, fontWeight: 950, fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', lineHeight: 1.0, letterSpacing: -2, textAlign: 'center', marginBottom: fc_badge ? 28 : 0, opacity: clamp01(frame / 6), transform: `translateY(${(1 - clamp01(frame / 8)) * 15}px)` }}>{fc_headline}</div>
          {fc_badge && (
            <div style={{ display: 'inline-flex', padding: '16px 40px', borderRadius: 16, background: `linear-gradient(135deg, ${accent}, ${accent}dd)`, boxShadow: `0 20px 60px ${accent}50`, opacity: clamp01((frame - 4) / 6), transform: `scale(${0.85 + 0.15 * clamp01((frame - 4) / 8)})` }}>
              <span style={{ fontSize: badgeSz, fontWeight: 950, color: '#000', lineHeight: 1.0 }}>{fc_badge}</span>
            </div>
          )}
          {fc_subtitle && <div style={{ marginTop: 24, fontSize: 24, fontWeight: 600, color: '#ffffffaa', textAlign: 'center', opacity: clamp01((frame - 8) / 8) }}>{fc_subtitle}</div>}
        </div>
      </div>
    );
  }

  // Try to resolve component from creative packs
  const packKey = params.pack && componentType
    ? `${String(params.pack)}/${componentType}`
    : componentType;
  const PackComponent = packRegistry.get(packKey ?? undefined) || packRegistry.get(componentType ?? undefined);
  if (PackComponent) {
    return <PackComponent clip={clip} frame={frame} durationFrames={durationFrames} progress={progress} isSSR={isSSR} />;
  }

  // ── Fallback: sticker_text ────────────────────────────────────
  if (kind === 'sticker_text') {
    const textStyle: React.CSSProperties = {
      ...boxStyle,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: accent,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 48,
      fontWeight: 900,
      textAlign: 'center',
      lineHeight: 1.05,
      textShadow: `0 3px 0 ${color}, 0 12px 28px rgba(0,0,0,0.45)`,
      transform: `rotate(-4deg) scale(${0.92 + 0.08 * enter})`,
      transformOrigin: 'center',
      WebkitTextStroke: `3px ${color}`,
      whiteSpace: 'pre-wrap',
    };
    return isSSR ? (
      <div style={textStyle}>{text}</div>
    ) : (
      <EditableText clipId={clip.id} field="subtitle_text" text={text} style={textStyle} />
    );
  }

  // ── Default callout (unknown component_type with no pack match) ──
  return (
    <div style={{ ...boxStyle, pointerEvents: 'auto' }}>
      <div
        style={{
          position: 'absolute',
          left: '-24%',
          top: '78%',
          width: '32%',
          height: 3,
          background: accent,
          transform: 'rotate(-22deg)',
          transformOrigin: 'right center',
          boxShadow: `0 0 18px ${accent}`,
        }}
      />
      {isSSR ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 12,
            border: `2px solid ${accent}`,
            background: color,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 28,
            fontWeight: 800,
            textAlign: 'center',
            lineHeight: 1.18,
            boxShadow: '0 18px 42px rgba(0,0,0,0.38)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {text}
        </div>
      ) : (
        <EditableText
          clipId={clip.id}
          field="subtitle_text"
          text={text}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 12,
            border: `2px solid ${accent}`,
            background: color,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 28,
            fontWeight: 800,
            textAlign: 'center',
            lineHeight: 1.18,
            boxShadow: '0 18px 42px rgba(0,0,0,0.38)',
            whiteSpace: 'pre-wrap',
          }}
        />
      )}
    </div>
  );
};

/** Renders a single video/image clip with spatial positioning, crop, and opacity. */
const VideoClipRenderer: React.FC<{
  clip: ClipType;
  mediaUrl: string;
  fps: number;
  isSSR?: boolean;
  isImage?: boolean;
}> = ({ clip, mediaUrl, fps, isSSR, isImage }) => {
  const vs = clip.video_style;
  const posX = vs?.position_x ?? 0.5;
  const posY = vs?.position_y ?? 0.5;
  const sizeW = vs?.width ?? 1.0;
  const sizeH = vs?.height ?? 1.0;
  const opacity = vs?.opacity ?? 1.0;
  const fit = vs?.fit ?? 'contain';
  const cropL = vs?.crop_left ?? 0;
  const cropT = vs?.crop_top ?? 0;
  const cropR = vs?.crop_right ?? 0;
  const cropB = vs?.crop_bottom ?? 0;
  const borderRadius = vs?.border_radius ?? 0;

  const hasCrop = cropL > 0 || cropT > 0 || cropR > 0 || cropB > 0;
  const isDefault =
    !vs ||
    (posX === 0.5 &&
      posY === 0.5 &&
      sizeW === 1.0 &&
      sizeH === 1.0 &&
      opacity === 1.0 &&
      !hasCrop &&
      borderRadius === 0);

  // Visible fraction of source after crop
  const visibleW = Math.max(1 - cropL - cropR, 0.1);
  const visibleH = Math.max(1 - cropT - cropB, 0.1);

  const containerStyle: React.CSSProperties = isDefault
    ? { width: '100%', height: '100%' }
    : {
        position: 'absolute',
        left: `${((posX - sizeW / 2) * 100).toFixed(2)}%`,
        top: `${((posY - sizeH / 2) * 100).toFixed(2)}%`,
        width: `${(sizeW * 100).toFixed(2)}%`,
        height: `${(sizeH * 100).toFixed(2)}%`,
        opacity,
        overflow: 'hidden',
        borderRadius: borderRadius > 0 ? borderRadius : undefined,
      };

  const videoStyle: React.CSSProperties = hasCrop
    ? {
        width: `${(100 / visibleW).toFixed(2)}%`,
        height: `${(100 / visibleH).toFixed(2)}%`,
        marginLeft: `${((-cropL / visibleW) * 100).toFixed(2)}%`,
        marginTop: `${((-cropT / visibleH) * 100).toFixed(2)}%`,
        objectFit: fit as React.CSSProperties['objectFit'],
      }
    : {
        width: '100%',
        height: '100%',
        objectFit: fit as React.CSSProperties['objectFit'],
      };

  if (isImage) {
    return (
      <div style={containerStyle}>
        <Img src={mediaUrl} style={videoStyle} />
      </div>
    );
  }

  const VideoComponent = isSSR ? OffthreadVideo : Video;

  return (
    <div style={containerStyle}>
      <VideoComponent
        src={mediaUrl}
        startFrom={Math.round((clip.source_in_sec ?? 0) * fps)}
        playbackRate={clip.speed ?? 1}
        style={videoStyle}
        volume={clip.volume ?? 1}
      />
    </div>
  );
};

interface TimelineCompositionProps {
  timeline: TimelineProject;
}

export const TimelineComposition: React.FC<TimelineCompositionProps> = ({ timeline }) => {
  const { fps } = useVideoConfig();
  const isSSR = !!(timeline as any)._ssr;

  const videoTracks = useMemo(() => timeline.tracks.filter((t) => t.type === 'video'), [timeline.tracks]);
  const audioTracks = useMemo(() => timeline.tracks.filter((t) => t.type === 'audio'), [timeline.tracks]);
  const subtitleTracks = useMemo(() => timeline.tracks.filter((t) => t.type === 'subtitle'), [timeline.tracks]);
  const effectTracks = useMemo(() => timeline.tracks.filter((t) => t.type === 'effect'), [timeline.tracks]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Video tracks (bottom-up stacking: later tracks render on top) */}
      {videoTracks.map((track) =>
        track.muted
          ? null
          : track.clips.map((clip) => {
              const startFrame = Math.round(clip.timeline_start_sec * fps);
              const endFrame = Math.round(clip.timeline_end_sec * fps);
              const durationFrames = endFrame - startFrame;
              const mediaUrl = clip.media_id
                ? resolveMediaUrl(clip.media_id, timeline)
                : '';
              const mediaType = clip.media_id
                ? getMediaType(clip.media_id, timeline)
                : undefined;

              if (!mediaUrl || durationFrames < 1) return null;

              return (
                <Sequence
                  key={clip.id}
                  from={startFrame}
                  durationInFrames={durationFrames}
                >
                  <AbsoluteFill>
                    <VideoClipRenderer clip={clip} mediaUrl={mediaUrl} fps={fps} isSSR={isSSR} isImage={mediaType === 'image'} />
                  </AbsoluteFill>
                </Sequence>
              );
            }),
      )}

      {/* Effect tracks */}
      {effectTracks.map((track) =>
        track.muted
          ? null
          : track.clips.map((clip) => {
              const startFrame = Math.round(clip.timeline_start_sec * fps);
              const endFrame = Math.round(clip.timeline_end_sec * fps);
              const durationFrames = endFrame - startFrame;

              if (durationFrames < 1) return null;

              return (
                <Sequence
                  key={clip.id}
                  from={startFrame}
                  durationInFrames={durationFrames}
                >
                  <EffectClipRenderer clip={clip} durationFrames={durationFrames} isSSR={isSSR} />
                </Sequence>
              );
            }),
      )}

      {/* Audio tracks */}
      {audioTracks.map((track) =>
        track.muted
          ? null
          : track.clips.map((clip) => {
              const startFrame = Math.round(clip.timeline_start_sec * fps);
              const endFrame = Math.round(clip.timeline_end_sec * fps);
              const durationFrames = endFrame - startFrame;
              const mediaUrl = clip.media_id
                ? resolveMediaUrl(clip.media_id, timeline)
                : '';

              if (!mediaUrl || durationFrames < 1) return null;

              const base = clip.volume ?? 1;
              const fadeInFrames = Math.round((clip.fade_in_sec ?? 0) * fps);
              const fadeOutFrames = Math.round((clip.fade_out_sec ?? 0) * fps);
              const volumeProp =
                fadeInFrames === 0 && fadeOutFrames === 0
                  ? base
                  : (frame: number) => {
                      let vol = base;
                      if (fadeInFrames > 0 && frame < fadeInFrames)
                        vol *= frame / fadeInFrames;
                      if (fadeOutFrames > 0 && frame > durationFrames - fadeOutFrames)
                        vol *= (durationFrames - frame) / fadeOutFrames;
                      return Math.max(0, vol);
                    };

              return (
                <Sequence
                  key={clip.id}
                  from={startFrame}
                  durationInFrames={durationFrames}
                >
                  <Audio
                    src={mediaUrl}
                    startFrom={Math.round((clip.source_in_sec ?? 0) * fps)}
                    playbackRate={clip.speed ?? 1}
                    volume={volumeProp}
                  />
                </Sequence>
              );
            }),
      )}

      {/* Subtitle tracks */}
      {subtitleTracks.map((track) =>
        track.muted
          ? null
          : track.clips.map((clip) => {
              const startFrame = Math.round(clip.timeline_start_sec * fps);
              const endFrame = Math.round(clip.timeline_end_sec * fps);
              const durationFrames = endFrame - startFrame;

              if (durationFrames < 1) return null;

              // SRT file-backed subtitle: has media_id but no inline text
              if (!clip.subtitle_text && clip.media_id) {
                return (
                  <Sequence
                    key={clip.id}
                    from={startFrame}
                    durationInFrames={durationFrames}
                  >
                    <SrtSubtitleClip clip={clip} timeline={timeline} fps={fps} />
                  </Sequence>
                );
              }

              // Inline subtitle text
              if (!clip.subtitle_text) return null;

              return (
                <Sequence
                  key={clip.id}
                  from={startFrame}
                  durationInFrames={durationFrames}
                >
                  <InlineSubtitleClip clip={clip} isSSR={!!(timeline as any)._ssr} />
                </Sequence>
              );
            }),
      )}

    </AbsoluteFill>
  );
};
