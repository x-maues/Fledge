// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {FtsoV2Interface} from "@flarenetwork/flare-periphery-contracts/coston2/FtsoV2Interface.sol";
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";

contract FtsoV2DynamicConsumer {
    /**
     * @notice Get the current price for a specific feed ID
     * @param feedId The feed ID to query (e.g., "FLR/USD", "BTC/USD", "ETH/USD")
     * @return price The current price
     * @return decimals The number of decimal places
     * @return timestamp The timestamp of the last update
     */
    function getPrice(bytes21 feedId) external returns (uint256 price, int8 decimals, uint64 timestamp) {
        FtsoV2Interface ftsoV2 = ContractRegistry.getFtsoV2();
        return ftsoV2.getFeedById(feedId);
    }

    /**
     * @notice Get the current price in Wei for a specific feed ID
     * @param feedId The feed ID to query (e.g., "FLR/USD", "BTC/USD", "ETH/USD")
     * @return price The current price in Wei
     * @return timestamp The timestamp of the last update
     */
    function getPriceWei(bytes21 feedId) external returns (uint256 price, uint64 timestamp) {
        FtsoV2Interface ftsoV2 = ContractRegistry.getFtsoV2();
        return ftsoV2.getFeedByIdInWei(feedId);
    }

    /**
     * @notice Get current values for multiple feeds
     * @param feedIds Array of feed IDs to query
     * @return _feedValues Array of current feed values
     * @return _decimals Array of decimal places for each feed
     * @return _timestamp Timestamp of the last update
     */
    function getCurrentFeedValues(bytes21[] calldata feedIds)
        external
        returns (
            uint256[] memory _feedValues,
            int8[] memory _decimals,
            uint64 _timestamp
        )
    {
        FtsoV2Interface ftsoV2 = ContractRegistry.getFtsoV2();
        return ftsoV2.getFeedsById(feedIds);
    }
} 