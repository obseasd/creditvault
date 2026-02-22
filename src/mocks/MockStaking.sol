// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title MockStaking
/// @notice Simulates a CTC staking protocol with configurable APY that accrues per block.
///         For testnet demonstration only.
contract MockStaking {
    uint256 public rewardRatePerBlock; // reward numerator per block (scaled by 1e18)
    mapping(address => uint256) public staked;
    mapping(address => uint256) public lastUpdateBlock;
    mapping(address => uint256) public accruedRewards;

    address public owner;

    constructor(uint256 _rewardRatePerBlock) {
        rewardRatePerBlock = _rewardRatePerBlock;
        owner = msg.sender;
    }

    modifier updateRewards(address account) {
        if (staked[account] > 0) {
            uint256 blocks = block.number - lastUpdateBlock[account];
            uint256 reward = (staked[account] * rewardRatePerBlock * blocks) / 1e18;
            accruedRewards[account] += reward;
        }
        lastUpdateBlock[account] = block.number;
        _;
    }

    /// @notice Stake CTC (native token sent as msg.value)
    function stake() external payable updateRewards(msg.sender) {
        require(msg.value > 0, "Must stake > 0");
        staked[msg.sender] += msg.value;
    }

    /// @notice Unstake CTC
    function unstake(uint256 amount) external updateRewards(msg.sender) {
        require(staked[msg.sender] >= amount, "Insufficient stake");
        staked[msg.sender] -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    /// @notice Claim accrued staking rewards
    function claimRewards() external updateRewards(msg.sender) returns (uint256) {
        uint256 reward = accruedRewards[msg.sender];
        accruedRewards[msg.sender] = 0;
        if (reward > 0) {
            (bool ok,) = msg.sender.call{value: reward}("");
            require(ok, "Transfer failed");
        }
        return reward;
    }

    /// @notice View pending rewards for an account
    function pendingRewards(address account) external view returns (uint256) {
        uint256 pending = accruedRewards[account];
        if (staked[account] > 0) {
            uint256 blocks = block.number - lastUpdateBlock[account];
            pending += (staked[account] * rewardRatePerBlock * blocks) / 1e18;
        }
        return pending;
    }

    /// @notice View total staked by an account
    function stakedBalance(address account) external view returns (uint256) {
        return staked[account];
    }

    /// @notice Owner can set the reward rate
    function setRewardRate(uint256 _rate) external {
        require(msg.sender == owner, "Not owner");
        rewardRatePerBlock = _rate;
    }

    /// @notice Fund the contract so it can pay rewards
    receive() external payable {}
}
