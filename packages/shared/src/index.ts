export * from './fonts';

export interface ProjectMeta {
  name: string;
  width: number;
  height: number;
  fps: 23.976 | 24 | 25 | 29.97 | 30 | 50 | 59.94 | 60;
}

export interface MediaAsset {
  id: string;
  path: string;
  type: 'video' | 'audio' | 'image';
  duration_sec?: number;
  width?: number;
  height?: number;
  sample_rate?: number;
  channels?: number;
}

export interface SubtitleStyle {
  position_x?: number;
  position_y?: number;
  font_family?: string;
  font_size?: number;
  color?: string;
  background?: string;
  text_align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  outline_color?: string;
  outline_width?: number;
  shadow?: string;
  padding?: string;
  border_radius?: number;
  opacity?: number;
  letter_spacing?: number;
}

export const DEFAULT_SUBTITLE_STYLE: Required<SubtitleStyle> = {
  position_x: 0.5,
  position_y: 0.85,
  font_family: 'sans-serif',
  font_size: 48,
  color: '#FFFFFF',
  background: 'rgba(0,0,0,0.6)',
  text_align: 'center',
  bold: false,
  italic: false,
  outline_color: 'transparent',
  outline_width: 0,
  shadow: 'none',
  padding: '4px 16px',
  border_radius: 4,
  opacity: 1,
  letter_spacing: 0,
};

/** Merge preset base with per-clip overrides. Non-undefined override fields win. */
export function resolveSubtitleStyle(
  preset: SubtitleStyle,
  override?: SubtitleStyle | null,
): Required<SubtitleStyle> {
  const base = { ...DEFAULT_SUBTITLE_STYLE, ...preset };
  if (override) {
    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined && value !== null) {
        (base as Record<string, unknown>)[key] = value;
      }
    }
  }
  return base;
}

export interface VideoStyle {
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  fit?: 'contain' | 'cover' | 'fill';
  crop_left?: number;
  crop_top?: number;
  crop_right?: number;
  crop_bottom?: number;
  border_radius?: number;
}

export type EffectScope = 'fullscreen' | 'component';
export type EffectKind =
  | 'flash'
  | 'cinematic_bars'
  | 'speed_lines'
  | 'spotlight'
  | 'callout'
  | 'sticker_text'
  | (string & {}); // allow custom effect kinds from creative packs

export interface EffectParams {
  intensity?: number;
  color?: string;
  accent_color?: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  label?: string;
  /** Component type — built-in or custom from a creative pack. */
  component_type?: string;
  /** Pack name to resolve component from (e.g. "builtin-promo"). */
  pack?: string;
  preset_id?: string;
  layout_anchor?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  motion_preset?: 'pop' | 'slide' | 'pulse' | 'none' | (string & {});
  safe_area?: number;
  avoid_regions?: string[];
  z_index_policy?: 'below_subtitles' | 'above_subtitles' | 'top';
  /** Arbitrary extra data for custom pack components. */
  [key: string]: unknown;
}

export interface Clip {
  id: string;
  type: 'video' | 'audio' | 'subtitle' | 'effect';
  media_id?: string;
  source_in_sec?: number;
  source_out_sec?: number;
  timeline_start_sec: number;
  timeline_end_sec: number;
  speed?: number;
  volume?: number;
  fade_in_sec?: number;
  fade_out_sec?: number;
  subtitle_text?: string;
  subtitle_style_ref?: string;
  subtitle_style?: SubtitleStyle;
  video_style?: VideoStyle;
  effect_kind?: EffectKind;
  effect_scope?: EffectScope;
  effect_params?: EffectParams;
}

export interface Track {
  id: string;
  name?: string;
  type: 'video' | 'audio' | 'subtitle' | 'effect';
  locked?: boolean;
  muted?: boolean;
  clips: Clip[];
}

export interface TimelineProject {
  version: '1.0.0';
  project: ProjectMeta;
  media_pool: MediaAsset[];
  tracks: Track[];
}
