"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import PlayerSearch from "./PlayerSearch";
import DataTable, { type Column } from "@/components/ui/DataTable";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { formatPrice, getPosition } from "@/lib/utils/formatting";

interface PlayerRow {
  id: number;
  web_name: string;
  team: number;
  team_short_name: string;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  minutes: number;
  selected_by_percent: string;
  composite_score: number | null;
  status: string;
  has_blank?: boolean;
}

interface PlayerTableProps {
  players: PlayerRow[];
  teams: { id: number; short_name: string }[];
}

export default function PlayerTable({ players, teams }: PlayerTableProps) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [team, setTeam] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (search && !p.web_name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (position && p.element_type !== parseInt(position)) return false;
      if (team && p.team !== parseInt(team)) return false;
      if (maxPrice && p.now_cost > parseFloat(maxPrice) * 10) return false;
      return true;
    });
  }, [players, search, position, team, maxPrice]);

  const columns: Column<PlayerRow>[] = [
    {
      key: "name",
      label: "Player",
      sortable: true,
      render: (p) => (
        <Link
          href={`/players/${p.id}`}
          className="font-medium text-white hover:text-fpl-green transition-colors"
        >
          {p.web_name}
          <span className="ml-2 text-xs text-fpl-muted">
            {p.team_short_name}
          </span>
          {p.has_blank && (
            <span className="ml-1.5 rounded bg-yellow-400/20 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">
              BLANK
            </span>
          )}
        </Link>
      ),
      getValue: (p) => p.web_name,
    },
    {
      key: "position",
      label: "Pos",
      sortable: true,
      className: "w-16",
      render: (p) => (
        <span className="text-fpl-muted">{getPosition(p.element_type)}</span>
      ),
      getValue: (p) => p.element_type,
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      className: "w-20",
      render: (p) => <span>{formatPrice(p.now_cost)}</span>,
      getValue: (p) => p.now_cost,
    },
    {
      key: "form",
      label: "Form",
      sortable: true,
      className: "w-16",
      render: (p) => <span className="text-fpl-green">{p.form}</span>,
      getValue: (p) => parseFloat(p.form),
    },
    {
      key: "total_points",
      label: "Pts",
      sortable: true,
      className: "w-16",
      render: (p) => <span className="font-medium">{p.total_points}</span>,
      getValue: (p) => p.total_points,
    },
    {
      key: "goals",
      label: "G",
      sortable: true,
      className: "w-12 hidden md:table-cell",
      render: (p) => <span>{p.goals_scored}</span>,
      getValue: (p) => p.goals_scored,
    },
    {
      key: "assists",
      label: "A",
      sortable: true,
      className: "w-12 hidden md:table-cell",
      render: (p) => <span>{p.assists}</span>,
      getValue: (p) => p.assists,
    },
    {
      key: "cs",
      label: "CS",
      sortable: true,
      className: "w-12 hidden lg:table-cell",
      render: (p) => <span>{p.clean_sheets}</span>,
      getValue: (p) => p.clean_sheets,
    },
    {
      key: "selected",
      label: "Sel%",
      sortable: true,
      className: "w-16 hidden lg:table-cell",
      render: (p) => (
        <span className="text-fpl-muted">{p.selected_by_percent}%</span>
      ),
      getValue: (p) => parseFloat(p.selected_by_percent),
    },
    {
      key: "score",
      label: "Score",
      sortable: true,
      className: "w-20",
      render: (p) =>
        p.composite_score !== null ? (
          <ScoreBadge score={p.composite_score} size="sm" />
        ) : (
          <span className="text-fpl-muted">--</span>
        ),
      getValue: (p) => p.composite_score ?? 0,
    },
  ];

  return (
    <div className="space-y-4">
      <PlayerSearch
        search={search}
        onSearchChange={setSearch}
        position={position}
        onPositionChange={setPosition}
        team={team}
        onTeamChange={setTeam}
        teams={teams}
        maxPrice={maxPrice}
        onMaxPriceChange={setMaxPrice}
      />

      <p className="text-sm text-fpl-muted">
        {filtered.length} players found
      </p>

      <DataTable
        data={filtered}
        columns={columns}
        keyExtractor={(p) => p.id}
        defaultSortKey="score"
        defaultSortDir="desc"
        pageSize={25}
      />
    </div>
  );
}
