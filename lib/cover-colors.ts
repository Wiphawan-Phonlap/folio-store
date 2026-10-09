export const COVER_COLORS = [
  "#1b3b2b",
  "#542b1a",
  "#233748",
  "#4a1e2b",
  "#3a2f5b",
  "#5b4a1e",
  "#1e4a4a",
  "#4a3a2b",
  "#2b2b4a",
  "#3b1b1b",
  "#2f4a1e",
  "#4a2b3f",
];

export function coverColor(id: number): string {
  return COVER_COLORS[id % COVER_COLORS.length];
}
