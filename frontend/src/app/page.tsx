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
    <div className="rounded-3xl bg-cv-card p-5 sm:p-7">
      <p className="text-xs font-medium text-cv-text3">{label}</p>
      <p
        className={`mt-2 text-2xl sm:text-3xl font-semibold tracking-tight ${accent ? "text-cv-green" : "text-cv-text1"}`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-cv-text4">{sub}</p>}
    </div>
  );
}

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
    <div className="rounded-3xl bg-cv-card p-5 sm:p-7">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-cv-text3">
            {userShares > 0
              ? "Portfolio Value Projection"
              : "Share Price Trajectory"}
          </p>
          <p className="mt-1 text-sm text-cv-text2">
            Based on current {apy.toFixed(2)}% APY
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-cv-text3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-cv-green" />
            Historical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-cv-green/40" />
            Projected
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#27AE60" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#27AE60" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#27AE60" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#27AE60" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2C2F36" />
          <XAxis
            dataKey="day"
            tick={{ fill: "#8F96AC", fontSize: 10 }}
            axisLine={{ stroke: "#40444F" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#8F96AC", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toFixed(4)}
            domain={["dataMin", "dataMax"]}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#212429",
              border: "1px solid #2C2F36",
              borderRadius: "1rem",
              fontSize: "0.75rem",
            }}
            labelStyle={{ color: "#8F96AC" }}
            formatter={(value: number | undefined) => {
              if (value == null) return ["—", "Value"];
              return [`${value.toFixed(6)} CTC`, "Value"];
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#27AE60"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
            connectNulls={false}
          />
          <Area
            type="monotone"
            dataKey="projected"
            stroke="#27AE60"
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
    { name: "Staking", color: "#2172E5", dot: "bg-cv-blue", weight: "40%" },
    { name: "Lending", color: "#8B5CF6", dot: "bg-cv-purple", weight: "35%" },
    { name: "LP", color: "#F59E0B", dot: "bg-cv-amber", weight: "25%" },
  ];

  const total = totalAssets ? Number(formatEther(totalAssets)) : 0;

  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
      {strategies.map((s, i) => {
        const alloc = allocations && totalAssets ? Number(formatEther(allocations[i])) : 0;
        const pct = total > 0 ? ((alloc / total) * 100).toFixed(1) : "0.0";
        const reward = pendingRewards ? Number(formatEther(pendingRewards[i])) : 0;

        return (
          <div key={s.name} className="rounded-3xl bg-cv-card p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl" style={{ backgroundColor: s.color }} />
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot}`} />
              <span className="text-sm font-semibold text-cv-text1">{s.name}</span>
              <span className="ml-auto text-xs text-cv-text3">
                Target {s.weight}
              </span>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-cv-text1">
              {fmtNum(alloc)} CTC
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-cv-text3">
              <span>{pct}% of TVL</span>
              <span className="text-cv-green">+{reward.toFixed(6)} pending</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
    <div className="min-h-screen cv-page-gradient">
      <Navbar />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-cv-text1">Dashboard</h2>
            <p className="mt-2 text-sm text-cv-text2">
              CreditVault protocol overview
              {isConnected && " & your portfolio"}
            </p>
          </div>
          <Link
            href="/vault"
            className="rounded-2xl bg-cv-green px-8 py-3 text-sm font-semibold text-white hover:bg-cv-green-hover transition-all duration-200 text-center shadow-[0_0_24px_rgba(39,174,96,0.15)] hover:shadow-[0_0_32px_rgba(39,174,96,0.25)]"
          >
            Deposit / Withdraw
          </Link>
        </div>

        {/* Protocol stats */}
        <div className="mb-8 grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-4">
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
          <div className="mb-8 rounded-3xl bg-cv-card p-6 sm:p-8">
            <p className="text-sm font-medium text-cv-green mb-5">
              Your Portfolio
            </p>
            <div className="grid gap-5 sm:gap-6 grid-cols-2 md:grid-cols-4">
              <div>
                <p className="text-xs text-cv-text3">Deposited (shares)</p>
                <p className="mt-1 text-lg sm:text-xl font-semibold text-cv-text1">
                  {fmtNum(userSharesNum)} cvCTC
                </p>
              </div>
              <div>
                <p className="text-xs text-cv-text3">Current Value</p>
                <p className="mt-1 text-lg sm:text-xl font-semibold text-cv-text1">
                  {fmtNum(userAssetsNum)} CTC
                </p>
              </div>
              <div>
                <p className="text-xs text-cv-text3">Profit / Loss</p>
                <p
                  className={`mt-1 text-lg sm:text-xl font-semibold ${pnl >= 0 ? "text-cv-green" : "text-cv-red"}`}
                >
                  {pnl >= 0 ? "+" : ""}
                  {pnl.toFixed(6)} CTC
                </p>
              </div>
              <div>
                <p className="text-xs text-cv-text3">Return</p>
                <p
                  className={`mt-1 text-lg sm:text-xl font-semibold ${pnlPct >= 0 ? "text-cv-green" : "text-cv-red"}`}
                >
                  {pnlPct >= 0 ? "+" : ""}
                  {pnlPct.toFixed(4)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PnL chart */}
        <div className="mb-8">
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
        <div className="mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-cv-text1 mb-4">
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
        <div className="rounded-3xl bg-cv-card p-6 sm:p-8">
          <h3 className="text-base sm:text-lg font-semibold text-cv-text1 mb-5">How It Works</h3>
          <div className="grid gap-5 md:grid-cols-3">
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
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cv-green text-xs font-semibold text-white">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-cv-text1">{title}</p>
                  <p className="text-xs text-cv-text3">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <a
            href="https://creditcoin-testnet.blockscout.com/address/0x47bdf18319B5068d88E80C8edFD075d63470e222"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cv-text4 hover:text-cv-text3 transition-colors"
          >
            Vault Contract: 0x47bdf18319B5068d88E80C8edFD075d63470e222
            &middot; Creditcoin Testnet
          </a>
        </div>
      </main>
    </div>
  );
}
