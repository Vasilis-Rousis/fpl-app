interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export default function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const color = getScoreColor(score);
  const sizeClasses = {
    sm: "h-6 w-10 text-xs",
    md: "h-8 w-12 text-sm",
    lg: "h-10 w-14 text-base",
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md font-bold ${color} ${sizeClasses[size]}`}
    >
      {score.toFixed(1)}
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-fpl-green/20 text-fpl-green";
  if (score >= 60) return "bg-green-500/20 text-green-400";
  if (score >= 40) return "bg-yellow-500/20 text-yellow-400";
  if (score >= 20) return "bg-orange-500/20 text-orange-400";
  return "bg-red-500/20 text-red-400";
}

export function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const colors: Record<number, string> = {
    1: "bg-fdr-1 text-white",
    2: "bg-fdr-2 text-fpl-dark",
    3: "bg-fdr-3 text-fpl-dark",
    4: "bg-fdr-4 text-white",
    5: "bg-fdr-5 text-white",
  };

  return (
    <div
      className={`inline-flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${
        colors[difficulty] ?? "bg-gray-500 text-white"
      }`}
    >
      {difficulty}
    </div>
  );
}
