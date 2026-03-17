export const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

export const FPL_MANAGER_ID = process.env.FPL_MANAGER_ID!;
export const H2H_LEAGUE_ID = process.env.H2H_LEAGUE_ID!;

export const POSITION_MAP: Record<number, string> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

export const POSITION_FULL: Record<number, string> = {
  1: "Goalkeeper",
  2: "Defender",
  3: "Midfielder",
  4: "Forward",
};

export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  a: { label: "Available", color: "text-green-400" },
  d: { label: "Doubtful", color: "text-yellow-400" },
  i: { label: "Injured", color: "text-red-400" },
  s: { label: "Suspended", color: "text-red-400" },
  n: { label: "Not Available", color: "text-gray-400" },
  u: { label: "Unavailable", color: "text-gray-400" },
};

export const FDR_COLORS: Record<number, string> = {
  1: "bg-fdr-1 text-white",
  2: "bg-fdr-2 text-fpl-dark",
  3: "bg-fdr-3 text-fpl-dark",
  4: "bg-fdr-4 text-white",
  5: "bg-fdr-5 text-white",
};
