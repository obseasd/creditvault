// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {CreditVault} from "../src/CreditVault.sol";
import {WCTC} from "../src/WCTC.sol";
import {MockStaking} from "../src/mocks/MockStaking.sol";
import {MockLendingPool} from "../src/mocks/MockLendingPool.sol";
import {MockAMM} from "../src/mocks/MockAMM.sol";
import {StakingStrategy} from "../src/strategies/StakingStrategy.sol";
import {LendingStrategy} from "../src/strategies/LendingStrategy.sol";
import {LPStrategy} from "../src/strategies/LPStrategy.sol";

contract DeployScript is Script {
    // Reward rates (~APY assuming ~5s blocks, 6.3M blocks/year)
    uint256 constant STAKING_RATE = 15_870_000_000; // ~10% APY
    uint256 constant LENDING_RATE = 11_900_000_000; // ~7.5% APY
    uint256 constant LP_RATE = 7_937_000_000;       // ~5% APY

    // Fund mocks with this much tCTC for reward payouts
    uint256 constant MOCK_FUNDING = 100 ether;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // 1. Deploy WCTC
        WCTC wctc = new WCTC();
        console.log("WCTC:", address(wctc));

        // 2. Deploy mock protocols
        MockStaking mockStaking = new MockStaking(STAKING_RATE);
        MockLendingPool mockLending = new MockLendingPool(LENDING_RATE);
        MockAMM mockAmm = new MockAMM(LP_RATE);
        console.log("MockStaking:", address(mockStaking));
        console.log("MockLendingPool:", address(mockLending));
        console.log("MockAMM:", address(mockAmm));

        // 3. Fund mocks so they can pay rewards
        (bool ok1,) = address(mockStaking).call{value: MOCK_FUNDING}("");
        (bool ok2,) = address(mockLending).call{value: MOCK_FUNDING}("");
        (bool ok3,) = address(mockAmm).call{value: MOCK_FUNDING}("");
        require(ok1 && ok2 && ok3, "Mock funding failed");

        // 4. Deploy vault
        CreditVault vault = new CreditVault(address(wctc));
        console.log("CreditVault:", address(vault));

        // 5. Deploy strategies
        StakingStrategy stakingStrat = new StakingStrategy(address(mockStaking), address(vault));
        LendingStrategy lendingStrat = new LendingStrategy(address(mockLending), address(vault));
        LPStrategy lpStrat = new LPStrategy(address(mockAmm), address(vault));
        console.log("StakingStrategy:", address(stakingStrat));
        console.log("LendingStrategy:", address(lendingStrat));
        console.log("LPStrategy:", address(lpStrat));

        // 6. Wire strategies to vault
        vault.setStrategies(address(stakingStrat), address(lendingStrat), address(lpStrat));

        vm.stopBroadcast();

        console.log("--- Deployment complete ---");
    }
}
