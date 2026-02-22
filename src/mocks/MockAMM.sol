// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title MockAMM
/// @notice Simulates an AMM liquidity pool that accumulates trading fees per block.
///         For testnet demonstration only. Users provide single-sided CTC liquidity.
contract MockAMM {
    uint256 public feeRatePerBlock; // fee numerator per block (scaled by 1e18)
    mapping(address => uint256) public liquidity;
    mapping(address => uint256) public lastUpdateBlock;
    mapping(address => uint256) public accruedFees;

    address public owner;

    constructor(uint256 _feeRatePerBlock) {
        feeRatePerBlock = _feeRatePerBlock;
        owner = msg.sender;
    }

    modifier updateFees(address account) {
        if (liquidity[account] > 0) {
            uint256 blocks = block.number - lastUpdateBlock[account];
            uint256 fee = (liquidity[account] * feeRatePerBlock * blocks) / 1e18;
            accruedFees[account] += fee;
        }
        lastUpdateBlock[account] = block.number;
        _;
    }

    /// @notice Add CTC liquidity to the AMM
    function addLiquidity() external payable updateFees(msg.sender) {
        require(msg.value > 0, "Must add > 0");
        liquidity[msg.sender] += msg.value;
    }

    /// @notice Remove CTC liquidity from the AMM
    function removeLiquidity(uint256 amount) external updateFees(msg.sender) {
        require(liquidity[msg.sender] >= amount, "Insufficient liquidity");
        liquidity[msg.sender] -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    /// @notice Claim accrued trading fees
    function claimFees() external updateFees(msg.sender) returns (uint256) {
        uint256 fee = accruedFees[msg.sender];
        accruedFees[msg.sender] = 0;
        if (fee > 0) {
            (bool ok,) = msg.sender.call{value: fee}("");
            require(ok, "Transfer failed");
        }
        return fee;
    }

    /// @notice View pending fees for an account
    function pendingFees(address account) external view returns (uint256) {
        uint256 pending = accruedFees[account];
        if (liquidity[account] > 0) {
            uint256 blocks = block.number - lastUpdateBlock[account];
            pending += (liquidity[account] * feeRatePerBlock * blocks) / 1e18;
        }
        return pending;
    }

    /// @notice View total liquidity provided by an account
    function liquidityBalance(address account) external view returns (uint256) {
        return liquidity[account];
    }

    /// @notice Owner can set the fee rate
    function setFeeRate(uint256 _rate) external {
        require(msg.sender == owner, "Not owner");
        feeRatePerBlock = _rate;
    }

    /// @notice Fund the contract so it can pay fees
    receive() external payable {}
}
