/**
 * Pack Registry — manages creative pack components.
 *
 * Components are registered via explicit imports (works in both Vite and Remotion/webpack).
 * The register_creative_pack backend tool updates this file when new packs are added.
 *
 * Usage in EffectClipRenderer:
 *   const Comp = packRegistry.get("NeonHook");
 *   if (Comp) return <Comp {...props} />;
 */

import type { PackComponent } from './types';

// ── Explicit pack imports (auto-managed by register_creative_pack tool) ──
import * as builtinPromo from './builtin-promo/index';
import * as proToolkit from './pro-toolkit/index';
import * as lovart_promo_v1 from './lovart-promo-v1/index';
// __PACK_IMPORTS__

class PackRegistry {
  private components = new Map<string, PackComponent>();

  constructor() {
    // Register builtin packs
    this.registerPack('builtin-promo', builtinPromo as Record<string, unknown>);
    this.registerPack('pro-toolkit', proToolkit as Record<string, unknown>);
        this.registerPack('lovart-promo-v1', lovart_promo_v1 as Record<string, unknown>);
    // __PACK_REGISTRATIONS__
  }

  registerPack(packName: string, mod: Record<string, unknown>) {
    for (const [exportName, component] of Object.entries(mod)) {
      if (typeof component === 'function') {
        this.components.set(`${packName}/${exportName}`, component as PackComponent);
        this.components.set(exportName, component as PackComponent);
      }
    }
  }

  /**
   * Look up a component by name.
   * Supports:
   *   - Full path: "builtin-promo/OfferHero"
   *   - Short name: "OfferHero"
   *   - Legacy component_type: "offer_stage" (mapped via pack aliases)
   */
  get(name: string | undefined | null): PackComponent | undefined {
    if (!name) return undefined;
    return this.components.get(name);
  }

  /** Register a single component at runtime. */
  register(key: string, component: PackComponent) {
    this.components.set(key, component);
  }

  keys(): string[] {
    return Array.from(this.components.keys());
  }

  has(name: string): boolean {
    return this.components.has(name);
  }
}

export const packRegistry = new PackRegistry();
