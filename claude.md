# CONTEXT — Read This First

I am a solo developer on a 12-day hackathon deadline. You are my technical co-pilot. Your job is to **build a working, deployable product** — not a concept, not a mockup. Be direct, no fluff. Prioritize speed. When blocked, propose 2 alternatives and a recommendation. Don't ask for confirmation on obvious decisions — just do it. Fix bugs, don't explain theory.

## My Tech Stack
- **Strong:** Next.js/React, TypeScript, Solidity/Foundry, ethers.js/viem/wagmi
- **Intermediate:** Rust, Cairo, Python
- **Learning (need heavy AI help):** Nothing — Creditcoin is standard EVM

## Rules
- Working demo > ambitious concept. A polished MVP beats an unfinished grand vision.
- Deploy on Creditcoin testnet (Chain ID 102031), have real transactions, show contract addresses on Blockscout.
- Use Creditcoin's ecosystem prominently — all deploy on CTC testnet, reference CTC as the yield-bearing asset.
- If something doesn't work after 30 min of debugging, simplify rather than staying stuck.
- README and video demo matter as much as code — we'll do those on the last 2 days.
- We also need a project deck/whitepaper as PDF.
- IMPORTANT: There are only 3 winners OVERALL (not per track). We need to be in the top 3 across ALL tracks. Quality > quantity.

---

# PROJECT — CreditVault: Composable Yield Vault on Creditcoin

## Concept
CreditVault is a composable yield vault protocol on Creditcoin. Users deposit CTC into an ERC-4626 vault that automatically deploys capital across 3 strategies: Liquid Staking, Lending Pool, and Liquidity Provision. The vault auto-compounds rewards, manages reallocation between strategies, and provides a shares token (cvCTC) representing the position.

## Hackathon: BUIDL CTC Hackathon
- **Prize:** $15,000 (3 winners: $10K + $3K + $2K) + CEIP Investment Fast-Track
- **Deadline:** March 7, 2026
- **Judging:** 100% judge panel (no community votes)
- **Track:** DeFi (weight 4/10 — highest valued track)

## MANDATORY Requirements
- [ ] GitHub Repository with README
- [ ] Project Deck/Whitepaper (PDF URL)
- [ ] Demo Video URL
- [ ] Deployed on Creditcoin testnet
- [ ] Original work created during hackathon
- [ ] Team info submitted

---

## Stack Technique

| Component | Tech |
|-----------|------|
| Smart Contracts | Solidity 0.8.x (Foundry) |
| Vault Standard | ERC-4626 (OpenZeppelin) |
| Frontend | Next.js 14 + TypeScript + TailwindCSS |
| Wallet | wagmi v2 + RainbowKit |
| Chain | Creditcoin Testnet (Chain ID: 102031) |
| RPC | https://rpc.cc3-testnet.creditcoin.network |
| Explorer | https://creditcoin-testnet.blockscout.com/ |
| Gas Token | tCTC (18 decimals) |
| Charts | Recharts |

---

## Architecture

### Smart Contracts

**CreditVault.sol** — ERC-4626 vault, the core contract:
- deposit(assets) → mint shares (cvCTC)
- withdraw(assets) / redeem(shares) → burn shares, return CTC
- totalAssets() = sum of all 3 strategy balances
- harvest() → collect rewards from all strategies, auto-compound
- rebalance() → redistribute between strategies (40% staking, 35% lending, 25% LP)

**StakingStrategy.sol** — stake CTC, earn staking rewards
**LendingStrategy.sol** — supply CTC to lending pool, earn interest
**LPStrategy.sol** — provide CTC/USDC liquidity, earn trading fees

**Mock contracts** (testnet only — simulate upstream protocols):
- MockStaking.sol — simulates staking with configurable APY
- MockLendingPool.sol — simulates lending with interest accrual
- MockAMM.sol — simulates AMM with fee accumulation

### Frontend (4 pages)
1. **Dashboard** — portfolio overview, total deposited, current APY, PnL chart
2. **Vault** — deposit/withdraw CTC, share balance, live APY
3. **Strategies** — breakdown of 3 strategies, allocation %, individual performance
4. **Transactions** — on-chain history from Blockscout

---

## Timeline (12 days)
- Days 1-2: Setup + all smart contracts + tests
- Days 3-4: Deploy on CTC testnet + frontend scaffold + vault page
- Days 5-7: Complete frontend (all 4 pages, charts, polish)
- Days 8-9: README + project deck PDF
- Days 10-11: Demo video + final polish
- Day 12: SUBMIT

---

## Key Infra

| Item | Value |
|------|-------|
| Testnet RPC | https://rpc.cc3-testnet.creditcoin.network |
| Chain ID | 102031 |
| Explorer | https://creditcoin-testnet.blockscout.com/ |
| Faucet | https://docs.creditcoin.org/wallets/using-testnet-faucet |
| Gas Token | tCTC |

---

## Risks & Fallbacks

| If this happens | Do this |
|----------------|---------|
| Faucet doesn't work | Try Creditcoin Discord for tCTC, or deploy on Sepolia first and adapt later |
| Contract verification fails on Blockscout | Use `forge verify-contract` with Blockscout API, or flatten and verify manually |
| Not enough time for 3 strategies | Ship with 2 (staking + lending), LP is bonus |
| Mock protocols feel too fake | Add block-based yield accumulation to make numbers change over time realistically |
| RainbowKit doesn't support CTC chain | Define custom chain in wagmi config, use generic wallet connector |

---

# INSTRUCTION

Start by initializing the Foundry project. Create `CreditVault.sol` as an ERC-4626 vault that inherits from OpenZeppelin's ERC4626. Then create the 3 mock contracts (MockStaking, MockLendingPool, MockAMM) with configurable APY that accrues per block. Write the 3 strategy contracts that wrap the mocks. Add comprehensive tests. We'll deploy to Creditcoin testnet once all tests pass.
