export type TeamColor = { fg: string; bg: string; dot: string };

// Muted, distinguishable hues so a team is recognisable at a glance without
// competing with status colors (which stay red/amber/green).
const PALETTE: TeamColor[] = [
  { fg: "#1D4ED8", bg: "#EFF6FF", dot: "#3B82F6" }, // blue
  { fg: "#7C3AED", bg: "#F5F3FF", dot: "#8B5CF6" }, // violet
  { fg: "#0F766E", bg: "#F0FDFA", dot: "#14B8A6" }, // teal
  { fg: "#BE185D", bg: "#FDF2F8", dot: "#EC4899" }, // pink
  { fg: "#B45309", bg: "#FFFBEB", dot: "#F59E0B" }, // amber
  { fg: "#0369A1", bg: "#F0F9FF", dot: "#0EA5E9" }, // sky
  { fg: "#C2410C", bg: "#FFF7ED", dot: "#F97316" }, // orange
  { fg: "#065F46", bg: "#ECFDF5", dot: "#10B981" }, // emerald
  { fg: "#9F1239", bg: "#FFF1F2", dot: "#F43F5E" }, // rose
  { fg: "#4338CA", bg: "#EEF2FF", dot: "#6366F1" }, // indigo
  { fg: "#A16207", bg: "#FEFCE8", dot: "#EAB308" }, // yellow
  { fg: "#6D28D9", bg: "#FAF5FF", dot: "#A855F7" }, // purple
];

export const NO_TEAM_COLOR: TeamColor = {
  fg: "#57534E",
  bg: "#F5F5F4",
  dot: "#A8A29E",
};

export type TeamPalette = Record<string, TeamColor>;

function key(team: string) {
  return team.trim().toLowerCase();
}

/**
 * Assigns each distinct team a palette color in alphabetical order, so colors
 * are stable across pages and never collide while there are ≤ 12 teams.
 */
export function buildTeamPalette(
  teams: Iterable<string | null | undefined>,
): TeamPalette {
  const names = [...new Set([...teams].filter(Boolean).map((t) => key(t!)))];
  names.sort();
  return Object.fromEntries(
    names.map((name, i) => [name, PALETTE[i % PALETTE.length]]),
  );
}

export function teamColor(
  team: string | null | undefined,
  palette: TeamPalette,
): TeamColor {
  if (!team) return NO_TEAM_COLOR;
  return palette[key(team)] ?? NO_TEAM_COLOR;
}
