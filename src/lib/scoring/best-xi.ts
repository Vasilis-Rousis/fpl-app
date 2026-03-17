import "server-only";
import type { PlayerScore } from "./algorithm";

interface PlayerWithDetails extends PlayerScore {
  webName: string;
  team: number;
  nowCost: number;
}

interface BestXIResult {
  formation: string;
  starting: PlayerWithDetails[];
  bench: PlayerWithDetails[];
  captain: PlayerWithDetails;
  viceCaptain: PlayerWithDetails;
  totalScore: number;
}

// Valid formations: [DEF, MID, FWD]
const FORMATIONS: [number, number, number][] = [
  [3, 4, 3],
  [3, 5, 2],
  [4, 3, 3],
  [4, 4, 2],
  [4, 5, 1],
  [5, 3, 2],
  [5, 4, 1],
];

/**
 * Select the best XI from all scored players.
 * Respects formation constraints and max 3 per team.
 */
export function selectBestXI(
  players: PlayerWithDetails[],
  budget?: number
): BestXIResult | null {
  let bestResult: BestXIResult | null = null;

  for (const [defCount, midCount, fwdCount] of FORMATIONS) {
    const result = selectForFormation(
      players,
      defCount,
      midCount,
      fwdCount,
      budget
    );
    if (result && (!bestResult || result.totalScore > bestResult.totalScore)) {
      bestResult = result;
    }
  }

  return bestResult;
}

function selectForFormation(
  allPlayers: PlayerWithDetails[],
  defCount: number,
  midCount: number,
  fwdCount: number,
  budget?: number
): BestXIResult | null {
  // Sort each position by composite score
  const gkps = allPlayers
    .filter((p) => p.elementType === 1)
    .sort((a, b) => b.compositeScore - a.compositeScore);
  const defs = allPlayers
    .filter((p) => p.elementType === 2)
    .sort((a, b) => b.compositeScore - a.compositeScore);
  const mids = allPlayers
    .filter((p) => p.elementType === 3)
    .sort((a, b) => b.compositeScore - a.compositeScore);
  const fwds = allPlayers
    .filter((p) => p.elementType === 4)
    .sort((a, b) => b.compositeScore - a.compositeScore);

  // Greedy selection with team constraint
  const teamCount = new Map<number, number>();
  const selected: PlayerWithDetails[] = [];
  let totalCost = 0;

  function canSelect(player: PlayerWithDetails): boolean {
    const currentTeamCount = teamCount.get(player.team) ?? 0;
    if (currentTeamCount >= 3) return false;
    if (budget && totalCost + player.nowCost > budget) return false;
    return true;
  }

  function selectPlayer(player: PlayerWithDetails) {
    selected.push(player);
    teamCount.set(player.team, (teamCount.get(player.team) ?? 0) + 1);
    totalCost += player.nowCost;
  }

  // Select starting GK (1)
  const startingGK = gkps.find((p) => canSelect(p));
  if (!startingGK) return null;
  selectPlayer(startingGK);

  // Select DEFs
  let defSelected = 0;
  for (const p of defs) {
    if (defSelected >= defCount) break;
    if (canSelect(p)) {
      selectPlayer(p);
      defSelected++;
    }
  }
  if (defSelected < defCount) return null;

  // Select MIDs
  let midSelected = 0;
  for (const p of mids) {
    if (midSelected >= midCount) break;
    if (canSelect(p)) {
      selectPlayer(p);
      midSelected++;
    }
  }
  if (midSelected < midCount) return null;

  // Select FWDs
  let fwdSelected = 0;
  for (const p of fwds) {
    if (fwdSelected >= fwdCount) break;
    if (canSelect(p)) {
      selectPlayer(p);
      fwdSelected++;
    }
  }
  if (fwdSelected < fwdCount) return null;

  // Select bench (1 GK + best remaining from each position to fill 4 bench spots)
  const bench: PlayerWithDetails[] = [];

  // Bench GK
  const benchGK = gkps.find(
    (p) => !selected.includes(p) && canSelect(p)
  );
  if (benchGK) {
    selectPlayer(benchGK);
    bench.push(benchGK);
  }

  // Fill remaining 3 bench spots with best available
  const remaining = [...defs, ...mids, ...fwds]
    .filter((p) => !selected.includes(p) && !bench.includes(p))
    .sort((a, b) => b.compositeScore - a.compositeScore);

  // Need at least: 5 total DEF, 5 total MID, 3 total FWD in full squad
  const defInSquad = selected.filter((p) => p.elementType === 2).length;
  const midInSquad = selected.filter((p) => p.elementType === 3).length;
  const fwdInSquad = selected.filter((p) => p.elementType === 4).length;

  const neededDef = Math.max(0, 5 - defInSquad);
  const neededMid = Math.max(0, 5 - midInSquad);
  const neededFwd = Math.max(0, 3 - fwdInSquad);

  // Fill required positions first
  for (const p of remaining) {
    if (bench.length >= 4) break;
    if (
      (p.elementType === 2 && neededDef > bench.filter((b) => b.elementType === 2).length) ||
      (p.elementType === 3 && neededMid > bench.filter((b) => b.elementType === 3).length) ||
      (p.elementType === 4 && neededFwd > bench.filter((b) => b.elementType === 4).length)
    ) {
      if (canSelect(p)) {
        selectPlayer(p);
        bench.push(p);
      }
    }
  }

  // Fill any remaining bench spots
  for (const p of remaining) {
    if (bench.length >= 4) break;
    if (!bench.includes(p) && canSelect(p)) {
      selectPlayer(p);
      bench.push(p);
    }
  }

  const starting = selected.filter((p) => !bench.includes(p));
  const totalScore = starting.reduce((sum, p) => sum + p.compositeScore, 0);

  // Captain: highest captain score
  const sortedByCaptain = [...starting].sort(
    (a, b) => b.captainScore - a.captainScore
  );

  return {
    formation: `${defCount}-${midCount}-${fwdCount}`,
    starting,
    bench,
    captain: sortedByCaptain[0],
    viceCaptain: sortedByCaptain[1],
    totalScore,
  };
}
