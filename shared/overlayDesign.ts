export const overlayStyles = [
  { id: "bulletin", name: "Bulletin", color: "#ff263d" },
  { id: "minimal", name: "Minimal", color: "#ff263d" },
  { id: "world", name: "World desk", color: "#ffd20a" },
  { id: "neon", name: "Studio", color: "#7739ff" },
  { id: "scoreboard", name: "Scoreboard", color: "#f46b18" },
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
