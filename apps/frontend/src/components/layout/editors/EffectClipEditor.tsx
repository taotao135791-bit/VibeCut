import { useCallback, useEffect, useState } from 'react';
import type { Clip, EffectKind, EffectParams, EffectScope, VideoStyle } from '@mrdv2/shared';

interface EffectClipEditorProps {
  clip: Clip;
  onUpdate: (updates: Partial<Clip>) => void;
  batchMode?: boolean;
}

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

const EFFECT_KINDS: { value: EffectKind; label: string; scope: EffectScope }[] = [
  { value: 'flash', label: 'Flash', scope: 'fullscreen' },
  { value: 'cinematic_bars', label: 'Cinematic Bars', scope: 'fullscreen' },
  { value: 'speed_lines', label: 'Speed Lines', scope: 'fullscreen' },
  { value: 'spotlight', label: 'Spotlight', scope: 'component' },
  { value: 'callout', label: 'Callout', scope: 'component' },
  { value: 'sticker_text', label: 'Sticker Text', scope: 'component' },
];

const COMPONENT_TYPES = [
  { value: '', label: 'Plain overlay' },
  { value: 'offer_stage', label: 'Full-page offer stage' },
  { value: 'pricing_stage', label: 'Full-page pricing stage' },
  { value: 'proof_stage', label: 'Full-page proof stage' },
  { value: 'promo_top_bar', label: 'Promo top bar' },
  { value: 'price_badge', label: 'Price badge' },
  { value: 'countdown_banner', label: 'Countdown banner' },
  { value: 'model_rate_grid', label: 'Model rate grid' },
  { value: 'reaction_sticker', label: 'Reaction sticker' },
  { value: 'cta_badge', label: 'CTA badge' },
] as const;

const PRESETS = [
  { value: 'lovart_promo', label: 'Lovart promo' },
  { value: 'cinema_dark', label: 'Cinema dark' },
  { value: 'clean_price_card', label: 'Clean price card' },
] as const;

const MOTIONS = [
  { value: 'pop', label: 'Pop' },
  { value: 'slide', label: 'Slide' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'none', label: 'None' },
] as const;

const ANCHORS = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'center', label: 'Center' },
  { value: 'top_left', label: 'Top left' },
  { value: 'top_right', label: 'Top right' },
  { value: 'bottom_left', label: 'Bottom left' },
  { value: 'bottom_right', label: 'Bottom right' },
] as const;

function NumberField({ label, value, min, max, step = 0.01, onChange }: NumberFieldProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input
        type="number"
        value={local}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          if (isNaN(val)) return;
          setLocal(val);
          onChange(val);
        }}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100
                   focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

export default function EffectClipEditor({ clip, onUpdate, batchMode }: EffectClipEditorProps) {
  const style: VideoStyle = clip.video_style ?? {};
  const params: EffectParams = clip.effect_params ?? {};
  const kind = clip.effect_kind ?? 'callout';
  const scope = clip.effect_scope ?? 'component';
  const duration = Math.max(0.1, clip.timeline_end_sec - clip.timeline_start_sec);
  const hasStageComponent =
    params.component_type === 'offer_stage' || params.component_type === 'pricing_stage' || params.component_type === 'proof_stage';
  const canPickComponent = scope === 'component' || hasStageComponent;

  const handleStyleChange = useCallback(
    (key: keyof VideoStyle, value: number | string) => {
      onUpdate({ video_style: { ...clip.video_style, [key]: value } });
    },
    [clip.video_style, onUpdate],
  );

  const handleParamChange = useCallback(
    (key: keyof EffectParams, value: number | string | undefined) => {
      const nextParams = { ...clip.effect_params };
      if (value === undefined || value === '') {
        delete nextParams[key];
      } else {
        nextParams[key] = value as never;
      }
      onUpdate({ effect_params: nextParams });
    },
    [clip.effect_params, onUpdate],
  );

  const handleComponentTypeChange = useCallback(
    (componentType: string) => {
      const nextParams = { ...clip.effect_params };
      if (componentType) {
        nextParams.component_type = componentType as EffectParams['component_type'];
        nextParams.preset_id = nextParams.preset_id ?? 'lovart_promo';
        nextParams.motion_preset = nextParams.motion_preset ?? 'pop';
        nextParams.layout_anchor = nextParams.layout_anchor ?? 'top_right';
        nextParams.safe_area = nextParams.safe_area ?? 0.06;
      } else {
        delete nextParams.component_type;
      }
      onUpdate({ effect_params: nextParams });
    },
    [clip.effect_params, onUpdate],
  );

  const handleKindChange = useCallback(
    (nextKind: EffectKind) => {
      const preset = EFFECT_KINDS.find((item) => item.value === nextKind);
      const nextScope = preset?.scope ?? scope;
      onUpdate({
        effect_kind: nextKind,
        effect_scope: nextScope,
        subtitle_text:
          nextKind === 'callout'
            ? clip.subtitle_text || '重点来了'
            : nextKind === 'sticker_text'
              ? clip.subtitle_text || '高能片段'
              : clip.subtitle_text,
      });
    },
    [clip.subtitle_text, scope, onUpdate],
  );

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-xs font-medium text-zinc-300 mb-2">Effect</legend>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Type</label>
            <select
              value={kind}
              onChange={(e) => handleKindChange(e.target.value as EffectKind)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100
                         focus:outline-none focus:border-blue-500"
            >
              {EFFECT_KINDS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Scope</label>
            <select
              value={scope}
              onChange={(e) => onUpdate({ effect_scope: e.target.value as EffectScope })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100
                         focus:outline-none focus:border-blue-500"
            >
              <option value="fullscreen">Full screen</option>
              <option value="component">Component</option>
            </select>
          </div>
          {!batchMode && (
            <NumberField
              label="Duration (sec)"
              value={duration}
              min={0.1}
              max={20}
              step={0.1}
              onChange={(v) => onUpdate({ timeline_end_sec: clip.timeline_start_sec + v })}
            />
          )}
        </div>
      </fieldset>

      {(kind === 'callout' || kind === 'sticker_text') && !batchMode && (
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Text</label>
          <textarea
            value={clip.subtitle_text ?? ''}
            onChange={(e) => onUpdate({
              subtitle_text: e.target.value,
              effect_params: { ...clip.effect_params, label: e.target.value },
            })}
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100
                       focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      )}

      <fieldset>
        <legend className="text-xs font-medium text-zinc-300 mb-2">Look</legend>
        <div className="space-y-2">
          {canPickComponent && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Component</label>
                <select
                  value={params.component_type ?? ''}
                  onChange={(e) => handleComponentTypeChange(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100
                             focus:outline-none focus:border-blue-500"
                >
                  {COMPONENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Preset</label>
                  <select
                    value={params.preset_id ?? 'lovart_promo'}
                    onChange={(e) => handleParamChange('preset_id', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100
                               focus:outline-none focus:border-blue-500"
                  >
                    {PRESETS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Motion</label>
                  <select
                    value={params.motion_preset ?? 'pop'}
                    onChange={(e) => handleParamChange('motion_preset', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100
                               focus:outline-none focus:border-blue-500"
                  >
                    {MOTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Anchor</label>
                <select
                  value={params.layout_anchor ?? 'top_right'}
                  onChange={(e) => handleParamChange('layout_anchor', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100
                             focus:outline-none focus:border-blue-500"
                >
                  {ANCHORS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <NumberField
                label="Safe area"
                value={params.safe_area ?? 0.06}
                min={0}
                max={0.5}
                step={0.01}
                onChange={(v) => handleParamChange('safe_area', v)}
              />
            </>
          )}
          <NumberField
            label="Intensity"
            value={params.intensity ?? 0.8}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => handleParamChange('intensity', v)}
          />
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Color</label>
            <input
              type="color"
              value={params.color ?? '#0f172a'}
              onChange={(e) => handleParamChange('color', e.target.value)}
              className="w-full h-8 bg-zinc-800 border border-zinc-700 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Accent</label>
            <input
              type="color"
              value={params.accent_color ?? '#38bdf8'}
              onChange={(e) => handleParamChange('accent_color', e.target.value)}
              className="w-full h-8 bg-zinc-800 border border-zinc-700 rounded"
            />
          </div>
        </div>
      </fieldset>

      {scope === 'component' && (
        <>
          <fieldset>
            <legend className="text-xs font-medium text-zinc-300 mb-2">Position</legend>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="X"
                value={style.position_x ?? 0.5}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => handleStyleChange('position_x', v)}
              />
              <NumberField
                label="Y"
                value={style.position_y ?? 0.5}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => handleStyleChange('position_y', v)}
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-medium text-zinc-300 mb-2">Size</legend>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Width"
                value={style.width ?? 0.3}
                min={0.02}
                max={1.5}
                step={0.01}
                onChange={(v) => handleStyleChange('width', v)}
              />
              <NumberField
                label="Height"
                value={style.height ?? 0.16}
                min={0.02}
                max={1.5}
                step={0.01}
                onChange={(v) => handleStyleChange('height', v)}
              />
            </div>
          </fieldset>
        </>
      )}
    </div>
  );
}
