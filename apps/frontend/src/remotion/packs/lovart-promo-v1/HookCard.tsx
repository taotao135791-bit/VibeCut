import React from "react";
import { spring, useVideoConfig } from "remotion";
import type { PackComponentProps } from "../types";

export const HookCard: React.FC<PackComponentProps> = ({ clip, frame, durationFrames }) => {
  const { fps } = useVideoConfig();

  // Element stagger entries (spring physics)
  const titleIn = spring({ frame: frame - 5, fps, config: { damping: 13, stiffness: 160, mass: 0.8 } });
  const badgeIn = spring({ frame: frame - 14, fps, config: { damping: 10, stiffness: 200, mass: 0.6 } });
  const subIn = spring({ frame: frame - 22, fps, config: { damping: 14, stiffness: 120, mass: 1 } });

  // Global exit (last 20 frames)
  const exitStart = durationFrames - 20;
  const exitProgress = Math.max(0, Math.min(1, (frame - exitStart) / 20));
  const globalOpacity = 1 - exitProgress;

  // Badge micro-breathe during stable phase
  const breathe = frame > 30 && frame < exitStart ? 1 + Math.sin(frame * 0.08) * 0.01 : 1;

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#000", opacity: globalOpacity, zIndex: 100 }}>
      {/* Title: slides up */}
      <div style={{
        position: "absolute", top: "28%", left: "50%",
        transform: `translate(-50%, 0) translateY(${(1 - titleIn) * 50}px)`,
        opacity: Math.min(1, titleIn * 1.5),
        fontSize: 72, fontWeight: 900, color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
        letterSpacing: -1, textAlign: "center",
        textShadow: "0 4px 30px rgba(255,255,255,0.1)",
      }}>
        LOWEST PRICE OF THE YEAR
      </div>

      {/* Badge: scale-pops with overshoot */}
      <div style={{
        position: "absolute", top: "48%", left: "50%",
        transform: `translate(-50%, -50%) scale(${0.2 + 0.8 * badgeIn * breathe})`,
        opacity: badgeIn,
      }}>
        <div style={{
          padding: "20px 56px", borderRadius: 18,
          background: "linear-gradient(135deg, #DC2626, #B91C1C)",
          boxShadow: "0 24px 80px rgba(220,38,38,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset",
        }}>
          <span style={{ fontSize: 96, fontWeight: 950, color: "#000", fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1 }}>
            57% Off
          </span>
        </div>
      </div>

      {/* Subtitle: gentle fade */}
      <div style={{
        position: "absolute", top: "68%", left: "50%",
        transform: "translateX(-50%)",
        opacity: subIn * 0.8,
        fontSize: 28, fontWeight: 500, color: "#ffffff99",
        fontFamily: "Inter, system-ui, sans-serif",
        letterSpacing: 2,
      }}>
        JUNE 4 — JUNE 12 ONLY
      </div>
    </div>
  );
};