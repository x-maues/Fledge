import { expect } from "chai";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Helper function to wait for a specific time duration
const timeTravel = async (seconds: number) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

// Helper function to simulate a price drop
const simulatePriceDrop = async (campaign: any) => {
  // We can directly use the mock function to simulate a price drop
  await campaign.mockSetPriceDropped(true);
  console.log("Price drop simulated using mockSetPriceDropped(true)");
};

describe("Crowdfunding System with Mocks", function () {
  let mockCrowdfundingFactory: any;
  let owner: SignerWithAddress;
  let beneficiary: SignerWithAddress;
  let contributor1: SignerWithAddress;
  let contributor2: SignerWithAddress;
  let contributor3: SignerWithAddress;
  let campaignAddress: string;
  let campaign: any;

  const fundingGoalInUsd = 5000; // $5,000
  const durationInDays = 14; // 14 days

  beforeEach(async function () {
    // Get signers
    [owner, beneficiary, contributor1, contributor2, contributor3] = await ethers.getSigners();

    // Deploy a mock factory contract
    const MockFactoryFactory = await ethers.getContractFactory("MockCrowdfundingCampaign");
    
    // Deploy a single mock campaign directly
    campaign = await MockFactoryFactory.deploy(
      owner.address,
      beneficiary.address,
      fundingGoalInUsd,
      durationInDays,
      "Test Campaign",
      "This is a test campaign for unit testing purposes."
    );
    
    await campaign.waitForDeployment();
    campaignAddress = await campaign.getAddress();
  });

  describe("Campaign Creation", function () {
    it("should create a campaign with the correct parameters", async function () {
      // Get campaign details
      const details = await campaign.getCampaignDetails();

      expect(details[0]).to.equal(owner.address); // owner
      expect(details[1]).to.equal(beneficiary.address); // beneficiary
      expect(details[2]).to.equal(BigInt(fundingGoalInUsd) * BigInt(1e18)); // fundingGoalInUsd
      expect(details[8]).to.equal("Test Campaign"); // title
      expect(details[9]).to.equal("This is a test campaign for unit testing purposes."); // description
    });
  });

  describe("Contribution Functionality", function () {
    it("should accept contributions correctly", async function () {
      // Make a contribution
      const contributionAmount = ethers.parseEther("10"); // 10 FLR
      await campaign.connect(contributor1).contribute({ value: contributionAmount });

      // Check contributor balance
      expect(await campaign.getContribution(contributor1.address)).to.equal(contributionAmount);

      // Check total funds raised
      expect(await campaign.totalFundsRaised()).to.equal(contributionAmount);
    });

    it("should track multiple contributions from the same address", async function () {
      // Make multiple contributions
      const firstAmount = ethers.parseEther("3"); // 3 FLR
      const secondAmount = ethers.parseEther("7"); // 7 FLR
      
      await campaign.connect(contributor3).contribute({ value: firstAmount });
      await campaign.connect(contributor3).contribute({ value: secondAmount });

      // Check final contributor balance
      expect(await campaign.getContribution(contributor3.address)).to.equal(firstAmount + secondAmount);
    });
  });

  describe("Campaign Lifecycle", function () {
    it("should not allow finalization before deadline", async function () {
      // Attempt to finalize early
      await expect(campaign.connect(owner).finalizeCampaign()).to.be.revertedWith(
        "Campaign is still active"
      );
    });

    it("should allow finalization after deadline", async function () {
      // Fast forward time to after the deadline
      await timeTravel(durationInDays * 24 * 60 * 60 + 1);

      // Finalize the campaign
      await campaign.connect(owner).finalizeCampaign();

      // Check campaign status
      const details = await campaign.getCampaignDetails();
      expect(details[6]).to.be.true; // campaignClosed
    });

    it("should transfer funds to beneficiary if goal is reached", async function () {
      // First use the mock function to set goal as reached
      await campaign.mockSetFundingGoalReached(true);
      
      // Record beneficiary's initial balance
      const initialBalance = await ethers.provider.getBalance(beneficiary.address);
      
      // Make contribution
      const largeContribution = ethers.parseEther("1000"); // 1000 FLR
      await campaign.connect(contributor1).contribute({ value: largeContribution });
      
      // Fast forward time
      await timeTravel(durationInDays * 24 * 60 * 60 + 1);
      
      // Finalize the campaign
      await campaign.connect(owner).finalizeCampaign();
      
      // Check if beneficiary received the funds
      const finalBalance = await ethers.provider.getBalance(beneficiary.address);
      expect(finalBalance - initialBalance).to.equal(largeContribution);
    });
  });

  describe("Refund Functionality", function () {
    it("should allow refunds after campaign ends unsuccessfully", async function () {
      // Make a contribution
      const contributionAmount = ethers.parseEther("5");
      await campaign.connect(contributor1).contribute({ value: contributionAmount });
      
      // Fast forward time past deadline
      await timeTravel(durationInDays * 24 * 60 * 60 + 1);
      
      // Finalize the campaign (will be unsuccessful because goal not reached)
      await campaign.connect(owner).finalizeCampaign();
      
      // Record contributor's balance before refund
      const balanceBefore = await ethers.provider.getBalance(contributor1.address);
      
      // Get refund
      await campaign.connect(contributor1).claimRefundAfterDeadline();
      
      // Check contributor's balance after refund (accounting for gas costs)
      const balanceAfter = await ethers.provider.getBalance(contributor1.address);
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });

    it("should refund if price drops (simulated)", async function () {
      // Make a contribution
      const contributionAmount = ethers.parseEther("10");
      await campaign.connect(contributor2).contribute({ value: contributionAmount });
      
      // Simulate price drop using the mock function
      await simulatePriceDrop(campaign);
      
      // Record contributor's balance before refund
      const balanceBefore = await ethers.provider.getBalance(contributor2.address);
      
      // Withdraw contribution due to price drop
      await campaign.connect(contributor2).withdrawContribution();
      
      // Check contributor's balance after refund
      const balanceAfter = await ethers.provider.getBalance(contributor2.address);
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });
  });
}); 