"use client";

import { formatEther } from "viem";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Navbar } from "@/components/Navbar";
import { StatSkeleton, ChartSkeleton, CardSkeleton } from "@/components/Skeleton";
import { useVaultData } from "@/hooks/useVault";
import { ADDRESSES } from "@/config/contracts";

// ─── constants ────────────────────────────────────────────────────
const BLOCKS_PER_YEAR = 6_307_200n;
const STRATEGY_META = [
  {
    name: "Staking",
    key: "staking" as const,
    color: "#3b82f6",
    ratePerBlock: 15_870_000_000n,
    description:
      "Delegates CTC to the on-chain staking protocol. Earns validator rewards distributed per-block.",
    risk: "Low",
    contract: ADDRESSES.StakingStrategy,
    mock: ADDRESSES.MockStaking,
  },
  {
    name: "Lending",
    key: "lending" as const,
    color: "#a855f7",
    ratePerBlock: 11_900_000_000n,
    description:
      "Supplies CTC to a lending pool. Earns interest from borrowers paid out per-block.",
    risk: "Medium",
    contract: ADDRESSES.LendingStrategy,
    mock: ADDRESSES.MockLendingPool,
  },
  {
    name: "LP (Liquidity)",
    key: "lp" as const,
    color: "#f59e0b",
    ratePerBlock: 7_937_000_000n,
    description:
      "Provides single-sided liquidity to an AMM pair. Earns trading fees distributed per-block.",
    risk: "Medium-High",
    contract: ADDRESSES.LPStrategy,
    mock: ADDRESSES.MockAMM,
  },
];

function computeAPY(ratePerBlock: bigint): number {
  return Number((ratePerBlock * BLOCKS_PER_YEAR) / 1n) / 1e18 * 100;
}

// ─── Pie chart tooltip ────────────────────────────────────────────
function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-white">{d.name}</p>
      <p className="text-gray-400">{d.value.toFixed(4)} CTC</p>
    </div>
  );
}

// ─── Strategy detail card ─────────────────────────────────────────
function StrategyCard({
  meta,
  allocation,
  totalAssets,
  pendingReward,
  weightBps,
}: {
  meta: (typeof STRATEGY_META)[number];
  allocation: number;
  totalAssets: number;
  pendingReward: number;
  weightBps: number;
}) {
  const pctOfTVL = totalAssets > 0 ? (allocation / totalAssets) * 100 : 0;
  const individualAPY = computeAPY(meta.ratePerBlock);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: meta.color + "20", border: `1px solid ${meta.color}50` }}
          >
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">{meta.name}</h3>
            <p className="text-[10px] sm:text-xs text-gray-500">
              Target weight: {(weightBps / 100).toFixed(0)}%
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${
            meta.risk === "Low"
              ? "bg-green-900/40 text-green-400 border border-green-800/50"
              : meta.risk === "Medium"
                ? "bg-yellow-900/40 text-yellow-400 border border-yellow-800/50"
                : "bg-orange-900/40 text-orange-400 border border-orange-800/50"
          }`}
        >
          {meta.risk}
        </span>
      </div>

      <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-5">{meta.description}</p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div className="rounded-xl bg-gray-800/50 p-2.5 sm:p-3">
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            Deployed Capital
          </p>
          <p className="text-sm sm:text-lg font-bold text-white">
            {allocation.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}{" "}
            CTC
          </p>
          <p className="text-[9px] sm:text-[10px] text-gray-500">
            {pctOfTVL.toFixed(1)}% of TVL
          </p>
        </div>
        <div className="rounded-xl bg-gray-800/50 p-2.5 sm:p-3">
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            Strategy APY
          </p>
          <p className="text-sm sm:text-lg font-bold text-green-400">
            {individualAPY.toFixed(2)}%
          </p>
          <p className="text-[9px] sm:text-[10px] text-gray-500">Per-block accrual</p>
        </div>
        <div className="rounded-xl bg-gray-800/50 p-2.5 sm:p-3">
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            Pending Rewards
          </p>
          <p className="text-sm sm:text-lg font-bold text-green-400">
            +{pendingReward.toFixed(6)} CTC
          </p>
          <p className="text-[9px] sm:text-[10px] text-gray-500">Claimable on harvest</p>
        </div>
        <div className="rounded-xl bg-gray-800/50 p-2.5 sm:p-3">
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            Allocation
          </p>
          <div className="mt-1 mb-1.5 h-2 w-full rounded-full bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pctOfTVL}%`,
                backgroundColor: meta.color,
              }}
            />
          </div>
          <p className="text-[9px] sm:text-[10px] text-gray-500">
            {pctOfTVL.toFixed(1)}% allocated
          </p>
        </div>
      </div>

      {/* Contract links */}
      <div className="flex gap-3 text-[9px] sm:text-[10px]">
        <a
          href={`https://creditcoin-testnet.blockscout.com/address/${meta.contract}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          Strategy Contract
        </a>
        <span className="text-gray-700">&middot;</span>
        <a
          href={`https://creditcoin-testnet.blockscout.com/address/${meta.mock}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          Mock Protocol
        </a>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function StrategiesPage() {
  const vault = useVaultData();

  const totalAssetsNum = vault.totalAssets
    ? Number(formatEther(vault.totalAssets))
    : 0;

  const allocs = STRATEGY_META.map((_, i) =>
    vault.allocations ? Number(formatEther(vault.allocations[i])) : 0
  );

  const rewards = STRATEGY_META.map((_, i) =>
    vault.pendingRewards ? Number(formatEther(vault.pendingRewards[i])) : 0
  );

  const weights = [
    vault.stakingWeight ? Number(vault.stakingWeight) : 4000,
    vault.lendingWeight ? Number(vault.lendingWeight) : 3500,
    vault.lpWeight ? Number(vault.lpWeight) : 2500,
  ];

  const pieData = STRATEGY_META.map((s, i) => ({
    name: s.name,
    value: allocs[i],
    fill: s.color,
  }));

  const totalRewards = rewards.reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Strategies</h2>
          <p className="mt-1 text-sm text-gray-400">
            CreditVault deploys capital across 3 yield strategies
          </p>
        </div>

        {/* Top row: pie chart + summary stats */}
        <div className="mb-6 sm:mb-8 grid gap-4 sm:gap-6 lg:grid-cols-5">
          {/* Pie chart */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
              Allocation Breakdown
            </p>
            {vault.isLoading ? (
              <div className="flex h-[260px] items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-green-400" />
              </div>
            ) : totalAssetsNum > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-[10px] sm:text-xs text-gray-400">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center">
                <p className="text-sm text-gray-600">No assets deployed yet</p>
              </div>
            )}
          </div>

          {/* Summary stats */}
          <div className="lg:col-span-3 grid gap-3 sm:gap-4 grid-cols-2 content-start">
            {vault.isLoading ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    Total Value Locked
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-white">
                    {totalAssetsNum.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}{" "}
                    CTC
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    Blended APY
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-green-400">
                    {vault.estimatedAPY.toFixed(2)}%
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-gray-500">
                    Weighted across all strategies
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    Total Pending Rewards
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-green-400">
                    +{totalRewards.toFixed(6)} CTC
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    Total Harvested
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-white">
                    {vault.totalHarvested
                      ? Number(formatEther(vault.totalHarvested)).toFixed(6)
                      : "0.000000"}{" "}
                    CTC
                  </p>
                  {vault.lastHarvestBlock && (
                    <p className="text-[9px] sm:text-[10px] text-gray-500">
                      Last harvest: block {vault.lastHarvestBlock.toString()}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Weight distribution bar */}
            <div className="col-span-2 rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-3">
                Target Weight Distribution
              </p>
              <div className="flex h-3 sm:h-4 overflow-hidden rounded-full bg-gray-800">
                {STRATEGY_META.map((s, i) => (
                  <div
                    key={s.key}
                    className="transition-all duration-500"
                    style={{
                      width: `${weights[i] / 100}%`,
                      backgroundColor: s.color,
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[9px] sm:text-[10px] text-gray-500">
                {STRATEGY_META.map((s, i) => (
                  <span key={s.key} className="flex items-center gap-1">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name} {(weights[i] / 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Strategy detail cards */}
        <h3 className="text-base sm:text-lg font-bold text-white mb-4">
          Strategy Details
        </h3>
        {vault.isLoading ? (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton lines={5} />
            <CardSkeleton lines={5} />
            <CardSkeleton lines={5} />
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {STRATEGY_META.map((meta, i) => (
              <StrategyCard
                key={meta.key}
                meta={meta}
                allocation={allocs[i]}
                totalAssets={totalAssetsNum}
                pendingReward={rewards[i]}
                weightBps={weights[i]}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center">
          <a
            href={`https://creditcoin-testnet.blockscout.com/address/${ADDRESSES.CreditVault}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] sm:text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Vault Contract: {ADDRESSES.CreditVault} &middot; Creditcoin Testnet
          </a>
        </div>
      </main>
    </div>
  );
}
