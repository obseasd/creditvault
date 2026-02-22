// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IStrategy} from "../interfaces/IStrategy.sol";
import {MockStaking} from "../mocks/MockStaking.sol";

/// @title StakingStrategy
/// @notice Wraps MockStaking — stakes CTC and earns staking rewards.
///         Only the vault (owner) can call mutative functions.
contract StakingStrategy is IStrategy {
    MockStaking public immutable staking;
    address public immutable vault;

    constructor(address _staking, address _vault) {
        staking = MockStaking(payable(_staking));
        vault = _vault;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }

    /// @inheritdoc IStrategy
    function deposit() external payable override onlyVault {
        staking.stake{value: msg.value}();
    }

    /// @inheritdoc IStrategy
    function withdraw(uint256 amount) external override onlyVault {
        staking.unstake(amount);
        (bool ok,) = vault.call{value: amount}("");
        require(ok, "Transfer to vault failed");
    }

    /// @inheritdoc IStrategy
    function harvest() external override onlyVault returns (uint256 harvested) {
        harvested = staking.claimRewards();
        if (harvested > 0) {
            // Re-stake the harvested rewards (auto-compound)
            staking.stake{value: harvested}();
        }
    }

    /// @inheritdoc IStrategy
    function totalAssets() external view override returns (uint256) {
        return staking.stakedBalance(address(this)) + staking.pendingRewards(address(this));
    }

    /// @inheritdoc IStrategy
    function pendingRewards() external view override returns (uint256) {
        return staking.pendingRewards(address(this));
    }

    receive() external payable {}
}
