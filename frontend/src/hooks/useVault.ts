"use client";

import { useAccount, useBalance, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ADDRESSES, CREDIT_VAULT_ABI } from "@/config/contracts";
import { creditcoinTestnet } from "@/config/chain";

const VAULT = ADDRESSES.CreditVault as `0x${string}`;
const vaultConfig = { address: VAULT, abi: CREDIT_VAULT_ABI } as const;

// ─── Shared read-only vault data (no wallet needed) ───────────────
export function useVaultData() {
  const { data, refetch, isLoading } = useReadContracts({
    contracts: [
      { ...vaultConfig, functionName: "totalAssets" },
      { ...vaultConfig, functionName: "totalSupply" },
      { ...vaultConfig, functionName: "sharePrice" },
      { ...vaultConfig, functionName: "getAllocations" },
      { ...vaultConfig, functionName: "getPendingRewards" },
      { ...vaultConfig, functionName: "totalHarvested" },
      { ...vaultConfig, functionName: "lastHarvestBlock" },
      { ...vaultConfig, functionName: "stakingWeight" },
      { ...vaultConfig, functionName: "lendingWeight" },
      { ...vaultConfig, functionName: "lpWeight" },
    ],
  });

  const totalAssets = data?.[0]?.result as bigint | undefined;
  const totalSupply = data?.[1]?.result as bigint | undefined;
  const sharePrice = data?.[2]?.result as bigint | undefined;
  const allocations = data?.[3]?.result as [bigint, bigint, bigint] | undefined;
  const pendingRewards = data?.[4]?.result as [bigint, bigint, bigint] | undefined;
  const totalHarvested = data?.[5]?.result as bigint | undefined;
  const lastHarvestBlock = data?.[6]?.result as bigint | undefined;
  const stakingWeight = data?.[7]?.result as bigint | undefined;
  const lendingWeight = data?.[8]?.result as bigint | undefined;
  const lpWeight = data?.[9]?.result as bigint | undefined;

  // Estimate APY from mock reward rates & weights
  // Mock rates per block (in 1e18 scale): staking 15.87e9, lending 11.9e9, lp 7.937e9
  // Blocks per year ~6.3M (5s blocks)
  const BLOCKS_PER_YEAR = 6_307_200n;
  const STAKING_RATE = 15_870_000_000n;
  const LENDING_RATE = 11_900_000_000n;
  const LP_RATE = 7_937_000_000n;

  let estimatedAPY = 0;
  if (stakingWeight !== undefined && lendingWeight !== undefined && lpWeight !== undefined) {
    // Weighted APY = sum(rate * weight) * blocksPerYear / 1e18 * 100
    const weightedRate =
      STAKING_RATE * stakingWeight +
      LENDING_RATE * lendingWeight +
      LP_RATE * lpWeight;
    // weightedRate is in (rate * bps), total weight = 10000 bps
    // APY% = weightedRate * BLOCKS_PER_YEAR / 10000 / 1e18 * 100
    estimatedAPY =
      Number((weightedRate * BLOCKS_PER_YEAR) / 10000n) / 1e18 * 100;
  }

  return {
    totalAssets,
    totalSupply,
    sharePrice,
    allocations,
    pendingRewards,
    totalHarvested,
    lastHarvestBlock,
    stakingWeight,
    lendingWeight,
    lpWeight,
    estimatedAPY,
    refetch,
    isLoading,
  };
}

// ─── User-specific data ───────────────────────────────────────────
export function useUserVault() {
  const { address } = useAccount();
  const { data: balance, refetch: refetchBalance } = useBalance({ address });

  const { data: userShares, refetch: refetchShares } = useReadContract({
    ...vaultConfig,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: userAssets } = useReadContract({
    ...vaultConfig,
    functionName: "convertToAssets",
    args: userShares ? [userShares as bigint] : undefined,
    query: { enabled: !!userShares && (userShares as bigint) > 0n },
  });

  const { data: maxWithdraw } = useReadContract({
    ...vaultConfig,
    functionName: "maxWithdraw",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    address,
    ctcBalance: balance?.value,
    userShares: userShares as bigint | undefined,
    userAssets: userAssets as bigint | undefined,
    maxWithdraw: maxWithdraw as bigint | undefined,
    refetch: () => { refetchBalance(); refetchShares(); },
  };
}

// ─── Write actions ────────────────────────────────────────────────
export function useVaultActions() {
  const { address } = useAccount();
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  function deposit(amountEther: string) {
    if (!address) return;
    writeContract({
      ...vaultConfig,
      functionName: "depositCTC",
      args: [address],
      value: parseEther(amountEther),
      chain: creditcoinTestnet,
      account: address,
    });
  }

  function withdraw(amountEther: string) {
    if (!address) return;
    writeContract({
      ...vaultConfig,
      functionName: "withdrawCTC",
      args: [parseEther(amountEther), address, address],
      chain: creditcoinTestnet,
      account: address,
    });
  }

  function redeemAll(shares: bigint) {
    if (!address) return;
    writeContract({
      ...vaultConfig,
      functionName: "redeemCTC",
      args: [shares, address, address],
      chain: creditcoinTestnet,
      account: address,
    });
  }

  return {
    deposit,
    withdraw,
    redeemAll,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
