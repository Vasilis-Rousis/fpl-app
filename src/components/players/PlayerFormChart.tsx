"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface HistoryPoint {
  round: number;
  total_points: number;
  expected_goals: string;
  expected_assists: string;
  minutes: number;
}

export default function PlayerFormChart({
  history,
}: {
  history: HistoryPoint[];
}) {
  const data = history.map((h) => ({
    gw: `GW${h.round}`,
    points: h.total_points,
    xGI: (
      parseFloat(h.expected_goals || "0") +
      parseFloat(h.expected_assists || "0")
    ).toFixed(2),
    minutes: h.minutes,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
          <XAxis
            dataKey="gw"
            stroke="#8e8ea0"
            fontSize={12}
            tickLine={false}
          />
          <YAxis stroke="#8e8ea0" fontSize={12} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#16213e",
              border: "1px solid #2a2a4a",
              borderRadius: "8px",
              color: "#ededed",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="points"
            stroke="#00ff87"
            strokeWidth={2}
            dot={{ fill: "#00ff87", r: 4 }}
            name="Points"
          />
          <Line
            type="monotone"
            dataKey="xGI"
            stroke="#ff2882"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: "#ff2882", r: 3 }}
            name="xGI"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
