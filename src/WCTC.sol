// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title WCTC — Wrapped CTC
/// @notice Minimal WETH-style wrapper for the native CTC token on Creditcoin.
contract WCTC is ERC20 {
    constructor() ERC20("Wrapped CTC", "WCTC") {}

    /// @notice Wrap CTC → WCTC
    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }

    /// @notice Unwrap WCTC → CTC
    function withdraw(uint256 amount) public {
        _burn(msg.sender, amount);
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "WCTC: CTC transfer failed");
    }

    receive() external payable {
        deposit();
    }
}
