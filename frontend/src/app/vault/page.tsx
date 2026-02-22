"use client";

import { useState, useEffect } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/Navbar";
import { ConfirmModal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { StatSkeleton } from "@/components/Skeleton";
import { useVaultData, useUserVault, useVaultActions } from "@/hooks/useVault";

function fmt(val: bigint | undefined, decimals = 4): string {
  if (val === undefined) return "—";
  return Number(formatEther(val)).toFixed(decimals);
}

function fmtUsd(val: bigint | undefined): string {
  if (val === undefined) return "—";
  return Number(formatEther(val)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
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
    <div className="rounded-3xl bg-cv-card p-5 sm:p-6">
      <p className="text-xs font-medium text-cv-text3">{label}</p>
      <p
        className={`mt-2 text-xl sm:text-2xl font-semibold tracking-tight ${accent ? "text-cv-green" : "text-cv-text1"}`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-cv-text4">{sub}</p>}
    </div>
  );
}

function VaultForm({
  mode,
  onSwitch,
}: {
  mode: "deposit" | "withdraw";
  onSwitch: (m: "deposit" | "withdraw") => void;
}) {
  const { isConnected } = useAccount();
  const { ctcBalance, userShares, maxWithdraw, refetch: refetchUser } = useUserVault();
  const { refetch: refetchVault } = useVaultData();
  const {
    deposit,
    withdraw,
    redeemAll,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  } = useVaultActions();

  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [redeemConfirmOpen, setRedeemConfirmOpen] = useState(false);

  useEffect(() => {
    if (isSuccess && txHash) {
      refetchUser();
      refetchVault();
      setAmount("");
      toast(
        mode === "deposit"
          ? "Deposit confirmed!"
          : "Withdrawal confirmed!",
        "success",
        {
          label: "View on Blockscout",
          href: `https://creditcoin-testnet.blockscout.com/tx/${txHash}`,
        }
      );
      const timer = setTimeout(() => reset(), 8000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, txHash]);

  useEffect(() => {
    if (error) {
      const msg = (error as Error).message || "Transaction failed";
      if (msg.includes("rejected") || msg.includes("denied")) {
        toast("Transaction rejected by user", "info");
      } else {
        toast(msg.slice(0, 120), "error");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const maxDeposit = ctcBalance ? Number(formatEther(ctcBalance)) : 0;
  const maxWithdrawNum = maxWithdraw ? Number(formatEther(maxWithdraw)) : 0;

  function handleMax() {
    if (mode === "deposit") {
      const max = Math.max(0, maxDeposit - 0.01);
      setAmount(max > 0 ? max.toFixed(6) : "");
    } else {
      setAmount(maxWithdrawNum > 0 ? maxWithdrawNum.toFixed(6) : "");
    }
  }

  function handleSubmitClick() {
    if (!amount || Number(amount) <= 0) return;
    setConfirmOpen(true);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    reset();
    if (mode === "deposit") {
      deposit(amount);
    } else {
      withdraw(amount);
    }
  }

  function handleRedeemClick() {
    if (!userShares || userShares === 0n) return;
    setRedeemConfirmOpen(true);
  }

  function handleRedeemConfirm() {
    setRedeemConfirmOpen(false);
    reset();
    if (userShares) redeemAll(userShares);
  }

  const busy = isPending || isConfirming;
  const buttonLabel = isPending
    ? "Confirm in wallet..."
    : isConfirming
      ? "Confirming..."
      : mode === "deposit"
        ? "Deposit CTC"
        : "Withdraw CTC";

  return (
    <>
      <div className="rounded-3xl bg-cv-card p-5 sm:p-7">
        {/* Tab switcher */}
        <div className="mb-6 flex rounded-2xl bg-cv-elevated p-1">
          <button
            onClick={() => { onSwitch("deposit"); reset(); setAmount(""); }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
              mode === "deposit"
                ? "bg-cv-green text-white"
                : "text-cv-text3 hover:text-cv-text1"
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => { onSwitch("withdraw"); reset(); setAmount(""); }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
              mode === "withdraw"
                ? "bg-cv-red text-white"
                : "text-cv-text3 hover:text-cv-text1"
            }`}
          >
            Withdraw
          </button>
        </div>

        {/* Amount input */}
        <div className="rounded-2xl bg-cv-elevated p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-cv-text3">
              {mode === "deposit" ? "You deposit" : "You withdraw"}
            </span>
            <button
              onClick={handleMax}
              className="text-sm font-semibold text-cv-green hover:text-cv-green-hover transition-colors"
            >
              MAX
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-2xl sm:text-4xl font-semibold text-cv-text1 outline-none placeholder:text-cv-text4"
            />
            <span className="rounded-2xl bg-cv-module px-4 py-2 text-sm font-semibold text-cv-text1">
              tCTC
            </span>
          </div>
          <p className="mt-3 text-xs text-cv-text3">
            {mode === "deposit"
              ? `Balance: ${maxDeposit.toFixed(4)} tCTC`
              : `Max withdraw: ${maxWithdrawNum.toFixed(4)} CTC`}
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={handleSubmitClick}
          disabled={busy || !isConnected || !amount || Number(amount) <= 0}
          className={`mt-5 w-full rounded-2xl py-4 text-base font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30 ${
            mode === "deposit"
              ? "bg-cv-green text-white hover:brightness-110 shadow-[0_0_24px_rgba(39,174,96,0.15)]"
              : "bg-cv-red text-white hover:brightness-110 shadow-[0_0_24px_rgba(253,64,64,0.15)]"
          }`}
        >
          {!isConnected ? (
            "Connect Wallet"
          ) : busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {buttonLabel}
            </span>
          ) : (
            buttonLabel
          )}
        </button>

        {mode === "withdraw" && userShares && userShares > 0n && (
          <button
            onClick={handleRedeemClick}
            disabled={busy}
            className="mt-3 w-full rounded-2xl bg-cv-elevated py-3 text-sm font-medium text-cv-text2 hover:bg-cv-module transition-all duration-200 disabled:opacity-30"
          >
            Redeem All ({fmt(userShares)} cvCTC)
          </button>
        )}

        {/* Inline tx feedback */}
        {isSuccess && txHash && (
          <div className="mt-4 rounded-2xl bg-cv-green/10 p-4 text-sm text-cv-green">
            Transaction confirmed!{" "}
            <a
              href={`https://creditcoin-testnet.blockscout.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:brightness-125"
            >
              View on Blockscout
            </a>
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-2xl bg-cv-red/10 p-4 text-sm text-cv-red break-all">
            {(error as Error).message?.slice(0, 200) || "Transaction failed"}
          </div>
        )}
      </div>

      {/* Confirmation modals */}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={mode === "deposit" ? "Confirm Deposit" : "Confirm Withdrawal"}
        confirmLabel={mode === "deposit" ? "Deposit" : "Withdraw"}
        confirmVariant={mode === "deposit" ? "green" : "red"}
      >
        <div className="space-y-3">
          <div className="rounded-2xl bg-cv-elevated p-5 text-center">
            <p className="text-2xl font-semibold text-cv-text1">{amount} tCTC</p>
          </div>
          <p>
            {mode === "deposit"
              ? "Your CTC will be deposited into the vault and deployed across 3 yield strategies. You'll receive cvCTC shares representing your position."
              : "Your CTC will be withdrawn from the vault. Funds may be pulled from active strategies."}
          </p>
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={redeemConfirmOpen}
        onClose={() => setRedeemConfirmOpen(false)}
        onConfirm={handleRedeemConfirm}
        title="Redeem All Shares"
        confirmLabel="Redeem All"
        confirmVariant="red"
      >
        <div className="space-y-3">
          <div className="rounded-2xl bg-cv-elevated p-5 text-center">
            <p className="text-2xl font-semibold text-cv-text1">
              {fmt(userShares)} cvCTC
            </p>
            <p className="text-xs text-cv-text4 mt-1">All your vault shares</p>
          </div>
          <p>
            This will redeem all your cvCTC shares and withdraw the underlying
            CTC to your wallet. This action cannot be undone.
          </p>
        </div>
      </ConfirmModal>
    </>
  );
}

function AllocationBar({
  allocations,
  totalAssets,
}: {
  allocations: [bigint, bigint, bigint] | undefined;
  totalAssets: bigint | undefined;
}) {
  if (!allocations || !totalAssets || totalAssets === 0n) {
    return (
      <div className="rounded-3xl bg-cv-card p-5 sm:p-6">
        <p className="text-xs font-medium text-cv-text3 mb-3">
          Strategy Allocation
        </p>
        <p className="text-sm text-cv-text3">No assets deployed yet</p>
      </div>
    );
  }

  const total = Number(formatEther(totalAssets));
  const staking = Number(formatEther(allocations[0]));
  const lending = Number(formatEther(allocations[1]));
  const lp = Number(formatEther(allocations[2]));

  const pctStaking = total > 0 ? (staking / total) * 100 : 0;
  const pctLending = total > 0 ? (lending / total) * 100 : 0;
  const pctLp = total > 0 ? (lp / total) * 100 : 0;

  const strategies = [
    { name: "Staking", pct: pctStaking, amount: staking, color: "bg-cv-blue" },
    { name: "Lending", pct: pctLending, amount: lending, color: "bg-cv-purple" },
    { name: "LP", pct: pctLp, amount: lp, color: "bg-cv-amber" },
  ];

  return (
    <div className="rounded-3xl bg-cv-card p-5 sm:p-6">
      <p className="text-xs font-medium text-cv-text3 mb-3">
        Strategy Allocation
      </p>
      <div className="flex h-3 overflow-hidden rounded-full bg-cv-elevated">
        {strategies.map(({ name, pct, color }) => (
          <div
            key={name}
            className={`${color} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {strategies.map(({ name, pct, amount: amt, color }) => (
          <div key={name} className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
              <span className="text-xs font-medium text-cv-text3">{name}</span>
            </div>
            <p className="text-sm font-semibold text-cv-text1">{pct.toFixed(1)}%</p>
            <p className="text-[10px] text-cv-text4">{amt.toFixed(4)} CTC</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingRewards({
  pendingRewards,
}: {
  pendingRewards: [bigint, bigint, bigint] | undefined;
}) {
  const total = pendingRewards
    ? pendingRewards[0] + pendingRewards[1] + pendingRewards[2]
    : undefined;

  return (
    <div className="rounded-3xl bg-cv-card p-5 sm:p-6">
      <p className="text-xs font-medium text-cv-text3 mb-3">
        Pending Rewards
      </p>
      <p className="text-xl font-semibold text-cv-green">{fmt(total, 6)} CTC</p>
      {pendingRewards && (
        <div className="mt-3 space-y-1.5 text-xs text-cv-text3">
          <div className="flex justify-between">
            <span>Staking</span>
            <span className="text-cv-text2">{fmt(pendingRewards[0], 6)}</span>
          </div>
          <div className="flex justify-between">
            <span>Lending</span>
            <span className="text-cv-text2">{fmt(pendingRewards[1], 6)}</span>
          </div>
          <div className="flex justify-between">
            <span>LP</span>
            <span className="text-cv-text2">{fmt(pendingRewards[2], 6)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VaultPage() {
  const { isConnected } = useAccount();
  const vault = useVaultData();
  const user = useUserVault();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");

  useEffect(() => {
    const iv = setInterval(() => vault.refetch(), 12_000);
    return () => clearInterval(iv);
  }, [vault]);

  return (
    <div className="min-h-screen cv-page-gradient">
      <Navbar />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-cv-text1">Vault</h2>
          <p className="mt-2 text-sm text-cv-text2">
            Deposit CTC to receive cvCTC shares and earn auto-compounded yield
          </p>
        </div>

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
                value={`${fmtUsd(vault.totalAssets)} CTC`}
              />
              <Stat
                label="Estimated APY"
                value={`${vault.estimatedAPY.toFixed(2)}%`}
                accent
              />
              <Stat
                label="Share Price"
                value={
                  vault.sharePrice
                    ? `${(Number(vault.sharePrice) / 1e18).toFixed(6)} CTC`
                    : "—"
                }
              />
              <Stat
                label="Total Harvested"
                value={`${fmt(vault.totalHarvested, 6)} CTC`}
                sub={
                  vault.lastHarvestBlock
                    ? `Last harvest: block ${vault.lastHarvestBlock.toString()}`
                    : undefined
                }
              />
            </>
          )}
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <VaultForm mode={mode} onSwitch={setMode} />

            {isConnected && (
              <div className="rounded-3xl bg-cv-card p-5 sm:p-6">
                <p className="text-xs font-medium text-cv-text3 mb-4">
                  Your Position
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-cv-text3">cvCTC Shares</p>
                    <p className="mt-1 text-lg font-semibold text-cv-text1">
                      {fmt(user.userShares)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cv-text3">Underlying Value</p>
                    <p className="mt-1 text-lg font-semibold text-cv-green">
                      {fmt(user.userAssets)} CTC
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cv-text3">Wallet Balance</p>
                    <p className="mt-1 text-lg font-semibold text-cv-text1">
                      {user.ctcBalance !== undefined
                        ? `${Number(formatEther(user.ctcBalance)).toFixed(4)} tCTC`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cv-text3">PnL</p>
                    <p className={`mt-1 text-lg font-semibold ${
                      user.userShares && user.userAssets && user.userShares > 0n
                        && Number(formatEther(user.userAssets)) - Number(formatEther(user.userShares)) >= 0
                        ? "text-cv-green" : "text-cv-red"
                    }`}>
                      {user.userShares && user.userAssets && user.userShares > 0n
                        ? `${Number(formatEther(user.userAssets)) - Number(formatEther(user.userShares)) >= 0 ? "+" : ""}${(
                            Number(formatEther(user.userAssets)) -
                            Number(formatEther(user.userShares))
                          ).toFixed(6)} CTC`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <AllocationBar
              allocations={vault.allocations}
              totalAssets={vault.totalAssets}
            />
            <PendingRewards pendingRewards={vault.pendingRewards} />

            <div className="rounded-3xl bg-cv-card p-5 sm:p-6">
              <p className="text-xs font-medium text-cv-text3 mb-3">
                Contract
              </p>
              <a
                href="https://creditcoin-testnet.blockscout.com/address/0x47bdf18319B5068d88E80C8edFD075d63470e222"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-cv-green hover:text-cv-green-hover break-all transition-colors"
              >
                0x47bdf18319B5068d88E80C8edFD075d63470e222
              </a>
              <p className="mt-2 text-[10px] text-cv-text4">
                Creditcoin Testnet &middot; Chain ID 102031
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
