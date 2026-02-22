// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IStrategy {
    /// @notice Deposit native CTC into the strategy
    function deposit() external payable;

    /// @notice Withdraw `amount` of CTC from the strategy
    function withdraw(uint256 amount) external;

    /// @notice Harvest accrued rewards and reinvest them
    /// @return harvested The amount of rewards harvested
    function harvest() external returns (uint256 harvested);

    /// @notice Total assets managed by this strategy (principal + unrealised rewards)
    function totalAssets() external view returns (uint256);

    /// @notice Pending (unharvested) rewards
    function pendingRewards() external view returns (uint256);
}
