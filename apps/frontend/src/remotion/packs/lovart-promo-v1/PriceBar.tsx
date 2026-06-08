import React from "react";
import { spring, useVideoConfig } from "remotion";
import type { PackComponentProps } from "../types";

export const PriceBar: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const { fps } = useVideoConfig();

  // Bar slides up from below
  const barIn = spring({ frame: frame - 0, fps, config: { damping: 14, stiffness: 100 } });
  // Text fades in after bar
  const textIn = spring({ frame: frame - 8, fps, config: { damping: 16, stiffness: 80 } });
  // Countdown digits stagger
  const d1In = spring({ frame: frame - 12, fps, config: { damping: 12, stiffness: 150 } });
  const d2In = spring({ frame: frame - 15, fps, config: { damping: 12, stiffness: 150 } });
  const d3In = spring({ frame: frame - 18, fps, config: { damping: 12, stiffness: 150 } });
  const d4In = spring({ frame: frame - 21, fps, config: { damping: 12, stiffness: 150 } });

  // Exit: slide down
  const exitStart = durationFrames - 15;
  const exitProgress = Math.max(0, Math.min(1, (frame - exitStart) / 15));

  // Dynamic countdown (ticks every second)
  const totalSec = 5 * 86400 + 12 * 3600;
  const elapsed = frame / fps;
  const remaining = Math.max(0, totalSec - elapsed);
  const dd = String(Math.floor(remaining / 86400)).padStart(2, "0");
  const hh = String(Math.floor((remaining % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const ss = String(Math.floor(remaining % 60)).padStart(2, "0");

  // Colon blink
  const colonOpacity = 0.4 + Math.abs(Math.sin(frame * 0.1)) * 0.6;

  const slideY = (1 - barIn) * 100 + exitProgress * 100;

  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, height: 90,
      transform: `translateY(${slideY}%)`,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid rgba(255,255,255,0.1)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px",
      fontFamily: "Inter, system-ui, sans-serif",
      zIndex: 50,
    }}>
      {/* Left: pricing info */}
      <div style={{ opacity: textIn, transform: `translateX(${(1-textIn)*20}px)` }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Pro </span>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#DC2626" }}>$39</span>
        <span style={{ fontSize: 16, fontWeight: 500, color: "#ffffff66", textDecoration: "line-through", marginLeft: 8 }}>$90</span>
        <span style={{ fontSize: 22, fontWeight: 400, color: "#ffffff44", margin: "0 16px" }}>|</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Ultimate </span>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#DC2626" }}>$99</span>
        <span style={{ fontSize: 16, fontWeight: 500, color: "#ffffff66", textDecoration: "line-through", marginLeft: 8 }}>$199</span>
      </div>

      {/* Right: countdown */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {[{v: dd, l: "D", o: d1In}, {v: hh, l: "H", o: d2In}, {v: mm, l: "M", o: d3In}, {v: ss, l: "S", o: d4In}].map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: "#ffffff44", fontSize: 20, fontWeight: 700, opacity: colonOpacity, margin: "0 2px" }}>:</span>}
            <div style={{
              opacity: item.o, transform: `scale(${0.5 + 0.5 * item.o})`,
              minWidth: 48, height: 40, borderRadius: 6,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 900, color: "#fff",
            }}>
              {item.v}{item.l}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};