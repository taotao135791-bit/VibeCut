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
  { value: 'flash', label: '闪白', scope: 'fullscreen' },
  { value: 'cinematic_bars', label: '电影黑边', scope: 'fullscreen' },
  { value: 'speed_lines', label: '速度线', scope: 'fullscreen' },
  { value: 'spotlight', label: '聚光灯', scope: 'component' },
  { value: 'callout', label: '标注', scope: 'component' },
  { value: 'sticker_text', label: '贴纸文字', scope: 'component' },
];

const COMPONENT_TYPES = [
  { value: '', label: '纯叠加层' },
  { value: 'offer_stage', label: '全屏优惠页' },
  { value: 'pricing_stage', label: '全屏价格页' },
  { value: 'proof_stage', label: '全屏证言页' },
  { value: 'promo_top_bar', label: '促销顶栏' },
  { value: 'price_badge', label: '价格徽章' },
  { value: 'countdown_banner', label: '倒计时横幅' },
  { value: 'model_rate_grid', label: '费率表格' },
  { value: 'reaction_sticker', label: '表情贴纸' },
  { value: 'cta_badge', label: '行动号召徽章' },
] as const;

const PRESETS = [
  { value: 'lovart_promo', label: 'Lovart 促销' },
  { value: 'cinema_dark', label: '电影暗色' },
  { value: 'clean_price_card', label: '简洁价格卡' },
] as const;

const MOTIONS = [
  { value: 'pop', label: '弹出' },
  { value: 'slide', label: '滑入' },
  { value: 'pulse', label: '脉冲' },
  { value: 'none', label: '无' },
] as const;

const ANCHORS = [
  { value: 'top', label: '顶部' },
  { value: 'bottom', label: '底部' },
  { value: 'left', label: '左侧' },
  { value: 'right', label: '右侧' },
  { value: 'center', label: '居中' },
  { value: 'top_left', label: '左上' },
  { value: 'top_right', label: '右上' },
  { value: 'bottom_left', label: '左下' },
  { value: 'bottom_right', label: '右下' },
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
        <legend className="text-xs font-medium text-zinc-300 mb-2">特效</legend>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">类型</label>
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
            <label className="block text-xs text-zinc-400 mb-1">作用范围</label>
            <select
              value={scope}
              onChange={(e) => onUpdate({ effect_scope: e.target.value as EffectScope })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100
                         focus:outline-none focus:border-blue-500"
            >
              <option value="fullscreen">全屏</option>
              <option value="component">组件</option>
            </select>
          </div>
          {!batchMode && (
            <NumberField
              label="时长（秒）"
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
          <label className="block text-xs text-zinc-400 mb-1">文本</label>
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
        <legend className="text-xs font-medium text-zinc-300 mb-2">外观</legend>
        <div className="space-y-2">
          {canPickComponent && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">组件</label>
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
                  <label className="block text-xs text-zinc-400 mb-1">预设</label>
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
                  <label className="block text-xs text-zinc-400 mb-1">动效</label>
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
                <label className="block text-xs text-zinc-400 mb-1">锚点</label>
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
                label="安全边距"
                value={params.safe_area ?? 0.06}
                min={0}
                max={0.5}
                step={0.01}
                onChange={(v) => handleParamChange('safe_area', v)}
              />
            </>
          )}
          <NumberField
            label="强度"
            value={params.intensity ?? 0.8}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => handleParamChange('intensity', v)}
          />
          <div>
            <label className="block text-xs text-zinc-400 mb-1">主色</label>
            <input
              type="color"
              value={params.color ?? '#0f172a'}
              onChange={(e) => handleParamChange('color', e.target.value)}
              className="w-full h-8 bg-zinc-800 border border-zinc-700 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">点缀色</label>
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
            <legend className="text-xs font-medium text-zinc-300 mb-2">位置</legend>
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
            <legend className="text-xs font-medium text-zinc-300 mb-2">尺寸</legend>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="宽度"
                value={style.width ?? 0.3}
                min={0.02}
                max={1.5}
                step={0.01}
                onChange={(v) => handleStyleChange('width', v)}
              />
              <NumberField
                label="高度"
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
