// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title MockLendingPool
/// @notice Simulates a CTC lending pool with configurable interest rate per block.
///         For testnet demonstration only.
contract MockLendingPool {
    uint256 public interestRatePerBlock; // interest numerator per block (scaled by 1e18)
    mapping(address => uint256) public supplied;
    mapping(address => uint256) public lastUpdateBlock;
    mapping(address => uint256) public accruedInterest;

    address public owner;

    constructor(uint256 _interestRatePerBlock) {
        interestRatePerBlock = _interestRatePerBlock;
        owner = msg.sender;
    }

    modifier updateInterest(address account) {
        if (supplied[account] > 0) {
            uint256 blocks = block.number - lastUpdateBlock[account];
            uint256 interest = (supplied[account] * interestRatePerBlock * blocks) / 1e18;
            accruedInterest[account] += interest;
        }
        lastUpdateBlock[account] = block.number;
        _;
    }

    /// @notice Supply CTC to the lending pool
    function supply() external payable updateInterest(msg.sender) {
        require(msg.value > 0, "Must supply > 0");
        supplied[msg.sender] += msg.value;
    }

    /// @notice Withdraw CTC from the lending pool
    function withdraw(uint256 amount) external updateInterest(msg.sender) {
        require(supplied[msg.sender] >= amount, "Insufficient supply");
        supplied[msg.sender] -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    /// @notice Claim accrued interest
    function claimInterest() external updateInterest(msg.sender) returns (uint256) {
        uint256 interest = accruedInterest[msg.sender];
        accruedInterest[msg.sender] = 0;
        if (interest > 0) {
            (bool ok,) = msg.sender.call{value: interest}("");
            require(ok, "Transfer failed");
        }
        return interest;
    }

    /// @notice View pending interest for an account
    function pendingInterest(address account) external view returns (uint256) {
        uint256 pending = accruedInterest[account];
        if (supplied[account] > 0) {
            uint256 blocks = block.number - lastUpdateBlock[account];
            pending += (supplied[account] * interestRatePerBlock * blocks) / 1e18;
        }
        return pending;
    }

    /// @notice View total supplied by an account
    function suppliedBalance(address account) external view returns (uint256) {
        return supplied[account];
    }

    /// @notice Owner can set the interest rate
    function setInterestRate(uint256 _rate) external {
        require(msg.sender == owner, "Not owner");
        interestRatePerBlock = _rate;
    }

    /// @notice Fund the contract so it can pay interest
    receive() external payable {}
}
