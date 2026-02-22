// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IStrategy} from "../interfaces/IStrategy.sol";
import {MockLendingPool} from "../mocks/MockLendingPool.sol";

/// @title LendingStrategy
/// @notice Wraps MockLendingPool — supplies CTC and earns interest.
///         Only the vault (owner) can call mutative functions.
contract LendingStrategy is IStrategy {
    MockLendingPool public immutable lendingPool;
    address public immutable vault;

    constructor(address _lendingPool, address _vault) {
        lendingPool = MockLendingPool(payable(_lendingPool));
        vault = _vault;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }

    /// @inheritdoc IStrategy
    function deposit() external payable override onlyVault {
        lendingPool.supply{value: msg.value}();
    }

    /// @inheritdoc IStrategy
    function withdraw(uint256 amount) external override onlyVault {
        lendingPool.withdraw(amount);
        (bool ok,) = vault.call{value: amount}("");
        require(ok, "Transfer to vault failed");
    }

    /// @inheritdoc IStrategy
    function harvest() external override onlyVault returns (uint256 harvested) {
        harvested = lendingPool.claimInterest();
        if (harvested > 0) {
            // Re-supply the harvested interest (auto-compound)
            lendingPool.supply{value: harvested}();
        }
    }

    /// @inheritdoc IStrategy
    function totalAssets() external view override returns (uint256) {
        return lendingPool.suppliedBalance(address(this)) + lendingPool.pendingInterest(address(this));
    }

    /// @inheritdoc IStrategy
    function pendingRewards() external view override returns (uint256) {
        return lendingPool.pendingInterest(address(this));
    }

    receive() external payable {}
}
