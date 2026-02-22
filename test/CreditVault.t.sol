// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {CreditVault} from "../src/CreditVault.sol";
import {WCTC} from "../src/WCTC.sol";
import {MockStaking} from "../src/mocks/MockStaking.sol";
import {MockLendingPool} from "../src/mocks/MockLendingPool.sol";
import {MockAMM} from "../src/mocks/MockAMM.sol";
import {StakingStrategy} from "../src/strategies/StakingStrategy.sol";
import {LendingStrategy} from "../src/strategies/LendingStrategy.sol";
import {LPStrategy} from "../src/strategies/LPStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CreditVaultTest is Test {
    CreditVault public vault;
    WCTC public wctc;

    MockStaking public mockStaking;
    MockLendingPool public mockLending;
    MockAMM public mockAmm;

    StakingStrategy public stakingStrat;
    LendingStrategy public lendingStrat;
    LPStrategy public lpStrat;

    address public owner = address(this);
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    // Reward rates: ~10% APY assuming ~5s blocks ≈ 6.3M blocks/year
    // 10% / 6.3M ≈ 1.587e-8 → ~15870000000 (1.587e10 in 1e18 scale)
    uint256 constant STAKING_RATE = 15_870_000_000; // ~10% APY
    uint256 constant LENDING_RATE = 11_900_000_000; // ~7.5% APY
    uint256 constant LP_RATE = 7_937_000_000;       // ~5% APY

    function setUp() public {
        // Deploy WCTC
        wctc = new WCTC();

        // Deploy mocks
        mockStaking = new MockStaking(STAKING_RATE);
        mockLending = new MockLendingPool(LENDING_RATE);
        mockAmm = new MockAMM(LP_RATE);

        // Fund mocks so they can pay rewards
        vm.deal(address(mockStaking), 1000 ether);
        vm.deal(address(mockLending), 1000 ether);
        vm.deal(address(mockAmm), 1000 ether);

        // Deploy vault
        vault = new CreditVault(address(wctc));

        // Deploy strategies (they need the vault address)
        stakingStrat = new StakingStrategy(address(mockStaking), address(vault));
        lendingStrat = new LendingStrategy(address(mockLending), address(vault));
        lpStrat = new LPStrategy(address(mockAmm), address(vault));

        // Configure vault
        vault.setStrategies(address(stakingStrat), address(lendingStrat), address(lpStrat));

        // Fund test users
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Basic deposit/withdraw via native CTC
    // ═══════════════════════════════════════════════════════════════════

    function test_depositCTC() public {
        vm.prank(alice);
        uint256 shares = vault.depositCTC{value: 10 ether}(alice);

        assertGt(shares, 0, "Should receive shares");
        assertEq(vault.balanceOf(alice), shares, "Share balance should match");
        // totalAssets should equal deposit
        assertEq(vault.totalAssets(), 10 ether, "Total assets should be 10 ether");
    }

    function test_depositCTC_multipleUsers() public {
        vm.prank(alice);
        vault.depositCTC{value: 10 ether}(alice);

        vm.prank(bob);
        vault.depositCTC{value: 5 ether}(bob);

        assertEq(vault.totalAssets(), 15 ether, "Total assets should be 15 ether");
        assertGt(vault.balanceOf(alice), vault.balanceOf(bob), "Alice should have more shares");
    }

    function test_withdrawCTC() public {
        vm.prank(alice);
        vault.depositCTC{value: 10 ether}(alice);

        uint256 sharesBefore = vault.balanceOf(alice);

        vm.prank(alice);
        vault.withdrawCTC(5 ether, alice, alice);

        assertEq(vault.balanceOf(alice), sharesBefore / 2, "Should have half the shares");
        assertEq(alice.balance, 95 ether, "Alice should have 95 ether back");
    }

    function test_redeemCTC() public {
        vm.prank(alice);
        vault.depositCTC{value: 10 ether}(alice);

        uint256 shares = vault.balanceOf(alice);

        vm.prank(alice);
        vault.redeemCTC(shares, alice, alice);

        assertEq(vault.balanceOf(alice), 0, "Should have 0 shares");
        assertApproxEqAbs(alice.balance, 100 ether, 1, "Alice should have ~100 ether");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ERC-4626 standard deposit/withdraw via WCTC
    // ═══════════════════════════════════════════════════════════════════

    function test_depositWCTC() public {
        // Alice wraps CTC → WCTC, then deposits via standard ERC-4626
        vm.startPrank(alice);
        wctc.deposit{value: 10 ether}();
        wctc.approve(address(vault), 10 ether);
        uint256 shares = vault.deposit(10 ether, alice);
        vm.stopPrank();

        assertGt(shares, 0, "Should receive shares");
        assertEq(vault.totalAssets(), 10 ether, "Total assets should be 10 ether");
    }

    function test_withdrawWCTC() public {
        vm.startPrank(alice);
        wctc.deposit{value: 10 ether}();
        wctc.approve(address(vault), 10 ether);
        vault.deposit(10 ether, alice);

        vault.withdraw(5 ether, alice, alice);
        vm.stopPrank();

        assertEq(wctc.balanceOf(alice), 5 ether, "Alice should have 5 WCTC back");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Strategy allocation
    // ═══════════════════════════════════════════════════════════════════

    function test_capitalDeployedToStrategies() public {
        vm.prank(alice);
        vault.depositCTC{value: 10 ether}(alice);

        (uint256 staking, uint256 lending, uint256 lp) = vault.getAllocations();

        assertEq(staking, 4 ether, "40% to staking");
        assertEq(lending, 3.5 ether, "35% to lending");
        assertEq(lp, 2.5 ether, "25% to LP");
    }

    function test_rebalance() public {
        vm.prank(alice);
        vault.depositCTC{value: 10 ether}(alice);

        // Change weights to 50/30/20
        vault.setWeights(5000, 3000, 2000);
        vault.rebalance();

        (uint256 staking, uint256 lending, uint256 lp) = vault.getAllocations();

        assertApproxEqAbs(staking, 5 ether, 1, "50% to staking after rebalance");
        assertApproxEqAbs(lending, 3 ether, 1, "30% to lending after rebalance");
        assertApproxEqAbs(lp, 2 ether, 1, "20% to LP after rebalance");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Harvest / yield accrual
    // ═══════════════════════════════════════════════════════════════════

    function test_harvest() public {
        vm.prank(alice);
        vault.depositCTC{value: 10 ether}(alice);

        uint256 totalBefore = vault.totalAssets();

        // Advance 100 blocks to accrue rewards
        vm.roll(block.number + 100);

        // Check pending rewards exist
        (uint256 pendStaking, uint256 pendLending, uint256 pendLp) = vault.getPendingRewards();
        assertGt(pendStaking + pendLending + pendLp, 0, "Should have pending rewards");

        // Harvest
        vault.harvest();

        // After harvest, rewards are compounded so totalAssets should grow
        assertGt(vault.totalAssets(), totalBefore, "Total assets should increase after harvest");
        assertGt(vault.totalHarvested(), 0, "totalHarvested should be > 0");
    }

    function test_sharePrice_increases_after_harvest() public {
        vm.prank(alice);
        vault.depositCTC{value: 10 ether}(alice);

        uint256 priceBefore = vault.sharePrice();

        vm.roll(block.number + 1000);
        vault.harvest();

        uint256 priceAfter = vault.sharePrice();
        assertGt(priceAfter, priceBefore, "Share price should increase after harvest");
    }

    function test_yield_goes_to_existing_depositors() public {
        // Alice deposits first
        vm.prank(alice);
        vault.depositCTC{value: 10 ether}(alice);

        // Advance blocks and harvest
        vm.roll(block.number + 1000);
        vault.harvest();

        // Bob deposits after yield has accrued
        vm.prank(bob);
        vault.depositCTC{value: 10 ether}(bob);

        // Alice should have more shares per CTC than Bob
        assertGt(vault.balanceOf(alice), vault.balanceOf(bob), "Alice should have more shares");

        // Both should be able to withdraw more than 0
        uint256 aliceAssets = vault.convertToAssets(vault.balanceOf(alice));
        uint256 bobAssets = vault.convertToAssets(vault.balanceOf(bob));
        assertGt(aliceAssets, 10 ether, "Alice should have earned yield");
        assertApproxEqAbs(bobAssets, 10 ether, 0.01 ether, "Bob should have ~10 ether");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Admin / access control
    // ═══════════════════════════════════════════════════════════════════

    function test_onlyOwnerCanSetStrategies() public {
        vm.prank(alice);
        vm.expectRevert(CreditVault.OnlyOwner.selector);
        vault.setStrategies(address(1), address(2), address(3));
    }

    function test_onlyOwnerCanSetWeights() public {
        vm.prank(alice);
        vm.expectRevert(CreditVault.OnlyOwner.selector);
        vault.setWeights(5000, 3000, 2000);
    }

    function test_weightsMusSumTo10000() public {
        vm.expectRevert(CreditVault.InvalidWeights.selector);
        vault.setWeights(5000, 3000, 3000); // sums to 11000
    }

    function test_onlyKeeperCanHarvest() public {
        vm.prank(alice);
        vault.depositCTC{value: 1 ether}(alice);

        vm.prank(bob);
        vm.expectRevert(CreditVault.OnlyKeeper.selector);
        vault.harvest();
    }

    function test_ownerCanHarvestAsKeeper() public {
        vm.prank(alice);
        vault.depositCTC{value: 1 ether}(alice);

        vm.roll(block.number + 10);
        // Owner should be able to harvest (keeper OR owner)
        vault.harvest();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Edge cases
    // ═══════════════════════════════════════════════════════════════════

    function test_firstDeposit_sharesMintedOneToOne() public {
        vm.prank(alice);
        uint256 shares = vault.depositCTC{value: 1 ether}(alice);
        // First deposit: shares should equal assets (1:1 minus OZ offset)
        assertApproxEqAbs(shares, 1 ether, 1e3, "First deposit should be ~1:1");
    }

    function test_withdrawAll() public {
        vm.prank(alice);
        vault.depositCTC{value: 10 ether}(alice);

        uint256 shares = vault.balanceOf(alice);

        vm.prank(alice);
        vault.redeemCTC(shares, alice, alice);

        assertEq(vault.balanceOf(alice), 0, "Should have 0 shares");
        assertEq(vault.totalSupply(), 0, "Total supply should be 0");
    }

    function test_cannotDepositZero() public {
        vm.prank(alice);
        vm.expectRevert("Must deposit > 0");
        vault.depositCTC{value: 0}(alice);
    }

    function test_multipleDepositsAndWithdrawals() public {
        // Alice deposits 10
        vm.prank(alice);
        vault.depositCTC{value: 10 ether}(alice);

        // Bob deposits 5
        vm.prank(bob);
        vault.depositCTC{value: 5 ether}(bob);

        // Advance blocks
        vm.roll(block.number + 500);
        vault.harvest();

        // Alice withdraws 3 ether worth
        vm.prank(alice);
        vault.withdrawCTC(3 ether, alice, alice);

        // Bob withdraws all shares
        uint256 bobShares = vault.balanceOf(bob);
        vm.prank(bob);
        vault.redeemCTC(bobShares, bob, bob);

        // Alice should still have shares
        assertGt(vault.balanceOf(alice), 0, "Alice should still have shares");
        // Bob should have 0 shares
        assertEq(vault.balanceOf(bob), 0, "Bob should have 0 shares");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  View functions
    // ═══════════════════════════════════════════════════════════════════

    function test_sharePrice_initiallyOneToOne() public {
        assertEq(vault.sharePrice(), 1e18, "Initial share price should be 1e18");
    }

    function test_getAllocations_beforeStrategies() public {
        CreditVault freshVault = new CreditVault(address(wctc));
        (uint256 s, uint256 l, uint256 p) = freshVault.getAllocations();
        assertEq(s + l + p, 0, "No allocations without strategies");
    }

    function test_getPendingRewards_afterBlocks() public {
        vm.prank(alice);
        vault.depositCTC{value: 10 ether}(alice);

        vm.roll(block.number + 50);

        (uint256 s, uint256 l, uint256 p) = vault.getPendingRewards();
        assertGt(s, 0, "Staking should have pending rewards");
        assertGt(l, 0, "Lending should have pending rewards");
        assertGt(p, 0, "LP should have pending rewards");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Fuzz test
    // ═══════════════════════════════════════════════════════════════════

    function testFuzz_depositAndWithdraw(uint256 amount) public {
        amount = bound(amount, 0.01 ether, 50 ether);

        vm.deal(alice, amount);
        vm.prank(alice);
        vault.depositCTC{value: amount}(alice);

        assertEq(vault.totalAssets(), amount, "Total assets should equal deposit");

        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        vault.redeemCTC(shares, alice, alice);

        assertApproxEqAbs(alice.balance, amount, 2, "Should get back approximately the same amount");
    }
}
