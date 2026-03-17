"use client";

import { Search, Filter } from "lucide-react";

interface PlayerSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  position: string;
  onPositionChange: (value: string) => void;
  team: string;
  onTeamChange: (value: string) => void;
  teams: { id: number; short_name: string }[];
  maxPrice: string;
  onMaxPriceChange: (value: string) => void;
}

export default function PlayerSearch({
  search,
  onSearchChange,
  position,
  onPositionChange,
  team,
  onTeamChange,
  teams,
  maxPrice,
  onMaxPriceChange,
}: PlayerSearchProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fpl-muted" />
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-fpl-border bg-fpl-card py-2.5 pl-10 pr-4 text-sm text-white placeholder-fpl-muted outline-none transition-colors focus:border-fpl-green/50"
        />
      </div>

      {/* Position filter */}
      <div className="relative">
        <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fpl-muted" />
        <select
          value={position}
          onChange={(e) => onPositionChange(e.target.value)}
          className="rounded-lg border border-fpl-border bg-fpl-card py-2.5 pl-10 pr-8 text-sm text-white outline-none transition-colors focus:border-fpl-green/50 appearance-none"
        >
          <option value="">All Positions</option>
          <option value="1">GKP</option>
          <option value="2">DEF</option>
          <option value="3">MID</option>
          <option value="4">FWD</option>
        </select>
      </div>

      {/* Team filter */}
      <select
        value={team}
        onChange={(e) => onTeamChange(e.target.value)}
        className="rounded-lg border border-fpl-border bg-fpl-card px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-fpl-green/50 appearance-none"
      >
        <option value="">All Teams</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.short_name}
          </option>
        ))}
      </select>

      {/* Max price */}
      <input
        type="number"
        placeholder="Max price"
        value={maxPrice}
        onChange={(e) => onMaxPriceChange(e.target.value)}
        step="0.5"
        min="3.5"
        max="15"
        className="w-28 rounded-lg border border-fpl-border bg-fpl-card px-4 py-2.5 text-sm text-white placeholder-fpl-muted outline-none transition-colors focus:border-fpl-green/50"
      />
    </div>
  );
}
