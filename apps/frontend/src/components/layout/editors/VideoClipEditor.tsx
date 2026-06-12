import { useState, useEffect, useCallback } from 'react';
import type { Clip, VideoStyle } from '@mrdv2/shared';
import SpeedControl from './SpeedControl';
import VolumeControl from './VolumeControl';
import FadeControl from './FadeControl';

interface VideoClipEditorProps {
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

export default function VideoClipEditor({ clip, onUpdate, batchMode }: VideoClipEditorProps) {
  const style: VideoStyle = clip.video_style ?? {};

  const handleStyleChange = useCallback(
    (key: keyof VideoStyle, value: number | string) => {
      onUpdate({
        video_style: { ...clip.video_style, [key]: value },
      });
    },
    [clip.video_style, onUpdate],
  );

  return (
    <div className="space-y-4">
      {/* Speed — only for media clips with source range (hidden in batch mode) */}
      {!batchMode && clip.source_in_sec != null && clip.source_out_sec != null && (
        <SpeedControl clip={clip} onSpeedChange={(v) => onUpdate({ speed: v })} />
      )}

      {/* Volume */}
      {!batchMode && (
        <VolumeControl clip={clip} onVolumeChange={(v) => onUpdate({ volume: v })} />
      )}

      {/* Fade */}
      {!batchMode && (
        <FadeControl clip={clip} onFadeChange={(fi, fo) => onUpdate({ fade_in_sec: fi, fade_out_sec: fo })} />
      )}

      {/* Position */}
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

      {/* Size */}
      <fieldset>
        <legend className="text-xs font-medium text-zinc-300 mb-2">尺寸</legend>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="宽度"
            value={style.width ?? 1.0}
            min={0.01}
            max={2.0}
            step={0.01}
            onChange={(v) => handleStyleChange('width', v)}
          />
          <NumberField
            label="高度"
            value={style.height ?? 1.0}
            min={0.01}
            max={2.0}
            step={0.01}
            onChange={(v) => handleStyleChange('height', v)}
          />
        </div>
      </fieldset>

      {/* Appearance */}
      <fieldset>
        <legend className="text-xs font-medium text-zinc-300 mb-2">外观</legend>
        <div className="space-y-2">
          <NumberField
            label="不透明度"
            value={style.opacity ?? 1.0}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => handleStyleChange('opacity', v)}
          />
          <NumberField
            label="圆角（px）"
            value={style.border_radius ?? 0}
            min={0}
            max={999}
            step={1}
            onChange={(v) => handleStyleChange('border_radius', v)}
          />
          <div>
            <label className="block text-xs text-zinc-400 mb-1">填充方式</label>
            <select
              value={style.fit ?? 'contain'}
              onChange={(e) => handleStyleChange('fit', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100
                         focus:outline-none focus:border-blue-500"
            >
              <option value="contain">适应（contain）</option>
              <option value="cover">裁切填满（cover）</option>
              <option value="fill">拉伸（fill）</option>
            </select>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
