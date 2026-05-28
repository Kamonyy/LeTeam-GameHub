import type { CSSProperties } from "react";
import { getRoleAccent } from "@shared/games/mafia/roles.js";

export type NightStepTrackState = "done" | "active" | "upcoming";

export function nightStepAccent(roleId: string | null | undefined): string {
  return getRoleAccent(roleId ?? undefined);
}

/** Short label for the step strip (e.g. "Healer" from "Healer action"). */
export function nightStepShortTitle(titleEn: string): string {
  return titleEn.replace(/\s+action$/i, "").trim();
}

export function nightStepDotStyle(
  roleId: string | null | undefined,
  state: NightStepTrackState,
): CSSProperties {
  const accent = nightStepAccent(roleId);

  if (state === "active") {
    return {
      borderColor: `color-mix(in srgb, ${accent} 55%, #fff8e8)`,
      background: `linear-gradient(165deg, color-mix(in srgb, ${accent} 42%, #fffef5) 0%, color-mix(in srgb, ${accent} 75%, #2a2218) 100%)`,
      color: "#0a0806",
      boxShadow: `0 0 22px color-mix(in srgb, ${accent} 72%, transparent), 0 0 6px color-mix(in srgb, ${accent} 45%, #fff8e0), inset 0 1px 0 rgba(255, 252, 240, 0.65)`,
    };
  }

  if (state === "done") {
    return {
      borderColor: `color-mix(in srgb, ${accent} 65%, #f5e6c8)`,
      background: `linear-gradient(165deg, color-mix(in srgb, ${accent} 68%, #f0d890) 0%, color-mix(in srgb, ${accent} 85%, #4a3020) 100%)`,
      color: "#fffaf0",
      boxShadow: `0 0 14px color-mix(in srgb, ${accent} 55%, transparent), inset 0 1px 0 rgba(255, 245, 220, 0.4)`,
    };
  }

  return {
    borderColor: `color-mix(in srgb, ${accent} 58%, #c8b8a0)`,
    background: `linear-gradient(165deg, color-mix(in srgb, ${accent} 48%, #3a3430) 0%, color-mix(in srgb, ${accent} 32%, #1a1814) 100%)`,
    color: `color-mix(in srgb, ${accent} 55%, #faf6ec)`,
    boxShadow: `0 0 12px color-mix(in srgb, ${accent} 35%, transparent), inset 0 1px 0 rgba(255, 240, 210, 0.12)`,
  };
}

export function nightStepLabelStyle(
  roleId: string | null | undefined,
  state: NightStepTrackState,
): CSSProperties {
  const accent = nightStepAccent(roleId);

  if (state === "active") {
    return {
      color: `color-mix(in srgb, ${accent} 35%, #fff8e8)`,
      textShadow: `0 0 18px color-mix(in srgb, ${accent} 75%, transparent), 0 0 4px color-mix(in srgb, ${accent} 50%, #fffef0)`,
    };
  }

  if (state === "done") {
    return {
      color: `color-mix(in srgb, ${accent} 50%, #f5ecd8)`,
      textShadow: `0 0 10px color-mix(in srgb, ${accent} 40%, transparent)`,
    };
  }

  return {
    color: `color-mix(in srgb, ${accent} 45%, #fff8ec)`,
    textShadow: `0 0 10px color-mix(in srgb, ${accent} 50%, transparent)`,
  };
}

export function nightStepProgressBarStyle(
  roleId: string | null | undefined,
): CSSProperties {
  const accent = nightStepAccent(roleId);
  return {
    background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 55%, #fcd34d), ${accent}, color-mix(in srgb, ${accent} 25%, #fffbeb))`,
    boxShadow: `0 0 18px color-mix(in srgb, ${accent} 75%, transparent), 0 0 6px color-mix(in srgb, ${accent} 50%, #fef9c3)`,
  };
}
