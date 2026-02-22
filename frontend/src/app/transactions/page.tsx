"use client";

import { useEffect, useState, useCallback } from "react";
import { formatEther } from "viem";
import { usePublicClient, useAccount } from "wagmi";
import { Navbar } from "@/components/Navbar";
import { StatSkeleton, TableRowSkeleton } from "@/components/Skeleton";
import { ADDRESSES, CREDIT_VAULT_ABI } from "@/config/contracts";

// ─── types ────────────────────────────────────────────────────────
type TxType = "Deposit" | "Withdraw" | "Harvest" | "Rebalance";

interface VaultTx {
  type: TxType;
  txHash: string;
  blockNumber: bigint;
  amount: bigint;
  shares?: bigint;
  rewards?: { staking: bigint; lending: bigint; lp: bigint };
  allocs?: { staking: bigint; lending: bigint; lp: bigint };
  user?: string;
}

const VAULT = ADDRESSES.CreditVault as `0x${string}`;

// ─── helpers ──────────────────────────────────────────────────────
function shortenAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortenHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function fmtCTC(val: bigint, decimals = 4): string {
  return Number(formatEther(val)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

// ─── badge styles ─────────────────────────────────────────────────
const TYPE_STYLES: Record<TxType, string> = {
  Deposit: "bg-green-900/40 text-green-400 border-green-800/50",
  Withdraw: "bg-red-900/40 text-red-400 border-red-800/50",
  Harvest: "bg-purple-900/40 text-purple-400 border-purple-800/50",
  Rebalance: "bg-blue-900/40 text-blue-400 border-blue-800/50",
};

// ─── filter tabs ──────────────────────────────────────────────────
const FILTERS: { label: string; value: TxType | "All" | "Mine" }[] = [
  { label: "All", value: "All" },
  { label: "My Txs", value: "Mine" },
  { label: "Deposits", value: "Deposit" },
  { label: "Withdrawals", value: "Withdraw" },
  { label: "Harvests", value: "Harvest" },
  { label: "Rebalances", value: "Rebalance" },
];

// ─── Mobile tx card ───────────────────────────────────────────────
function TxCard({
  tx,
  address,
}: {
  tx: VaultTx;
  address: string | undefined;
}) {
  return (
    <div className="border-b border-gray-800/50 px-4 py-4 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TYPE_STYLES[tx.type]}`}
        >
          {tx.type}
        </span>
        <a
          href={`https://creditcoin-testnet.blockscout.com/tx/${tx.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono text-green-400/70 hover:text-green-400 transition-colors"
        >
          {shortenHash(tx.txHash)}
        </a>
      </div>
      <p
        className={`text-sm font-bold ${
          tx.type === "Deposit"
            ? "text-green-400"
            : tx.type === "Withdraw"
              ? "text-red-400"
              : "text-white"
        }`}
      >
        {tx.type === "Deposit" && "+"}
        {tx.type === "Withdraw" && "-"}
        {fmtCTC(tx.amount, 6)} CTC
      </p>
      <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
        <span>
          {tx.user
            ? tx.user.toLowerCase() === address?.toLowerCase()
              ? "You"
              : shortenAddr(tx.user)
            : tx.rewards
              ? `Staking +${fmtCTC(tx.rewards.staking, 4)} / Lending +${fmtCTC(tx.rewards.lending, 4)} / LP +${fmtCTC(tx.rewards.lp, 4)}`
              : tx.allocs
                ? "Capital rebalanced"
                : ""}
        </span>
        <span className="font-mono">#{tx.blockNumber.toString()}</span>
      </div>
      {tx.shares !== undefined && tx.shares > 0n && (
        <p className="mt-0.5 text-[10px] text-gray-600">
          {fmtCTC(tx.shares, 4)} cvCTC shares
        </p>
      )}
    </div>
  );
}

// ─── Desktop tx row ───────────────────────────────────────────────
function TxRow({
  tx,
  address,
}: {
  tx: VaultTx;
  address: string | undefined;
}) {
  return (
    <div className="grid grid-cols-12 gap-4 border-b border-gray-800/50 px-6 py-4 hover:bg-gray-800/30 transition-colors last:border-0">
      {/* Type badge */}
      <div className="col-span-2 flex items-center">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TYPE_STYLES[tx.type]}`}
        >
          {tx.type}
        </span>
      </div>

      {/* Amount */}
      <div className="col-span-3 flex items-center">
        <div>
          <p
            className={`text-sm font-bold ${
              tx.type === "Deposit"
                ? "text-green-400"
                : tx.type === "Withdraw"
                  ? "text-red-400"
                  : "text-white"
            }`}
          >
            {tx.type === "Deposit" && "+"}
            {tx.type === "Withdraw" && "-"}
            {fmtCTC(tx.amount, 6)} CTC
          </p>
          {tx.shares !== undefined && tx.shares > 0n && (
            <p className="text-[10px] text-gray-500">
              {fmtCTC(tx.shares, 4)} cvCTC shares
            </p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="col-span-3 flex items-center">
        {tx.user && (
          <span className="text-xs text-gray-500">
            {tx.user.toLowerCase() === address?.toLowerCase()
              ? "You"
              : shortenAddr(tx.user)}
          </span>
        )}
        {tx.rewards && (
          <div className="text-[10px] text-gray-500 space-y-0.5">
            <p>Staking: +{fmtCTC(tx.rewards.staking, 6)}</p>
            <p>Lending: +{fmtCTC(tx.rewards.lending, 6)}</p>
            <p>LP: +{fmtCTC(tx.rewards.lp, 6)}</p>
          </div>
        )}
        {tx.allocs && (
          <div className="text-[10px] text-gray-500 space-y-0.5">
            <p>Staking: {fmtCTC(tx.allocs.staking, 4)}</p>
            <p>Lending: {fmtCTC(tx.allocs.lending, 4)}</p>
            <p>LP: {fmtCTC(tx.allocs.lp, 4)}</p>
          </div>
        )}
      </div>

      {/* Block number */}
      <div className="col-span-2 flex items-center">
        <span className="text-xs font-mono text-gray-500">
          #{tx.blockNumber.toString()}
        </span>
      </div>

      {/* Tx hash */}
      <div className="col-span-2 flex items-center justify-end">
        <a
          href={`https://creditcoin-testnet.blockscout.com/tx/${tx.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-green-400/70 hover:text-green-400 transition-colors"
        >
          {shortenHash(tx.txHash)}
        </a>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function TransactionsPage() {
  const client = usePublicClient();
  const { address } = useAccount();

  const [txs, setTxs] = useState<VaultTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TxType | "All" | "Mine">("All");

  const fetchEvents = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);

    try {
      const currentBlock = await client.getBlockNumber();
      const fromBlock = currentBlock > 50_000n ? currentBlock - 50_000n : 0n;

      const [deposits, withdrawals, harvests, rebalances] = await Promise.all([
        client.getContractEvents({
          address: VAULT,
          abi: CREDIT_VAULT_ABI,
          eventName: "DepositedCTC",
          fromBlock,
          toBlock: "latest",
        }),
        client.getContractEvents({
          address: VAULT,
          abi: CREDIT_VAULT_ABI,
          eventName: "WithdrawnCTC",
          fromBlock,
          toBlock: "latest",
        }),
        client.getContractEvents({
          address: VAULT,
          abi: CREDIT_VAULT_ABI,
          eventName: "Harvested",
          fromBlock,
          toBlock: "latest",
        }),
        client.getContractEvents({
          address: VAULT,
          abi: CREDIT_VAULT_ABI,
          eventName: "Rebalanced",
          fromBlock,
          toBlock: "latest",
        }),
      ]);

      const allTxs: VaultTx[] = [];

      for (const log of deposits) {
        const args = log.args as {
          sender?: string;
          receiver?: string;
          assets?: bigint;
          shares?: bigint;
        };
        allTxs.push({
          type: "Deposit",
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          amount: args.assets ?? 0n,
          shares: args.shares ?? 0n,
          user: args.sender,
        });
      }

      for (const log of withdrawals) {
        const args = log.args as {
          sender?: string;
          receiver?: string;
          assets?: bigint;
          shares?: bigint;
        };
        allTxs.push({
          type: "Withdraw",
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          amount: args.assets ?? 0n,
          shares: args.shares ?? 0n,
          user: args.receiver,
        });
      }

      for (const log of harvests) {
        const args = log.args as {
          stakingReward?: bigint;
          lendingReward?: bigint;
          lpReward?: bigint;
          total?: bigint;
        };
        allTxs.push({
          type: "Harvest",
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          amount: args.total ?? 0n,
          rewards: {
            staking: args.stakingReward ?? 0n,
            lending: args.lendingReward ?? 0n,
            lp: args.lpReward ?? 0n,
          },
        });
      }

      for (const log of rebalances) {
        const args = log.args as {
          stakingAlloc?: bigint;
          lendingAlloc?: bigint;
          lpAlloc?: bigint;
        };
        const total =
          (args.stakingAlloc ?? 0n) +
          (args.lendingAlloc ?? 0n) +
          (args.lpAlloc ?? 0n);
        allTxs.push({
          type: "Rebalance",
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          amount: total,
          allocs: {
            staking: args.stakingAlloc ?? 0n,
            lending: args.lendingAlloc ?? 0n,
            lp: args.lpAlloc ?? 0n,
          },
        });
      }

      allTxs.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      setTxs(allTxs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch events"
      );
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filtered = txs.filter((tx) => {
    if (filter === "All") return true;
    if (filter === "Mine")
      return tx.user?.toLowerCase() === address?.toLowerCase();
    return tx.type === filter;
  });

  const depositCount = txs.filter((t) => t.type === "Deposit").length;
  const withdrawCount = txs.filter((t) => t.type === "Withdraw").length;
  const harvestCount = txs.filter((t) => t.type === "Harvest").length;
  const totalVolume = txs
    .filter((t) => t.type === "Deposit" || t.type === "Withdraw")
    .reduce((sum, t) => sum + t.amount, 0n);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Transactions
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              On-chain vault events from the last ~50k blocks
            </p>
          </div>
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="rounded-lg border border-gray-700 px-4 py-2 text-xs font-medium text-gray-400 hover:border-gray-500 hover:text-white transition-colors disabled:opacity-40 self-start sm:self-auto"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-green-400" />
                Loading...
              </span>
            ) : (
              "Refresh"
            )}
          </button>
        </div>

        {/* Summary stats */}
        <div className="mb-6 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {loading ? (
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
                  Total Transactions
                </p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  {txs.length}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                  Deposits / Withdrawals
                </p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  <span className="text-green-400">{depositCount}</span>
                  {" / "}
                  <span className="text-red-400">{withdrawCount}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                  Harvests
                </p>
                <p className="text-lg sm:text-2xl font-bold text-purple-400">
                  {harvestCount}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                  Total Volume
                </p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  {fmtCTC(totalVolume)} CTC
                </p>
              </div>
            </>
          )}
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5 sm:gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
            >
              {f.label}
              {f.value === "Mine" && !address && (
                <span className="ml-1 text-gray-600 hidden sm:inline">
                  (connect wallet)
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Transaction table / card list */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 border-b border-gray-800 px-6 py-3 text-[10px] uppercase tracking-wider text-gray-500">
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-3">Details</div>
            <div className="col-span-2">Block</div>
            <div className="col-span-2 text-right">Tx Hash</div>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <div className="mb-3 text-3xl opacity-20">
                {filter === "Mine" ? "👤" : "📭"}
              </div>
              <p className="text-sm text-gray-500">
                {filter === "Mine"
                  ? "No transactions found for your wallet"
                  : "No transactions found"}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {filter === "Mine" && !address
                  ? "Connect your wallet to see your transactions"
                  : "Try a different filter or deposit some CTC"}
              </p>
            </div>
          )}

          {/* Desktop rows */}
          {!loading && (
            <div className="hidden md:block">
              {filtered.map((tx, idx) => (
                <TxRow
                  key={`${tx.txHash}-${idx}`}
                  tx={tx}
                  address={address}
                />
              ))}
            </div>
          )}

          {/* Mobile cards */}
          {!loading && (
            <div className="md:hidden">
              {filtered.map((tx, idx) => (
                <TxCard
                  key={`${tx.txHash}-${idx}`}
                  tx={tx}
                  address={address}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <a
            href={`https://creditcoin-testnet.blockscout.com/address/${VAULT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] sm:text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            View all events on Blockscout
          </a>
        </div>
      </main>
    </div>
  );
}
