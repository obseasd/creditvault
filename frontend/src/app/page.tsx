"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Navbar } from "@/components/Navbar";
import { StatSkeleton, ChartSkeleton, CardSkeleton } from "@/components/Skeleton";
import { useVaultData, useUserVault } from "@/hooks/useVault";

// ─── helpers ──────────────────────────────────────────────────────
function fmt(val: bigint | undefined, decimals = 4): string {
  if (val === undefined) return "—";
  return Number(formatEther(val)).toFixed(decimals);
}

function fmtNum(n: number, decimals = 4): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

// ─── Stat card ────────────────────────────────────────────────────
function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p
        className={`mt-1 sm:mt-2 text-lg sm:text-2xl font-bold ${accent ? "text-green-400" : "text-white"}`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[10px] sm:text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

// ─── PnL Chart ────────────────────────────────────────────────────
function PnLChart({
  sharePrice,
  apy,
  userShares,
}: {
  sharePrice: number;
  apy: number;
  userShares: number;
}) {
  const data = useMemo(() => {
    const dailyRate = apy / 100 / 365;
    const points: { day: string; value: number; projected: number }[] = [];

    for (let d = -15; d <= 0; d++) {
      const factor = Math.pow(1 + dailyRate, d);
      const price = sharePrice * factor;
      const val = userShares > 0 ? userShares * price : price;
      points.push({
        day: d === 0 ? "Today" : `${d}d`,
        value: Number(val.toFixed(6)),
        projected: 0,
      });
    }

    for (let d = 1; d <= 15; d++) {
      const factor = Math.pow(1 + dailyRate, d);
      const price = sharePrice * factor;
      const val = userShares > 0 ? userShares * price : price;
      points.push({
        day: `+${d}d`,
        value: 0,
        projected: Number(val.toFixed(6)),
      });
    }

    const todayIdx = points.findIndex((p) => p.day === "Today");
    if (todayIdx >= 0) {
      points[todayIdx].projected = points[todayIdx].value;
    }

    return points;
  }, [sharePrice, apy, userShares]);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-gray-500">
            {userShares > 0
              ? "Portfolio Value Projection"
              : "Share Price Trajectory"}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-gray-400">
            Based on current {apy.toFixed(2)}% APY
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] sm:text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Historical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500/40" />
            Projected
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="day"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "#374151" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toFixed(4)}
            domain={["dataMin", "dataMax"]}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "0.75rem",
              fontSize: "0.75rem",
            }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(value: number | undefined) => {
              if (value == null) return ["—", "Value"];
              return [`${value.toFixed(6)} CTC`, "Value"];
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
            connectNulls={false}
          />
          <Area
            type="monotone"
            dataKey="projected"
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="6 3"
            fillOpacity={1}
            fill="url(#colorProjected)"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Strategy mini cards ──────────────────────────────────────────
function StrategyCards({
  allocations,
  totalAssets,
  pendingRewards,
}: {
  allocations: [bigint, bigint, bigint] | undefined;
  totalAssets: bigint | undefined;
  pendingRewards: [bigint, bigint, bigint] | undefined;
}) {
  const strategies = [
    { name: "Staking", color: "border-blue-500/50 bg-blue-500/5", dot: "bg-blue-500", weight: "40%" },
    { name: "Lending", color: "border-purple-500/50 bg-purple-500/5", dot: "bg-purple-500", weight: "35%" },
    { name: "LP", color: "border-amber-500/50 bg-amber-500/5", dot: "bg-amber-500", weight: "25%" },
  ];

  const total = totalAssets ? Number(formatEther(totalAssets)) : 0;

  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
      {strategies.map((s, i) => {
        const alloc = allocations && totalAssets ? Number(formatEther(allocations[i])) : 0;
        const pct = total > 0 ? ((alloc / total) * 100).toFixed(1) : "0.0";
        const reward = pendingRewards ? Number(formatEther(pendingRewards[i])) : 0;

        return (
          <div key={s.name} className={`rounded-xl border ${s.color} p-4 sm:p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot}`} />
              <span className="text-sm font-semibold text-white">{s.name}</span>
              <span className="ml-auto text-[10px] sm:text-xs text-gray-500">
                Target {s.weight}
              </span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">
              {fmtNum(alloc)} CTC
            </p>
            <div className="mt-2 flex items-center justify-between text-[10px] sm:text-xs text-gray-500">
              <span>{pct}% of TVL</span>
              <span className="text-green-400">+{reward.toFixed(6)} pending</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────
export default function Dashboard() {
  const { isConnected } = useAccount();
  const vault = useVaultData();
  const user = useUserVault();

  const sharePriceNum = vault.sharePrice ? Number(vault.sharePrice) / 1e18 : 1;
  const userSharesNum = user.userShares ? Number(formatEther(user.userShares)) : 0;
  const userAssetsNum = user.userAssets ? Number(formatEther(user.userAssets)) : 0;
  const pnl =
    user.userShares && user.userAssets && user.userShares > 0n
      ? userAssetsNum - userSharesNum
      : 0;
  const pnlPct = userSharesNum > 0 ? (pnl / userSharesNum) * 100 : 0;

  const totalPending = vault.pendingRewards
    ? Number(
        formatEther(
          vault.pendingRewards[0] + vault.pendingRewards[1] + vault.pendingRewards[2]
        )
      )
    : 0;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h2>
            <p className="mt-1 text-sm text-gray-400">
              CreditVault protocol overview
              {isConnected && " & your portfolio"}
            </p>
          </div>
          <Link
            href="/vault"
            className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-green-500 transition-colors text-center"
          >
            Deposit / Withdraw
          </Link>
        </div>

        {/* Protocol stats */}
        <div className="mb-6 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {vault.isLoading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <Stat
                label="Total Value Locked"
                value={
                  vault.totalAssets !== undefined
                    ? `${fmtNum(Number(formatEther(vault.totalAssets)))} CTC`
                    : "—"
                }
              />
              <Stat
                label="Blended APY"
                value={`${vault.estimatedAPY.toFixed(2)}%`}
                sub="Across 3 strategies"
                accent
              />
              <Stat
                label="Share Price"
                value={`${sharePriceNum.toFixed(6)} CTC`}
                sub="1 cvCTC ="
              />
              <Stat
                label="Pending Rewards"
                value={`${totalPending.toFixed(6)} CTC`}
                sub={
                  vault.totalHarvested
                    ? `${fmt(vault.totalHarvested, 6)} total harvested`
                    : undefined
                }
                accent
              />
            </>
          )}
        </div>

        {/* User portfolio */}
        {isConnected && user.userShares && user.userShares > 0n && (
          <div className="mb-6 rounded-2xl border border-green-800/30 bg-green-900/10 p-4 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-green-400 mb-4">
              Your Portfolio
            </p>
            <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500">Deposited (shares)</p>
                <p className="text-lg sm:text-xl font-bold text-white">
                  {fmtNum(userSharesNum)} cvCTC
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500">Current Value</p>
                <p className="text-lg sm:text-xl font-bold text-white">
                  {fmtNum(userAssetsNum)} CTC
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500">Profit / Loss</p>
                <p
                  className={`text-lg sm:text-xl font-bold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {pnl >= 0 ? "+" : ""}
                  {pnl.toFixed(6)} CTC
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500">Return</p>
                <p
                  className={`text-lg sm:text-xl font-bold ${pnlPct >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {pnlPct >= 0 ? "+" : ""}
                  {pnlPct.toFixed(4)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PnL chart */}
        <div className="mb-6">
          {vault.isLoading ? (
            <ChartSkeleton />
          ) : (
            <PnLChart
              sharePrice={sharePriceNum}
              apy={vault.estimatedAPY}
              userShares={userSharesNum}
            />
          )}
        </div>

        {/* Strategy allocation cards */}
        <div className="mb-6">
          <h3 className="text-base sm:text-lg font-bold text-white mb-4">
            Strategy Allocation
          </h3>
          {vault.isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <StrategyCards
              allocations={vault.allocations}
              totalAssets={vault.totalAssets}
              pendingRewards={vault.pendingRewards}
            />
          )}
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-white mb-4">How It Works</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Deposit CTC",
                desc: "Send native CTC to the vault and receive cvCTC shares.",
              },
              {
                step: "2",
                title: "Auto-Deploy",
                desc: "Capital is split across Staking, Lending & LP strategies.",
              },
              {
                step: "3",
                title: "Earn & Compound",
                desc: "Rewards auto-compound. Share price rises over time.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <a
            href="https://creditcoin-testnet.blockscout.com/address/0x47bdf18319B5068d88E80C8edFD075d63470e222"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] sm:text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Vault Contract: 0x47bdf18319B5068d88E80C8edFD075d63470e222
            &middot; Creditcoin Testnet
          </a>
        </div>
      </main>
    </div>
  );
}
