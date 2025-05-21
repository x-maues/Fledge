import { ethers } from "hardhat";

async function main() {
    console.log("Starting deployment and interaction script...");

    // Get the signer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy the contract
    console.log("\nDeploying FtsoV2DynamicConsumer...");
    const FtsoV2DynamicConsumer = await ethers.getContractFactory("FtsoV2DynamicConsumer");
    const ftsoV2DynamicConsumer = await FtsoV2DynamicConsumer.deploy();
    await ftsoV2DynamicConsumer.waitForDeployment();
    
    const contractAddress = await ftsoV2DynamicConsumer.getAddress();
    console.log("FtsoV2DynamicConsumer deployed to:", contractAddress);

    // Common feed IDs for testing
    const FLR_USD_ID = "0x01464c522f55534400000000000000000000000000"; // "FLR/USD"
    const BTC_USD_ID = "0x014254432f55534400000000000000000000000000"; // "BTC/USD"
    const ETH_USD_ID = "0x014554482f55534400000000000000000000000000"; // "ETH/USD"

    // Demonstrate single feed queries using static calls
    console.log("\nDemonstrating single feed queries (static calls)...");
    
    // Get FLR/USD price
    console.log("\nGetting FLR/USD price...");
    const flrResult = await ftsoV2DynamicConsumer.getPrice.staticCall(FLR_USD_ID);
    console.log("Raw FLR Result:", flrResult);
    
    // Convert decimals to number and ensure it's positive
    const decimals = Number(flrResult.decimals);
    const absDecimals = Math.abs(decimals);
    
    console.log("FLR/USD Price:", ethers.formatUnits(flrResult.price, absDecimals));
    console.log("Decimals:", decimals);
    console.log("Timestamp:", new Date(Number(flrResult.timestamp) * 1000).toISOString());

    // Get BTC/USD price in Wei
    console.log("\nGetting BTC/USD price in Wei...");
    const btcResult = await ftsoV2DynamicConsumer.getPriceWei.staticCall(BTC_USD_ID);
    console.log("Raw BTC Result:", btcResult);
    console.log("BTC/USD Price (Wei):", btcResult.price.toString());
    console.log("Timestamp:", new Date(Number(btcResult.timestamp) * 1000).toISOString());

    // Demonstrate multiple feed queries using static call
    console.log("\nDemonstrating multiple feed queries (static call)...");
    const feedIds = [FLR_USD_ID, BTC_USD_ID, ETH_USD_ID];
    const multiResult = await ftsoV2DynamicConsumer.getCurrentFeedValues.staticCall(feedIds);
    console.log("Raw Multi Result:", multiResult);

    console.log("\nMultiple Feed Values:");
    const feedNames = ["FLR/USD", "BTC/USD", "ETH/USD"];
    for (let i = 0; i < feedIds.length; i++) {
        const feedDecimals = Number(multiResult._decimals[i]);
        const absFeedDecimals = Math.abs(feedDecimals);
        
        console.log(`\n${feedNames[i]}:`);
        console.log("Price:", ethers.formatUnits(multiResult._feedValues[i], absFeedDecimals));
        console.log("Decimals:", feedDecimals);
    }
    console.log("\nTimestamp:", new Date(Number(multiResult._timestamp) * 1000).toISOString());

    // Demonstrate error handling with static calls
    console.log("\nDemonstrating error handling (static calls)...");
    try {
        const invalidFeedId = "0x00000000000000000000000000000000000000000000";
        await ftsoV2DynamicConsumer.getPrice.staticCall(invalidFeedId);
    } catch (error) {
        console.log("Successfully caught error for invalid feed ID");
    }

    try {
        const emptyFeedIds: string[] = [];
        await ftsoV2DynamicConsumer.getCurrentFeedValues.staticCall(emptyFeedIds);
    } catch (error) {
        console.log("Successfully caught error for empty feed IDs array");
    }

    console.log("\nDeployment and interaction script completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error in deployment and interaction script:", error);
        process.exit(1);
    }); 