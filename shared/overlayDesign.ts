import { catalogueStyles } from "./catalogueStyles.ts";
export const overlayStyles = [
  { id: "bulletin", name: "Bulletin", color: "#ff263d" },
  { id: "minimal", name: "Minimal", color: "#ff263d" },
  { id: "world", name: "World desk", color: "#ffd20a" },
  { id: "neon", name: "Studio", color: "#7739ff" },
  { id: "scoreboard", name: "Scoreboard", color: "#f46b18" },
  { id: "editorial", name: "Editorial", color: "#101827" },
  { id: "signal", name: "Signal", color: "#1767ff" },
  { id: "dispatch", name: "Dispatch", color: "#00874d" },
  { id: "frame", name: "Frame", color: "#7739ff" },
  { id: "ribbon", name: "Ribbon", color: "#ff263d" },
  { id: "terminal", name: "Terminal", color: "#00874d" },
  { id: "capsule", name: "Capsule", color: "#f46b18" },
  { id: "dateline", name: "Dateline", color: "#1767ff" },
  { id: "split", name: "Split", color: "#ff263d" },
  { id: "press", name: "Press", color: "#101827" },
  { id: "pulse", name: "Pulse", color: "#7739ff" },
  ...catalogueStyles,
] as const;
export const overlayColors = [
  "#ff263d",
  "#1767ff",
  "#7739ff",
  "#ffd20a",
  "#00874d",
  "#101827",
  "#ffffff",
  "#f46b18",
  "#00dbea",
  "#d7ad54",
  "#b61937",
  "#76d649",
  "#b44bff",
] as const;
export interface OverlayDesign {
  style: (typeof overlayStyles)[number]["id"];
  color: (typeof overlayColors)[number];
  size: number;
  speed: number;
}
export const defaultOverlayDesign: OverlayDesign = {
  style: "bulletin",
  color: "#ff263d",
  size: 100,
  speed: 35,
};

export const overlayStyleIds = overlayStyles.map((style) => style.id);
