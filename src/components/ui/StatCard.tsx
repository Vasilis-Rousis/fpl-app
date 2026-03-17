"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="rounded-xl border border-fpl-border bg-fpl-card p-5 transition-colors hover:bg-fpl-card-hover"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-fpl-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          {trend && (
            <p
              className={`mt-1 text-xs font-medium ${
                trendUp ? "text-fpl-green" : "text-fpl-pink"
              }`}
            >
              {trend}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-fpl-green/10 p-3">
          <Icon className="h-6 w-6 text-fpl-green" />
        </div>
      </div>
    </motion.div>
  );
}
