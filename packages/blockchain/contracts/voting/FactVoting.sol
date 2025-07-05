// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IArticleStorage {
    function getArticle(uint256 articleId) external view returns (
        string memory title,
        string memory content,
        string memory ipfsHash,
        address author,
        uint256 timestamp,
        bool isActive
    );
    
    function articleExists(uint256 articleId) external view returns (bool);
}

contract FactVoting is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    // State variables
    IERC20 public immutable votingToken;
    IArticleStorage public immutable articleStorage;
    
    // Voting configuration
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant MIN_STAKE = 1000 * 10**18; // 1000 tokens
    uint256 public constant MAX_STAKE = 100000 * 10**18; // 100,000 tokens
    uint256 public constant RESOLUTION_PERIOD = 24 hours;
    uint256 public constant REWARD_POOL_PERCENTAGE = 80; // 80% of losing stakes go to winners
    uint256 public constant SLASHING_PERCENTAGE = 20; // 20% of wrong votes get slashed
    
    // Vote positions
    enum VotePosition { NONE, TRUE, FALSE }
    
    // Vote status
    enum VoteStatus { NONE, ACTIVE, RESOLVED, CANCELLED }
    
    // Vote struct
    struct Vote {
        address voter;
        uint256 stake;
        VotePosition position;
        uint256 timestamp;
        bool claimed;
    }
    
    // Article voting data
    struct ArticleVoting {
        uint256 articleId;
        uint256 votingEndTime;
        uint256 resolutionEndTime;
        VoteStatus status;
        VotePosition finalVerdict;
        string proofHash;
        uint256 totalTrueStake;
        uint256 totalFalseStake;
        uint256 totalVotes;
        bool emergencyCancelled;
        address resolver;
    }
    
    // Mappings
    mapping(uint256 => ArticleVoting) public articleVotings;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => address[]) public articleVoters;
    mapping(address => uint256[]) public userVotedArticles;
    
    // Counters
    Counters.Counter private _votingIdCounter;
    
    // Events
    event VotingStarted(uint256 indexed articleId, uint256 votingEndTime, uint256 resolutionEndTime);
    event VoteCast(uint256 indexed articleId, address indexed voter, VotePosition position, uint256 stake);
    event VoteResolved(uint256 indexed articleId, VotePosition finalVerdict, string proofHash, address resolver);
    event RewardsClaimed(uint256 indexed articleId, address indexed voter, uint256 amount);
    event VotingCancelled(uint256 indexed articleId, string reason);
    event EmergencyVoteCancellation(uint256 indexed articleId, address indexed canceller);
    
    // Modifiers
    modifier onlyValidArticle(uint256 articleId) {
        require(articleStorage.articleExists(articleId), "Article does not exist");
        _;
    }
    
    modifier onlyActiveVoting(uint256 articleId) {
        require(articleVotings[articleId].status == VoteStatus.ACTIVE, "Voting not active");
        require(block.timestamp <= articleVotings[articleId].votingEndTime, "Voting period ended");
        _;
    }
    
    modifier onlyResolutionPeriod(uint256 articleId) {
        require(articleVotings[articleId].status == VoteStatus.ACTIVE, "Voting not active");
        require(block.timestamp > articleVotings[articleId].votingEndTime, "Voting still active");
        require(block.timestamp <= articleVotings[articleId].resolutionEndTime, "Resolution period ended");
        _;
    }
    
    modifier onlyResolved(uint256 articleId) {
        require(articleVotings[articleId].status == VoteStatus.RESOLVED, "Voting not resolved");
        _;
    }
    
    constructor(
        address _votingToken,
        address _articleStorage
    ) {
        require(_votingToken != address(0), "Invalid token address");
        require(_articleStorage != address(0), "Invalid article storage address");
        votingToken = IERC20(_votingToken);
        articleStorage = IArticleStorage(_articleStorage);
    }
    
    /**
     * @notice Start voting on an article
     * @param articleId The ID of the article to vote on
     */
    function startVoting(uint256 articleId) 
        external 
        onlyOwner 
        onlyValidArticle(articleId) 
    {
        require(articleVotings[articleId].status == VoteStatus.NONE, "Voting already exists");
        
        uint256 votingEndTime = block.timestamp + VOTING_PERIOD;
        uint256 resolutionEndTime = votingEndTime + RESOLUTION_PERIOD;
        
        articleVotings[articleId] = ArticleVoting({
            articleId: articleId,
            votingEndTime: votingEndTime,
            resolutionEndTime: resolutionEndTime,
            status: VoteStatus.ACTIVE,
            finalVerdict: VotePosition.NONE,
            proofHash: "",
            totalTrueStake: 0,
            totalFalseStake: 0,
            totalVotes: 0,
            emergencyCancelled: false,
            resolver: address(0)
        });
        
        emit VotingStarted(articleId, votingEndTime, resolutionEndTime);
    }
    
    /**
     * @notice Vote on an article
     * @param articleId The ID of the article to vote on
     * @param position The voting position (TRUE or FALSE)
     * @param stakeAmount The amount of tokens to stake
     */
    function voteOnArticle(
        uint256 articleId,
        VotePosition position,
        uint256 stakeAmount
    ) 
        external 
        nonReentrant 
        onlyValidArticle(articleId) 
        onlyActiveVoting(articleId) 
    {
        require(position == VotePosition.TRUE || position == VotePosition.FALSE, "Invalid vote position");
        require(stakeAmount >= MIN_STAKE && stakeAmount <= MAX_STAKE, "Invalid stake amount");
        require(votes[articleId][msg.sender].voter == address(0), "Already voted");
        
        // Transfer tokens from voter
        require(votingToken.transferFrom(msg.sender, address(this), stakeAmount), "Token transfer failed");
        
        // Record vote
        votes[articleId][msg.sender] = Vote({
            voter: msg.sender,
            stake: stakeAmount,
            position: position,
            timestamp: block.timestamp,
            claimed: false
        });
        
        // Update article voting data
        articleVoters[articleId].push(msg.sender);
        userVotedArticles[msg.sender].push(articleId);
        
        ArticleVoting storage voting = articleVotings[articleId];
        voting.totalVotes++;
        
        if (position == VotePosition.TRUE) {
            voting.totalTrueStake += stakeAmount;
        } else {
            voting.totalFalseStake += stakeAmount;
        }
        
        emit VoteCast(articleId, msg.sender, position, stakeAmount);
    }
    
    /**
     * @notice Resolve a fact with final verdict
     * @param articleId The ID of the article to resolve
     * @param finalVerdict The final verdict (TRUE or FALSE)
     * @param proofHash IPFS hash of the proof/evidence
     */
    function resolveFact(
        uint256 articleId,
        VotePosition finalVerdict,
        string calldata proofHash
    ) 
        external 
        onlyOwner 
        onlyResolutionPeriod(articleId) 
    {
        require(finalVerdict == VotePosition.TRUE || finalVerdict == VotePosition.FALSE, "Invalid verdict");
        require(bytes(proofHash).length > 0, "Proof hash required");
        
        ArticleVoting storage voting = articleVotings[articleId];
        voting.status = VoteStatus.RESOLVED;
        voting.finalVerdict = finalVerdict;
        voting.proofHash = proofHash;
        voting.resolver = msg.sender;
        
        emit VoteResolved(articleId, finalVerdict, proofHash, msg.sender);
    }
    
    /**
     * @notice Claim rewards for correct votes
     * @param articleId The ID of the article to claim rewards for
     */
    function claimRewards(uint256 articleId) 
        external 
        nonReentrant 
        onlyResolved(articleId) 
    {
        Vote storage vote = votes[articleId][msg.sender];
        require(vote.voter == msg.sender, "No vote found");
        require(!vote.claimed, "Already claimed");
        
        ArticleVoting storage voting = articleVotings[articleId];
        
        uint256 rewardAmount = 0;
        
        if (vote.position == voting.finalVerdict) {
            // Correct vote - calculate reward
            uint256 winningStake = voting.finalVerdict == VotePosition.TRUE ? 
                voting.totalTrueStake : voting.totalFalseStake;
            uint256 losingStake = voting.finalVerdict == VotePosition.TRUE ? 
                voting.totalFalseStake : voting.totalTrueStake;
            
            // Return original stake + proportional share of slashed pool
            rewardAmount = vote.stake;
            if (winningStake > 0) {
                uint256 rewardPool = (losingStake * SLASHING_PERCENTAGE) / 100;
                rewardAmount += (rewardPool * vote.stake) / winningStake;
            }
        } else {
            // Wrong vote - apply slashing
            rewardAmount = (vote.stake * (100 - SLASHING_PERCENTAGE)) / 100;
        }
        
        vote.claimed = true;
        
        if (rewardAmount > 0) {
            require(votingToken.transfer(msg.sender, rewardAmount), "Token transfer failed");
        }
        
        emit RewardsClaimed(articleId, msg.sender, rewardAmount);
    }
    
    /**
     * @notice Emergency cancellation of voting
     * @param articleId The ID of the article voting to cancel
     * @param reason Reason for cancellation
     */
    function emergencyCancel(uint256 articleId, string calldata reason) 
        external 
        onlyOwner 
    {
        require(articleVotings[articleId].status == VoteStatus.ACTIVE, "Voting not active");
        
        articleVotings[articleId].status = VoteStatus.CANCELLED;
        articleVotings[articleId].emergencyCancelled = true;
        
        emit VotingCancelled(articleId, reason);
        emit EmergencyVoteCancellation(articleId, msg.sender);
    }
    
    /**
     * @notice Refund stakes for cancelled voting
     * @param articleId The ID of the cancelled article voting
     */
    function refundStake(uint256 articleId) 
        external 
        nonReentrant 
    {
        require(articleVotings[articleId].status == VoteStatus.CANCELLED, "Voting not cancelled");
        
        Vote storage vote = votes[articleId][msg.sender];
        require(vote.voter == msg.sender, "No vote found");
        require(!vote.claimed, "Already claimed");
        
        vote.claimed = true;
        require(votingToken.transfer(msg.sender, vote.stake), "Token transfer failed");
    }
    
    // View functions
    
    /**
     * @notice Get voting statistics for an article
     * @param articleId The ID of the article
     * @return status The voting status
     * @return votingEndTime The end time of voting
     * @return resolutionEndTime The end time of resolution
     * @return totalVotes The total number of votes
     * @return totalTrueStake The total stake for TRUE votes
     * @return totalFalseStake The total stake for FALSE votes
     * @return finalVerdict The final verdict
     * @return proofHash The proof hash
     */
    function getVotingStats(uint256 articleId) 
        external 
        view 
        returns (
            VoteStatus status,
            uint256 votingEndTime,
            uint256 resolutionEndTime,
            uint256 totalVotes,
            uint256 totalTrueStake,
            uint256 totalFalseStake,
            VotePosition finalVerdict,
            string memory proofHash
        ) 
    {
        ArticleVoting storage voting = articleVotings[articleId];
        return (
            voting.status,
            voting.votingEndTime,
            voting.resolutionEndTime,
            voting.totalVotes,
            voting.totalTrueStake,
            voting.totalFalseStake,
            voting.finalVerdict,
            voting.proofHash
        );
    }
    
    /**
     * @notice Get vote information for a specific voter and article
     * @param articleId The ID of the article
     * @param voter The address of the voter
     * @return voterAddress The address of the voter
     * @return stake The amount staked
     * @return position The vote position
     * @return timestamp The time of the vote
     * @return claimed Whether the reward was claimed
     */
    function getVote(uint256 articleId, address voter) 
        external 
        view 
        returns (
            address voterAddress,
            uint256 stake,
            VotePosition position,
            uint256 timestamp,
            bool claimed
        ) 
    {
        Vote storage vote = votes[articleId][voter];
        return (
            vote.voter,
            vote.stake,
            vote.position,
            vote.timestamp,
            vote.claimed
        );
    }
    
    /**
     * @notice Get all voters for an article
     * @param articleId The ID of the article
     * @return Array of voter addresses
     */
    function getArticleVoters(uint256 articleId) 
        external 
        view 
        returns (address[] memory) 
    {
        return articleVoters[articleId];
    }
    
    /**
     * @notice Get all articles a user has voted on
     * @param user The address of the user
     * @return Array of article IDs
     */
    function getUserVotedArticles(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userVotedArticles[user];
    }
    
    /**
     * @notice Calculate vote weight based on stake amount
     * @param stakeAmount The amount of tokens staked
     * @return The calculated vote weight
     */
    function calculateVoteWeight(uint256 stakeAmount) 
        public 
        pure 
        returns (uint256) 
    {
        // Simple linear weight calculation
        // Could be enhanced with logarithmic or other formulas
        return stakeAmount;
    }
    
    /**
     * @notice Get current voting period remaining
     * @param articleId The ID of the article
     * @return Remaining time in seconds
     */
    function getVotingTimeRemaining(uint256 articleId) 
        external 
        view 
        returns (uint256) 
    {
        if (articleVotings[articleId].votingEndTime <= block.timestamp) {
            return 0;
        }
        return articleVotings[articleId].votingEndTime - block.timestamp;
    }
    
    /**
     * @notice Get resolution period remaining
     * @param articleId The ID of the article
     * @return Remaining time in seconds
     */
    function getResolutionTimeRemaining(uint256 articleId) 
        external 
        view 
        returns (uint256) 
    {
        if (articleVotings[articleId].resolutionEndTime <= block.timestamp) {
            return 0;
        }
        return articleVotings[articleId].resolutionEndTime - block.timestamp;
    }
    
    /**
     * @notice Check if user can vote on article
     * @param articleId The ID of the article
     * @param user The address of the user
     * @return Whether user can vote
     */
    function canVote(uint256 articleId, address user) 
        external 
        view 
        returns (bool) 
    {
        return articleVotings[articleId].status == VoteStatus.ACTIVE &&
               block.timestamp <= articleVotings[articleId].votingEndTime &&
               votes[articleId][user].voter == address(0);
    }
    
    /**
     * @notice Get potential rewards for a vote
     * @param articleId The ID of the article
     * @param voter The address of the voter
     * @return Potential reward amount
     */
    function getPotentialRewards(uint256 articleId, address voter) 
        external 
        view 
        returns (uint256) 
    {
        if (articleVotings[articleId].status != VoteStatus.RESOLVED) {
            return 0;
        }
        
        Vote storage vote = votes[articleId][voter];
        if (vote.voter != voter || vote.claimed) {
            return 0;
        }
        
        ArticleVoting storage voting = articleVotings[articleId];
        
        if (vote.position == voting.finalVerdict) {
            // Correct vote
            uint256 winningStake = voting.finalVerdict == VotePosition.TRUE ? 
                voting.totalTrueStake : voting.totalFalseStake;
            uint256 losingStake = voting.finalVerdict == VotePosition.TRUE ? 
                voting.totalFalseStake : voting.totalTrueStake;
            
            uint256 rewardAmount = vote.stake;
            if (winningStake > 0) {
                uint256 rewardPool = (losingStake * SLASHING_PERCENTAGE) / 100;
                rewardAmount += (rewardPool * vote.stake) / winningStake;
            }
            return rewardAmount;
        } else {
            // Wrong vote - slashed amount
            return (vote.stake * (100 - SLASHING_PERCENTAGE)) / 100;
        }
    }
    
    /**
     * @notice Withdraw accumulated fees (slashed tokens)
     * @dev Only owner can withdraw fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = votingToken.balanceOf(address(this));
        // Calculate total locked tokens for active/resolved votings
        // This is a simplified version - in production, track this more precisely
        require(votingToken.transfer(owner(), balance), "Token transfer failed");
    }
}
