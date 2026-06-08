import React from "react";
import { spring, useVideoConfig } from "remotion";
import type { PackComponentProps } from "../types";

export const ClosingCard: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const { fps } = useVideoConfig();

  // Slow, elegant entries
  const tagIn = spring({ frame: frame - 8, fps, config: { damping: 20, stiffness: 60, mass: 1.2 } });
  const subIn = spring({ frame: frame - 22, fps, config: { damping: 20, stiffness: 60, mass: 1.2 } });
  const lineIn = spring({ frame: frame - 35, fps, config: { damping: 18, stiffness: 80 } });

  // Exit
  const exitStart = durationFrames - 25;
  const exitProgress = Math.max(0, Math.min(1, (frame - exitStart) / 25));
  const globalOpacity = 1 - exitProgress;

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#000", opacity: globalOpacity, zIndex: 100 }}>
      {/* Tagline: serif, premium */}
      <div style={{
        position: "absolute", top: "40%", left: "50%",
        transform: `translate(-50%, -50%) translateY(${(1-tagIn)*20}px)`,
        opacity: tagIn,
        fontSize: 56, fontWeight: 400,
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: "#fff", textAlign: "center", lineHeight: 1.3,
        letterSpacing: 0.5,
      }}>
        One image. Infinite backdrops.
      </div>

      {/* Sub-copy */}
      <div style={{
        position: "absolute", top: "54%", left: "50%",
        transform: "translateX(-50%)",
        opacity: subIn * 0.7,
        fontSize: 22, fontWeight: 500,
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#ffffff77", textAlign: "center",
        letterSpacing: 1,
      }}>
        Pay less. Create more. · 57% OFF · Ends June 12
      </div>

      {/* Accent line: grows from center */}
      <div style={{
        position: "absolute", top: "62%", left: "50%",
        transform: "translateX(-50%)",
        width: 80 * lineIn, height: 2,
        background: "linear-gradient(90deg, transparent, #DC2626, transparent)",
        opacity: lineIn * 0.7,
        boxShadow: "0 0 12px rgba(220,38,38,0.4)",
      }} />
    </div>
  );
};