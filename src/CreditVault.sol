// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStrategy} from "./interfaces/IStrategy.sol";
import {WCTC} from "./WCTC.sol";

/// @title CreditVault
/// @notice Composable yield vault on Creditcoin. Deposits CTC into an ERC-4626 vault
///         that deploys capital across 3 strategies: Staking, Lending, and LP.
///         The vault auto-compounds rewards and provides cvCTC shares.
contract CreditVault is ERC4626 {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ─── Strategy state ───────────────────────────────────────────────
    IStrategy public stakingStrategy;
    IStrategy public lendingStrategy;
    IStrategy public lpStrategy;

    // ─── Allocation weights (basis points, must sum to 10_000) ────────
    uint256 public stakingWeight = 4000; // 40%
    uint256 public lendingWeight = 3500; // 35%
    uint256 public lpWeight = 2500;      // 25%

    // ─── Access control ───────────────────────────────────────────────
    address public owner;
    address public keeper; // can call harvest/rebalance

    // ─── Stats ────────────────────────────────────────────────────────
    uint256 public lastHarvestBlock;
    uint256 public totalHarvested;

    WCTC public immutable wctc;

    // ─── Events ───────────────────────────────────────────────────────
    event Harvested(uint256 stakingReward, uint256 lendingReward, uint256 lpReward, uint256 total);
    event Rebalanced(uint256 stakingAlloc, uint256 lendingAlloc, uint256 lpAlloc);
    event StrategiesUpdated(address staking, address lending, address lp);
    event WeightsUpdated(uint256 stakingWeight, uint256 lendingWeight, uint256 lpWeight);
    event DepositedCTC(address indexed sender, address indexed receiver, uint256 assets, uint256 shares);
    event WithdrawnCTC(address indexed sender, address indexed receiver, uint256 assets, uint256 shares);

    // ─── Errors ───────────────────────────────────────────────────────
    error OnlyOwner();
    error OnlyKeeper();
    error InvalidWeights();
    error StrategiesNotSet();
    error TransferFailed();

    constructor(address _wctc)
        ERC4626(IERC20(_wctc))
        ERC20("CreditVault CTC", "cvCTC")
    {
        wctc = WCTC(payable(_wctc));
        owner = msg.sender;
        keeper = msg.sender;
        lastHarvestBlock = block.number;
    }

    // ─── Modifiers ────────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper && msg.sender != owner) revert OnlyKeeper();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ERC-4626 Overrides
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Total assets = idle WCTC in vault + assets deployed across all strategies
    function totalAssets() public view override returns (uint256) {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        uint256 deployed = _totalDeployed();
        return idle + deployed;
    }

    /// @dev Override _deposit to deploy capital to strategies after deposit
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        super._deposit(caller, receiver, assets, shares);
        _deployCapital(assets);
    }

    /// @dev Override _withdraw to pull capital from strategies before transfer
    function _withdraw(
        address caller,
        address receiver,
        address _owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle < assets) {
            _pullCapital(assets - idle);
        }
        super._withdraw(caller, receiver, _owner, assets, shares);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Native CTC convenience functions
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Deposit native CTC directly — wraps to WCTC and deposits into vault
    function depositCTC(address receiver) external payable returns (uint256 shares) {
        uint256 assets = msg.value;
        require(assets > 0, "Must deposit > 0");

        // Calculate shares BEFORE wrapping (totalAssets doesn't include the new WCTC yet)
        shares = previewDeposit(assets);

        // Wrap CTC → WCTC (now held by this contract)
        wctc.deposit{value: assets}();

        // Mint shares to receiver
        _mint(receiver, shares);

        // Deploy capital to strategies
        _deployCapital(assets);

        emit DepositedCTC(msg.sender, receiver, assets, shares);
    }

    /// @notice Withdraw native CTC directly — redeems from vault and unwraps WCTC
    function withdrawCTC(uint256 assets, address receiver, address _owner) external returns (uint256 shares) {
        shares = previewWithdraw(assets);

        if (msg.sender != _owner) {
            _spendAllowance(_owner, msg.sender, shares);
        }

        _burn(_owner, shares);

        // Pull CTC from strategies as needed, then send native CTC to receiver
        _sendCTC(assets, receiver);

        emit WithdrawnCTC(msg.sender, receiver, assets, shares);
    }

    /// @notice Redeem shares for native CTC directly
    function redeemCTC(uint256 shares, address receiver, address _owner) external returns (uint256 assets) {
        assets = previewRedeem(shares);

        if (msg.sender != _owner) {
            _spendAllowance(_owner, msg.sender, shares);
        }

        _burn(_owner, shares);

        // Pull CTC from strategies as needed, then send native CTC to receiver
        _sendCTC(assets, receiver);

        emit WithdrawnCTC(msg.sender, receiver, assets, shares);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Harvest & Rebalance
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Harvest rewards from all strategies and auto-compound
    function harvest() external onlyKeeper {
        if (address(stakingStrategy) == address(0)) revert StrategiesNotSet();

        uint256 r1 = stakingStrategy.harvest();
        uint256 r2 = lendingStrategy.harvest();
        uint256 r3 = lpStrategy.harvest();
        uint256 total = r1 + r2 + r3;

        totalHarvested += total;
        lastHarvestBlock = block.number;

        emit Harvested(r1, r2, r3, total);
    }

    /// @notice Rebalance capital across strategies according to target weights
    function rebalance() external onlyKeeper {
        if (address(stakingStrategy) == address(0)) revert StrategiesNotSet();

        // 1. Withdraw everything from strategies → vault gets native CTC
        uint256 s1 = stakingStrategy.totalAssets();
        uint256 s2 = lendingStrategy.totalAssets();
        uint256 s3 = lpStrategy.totalAssets();

        if (s1 > 0) stakingStrategy.withdraw(s1);
        if (s2 > 0) lendingStrategy.withdraw(s2);
        if (s3 > 0) lpStrategy.withdraw(s3);

        // 2. Wrap all received CTC to WCTC for accounting
        uint256 ctcBalance = address(this).balance;
        if (ctcBalance > 0) {
            wctc.deposit{value: ctcBalance}();
        }

        // 3. Redeploy from total assets
        uint256 total = IERC20(asset()).balanceOf(address(this));
        _deployCapital(total);

        uint256 newS1 = stakingStrategy.totalAssets();
        uint256 newS2 = lendingStrategy.totalAssets();
        uint256 newS3 = lpStrategy.totalAssets();

        emit Rebalanced(newS1, newS2, newS3);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Internal helpers
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Pull CTC and send to receiver. Unwraps idle WCTC first, then pulls from strategies.
    function _sendCTC(uint256 assets, address receiver) internal {
        // First, unwrap any idle WCTC
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle > 0) {
            uint256 toUnwrap = idle < assets ? idle : assets;
            wctc.withdraw(toUnwrap);
        }

        // If we still need more, pull from strategies (strategies send native CTC)
        uint256 ctcBalance = address(this).balance;
        if (ctcBalance < assets) {
            _pullCapitalRaw(assets - ctcBalance);
        }

        (bool ok,) = receiver.call{value: assets}("");
        if (!ok) revert TransferFailed();
    }

    /// @dev Pull native CTC from strategies proportionally. Does NOT wrap to WCTC.
    function _pullCapitalRaw(uint256 amount) internal {
        uint256 total = _totalDeployed();
        if (total == 0) return;

        uint256 s1 = stakingStrategy.totalAssets();
        uint256 s2 = lendingStrategy.totalAssets();
        uint256 s3 = lpStrategy.totalAssets();

        uint256 fromStaking = (amount * s1) / total;
        uint256 fromLending = (amount * s2) / total;
        uint256 fromLp = amount - fromStaking - fromLending;

        if (fromStaking > s1) fromStaking = s1;
        if (fromLending > s2) fromLending = s2;
        if (fromLp > s3) fromLp = s3;

        if (fromStaking > 0) stakingStrategy.withdraw(fromStaking);
        if (fromLending > 0) lendingStrategy.withdraw(fromLending);
        if (fromLp > 0) lpStrategy.withdraw(fromLp);
    }

    /// @dev Deploy `amount` of WCTC to strategies according to weights.
    ///      Unwraps WCTC → CTC before sending to strategies.
    function _deployCapital(uint256 amount) internal {
        if (address(stakingStrategy) == address(0) || amount == 0) return;

        uint256 toStaking = (amount * stakingWeight) / 10_000;
        uint256 toLending = (amount * lendingWeight) / 10_000;
        uint256 toLp = amount - toStaking - toLending; // remainder to LP avoids dust

        // Unwrap WCTC → CTC
        wctc.withdraw(amount);

        // Deploy native CTC to each strategy
        if (toStaking > 0) stakingStrategy.deposit{value: toStaking}();
        if (toLending > 0) lendingStrategy.deposit{value: toLending}();
        if (toLp > 0) lpStrategy.deposit{value: toLp}();
    }

    /// @dev Pull `amount` of CTC from strategies, then wrap to WCTC.
    ///      Pulls proportionally from each strategy.
    function _pullCapital(uint256 amount) internal {
        uint256 total = _totalDeployed();
        if (total == 0) return;

        uint256 s1 = stakingStrategy.totalAssets();
        uint256 s2 = lendingStrategy.totalAssets();
        uint256 s3 = lpStrategy.totalAssets();

        // Pull proportionally
        uint256 fromStaking = (amount * s1) / total;
        uint256 fromLending = (amount * s2) / total;
        uint256 fromLp = amount - fromStaking - fromLending;

        // Cap at available
        if (fromStaking > s1) fromStaking = s1;
        if (fromLending > s2) fromLending = s2;
        if (fromLp > s3) fromLp = s3;

        if (fromStaking > 0) stakingStrategy.withdraw(fromStaking);
        if (fromLending > 0) lendingStrategy.withdraw(fromLending);
        if (fromLp > 0) lpStrategy.withdraw(fromLp);

        // Wrap received CTC → WCTC
        uint256 ctcBalance = address(this).balance;
        if (ctcBalance > 0) {
            wctc.deposit{value: ctcBalance}();
        }
    }

    /// @dev Sum of assets across all 3 strategies
    function _totalDeployed() internal view returns (uint256) {
        if (address(stakingStrategy) == address(0)) return 0;
        return stakingStrategy.totalAssets() + lendingStrategy.totalAssets() + lpStrategy.totalAssets();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  View helpers (for frontend)
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Get allocation breakdown per strategy
    function getAllocations() external view returns (uint256 staking, uint256 lending, uint256 lp) {
        if (address(stakingStrategy) == address(0)) return (0, 0, 0);
        staking = stakingStrategy.totalAssets();
        lending = lendingStrategy.totalAssets();
        lp = lpStrategy.totalAssets();
    }

    /// @notice Get pending rewards per strategy
    function getPendingRewards() external view returns (uint256 staking, uint256 lending, uint256 lp) {
        if (address(stakingStrategy) == address(0)) return (0, 0, 0);
        staking = stakingStrategy.pendingRewards();
        lending = lendingStrategy.pendingRewards();
        lp = lpStrategy.pendingRewards();
    }

    /// @notice Share price in terms of asset (scaled by 1e18)
    function sharePrice() external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 1e18;
        return (totalAssets() * 1e18) / supply;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Admin
    // ═══════════════════════════════════════════════════════════════════

    function setStrategies(address _staking, address _lending, address _lp) external onlyOwner {
        stakingStrategy = IStrategy(_staking);
        lendingStrategy = IStrategy(_lending);
        lpStrategy = IStrategy(_lp);
        emit StrategiesUpdated(_staking, _lending, _lp);
    }

    function setWeights(uint256 _staking, uint256 _lending, uint256 _lp) external onlyOwner {
        if (_staking + _lending + _lp != 10_000) revert InvalidWeights();
        stakingWeight = _staking;
        lendingWeight = _lending;
        lpWeight = _lp;
        emit WeightsUpdated(_staking, _lending, _lp);
    }

    function setKeeper(address _keeper) external onlyOwner {
        keeper = _keeper;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    /// @notice Accept native CTC (from strategies withdrawing back)
    receive() external payable {}
}
