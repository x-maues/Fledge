import { ethers } from "hardhat";
import type { CrowdfundingFactory, CrowdfundingCampaign } from "../typechain-types/contracts/fund/CrowdfundingFactory";
import type { CrowdfundingCampaign as CampaignType } from "../typechain-types/contracts/fund/CrowdfundingCampaign";

async function main() {
    const [deployer, beneficiary, contributor1, contributor2] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy the factory
    const CrowdfundingFactoryFactory = await ethers.getContractFactory("CrowdfundingFactory");
    const factory = await CrowdfundingFactoryFactory.deploy() as unknown as CrowdfundingFactory;
    await factory.waitForDeployment();
    console.log("CrowdfundingFactory deployed to:", await factory.getAddress());

    // Create a new campaign
    console.log("\nCreating new campaign...");
    const tx = await factory.createCampaign(
        beneficiary.address,
        1000, // $1000 USD goal
        7,    // 7 days duration
        "Test Campaign"
    );
    const receipt = await tx.wait();

    // Get the campaign address from the event
    const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "CampaignCreated"
    );
    const campaignAddress = event?.args[1];
    console.log("Campaign created at:", campaignAddress);

    // Get the campaign contract with proper typing
    const campaign = await ethers.getContractAt("CrowdfundingCampaign", campaignAddress) as unknown as CampaignType;

    // Get campaign info
    console.log("\nFetching campaign info...");
    const info = await campaign.getCampaignInfo();
    console.log("Campaign Info:");
    console.log("Owner:", info[0]);
    console.log("Beneficiary:", info[1]);
    console.log("Funding Goal (USD):", ethers.formatEther(info[2]));
    console.log("Deadline:", new Date(Number(info[3]) * 1000).toLocaleString());
    console.log("Total Funds Raised:", ethers.formatEther(info[4]));
    console.log("Funding Goal Reached:", info[5]);
    console.log("Campaign Closed:", info[6]);
    console.log("Title:", info[7]);

    // Get current FLR/USD price using static call
    console.log("\nFetching FLR/USD price...");
    try {
        const priceData = await campaign.getFlrUsdPrice.staticCall();
        console.log("Raw price data:", priceData);
        
        if (Array.isArray(priceData)) {
            const [price, decimals, timestamp] = priceData;
            console.log("FLR/USD Price:", ethers.formatUnits(price, decimals));
            console.log("Timestamp:", new Date(Number(timestamp) * 1000).toLocaleString());
        } else {
            console.log("Unexpected price data format:", priceData);
        }
    } catch (error) {
        console.error("Error fetching FLR/USD price:", error);
    }

    // Simulate contributions using the factory's contributeToCampaign function
    console.log("\nSimulating contributions...");
    const contribution1 = ethers.parseEther("1.0"); // 1 FLR
    const contribution2 = ethers.parseEther("2.0"); // 2 FLR

    try {
        // First contribution
        console.log("Contributor 1 contributing 1 FLR...");
        const tx1 = await factory.connect(contributor1).contributeToCampaign(campaignAddress, { value: contribution1 });
        await tx1.wait();
        console.log("Contribution 1 successful");
        
        // Second contribution
        console.log("Contributor 2 contributing 2 FLR...");
        const tx2 = await factory.connect(contributor2).contributeToCampaign(campaignAddress, { value: contribution2 });
        await tx2.wait();
        console.log("Contribution 2 successful");
    } catch (error) {
        console.error("Error during contributions:", error);
    }

    // Get updated campaign info
    console.log("\nFetching updated campaign info...");
    const updatedInfo = await campaign.getCampaignInfo();
    console.log("Total Funds Raised:", ethers.formatEther(updatedInfo[4]));
    console.log("Funding Goal Reached:", updatedInfo[5]);

    // Wait for campaign deadline before finalizing
    console.log("\nWaiting for campaign deadline...");
    const deadline = Number(updatedInfo[3]);
    const currentTime = Math.floor(Date.now() / 1000);
    if (deadline > currentTime) {
        console.log(`Campaign is still active. Deadline: ${new Date(deadline * 1000).toLocaleString()}`);
        console.log("Skipping finalization as campaign is still active");
    } else {
        // Finalize campaign
        console.log("\nFinalizing campaign...");
        try {
            const finalizeTx = await campaign.finalizeCampaign();
            await finalizeTx.wait();
            console.log("Campaign finalized successfully");
        } catch (error) {
            console.error("Error finalizing campaign:", error);
        }
    }

    // Get final campaign info
    console.log("\nFetching final campaign info...");
    const finalInfo = await campaign.getCampaignInfo();
    console.log("Campaign Closed:", finalInfo[6]);
    console.log("Final Total Raised:", ethers.formatEther(finalInfo[4]));

    // Get all campaigns from factory
    console.log("\nFetching all campaigns from factory...");
    const allCampaigns = await factory.getCampaigns();
    console.log("Total campaigns:", allCampaigns.length);
    console.log("Campaigns:", allCampaigns);

    console.log("\nDeployment and interaction script completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error in main execution:", error);
        process.exit(1);
    }); 