// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IStrategy} from "../interfaces/IStrategy.sol";
import {MockAMM} from "../mocks/MockAMM.sol";

/// @title LPStrategy
/// @notice Wraps MockAMM — provides CTC liquidity and earns trading fees.
///         Only the vault (owner) can call mutative functions.
contract LPStrategy is IStrategy {
    MockAMM public immutable amm;
    address public immutable vault;

    constructor(address _amm, address _vault) {
        amm = MockAMM(payable(_amm));
        vault = _vault;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }

    /// @inheritdoc IStrategy
    function deposit() external payable override onlyVault {
        amm.addLiquidity{value: msg.value}();
    }

    /// @inheritdoc IStrategy
    function withdraw(uint256 amount) external override onlyVault {
        amm.removeLiquidity(amount);
        (bool ok,) = vault.call{value: amount}("");
        require(ok, "Transfer to vault failed");
    }

    /// @inheritdoc IStrategy
    function harvest() external override onlyVault returns (uint256 harvested) {
        harvested = amm.claimFees();
        if (harvested > 0) {
            // Re-add the harvested fees as liquidity (auto-compound)
            amm.addLiquidity{value: harvested}();
        }
    }

    /// @inheritdoc IStrategy
    function totalAssets() external view override returns (uint256) {
        return amm.liquidityBalance(address(this)) + amm.pendingFees(address(this));
    }

    /// @inheritdoc IStrategy
    function pendingRewards() external view override returns (uint256) {
        return amm.pendingFees(address(this));
    }

    receive() external payable {}
}
