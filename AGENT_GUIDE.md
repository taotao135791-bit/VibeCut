# Agent Creative Director Guide — Motion Design Edition

This guide teaches any coding agent how to produce **YouTube-trending-level
promotional remix videos** by writing custom Remotion TSX animation components.

**Core principles:**
- You write a BRAND NEW unique animation component every time. Never reuse.
- Each component must be visually STUNNING — not "acceptable", not "functional", but jaw-dropping.
- Content comes from props (clip.subtitle_text). NEVER hardcode copy into components.
- Iterate: render → screenshot → evaluate → fix → re-render.

---

## The Standard: What "Good Enough" Looks Like

If your output looks like a PowerPoint slide with animation — you failed.
If someone would scroll past it on social media — you failed.
If it doesn't make the viewer go "how did they do that" — you failed.

Your output should look like:
- Apple product launch motion graphics
- Premium Superbowl ad lower-thirds
- Netflix title sequences
- High-end SaaS product launch videos

---

## Workflow

```
1. ANALYZE   → Watch video frames + transcribe audio for precise timestamps
2. CONCEIVE  → Imagine the most visually stunning MG you can. Think cinema, not CSS.
3. CODE      → Write TSX with advanced animation techniques (see below)
4. REGISTER  → register_creative_pack
5. PLACE     → smart_compose / add_clips
6. VERIFY    → Export, extract frames sequentially, evaluate quality
7. ITERATE   → If not stunning, rewrite and re-render
```

---

## CRITICAL: Content From Props, Not Hardcoded

```tsx
// WRONG - hardcoded content
const title = "57% OFF";

// RIGHT - read from timeline clip
const lines = (clip.subtitle_text || "").split("\n");
const title = lines[0] || "";
const badge = lines[1] || "";
const subtitle = lines[2] || "";
```

The agent passes text via smart_compose anchor's `text` field.
The component renders whatever it receives. This makes it reusable for ANY content.

---

## Visual Techniques That Create "Wow"

Don't just use opacity and translateY. Use COMBINATIONS:

### Text Reveals
```tsx
// Clip-mask text reveal (text appears letter by letter from left)
const revealWidth = spring({frame: frame - delay, fps, config: {damping: 20}});
<div style={{clipPath: `inset(0 ${(1-revealWidth)*100}% 0 0)`}}>
  <span style={{fontSize: 140}}>57% OFF</span>
</div>

// Blur-to-sharp (text starts blurry, snaps into focus)
const clarity = Math.min(1, (frame - delay) / 8);
<div style={{filter: `blur(${(1-clarity)*12}px)`, opacity: clarity}}>
```

### Light & Glow Effects
```tsx
// Animated gradient sweep across text
const sweep = (frame * 3) % 200 - 50; // moving highlight position
<div style={{
  backgroundImage: `linear-gradient(90deg, #fff ${sweep-20}%, ${accent} ${sweep}%, #fff ${sweep+20}%)`,
  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
}}>

// Pulsing glow on key element
const glowSize = 30 + Math.sin(frame * 0.1) * 10;
<div style={{boxShadow: `0 0 ${glowSize}px ${accent}60, 0 0 ${glowSize*2}px ${accent}20`}}>
```

### Kinetic Typography
```tsx
// Each character enters separately (for short words like "57% OFF")
const chars = text.split("");
chars.map((char, i) => {
  const charIn = spring({frame: frame - 5 - i*2, fps, config: {damping: 8, stiffness: 300}});
  return <span style={{display: "inline-block", transform: `translateY(${(1-charIn)*60}px) rotate(${(1-charIn)*10}deg)`, opacity: charIn}}>{char}</span>
})

// Counter roll-up (numbers count from 0 to target)
const progress = Math.min(1, frame / 20);
const displayNum = Math.round(targetNum * progress);
```

### Backgrounds That Live
```tsx
// Animated gradient flow
const angle = 135 + Math.sin(frame * 0.02) * 15;
const shift = frame * 0.5;
<div style={{background: `linear-gradient(${angle}deg, #000 0%, #1a0030 ${30+shift%20}%, #000 100%)`}}>

// Particle field (dots floating)
{Array.from({length: 20}).map((_, i) => (
  <div key={i} style={{
    position: "absolute",
    left: `${(i*37 + frame*0.3) % 100}%`,
    top: `${(i*53 + Math.sin(frame*0.05+i)*10) % 100}%`,
    width: 3, height: 3, borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
  }}/>
))}
```

### Shape Animations
```tsx
// Growing circle reveal (content appears through expanding circle)
const radius = spring({frame, fps, config: {damping: 15}}) * 150;
<div style={{clipPath: `circle(${radius}% at 50% 50%)`}}>

// Accent line that draws itself
const lineWidth = spring({frame: frame - 20, fps}) * 200;
<div style={{width: lineWidth, height: 3, background: accent, margin: "0 auto"}}>
```

---

## How to Write a Motion Graphic Component

### MANDATORY: Read content from props
```tsx
import React from "react";
import { spring, useVideoConfig } from "remotion";
import type { PackComponentProps } from "../types";

export const MyComponent: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const { fps, width, height } = useVideoConfig();
  // ALL content from subtitle_text — NEVER hardcode
  const lines = (clip.subtitle_text || "").split("\n");
  const title = lines[0] || "";
  const badge = lines[1] || "";
  const sub = lines.slice(2).join(" \u00b7 ");
  // Use width/height for responsive sizing
  const titleSize = Math.round(width * 0.065); // ~125px on 1920
  ...
};
```

### Creative Direction: How to THINK About Each Component

Before writing code, answer these questions:
1. **What emotion should this evoke?** (urgency? excitement? trust? FOMO?)
2. **What's the ONE thing the viewer must remember?** (the discount? the price? the deadline?)
3. **What visual metaphor can I use?** (explosion = urgency, countdown = scarcity, glow = premium)
4. **What would make this DIFFERENT from last time?** (never repeat the same trick twice)

For each new video, INVENT a new visual concept:
- This time: text shatters inward from edges
- Next time: liquid metal text forms from droplets
- Another time: text is revealed by a wipe of light
- Another: characters fall from above and bounce into place

### Sizing: Relative to Frame, Not Fixed Pixels
```tsx
const { width, height } = useVideoConfig();
const titleSize = width * 0.07;    // 7% of frame width
const badgeSize = width * 0.05;    // 5%
const subSize = width * 0.015;     // 1.5%
const padding = width * 0.03;      // 3%
```

This ensures the component looks correct at 720p, 1080p, or 4K.

---

## Key Rules

### Timing (Stagger)
- **8-15 frames between elements** (260-500ms at 30fps)
- Viewer's eye needs time to track each new element
- First element appears at frame 5 (not 0 — give 170ms of black to "set the stage")
- Hold steady state for at least 40% of the total duration

### Animation Types
| Use case | Animation | Code pattern |
|----------|-----------|-------------|
| Main headline | Slide up + fade | `translateY(${(1-t)*40}px)`, `opacity: t` |
| Discount number | Scale spring (impact!) | `scale(${0.3 + 0.7*t})` |
| Subtitle/date | Simple fade | `opacity: t` |
| Exit (all) | Unified opacity | `opacity: 1 - exitProgress` |
| Countdown digits | Vertical tick (per-second) | Frame modulo + translateY |
| Bottom bar entry | Slide up from below | `translateY(${(1-t)*100}%)` |

### Visual Hierarchy
- Discount number: **120-160px**, strong color background (red/orange)
- Main headline: **60-80px**, white, no background
- Subtitle/date: **20-28px**, gray (#ffffff88), no background
- Font size ratio: at least **3:1** between biggest and smallest

### Color Discipline
- **ONE accent color only** (red for urgency, brand color for awareness)
- Everything else: white + gray on black
- The accent color goes ONLY on the most important element (price/discount)
- Never use accent on more than one element simultaneously

### The Bottom Overlay Bar
- Height: 80-100px (not a thin strip)
- Entry: slides up from below the frame
- Contains: left-aligned info text + right-aligned countdown
- Countdown digits: each in its own box (60x50px, dark bg, monospace font)
- Digits **tick every second** using `Math.floor((remaining - frame/fps) % 60)`
- Colon separators **blink** (opacity oscillates with frame)

### The Closing Card
- Pure black background, lots of whitespace
- **Serif font** (Georgia) for the tagline — feels premium
- Text size: moderate (40-60px), NOT huge — the white space IS the design
- Subtle accent line (2px, centered, 60px wide)
- Content fades in slowly (over 15 frames) — unhurried, confident

---

## Complete Internal Timeline Template

```
3-second opening card (90 frames @ 30fps):
─────────────────────────────────────────
Frame 0-5:    Pure black. Silence. Anticipation.
Frame 5-18:   Title slides up (spring, damping 13)
Frame 14-28:  Badge scale-pops (spring, damping 10, overshoot!)
Frame 22-35:  Subtitle fades in (linear)
Frame 35-70:  Stable. Micro-breathe on badge (scale ±1%)
Frame 70-90:  Everything fades out together (linear 0→1 over 20 frames)

8-second bottom bar (240 frames @ 30fps):
─────────────────────────────────────────
Frame 0-12:   Bar slides up from below (spring)
Frame 8-20:   Left text fades in
Frame 12-24:  Right countdown digits appear one by one (stagger 3 frames each)
Frame 24-220: Countdown ticks live. Colon blinks. Bar has subtle scan-line.
Frame 220-240: Bar slides back down

5-second closing card (150 frames @ 30fps):
─────────────────────────────────────────
Frame 0-5:    Pure black
Frame 5-25:   Tagline fades in (slow, serif)
Frame 20-35:  Subtitle fades in
Frame 30-40:  Accent line grows from center
Frame 40-130: Stable
Frame 130-150: All fade out
```

---

## smart_compose Usage

After writing and registering your components, place them:

```json
{
  "video_analysis": {
    "duration_sec": 29.58,
    "anchors": [
      {"time": 0, "component": "HookCard", "duration": 3},
      {"time": 6, "component": "PriceBar", "end_time": 14},
      {"time": 24, "component": "ClosingCard", "duration": 5.58}
    ]
  },
  "brand": {"primary": "#7C3AED", "accent": "#DC2626", "bg": "#000", "text": "#fff"},
  "copy": {"hook": "text", "cta": "text"}
}
```

smart_compose only PLACES your components. It does NOT design them. You design them.

---

## Quality Checklist Before Export

- [ ] Opening card: Can you feel the "punch" when the badge appears?
- [ ] Stagger: Is there visible delay between element entries (>250ms)?
- [ ] Hierarchy: Is the biggest text 3x+ larger than the smallest?
- [ ] Color: Is accent used on ONE element only?
- [ ] Clean gaps: Is there at least 2s of pure video between MG segments?
- [ ] Bottom bar: Are countdown digits actually ticking?
- [ ] Closing card: Does it feel "premium" (serif, whitespace, unhurried)?
- [ ] Exit: Does the MG leave gracefully (not instant cut)?
