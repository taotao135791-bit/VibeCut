# VibeCut - Visual Direction (DESIGN.md)

> Single source of truth for visual decisions. Your design language is NOT pre-set here --
> it is derived fresh from each brand's real visual DNA using the method below.

---

## 0. Three Guarantees

Every deliverable must pass all three:

- **EFFICACY** -- viewer remembers ONE message within 3 seconds. Key copy appears >=2 times. CTA holds >=1.5s.
- **AESTHETIC** -- frame is physically harmonious: no text overflow, no collision, breathing room >= 62%, ink area <= 38%.
- **UNIVERSALITY** -- the same method (Token Extraction + Synthesis) produces different visual outcomes for different brands. If it only works for one style, it's broken.

---

## 0.5 Craft Quality Baseline (what separates "produced" from "wireframe")

These apply to ALL videos regardless of brand tokens, style, or decoration density. They are the difference between a PM prototype and an agency deliverable.

| Principle | Rule | Why |
|---|---|---|
| **Rhythm engineering** | Never cut duration into equal slices. Tension curve: intro 0-15%, buildup 15-50%, climax 50-75%, resolve 75-100%. Visual climax at 60-70% mark. Variable chapter length (2s / 3-4s / 5s). | Equal slices = no drama = boring. |
| **Silence as design** | 0.3-0.8s of pure black between chapters. Pre-climax: 0.6-1.0s. Pre-CTA: 0.5s. | Black frames are punctuation. They carry emotional weight. |
| **Micro-timing** | Headline at chapter_start + 0.2s. Sub at headline + 0.3s. Sub exits at chapter_end - 0.3s. Headline exits at chapter_end - 0.1s. Diamond shape: gap-headline-both-sub_exits-headline-gap. | Simultaneous = cheap. Stagger = cinematic. |
| **Scale hierarchy** | headline:sub = 1.6-2.0x. Largest size only 1-2 times per video (climax). Normal frames use medium. | Random sizes = no design. Ratio = intention. |
| **Position micro-drift** | y varies +-2-4% per chapter. Intro: 0.46. Normal: 0.48-0.52 alternating. Climax: 0.42. CTA: 0.54. | Static position = surveillance camera. Drift = breathing. |
| **Density wave** | Alternate high-info frames (2-3 elements) with breathing frames (0-1). Pattern is uneven, not uniform. | Uniform density = wallpaper. Wave = rhythm. |
| **Layout harmony** | No overflow (all elements within [5%,95%] canvas). No occlusion (min 80px vertical gap between text layers). Consistent alignment per scene. Transitions only overlap gaps, never content. Components self-contain their layout. | Chaos = amateur. Harmony = produced. |

---

## 1. Brand Design Token Extraction (R1 -- the core)

When a brand is mentioned, fetch their homepage and extract 7 structured tokens from the **real CSS / layout**:

| # | Token | What to extract | Video mapping |
|---|---|---|---|
| 1 | `type_scale` | Font sizes actually used (e.g. `[12, 14, 24]` px) | Multiply by `canvas_height / 200`. Example: web `[12,14,24]` -> video `[65, 75, 130]` for 1080p |
| 2 | `weight_range` | Font-weight values (e.g. `[400, 600]`) | Use directly. If brand uses 600, do NOT escalate to 900. |
| 3 | `spacing_grid` | Base unit (e.g. `8px`, multiples `4/8/16/24/32`) | Map to `position_y` differences between elements |
| 4 | `color_depth` | Strategy: `rgba-transparency-stack` / `solid-accent` / `gradient-mesh` / `monochrome` | Determines fill approach for all elements |
| 5 | `radius_system` | Corner radii (e.g. `[0, 16, 9999]`) | Informs visual softness / sharpness of the world |
| 6 | `decoration_density` | `0`=none / `1`=minimal / `2`=moderate / `3`=heavy | **This decides what layers exist in the timeline** (see below) |
| 7 | `primary_tension` | Where visual interest comes from | Determines composition strategy for each frame |

### decoration_density guide

| Level | What it means in the timeline |
|---|---|
| 0 (none) | No ticker, no file-mark, no chromatic split, no ornament. Only text + background. Maximum whitespace. (e.g. Moonshot, Apple) |
| 1 (minimal) | One subtle persistent element (small watermark or single corner mark). Clean. |
| 2 (moderate) | Chrome layer: file marks + counters. Maybe one ticker. |
| 3 (heavy) | Full editorial density: ticker + marks + chromatic split + grain + scanlines. (e.g. news broadcast, data dashboards) |

### primary_tension types

| Type | What it means for composition |
|---|---|
| `full-bleed-media + text-overlay` | Large image/video fills frame. Text overlaid on gradient scrim. Minimal elements per frame. |
| `typography-clash` | Visual interest from font size contrast, unexpected type pairings, spatial tension between words. |
| `color-block` | Bold solid-color regions create structure. Text lives inside blocks. |
| `motion-only` | Frames are static/minimal; all interest comes from how things enter/exit. |
| `data-density` | Many simultaneous data points, numbers, grids -- the density IS the aesthetic. |

**Document tokens in script frontmatter as `brand_tokens:`.** Every layout decision must trace back to one of these 7 tokens. If it can't, it shouldn't exist.

---

## 2. Direction Synthesis (INFLUENCE x COUNTER x VERB)

After extracting tokens, synthesize a unique direction:

1. Collect >=3 non-obvious influences. One MUST be the brand's own DNA (from token extraction). Others are cross-medium, cross-era, cross-discipline references.
2. Pick 1 counter-convention (what this brand/industry never does).
3. Frame as 1 verb metaphor (what this video IS DOING, not what it LOOKS LIKE).

Emit in frontmatter:
```yaml
direction_id: <unique-slug>
brand_tokens:
  type_scale: [65, 75, 130]
  weight_range: [400, 600]
  spacing_grid: 8
  color_depth: rgba-transparency-stack
  radius_system: [0, 16, 9999]
  decoration_density: 0
  primary_tension: full-bleed-media + text-overlay
influences:
  - <brand DNA from tokens>
  - <cross-medium reference>
  - <cross-era reference>
counter_convention: <one line>
verb_metaphor: <one verb-led sentence>
palette:
  dom: <hex>
  text: <hex>
  accent: <hex>
```

---

## 3. Canvas Physics (R2 -- never skip)

These are physical constraints, not style preferences:

| Constraint | Rule |
|---|---|
| Safe area | All elements within `x=[0.05, 0.95]`, `y=[0.05, 0.95]` |
| Overflow guard | `estimated_text_width <= 0.85 * canvas_width`. If exceeded: shrink font or break line. |
| Ink-area budget | Simultaneously-visible elements bbox <= 38% of frame area |
| 5-region balance | TL / TR / C / BL / BR -- use <= 3 per shot |
| Min element gap | Non-overlapping elements >= 18px apart |

### Text width estimation formula

```python
def estimate_width(text: str, font_size: int) -> float:
    w = 0
    for ch in text:
        if '\u4e00' <= ch <= '\u9fff': w += font_size * 1.0   # CJK
        elif ch.isupper():             w += font_size * 0.65  # uppercase
        elif ch.isdigit():             w += font_size * 0.60  # digits
        elif ch == ' ':                w += font_size * 0.30  # space
        else:                          w += font_size * 0.50  # lowercase
    return w
```

If `estimate_width(text, size) > canvas_width * 0.85`: auto-shrink `size = int(size * 0.85 * canvas_width / estimated)`.

---

## 4. Anti-AI-Slop (truly universal -- NOT style preferences)

These are the ONLY universal prohibitions. Everything else depends on brand tokens.

| Prohibited | Why |
|---|---|
| Using `inter` / `roboto` / `arial` as headline **when brand does NOT use them** | Lazy default, not a design choice |
| >= 4 hero colors evenly distributed | No hierarchy = no design |
| "AI purple" gradient on white | Cliche default of every AI product |
| Every shot identical layout | Indicates no thought per frame |
| Single FullCard repeated for entire video | Zero compositional effort |

Note: center-alignment, serif fonts, decorative layers, tickers -- these are NOT inherently bad. They are wrong only when they contradict the brand's tokens. If the brand IS center-aligned (like Moonshot), then center-align.

---

## 5. Component Pack Reference

Available components in `pro-toolkit/` (use when appropriate, not mandatory):

| Component | Good for |
|---|---|
| `FullCard` / `SplashReveal` | Title reveals, chapter openers (when decoration_density >= 2) |
| `TickerBar` | Persistent info strip (when decoration_density >= 2) |
| `TransitionFlash` | Hard cuts between chapters |
| `InfoGrid` | Multi-column data display |
| `PriceCard` | Pricing information |
| `CtaPill` / `BottomStrip` | Call-to-action overlays |
| `CountdownBlock` | Timer/urgency |

Selection rule: **only use components that match the brand's `decoration_density` token.** If density=0, use none of these -- just subtitle clips with appropriate styling.

---

## 6. Pre-Render Checklist

```
-- Three Guarantees --
[ ] Key message sticks at 3s
[ ] CTA holds >= 1.5s
[ ] Key copy appears >= 2 times
[ ] ink area <= 38% on all frames

-- Token Compliance --
[ ] All font sizes derived from brand type_scale (not hardcoded)
[ ] Font weight matches brand weight_range
[ ] Decoration density matches brand token (0=clean, 3=heavy)
[ ] Color approach matches brand color_depth
[ ] No text exceeds 85% canvas width (overflow guard passes)
[ ] Safe area respected (x/y within [0.05, 0.95])
[ ] <= 3 of 5 regions used per shot

-- Direction --
[ ] direction_id declared in frontmatter
[ ] brand_tokens block present with all 7 values
[ ] >= 3 influences listed (one is brand DNA)
[ ] Unique from last project (>= 2 different influences)

-- Universal Anti-Slop --
[ ] No Inter/Roboto/Arial headline unless brand actually uses it
[ ] No >= 4 evenly-distributed hero colors
[ ] Not every shot identical layout
[ ] 4.5:1 text contrast ratio
```

---

## 7. Token-to-Video Mapping Quick Reference

| Web token | Video equivalent |
|---|---|
| font-size 12px | `12 * (1080/200)` = 65px |
| font-size 14px | 75px |
| font-size 24px | 130px |
| font-size 32px | 173px |
| font-weight 600 | Use 600 (not bold) |
| spacing 8px | position_y difference ~0.04 (= 43px / 1080) |
| spacing 16px | position_y difference ~0.08 |
| spacing 32px | position_y difference ~0.16 |
| rgba(0,0,0,0.7) | subtitle background with 70% opacity |
| border-radius 16px | Not applicable in video (no cards) unless using effect components |

The mapping ratio `canvas_height / 200` works because web content is typically viewed at ~900px viewport height, and video at 1080px full-screen -- the ratio accounts for viewing distance difference.

---

> This file defines METHOD, not STYLE. Style comes from the brand.
