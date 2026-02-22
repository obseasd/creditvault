# CreditVault

**Composable Yield Vault on Creditcoin**

CreditVault is an ERC-4626 composable yield vault that automatically deploys deposited CTC across three yield-generating strategies — Staking, Lending, and Liquidity Provision. Users deposit native CTC, receive cvCTC shares, and earn auto-compounded yield without managing individual positions.

> Built for the **BUIDL CTC Hackathon** | [Live Demo](https://creditvault.vercel.app) | [Vault on Blockscout](https://creditcoin-testnet.blockscout.com/address/0x47bdf18319B5068d88E80C8edFD075d63470e222)

---

## How It Works

```
User deposits CTC
        |
        v
  +-----------+
  | CreditVault |  (ERC-4626)
  |  (cvCTC)    |
  +------+------+
         |
    +----+----+--------+
    |         |        |
    v         v        v
 Staking   Lending     LP
 (40%)     (35%)     (25%)
    |         |        |
    v         v        v
 MockStaking  MockLending  MockAMM
 (~10% APY)   (~7.5% APY)  (~5% APY)
```

1. **Deposit CTC** — Send native CTC to the vault, receive cvCTC shares
2. **Auto-Deploy** — The vault splits capital across 3 strategies by weight (40/35/25)
3. **Earn & Compound** — Each strategy accrues rewards per-block. `harvest()` collects and re-deploys all rewards
4. **Withdraw Anytime** — Redeem cvCTC shares for the underlying CTC (which has grown via compounding)

---

## Architecture

### Smart Contracts

| Contract | Description | Address |
|----------|-------------|---------|
| **CreditVault** | ERC-4626 vault, manages deposits/withdrawals/harvest/rebalance | [`0x47bdf18319B5068d88E80C8edFD075d63470e222`](https://creditcoin-testnet.blockscout.com/address/0x47bdf18319B5068d88E80C8edFD075d63470e222) |
| **WCTC** | Wrapped CTC (WETH-style), the vault's underlying ERC-20 asset | [`0xBFd5542a97E96D8F2E2D1A39E839c7A15bA731E1`](https://creditcoin-testnet.blockscout.com/address/0xBFd5542a97E96D8F2E2D1A39E839c7A15bA731E1) |
| **StakingStrategy** | Wraps MockStaking, auto-compounds on harvest | [`0x70e2FdF55A4314c9ac521f133577CdF4C297DB3b`](https://creditcoin-testnet.blockscout.com/address/0x70e2FdF55A4314c9ac521f133577CdF4C297DB3b) |
| **LendingStrategy** | Wraps MockLendingPool, auto-compounds on harvest | [`0x87FFB21B290B01D7cb8B696dFBFCe692587aAA8D`](https://creditcoin-testnet.blockscout.com/address/0x87FFB21B290B01D7cb8B696dFBFCe692587aAA8D) |
| **LPStrategy** | Wraps MockAMM, auto-compounds on harvest | [`0x0767Bc9c393967c21F7800C5C806Fdc65C5C77bC`](https://creditcoin-testnet.blockscout.com/address/0x0767Bc9c393967c21F7800C5C806Fdc65C5C77bC) |
| **MockStaking** | Simulates staking protocol with per-block rewards | [`0x5e3Fe22590C61818e13CB3F1f75a809A1b014BC3`](https://creditcoin-testnet.blockscout.com/address/0x5e3Fe22590C61818e13CB3F1f75a809A1b014BC3) |
| **MockLendingPool** | Simulates lending pool with per-block interest | [`0xea927CE7A20F957ECDDe6888ecfDa79f43e6197F`](https://creditcoin-testnet.blockscout.com/address/0xea927CE7A20F957ECDDe6888ecfDa79f43e6197F) |
| **MockAMM** | Simulates AMM with per-block fee accrual | [`0x96784C7deCcAc3Fdc86f5988f66888eb18359c3F`](https://creditcoin-testnet.blockscout.com/address/0x96784C7deCcAc3Fdc86f5988f66888eb18359c3F) |

All 8 contracts are **verified on Blockscout** with full source code.

### Frontend

| Page | Description |
|------|-------------|
| **Dashboard** (`/`) | Protocol overview — TVL, blended APY, share price, PnL projection chart, strategy allocation cards |
| **Vault** (`/vault`) | Deposit/withdraw CTC with confirmation modals, live position tracking, tx toast notifications |
| **Strategies** (`/strategies`) | Pie chart allocation breakdown, individual strategy APY, risk levels, deployed capital per strategy |
| **Transactions** (`/transactions`) | On-chain event history — deposits, withdrawals, harvests, rebalances fetched from contract events |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contracts | Solidity 0.8.29, Foundry, OpenZeppelin v5.5.0 |
| Vault Standard | ERC-4626 |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Wallet Integration | wagmi v2, RainbowKit, viem |
| Charts | Recharts |
| Chain | Creditcoin Testnet (Chain ID: 102031) |
| Deployment | Vercel (frontend), forge create (contracts) |

---

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast)
- [Node.js](https://nodejs.org/) >= 18
- MetaMask or any EVM wallet

### Add Creditcoin Testnet to MetaMask

| Field | Value |
|-------|-------|
| Network Name | Creditcoin Testnet |
| RPC URL | `https://rpc.cc3-testnet.creditcoin.network` |
| Chain ID | `102031` |
| Symbol | `tCTC` |
| Explorer | `https://creditcoin-testnet.blockscout.com` |

Get testnet CTC from the [faucet](https://docs.creditcoin.org/wallets/using-testnet-faucet).

### Run Smart Contract Tests

```bash
# From the project root
forge install
forge build
forge test -vvv
```

All 24 tests pass including a fuzz test (257 runs).

### Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploy Contracts (if redeploying)

```bash
# Deploy each contract individually (Creditcoin requires --legacy)
forge create src/WCTC.sol:WCTC --rpc-url https://rpc.cc3-testnet.creditcoin.network --private-key $PK --legacy

# Then deploy mocks, strategies, and vault (see script/Deploy.s.sol for constructor args)
```

---

## Key Design Decisions

### Why ERC-4626?
The ERC-4626 tokenized vault standard provides a composable interface that any DeFi protocol on Creditcoin can integrate with. cvCTC shares are standard ERC-20 tokens that can be used as collateral, traded, or composed with other protocols.

### Why WCTC?
ERC-4626 requires an ERC-20 underlying asset. Since CTC is a native token (like ETH), we wrap it to WCTC (similar to WETH). The vault provides convenience functions `depositCTC()` and `withdrawCTC()` so users never need to interact with WCTC directly.

### Why Mock Protocols?
Creditcoin's DeFi ecosystem is nascent. Rather than waiting for live staking/lending/LP protocols, we built realistic mock contracts with per-block reward accrual. This demonstrates the vault architecture works end-to-end while being ready to swap in real protocols when they launch.

### Share Price Mechanics
- Initial share price: 1 cvCTC = 1 CTC
- After harvest: share price increases as rewards compound
- `totalAssets()` = sum of all 3 strategy balances (always growing)
- New depositors get fewer shares per CTC (existing depositors benefit)

---

## Smart Contract Security

- **Access control**: `onlyOwner` for admin functions, `onlyKeeper` for harvest
- **Reentrancy-safe**: State changes before external calls, using OpenZeppelin's battle-tested ERC-4626
- **Strategy isolation**: Each strategy is independently deployable and replaceable
- **Weight validation**: `setWeights()` requires staking + lending + LP = 10000 bps
- **24 comprehensive tests** including edge cases, multi-user scenarios, and fuzz testing

---

## Project Structure

```
creditvault/
├── src/
│   ├── CreditVault.sol          # Core ERC-4626 vault
│   ├── WCTC.sol                 # Wrapped CTC (WETH-style)
│   ├── interfaces/
│   │   └── IStrategy.sol        # Strategy interface
│   ├── strategies/
│   │   ├── StakingStrategy.sol
│   │   ├── LendingStrategy.sol
│   │   └── LPStrategy.sol
│   └── mocks/
│       ├── MockStaking.sol
│       ├── MockLendingPool.sol
│       └── MockAMM.sol
├── test/
│   └── CreditVault.t.sol        # 24 tests + fuzz test
├── script/
│   └── Deploy.s.sol             # Deployment script
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx          # Dashboard
│       │   ├── vault/page.tsx    # Deposit/Withdraw
│       │   ├── strategies/page.tsx
│       │   └── transactions/page.tsx
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── Modal.tsx
│       │   ├── Toast.tsx
│       │   └── Skeleton.tsx
│       ├── hooks/
│       │   └── useVault.ts       # All contract read/write hooks
│       ├── config/
│       │   ├── chain.ts          # Creditcoin testnet definition
│       │   ├── contracts.ts      # ABIs + deployed addresses
│       │   └── wagmi.ts
│       └── providers/
│           └── Web3Provider.tsx
├── deployments.json              # All deployed contract addresses
└── claude.md                     # AI pair-programming instructions
```

---

## CEIP (Creditcoin Ecosystem Investment Program) Fit

CreditVault directly addresses Creditcoin's need for **DeFi infrastructure**:

- **Composable yield layer** — Any CTC holder can earn yield without managing multiple positions
- **ERC-4626 standard** — Enables composability with future Creditcoin DeFi protocols
- **Strategy framework** — Pluggable architecture ready for real staking validators, lending pools, and DEXs as they launch on Creditcoin
- **TVL growth driver** — Single deposit point that distributes capital across the ecosystem

---

## Links

- **Live App**: [https://creditvault.vercel.app](https://creditvault.vercel.app)
- **GitHub**: [https://github.com/obseasd/creditvault](https://github.com/obseasd/creditvault)
- **Vault Contract**: [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x47bdf18319B5068d88E80C8edFD075d63470e222)
- **Creditcoin Testnet**: [Explorer](https://creditcoin-testnet.blockscout.com)

---

## License

MIT
