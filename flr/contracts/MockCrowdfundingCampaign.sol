// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MockCrowdfundingCampaign
 * @dev A simplified version of CrowdfundingCampaign for testing without FTSOv2 dependency
 */
contract MockCrowdfundingCampaign is ReentrancyGuard {
    // Factory address that created this campaign
    address public factory;
    
    // Campaign details
    address public owner;
    address public beneficiary;
    uint256 public fundingGoalInUsd;
    uint256 public startPrice;
    uint256 public deadline;
    uint256 public totalFundsRaised;
    bool public fundingGoalReached;
    bool public campaignClosed;
    uint256 public launchTimestamp;
    string public title;
    string public description;
    
    // Test specific variables
    bool public mockPriceDropped = false; // For testing price drop scenarios
    
    // Contributor balances
    mapping(address => uint256) public contributions;
    
    // Events
    event FundingReceived(address indexed contributor, uint256 amount, uint256 currentTotal);
    event FundingWithdrawn(address indexed contributor, uint256 amount);
    event CampaignFinalized(uint256 totalRaised, bool fundingGoalReached);
    event RefundEnabled(uint256 currentPrice, uint256 initialPrice);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the campaign owner can call this function");
        _;
    }
    
    modifier onlyFactoryOrOwner() {
        require(msg.sender == factory || msg.sender == owner, "Only the factory or owner can call this function");
        _;
    }
    
    /**
     * @dev Constructor to initialize the crowdfunding campaign
     * @param _owner The owner of the campaign who can finalize it
     * @param _beneficiary The address that will receive the funds if the campaign is successful
     * @param _fundingGoalInUsd The funding goal in USD (with 18 decimals)
     * @param _durationInDays The duration of the campaign in days
     * @param _title The title of the campaign
     * @param _description The description of the campaign
     */
    constructor(
        address _owner,
        address _beneficiary,
        uint256 _fundingGoalInUsd,
        uint256 _durationInDays,
        string memory _title,
        string memory _description
    ) {
        require(_owner != address(0), "Owner cannot be zero address");
        require(_beneficiary != address(0), "Beneficiary cannot be zero address");
        require(_fundingGoalInUsd > 0, "Funding goal must be greater than 0");
        require(_durationInDays > 0, "Duration must be greater than 0");
        
        factory = msg.sender;
        owner = _owner;
        beneficiary = _beneficiary;
        fundingGoalInUsd = _fundingGoalInUsd * 1e18; // Convert to wei (18 decimals)
        deadline = block.timestamp + (_durationInDays * 1 days);
        campaignClosed = false;
        fundingGoalReached = false;
        launchTimestamp = block.timestamp;
        title = _title;
        description = _description;
        
        // Mock initial price instead of getting from FTSOv2
        startPrice = 1e18; // $1 with 18 decimals
    }
    
    /**
     * @dev Test function to simulate price drop
     * @param _hasDropped Whether the price has dropped
     */
    function mockSetPriceDropped(bool _hasDropped) external onlyOwner {
        mockPriceDropped = _hasDropped;
    }
    
    /**
     * @dev Check if the current price is below the initial price - mock version
     * @return hasDropped Whether the price has dropped below the initial price
     */
    function hasPriceDropped() public view returns (bool hasDropped) {
        return mockPriceDropped;
    }
    
    /**
     * @dev Check if refunds are allowed
     * @return isRefundable Whether refunds are allowed
     */
    function isRefundable() public view returns (bool isRefundable) {
        // Refunds are allowed if:
        // 1. The campaign is not closed
        // 2. The funding goal has not been reached
        // 3. The price has dropped below the initial price
        return !campaignClosed && !fundingGoalReached && hasPriceDropped();
    }
    
    /**
     * @dev Contribute to the campaign
     */
    function contribute() external payable nonReentrant {
        require(!campaignClosed, "Campaign is closed");
        require(block.timestamp <= deadline, "Campaign deadline has passed");
        require(msg.value > 0, "Contribution must be greater than 0");
        
        // Update contributor's balance
        contributions[msg.sender] += msg.value;
        
        // Update total funds raised
        totalFundsRaised += msg.value;
        
        emit FundingReceived(msg.sender, msg.value, totalFundsRaised);
        
        // Check if the funding goal has been reached
        checkGoalReached();
    }
    
    /**
     * @dev Withdraw contribution if refunds are allowed
     */
    function withdrawContribution() external nonReentrant {
        require(isRefundable(), "Refunds are not allowed at this time");
        require(contributions[msg.sender] > 0, "No contribution to withdraw");
        
        uint256 amount = contributions[msg.sender];
        contributions[msg.sender] = 0;
        totalFundsRaised -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit FundingWithdrawn(msg.sender, amount);
        
        // Emit event if price has dropped
        if (hasPriceDropped()) {
            emit RefundEnabled(500, 1000); // Mock values for current and initial price
        }
    }
    
    /**
     * @dev Check if the funding goal has been reached
     */
    function checkGoalReached() public {
        if (campaignClosed) {
            return;
        }
        
        // In the mock, we'll use a simple formula without real price feeds:
        // Assume 1 FLR = $0.1, so 10 FLR = $1
        uint256 raisedValueInUsd = (totalFundsRaised * 1e17) / 1e18; // 0.1 with 18 decimals
        
        // Check if the funding goal has been reached
        if (raisedValueInUsd >= fundingGoalInUsd) {
            fundingGoalReached = true;
        }
    }
    
    /**
     * @dev Manually set whether the funding goal has been reached (for testing)
     */
    function mockSetFundingGoalReached(bool _reached) external onlyOwner {
        fundingGoalReached = _reached;
    }
    
    /**
     * @dev Finalize the campaign and transfer funds to the beneficiary if successful
     */
    function finalizeCampaign() external onlyOwner nonReentrant {
        require(!campaignClosed, "Campaign is already closed");
        require(block.timestamp > deadline || fundingGoalReached, "Campaign is still active");
        
        campaignClosed = true;
        
        // Check one final time if the goal has been reached
        checkGoalReached();
        
        emit CampaignFinalized(totalFundsRaised, fundingGoalReached);
        
        if (fundingGoalReached) {
            // Transfer funds to the beneficiary
            (bool success, ) = payable(beneficiary).call{value: totalFundsRaised}("");
            require(success, "Transfer to beneficiary failed");
        }
    }
    
    /**
     * @dev Allow contributors to claim refunds after the campaign ends unsuccessfully
     */
    function claimRefundAfterDeadline() external nonReentrant {
        require(campaignClosed, "Campaign must be closed");
        require(!fundingGoalReached, "Funding goal was reached, no refunds available");
        require(contributions[msg.sender] > 0, "No contribution to refund");
        
        uint256 amount = contributions[msg.sender];
        contributions[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Refund failed");
        
        emit FundingWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Get campaign details
     * @return _owner The owner of the campaign
     * @return _beneficiary The address that will receive the funds if the campaign is successful
     * @return _fundingGoalInUsd The funding goal in USD
     * @return _deadline The deadline of the campaign
     * @return _totalFundsRaised The total funds raised so far
     * @return _fundingGoalReached Whether the funding goal has been reached
     * @return _campaignClosed Whether the campaign is closed
     * @return _refundable Whether refunds are allowed at the moment
     */
    function getCampaignDetails() external view returns (
        address _owner,
        address _beneficiary,
        uint256 _fundingGoalInUsd,
        uint256 _deadline,
        uint256 _totalFundsRaised,
        bool _fundingGoalReached,
        bool _campaignClosed,
        bool _refundable,
        string memory _title,
        string memory _description
    ) {
        return (
            owner,
            beneficiary,
            fundingGoalInUsd,
            deadline,
            totalFundsRaised,
            fundingGoalReached,
            campaignClosed,
            isRefundable(),
            title,
            description
        );
    }
    
    /**
     * @dev Get the USD value of the funds raised based on the current mock price
     * @return valueInUsd The USD value of the funds raised
     */
    function getFundsRaisedValueInUsd() external view returns (uint256 valueInUsd) {
        // In the mock, we use a simplified calculation: 1 FLR = $0.1
        return (totalFundsRaised * 1e17) / 1e18; // 0.1 with 18 decimals
    }
    
    /**
     * @dev Get the time remaining for the campaign
     * @return timeRemaining The time remaining in seconds
     */
    function getTimeRemaining() external view returns (uint256 timeRemaining) {
        if (block.timestamp >= deadline) {
            return 0;
        }
        return deadline - block.timestamp;
    }
    
    /**
     * @dev Get the amount contributed by a specific address
     * @param contributor The address of the contributor
     * @return amount The amount contributed
     */
    function getContribution(address contributor) external view returns (uint256 amount) {
        return contributions[contributor];
    }
    
    /**
     * @dev Receive function to accept FLR
     */
    receive() external payable {
        // Only accept direct transfers if they're from the factory
        require(msg.sender == factory, "Direct transfers not accepted. Use contribute() instead.");
    }
} 