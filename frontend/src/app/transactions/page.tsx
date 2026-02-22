"use client";

import { useEffect, useState, useCallback } from "react";
import { formatEther } from "viem";
import { usePublicClient, useAccount } from "wagmi";
import { Navbar } from "@/components/Navbar";
import { StatSkeleton, TableRowSkeleton } from "@/components/Skeleton";
import { ADDRESSES, CREDIT_VAULT_ABI } from "@/config/contracts";

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

const TYPE_STYLES: Record<TxType, string> = {
  Deposit: "bg-cv-green/15 text-cv-green",
  Withdraw: "bg-cv-red/15 text-cv-red",
  Harvest: "bg-cv-purple/15 text-cv-purple",
  Rebalance: "bg-cv-blue/15 text-cv-blue",
};

const FILTERS: { label: string; value: TxType | "All" | "Mine" }[] = [
  { label: "All", value: "All" },
  { label: "My Txs", value: "Mine" },
  { label: "Deposits", value: "Deposit" },
  { label: "Withdrawals", value: "Withdraw" },
  { label: "Harvests", value: "Harvest" },
  { label: "Rebalances", value: "Rebalance" },
];

function TxCard({
  tx,
  address,
}: {
  tx: VaultTx;
  address: string | undefined;
}) {
  return (
    <div className="border-b border-white/5 px-4 py-4 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-medium ${TYPE_STYLES[tx.type]}`}
        >
          {tx.type}
        </span>
        <a
          href={`https://creditcoin-testnet.blockscout.com/tx/${tx.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono text-cv-green/70 hover:text-cv-green transition-colors"
        >
          {shortenHash(tx.txHash)}
        </a>
      </div>
      <p
        className={`text-sm font-semibold ${
          tx.type === "Deposit"
            ? "text-cv-green"
            : tx.type === "Withdraw"
              ? "text-cv-red"
              : "text-cv-text1"
        }`}
      >
        {tx.type === "Deposit" && "+"}
        {tx.type === "Withdraw" && "-"}
        {fmtCTC(tx.amount, 6)} CTC
      </p>
      <div className="mt-1 flex items-center justify-between text-[10px] text-cv-text3">
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
        <p className="mt-0.5 text-[10px] text-cv-text4">
          {fmtCTC(tx.shares, 4)} cvCTC shares
        </p>
      )}
    </div>
  );
}

function TxRow({
  tx,
  address,
}: {
  tx: VaultTx;
  address: string | undefined;
}) {
  return (
    <div className="grid grid-cols-12 gap-4 border-b border-white/5 px-6 py-4 hover:bg-cv-elevated/30 transition-colors last:border-0">
      <div className="col-span-2 flex items-center">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-medium ${TYPE_STYLES[tx.type]}`}
        >
          {tx.type}
        </span>
      </div>

      <div className="col-span-3 flex items-center">
        <div>
          <p
            className={`text-sm font-semibold ${
              tx.type === "Deposit"
                ? "text-cv-green"
                : tx.type === "Withdraw"
                  ? "text-cv-red"
                  : "text-cv-text1"
            }`}
          >
            {tx.type === "Deposit" && "+"}
            {tx.type === "Withdraw" && "-"}
            {fmtCTC(tx.amount, 6)} CTC
          </p>
          {tx.shares !== undefined && tx.shares > 0n && (
            <p className="text-[10px] text-cv-text3">
              {fmtCTC(tx.shares, 4)} cvCTC shares
            </p>
          )}
        </div>
      </div>

      <div className="col-span-3 flex items-center">
        {tx.user && (
          <span className="text-xs text-cv-text3">
            {tx.user.toLowerCase() === address?.toLowerCase()
              ? "You"
              : shortenAddr(tx.user)}
          </span>
        )}
        {tx.rewards && (
          <div className="text-[10px] text-cv-text3 space-y-0.5">
            <p>Staking: +{fmtCTC(tx.rewards.staking, 6)}</p>
            <p>Lending: +{fmtCTC(tx.rewards.lending, 6)}</p>
            <p>LP: +{fmtCTC(tx.rewards.lp, 6)}</p>
          </div>
        )}
        {tx.allocs && (
          <div className="text-[10px] text-cv-text3 space-y-0.5">
            <p>Staking: {fmtCTC(tx.allocs.staking, 4)}</p>
            <p>Lending: {fmtCTC(tx.allocs.lending, 4)}</p>
            <p>LP: {fmtCTC(tx.allocs.lp, 4)}</p>
          </div>
        )}
      </div>

      <div className="col-span-2 flex items-center">
        <span className="text-xs font-mono text-cv-text3">
          #{tx.blockNumber.toString()}
        </span>
      </div>

      <div className="col-span-2 flex items-center justify-end">
        <a
          href={`https://creditcoin-testnet.blockscout.com/tx/${tx.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-cv-green/70 hover:text-cv-green transition-colors"
        >
          {shortenHash(tx.txHash)}
        </a>
      </div>
    </div>
  );
}

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
      const TOTAL_RANGE = 20_000n;
      const CHUNK = 5_000n;
      const startBlock = currentBlock > TOTAL_RANGE ? currentBlock - TOTAL_RANGE : 0n;

      // Fetch in chunks to avoid RPC timeout
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deposits: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withdrawals: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const harvests: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rebalances: any[] = [];

      for (let from = startBlock; from <= currentBlock; from += CHUNK) {
        const to = from + CHUNK - 1n > currentBlock ? currentBlock : from + CHUNK - 1n;
        const [d, w, h, r] = await Promise.all([
          client.getContractEvents({
            address: VAULT,
            abi: CREDIT_VAULT_ABI,
            eventName: "DepositedCTC",
            fromBlock: from,
            toBlock: to,
          }),
          client.getContractEvents({
            address: VAULT,
            abi: CREDIT_VAULT_ABI,
            eventName: "WithdrawnCTC",
            fromBlock: from,
            toBlock: to,
          }),
          client.getContractEvents({
            address: VAULT,
            abi: CREDIT_VAULT_ABI,
            eventName: "Harvested",
            fromBlock: from,
            toBlock: to,
          }),
          client.getContractEvents({
            address: VAULT,
            abi: CREDIT_VAULT_ABI,
            eventName: "Rebalanced",
            fromBlock: from,
            toBlock: to,
          }),
        ]);
        deposits.push(...d);
        withdrawals.push(...w);
        harvests.push(...h);
        rebalances.push(...r);
      }

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
      const msg = err instanceof Error ? err.message : "Failed to fetch events";
      if (msg.includes("timed out") || msg.includes("timeout")) {
        setError("RPC request timed out. The network may be congested — try again in a moment.");
      } else {
        setError("Could not load events. Check your connection and try again.");
      }
      console.error("Tx fetch error:", msg);
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
    <div className="min-h-screen cv-page-gradient">
      <Navbar />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-cv-text1">
              Transactions
            </h2>
            <p className="mt-2 text-sm text-cv-text2">
              On-chain vault events from the last ~20k blocks
            </p>
          </div>
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="rounded-2xl bg-cv-elevated px-5 py-2.5 text-xs font-medium text-cv-text2 hover:bg-cv-module hover:text-cv-text1 transition-all duration-200 disabled:opacity-30 self-start sm:self-auto"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-cv-elevated border-t-cv-green" />
                Loading...
              </span>
            ) : (
              "Refresh"
            )}
          </button>
        </div>

        {/* Summary stats */}
        <div className="mb-8 grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <div className="rounded-3xl bg-cv-card p-5 sm:p-6">
                <p className="text-xs text-cv-text3 mb-1">Total Transactions</p>
                <p className="text-lg sm:text-2xl font-semibold text-cv-text1">
                  {txs.length}
                </p>
              </div>
              <div className="rounded-3xl bg-cv-card p-5 sm:p-6">
                <p className="text-xs text-cv-text3 mb-1">Deposits / Withdrawals</p>
                <p className="text-lg sm:text-2xl font-semibold text-cv-text1">
                  <span className="text-cv-green">{depositCount}</span>
                  {" / "}
                  <span className="text-cv-red">{withdrawCount}</span>
                </p>
              </div>
              <div className="rounded-3xl bg-cv-card p-5 sm:p-6">
                <p className="text-xs text-cv-text3 mb-1">Harvests</p>
                <p className="text-lg sm:text-2xl font-semibold text-cv-purple">
                  {harvestCount}
                </p>
              </div>
              <div className="rounded-3xl bg-cv-card p-5 sm:p-6">
                <p className="text-xs text-cv-text3 mb-1">Total Volume</p>
                <p className="text-lg sm:text-2xl font-semibold text-cv-text1">
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
              className={`rounded-2xl px-3 sm:px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                filter === f.value
                  ? "bg-cv-elevated text-cv-text1"
                  : "text-cv-text3 hover:text-cv-text2 hover:bg-cv-elevated/50"
              }`}
            >
              {f.label}
              {f.value === "Mine" && !address && (
                <span className="ml-1 text-cv-text4 hidden sm:inline">
                  (connect wallet)
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 rounded-2xl bg-cv-amber/10 p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-cv-amber">{error}</p>
            <button
              onClick={fetchEvents}
              className="shrink-0 rounded-xl bg-cv-elevated px-4 py-1.5 text-xs font-medium text-cv-text2 hover:text-cv-text1 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Transaction table / card list */}
        <div className="rounded-3xl bg-cv-card overflow-hidden">
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 border-b border-white/5 px-6 py-4 text-xs text-cv-text3">
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-3">Details</div>
            <div className="col-span-2">Block</div>
            <div className="col-span-2 text-right">Tx Hash</div>
          </div>

          {loading && (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <div className="mb-3 text-3xl opacity-20">
                {filter === "Mine" ? "👤" : "📭"}
              </div>
              <p className="text-sm text-cv-text3">
                {filter === "Mine"
                  ? "No transactions found for your wallet"
                  : "No transactions found"}
              </p>
              <p className="mt-1 text-xs text-cv-text4">
                {filter === "Mine" && !address
                  ? "Connect your wallet to see your transactions"
                  : "Try a different filter or deposit some CTC"}
              </p>
            </div>
          )}

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
        <div className="mt-6 text-center">
          <a
            href={`https://creditcoin-testnet.blockscout.com/address/${VAULT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cv-text4 hover:text-cv-text3 transition-colors"
          >
            View all events on Blockscout
          </a>
        </div>
      </main>
    </div>
  );
}
