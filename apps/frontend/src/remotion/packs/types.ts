/**
 * Creative Pack component interface.
 *
 * Every pack component is a standard React FC that receives these unified props.
 * The component decides how to render itself — layout, animation, colors, etc.
 */

import type { Clip } from '@mrdv2/shared';

export interface PackComponentProps {
  /** The full clip object from the timeline (includes effect_params, video_style, subtitle_text, etc.) */
  clip: Clip;
  /** Current frame number within this clip's Sequence (0-based) */
  frame: number;
  /** Total frames this clip occupies */
  durationFrames: number;
  /** Normalized progress 0→1 within this clip */
  progress: number;
  /** Whether rendering in SSR/export mode (no interactivity) */
  isSSR: boolean;
}

export type PackComponent = React.FC<PackComponentProps>;

export interface PackManifest {
  name: string;
  description: string;
  author?: string;
  version?: string;
  components: string[];
}
